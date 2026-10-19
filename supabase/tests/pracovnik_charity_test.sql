-- ============================================================
-- Test 0129 — pracovník charity (OPRAVY 404): štatutár zo zoznamu má plné práva, pracovník len vybrané;
-- bez práva „zbierky“ nezaloží zbierku, bez „obsah“ nepridá oznam, s „pridavat“ pridá pracovníka, ale nie štatutára
-- ani sám seba; Viera (farnosť) ostáva ako v 0124.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000127f01', 'org127@test.sk'), ('7e57c000-0000-0000-0000-000000127a01', 'obsah127@test.sk'),
  ('7e57c000-0000-0000-0000-000000127b01', 'stat127@test.sk'), ('7e57c000-0000-0000-0000-000000127c01', 'pridava127@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000127f01','7e57c000-0000-0000-0000-000000127f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000127a01','7e57c000-0000-0000-0000-000000127a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000127b01','7e57c000-0000-0000-0000-000000127b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000127c01','7e57c000-0000-0000-0000-000000127c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t127-ch','7e57c100-0000-0000-0000-000000127f01','charita','Charita Test 127',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000127f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t127-ch',
  '{"ludia":[{"id":1,"n":"","k":"obsah127@test.sk","r":"Pracovník","prava":["obsah"]},{"id":2,"n":"","k":"stat127@test.sk","r":"Štatutár"},{"id":3,"n":"","k":"pridava127@test.sk","r":"Pracovník","prava":["pridavat","zbierky"]}]}');
insert into t select 'vlastník má plné práva', public.plne_prava('t127-ch');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000127b01', false);
insert into t select 'štatutár zo zoznamu má plné práva', public.plne_prava('t127-ch') and public.smie_v_stranke('t127-ch', 'penazenka_vyplaty');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000127a01', false);
insert into t select 'pracovník (obsah) spravuje stránku', public.spravujem_stranku('t127-ch') and not public.plne_prava('t127-ch');
insert into t select 'pracovník (obsah) smie obsah, nie zbierky', public.smie_v_stranke('t127-ch', 'obsah') and not public.smie_v_stranke('t127-ch', 'zbierky');
do $$ begin
  insert into public.zbierka (id, nazov, stranka) values ('t127-z1', 'Zbierka 127', 't127-ch');
  insert into t values ('pracovník bez zbierok nezaloží zbierku', false);
exception when insufficient_privilege then insert into t values ('pracovník bez zbierok nezaloží zbierku', true); end $$;
insert into public.oznam_charity (id, stranka, druh, data) values ('t127-o1', 't127-ch', 'oznam', '{}');
insert into t select 'pracovník (obsah) pridá oznam', exists (select 1 from public.oznam_charity where id = 't127-o1');
do $$ begin
  update public.nastavenia_stranky set data = data || '{"predplatne":{"tier":3}}' where stranka = 't127-ch';
  insert into t values ('pracovník bez nastavení nezmení predplatné', false);
exception when insufficient_privilege then insert into t values ('pracovník bez nastavení nezmení predplatné', true); end $$;
insert into t select 'pracovník nesmie vlastné peniaze', not public.smie_vlastne_peniaze('t127-ch');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000127c01', false);
insert into public.zbierka (id, nazov, stranka) values ('t127-z2', 'Zbierka 127b', 't127-ch');
insert into t select 'pracovník so zbierkami založí zbierku', exists (select 1 from public.zbierka where id = 't127-z2');
do $$ begin
  insert into public.oznam_charity (id, stranka, druh, data) values ('t127-o2', 't127-ch', 'oznam', '{}');
  insert into t values ('pracovník bez obsahu nepridá oznam', false);
exception when insufficient_privilege then insert into t values ('pracovník bez obsahu nepridá oznam', true); end $$;
update public.nastavenia_stranky set data = jsonb_set(data, '{ludia}', data->'ludia' || '[{"id":4,"n":"","k":"novy127@test.sk","r":"Pracovník","prava":["obsah"],"caka":true}]') where stranka = 't127-ch';
insert into t select 'pracovník s pridavat pridá pracovníka', jsonb_array_length((select data->'ludia' from public.nastavenia_stranky where stranka = 't127-ch')) = 4;
do $$ begin
  update public.nastavenia_stranky set data = jsonb_set(data, '{ludia}', data->'ludia' || '[{"id":5,"n":"","k":"x127@test.sk","r":"Štatutár"}]') where stranka = 't127-ch';
  insert into t values ('pracovník nepridá štatutára', false);
exception when insufficient_privilege then insert into t values ('pracovník nepridá štatutára', true); end $$;
do $$ begin
  update public.nastavenia_stranky set data = jsonb_set(data, '{ludia}', (select jsonb_agg(case when x->>'id' = '3' then x || '{"prava":["pridavat","zbierky","nastavenia"]}' else x end) from jsonb_array_elements(data->'ludia') x)) where stranka = 't127-ch';
  insert into t values ('pracovník si nepridá právo sám', false);
exception when insufficient_privilege then insert into t values ('pracovník si nepridá právo sám', true); end $$;
do $$ begin
  update public.nastavenia_stranky set data = jsonb_set(data, '{ludia}', (select jsonb_agg(x) from jsonb_array_elements(data->'ludia') x where x->>'id' <> '2')) where stranka = 't127-ch';
  insert into t values ('pracovník neodoberie štatutára', false);
exception when insufficient_privilege then insert into t values ('pracovník neodoberie štatutára', true); end $$;
reset role;

-- Viera bez zmeny: pomocník (bez poľa práv) stále nezmení ľudí
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t127-far','7e57c100-0000-0000-0000-000000127f01','farnost','Farnosť Test 127',false);
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000127f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t127-far', '{"ludia":[{"id":1,"n":"","k":"obsah127@test.sk","r":"Pomocník"}]}');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000127a01', false);
do $$ begin
  update public.nastavenia_stranky set data = data || '{"ludia":[]}' where stranka = 't127-far';
  insert into t values ('Viera: pomocník nezmení ľudí', false);
exception when insufficient_privilege then insert into t values ('Viera: pomocník nezmení ľudí', true); end $$;
insert into t select 'Viera: pomocník smie zbierky', public.smie_v_stranke('t127-far', 'zbierky');
reset role;

select ok, c from t order by ok, c;
rollback;
