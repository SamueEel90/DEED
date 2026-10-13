-- ============================================================
-- Test 0084 — meno darcu a platba naoko (TESTOVACIA): dar sa zapíše do zbierky, pohyby testovacie, meno darcu ostane
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000000ca1'), ('7e57c000-0000-0000-0000-000000000cd1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000000ca1','7e57c000-0000-0000-0000-000000000ca1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000000cd1','7e57c000-0000-0000-0000-000000000cd1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('tc-far','7e57c100-0000-0000-0000-000000000ca1','farnost','Farnosť Test',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000000cd1', false);
create temp table r as select public.zbierka_dar_volba('tc-far:hlavna', 'tc-1', 25, 'EUR', 'fiat', 'Martin Konaľ, Trenčín', 'tc-far', 'Podporiť farnosť', null, true) as j;
reset role;
insert into t select 'dar vznikol', (j->>'platba_id') is not null and (j->>'testovaci')::boolean from r;
insert into t select 'vsetky pohyby testovacie', bool_and(po.testovaci) from pohyb po join platba pl on pl.id = po.platba_id where pl.idem_kluc = 'tc-1';
insert into t select 'platba meta testovaci', (meta->>'testovaci')::boolean from platba where idem_kluc = 'tc-1';
insert into t select 'meno darcu v zozname', (public.zbierka_dary('tc-far:hlavna')->'dary'->0->>'meno') = 'Martin Konaľ, Trenčín';
insert into t select 'pocet darov 1', (public.zbierka_dary('tc-far:hlavna')->>'pocet')::int = 1;
-- bežný dar po teste už testovací nie je
set role authenticated;
select public.zbierka_dar_volba('tc-far:hlavna', 'tc-2', 10, 'EUR', 'fiat', null, 'tc-far', 'Podporiť farnosť', null, false);
reset role;
insert into t select 'bez mena: meno prazdne', (select odosielatel_text is null and zobrazenie = 4 from platba where idem_kluc = 'tc-2');
insert into t select 'bezny dar nie je testovaci', not bool_or(po.testovaci) from pohyb po join platba pl on pl.id = po.platba_id where pl.idem_kluc = 'tc-2';
-- vypnutá testovacia pokladňa → odmietne
update public.ledger_prepinac set zapnute = false where kluc = 'testovacia_pokladna';
set role authenticated;
do $$ begin
  perform public.zbierka_dar_volba('tc-far:hlavna', 'tc-3', 5, 'EUR', 'fiat', null, 'tc-far', null, null, true);
  insert into t values ('vypnuty test odmietne', false);
exception when others then insert into t values ('vypnuty test odmietne', true);
end $$;
reset role;

select ok, c from t order by ok, c;
rollback;
