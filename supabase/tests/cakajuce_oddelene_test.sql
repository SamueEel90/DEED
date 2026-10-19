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
