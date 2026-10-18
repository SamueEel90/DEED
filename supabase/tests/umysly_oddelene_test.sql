-- ============================================================
-- Test 0116 — úmysel na omšu číta len autor a farár (OPRAVY 373)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- F = farár, A = autor úmyslu, X = iný veriaci
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000116f01'), ('7e57c000-0000-0000-0000-000000116a01'), ('7e57c000-0000-0000-0000-000000116c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000116f01','7e57c000-0000-0000-0000-000000116f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000116a01','7e57c000-0000-0000-0000-000000116a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000116c01','7e57c000-0000-0000-0000-000000116c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t116-far','7e57c100-0000-0000-0000-000000116f01','farnost','Farnosť Test 116',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- A pošle úmysel aj krátky oznam
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116a01', false);
select public.odf_uloz('t116-far', '{"id":"u1","k":"umysel","t":"Za zosnulú mamu Annu","s":"","kto":"Anna K."}');
select public.odf_uloz('t116-far', '{"id":"o1","k":"parte","t":"Verejne parte","s":""}');
insert into t select 'A vidí svoj úmysel', (select count(*) = 1 from public.odfarnikov_umysly where id = 'u1');
reset role;
insert into t select 'verejné pole bez úmyslu', (select data::text not like '%mamu Annu%' and data::text like '%Verejne parte%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't116-far');
insert into t select 'autor úmyslu = A', (select autor = '7e57c100-0000-0000-0000-000000116a01' from public.odfarnikov_umysly where id = 'u1');
insert into t select 'farár dostal Nový úmysel', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000116f01' and titul = 'Nový úmysel na omšu ›');

-- X ho nevidí ani nezmaže; anon nečíta
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116c01', false);
insert into t select 'X nevidí úmysel', (select count(*) = 0 from public.odfarnikov_umysly);
insert into t select 'X nezmaže úmysel', not public.umysel_zmaz('t116-far', 'u1');
update public.odfarnikov_umysly set data = '{"t":"hack"}' where id = 'u1';
reset role;
set role anon;
do $$ declare n int; begin
  select count(*) into n from public.odfarnikov_umysly;
  insert into t values ('anon nečíta úmysly', n = 0);
exception when others then insert into t values ('anon nečíta úmysly', true); end $$;
reset role;
insert into t select 'X nezmenil úmysel', (select data->>'t' = 'Za zosnulú mamu Annu' from public.odfarnikov_umysly where id = 'u1');

-- farár vidí a zapíše na omšu (cez pole, ako appka)
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116f01', false);
insert into t select 'farár vidí úmysel', (select count(*) = 1 from public.odfarnikov_umysly where stranka = 't116-far');
update public.naboz_stav set data = data || jsonb_build_array((select data || '{"zapis":{"d":"2026-10-20","kod":1,"t":"18:00"}}'::jsonb from public.odfarnikov_umysly where id = 'u1'))
  where oblast = 'odfarnikov' and id = 't116-far';
-- A upraví text, zápis farára ostane
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116a01', false);
select public.odf_uloz('t116-far', '{"id":"u1","k":"umysel","t":"Za zosnulú mamu Annu a otca","s":""}');
reset role;
insert into t select 'zápis farára aj úprava autora', (select data->>'t' = 'Za zosnulú mamu Annu a otca' and data->'zapis'->>'t' = '18:00' from public.odfarnikov_umysly where id = 'u1');
insert into t select 'verejné pole stále bez úmyslu', (select data::text not like '%mamu Annu%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't116-far');
-- A zmaže svoj
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116a01', false);
insert into t select 'A zmaže svoj úmysel', public.umysel_zmaz('t116-far', 'u1');
reset role;

select ok, c from t order by ok, c;
rollback;
