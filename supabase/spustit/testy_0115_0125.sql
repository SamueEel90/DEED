-- >>> naboz_len_spravca_test.sql
-- ============================================================
-- Test 0115 — stav farnosti zapisuje len správca; veriaci len cez serverové funkcie (OPRAVY 372)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- F = farár (majiteľ stránky), A = veriaci (autor), X = cudzí účet
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000115f01'), ('7e57c000-0000-0000-0000-000000115a01'), ('7e57c000-0000-0000-0000-000000115c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000115f01','7e57c000-0000-0000-0000-000000115f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000115a01','7e57c000-0000-0000-0000-000000115a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000115c01','7e57c000-0000-0000-0000-000000115c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t115-far','7e57c100-0000-0000-0000-000000115f01','farnost','Farnosť Test 115',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- farár zapisuje priamo
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000115f01', false);
insert into public.naboz_stav (oblast, id, data) values ('profil', 't115-far', '{"nazov":"Farnosť"}');
insert into public.naboz_stav (oblast, id, data) values ('farniksmie', 't115-far', '{"oznam":"povolene"}');
insert into public.naboz_prispevok (id, farnost_id, data) values ('n115', 't115-far', '{"nazov":"Oznam farára"}');
insert into t select 'farár zapíše stav aj oznam', (select count(*) = 2 from public.naboz_stav where id = 't115-far') and exists (select 1 from public.naboz_prispevok where id = 'n115');

-- cudzí účet nezapíše, neprepíše, nezmaže
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000115c01', false);
do $$ begin
  insert into public.naboz_stav (oblast, id, data) values ('kalendar', 't115-far', '{}');
  insert into t values ('cudzí účet nezapíše nový stav', false);
exception when others then insert into t values ('cudzí účet nezapíše nový stav', sqlstate = '42501'); end $$;
update public.naboz_stav set data = '{"nazov":"Hacknute"}' where oblast = 'profil' and id = 't115-far';
delete from public.naboz_stav where oblast = 'farniksmie' and id = 't115-far';
do $$ begin
  insert into public.naboz_prispevok (id, farnost_id, data) values ('x115', 't115-far', '{}');
  insert into t values ('cudzí účet nezapíše oznam', false);
exception when others then insert into t values ('cudzí účet nezapíše oznam', sqlstate = '42501'); end $$;
update public.naboz_prispevok set data = '{"nazov":"Hack"}' where id = 'n115';
delete from public.naboz_prispevok where id = 'n115';
reset role;
insert into t select 'cudzí účet neprepísal profil', (select data->>'nazov' = 'Farnosť' from public.naboz_stav where oblast = 'profil' and id = 't115-far');
insert into t select 'cudzí účet nezmazal stav', exists (select 1 from public.naboz_stav where oblast = 'farniksmie' and id = 't115-far');
insert into t select 'cudzí účet neprepísal ani nezmazal oznam', (select data->>'nazov' = 'Oznam farára' from public.naboz_prispevok where id = 'n115');

-- anon nezapíše
set role anon;
do $$ begin
  insert into public.naboz_stav (oblast, id, data) values ('kalendar', 't115-far', '{}');
  insert into t values ('anon nezapíše', false);
exception when others then insert into t values ('anon nezapíše', true); end $$;
reset role;

-- veriaci A cez funkcie: pridá, upraví svoj, nenastaví si serverové polia
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000115a01', false);
select public.odf_uloz('t115-far', '{"id":"a1","k":"oznam","t":"Stratene kluce","s":"x","nahlasili":["fake"],"modl":["fake"],"autor":"7e57c100-0000-0000-0000-000000115c01"}');
select public.odf_uloz('t115-far', '{"id":"a1","k":"oznam","t":"Stratene kluce · upravene","s":"y"}');
reset role;
insert into t select 'A pridal a upravil, autor = A, bez falošných polí', (select x->>'t' = 'Stratene kluce · upravene' and x->>'autor' = '7e57c100-0000-0000-0000-000000115a01' and not x ? 'nahlasili' and not x ? 'modl'
  from public.naboz_stav s, jsonb_array_elements(s.data) x where s.oblast = 'odfarnikov' and s.id = 't115-far' and x->>'id' = 'a1');

-- X: reaguje a nahlási, ale cudzí príspevok neupraví ani nezmaže
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000115c01', false);
do $$ begin
  perform public.odf_uloz('t115-far', '{"id":"a1","k":"oznam","t":"Prepisane","s":""}');
  insert into t values ('X neupraví cudzí príspevok', false);
exception when others then insert into t values ('X neupraví cudzí príspevok', sqlerrm = 'cudzi_prispevok'); end $$;
do $$ begin
  perform public.odf_zmaz('t115-far', 'a1');
  insert into t values ('X nezmaže cudzí príspevok', false);
