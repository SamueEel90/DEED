-- ============================================================
-- Test 0133 — skutky charity: správca zapíše, návštevník číta, stiahnutý len správa, cudzí nezapíše, pracovník bez „obsah“ nie
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000133f01', 'org133@test.sk'), ('7e57c000-0000-0000-0000-000000133c01', 'cudzi133@test.sk'),
  ('7e57c000-0000-0000-0000-000000133b01', 'zb133@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000133f01','7e57c000-0000-0000-0000-000000133f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000133c01','7e57c000-0000-0000-0000-000000133c01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000133b01','7e57c000-0000-0000-0000-000000133b01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t133-ch','7e57c100-0000-0000-0000-000000133f01','charita','Charita 133',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000133f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t133-ch', '{"ludia":[{"id":1,"n":"","k":"zb133@test.sk","r":"Pracovník","prava":["zbierky"]}]}');
insert into public.skutok_stranky (id, stranka, data) values ('s1', 't133-ch', '{"nazov":"Rozdali sme bundy"}'), ('s2', 't133-ch', '{"nazov":"Stiahnutý"}');
update public.skutok_stranky set stiahnuty = now() where id = 's2';
insert into t select 'správca zapísal', (select count(*) from public.skutok_stranky where stranka = 't133-ch') = 2;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000133c01', false);
insert into t select 'návštevník vidí len zverejnený', (select count(*) from public.skutok_stranky where stranka = 't133-ch') = 1;
do $$ begin insert into public.skutok_stranky (id, stranka, data) values ('s3', 't133-ch', '{}'); insert into t values ('cudzí nezapíše', false);
exception when insufficient_privilege then insert into t values ('cudzí nezapíše', true); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000133b01', false);
do $$ begin insert into public.skutok_stranky (id, stranka, data) values ('s4', 't133-ch', '{}'); insert into t values ('pracovník bez obsah nezapíše', false);
exception when insufficient_privilege then insert into t values ('pracovník bez obsah nezapíše', true); end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
insert into t select 'anon číta zverejnený', (select count(*) from public.skutok_stranky where stranka = 't133-ch') = 1;
reset role;

select ok, c from t order by ok, c;
rollback;
