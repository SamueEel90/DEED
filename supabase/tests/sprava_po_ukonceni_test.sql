-- ============================================================
-- Test 0175 — správa po ukončení súkromnej zbierky: deň po ukončení o 11:00, len raz, len vlastníkovi.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000175a01'), ('7e57c000-0000-0000-0000-000000175a02');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000175a01','7e57c000-0000-0000-0000-000000175a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000175a02','7e57c000-0000-0000-0000-000000175a02','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t175','7e57c100-0000-0000-0000-000000175a01','farnost','Farnosť 175',true);
-- posledných 11:00 pred teraz → ukončenie deň predtým popoludní
create temp table k as select ((((now() at time zone 'Europe/Bratislava')::date
  - case when (now() at time zone 'Europe/Bratislava')::time >= time '11:00' then 1 else 2 end) + time '15:00') at time zone 'Europe/Bratislava') as kon;
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, nastavenie) values
 ('t175-p','Pohreb','nabozenstvo','zbierka','ukoncena','t175','7e57c100-0000-0000-0000-000000175a01','{"farnost":{"druh":"pohreb"}}'),
 ('t175-j','Jubileum','nabozenstvo','zbierka','ukoncena','t175','7e57c100-0000-0000-0000-000000175a01','{"farnost":{"druh":"ine"}}'),
 ('t175-s','Stará','nabozenstvo','zbierka','ukoncena','t175','7e57c100-0000-0000-0000-000000175a01','{"farnost":{"druh":"pohreb"}}'),
 ('t175-a','Beží','nabozenstvo','zbierka','aktivna','t175','7e57c100-0000-0000-0000-000000175a01','{"farnost":{"druh":"pohreb"}}'),
 ('t175-f','Farská','nabozenstvo','zbierka','ukoncena','t175','7e57c100-0000-0000-0000-000000175a01','{"farnost":{"druh":"farnost"}}');
insert into public.zbierka_podiel (zbierka, poradie, druh, ucet, text, podiel)
 select z, 1, 'prijemca', '7e57c100-0000-0000-0000-000000175a02', 'Príjemca', 1 from unnest(array['t175-p','t175-j','t175-s','t175-a']) z;
set session_replication_role = replica; -- 0068 by koniec prepísal
update public.zbierka set koniec = (select kon from k) where id in ('t175-p','t175-j','t175-f');
update public.zbierka set koniec = (select kon from k) - interval '5 days' where id = 't175-s';
set session_replication_role = origin;
\pset tuples_only on
create temp table t(c text, ok boolean);
insert into t select 'cas: deň po ukončení o 11:00', public.sprava_ukoncenia_cas('2026-10-23 22:30+00') = '2026-10-25 11:00 Europe/Bratislava'::timestamptz;
insert into t select 'cas: ukončenie dopoludnia → zajtra 11:00', public.sprava_ukoncenia_cas('2026-10-24 07:00+00') = '2026-10-25 11:00 Europe/Bratislava'::timestamptz;
insert into t select 'tick pošle dve správy', public.sprava_po_ukonceni_tick() = 2;
insert into t select 'druhý tick nič nepošle (len raz)', public.sprava_po_ukonceni_tick() = 0;
insert into t select 'pohrebná ide vlastníkovi s odkazom', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000175a02' and odkaz = 'kon:pohreb:t175-p' and titul = 'Zbierka je ukončená' and text = 'Ďakujeme, že ste ju zverili DEED+.');
insert into t select 'jubilejná ide vlastníkovi', exists (select 1 from public.notifikacia where odkaz = 'kon:ine:t175-j');
insert into t select 'stará zbierka nedostane nič', not exists (select 1 from public.notifikacia where odkaz like '%t175-s');
insert into t select 'bežiaca zbierka nedostane nič', not exists (select 1 from public.notifikacia where odkaz like '%t175-a');
insert into t select 'farská zbierka nedostane nič', not exists (select 1 from public.notifikacia where odkaz like '%t175-f');
insert into t select 'správca stránky nedostane nič', not exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000175a01' and odkaz like 'kon:%');
insert into t select 'tick nespustí prihlásený', not has_function_privilege('authenticated', 'public.sprava_po_ukonceni_tick()', 'execute');
select ok, c from t order by ok, c;
rollback;