exception when others then insert into t values ('X nezmaže cudzí príspevok', sqlerrm = 'cudzi_prispevok'); end $$;
select public.odf_reaguj('t115-far', 'a1', 'modl', true, 'Xaver');
select public.odf_nahlas('t115-far', 'a1', 'reklama');
select public.odf_nahlas('t115-far', 'a1', 'znova');
select public.reakcia_f('t115-far', 'parte-1', 'sustrast', true, 'Xaver');
reset role;
insert into t select 'X sa modlí a nahlásil raz', (select x->'modl' = '["7e57c100-0000-0000-0000-000000115c01"]'::jsonb and jsonb_array_length(x->'nahlasili') = 1 and jsonb_array_length(x->'nahlInfo') = 1
  from public.naboz_stav s, jsonb_array_elements(s.data) x where s.oblast = 'odfarnikov' and s.id = 't115-far' and x->>'id' = 'a1');
insert into t select 'reakcia pri parte so svojím kľúčom', (select data->'parte-1'->'sustrast' = '["7e57c100-0000-0000-0000-000000115c01"]'::jsonb from public.naboz_stav where oblast = 'reakcie' and id = 't115-far');
-- X odvolá, A zmaže svoj
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000115c01', false);
select public.reakcia_f('t115-far', 'parte-1', 'sustrast', false);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000115a01', false);
select public.odf_zmaz('t115-far', 'a1');
reset role;
insert into t select 'odvolaná reakcia', (select data->'parte-1'->'sustrast' = '[]'::jsonb from public.naboz_stav where oblast = 'reakcie' and id = 't115-far');
insert into t select 'A zmazal svoj', (select data = '[]'::jsonb from public.naboz_stav where oblast = 'odfarnikov' and id = 't115-far');

-- anon nevolá funkcie
set role anon;
do $$ begin
  perform public.reakcia_f('t115-far', 'parte-1', 'sustrast', true);
  insert into t values ('anon nereaguje', false);
exception when others then insert into t values ('anon nereaguje', true); end $$;
reset role;

select ok, c from t order by ok, c;
rollback;

