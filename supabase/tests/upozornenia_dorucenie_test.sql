-- ============================================================
-- Test 0088b — doručenie upozornení z farnosti (zvonček, súhrn, hneď, kostol, pripomienka, push)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = správca t88-far, V = sleduje farnosť (súhrn), X = sleduje kostol „1“ (má push), Y = farnosť bez súhrnu + Pomôž
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000088a1'), ('7e57c000-0000-0000-0000-0000000088b1'), ('7e57c000-0000-0000-0000-0000000088c1'), ('7e57c000-0000-0000-0000-0000000088d1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000088a1','7e57c000-0000-0000-0000-0000000088a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000088b1','7e57c000-0000-0000-0000-0000000088b1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000088c1','7e57c000-0000-0000-0000-0000000088c1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000088d1','7e57c000-0000-0000-0000-0000000088d1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t88-far','7e57c100-0000-0000-0000-0000000088a1','farnost','Farnosť Test',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000088a1', false);
insert into public.moje_farnosti (stranka) values ('t88-far'); -- farár sleduje sám seba: sebe nič nepošle
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000088b1', false);
insert into public.moje_farnosti (stranka) values ('t88-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000088c1', false);
insert into public.moje_kostoly (stranka, miesto) values ('t88-far', '1');
insert into t select 'push: ulozi odber', public.uloz_push_odber('https://push.example/x1', 'kluc', 'auth');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000088d1', false);
insert into public.moje_farnosti (stranka) values ('t88-far');
select public.nastav_bloky('t88-far', null, array['oz','po']);
insert into public.moje_data (kluc, data) values ('deed.farnostiSuhrn', 'false'::jsonb);

-- ---- farár zverejňuje ----
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000088a1', false);
insert into public.naboz_prispevok (id, farnost_id, data) values
 ('t88-oz1', 't88-far', '{"ntyp":"oznam","nazov":"Ohlášky","oz":{"dr":0,"upoz":true}}'),
 ('t88-oz2', 't88-far', '{"ntyp":"oznam","nazov":"Len kostol 2","oz":{"dr":0,"upoz":true,"mi":["2"]}}'),
 ('t88-oz3', 't88-far', '{"ntyp":"oznam","nazov":"Bez upozornenia","oz":{"dr":0,"upoz":false}}'),
 ('t88-pa1', 't88-far', '{"ntyp":"oznam","nazov":"Parte · Ján","ukat":"pohreb","oz":{"dr":2,"upoz":true}}');
-- opätovný zápis toho istého (sync z iného zariadenia) nič nepošle
update public.naboz_prispevok set data = data || '{"podpora":1}' where id = 't88-oz1';
insert into public.naboz_stav (oblast, id, data) values
 ('brigady', 't88-far', '[{"id":"b1","t":"Upratovanie kostola","dat":"2026-11-01","cas":"9:00","kde":"","upoz":true}]'),
 ('kalendar', 't88-far', '{"kostoly":{"1":{"zrus":{"2026-10-20":[10]},"posun":{},"odpovede":{"2026-10-20|10":"ano"}}}}');
reset role;

insert into t select 'oznam: V caka na suhrn', exists (select 1 from public.upozornenie_cakajuce c join public.upozornenie_farnosti f on f.id = c.upozornenie where c.ucet_id = '7e57c100-0000-0000-0000-0000000088b1' and f.zdroj = 'p:t88-oz1');
insert into t select 'oznam: kostol X dostane oznam celej farnosti', exists (select 1 from public.upozornenie_cakajuce c join public.upozornenie_farnosti f on f.id = c.upozornenie where c.ucet_id = '7e57c100-0000-0000-0000-0000000088c1' and f.zdroj = 'p:t88-oz1');
insert into t select 'oznam: Y bez suhrnu hned', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088d1' and text = 'Nový oznam: Ohlášky');
insert into t select 'oznam: farar sebe nic', not exists (select 1 from public.upozornenie_cakajuce where ucet_id = '7e57c100-0000-0000-0000-0000000088a1')
  and not exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088a1');
