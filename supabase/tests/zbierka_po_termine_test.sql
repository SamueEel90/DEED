-- ============================================================
-- Test 0187 — zbierka s termínom skončí po termíne sama; bez termínu, farnosť, hlavná a dlhodobá v lehote nie; reťaz sa posunie.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000187a1'), ('7e57c000-0000-0000-0000-0000000187b1'), ('7e57c000-0000-0000-0000-0000000187c1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000187a1','7e57c000-0000-0000-0000-0000000187a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000187b1','7e57c000-0000-0000-0000-0000000187b1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000187c1','7e57c000-0000-0000-0000-0000000187c1','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-0000000187c1', 'Martin', 'Konaľ');
insert into public.zobrazenie (ucet_id, rezim) values ('7e57c100-0000-0000-0000-0000000187c1', 'cele');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t187-a','7e57c100-0000-0000-0000-0000000187a1','charita','Charita 187',true),
 ('t187-f','7e57c100-0000-0000-0000-0000000187b1','farnost','Farnosť 187',true);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel, nastavenie) values
 ('t187-z1','Krátka po termíne','charity','zbierka','aktivna','t187-a','7e57c100-0000-0000-0000-0000000187a1', now() - interval '31 days', 1000, '{"typ":"kratka"}'),
 ('t187-z2','Krátka v lehote','charity','zbierka','aktivna','t187-a','7e57c100-0000-0000-0000-0000000187a1', now() - interval '29 days', 1000, '{"typ":"kratka"}'),
 ('t187-z3','Dlhá po termíne','charity','zbierka','aktivna','t187-a','7e57c100-0000-0000-0000-0000000187a1', now() - interval '7 months', 1000, '{"typ":"dlha","mesiace":6}'),
 ('t187-z4','Dlhá v lehote','charity','zbierka','aktivna','t187-a','7e57c100-0000-0000-0000-0000000187a1', now() - interval '5 months', 1000, '{"typ":"dlha","mesiace":6}'),
 ('t187-z5','Bez typu','charity','zbierka','aktivna','t187-a','7e57c100-0000-0000-0000-0000000187a1', now() - interval '400 days', 1000, null),
 ('t187-f:t187-f-zb1','Farnosť stará','nabozenstvo','zbierka','aktivna','t187-f','7e57c100-0000-0000-0000-0000000187b1', now() - interval '60 days', 1000, '{"typ":"kratka"}'),
 ('t187-a:hlavna','Hlavná','charity','hlavna','aktivna','t187-a','7e57c100-0000-0000-0000-0000000187a1', now() - interval '400 days', null, '{"typ":"kratka"}');
update public.zbierka set auto_uzavriet = false where id like 't187-%';
insert into public.zbierka_sprava (zbierka, data) values ('t187-z1', '{"stav":"aktivna","lehota":"30"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- reťaz tvorcu: 1. zbierka po termíne, 2. v lehote
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000187c1', false);
select public.retaz_zapecat('rt-187', '[{"zbierka":"t187-z1","pct":50},{"zbierka":"t187-z2","pct":50}]') is not null;
reset role;
insert into t select 'retaz: bezi na z1', (select stav from public.retaz_polozka where retaz = 'rt-187' and zbierka = 't187-z1') = 'bezi';

insert into t select 'ukoncene 2 zbierky', public.zbierky_po_termine() = 2;
insert into t select 'kratka po termine ukoncena, koniec zapisany', (select stav = 'ukoncena' and koniec is not null from public.zbierka where id = 't187-z1');
insert into t select 'dlha po termine ukoncena', (select stav = 'ukoncena' from public.zbierka where id = 't187-z3');
insert into t select 'kratka v lehote, dlha v lehote, bez typu, farnost, hlavna bezia dalej',
  (select count(*) from public.zbierka where id in ('t187-z2','t187-z4','t187-z5','t187-f:t187-f-zb1','t187-a:hlavna') and stav = 'aktivna') = 5;
insert into t select 'sprava zbierky: dovod termin', (select data->>'dovodUkoncenia' = 'Termín zbierky uplynul' from public.zbierka_sprava where zbierka = 't187-z1');
insert into t select 'spravca dostal oznam', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000187a1' and titul like 'Zbierka Krátka po termíne skončila%');
insert into t select 'retaz sa posunula: z1 skoncila, z2 bezi',
  (select stav from public.retaz_polozka where retaz = 'rt-187' and zbierka = 't187-z1') = 'skoncila'
  and (select stav from public.retaz_polozka where retaz = 'rt-187' and zbierka = 't187-z2') = 'bezi';
insert into t select 'druhe spustenie nic', public.zbierky_po_termine() = 0;

select ok, c from t order by ok, c;
rollback;
