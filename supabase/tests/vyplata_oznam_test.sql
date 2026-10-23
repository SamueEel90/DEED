-- ============================================================
-- Test 0160 — výplatu pracovníka charity (zbierka_vklad) vidí štatutár v upozorneniach; štatutár sám sebe nepíše.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
-- A = účet charity, S = štatutár (osobný účet), P = pracovník s právom výplaty
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000160a01', 'charita160@test.sk'), ('7e57c000-0000-0000-0000-000000160b01', 'statutar160@test.sk'), ('7e57c000-0000-0000-0000-000000160c01', 'pracovnik160@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000160a01','7e57c000-0000-0000-0000-000000160a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000160b01','7e57c000-0000-0000-0000-000000160b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000160c01','7e57c000-0000-0000-0000-000000160c01','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000160c01', 'Eva', 'Pokladníková');
insert into public.organizacia (ucet_id, nazov, bankovy_ucet) values ('7e57c100-0000-0000-0000-000000160a01', 'Charita 160', 'SK3112000000198742637541');
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('7e57c100-0000-0000-0000-000000160a01','7e57c100-0000-0000-0000-000000160b01','test');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t160-a','7e57c100-0000-0000-0000-000000160a01','charita','Charita 160',true);
insert into public.nastavenia_stranky (stranka, data) values ('t160-a', '{"ludia":[{"id":1,"n":"","k":"pracovnik160@test.sk","r":"Pracovník","caka":false,"prava":["penazenka_vyplaty"]}]}');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel, nastavenie) values
 ('t160-z1','Strecha','charity','zbierka','aktivna','t160-a','7e57c100-0000-0000-0000-000000160a01', now(), 10000, '{"ucet":"SK8909000000005122334455"}'),
 ('t160-z2','Lavice','charity','zbierka','aktivna','t160-a','7e57c100-0000-0000-0000-000000160a01', now(), 10000, '{"ucet":"SK8909000000005122334466"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000160c01', false);
select public.zbierka_vklad_vlastny('t160-z1', 250);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000160b01', false);
select public.zbierka_vklad_vlastny('t160-z2', 40);
reset role;
insert into t select 'štatutár (osobný účet) dostal oznam o výplate pracovníka', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000160b01' and titul = 'Eva Pokladníková posiela 250,00 € z účtu charity' and text like 'Na účet zbierky Strecha · %');
insert into t select 'účet charity dostal oznam', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000160a01' and kat = 'penazenka' and titul like 'Eva Pokladníková posiela%');
insert into t select 'pracovník sám sebe oznam nedostal', not exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000160c01');
insert into t select 'výplata štatutára = žiadny oznam', not exists (select 1 from public.notifikacia where titul like '%posiela 40,00%');
select ok, c from t order by ok, c;
rollback;
