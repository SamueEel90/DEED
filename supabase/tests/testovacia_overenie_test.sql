-- ============================================================
-- Test 0079 + 0132 — testovacia stránka zapečatí zbierku bez overeného účtu, ostrá nie (OPRAVY 198); v testovacej verzii appky áno (OPRAVY 416)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57d000-0000-0000-0000-0000000000f1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57d100-0000-0000-0000-0000000000f1','7e57d000-0000-0000-0000-0000000000f1','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t-test','7e57d100-0000-0000-0000-0000000000f1','farnost','Testovacia',true),
 ('t-ostra','7e57d100-0000-0000-0000-0000000000f1','farnost','Ostrá',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie)
 values ('zb-test','Pohreb test','nabozenstvo','zbierka','aktivna','t-test','7e57d100-0000-0000-0000-0000000000f1', now(), '{"ucet":"SK0011000000002612349999"}');
insert into t select 'testovacia: zapecatene bez overenia', exists (select 1 from zbierka where id = 'zb-test');
-- 0132: testovacia verzia celej appky (testovacia_pokladna = true) neblokuje ani ostrú stránku
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie)
 values ('zb-ostra-tv','Zbierka ostra · testovacia verzia','charity','zbierka','aktivna','t-ostra','7e57d100-0000-0000-0000-0000000000f1', now(), '{"ucet":"SK0011000000002612349999"}');
insert into t select 'testovacia verzia: ostra bez overenia prejde', exists (select 1 from zbierka where id = 'zb-ostra-tv');
-- po ostrom štarte (prepínač vypnutý) platí kontrola
update public.ledger_prepinac set zapnute = false where kluc = 'testovacia_pokladna';
do $$ begin
  insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie)
   values ('zb-ostra','Pohreb ostra','nabozenstvo','zbierka','aktivna','t-ostra','7e57d100-0000-0000-0000-0000000000f1', now(), '{"ucet":"SK0011000000002612349999"}');
  insert into t values ('ostra: bez overenia odmietnute', false);
exception when others then insert into t values ('ostra: bez overenia odmietnute', sqlerrm like 'Účet zbierky nie je overený%');
end $$;
select ok, c from t order by ok, c;
rollback;
