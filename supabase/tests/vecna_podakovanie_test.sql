-- ============================================================
-- Test 0101 — poďakovanie darcom vecnej zbierky: posiela len správca, každý darca raz, druhýkrát nie (OPRAVY 320)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000101f01'), ('7e57c000-0000-0000-0000-000000101a01'), ('7e57c000-0000-0000-0000-000000101b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000101f01','7e57c000-0000-0000-0000-000000101f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000101a01','7e57c000-0000-0000-0000-000000101a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000101b01','7e57c000-0000-0000-0000-000000101b01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t101-far','7e57c100-0000-0000-0000-000000101f01','farnost','Farnosť Test 101',false);
insert into public.naboz_stav (oblast, id, data) values ('vecne', 't101-far', '[{"id":"v1","nazov":"Ponožky","stav":"aktivna","ukazHodnotu":false}]');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000101a01', false);
select public.vecny_dar_zapis('t101-far', 'v1', 'Anna', null);
select public.vecny_dar_zapis('t101-far', 'v1', 'Anna', null);
do $$ begin
  perform public.vecna_podakuj('t101-far', 'v1', 'Ďakujeme');
  insert into t values ('darca nepošle poďakovanie', false);
exception when others then insert into t values ('darca nepošle poďakovanie', sqlstate = '42501'); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000101b01', false);
select public.vecny_dar_zapis('t101-far', 'v1', 'Boris', null);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000101f01', false);
insert into t select 'farár pošle 2 darcom', public.vecna_podakuj('t101-far', 'v1', 'Ďakujeme, ponožky sme odovzdali.') = 2;
do $$ begin
  perform public.vecna_podakuj('t101-far', 'v1', 'Znova');
  insert into t values ('druhýkrát nie', false);
exception when others then insert into t values ('druhýkrát nie', sqlstate = '23505'); end $$;
reset role;
insert into t select 'Anna má 1 upozornenie s odkazom', (select count(*) = 1 and min(odkaz) = 'vz:t101-far:v1' and min(titul) = 'Poďakovanie · Ponožky' from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000101a01' and titul like 'Poďakovanie%');
insert into t select 'farár nedostal', (select count(*) = 0 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000101f01' and titul like 'Poďakovanie%');

select ok, c from t order by ok, c;
rollback;
