-- ============================================================
-- Test 0118 — rozdelenie zbierky: verejne len pri podelení a bez overovateľa; celé správca a príjemca (OPRAVY 379)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000118f01'), ('7e57c000-0000-0000-0000-000000118a01'), ('7e57c000-0000-0000-0000-000000118c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000118f01','7e57c000-0000-0000-0000-000000118f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000118a01','7e57c000-0000-0000-0000-000000118a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000118c01','7e57c000-0000-0000-0000-000000118c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t118-far','7e57c100-0000-0000-0000-000000118f01','farnost','Farnosť Test 118',false),
 ('t118-ch','7e57c100-0000-0000-0000-000000118f01','charita','Charita 118',false);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id) values
 ('zb-118a','Pohreb A','nabozenstvo','zbierka','aktivna','t118-far','7e57c100-0000-0000-0000-000000118f01'),
 ('zb-118b','Pohreb B','nabozenstvo','zbierka','aktivna','t118-far','7e57c100-0000-0000-0000-000000118f01');
insert into public.zbierka_podiel (zbierka, poradie, druh, ucet, stranka, text, podiel) values
 ('zb-118a', 1, 'prijemca', '7e57c100-0000-0000-0000-000000118a01', null, 'Pozostalý', 0.97),
 ('zb-118a', 2, 'overovatel', '7e57c100-0000-0000-0000-000000118f01', 't118-far', 'Farnosť', 0.03),
 ('zb-118b', 1, 'prijemca', '7e57c100-0000-0000-0000-000000118a01', null, 'Pozostalý', 0.87),
 ('zb-118b', 2, 'overovatel', '7e57c100-0000-0000-0000-000000118f01', 't118-far', 'Farnosť', 0.03),
 ('zb-118b', 3, 'podelene', '7e57c100-0000-0000-0000-000000118f01', 't118-ch', 'Charita 118', 0.10);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role anon;
insert into t select 'anon: bez podelenia nič', (select count(*) = 0 from public.zbierka_podiel where zbierka = 'zb-118a');
insert into t select 'anon: pri podelení príjemca a podelené, bez overovateľa', (select count(*) = 2 and bool_and(druh <> 'overovatel') from public.zbierka_podiel where zbierka = 'zb-118b');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000118c01', false);
insert into t select 'cudzí: podiel overovateľa nevidí', (select count(*) = 0 from public.zbierka_podiel where druh = 'overovatel');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000118a01', false);
insert into t select 'príjemca vidí celé rozdelenie', (select count(*) = 5 from public.zbierka_podiel);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000118f01', false);
insert into t select 'správca vidí celé rozdelenie', (select count(*) = 5 from public.zbierka_podiel);
reset role;

select ok, c from t order by ok, c;
rollback;
