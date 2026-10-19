-- ============================================================
-- Test 0113 — potvrdenie rozdelenia bez kódu (OPRAVY 364): okno 5 min, len príjemca, po vypršaní nie, staré volanie s kódom ide tiež
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000113f01'), ('7e57c000-0000-0000-0000-000000113a01'), ('7e57c000-0000-0000-0000-000000113b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000113f01','7e57c000-0000-0000-0000-000000113f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000113a01','7e57c000-0000-0000-0000-000000113a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000113b01','7e57c000-0000-0000-0000-000000113b01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t113-far','7e57c100-0000-0000-0000-000000113f01','farnost','Farnosť Test 113',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
create temp table v(k text primary key, h text);
grant all on t, v to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113f01', false);
insert into v select 'id', public.ovp_zaloz('t113-far', 'pohreb')::text;
insert into v select 'tok', public.ovp_token((select h from v where k = 'id')::uuid);
insert into v select 'lis', public.ovp_otvor((select h from v where k = 'tok'));
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113a01', false);
select public.ovp_potvrd((select h from v where k = 'lis'));
-- pred poslaním nič nečaká
insert into t select 'pred poslaním nečaká', (public.ovp_nahlad((select h from v where k = 'lis')))->>'caka' = 'false';
do $$ begin
  perform public.ovp_suhlas((select h from v where k = 'lis'));
  insert into t values ('bez poslania sa potvrdiť nedá', false);
exception when others then insert into t values ('bez poslania sa potvrdiť nedá', sqlerrm = 'okno_vyprsalo'); end $$;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113f01', false);
select public.ovp_kod((select h from v where k = 'id')::uuid, 'rodine 98,5 % · farnosti 1,5 %');
reset role;
insert into t select 'kód sa netvorí', (select kod is null and kod_do > now() from public.overenie_prijemcu where id = (select h from v where k = 'id')::uuid);
insert into t select 'upozornenie bez kódu', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000113a01'
  and odkaz = 'ovp:t113-far:' || (select h from v where k = 'lis') and text not like '%Kód%' and titul like 'Potvrďte rozdelenie%');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113b01', false);
do $$ begin
  perform public.ovp_suhlas((select h from v where k = 'lis'));
  insert into t values ('iný účet nepotvrdí', false);
exception when others then insert into t values ('iný účet nepotvrdí', sqlerrm = 'kod_neplati'); end $$;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113a01', false);
insert into t select 'príjemca vidí rozdelenie a čaká', (select j->>'caka' = 'true' and j->>'rozdelenie' like 'rodine%' from (select public.ovp_nahlad((select h from v where k = 'lis')) j) q);
-- vypršané okno
reset role;
update public.overenie_prijemcu set kod_do = now() - interval '1 second' where id = (select h from v where k = 'id')::uuid;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113a01', false);
insert into t select 'po vypršaní: vyprsalo', (public.ovp_nahlad((select h from v where k = 'lis')))->>'vyprsalo' = 'true';
do $$ begin
  perform public.ovp_suhlas((select h from v where k = 'lis'));
  insert into t values ('po vypršaní nie', false);
exception when others then insert into t values ('po vypršaní nie', sqlerrm = 'okno_vyprsalo'); end $$;
-- farár pošle znova, príjemca potvrdí (aj starým volaním s kódom)
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113f01', false);
select public.ovp_kod((select h from v where k = 'id')::uuid, 'rodine 98,5 % · farnosti 1,5 %');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113a01', false);
select public.ovp_suhlas((select h from v where k = 'lis'), '123456');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000113f01', false);
insert into t select 'farár vidí súhlas', (public.ovp_stav((select h from v where k = 'id')::uuid))->>'suhlas' = 'true';
reset role;

select ok, c from t order by ok, c;
rollback;
