-- Test 0150 — odhlásenie zariadenia na diaľku. ROLLBACK na konci, každý riadok ok = t.
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000150a01', 'a@test.sk'), ('7e57c000-0000-0000-0000-000000150b01', 'b@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000150a01','7e57c000-0000-0000-0000-000000150a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000150b01','7e57c000-0000-0000-0000-000000150b01','aktivny','hotovo');
insert into public.zariadenie_uctu (ucet_id, device_id, nazov, typ, relacia) values
 ('7e57c100-0000-0000-0000-000000150a01', 'telefon-a-111', 'iPhone', 'telefon', 'aaaaaaaa-0000-0000-0000-000000000001'),
 ('7e57c100-0000-0000-0000-000000150a01', 'pocitac-a-222', 'Windows · Chrome', 'pocitac', 'aaaaaaaa-0000-0000-0000-000000000002'),
 ('7e57c100-0000-0000-0000-000000150a01', 'pocitac-a-333', 'Mac · Safari', 'pocitac', 'aaaaaaaa-0000-0000-0000-000000000003'),
 ('7e57c100-0000-0000-0000-000000150b01', 'pocitac-b-444', 'Windows · Edge', 'pocitac', 'bbbbbbbb-0000-0000-0000-000000000004');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000150a01', false);
select set_config('request.jwt.claims', '{"sub":"7e57c000-0000-0000-0000-000000150a01","session_id":"aaaaaaaa-0000-0000-0000-000000000001"}', false);
do $$ begin perform public.zariadenie_odhlas('telefon-a-111'); insert into t values ('toto zariadenie nie', false);
exception when others then insert into t values ('toto zariadenie nie', sqlerrm like 'Toto zariadenie%'); end $$;
insert into t select 'odhlási vlastné PC', public.zariadenie_odhlas('pocitac-a-222');
insert into t select 'cudzie zariadenie nie', not public.zariadenie_odhlas('pocitac-b-444');
insert into t select 'ostatné: 1', public.zariadenie_odhlas_ostatne() = 1;
reset role;
insert into t select 'ostal len telefón', (select string_agg(device_id, ',') from public.zariadenie_uctu where ucet_id = '7e57c100-0000-0000-0000-000000150a01') = 'telefon-a-111';
insert into t select 'cudzí účet nedotknutý', exists (select 1 from public.zariadenie_uctu where device_id = 'pocitac-b-444');
select ok, c from t order by ok, c;
rollback;
