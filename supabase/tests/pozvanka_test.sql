-- ============================================================
-- Test 0125 — pozvánka do Správy (OPRAVY 392): pozvaný e-mailom dostane upozornenie, práva až po Prijať,
-- odmietnutý práva nemá, cudzí pozvánku neprijme, QR pozvánku prijme ktokoľvek prihlásený, kým platí.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000125f01', 'farar@test.sk'), ('7e57c000-0000-0000-0000-000000125a01', 'Pozvany@Test.sk'),
  ('7e57c000-0000-0000-0000-000000125b01', 'druhy@test.sk'), ('7e57c000-0000-0000-0000-000000125c01', 'cudzi@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000125f01','7e57c000-0000-0000-0000-000000125f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000125a01','7e57c000-0000-0000-0000-000000125a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000125b01','7e57c000-0000-0000-0000-000000125b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000125c01','7e57c000-0000-0000-0000-000000125c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t125-far','7e57c100-0000-0000-0000-000000125f01','farnost','Farnosť Test 125',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t125-far',
  ('{"ludia":[{"id":1,"n":"","k":"pozvany@test.sk","r":"Pomocník","p":"kaplán","caka":true},{"id":2,"n":"","k":"pozvánka cez odkaz","r":"Pomocník","caka":"odkaz","dos":' || ((extract(epoch from now()) * 1000)::bigint + 3600000) || '},'
   || '{"id":3,"n":"","k":"pozvánka cez odkaz","r":"Pomocník","caka":"odkaz","dos":1}]}')::jsonb);
reset role;
insert into t select 'pozvaný dostal upozornenie', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000125a01' and odkaz = 'poz:t125-far:1' and titul like 'Farnosť Test 125 vás pozýva do Správy · kaplán · Pomocník');
set role authenticated;

-- pozvaný: pred prijatím bez práv
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125a01', false);
insert into t select 'pred prijatím bez práv', not public.spravujem_stranku('t125-far');
insert into t select 'pozvánka: čaká', public.pozvanka('t125-far', '1')->>'stav' = 'caka';
-- cudzí jeho pozvánku nevidí ani neprijme
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125c01', false);
do $$ begin begin perform public.pozvanka_odpoved('t125-far', '1', true); insert into t values ('cudzí neprijme cudziu pozvánku', false);
  exception when others then insert into t values ('cudzí neprijme cudziu pozvánku', true); end; end $$;
-- pozvaný prijme
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125a01', false);
insert into t select 'prijal', public.pozvanka_odpoved('t125-far', '1', true) = 'prijal';
insert into t select 'po prijatí pomocník', public.uroven_stranky('t125-far') = 'pomocnik';
insert into t select 'stav prijal', public.pozvanka('t125-far', '1')->>'stav' = 'prijal';
do $$ begin begin update public.nastavenia_stranky set data = data || '{"ludia":[]}' where stranka = 't125-far'; insert into t values ('pomocník inak ľudí nezmení', false);
  exception when insufficient_privilege then insert into t values ('pomocník inak ľudí nezmení', true); end; end $$;

-- QR pozvánka: druhý ju prijme, vypršaná nejde
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125b01', false);
insert into t select 'QR prijatá', public.pozvanka_odpoved('t125-far', '2', true) = 'prijal';
insert into t select 'QR prijatý je pomocník', public.uroven_stranky('t125-far') = 'pomocnik';
insert into t select 'vypršaná QR: stav', public.pozvanka('t125-far', '3')->>'stav' = 'vyprsala';
do $$ begin begin perform public.pozvanka_odpoved('t125-far', '3', true); insert into t values ('vypršaná QR nejde prijať', false);
  exception when others then insert into t values ('vypršaná QR nejde prijať', true); end; end $$;

-- farár znova pozve e-mailom, pozvaný odmietne
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125f01', false);
update public.nastavenia_stranky set data = jsonb_set(data, '{ludia,0}', '{"id":1,"n":"","k":"pozvany@test.sk","r":"Pomocník","caka":true}') where stranka = 't125-far';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125a01', false);
insert into t select 'opäť pozvaný bez práv', not public.spravujem_stranku('t125-far');
insert into t select 'odmietol', public.pozvanka_odpoved('t125-far', '1', false) = 'odmietol';
insert into t select 'odmietnutý bez práv', not public.spravujem_stranku('t125-far');
reset role;
insert into t select 'u farára stav odmietol', (select c->>'caka' from public.nastavenia_stranky n, jsonb_array_elements(n.data->'ludia') c where n.stranka = 't125-far' and c->>'id' = '1') = 'odmietol';

select ok, c from t order by ok, c;
rollback;
