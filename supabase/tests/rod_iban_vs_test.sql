-- ============================================================
-- Test 0049 (rod · IBAN osoby · VS zbierky). Spustiť po migráciách:
--   psql -f supabase/tests/rod_iban_vs_test.sql
-- Beží v transakcii a na konci sa vráti (ROLLBACK). Všetky riadky musia mať ok = t.
-- ============================================================
begin;
create temp table t(c text, ok boolean);
grant all on t to public;

insert into auth.users (id) values ('7e57d000-0000-0000-0000-00000000000a'), ('7e57d000-0000-0000-0000-00000000000b');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57d100-0000-0000-0000-00000000000a', '7e57d000-0000-0000-0000-00000000000a', 'aktivny', 'hotovo'),
 ('7e57d100-0000-0000-0000-00000000000b', '7e57d000-0000-0000-0000-00000000000b', 'aktivny', 'hotovo');

-- ---------- rod ----------
insert into public.profil (ucet_id, meno, rod) values ('7e57d100-0000-0000-0000-00000000000a', 'Jana', 'zena');
insert into t select 'rod: zena ulozena', (select rod from profil where ucet_id = '7e57d100-0000-0000-0000-00000000000a') = 'zena';
do $$ begin
  begin
    update public.profil set rod = 'ine' where ucet_id = '7e57d100-0000-0000-0000-00000000000a';
    insert into t values ('rod: neplatna hodnota odmietnuta', false);
  exception when check_violation then insert into t values ('rod: neplatna hodnota odmietnuta', true); end;
end $$;

-- ---------- IBAN osoby ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-00000000000a', false);
insert into public.vyplatny_ucet (ucet_id, iban, overeny) values ('7e57d100-0000-0000-0000-00000000000a', 'sk31 0900 0000 0051 2233 4417', true);
insert into t select 'iban: ulozeny bez medzier, velkymi', (select iban from vyplatny_ucet) = 'SK3109000000005122334417';
insert into t select 'iban: klient si overenie nenastavi', (select not overeny from vyplatny_ucet);
do $$ begin
  begin
    insert into public.vyplatny_ucet (ucet_id, iban) values ('7e57d100-0000-0000-0000-00000000000b', 'SK3109000000005122334417');
    insert into t values ('iban: cudzi ucet nezapise', false);
  exception when insufficient_privilege then insert into t values ('iban: cudzi ucet nezapise', true); end;
end $$;
reset role;
update public.vyplatny_ucet set overeny = true where ucet_id = '7e57d100-0000-0000-0000-00000000000a';
insert into t select 'iban: server overi', (select overeny from vyplatny_ucet where ucet_id = '7e57d100-0000-0000-0000-00000000000a');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-00000000000a', false);
update public.vyplatny_ucet set iban = 'SK8975000000000012345671' where ucet_id = '7e57d100-0000-0000-0000-00000000000a';
reset role;
insert into t select 'iban: zmena cisla = znova neovereny', (select not overeny from vyplatny_ucet where ucet_id = '7e57d100-0000-0000-0000-00000000000a');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-00000000000b', false);
insert into t select 'iban: cudzi nevidi', not exists (select 1 from vyplatny_ucet);
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into t select 'iban: anon nevidi', not exists (select 1 from vyplatny_ucet);
reset role;

-- ---------- VS zbierky ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-00000000000a', false);
insert into public.zbierka (id, nazov, modul, typ, vs) values ('zb-test-1', 'Test', 'charity', 'zbierka', '1111111111');
insert into public.zbierka (id, nazov, modul, typ) values ('zb-test-2', 'Test 2', 'charity', 'zbierka');
reset role;
insert into t select 'vs: klient si cislo nevymysli', (select vs from zbierka where id = 'zb-test-1') <> '1111111111';
insert into t select 'vs: 10 cislic a sedi Luhn', (select bool_and(vs ~ '^\d{10}$' and public.luhn9(left(vs, 9)) = right(vs, 1)::int) from zbierka where id like 'zb-test-%');
insert into t select 'vs: dve zbierky, dve cisla', (select count(distinct vs) from zbierka where id like 'zb-test-%') = 2;
insert into t select 'vs: nekoliduje s dokladom', (select vs from zbierka where id = 'zb-test-2') <> public.novy_doklad();
do $$ begin
  begin
    update public.zbierka set vs = '2222222222' where id = 'zb-test-2';
    insert into t values ('vs: pridelene cislo sa nemeni', false);
  exception when insufficient_privilege then insert into t values ('vs: pridelene cislo sa nemeni', true); end;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-00000000000a', false);
insert into t select 'vs: v zbierka_moja', (select vs from zbierka_moja where id = 'zb-test-2') is not null;
reset role;

select ok, c from t order by ok, c;
rollback;
