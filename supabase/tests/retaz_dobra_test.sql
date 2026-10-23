-- ============================================================
-- Test 0093 + 0094 + 0095 — Reťaz dobra na serveri: zapečatenie, oznámenia, podiely v ledgeri na cent, posun radu, 100 % tvorcovi, stránky, Testovanie
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- T = tvorca, A = charita A (zbierky 1 a 3), B = charita B (zbierka 2), D = darca
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000093a1'), ('7e57c000-0000-0000-0000-0000000093b1'),
 ('7e57c000-0000-0000-0000-0000000093c1'), ('7e57c000-0000-0000-0000-0000000093d1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000093a1','7e57c000-0000-0000-0000-0000000093a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000093b1','7e57c000-0000-0000-0000-0000000093b1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000093c1','7e57c000-0000-0000-0000-0000000093c1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000093d1','7e57c000-0000-0000-0000-0000000093d1','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-0000000093c1', 'Martin', 'Konaľ');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t93-a','7e57c100-0000-0000-0000-0000000093a1','charita','Charita A',true),
 ('t93-b','7e57c100-0000-0000-0000-0000000093b1','charita','Charita B',true);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel) values
 ('t93-z1','Strecha','charity','zbierka','aktivna','t93-a','7e57c100-0000-0000-0000-0000000093a1', now(), 20),
 ('t93-z3','Lieky','charity','zbierka','aktivna','t93-a','7e57c100-0000-0000-0000-0000000093a1', now(), 500),
 ('t93-z2','Zima','charity','zbierka','aktivna','t93-b','7e57c100-0000-0000-0000-0000000093b1', now(), 1000),
 ('t93-zt','Vlastná','help','zbierka','aktivna',null,'7e57c100-0000-0000-0000-0000000093c1', now(), 100);
-- 0168: tento test overuje mechaniku reťaze; automatické uzavretie po naplnení cieľa tu vypnuté (testuje ho zbierka_auto_uzavriet_test)
update public.zbierka set auto_uzavriet = false where id like 't93-%';
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- ---- zapečatenie ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093c1', false);
do $$ begin
  perform public.retaz_zapecat('rt-zle', '[{"zbierka":"t93-z1","pct":7}]');
  insert into t values ('pct 7 odmietne', false);
exception when others then insert into t values ('pct 7 odmietne', sqlerrm like 'Percento%');
end $$;
do $$ begin
  perform public.retaz_zapecat('rt-zle', '[{"zbierka":"t93-zt","pct":25}]');
  insert into t values ('vlastna zbierka odmietne', false);
exception when others then insert into t values ('vlastna zbierka odmietne', sqlerrm like 'Vlastnú%');
end $$;
do $$ begin
  perform public.retaz_zapecat('rt-zle', '[{"zbierka":"z-skola","pct":25}]');
  insert into t values ('zbierka mimo DEED odmietne', false);
exception when others then insert into t values ('zbierka mimo DEED odmietne', sqlerrm like '%nie je v DEED%');
end $$;
create temp table s1 as select public.retaz_zapecat('rt-t93', '[{"zbierka":"t93-z1","pct":25},{"zbierka":"t93-z3","pct":50},{"zbierka":"t93-z2","pct":10}]',
  null, '{"meno":"Martin Konaľ","stit":"Gold"}') as j;
-- opakované zapečatenie po výpadku siete = tá istá reťaz, nič nové
select public.retaz_zapecat('rt-t93', '[{"zbierka":"t93-z1","pct":25}]');
reset role;
insert into t select 'zapecatena, prva bezi', (select j->'polozky'->0->>'stav' = 'bezi' and j->'polozky'->1->>'stav' = 'caka' and j->'polozky'->2->>'stav' = 'caka' from s1);
insert into t select 'meno tvorcu z profilu', (select meno = 'Martin Konaľ' from public.retaz where id = 'rt-t93');
insert into t select 'opakovane zapecatenie: 3 polozky', (select count(*) = 3 from public.retaz_polozka where retaz = 'rt-t93');
insert into t select 'oznamenie A pri zapecateni (2 zbierky)', (select count(*) = 2 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093a1' and titul = 'Nová reťaz dobra');
insert into t select 'oznamenie B text', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093b1' and titul = 'Nová reťaz dobra'
  and text = 'Martin Konaľ posiela 10 % z každého daru na vašu zbierku Zima. Ste 3. v rade.');
insert into t select 'oznamenie A text prva', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093a1'
  and text = 'Martin Konaľ posiela 25 % z každého daru na vašu zbierku Strecha. Ste 1. v rade.');
