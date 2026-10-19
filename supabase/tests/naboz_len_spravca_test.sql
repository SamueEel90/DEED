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
