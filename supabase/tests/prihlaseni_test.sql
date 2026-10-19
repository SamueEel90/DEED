-- ============================================================
-- Test 0128 — zoznam prihlásených (OPRAVY 397): prihlásenie zapíše čas, odhlásenie ho zmaže;
-- farár pošle správu prihláseným (do Oznámení), cudzí človek nie.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000128f01', 'far128@test.sk'), ('7e57c000-0000-0000-0000-000000128a01', 'ver128@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000128f01','7e57c000-0000-0000-0000-000000128f01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000128a01','7e57c000-0000-0000-0000-000000128a01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t128-far','7e57c100-0000-0000-0000-000000128f01','farnost','Farnosť 128',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000128a01', false);
select public.reakcia_f('t128-far', 'brig1', 'ucast', true, 'Mária Kováčová');
insert into t select 'prihlásenie zapíše čas', (select (data->'brig1'->'kedy'->>'7e57c100-0000-0000-0000-000000128a01')::bigint > 0 from public.naboz_stav where oblast = 'reakcie' and id = 't128-far');
do $$ begin perform public.napis_prihlasenym('t128-far', 'brig1', 'Ahoj'); insert into t values ('cudzí nepošle správu', false);
exception when insufficient_privilege then insert into t values ('cudzí nepošle správu', true); end $$;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000128f01', false);
insert into t select 'farár pošle správu 1 prihlásenému', public.napis_prihlasenym('t128-far', 'brig1', 'Stretneme sa o 8:00') = 1;
reset role;
insert into t select 'správa je v Oznámeniach prihláseného', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000128a01' and text = 'Stretneme sa o 8:00');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000128a01', false);
select public.reakcia_f('t128-far', 'brig1', 'ucast', false);
insert into t select 'odhlásenie zmaže čas', (select not (data->'brig1'->'kedy' ? '7e57c100-0000-0000-0000-000000128a01') from public.naboz_stav where oblast = 'reakcie' and id = 't128-far');
reset role;

select ok, c from t order by ok, c;
rollback;
