-- ============================================================
-- Test 0081b — oznam darcom zbierky: rozpošle len správca, dostanú len prihlásení darcovia
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = správca stránky (autor zbierky), D = darca, X = iný prihlásený (nedaroval)
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000000f1'), ('7e57c000-0000-0000-0000-0000000000d1'), ('7e57c000-0000-0000-0000-0000000000e1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000000f1','7e57c000-0000-0000-0000-0000000000f1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000000d1','7e57c000-0000-0000-0000-0000000000d1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000000e1','7e57c000-0000-0000-0000-0000000000e1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t-oz','7e57c100-0000-0000-0000-0000000000f1','charita','Testovacia charita',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t-oz','SK0011000000002612345679','T2','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-oz','Test oznamov','charity','zbierka','aktivna','t-oz','7e57c100-0000-0000-0000-0000000000f1', now(), '{"ucet":"SK0011000000002612345679"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000d1', false);
select (public.zbierka_dar('zb-oz', 'oz-1', 20, 'EUR', 'fiat'))->>'platba_id' is not null;
select (public.zbierka_dar('zb-oz', 'oz-2', 10, 'EUR', 'fiat'))->>'platba_id' is not null;

-- darca nesmie rozposielať
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000d1', false);
do $$ begin perform public.oznam_darcom('zb-oz', 'sprava', 'x'); insert into t values ('darca nesmie rozposlat', false);
exception when insufficient_privilege then insert into t values ('darca nesmie rozposlat', true); end $$;

-- správca: jeden príjemca aj pri dvoch daroch
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000f1', false);
insert into t select 'spravca rozposle jednemu darcovi', public.oznam_darcom('zb-oz', 'sprava', 'Ďakujeme') = 1;
insert into t select 'zbierka mimo DB = 0', public.oznam_darcom('mock-123', 'sprava', 'x') = 0;
insert into t select 'spravca nevidi cudzie oznamy', (select count(*) from public.oznam_darcovi) = 0;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000d1', false);
insert into t select 'darca vidi svoj oznam', (select count(*) from public.oznam_darcovi where text = 'Ďakujeme') = 1;
update public.oznam_darcovi set precitane = now();
insert into t select 'darca oznaci precitane', (select count(*) from public.oznam_darcovi where precitane is not null) = 1;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000e1', false);
insert into t select 'iny nevidi nic', (select count(*) from public.oznam_darcovi) = 0;
reset role;

select ok, c from t order by ok, c;

rollback;
