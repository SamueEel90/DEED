-- ============================================================
-- Test 0091 — zvončeková zbierka ku každej omši z kalendára: okná, prepínanie, zrušené / posunuté / pridané omše, dar
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000091a1'), ('7e57c000-0000-0000-0000-0000000091b1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000091a1','7e57c000-0000-0000-0000-0000000091a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000091b1','7e57c000-0000-0000-0000-0000000091b1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t91-far','7e57c100-0000-0000-0000-0000000091a1','farnost','Farnosť Test 91',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- kostol „0“: Št 18:00 (kód 10), Pi 6:00 (kód 0), Ne 7:30 / 9:00 / 10:30 / 18:00 (kódy 1, 20, 21, 10)
-- kostol „1“: Ne 6:00 a 6:30, v nedeľu 18. 10. zrušená 6:30, Ne 9:00 posunutá na 11:00, pridaná Odpustová slávnosť 15:00,
--             Po 8:00 školská (pridaný druh g = 3) s poznámkou „nekoná sa“ od 19. 10. do 25. 10.
insert into public.naboz_stav (oblast, id, data) values ('kalendar', 't91-far', $j${
  "kostoly": {
    "0": { "casy": [["6:00","7:30",""],["18:00","",""],["9:00","10:30",""]], "casyOk": true,
           "vzor": {"3": [10], "4": [0], "6": [1, 20, 21, 10]}, "zrus": {}, "posun": {}, "extra": {} },
    "1": { "casy": [["6:00","6:30",""],["","",""],["9:00","",""],["8:00","",""]], "casyOk": true,
           "druhy": [{"g": 3, "nazov": "Školská", "kratko": "školská"}],
           "vzor": {"6": [0, 1, 20], "0": [30]}, "zrus": {"2026-10-18": [1]}, "posun": {"2026-10-18": {"20": "11:00"}},
           "extra": {"2026-10-18": [{"id": "x1", "typ": "omsa", "t": "15:00", "m": "Odpustová slávnosť"}]},
           "pozn": {"30": {"t": "prázdniny", "od": "2026-10-19", "do": "2026-10-25"}} }
  }}$j$::jsonb);

create function pg_temp.ok(p_cas text, p_kostol text, p_ref text) returns boolean language sql as $$
  select public.zvoncek_okno('t91-far', p_kostol, (p_cas || ' Europe/Bratislava')::timestamptz)->>'ref' = 't91-far-zv-' || p_kostol || '-' || p_ref $$;