insert into t select 'pri zapecateni nikto nie je na rade', not exists (select 1 from public.notifikacia where titul = 'Ste na rade');
do $$ begin
  update public.retaz_polozka set pct = 50 where retaz = 'rt-t93' and poradie = 1;
  insert into t values ('pct sa po zapecateni nemeni', false);
exception when others then insert into t values ('pct sa po zapecateni nemeni', sqlerrm like 'Zapečatená%');
end $$;
insert into t select 'zapis do tabulky len server', not has_table_privilege('authenticated', 'public.retaz_polozka', 'insert');

-- ---- dar 10 € pri 25 % = 2,50 € zbierke + 7,50 € tvorcovi, na cent ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093d1', false);
create temp table d1 as select public.retaz_dar('rt-t93', 'r93-1', 10, 'EUR', 'fiat', 'Jana', false) as j;
select public.retaz_dar('rt-t93', 'r93-1', 10, 'EUR', 'fiat', 'Jana', false);
reset role;
insert into t select '10 € pri 25 %: zbierke 2,50', (select sum(po.suma) = 2.50 from public.pohyb po join public.platba pl on pl.id = po.platba_id
  where pl.idem_kluc = 'r93-1' and po.ucet_kredit = '7e57c100-0000-0000-0000-0000000093a1' and po.typ = 'dar');
insert into t select '10 € pri 25 %: tvorcovi 7,50', (select sum(po.suma) = 7.50 from public.pohyb po join public.platba pl on pl.id = po.platba_id
  where pl.idem_kluc = 'r93-1' and po.ucet_kredit = '7e57c100-0000-0000-0000-0000000093c1' and po.typ = 'dar');
insert into t select 'jeden doklad, jedna platba aj po opakovani', (select count(*) = 1 from public.platba where idem_kluc = 'r93-1');
insert into t select 'platba patri zbierke 1', (select zbierka = 't93-z1' from public.platba where idem_kluc = 'r93-1');
insert into t select 'vyzbierane zbierky 1 = 2,50 (bez tvorcu)', (select vyzbierane = 2.50 from public.v_zbierka_vyzbierane where zbierka = 't93-z1' and mena = 'EUR');
insert into t select 'dary zbierky 1: Jana 2,50', (select (j->'dary'->0->>'suma')::numeric = 2.50 from (select public.zbierka_dary('t93-z1') j) x);
insert into t select 'stav: poslane 2,50, dostal 10', (select (j->'polozky'->0->>'poslane')::numeric = 2.50 and (j->>'dostal')::numeric = 10 from (select public.retaz_stav('rt-t93') j) x);

-- ---- naplnenie: 80 € → 20 € zbierke 1 (spolu 22,50 ≥ 20) → naplnená; zbierku 3 medzitým uzavreli → preskočená; beží 2 ----
update public.zbierka set stav = 'ukoncena' where id = 't93-z3';
set role authenticated;
create temp table d2 as select public.retaz_dar('rt-t93', 'r93-2', 80, 'EUR', 'fiat', null, false) as j;
reset role;
insert into t select 'dar 80 € este cely zbierke 1 (20 €)', (select sum(po.suma) = 20 from public.pohyb po join public.platba pl on pl.id = po.platba_id
  where pl.idem_kluc = 'r93-2' and po.ucet_kredit = '7e57c100-0000-0000-0000-0000000093a1' and po.typ = 'dar');
insert into t select 'zbierka 1 naplnena', (select stav = 'naplnena' from public.retaz_polozka where retaz = 'rt-t93' and poradie = 1);
insert into t select 'zbierka 3 preskocena', (select stav = 'preskocena' from public.retaz_polozka where retaz = 'rt-t93' and poradie = 2);
insert into t select 'zbierka 2 bezi', (select stav = 'bezi' from public.retaz_polozka where retaz = 'rt-t93' and poradie = 3);
insert into t select 'B dostal Ste na rade', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093b1'
  and titul = 'Ste na rade' and text = 'Martin Konaľ teraz posiela 10 % z každého daru na vašu zbierku Zima.');
