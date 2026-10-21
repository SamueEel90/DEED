-- ============================================================
-- Test 0140 — dar cez skutok charity (OPRAVY 438 bod 3)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- C = správca charity, D = darca
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000140c01'), ('7e57c000-0000-0000-0000-000000140d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000140c01','7e57c000-0000-0000-0000-000000140c01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000140d01','7e57c000-0000-0000-0000-000000140d01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t140-ch','7e57c100-0000-0000-0000-000000140c01','charita','Charita Test 140',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t140-ch','SK0011000000002612345679','T3','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-140','Teplé jedlo','charity','zbierka','aktivna','t140-ch','7e57c100-0000-0000-0000-000000140c01', now(), '{"ucet":"SK0011000000002612345679"}'),
 ('zb-140b','Iná zbierka','charity','zbierka','aktivna','t140-ch','7e57c100-0000-0000-0000-000000140c01', now(), '{"ucet":"SK0011000000002612345679"}');
insert into public.skutok_stranky (id, stranka, data) values
 ('sk-140a','t140-ch','{"nazov":"Varili sme na stanici","peniaze":"nasa","dar":[{"id":"zb-140","nazov":"Teplé jedlo","org":"Charita Test 140","cislo":"1"}]}'),
 ('sk-140b','t140-ch','{"nazov":"Len ukážka","peniaze":"bez"}'),
 ('sk-140c','t140-ch','{"nazov":"Na centrálnu","peniaze":"centralna"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

insert into t select 'skutok_zbierka nasa = zb-140', public.skutok_zbierka('sk-140a') = 'zb-140';
insert into t select 'skutok_zbierka centralna = stránka:hlavna', public.skutok_zbierka('sk-140c') = 't140-ch:hlavna';
insert into t select 'skutok_zbierka bez = null', public.skutok_zbierka('sk-140b') is null;

-- darca dá 20 € cez skutok a 5 € priamo na zbierku
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000140d01', false);
select public.zbierka_dar_skutok('sk-140a', 'zb-140', 't140-1', 20, 'EUR', 'fiat', null, 't140-ch', 'Teplé jedlo', null, true);
select public.zbierka_dar_volba('zb-140', 't140-2', 5, 'EUR', 'fiat', null, 't140-ch', 'Teplé jedlo', null, true);
do $$ begin
  perform public.zbierka_dar_skutok('sk-140a', 'zb-140b', 't140-3', 5, 'EUR', 'fiat', null, 't140-ch', null, null, true);
  insert into t values ('dar cez skutok na inú zbierku neprejde', false);
exception when others then insert into t values ('dar cez skutok na inú zbierku neprejde', sqlerrm = 'Skutok posiela peniaze na inú zbierku.');
end $$;
do $$ begin
  perform public.zbierka_dar_skutok('sk-140b', 'zb-140', 't140-4', 5, 'EUR', 'fiat', null, 't140-ch', null, null, true);
  insert into t values ('skutok bez modulu dar neprijme', false);
exception when others then insert into t values ('skutok bez modulu dar neprijme', sqlerrm = 'Tento skutok nezbiera peniaze.');
end $$;
reset role;

insert into t select 'zbierka má 2 dary (25 €)', (public.zbierka_dary('zb-140')->>'pocet')::int = 2 and (public.zbierka_dary('zb-140')->'sucty'->>'EUR')::numeric = 25;
insert into t select 'riadok 20 € nesie skutok a jeho názov', exists (select 1 from jsonb_array_elements(public.zbierka_dary('zb-140')->'dary') x
  where (x->>'suma')::numeric = 20 and x->>'skutok' = 'sk-140a' and x->>'skutok_nazov' = 'Varili sme na stanici');
insert into t select 'riadok 5 € je bez skutku', exists (select 1 from jsonb_array_elements(public.zbierka_dary('zb-140')->'dary') x
  where (x->>'suma')::numeric = 5 and x->>'skutok' is null);
insert into t select 'platba 20 € má cez_skutok', (select count(*) = 1 from public.platba where cez_skutok = 'sk-140a');

set role anon;
insert into t select 'skutok_dary: 20 € a 1 dar', (select suma = 20 and pocet = 1 and mena = 'EUR' from public.skutok_dary(array['sk-140a','sk-140b']) where skutok = 'sk-140a');
insert into t select 'skutok_dary: skutok bez darov nemá riadok', not exists (select 1 from public.skutok_dary(array['sk-140b']));
reset role;

-- úprava skutku nezmení, kam idú peniaze (zapečatené)
update public.skutok_stranky set data = data || '{"nazov":"Varili sme na stanici 2","peniaze":"bez","dar":[]}' where id = 'sk-140a';
insert into t select 'úprava: názov sa zmení, peniaze a zbierka ostanú', (select data->>'nazov' = 'Varili sme na stanici 2' and data->>'peniaze' = 'nasa'
  and data->'dar'->0->>'id' = 'zb-140' from public.skutok_stranky where id = 'sk-140a');
update public.skutok_stranky set data = data || '{"peniaze":"centralna"}' where id = 'sk-140b';
insert into t select 'úprava: skutok bez modulu ostane bez', (select data->>'peniaze' = 'bez' and not (data ? 'dar') from public.skutok_stranky where id = 'sk-140b');

-- stiahnutý skutok už dar neprijme
update public.skutok_stranky set stiahnuty = now() where id = 'sk-140a';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000140d01', false);
do $$ begin
  perform public.zbierka_dar_skutok('sk-140a', 'zb-140', 't140-5', 5, 'EUR', 'fiat', null, 't140-ch', null, null, true);
  insert into t values ('stiahnutý skutok dar neprijme', false);
exception when others then insert into t values ('stiahnutý skutok dar neprijme', sqlerrm = 'Tento skutok nezbiera peniaze.');
end $$;
reset role;
insert into t select 'pohyby ostali (25 € na zbierke)', (public.zbierka_dary('zb-140')->'sucty'->>'EUR')::numeric = 25;

select ok, c from t order by ok, c;
rollback;
