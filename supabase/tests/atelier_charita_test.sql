-- ============================================================
-- Test 0161 — Ateliér charity: naplánovaný vzhľad prepne server o 2:00, nenaplánovaný a budúci nie; farnosť ako doteraz.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000161a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000161a01','7e57c000-0000-0000-0000-000000161a01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t161-a','7e57c100-0000-0000-0000-000000161a01','charita','Charita 161 A',true),
 ('t161-b','7e57c100-0000-0000-0000-000000161a01','charita','Charita 161 B',true),
 ('t161-c','7e57c100-0000-0000-0000-000000161a01','charita','Charita 161 C',true);
insert into public.profil_stranky (stranka, vzhlad) values ('t161-a', 'vyklad');
insert into public.nastavenia_stranky (stranka, data) values
 ('t161-a', jsonb_build_object('atelierCharita', jsonb_build_object('vzhlad', 'pirat', 'zmenene', now(), 'naplanovane', now() - interval '1 minute'))),
 ('t161-b', jsonb_build_object('atelierCharita', jsonb_build_object('vzhlad', 'kronika', 'zmenene', now(), 'naplanovane', now() + interval '3 hours'))),
 ('t161-c', jsonb_build_object('atelierCharita', jsonb_build_object('vzhlad', 'pirat', 'zmenene', now())));
\pset tuples_only on
create temp table t(c text, ok boolean);
select public.atelier_prepni();
insert into t select 'A: vzhľad naostro = Moderné (pirat)', (select vzhlad = 'pirat' from public.profil_stranky where stranka = 't161-a');
insert into t select 'A: koncept zmazaný, späť = Výklad na 7 dní', (select data->'atelierCharita' is null and data->'atelierCharitaSpat'->>'vzhlad' = 'vyklad' from public.nastavenia_stranky where stranka = 't161-a');
insert into t select 'B: o 2:00 ešte nie je — koncept ostáva', (select data->'atelierCharita'->>'vzhlad' = 'kronika' from public.nastavenia_stranky where stranka = 't161-b')
  and not exists (select 1 from public.profil_stranky where stranka = 't161-b');
insert into t select 'C: nenaplánovaný koncept sa nezverejní', (select data->'atelierCharita'->>'vzhlad' = 'pirat' from public.nastavenia_stranky where stranka = 't161-c')
  and not exists (select 1 from public.profil_stranky where stranka = 't161-c');
select ok, c from t order by ok, c;
rollback;