insert into t select 'Št 20:00 = Št 18:00', pg_temp.ok('2026-10-15 20:00', '0', '2026-10-15-1800');
insert into t select 'Št 23:59 = Št 18:00', pg_temp.ok('2026-10-15 23:59', '0', '2026-10-15-1800');
insert into t select 'Pi 0:00 = Pi 6:00 (polnoc)', pg_temp.ok('2026-10-16 00:00', '0', '2026-10-16-0600');
insert into t select 'nazov vecerna', public.zvoncek_okno('t91-far', '0', '2026-10-15 20:00 Europe/Bratislava')->>'nazov' = 'Večerná omša';
insert into t select 'nazov ranna, cas 6:00', (select o->>'nazov' = 'Ranná omša' and o->>'cas' = '6:00' from (select public.zvoncek_okno('t91-far', '0', '2026-10-16 01:00 Europe/Bratislava') o) x);
insert into t select 'do = polnoc', (public.zvoncek_okno('t91-far', '0', '2026-10-15 20:00 Europe/Bratislava')->>'do')::timestamptz = '2026-10-16 00:00 Europe/Bratislava'::timestamptz;
-- nedeľa 7:30 / 9:00 / 10:30 / 18:00 → 8:30, 10:00, 14:00
insert into t select 'Ne 8:29 = 7:30', pg_temp.ok('2026-10-18 08:29', '0', '2026-10-18-0730');
insert into t select 'Ne 8:30 = 9:00', pg_temp.ok('2026-10-18 08:30', '0', '2026-10-18-0900');
insert into t select 'Ne 9:59 = 9:00', pg_temp.ok('2026-10-18 09:59', '0', '2026-10-18-0900');
insert into t select 'Ne 10:00 = 10:30', pg_temp.ok('2026-10-18 10:00', '0', '2026-10-18-1030');
insert into t select 'Ne 13:59 = 10:30', pg_temp.ok('2026-10-18 13:59', '0', '2026-10-18-1030');
insert into t select 'Ne 14:00 = 18:00', pg_temp.ok('2026-10-18 14:00', '0', '2026-10-18-1800');
insert into t select 'nazov hlavna', public.zvoncek_okno('t91-far', '0', '2026-10-18 09:30 Europe/Bratislava')->>'nazov' = 'Hlavná omša';
-- kostol „1“: zrušená 6:30 zbierku nemá → po 6:00 ide posunutá 11:00 (pôvodne 9:00)
insert into t select 'zrusena: 6:45 stale 6:00', pg_temp.ok('2026-10-18 06:45', '1', '2026-10-18-0600');
insert into t select 'zrusena nema okno, posunuta 11:00', pg_temp.ok('2026-10-18 09:00', '1', '2026-10-18-1100');
insert into t select 'posunuta: nazov hlavna, cas 11:00', (select o->>'cas' = '11:00' from (select public.zvoncek_okno('t91-far', '1', '2026-10-18 10:00 Europe/Bratislava') o) x);
insert into t select 'pridana omsa: nazov z kalendara', public.zvoncek_okno('t91-far', '1', '2026-10-18 15:30 Europe/Bratislava')->>'nazov' = 'Odpustová slávnosť';
-- 60 min pravidlo: Ne 6:00 a 6:30 v kostole „1“ v nedeľu 25. 10. (bez zrušenia) → prepne až 7:00
insert into t select '60 min: 6:59 stale 6:00', pg_temp.ok('2026-10-25 06:59', '1', '2026-10-25-0600');
insert into t select '60 min: 7:00 = 6:30', pg_temp.ok('2026-10-25 07:00', '1', '2026-10-25-0630');
-- pridaný druh: školská Po 8:00, v období poznámky sa nekoná
insert into t select 'druh: Skolska omsa', public.zvoncek_okno('t91-far', '1', '2026-10-12 09:00 Europe/Bratislava')->>'nazov' = 'Školská omša';
insert into t select 'poznamka od-do: Po 19. 10. bez omse', public.zvoncek_okno('t91-far', '1', '2026-10-19 09:00 Europe/Bratislava')->>'den' <> '2026-10-19';
-- bez kalendára
insert into t select 'bez kalendara null', public.zvoncek_okno('t91-nikto', '0', now()) is null;

-- dar: okno určí server, riadok pre Hlavnú zbierku s názvom omše
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000091b1', false);
create temp table r as select public.zvoncek_dar('t91-far', '0', 't91-1', 5, 'EUR', 'fiat', null, true) as j;
reset role;
insert into t select 'dar: okno = aktualne', (j->'okno'->>'ref') = (public.zvoncek_okno('t91-far', '0', now())->>'ref') from r;
insert into t select 'dar: zbierka okna', (select zbierka from public.platba where idem_kluc = 't91-1') = 't91-far:' || (select j->'okno'->>'ref' from r);
insert into t select 'zvoncek_omse: 5 EUR, 1 dar', (select (x->>'eur')::numeric = 5 and (x->>'darov')::int = 1 from (select jsonb_array_elements(public.zvoncek_omse('t91-far')) x) y);
insert into t select 'zvoncek_omse: nazov = omsa + cas', (select x->>'nazov' = (j->'okno'->>'nazov') || ' ' || (j->'okno'->>'cas') from r, (select jsonb_array_elements(public.zvoncek_omse('t91-far')) x) y);
-- ukončená zvončeková neberie dary
insert into public.naboz_stav (oblast, id, data) values ('zvoncek', 't91-far', '{"ukoncena": true}'::jsonb);
set role authenticated;
do $$ begin
  perform public.zvoncek_dar('t91-far', '0', 't91-2', 5, 'EUR', 'fiat', null, true);
  insert into t values ('ukoncena odmietne', false);
exception when others then insert into t values ('ukoncena odmietne', true);
end $$;
reset role;

select ok, c from t order by ok, c;
rollback;
