-- ============================================================
-- Test dorovnania (Zadanie 3 · 3.3, migrácia 0046) — stavový automat v DB nad escrow.
-- Spustiť po migráciách: psql -f supabase/tests/dorovnanie_test.sql
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Všetky riadky musia mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57a000-0000-0000-0000-0000000000d1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e570000-0000-0000-0000-0000000000d1','7e57a000-0000-0000-0000-0000000000d1','aktivny','hotovo');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table v(k text primary key, j jsonb);
grant all on v to public;
-- čísla účtov firiem (appka ich pozná z registra; klient cudzí účet z tabuľky nečíta — 0049)
create temp table fc as select id, cislo from public.ucet where typ = 'firma';
grant select on fc to public;

set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000d1', false);

-- cieľ testovacej stránky „svetlo"
select public.dorovnanie_ciel_pridaj('test-ciel', 'svetlo', 'Testovací cieľ');
-- neexistujúci cieľ sa nedá
do $$ begin
  perform public.dorovnanie_zapecat(jsonb_build_object('firmaUcet', (select cislo from fc where id='f1000000-0000-4000-8000-000000000001'), 'ciel', 'nikde', 'pomer', 1, 'strop', 100, 'do', extract(epoch from now() + interval '10 days') * 1000));
  insert into t values ('neexistujuci ciel odmietnuty', false);
exception when others then insert into t values ('neexistujuci ciel odmietnuty', sqlerrm like 'Cieľ%');
end $$;
-- zlý pomer
do $$ begin
  perform public.dorovnanie_zapecat(jsonb_build_object('firmaUcet', (select cislo from fc where id='f1000000-0000-4000-8000-000000000001'), 'ciel', 'test-ciel', 'pomer', 3, 'strop', 100, 'do', extract(epoch from now() + interval '10 days') * 1000));
  insert into t values ('zly pomer odmietnuty', false);
exception when others then insert into t values ('zly pomer odmietnuty', sqlerrm like 'Neplatný pomer%');
end $$;

-- A · úhrada cez DEED: hneď na viazanom účte, po 48 h samo aktívne
insert into v select 'a', public.dorovnanie_zapecat(jsonb_build_object('firmaUcet', (select cislo from fc where id='f1000000-0000-4000-8000-000000000001'),
  'ciel', 'test-ciel', 'pomer', 1, 'strop', 100, 'stropDaru', 30, 'uhrada', 'deed', 'kanal', 'karta', 'do', extract(epoch from now() + interval '10 days') * 1000));
-- B · úhrada mimo DEED: bez pohybov, čaká na potvrdenie charity
insert into v select 'b', public.dorovnanie_zapecat(jsonb_build_object('firmaUcet', (select cislo from fc where id='f1000000-0000-4000-8000-000000000002'),
  'ciel', 'test-ciel', 'pomer', 2, 'strop', 50, 'uhrada', 'mimo', 'kanal', 'sepa', 'do', extract(epoch from now() + interval '10 days') * 1000));
reset role;

insert into t select 'A: financovane, escrow = strop', d.financovane and public.escrow_zostatok(d.escrow_id) = 100 and d.stav = 'zapecatene'
  from dorovnanie d where id = (select j->>'id' from v where k='a');
insert into t select 'A: pohyby pokladna->firma->viazane', (select count(*) from pohyb p join dorovnanie d on p.escrow_id = d.escrow_id where d.id = (select j->>'id' from v where k='a')) = 2;
insert into t select 'B: bez pohybov, doklad existuje', not d.financovane and d.escrow_id is null and d.doklad is not null and d.stav = 'zapecatene'
  from dorovnanie d where id = (select j->>'id' from v where k='b');

-- priamy UPDATE zapečatených parametrov neprejde (ani ako postgres)
do $$ begin
  update dorovnanie set pomer = 5 where id = (select j->>'id' from v where k='a');
  insert into t values ('pecat: pomer sa nezmeni', false);
exception when others then insert into t values ('pecat: pomer sa nezmeni', sqlerrm like 'Dorovnanie je zapečatené%');
end $$;
do $$ begin
  delete from dorovnanie where id = (select j->>'id' from v where k='a');
  insert into t values ('pecat: nemaze sa', false);
exception when others then insert into t values ('pecat: nemaze sa', sqlerrm like 'Dorovnanie sa nemaže%');
end $$;

-- 48 h tichý súhlas: posuň oznámenie (simulácia času; trigger pečate oznamene nestráži)
update dorovnanie set oznamene = now() - interval '49 hours' where id in (select j->>'id' from v);
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000d1', false);
select public.dorovnania_nacitaj() is not null;
reset role;
insert into t select 'A: po 48 h aktivne automaticky', stav = 'aktivne' and automaticky from dorovnanie where id = (select j->>'id' from v where k='a');
insert into t select 'B: mimo DEED po 48 h samo nie', stav = 'zapecatene' from dorovnanie where id = (select j->>'id' from v where k='b');

-- dar: dorovnanie = min(dar × pomer, strop daru, zostatok); presun viazané → stránka
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000d1', false);
insert into v select 'd1', public.dorovnanie_dar('test-ciel', 20, null, 'idem-1', 'Test D.');
insert into v select 'd1b', public.dorovnanie_dar('test-ciel', 20, null, 'idem-1', 'Test D.');
insert into v select 'd2', public.dorovnanie_dar('test-ciel', 50, null, 'idem-2', null);
reset role;
insert into t select 'dar 20 -> 20', (select (j->>'dorovnane')::numeric from v where k='d1') = 20;
insert into t select 'idempotencia: rovnaky idem nepresunie znova', (select (j->>'dorovnane')::numeric from v where k='d1b') = 20
  and (select count(*) from dorovnanie_zaznam where dorovnanie_id = (select j->>'id' from v where k='a')) = 2;
