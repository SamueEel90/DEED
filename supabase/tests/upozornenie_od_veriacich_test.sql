-- ============================================================
-- Test 0097 — upozornenie farárovi o príspevku od veriaceho (nový, čaká, úmysel, nahlásený, raz, vypnuté)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = vlastník stránky t97-far, S = štatutár organizácie, V = veriaci (zapisuje)
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000097a1'), ('7e57c000-0000-0000-0000-0000000097b1'), ('7e57c000-0000-0000-0000-0000000097c1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000097a1','7e57c000-0000-0000-0000-0000000097a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000097b1','7e57c000-0000-0000-0000-0000000097b1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000097c1','7e57c000-0000-0000-0000-0000000097c1','aktivny','hotovo');
insert into public.statutar (org_ucet_id, osoba_ucet_id) values ('7e57c100-0000-0000-0000-0000000097a1','7e57c100-0000-0000-0000-0000000097b1');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t97-far','7e57c100-0000-0000-0000-0000000097a1','farnost','Farnosť Test',true);
\pset tuples_only on
create temp table t(c text, ok boolean);

-- veriaci pridá 3 veci (čaká, zverejnený, úmysel) a 1 farárovu (osobne)
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000097c1', false);
insert into public.naboz_stav (oblast, id, data) values ('odfarnikov', 't97-far',
 '[{"id":"p1","k":"parte","t":"Ján","kto":"Eva","stav":"caka"},{"id":"p2","k":"fotky","t":"Púť"},{"id":"p3","k":"umysel","t":"Za rodičov"},{"id":"p4","k":"oznam","t":"Farár","osobne":true}]');
create temp view n97 as select * from public.notifikacia where ucet_id in ('7e57c100-0000-0000-0000-0000000097a1','7e57c100-0000-0000-0000-0000000097b1','7e57c100-0000-0000-0000-0000000097c1');
insert into t select 'vlastník dostal 3', (select count(*) from n97 where ucet_id = '7e57c100-0000-0000-0000-0000000097a1') = 3;
insert into t select 'štatutár dostal 3', (select count(*) from n97 where ucet_id = '7e57c100-0000-0000-0000-0000000097b1') = 3;
insert into t select 'autor nič', not exists (select 1 from n97 where ucet_id = '7e57c100-0000-0000-0000-0000000097c1');
insert into t select 'čaká na schválenie + text', exists (select 1 from n97 where titul = 'Čaká na vaše schválenie ›' and text = 'Parte: Ján · Eva' and odkaz = 'odv:t97-far:p1');
insert into t select 'úmysel', exists (select 1 from n97 where titul = 'Nový úmysel na omšu ›');
insert into t select 'osobne nič', not exists (select 1 from n97 where odkaz = 'odv:t97-far:p4');

-- opätovný zápis toho istého poľa nič nepošle; nahlásenie áno (raz)
update public.naboz_stav set data = data where oblast = 'odfarnikov' and id = 't97-far';
insert into t select 'opätovný zápis nič', (select count(*) from n97) = 6;
update public.naboz_stav set data = jsonb_set(data, '{1,nahlasili}', '["x"]') where oblast = 'odfarnikov' and id = 't97-far';
update public.naboz_stav set data = data where oblast = 'odfarnikov' and id = 't97-far';
insert into t select 'nahlásený raz pre každého', (select count(*) from n97 where titul = 'Nahlásený príspevok ›') = 2;

-- farár vypne upozornenia
insert into public.naboz_stav (oblast, id, data) values ('odfnast', 't97-far', '{"upozornit":false}');
update public.naboz_stav set data = data || '[{"id":"p5","k":"oznam","t":"Nový"}]' where oblast = 'odfarnikov' and id = 't97-far';
insert into t select 'vypnuté nič', not exists (select 1 from n97 where odkaz = 'odv:t97-far:p5');

select c, ok from t order by ok, c;
do $$ begin if exists (select 1 from t where not ok) then raise exception 'Test 0097 zlyhal'; end if; end $$;
rollback;