-- >>> cakajuce_oddelene_test.sql
-- ============================================================
-- Test 0099 — čakajúci príspevok od veriaceho nie je verejne prístupný (OPRAVY 330)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = farár (majiteľ stránky), A = autor (veriaci), X = iný veriaci
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000099f1'), ('7e57c000-0000-0000-0000-0000000099a1'), ('7e57c000-0000-0000-0000-0000000099c1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000099f1','7e57c000-0000-0000-0000-0000000099f1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000099a1','7e57c000-0000-0000-0000-0000000099a1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000099c1','7e57c000-0000-0000-0000-0000000099c1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t99-far','7e57c100-0000-0000-0000-0000000099f1','farnost','Farnosť Test 99',false);
insert into public.naboz_stav (oblast, id, data) values ('farniksmie', 't99-far', '{"oznam":"schvalenie","parte":"povolene"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- A pridá čakajúci oznam a verejné parte (0115: veriaci len cez odf_uloz)
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000099a1', false);
select public.odf_uloz('t99-far', '{"id":"p0","k":"parte","t":"Verejne parte","s":""}');
select public.odf_uloz('t99-far', '{"id":"p1","k":"oznam","t":"Tajny oznam","s":"tajny text","stav":"caka"}');
-- obchádzka: oznam bez stavu (kategória Po schválení) → aj tak čaká
select public.odf_uloz('t99-far', '{"id":"p2","k":"oznam","t":"Obchadzka","s":"bez stavu"}');
insert into t select 'A vidí svoje 2 čakajúce', (select count(*) = 2 from public.odfarnikov_caka where stranka = 't99-far');
reset role;
insert into t select 'verejné pole bez čakajúcich textov', (select data::text not like '%Tajny%' and data::text not like '%Obchadzka%' and data::text like '%Verejne parte%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't99-far');
insert into t select 'autor p1 = A', (select autor = '7e57c100-0000-0000-0000-0000000099a1' from public.odfarnikov_caka where id = 'p1');
insert into t select 'p2 čaká, nie verejný', (select stav = 'caka' and data->>'stav' = 'caka' from public.odfarnikov_caka where id = 'p2');
insert into t select 'farár dostal Čaká na vaše schválenie', (select count(*) >= 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000099f1' and titul = 'Čaká na vaše schválenie ›');

-- X nevidí nič a nezverejní cudzí čakajúci príspevok
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000099c1', false);
insert into t select 'X nevidí čakajúce', (select count(*) = 0 from public.odfarnikov_caka);
select public.odf_uloz('t99-far', '{"id":"p1","k":"oznam","t":"Tajny oznam","s":"tajny text"}');
insert into t select 'X nezverejní cudzí čakajúci', (select data::text not like '%Tajny%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't99-far');
insert into t select 'X nezmaže cudzí čakajúci', not public.zmaz_cakajuci('t99-far', 'p2');
do $$ begin
  perform public.rozhodni_od_veriacich('t99-far', array['p1'], true);
  insert into t values ('rozhodnúť smie len správca', false);
exception when others then insert into t values ('rozhodnúť smie len správca', sqlstate = '42501'); end $$;
-- anon nečíta tabuľku vôbec
reset role;
set role anon;
do $$ declare n int; begin
  select count(*) into n from public.odfarnikov_caka;
  insert into t values ('anon nečíta čakajúce', n = 0);
exception when others then insert into t values ('anon nečíta čakajúce', true); end $$;
reset role;

-- farár vidí oba, zverejní p1 a zamietne p2
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000099f1', false);
insert into t select 'farár vidí čakajúce', (select count(*) = 2 from public.odfarnikov_caka where stranka = 't99-far');
insert into t select 'zverejniť p1', public.rozhodni_od_veriacich('t99-far', array['p1'], true) = 1;
insert into t select 'zamietnuť p2', public.rozhodni_od_veriacich('t99-far', array['p2'], false) = 1;
reset role;
insert into t select 'p1 je verejne bez stavu, s rozhodnute', (select exists (select 1 from jsonb_array_elements(data) x where x->>'id' = 'p1' and x->>'stav' is null and x ? 'rozhodnute') from public.naboz_stav where oblast = 'odfarnikov' and id = 't99-far');
insert into t select 'p1 riadok zverejnene bez textu', (select stav = 'zverejnene' and data = '{}'::jsonb from public.odfarnikov_caka where id = 'p1');
insert into t select 'p2 zamietnuty, nie verejne', (select stav = 'zamietnute' from public.odfarnikov_caka where id = 'p2')
  and (select data::text not like '%Obchadzka%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't99-far');

-- A so starou kópiou (p1 ešte čaká) nič nepokazí; A zmaže zamietnutý p2
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000099a1', false);
do $$ begin perform public.odf_uloz('t99-far', '{"id":"p1","k":"oznam","t":"Tajny oznam","s":"tajny text","stav":"caka"}'); exception when others then null; end $$;
insert into t select 'A vidí rozhodnutie p2', (select stav = 'zamietnute' from public.odfarnikov_caka where id = 'p2');
insert into t select 'A zmaže svoj zamietnutý', public.zmaz_cakajuci('t99-far', 'p2');
reset role;
insert into t select 'stará kópia: p1 ostal verejný', (select exists (select 1 from jsonb_array_elements(data) x where x->>'id' = 'p1' and x->>'stav' is null) from public.naboz_stav where oblast = 'odfarnikov' and id = 't99-far');
insert into t select 'p1 verejne len raz', (select count(*) = 1 from public.naboz_stav s, jsonb_array_elements(s.data) x where s.oblast = 'odfarnikov' and s.id = 't99-far' and x->>'id' = 'p1');

-- presun doterajších (bez prihlásenia, ako v migrácii)
select set_config('request.jwt.claim.sub', '', false);
insert into public.naboz_stav (oblast, id, data) values ('odfarnikov', 't99-far',
  '[{"id":"q1","k":"oznam","t":"Stary cakajuci","stav":"caka","autor":"7e57c100-0000-0000-0000-0000000099a1"},{"id":"q2","k":"oznam","t":"Stary zamietnuty","stav":"zamietnute","autor":"demo"}]')
  on conflict (oblast, id) do update set data = excluded.data;
insert into t select 'presun: verejne nič', (select data::text not like '%Stary%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't99-far');
insert into t select 'presun: q1 čaká s autorom A', (select stav = 'caka' and autor = '7e57c100-0000-0000-0000-0000000099a1' from public.odfarnikov_caka where id = 'q1');
insert into t select 'presun: q2 zamietnutý bez účtu', (select stav = 'zamietnute' and autor is null from public.odfarnikov_caka where id = 'q2');

select ok, c from t order by ok, c;
rollback;

-- >>> umysly_oddelene_test.sql
-- ============================================================
-- Test 0116 — úmysel na omšu číta len autor a farár (OPRAVY 373)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- F = farár, A = autor úmyslu, X = iný veriaci
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000116f01'), ('7e57c000-0000-0000-0000-000000116a01'), ('7e57c000-0000-0000-0000-000000116c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000116f01','7e57c000-0000-0000-0000-000000116f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000116a01','7e57c000-0000-0000-0000-000000116a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000116c01','7e57c000-0000-0000-0000-000000116c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t116-far','7e57c100-0000-0000-0000-000000116f01','farnost','Farnosť Test 116',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- A pošle úmysel aj krátky oznam
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116a01', false);
select public.odf_uloz('t116-far', '{"id":"u1","k":"umysel","t":"Za zosnulú mamu Annu","s":"","kto":"Anna K."}');
select public.odf_uloz('t116-far', '{"id":"o1","k":"parte","t":"Verejne parte","s":""}');
insert into t select 'A vidí svoj úmysel', (select count(*) = 1 from public.odfarnikov_umysly where id = 'u1');
reset role;
insert into t select 'verejné pole bez úmyslu', (select data::text not like '%mamu Annu%' and data::text like '%Verejne parte%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't116-far');
insert into t select 'autor úmyslu = A', (select autor = '7e57c100-0000-0000-0000-000000116a01' from public.odfarnikov_umysly where id = 'u1');
insert into t select 'farár dostal Nový úmysel', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000116f01' and titul = 'Nový úmysel na omšu ›');

-- X ho nevidí ani nezmaže; anon nečíta
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116c01', false);
insert into t select 'X nevidí úmysel', (select count(*) = 0 from public.odfarnikov_umysly);
insert into t select 'X nezmaže úmysel', not public.umysel_zmaz('t116-far', 'u1');
update public.odfarnikov_umysly set data = '{"t":"hack"}' where id = 'u1';
reset role;
set role anon;
do $$ declare n int; begin
  select count(*) into n from public.odfarnikov_umysly;
  insert into t values ('anon nečíta úmysly', n = 0);
exception when others then insert into t values ('anon nečíta úmysly', true); end $$;
reset role;
insert into t select 'X nezmenil úmysel', (select data->>'t' = 'Za zosnulú mamu Annu' from public.odfarnikov_umysly where id = 'u1');

-- farár vidí a zapíše na omšu (cez pole, ako appka)
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116f01', false);
insert into t select 'farár vidí úmysel', (select count(*) = 1 from public.odfarnikov_umysly where stranka = 't116-far');
update public.naboz_stav set data = data || jsonb_build_array((select data || '{"zapis":{"d":"2026-10-20","kod":1,"t":"18:00"}}'::jsonb from public.odfarnikov_umysly where id = 'u1'))
  where oblast = 'odfarnikov' and id = 't116-far';
-- A upraví text, zápis farára ostane
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116a01', false);
select public.odf_uloz('t116-far', '{"id":"u1","k":"umysel","t":"Za zosnulú mamu Annu a otca","s":""}');
reset role;
insert into t select 'zápis farára aj úprava autora', (select data->>'t' = 'Za zosnulú mamu Annu a otca' and data->'zapis'->>'t' = '18:00' from public.odfarnikov_umysly where id = 'u1');
insert into t select 'verejné pole stále bez úmyslu', (select data::text not like '%mamu Annu%' from public.naboz_stav where oblast = 'odfarnikov' and id = 't116-far');
-- A zmaže svoj
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000116a01', false);
insert into t select 'A zmaže svoj úmysel', public.umysel_zmaz('t116-far', 'u1');
reset role;

select ok, c from t order by ok, c;
rollback;

-- >>> umysel_sprava_test.sql
-- ============================================================
-- Test 0117 — správa farára pri úmysle príde autorovi do zvončeka (OPRAVY 375)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000117f01'), ('7e57c000-0000-0000-0000-000000117a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000117f01','7e57c000-0000-0000-0000-000000117f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000117a01','7e57c000-0000-0000-0000-000000117a01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t117-far','7e57c100-0000-0000-0000-000000117f01','farnost','Farnosť Test 117',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000117a01', false);
select public.odf_uloz('t117-far', '{"id":"u1","k":"umysel","t":"Za rodinu","s":""}');
do $$ begin
  perform public.umysel_sprava('t117-far', 'u1', 'Ahoj');
  insert into t values ('správu posiela len správca', false);
exception when others then insert into t values ('správu posiela len správca', sqlerrm = 'nie_spravca'); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000117f01', false);
insert into t select 'farár pošle správu', public.umysel_sprava('t117-far', 'u1', 'Omša bude v nedeľu o 9:00.');
reset role;
insert into t select 'autor má upozornenie s odkazom na úmysel', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000117a01'
  and titul = 'Správa od farnosti · Farnosť Test 117' and text = 'Omša bude v nedeľu o 9:00.' and odkaz = 'um:t117-far:u1');
insert into t select 'správa je pri úmysle', (select data->'sprava'->>'text' = 'Omša bude v nedeľu o 9:00.' from public.odfarnikov_umysly where id = 'u1');

select ok, c from t order by ok, c;
rollback;

-- >>> podiel_neverejny_test.sql
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

-- >>> deti_prihlasenie_test.sql
-- ============================================================
-- Test 0119 — mená prihlásených detí číta len rodič a farár, verejne len počet (OPRAVY 383)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000119f01'), ('7e57c000-0000-0000-0000-000000119a01'), ('7e57c000-0000-0000-0000-000000119c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000119f01','7e57c000-0000-0000-0000-000000119f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000119a01','7e57c000-0000-0000-0000-000000119a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000119c01','7e57c000-0000-0000-0000-000000119c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t119-far','7e57c100-0000-0000-0000-000000119f01','farnost','Farnosť Test 119',false);
insert into public.naboz_stav (oblast, id, data) values ('deti', 't119-far', '[{"id":"tab1","druh":"Tábor","t":"Letný tábor","pz":2,"limit":1}]');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119a01', false);
select public.deti_prihlas('t119-far', 'tab1', true, 'Janko Novák');
do $$ begin
  perform public.reakcia_f('t119-far', 'tab1', 'ucast', true, 'Janko');
  insert into t values ('do verejných reakcií nie', false);
exception when others then insert into t values ('do verejných reakcií nie', sqlerrm = 'deti'); end $$;
insert into t select 'rodič vidí svoje prihlásenie', (select count(*) = 1 from public.deti_prihlasenie where meno = 'Janko Novák');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119c01', false);
insert into t select 'iný nevidí mená', (select count(*) = 0 from public.deti_prihlasenie);
do $$ begin
  perform public.deti_prihlas('t119-far', 'tab1', true, 'Ferko');
  insert into t values ('plný tábor neprihlási', false);
exception when others then insert into t values ('plný tábor neprihlási', sqlerrm = 'plne'); end $$;
reset role;
set role anon;
insert into t select 'anon vidí len počet', (public.deti_pocty('t119-far')->>'tab1')::int = 1;
do $$ declare n int; begin
  select count(*) into n from public.deti_prihlasenie;
  insert into t values ('anon nečíta mená', n = 0);
exception when others then insert into t values ('anon nečíta mená', true); end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119f01', false);
insert into t select 'farár vidí meno', (select meno = 'Janko Novák' from public.deti_prihlasenie where ref = 'tab1');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119a01', false);
select public.deti_prihlas('t119-far', 'tab1', false);
reset role;
insert into t select 'rodič odhlásil', (select count(*) = 0 from public.deti_prihlasenie);
insert into t select 'verejné reakcie bez mien detí', not exists (select 1 from public.naboz_stav where oblast = 'reakcie' and id = 't119-far' and data::text like '%Janko%');

select ok, c from t order by ok, c;
rollback;

-- >>> ludia_spravcovia_test.sql
-- ============================================================
-- Test 0120 (+0124) — človek zo Správa → Ľudia je správca stránky (pomocník), cudzí nie; po odobratí práva stratí (OPRAVY 380, 393)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000120f01', 'farar@test.sk'), ('7e57c000-0000-0000-0000-000000120a01', 'Kaplan@Test.sk'),
  ('7e57c000-0000-0000-0000-000000120b01', 'kostolnik@test.sk'), ('7e57c000-0000-0000-0000-000000120c01', 'cudzi@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000120f01','7e57c000-0000-0000-0000-000000120f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000120a01','7e57c000-0000-0000-0000-000000120a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000120b01','7e57c000-0000-0000-0000-000000120b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000120c01','7e57c000-0000-0000-0000-000000120c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t120-far','7e57c100-0000-0000-0000-000000120f01','farnost','Farnosť Test 120',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- farár pridá kaplána a kostolníka (ako appka: nastavenia_stranky, kľúč „ludia“)
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t120-far', '{"ludia":[{"id":1,"n":"","k":"kaplan@test.sk","r":"Kaplán / zástupca","caka":false},{"id":2,"n":"","k":"kostolnik@test.sk","r":"Kostolník / pomocník","caka":false}]}');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120a01', false);
insert into t select 'kaplán je správca', public.spravujem_stranku('t120-far');
insert into public.naboz_stav (oblast, id, data) values ('profil', 't120-far', '{"nazov":"od kaplána"}');
insert into t select 'kaplán zapíše stav farnosti', exists (select 1 from public.naboz_stav where oblast = 'profil' and id = 't120-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120b01', false);
insert into t select 'kostolník je pomocník (0124)', public.spravujem_stranku('t120-far') and not public.plne_prava('t120-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120c01', false);
insert into t select 'cudzí nie je správca', not public.spravujem_stranku('t120-far');

-- farár kaplána odoberie
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120f01', false);
update public.nastavenia_stranky set data = '{"ludia":[{"id":2,"n":"","k":"kostolnik@test.sk","r":"Kostolník / pomocník","caka":false}]}' where stranka = 't120-far';
insert into t select 'farár ostáva správca', public.spravujem_stranku('t120-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120a01', false);
insert into t select 'odobratý kaplán práva stratil', not public.spravujem_stranku('t120-far');
reset role;

select ok, c from t order by ok, c;
rollback;

-- >>> zbierka_verejna_test.sql
-- ============================================================
-- Test 0121 — verejný pohľad zbierky bez rozdelenia a podielu farnosti (OPRAVY 384)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000121f01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000121f01','7e57c000-0000-0000-0000-000000121f01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t121-far','7e57c100-0000-0000-0000-000000121f01','farnost','Farnosť Test 121',false);
-- bez spúšťačov (overenie účtu, rozdelenie) — testuje sa len pohľad
set session_replication_role = replica;
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, nastavenie) values
 ('zb-121','Pohreb','nabozenstvo','zbierka','aktivna','t121-far','7e57c100-0000-0000-0000-000000121f01',
  '{"nazov":"Pohreb","rozdelenie":[{"druh":"prijemca","ucet":"x","podiel":0.97},{"druh":"overovatel","podiel":0.03}],"overenie_prijemcu":"abc",
    "farnost":{"druh":"pohreb","podiel":3,"prijemca":{"meno":"Pozostalý","ucet":"x"},"podelit":[{"id":"ch","nazov":"Charita","pct":10}]}}');
update public.zbierka set zapecatena = now() where id = 'zb-121';
set session_replication_role = origin;
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role anon;
insert into t select 'anon: bez rozdelenia, podielu farnosti a overenia', (select not (nastavenie ? 'rozdelenie') and not (nastavenie ? 'overenie_prijemcu') and not (nastavenie->'farnost' ? 'podiel')
  and not (nastavenie->'farnost'->'prijemca' ? 'ucet') from public.zbierka_verejna where id = 'zb-121');
insert into t select 'anon: podelenie rodiny ostáva', (select nastavenie->'farnost'->'podelit'->0->>'nazov' = 'Charita' and nastavenie->>'nazov' = 'Pohreb' from public.zbierka_verejna where id = 'zb-121');
reset role;
select ok, c from t order by ok, c;
rollback;

-- >>> koordinator_deti_test.sql
-- ============================================================
-- Test 0123 (+0124) — koordinátor detí (pomocník) spravuje deti a vidí mená prihlásených detí; cudzí nie (OPRAVY 380, 393)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000123f01', 'farar@test.sk'), ('7e57c000-0000-0000-0000-000000123d01', 'Koord@Test.sk'),
  ('7e57c000-0000-0000-0000-000000123b01', 'cudzi@test.sk'), ('7e57c000-0000-0000-0000-000000123e01', 'rodic@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000123f01','7e57c000-0000-0000-0000-000000123f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000123d01','7e57c000-0000-0000-0000-000000123d01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000123b01','7e57c000-0000-0000-0000-000000123b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000123e01','7e57c000-0000-0000-0000-000000123e01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t123-far','7e57c100-0000-0000-0000-000000123f01','farnost','Farnosť Test 123',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t123-far', '{"ludia":[{"id":1,"n":"","k":"koord@test.sk","r":"Koordinátor detí a mládeže"},{"id":2,"n":"","k":"kostolnik@test.sk","r":"Kostolník / pomocník"}]}');
insert into public.naboz_stav (oblast, id, data) values ('deti', 't123-far', '[{"id":"s1","druh":"Tábor","pz":2,"limit":10}]');

-- rodič prihlási dieťa
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123e01', false);
select public.deti_prihlas('t123-far', 's1', true, 'Janko');

-- koordinátor
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123d01', false);
insert into t select 'koordinátor spravuje deti', public.spravujem_deti('t123-far');
insert into t select 'koordinátor je pomocník, nie farár', public.spravujem_stranku('t123-far') and not public.plne_prava('t123-far');
insert into t select 'koordinátor vidí meno dieťaťa', exists (select 1 from public.deti_prihlasenie where stranka = 't123-far' and meno = 'Janko');
update public.naboz_stav set data = '[{"id":"s1","druh":"Tábor","pz":2,"limit":12}]' where oblast = 'deti' and id = 't123-far';
insert into t select 'koordinátor upraví stretnutie', (select data->0->>'limit' from public.naboz_stav where oblast = 'deti' and id = 't123-far') = '12';
do $$ begin
  begin update public.nastavenia_stranky set data = data || '{"ludia":[]}' where stranka = 't123-far'; insert into t values ('koordinátor nezmení ľudí', false);
  exception when insufficient_privilege then insert into t values ('koordinátor nezmení ľudí', true); end;
end $$;

-- cudzí (nie je v Ľuďoch)
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123b01', false);
insert into t select 'cudzí nespravuje deti', not public.spravujem_deti('t123-far');
insert into t select 'cudzí nevidí mená detí', not exists (select 1 from public.deti_prihlasenie where stranka = 't123-far');

-- farár koordinátora odoberie
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123f01', false);
insert into t select 'farár spravuje deti', public.spravujem_deti('t123-far');
update public.nastavenia_stranky set data = '{"ludia":[]}' where stranka = 't123-far';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123d01', false);
insert into t select 'odobratý koordinátor práva stratil', not public.spravujem_deti('t123-far');
insert into t select 'odobratý koordinátor nevidí mená', not exists (select 1 from public.deti_prihlasenie where stranka = 't123-far');
reset role;

select ok, c from t order by ok, c;
rollback;

-- >>> farar_pomocnik_test.sql
-- ============================================================
-- Test 0124 — Farár a Pomocník (OPRAVY 393): pomocník spravuje stránku, ale nemení ľudí, účet farnosti ani predplatné;
-- človek v Ľuďoch s rolou duchovného je farár; moje_stranky vráti stránku s úrovňou; po odobratí práva zmiznú.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000124f01', 'vlastnik@test.sk'), ('7e57c000-0000-0000-0000-000000124a01', 'pomocnik@test.sk'),
  ('7e57c000-0000-0000-0000-000000124b01', 'farar2@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000124f01','7e57c000-0000-0000-0000-000000124f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000124a01','7e57c000-0000-0000-0000-000000124a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000124b01','7e57c000-0000-0000-0000-000000124b01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t124-far','7e57c100-0000-0000-0000-000000124f01','farnost','Farnosť Test 124',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t124-far',
  '{"ludia":[{"id":1,"n":"","k":"pomocnik@test.sk","r":"Pomocník","p":"kaplán"},{"id":2,"n":"","k":"farar2@test.sk","r":"Farár"}],"ucetFarnosti":"SK00"}');
insert into t select 'vlastník je farár', public.uroven_stranky('t124-far') = 'farar';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124a01', false);
insert into t select 'pomocník má úroveň pomocník', public.uroven_stranky('t124-far') = 'pomocnik';
insert into public.naboz_stav (oblast, id, data) values ('profil', 't124-far', '{"nazov":"od pomocníka"}');
insert into t select 'pomocník zapíše stav farnosti', exists (select 1 from public.naboz_stav where oblast = 'profil' and id = 't124-far');
update public.nastavenia_stranky set data = data || '{"vzhlad":"x"}' where stranka = 't124-far';
insert into t select 'pomocník zmení iné nastavenie', (select data->>'vzhlad' from public.nastavenia_stranky where stranka = 't124-far') = 'x';
do $$ declare k text; begin
  foreach k in array array['ludia', 'ucetFarnosti', 'predplatne', 'duch'] loop
    begin
      update public.nastavenia_stranky set data = data || jsonb_build_object(k, '[]'::jsonb) where stranka = 't124-far';
      insert into t values ('pomocník nezmení ' || k, false);
    exception when insufficient_privilege then insert into t values ('pomocník nezmení ' || k, true); end;
  end loop;
end $$;
insert into t select 'moje_stranky: pomocník', exists (select 1 from jsonb_array_elements(public.moje_stranky()) x where x->>'id' = 't124-far' and x->>'uroven' = 'pomocnik');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124b01', false);
insert into t select 'druhý farár z Ľudí je farár', public.plne_prava('t124-far');
update public.nastavenia_stranky set data = data || '{"ucetFarnosti":"SK11"}' where stranka = 't124-far';
insert into t select 'farár zmení účet farnosti', (select data->>'ucetFarnosti' from public.nastavenia_stranky where stranka = 't124-far') = 'SK11';
update public.nastavenia_stranky set data = data || '{"ludia":[{"id":2,"n":"","k":"farar2@test.sk","r":"Farár"}]}' where stranka = 't124-far';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124a01', false);
insert into t select 'odobratý pomocník nemá práva', public.uroven_stranky('t124-far') is null and not public.spravujem_stranku('t124-far');
reset role;

-- prevod starých rolí (0124 bod 5) — rovnaký výraz na ukážkovom zozname
insert into t select 'stará rola → Pomocník s popisom', (
  select c->>'r' = 'Pomocník' and c->>'p' = 'Kaplán / zástupca'
    from jsonb_array_elements((select coalesce(jsonb_agg(case when c->>'r' = 'Dozorca' or c->>'r' = 'Pomocník' or c->>'r' in (select titul from public.cirkev) then c
                   else c || jsonb_build_object('r', 'Pomocník', 'p', coalesce(nullif(trim(c->>'p'), ''), c->>'r')) end), '[]'::jsonb)
       from jsonb_array_elements('[{"k":"a@b.sk","r":"Kaplán / zástupca"}]'::jsonb) c)) c);

select ok, c from t order by ok, c;
rollback;

-- >>> pozvanka_test.sql
-- ============================================================
-- Test 0125 — pozvánka do Správy (OPRAVY 392): pozvaný e-mailom dostane upozornenie, práva až po Prijať,
-- odmietnutý práva nemá, cudzí pozvánku neprijme, QR pozvánku prijme ktokoľvek prihlásený, kým platí.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000125f01', 'farar@test.sk'), ('7e57c000-0000-0000-0000-000000125a01', 'Pozvany@Test.sk'),
  ('7e57c000-0000-0000-0000-000000125b01', 'druhy@test.sk'), ('7e57c000-0000-0000-0000-000000125c01', 'cudzi@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000125f01','7e57c000-0000-0000-0000-000000125f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000125a01','7e57c000-0000-0000-0000-000000125a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000125b01','7e57c000-0000-0000-0000-000000125b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000125c01','7e57c000-0000-0000-0000-000000125c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t125-far','7e57c100-0000-0000-0000-000000125f01','farnost','Farnosť Test 125',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t125-far',
  ('{"ludia":[{"id":1,"n":"","k":"pozvany@test.sk","r":"Pomocník","p":"kaplán","caka":true},{"id":2,"n":"","k":"pozvánka cez odkaz","r":"Pomocník","caka":"odkaz","dos":' || ((extract(epoch from now()) * 1000)::bigint + 3600000) || '},'
   || '{"id":3,"n":"","k":"pozvánka cez odkaz","r":"Pomocník","caka":"odkaz","dos":1}]}')::jsonb);
reset role;
insert into t select 'pozvaný dostal upozornenie', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000125a01' and odkaz = 'poz:t125-far:1' and titul like 'Farnosť Test 125 vás pozýva do Správy · kaplán · Pomocník');
set role authenticated;

-- pozvaný: pred prijatím bez práv
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125a01', false);
insert into t select 'pred prijatím bez práv', not public.spravujem_stranku('t125-far');
insert into t select 'pozvánka: čaká', public.pozvanka('t125-far', '1')->>'stav' = 'caka';
-- cudzí jeho pozvánku nevidí ani neprijme
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125c01', false);
do $$ begin begin perform public.pozvanka_odpoved('t125-far', '1', true); insert into t values ('cudzí neprijme cudziu pozvánku', false);
  exception when others then insert into t values ('cudzí neprijme cudziu pozvánku', true); end; end $$;
-- pozvaný prijme
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125a01', false);
insert into t select 'prijal', public.pozvanka_odpoved('t125-far', '1', true) = 'prijal';
insert into t select 'po prijatí pomocník', public.uroven_stranky('t125-far') = 'pomocnik';
insert into t select 'stav prijal', public.pozvanka('t125-far', '1')->>'stav' = 'prijal';
do $$ begin begin update public.nastavenia_stranky set data = data || '{"ludia":[]}' where stranka = 't125-far'; insert into t values ('pomocník inak ľudí nezmení', false);
  exception when insufficient_privilege then insert into t values ('pomocník inak ľudí nezmení', true); end; end $$;

-- QR pozvánka: druhý ju prijme, vypršaná nejde
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125b01', false);
insert into t select 'QR prijatá', public.pozvanka_odpoved('t125-far', '2', true) = 'prijal';
insert into t select 'QR prijatý je pomocník', public.uroven_stranky('t125-far') = 'pomocnik';
insert into t select 'vypršaná QR: stav', public.pozvanka('t125-far', '3')->>'stav' = 'vyprsala';
do $$ begin begin perform public.pozvanka_odpoved('t125-far', '3', true); insert into t values ('vypršaná QR nejde prijať', false);
  exception when others then insert into t values ('vypršaná QR nejde prijať', true); end; end $$;

-- farár znova pozve e-mailom, pozvaný odmietne
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125f01', false);
update public.nastavenia_stranky set data = jsonb_set(data, '{ludia,0}', '{"id":1,"n":"","k":"pozvany@test.sk","r":"Pomocník","caka":true}') where stranka = 't125-far';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000125a01', false);
insert into t select 'opäť pozvaný bez práv', not public.spravujem_stranku('t125-far');
insert into t select 'odmietol', public.pozvanka_odpoved('t125-far', '1', false) = 'odmietol';
insert into t select 'odmietnutý bez práv', not public.spravujem_stranku('t125-far');
reset role;
insert into t select 'u farára stav odmietol', (select c->>'caka' from public.nastavenia_stranky n, jsonb_array_elements(n.data->'ludia') c where n.stranka = 't125-far' and c->>'id' = '1') = 'odmietol';

select ok, c from t order by ok, c;
rollback;