insert into t select 'dar 50 -> strop daru 30', (select (j->>'dorovnane')::numeric from v where k='d2') = 30;
insert into t select 'escrow A = 100 - 50', public.escrow_zostatok(escrow_id) = 50 from dorovnanie where id = (select j->>'id' from v where k='a');
insert into t select 'zaznam ma pohyb do uctu stranky', bool_and(p.ucet_kredit = public.ucet_stranky('svetlo') and p.typ = 'dorovnanie')
  from dorovnanie_zaznam z join pohyb p on p.id = z.pohyb_id where z.dorovnanie_id = (select j->>'id' from v where k='a');

-- B: charita potvrdí platbu mimo DEED → pohyby so sepa, potvrdene → spusti → aktivne
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000d1', false);
select public.dorovnanie_krok((select j->>'id' from v where k='b'), 'potvrd_platbu') is not null;
reset role;
insert into t select 'B: po potvrdeni financovane sepa', d.financovane and d.stav = 'potvrdene'
  and (select bool_and(kanal = 'sepa') from pohyb where escrow_id = d.escrow_id)
  from dorovnanie d where id = (select j->>'id' from v where k='b');
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000d1', false);
select public.dorovnanie_krok((select j->>'id' from v where k='b'), 'spusti') is not null;
-- predčasné ukončenie A → pozastavené + vrátenie zvyšku, potom vrátenie cez DEED
select public.dorovnanie_krok((select j->>'id' from v where k='a'), 'ukonci_dorovnanie') is not null;
select public.dorovnanie_krok((select j->>'id' from v where k='a'), 'vrat_zvysok', '{"cez":"deed"}') is not null;
reset role;
insert into t select 'B: aktivne', stav = 'aktivne' from dorovnanie where id = (select j->>'id' from v where k='b');
insert into t select 'A: ukoncene, escrow 0, vratenie s VS', d.stav = 'ukoncene' and public.escrow_zostatok(d.escrow_id) = 0
  and exists (select 1 from pohyb p where p.escrow_id = d.escrow_id and p.typ = 'vratenie' and p.vs = d.vratenie->>'vs' and p.ucet_kredit = d.firma_ucet)
  from dorovnanie d where id = (select j->>'id' from v where k='a');
-- teraz beží len B (pomer 2, strop 50)
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000d1', false);
insert into v select 'd3', public.dorovnanie_dar('test-ciel', 40, null, 'idem-3', null);
reset role;
insert into t select 'B: dar 40 x 2 -> zostatok 50, vycerpane', (select (j->>'dorovnane')::numeric from v where k='d3') = 50
  and (select stav from dorovnanie where id = (select j->>'id' from v where k='b')) = 'vycerpane';

-- zrušiť zaplatené sa nedá
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000d1', false);
do $$ begin
  perform public.dorovnanie_krok((select j->>'id' from v where k='b'), 'zrus');
  insert into t values ('zrus zaplateneho odmietnuty', false);
exception when others then insert into t values ('zrus zaplateneho odmietnuty', true);
end $$;

-- testovacie dorovnania (ukážka)
select public.dorovnania_testovacie('charita', 'svetlo', '{"strecha":"ts-strecha","vozik":"ts-vozik","ovocie":"ts-ovocie","skolske":"ts-skolske","seniori":"ts-seniori","deti":"ts-deti"}');
select public.dorovnania_testovacie('charita', 'svetlo', '{"strecha":"ts-strecha"}');   -- druhé volanie nič nepridá
reset role;
insert into t select 'seed: 6 dorovnani raz', (select count(*) from dorovnanie where entita = 'charita') = 6;
insert into t select 'seed: dorovnane sumy', (select coalesce(sum(dorovnane), 0) from dorovnanie_zaznam where dorovnanie_id = 'dv-t-a-svetlo') = 820
  and (select sum(dorovnane) from dorovnanie_zaznam where dorovnanie_id = 'dv-t-d-svetlo') = 600;
insert into t select 'seed: stavy', (select string_agg(stav, ',' order by id) from dorovnanie where entita = 'charita')
  = 'aktivne,aktivne,zapecatene,vycerpane,pozastavene,zapecatene';
insert into t select 'seed: mimo DEED bez pohybov', not financovane from dorovnanie where id = 'dv-t-g-svetlo';
insert into t select 'seed: testovacie pohyby z testovacej pokladne', not exists (
  select 1 from pohyb p join dorovnanie d on d.escrow_id = p.escrow_id where d.testovaci and p.typ = 'dobitie' and p.ucet_debet <> public.ucet_systemu('testovacia_pokladna'));

-- ledger: viazaný účet = súčet zostatkov escrow dorovnaní; žiadny escrow v mínuse
insert into t select 'escrow nikde v minuse', not exists (select 1 from dorovnanie d where d.escrow_id is not null and public.escrow_zostatok(d.escrow_id) < 0);
insert into t select 'kazdy zaznam ma pohyb', not exists (select 1 from dorovnanie_zaznam where pohyb_id is null);
insert into t select 'json: zaznamy a stav pre appku', (select count(*) from jsonb_array_elements(public.dorovnania_nacitaj())) >= 8;

select ok, c from t order by ok, c;
rollback;
