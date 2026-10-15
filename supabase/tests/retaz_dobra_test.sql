-- ============================================================
-- Test 0093 — Reťaz dobra na serveri: zapečatenie, oznámenia, podiely v ledgeri na cent, posun radu, 100 % tvorcovi
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
insert into t select 'oznamenie A pri zapecateni (2 zbierky)', (select count(*) = 2 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093a1' and titul = 'Reťaz dobra');
insert into t select 'oznamenie B text', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093b1' and titul = 'Reťaz dobra'
  and text = 'Martin Konaľ posiela 10 % z každého daru na vašu zbierku Zima, keď na ňu príde rad (3. v poradí).');
insert into t select 'oznamenie A text prva', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093a1'
  and text = 'Martin Konaľ posiela 25 % z každého daru na vašu zbierku Strecha.');
insert into t select 'pri zapecateni nikto nie je na rade', not exists (select 1 from public.notifikacia where titul like '%ste na rade');
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
  and titul = 'Reťaz dobra · ste na rade' and text like 'Vaša zbierka Zima je teraz v reťazi na rade.%');
insert into t select 'A (preskocena) Ste na rade nedostal', not exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000093a1' and titul like '%ste na rade');
set role authenticated;
select public.retaz_dar('rt-t93', 'r93-3', 10, 'EUR', 'fiat', null, false);
reset role;
insert into t select 'dalsi dar tecie zbierke 2: 1,00 + 9,00', (select bool_and(case when po.ucet_kredit = '7e57c100-0000-0000-0000-0000000093b1' then po.suma = 1.00 else po.suma = 9.00 end)
  and count(*) = 2 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r93-3' and po.typ = 'dar');
insert into t select 'nikto Ste na rade druhy raz', (select count(*) = 1 from public.notifikacia where titul like '%ste na rade');

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

select ok, c from t order by ok, c;
rollback;
