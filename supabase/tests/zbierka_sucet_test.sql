-- ============================================================
-- Test 0184 — zbierka_sucet drží s ledgerom krok: nový dar, storno, dva pohyby v jednom doklade, výmaz testovacích.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000184d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000184d01','7e57c000-0000-0000-0000-000000184d01','aktivny','hotovo');
insert into public.ucet (id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000184c01','charita','hotovo');
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, ciel) values
 ('18400000-0000-0000-0000-000000000001','charity','charita','Zbierka 184','7e57c100-0000-0000-0000-000000184c01', 1000);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- 1 · nový prípad bez pohybov = žiadny riadok (ako doteraz)
insert into t select 'bez pohybov ziadny riadok', not exists (select 1 from public.v_vyzbierane where case_id = '18400000-0000-0000-0000-000000000001');

-- 2 · dar 10 € kartou (procesor → charita) + dar 25 DEED
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, case_id, pre_zbierku, testovaci) values
 ('1840000001', 1, 'dar', public.ucet_systemu('procesor'), '7e57c100-0000-0000-0000-000000184c01', 10, 'EUR', 'fiat', '18400000-0000-0000-0000-000000000001', true, false),
 ('1840000002', 1, 'dar', '7e57c100-0000-0000-0000-000000184d01', '7e57c100-0000-0000-0000-000000184c01', 25, 'DEED', 'deed', '18400000-0000-0000-0000-000000000001', true, true);
insert into t select 'po dvoch daroch: 10 EUR, 25 DEED, 2 dary',
  (select vyzbierane_eur = 10 and vyzbierane_deed = 25 and pocet_darov = 2 from public.v_vyzbierane where case_id = '18400000-0000-0000-0000-000000000001');

-- 3 · poplatok (nie pre_zbierku) sa nepočíta
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, case_id, pre_zbierku) values
 ('1840000001', 0, 'poplatok', public.ucet_systemu('procesor'), public.ucet_systemu('platforma'), 1, 'EUR', 'fiat', '18400000-0000-0000-0000-000000000001', false);
insert into t select 'poplatok sucet nemeni',
  (select vyzbierane_eur = 10 and pocet_darov = 2 from public.v_vyzbierane where case_id = '18400000-0000-0000-0000-000000000001');

-- 4 · storno daru 10 € (vratenie) = súčet dole, počet darov dole
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, case_id, pre_zbierku, storno_pre)
 select '1840000003', 1, 'vratenie', ucet_kredit, ucet_debet, suma, mena, kanal, case_id, true, id
   from public.pohyb where doklad = '1840000001' and poradie = 1;
insert into t select 'po storne: 0 EUR, 25 DEED, 1 dar',
  (select vyzbierane_eur = 0 and vyzbierane_deed = 25 and pocet_darov = 1 from public.v_vyzbierane where case_id = '18400000-0000-0000-0000-000000000001');

-- 5 · tabuľka = ten istý výpočet ako pôvodný pohľad (0037), spočítaný priamo z ledgera
insert into t select 'tabulka = vypocet z ledgera', (
  select z.vyzbierane_eur = x.eur and z.vyzbierane_deed = x.deed and z.pocet_darov = x.n
    from public.zbierka_sucet z,
    (select round(coalesce(sum(case when p.storno_pre is null then p.suma else -p.suma end) filter (where p.mena = 'EUR'), 0), 2) eur,
            round(coalesce(sum(case when p.storno_pre is null then p.suma else -p.suma end) filter (where p.mena = 'DEED'), 0), 4) deed,
            count(distinct p.doklad) filter (where p.storno_pre is null and not exists (select 1 from public.pohyb r where r.storno_pre = p.id)) n
       from public.pohyb p where p.pre_zbierku and p.case_id = '18400000-0000-0000-0000-000000000001') x
   where z.case_id = '18400000-0000-0000-0000-000000000001');

-- 6 · appka tabuľku len číta
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000184d01', false);
insert into t select 'appka vidi sucet', (select count(*) = 1 from public.v_vyzbierane where case_id = '18400000-0000-0000-0000-000000000001');
do $$ begin update public.zbierka_sucet set vyzbierane_eur = 999 where case_id = '18400000-0000-0000-0000-000000000001';
  insert into t values ('appka sucet neprepise', not exists (select 1 from public.zbierka_sucet where vyzbierane_eur = 999));
exception when others then insert into t values ('appka sucet neprepise', true); end $$;
reset role;

-- 7 · výmaz testovacích pohybov (ako zmaz_testovacie 0157) = súčet sa prepočíta
alter table public.pohyb disable trigger pohyb_nemenny;
delete from public.pohyb where doklad = '1840000002';
alter table public.pohyb enable trigger pohyb_nemenny;
insert into t select 'po vymaze testovacieho daru: 0 DEED, 0 darov',
  (select vyzbierane_deed = 0 and pocet_darov = 0 from public.v_vyzbierane where case_id = '18400000-0000-0000-0000-000000000001');
alter table public.pohyb disable trigger pohyb_nemenny;
delete from public.pohyb where case_id = '18400000-0000-0000-0000-000000000001';
alter table public.pohyb enable trigger pohyb_nemenny;
insert into t select 'po vymaze vsetkeho ziadny riadok', not exists (select 1 from public.v_vyzbierane where case_id = '18400000-0000-0000-0000-000000000001');

select ok, c from t order by ok, c;
rollback;
