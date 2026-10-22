-- Test 0155 — zbierka charity po spustení: text zapečatený, doplnenia a fotky len pribúdajú, oprava len pred prvým darom.
-- ROLLBACK na konci, každý riadok ok = t.
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000155c01'), ('7e57c000-0000-0000-0000-000000155d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000155c01','7e57c000-0000-0000-0000-000000155c01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000155d01','7e57c000-0000-0000-0000-000000155d01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t155-ch','7e57c100-0000-0000-0000-000000155c01','charita','Charita Test 155',true),
 ('t155-fa','7e57c100-0000-0000-0000-000000155c01','farnost','Farnosť Test 155',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t155-ch','SK0011000000002612345679','T5','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-155a','Teplé jedlo','charity','zbierka','aktivna','t155-ch','7e57c100-0000-0000-0000-000000155c01', now(),
   '{"ucet":"SK0011000000002612345679","popis":"<p>Pôvodný</p>","popis2":"","media":[{"id":1,"typ":"foto","src":"a.jpg"}]}'),
 ('zb-155b','Strecha','charity','zbierka','aktivna','t155-ch','7e57c100-0000-0000-0000-000000155c01', now(),
   '{"ucet":"SK0011000000002612345679","popis":"<p>B</p>"}'),
 ('zb-155f','Farská','nabozenstvo','zbierka','aktivna','t155-fa','7e57c100-0000-0000-0000-000000155c01', now(), '{"popis":"<p>F</p>"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000155c01', false);
-- text sa nemení
do $$ begin
  update public.zbierka set nastavenie = nastavenie || '{"popis":"<p>Iný</p>"}' where id = 'zb-155a';
  insert into t values ('text charity sa nedá prepísať', false);
exception when others then insert into t values ('text charity sa nedá prepísať', sqlstate = '42501'); end $$;
-- doplnenie pribudne
update public.zbierka set nastavenie = nastavenie || jsonb_build_object('doplnenia', jsonb_build_array(jsonb_build_object('datum', '2026-10-22', 'text', '<p>Pribudla kuchyňa.</p>'))) where id = 'zb-155a';
insert into t select 'doplnenie pribudlo', (select jsonb_array_length(nastavenie->'doplnenia') = 1 from public.zbierka where id = 'zb-155a');
do $$ begin
  update public.zbierka set nastavenie = nastavenie || '{"doplnenia":[{"datum":"2026-10-22","text":"<p>Prepísané</p>"}]}' where id = 'zb-155a';
  insert into t values ('doplnenie sa nedá prepísať', false);
exception when others then insert into t values ('doplnenie sa nedá prepísať', sqlstate = '42501'); end $$;
do $$ begin
  update public.zbierka set nastavenie = nastavenie || '{"doplnenia":[]}' where id = 'zb-155a';
  insert into t values ('doplnenie sa nedá zmazať', false);
exception when others then insert into t values ('doplnenie sa nedá zmazať', sqlstate = '42501'); end $$;
do $$ begin
  update public.zbierka set nastavenie = jsonb_set(nastavenie, '{doplnenia}', (nastavenie->'doplnenia') || '[{"datum":"2026-10-22","text":"  "}]') where id = 'zb-155a';
  insert into t values ('prázdne doplnenie neprejde', false);
exception when others then insert into t values ('prázdne doplnenie neprejde', sqlstate = '22023'); end $$;
-- fotky len na koniec
update public.zbierka set nastavenie = jsonb_set(nastavenie, '{media}', (nastavenie->'media') || '[{"id":2,"typ":"foto","src":"b.jpg"}]') where id = 'zb-155a';
insert into t select 'nová fotka pribudla na koniec', (select jsonb_array_length(nastavenie->'media') = 2 and nastavenie->'media'->0->>'src' = 'a.jpg' from public.zbierka where id = 'zb-155a');
do $$ begin
  update public.zbierka set nastavenie = jsonb_set(nastavenie, '{media}', '[{"id":2,"typ":"foto","src":"b.jpg"}]') where id = 'zb-155a';
  insert into t values ('pôvodná fotka sa nedá zmazať', false);
exception when others then insert into t values ('pôvodná fotka sa nedá zmazať', sqlstate = '42501'); end $$;
-- farnosť ostáva podľa 0041 (text sa smie meniť)
update public.zbierka set nastavenie = nastavenie || '{"popis":"<p>F2</p>"}' where id = 'zb-155f';
insert into t select 'farnosť: text sa dá upraviť ako doteraz', (select nastavenie->>'popis' = '<p>F2</p>' from public.zbierka where id = 'zb-155f');
-- oprava pred prvým darom: to isté id a VS, nový text
create temp table vs0 as select id, vs from public.zbierka where id = 'zb-155b';
select public.oprav_zbierku('zb-155b', 'Strecha nová', 900, '{"ucet":"SK0011000000002612345679","popis":"<p>Opravené</p>","vs":"x"}');
insert into t select 'oprava pred darom: nový text, názov, cieľ', (select nazov = 'Strecha nová' and ciel = 900 and nastavenie->>'popis' = '<p>Opravené</p>' from public.zbierka where id = 'zb-155b');
insert into t select 'oprava: VS ostal', (select z.vs is not distinct from v.vs from public.zbierka z join vs0 v on v.id = z.id);
insert into t select 'po oprave je zbierka znova zapečatená', (select not exists (select 1 from public.zbierka where id = 'zb-155b' and zapecatena is null));
do $$ begin
  update public.zbierka set nastavenie = nastavenie || '{"popis":"<p>X</p>"}' where id = 'zb-155b';
  insert into t values ('po oprave text znova zamknutý', false);
exception when others then insert into t values ('po oprave text znova zamknutý', sqlstate = '42501'); end $$;
-- po prvom dare sa oprava nedá
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000155d01', false);
select public.zbierka_dar_volba('zb-155b', 't155-1', 10, 'EUR', 'fiat', 'Dana K.', 't155-ch', 'Strecha', null, true);
do $$ begin
  perform public.oprav_zbierku('zb-155b', 'X', null, '{}');
  insert into t values ('cudzí neopraví', false);
exception when others then insert into t values ('cudzí neopraví', sqlstate = '42501'); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000155c01', false);
do $$ begin
  perform public.oprav_zbierku('zb-155b', 'Strecha 3', 900, '{"popis":"<p>Z</p>"}');
  insert into t values ('po dare sa oprava nedá', false);
exception when others then insert into t values ('po dare sa oprava nedá', sqlstate = '42501' and sqlerrm like '%už má dar%'); end $$;
reset role;
insert into t select 'anon nevolá opravu', not has_function_privilege('anon', 'public.oprav_zbierku(text,text,numeric,jsonb)', 'execute');

select ok, c from t order by ok, c;
rollback;
