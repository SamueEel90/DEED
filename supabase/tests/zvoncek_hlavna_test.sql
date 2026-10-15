-- ============================================================
-- Test 0096 — zvončeková omša po skončení je v Hlavnej zbierke na serveri ako jeden dar (OPRAVY 294)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = farnosť (správca), D = darca
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000096a1'), ('7e57c000-0000-0000-0000-0000000096b1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000096a1','7e57c000-0000-0000-0000-0000000096a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000096b1','7e57c000-0000-0000-0000-0000000096b1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t96-far','7e57c100-0000-0000-0000-0000000096a1','farnost','Farnosť Test 96',true);
-- omše každý deň každé 3 hodiny (0:30, 3:30 … 21:30), aby bežala omša v každom čase
insert into public.naboz_stav (oblast, id, data) values ('kalendar', 't96-far', $j${
  "kostoly": { "0": { "casy": [["0:30","3:30","6:30"],["9:30","12:30","15:30"],["18:30","21:30",""]], "casyOk": true,
    "vzor": {"0": [0,1,2,10,11,12,20,21], "1": [0,1,2,10,11,12,20,21], "2": [0,1,2,10,11,12,20,21], "3": [0,1,2,10,11,12,20,21],
             "4": [0,1,2,10,11,12,20,21], "5": [0,1,2,10,11,12,20,21], "6": [0,1,2,10,11,12,20,21]},
    "zrus": {}, "posun": {}, "extra": {} } }}$j$::jsonb);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table r1 as select public.zvoncek_okno('t96-far', '0', now())->>'ref' as ref;
grant all on r1 to public;

-- dva dary do zvončekovej (bežiaca omša) a jeden priamo do Hlavnej
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000096b1', false);
select public.zvoncek_dar('t96-far', '0', 't96-1', 10, 'EUR', 'fiat', null, false);
select public.zvoncek_dar('t96-far', '0', 't96-2', 5, 'EUR', 'fiat', null, false);
select public.zbierka_dar_volba('t96-far:hlavna', 't96-3', 7, 'EUR', 'fiat', null, 't96-far', 'Hlavná zbierka', null, false);
reset role;
insert into t select 'pred omsou: Hlavna len 7 €', (select vyzbierane = 7 from public.v_zbierka_vyzbierane where zbierka = 't96-far:hlavna' and mena = 'EUR');
insert into t select 'pred omsou: v daroch Hlavnej 1 riadok', (public.zbierka_dary('t96-far:hlavna')->>'pocet')::int = 1;
insert into t select 'bežiaca omša nie je skončená', not public.zvoncek_uzavreta('t96-far:' || (select ref from r1));

-- farár / Testovanie: Zavrieť omšu
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000096b1', false);
do $$ begin
  perform public.zvoncek_zavri_test('t96-far', '0');
  insert into t values ('zavriet omsu smie len spravca', false);
exception when others then insert into t values ('zavriet omsu smie len spravca', sqlerrm like 'Túto stránku nespravujete%');
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000096a1', false);
create temp table r2 as select public.zvoncek_zavri_test('t96-far', '0')->>'ref' as ref;
reset role;
insert into t select 'po zavreti bezi dalsia omsa', (select ref from r2) > (select ref from r1);
insert into t select 'zavreta omsa je skoncena', public.zvoncek_uzavreta('t96-far:' || (select ref from r1));
insert into t select 'Hlavna = 7 + 15 = 22 €', (select vyzbierane = 22 from public.v_zbierka_vyzbierane where zbierka = 't96-far:hlavna' and mena = 'EUR');
insert into t select 'v daroch Hlavnej 2 riadky (omša = jeden)', (public.zbierka_dary('t96-far:hlavna')->>'pocet')::int = 2;
insert into t select 'riadok omse: omsa, 15 €, nazov omse', (select (x->>'omsa')::boolean and (x->>'suma')::numeric = 15 and x->>'meno' like '% %:%'
  from jsonb_array_elements(public.zbierka_dary('t96-far:hlavna')->'dary') x where (x->>'omsa')::boolean);
insert into t select 'sucet darov Hlavnej 22 €', (public.zbierka_dary('t96-far:hlavna')->'sucty'->>'EUR')::numeric = 22;
insert into t select 'omsa sama ostava 15 €', (select vyzbierane = 15 from public.v_zbierka_vyzbierane v join r1 on v.zbierka = 't96-far:' || r1.ref where v.mena = 'EUR');
insert into t select 'zvoncek_omse ukazuje omsu 15 €', (select (x->>'eur')::numeric = 15 from jsonb_array_elements(public.zvoncek_omse('t96-far')) x join r1 on x->>'ref' = r1.ref);
insert into t select 'zvoncek_okno pre kazdeho = dalsia omsa', public.zvoncek_okno('t96-far', '0', now())->>'ref' = (select ref from r2);

-- ďalší dar ide do novej omše, nie do zavretej
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000096b1', false);
select public.zvoncek_dar('t96-far', '0', 't96-4', 3, 'EUR', 'fiat', null, false);
reset role;
insert into t select 'dalsi dar ide do novej omse', (select zbierka = 't96-far:' || (select ref from r2) from public.platba where idem_kluc = 't96-4');
insert into t select 'Hlavna sa bezacou omsou nemeni (22 €)', (select vyzbierane = 22 from public.v_zbierka_vyzbierane where zbierka = 't96-far:hlavna' and mena = 'EUR');

select ok, c from t order by ok, c;
rollback;