insert into t select 'A (preskocena) Ste na rade nedostal', not exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093a1' and titul = 'Ste na rade');
set role authenticated;
select public.retaz_dar('rt-t93', 'r93-3', 10, 'EUR', 'fiat', null, false);
reset role;
insert into t select 'dalsi dar tecie zbierke 2: 1,00 + 9,00', (select bool_and(case when po.ucet_kredit = '7e57c100-0000-0000-0000-0000000093b1' then po.suma = 1.00 else po.suma = 9.00 end)
  and count(*) = 2 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r93-3' and po.typ = 'dar');
insert into t select 'nikto Ste na rade druhy raz', (select count(*) = 1 from public.notifikacia where titul = 'Ste na rade');
-- stránky (balík 8 C)
insert into t select 'podporuju zbierku 2: Martin Konal bezi 10 %, poslane 1', (select jsonb_array_length(j) = 1 and (j->0->>'bezi')::boolean and (j->0->>'pct')::int = 10
  and (j->0->>'poslane')::numeric = 1 and j->0->>'meno' = 'Martin Konaľ' from (select public.retaz_podporuju('t93-z2') j) x);
insert into t select 'podporuju zbierku 1: naplnena, poslane 22,50, nebezi', (select not (j->0->>'bezi')::boolean and (j->0->>'poslane')::numeric = 22.50 from (select public.retaz_podporuju('t93-z1') j) x);
insert into t select 'darcovia cez QR pri zbierke 1: 2 dary, Jana 10 €', (select (j->>'pocet')::int = 2 and j->'dary' @> '[{"meno":"Jana","suma":10}]'::jsonb
  from (select public.retaz_darcovia('rt-t93', 't93-z1') j) x);
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093c1', false);
insert into t select 'strana tvorcu: moja retaz', (public.retaz_strany(null)->>'id') = 'rt-t93';
insert into t select 'oznamy organizatorom: 3 pri zapecateni + 1 na rade', jsonb_array_length(public.retaz_oznamy('rt-t93')) = 4;
insert into t select 'stav: organizator a vyzbierane', (select j->'polozky'->0->>'org' = 'Charita A' and (j->'polozky'->0->>'vyzbierane')::numeric = 22.50 from (select public.retaz_stav('rt-t93') j) x);
insert into t select 'oznamy: komu = stranka', (public.retaz_oznamy('rt-t93')->0->>'komu') = 'Charita A';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093d1', false);
do $$ begin
  perform public.retaz_oznamy('rt-t93');
  insert into t values ('oznamy cudzej retaze odmietne', false);
exception when others then insert into t values ('oznamy cudzej retaze odmietne', sqlerrm like 'Táto reťaz nie je vaša%');
end $$;
reset role;

-- ---- zbierku 2 ukončili → skončila; ďalší dar 100 % tvorcovi ----
update public.zbierka set stav = 'ukoncena' where id = 't93-z2';
set role authenticated;
select public.retaz_dar('rt-t93', 'r93-4', 10, 'EUR', 'fiat', null, false);
reset role;
insert into t select 'zbierka 2 skoncila', (select stav = 'skoncila' from public.retaz_polozka where retaz = 'rt-t93' and poradie = 3);
insert into t select 'koniec radu: 100 % tvorcovi', (select count(*) = 1 and sum(po.suma) = 10 and bool_and(po.ucet_kredit = '7e57c100-0000-0000-0000-0000000093c1')
  from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r93-4' and po.typ = 'dar');
insert into t select 'koniec radu: platba bez zbierky', (select zbierka is null from public.platba where idem_kluc = 'r93-4');

-- ---- testovací dar a nová reťaz ----
set role authenticated;
select public.retaz_dar('rt-t93', 'r93-5', 10, 'EUR', 'fiat', null, true);
reset role;
insert into t select 'testovaci dar: pohyby testovacie', (select bool_and(po.testovaci) from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r93-5');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093c1', false);
select public.retaz_zapecat('rt-t93b', '[{"zbierka":"t93-z1","pct":100}]');
reset role;
insert into t select 'nova retaz ukonci staru', (select ukoncena is not null from public.retaz where id = 'rt-t93') and (select ukoncena is null from public.retaz where id = 'rt-t93b');
insert into t select 'nova retaz: naplnena zbierka sa hned preskoci', (select stav = 'naplnena' from public.retaz_polozka where retaz = 'rt-t93b' and poradie = 1);
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093d1', false);
do $$ begin
  perform public.retaz_dar('rt-t93', 'r93-6', 10, 'EUR', 'fiat', null, false);
  insert into t values ('dar na ukoncenu retaz odmietne', false);
exception when others then insert into t values ('dar na ukoncenu retaz odmietne', sqlerrm like 'Táto reťaz už skončila%');
end $$;
reset role;

-- ---- zbierka farnosti v module (sektor): riadok vznikne pri zapečatení; zvončeková omša nie ----
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t93-far','7e57c100-0000-0000-0000-0000000093b1','farnost','Farnosť Test 93',true);
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093c1', false);
do $$ begin
  perform public.retaz_zapecat('rt-zv', '[{"zbierka":"t93-far:t93-far-zv-0-2026-10-18-0900","pct":25,"stranka":"t93-far"}]');
  insert into t values ('zvoncekova omsa odmietne', false);
exception when others then insert into t values ('zvoncekova omsa odmietne', sqlerrm like '%nie je v DEED%');
end $$;
select public.retaz_zapecat('rt-far', '[{"zbierka":"t93-far:oprava-strechy","pct":50,"stranka":"t93-far","nazov":"Oprava strechy"}]');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093d1', false);
select public.retaz_dar('rt-far', 'r93-7', 10, 'EUR', 'fiat', null, false);
reset role;
insert into t select 'sektor farnosti: riadok vznikol', (select typ = 'sektor' and nazov = 'Oprava strechy' and stranka = 't93-far' from public.zbierka where id = 't93-far:oprava-strechy');
insert into t select 'sektor farnosti bezi v retazi', (select stav = 'bezi' from public.retaz_polozka where retaz = 'rt-far' and poradie = 1);
insert into t select 'sektor farnosti: 5 € farnosti (bez tvorcu)', (select vyzbierane = 5 from public.v_zbierka_vyzbierane where zbierka = 't93-far:oprava-strechy' and mena = 'EUR');

-- ---- Testovanie (balík 8 C): naplnila sa / ďalšiu uzavreli, testovací dar od iného darcu ----
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel) values
 ('t93-z4','Okná','charity','zbierka','aktivna','t93-a','7e57c100-0000-0000-0000-0000000093a1', now(), 900),
 ('t93-z5','Dvere','charity','zbierka','aktivna','t93-b','7e57c100-0000-0000-0000-0000000093b1', now(), 900),
 ('t93-z6','Strecha 2','charity','zbierka','aktivna','t93-a','7e57c100-0000-0000-0000-0000000093a1', now(), 900);
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093c1', false);
select public.retaz_zapecat('rt-tt', '[{"zbierka":"t93-z4","pct":20},{"zbierka":"t93-z5","pct":30},{"zbierka":"t93-z6","pct":40}]');
select public.retaz_dar('rt-tt', 'r93-t1', 10, 'EUR', 'fiat', 'Testovací darca', true);
select public.retaz_test('rt-tt', 'uzavreli');
create temp table tt as select public.retaz_test('rt-tt', 'naplnena') as j;
reset role;
insert into t select 'test dar tvorcu: od iného darcu, s menom', (select odosielatel is null and odosielatel_text = 'Testovací darca' from public.platba where idem_kluc = 'r93-t1');
insert into t select 'test dar: 2 € zbierke 4', (select sum(po.suma) = 2 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r93-t1' and po.ucet_kredit = '7e57c100-0000-0000-0000-0000000093a1');
insert into t select 'test uzavreli: 5 preskocena', (select stav = 'preskocena' from public.retaz_polozka where retaz = 'rt-tt' and poradie = 2);
insert into t select 'test naplnila: 4 naplnena, 6 bezi', (select j->'polozky'->0->>'stav' = 'naplnena' and j->'polozky'->2->>'stav' = 'bezi' from tt);
insert into t select 'test naplnila: A Ste na rade (Strecha 2)', exists (select 1 from public.retaz_oznam where retaz = 'rt-tt' and titul = 'Ste na rade' and zbierka = 't93-z6');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093d1', false);
do $$ begin
  perform public.retaz_test('rt-tt', 'naplnena');
  insert into t values ('test cudzej retaze odmietne', false);
exception when others then insert into t values ('test cudzej retaze odmietne', sqlerrm like 'Táto reťaz nie je vaša%');
end $$;
reset role;

-- ---- 0095: výber zbierok do reťaze ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000093c1', false);
create temp table vy as select public.retaz_zbierky() as j;
reset role;
insert into t select 'vyber: aktivna zbierka charity je v zozname', (select j @> '[{"id":"t93-z6","org":"Charita A","moja":false}]'::jsonb from vy);
insert into t select 'vyber: ukoncena nie', (select not (j @> '[{"id":"t93-z3"}]'::jsonb) from vy);
insert into t select 'vyber: sektor farnosti ano', (select j @> '[{"id":"t93-far:oprava-strechy","typ":"farnost"}]'::jsonb from vy);
insert into t select 'vyber: vlastna zbierka je moja', (select j @> '[{"id":"t93-zt","moja":true}]'::jsonb from vy);

select ok, c from t order by ok, c;
rollback;