insert into t select 'oznam pre kostol 2: X nie', not exists (select 1 from public.upozornenie_cakajuce c join public.upozornenie_farnosti f on f.id = c.upozornenie where c.ucet_id = '7e57c100-0000-0000-0000-0000000088c1' and f.zdroj = 'p:t88-oz2');
insert into t select 'bez upoz: nic', not exists (select 1 from public.upozornenie_farnosti where zdroj like 'p:t88-oz3%');
insert into t select 'bez zmeny: ziadne Upravene', not exists (select 1 from public.upozornenie_farnosti where zdroj like 'p:t88-oz1:u:%');
insert into t select 'parte: V hned', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088b1' and text = 'Parte: Parte · Ján');
insert into t select 'parte: X nesleduje Spominame', not exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088c1' and text like 'Parte%');
insert into t select 'omsa: X hned + push', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088c1' and text = 'Zrušená večerná omša 20. 10.' and push);
insert into t select 'omsa: V hned bez push', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088b1' and text = 'Zrušená večerná omša 20. 10.' and not push);
insert into t select 'brigada: Y (Pomoz) hned', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088d1' and text = 'Nová brigáda: Upratovanie kostola');
insert into t select 'brigada: V nesleduje Pomoz', not exists (select 1 from public.upozornenie_cakajuce c join public.upozornenie_farnosti f on f.id = c.upozornenie where c.ucet_id = '7e57c100-0000-0000-0000-0000000088b1' and f.blok = 'po');

-- úprava oznamu → „Upravené“, druhá rovnaká odpoveď v kalendári sa nepošle znova
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000088a1', false);
update public.naboz_prispevok set data = jsonb_set(data, '{nazov}', '"Ohlášky (opravené)"') where id = 't88-oz1';
update public.naboz_stav set data = data where oblast = 'kalendar' and id = 't88-far';
reset role;
insert into t select 'uprava: Upravene', exists (select 1 from public.upozornenie_farnosti where zdroj like 'p:t88-oz1:u:%' and text = 'Upravené: Ohlášky (opravené)');
insert into t select 'omsa: druhy zapis nic', (select count(*) from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088c1' and text like 'Zrušená%') = 1;
insert into t select 'cakajuce nevidi pouzivatel', not has_table_privilege('authenticated', 'public.upozornenie_cakajuce', 'select');

-- ---- denný súhrn ----
select public.upozornenia_suhrn_tick();
insert into t select 'suhrn: V jedna sprava', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088b1' and titul = '3 novinky z Farnosti Test');
insert into t select 'suhrn: cakajuce prazdne', not exists (select 1 from public.upozornenie_cakajuce);
select public.upozornenia_suhrn_tick();
insert into t select 'suhrn: druhy beh nic', (select count(*) from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088b1' and titul like '%novink%') = 1;

-- ---- pripomienka deň vopred ----
insert into public.naboz_prispevok (id, farnost_id, data) values ('t88-ud1', 't88-far',
  jsonb_build_object('ntyp', 'udalost', 'nazov', 'Púť', 'datum', to_char((now() at time zone 'Europe/Bratislava')::date + 1, 'YYYY-MM-DD'), 'udalost', '{"cas":"8:00"}'::jsonb, 'oz', '{"dr":1,"upoz":true}'::jsonb));
insert into public.rsvp (ucet_id, ref_id) values ('7e57c100-0000-0000-0000-0000000088b1', 't88-ud1');
insert into public.naboz_stav (oblast, id, data) values ('reakcie', 't88-far', '{"t88-ud1":{"ucast":["7e57c100-0000-0000-0000-0000000088c1","meno:Anna"]}}');
insert into t select 'pripomienka: 2 prihlaseni', public.pripomienky_udalosti_tick() = 2;
insert into t select 'pripomienka: text', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000088b1' and titul = 'Zajtra: Púť' and text = 'o 8:00 · Farnosť Test');
insert into t select 'pripomienka: len raz', public.pripomienky_udalosti_tick() = 0;

\pset tuples_only off
select c, ok from t order by c;
rollback;
