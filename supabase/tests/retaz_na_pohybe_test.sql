-- ============================================================
-- Test 0157 — reťaz na pohybe (%, časť, zvyšková stotina, súčet na cent), testovací príznak zo servera,
-- zmaz_testovacie dvojkrokovo + poistka proti mínusu. Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
-- T = tvorca, A = charita, D = darca
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000157a01'), ('7e57c000-0000-0000-0000-000000157c01'), ('7e57c000-0000-0000-0000-000000157d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000157a01','7e57c000-0000-0000-0000-000000157a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000157c01','7e57c000-0000-0000-0000-000000157c01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000157d01','7e57c000-0000-0000-0000-000000157d01','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000157c01', 'Tvorca', 'Test');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t157-a','7e57c100-0000-0000-0000-000000157a01','charita','Charita 157',true);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel) values
 ('t157-z1','Strecha','charity','zbierka','aktivna','t157-a','7e57c100-0000-0000-0000-000000157a01', now(), 100000);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000157c01', false);
select public.retaz_zapecat('rt-157', '[{"zbierka":"t157-z1","pct":35}]');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000157d01', false);
select public.retaz_dar('rt-157', 'r157-1', 10.01, 'EUR', 'fiat', 'Jana', false);
reset role;
create temp table p1 as select po.* from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r157-1';
insert into t select 'zbierke 3,51 (35 % + zvyšková stotina)', (select suma = 3.51 and retaz = 'rt-157' and retaz_pct = 35 from p1 where retaz_cast = 'zbierka');
insert into t select 'tvorcovi 6,50', (select suma = 6.50 and retaz_pct = 35 and ucet_kredit = '7e57c100-0000-0000-0000-000000157c01' from p1 where retaz_cast = 'tvorca');
insert into t select 'súčet častí = čistá suma na cent', (select sum(suma) from p1 where retaz is not null) = (select cista_suma from public.platba where idem_kluc = 'r157-1');
insert into t select 'príchod a poplatky bez reťaze', not exists (select 1 from p1 where typ <> 'dar' and retaz is not null);
insert into t select 'session premenné po dare prázdne', coalesce(current_setting('deed.retaz', true), '') = '';
do $$ begin
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, retaz, retaz_pct, retaz_cast)
    values (public.novy_doklad(), 1, 'dar', public.ucet_systemu('procesor'), '7e57c100-0000-0000-0000-000000157a01', 1, 'EUR', 'fiat', 'rt-157', 0, 'zbierka');
  insert into t values ('zbierka pri 0 % odmietne', false);
exception when others then insert into t values ('zbierka pri 0 % odmietne', sqlerrm like '%pohyb_retaz_konzistentne%');
end $$;
do $$ begin
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, retaz, retaz_pct, retaz_cast)
    values (public.novy_doklad(), 1, 'dar', public.ucet_systemu('procesor'), '7e57c100-0000-0000-0000-000000157a01', 1, 'EUR', 'fiat', 'rt-157', 33, 'tvorca');
  insert into t values ('pct mimo krok 5 odmietne', false);
exception when others then insert into t values ('pct mimo krok 5 odmietne', sqlerrm like '%pohyb_retaz_konzistentne%');
end $$;

-- ---- testovací príznak: pokladňa zapnutá → aj bežný dar testovací ----
insert into t select 'pokladňa zapnutá: pohyby testovacie', (select bool_and(testovaci) from p1);
insert into t select 'pokladňa zapnutá: platba testovacia', (select testovaci from public.platba where idem_kluc = 'r157-1');
insert into public.vecny_dar (stranka, zbierka, ucet_id, meno) values ('t157-a', 'v157', '7e57c100-0000-0000-0000-000000157d01', 'Jana');
insert into t select 'vecný dar testovací', (select testovaci from public.vecny_dar where stranka = 't157-a' and zbierka = 'v157');
insert into public.notifikacia (ucet_id, kat, titul, text) values ('7e57c100-0000-0000-0000-000000157d01', 'penazenka', 'T157 v tej istej transakcii', 'x');
insert into t select 'upozornenie v transakcii testovacej platby testovacie', (select testovaci from public.notifikacia where titul = 'T157 v tej istej transakcii');

-- ---- pokladňa vypnutá (ostrý štart) → nič testovacie ----
update public.ledger_prepinac set zapnute = false where kluc = 'testovacia_pokladna';
select set_config('deed.test_tx', '', true);   -- ako nová transakcia
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000157d01', false);
select public.retaz_dar('rt-157', 'r157-2', 20, 'EUR', 'fiat', null, false);
reset role;
insert into public.vecny_dar (stranka, zbierka, ucet_id, meno) values ('t157-a', 'v157', '7e57c100-0000-0000-0000-000000157d01', 'Ostrý');
insert into public.notifikacia (ucet_id, kat, titul, text) values ('7e57c100-0000-0000-0000-000000157d01', 'penazenka', 'T157 ostrá', 'x');
insert into t select 'vypnutá: pohyby ostré', (select not bool_or(po.testovaci) from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r157-2');
insert into t select 'vypnutá: platba ostrá', (select not testovaci from public.platba where idem_kluc = 'r157-2');
insert into t select 'vypnutá: vecný dar ostrý', (select not testovaci from public.vecny_dar where meno = 'Ostrý');
insert into t select 'vypnutá: upozornenie ostré', (select not testovaci from public.notifikacia where titul = 'T157 ostrá');

-- ---- zmaz_testovacie: 1. krok len prehľad ----
create temp table n0 as select (select count(*) from public.pohyb) po, (select count(*) from public.platba) pl;
create temp table k1 as select public.zmaz_testovacie() x;
insert into t select 'prehľad nič nezmaže', (select x like '0157 PREHĽAD%' from k1) and (select po = (select count(*) from public.pohyb) and pl = (select count(*) from public.platba) from n0);
insert into t select 'zlý kód nič nezmaže', public.zmaz_testovacie('XXXXXX') like '0157 PREHĽAD%' and (select po = (select count(*) from public.pohyb) from n0);
create temp table k2 as select public.zmaz_testovacie(substring(x from '''([0-9A-F]{6})''')) x from k1;
insert into t select 'správny kód zmaže', (select x like '0157 ZMAZANÉ%' from k2);
insert into t select 'testovacie pohyby preč', not exists (select 1 from public.pohyb where testovaci);
insert into t select 'testovacie platby preč', not exists (select 1 from public.platba where testovaci) and not exists (select 1 from public.platba where idem_kluc = 'r157-1');
insert into t select 'reťaz platby testovacie preč, ostrá ostáva', (select count(*) = 1 from public.retaz_platba where retaz = 'rt-157');
insert into t select 'ostrý dar ostáva celý', (select count(*) >= 2 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'r157-2' and po.retaz = 'rt-157');
insert into t select 'vecné: testovací preč, ostrý ostáva', not exists (select 1 from public.vecny_dar where meno = 'Jana' and zbierka = 'v157') and exists (select 1 from public.vecny_dar where meno = 'Ostrý');
insert into t select 'upozornenia: testovacie preč, ostré ostáva', not exists (select 1 from public.notifikacia where testovaci) and exists (select 1 from public.notifikacia where titul = 'T157 ostrá');
insert into t select 'ledger znova nemenný', (select tgenabled <> 'D' from pg_trigger where tgname = 'pohyb_nemenny');

-- ---- poistka: testovací kredit minutý ostrým darom → po výmaze mínus → nezmaže nič ----
update public.ledger_prepinac set zapnute = true where kluc = 'testovacia_pokladna';
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal)
  values (public.novy_doklad(), 1, 'dobitie', public.ucet_systemu('testovacia_pokladna'), '7e57c100-0000-0000-0000-000000157d01', 50, 'DEED', 'deed');
update public.ledger_prepinac set zapnute = false where kluc = 'testovacia_pokladna';
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal)
  values (public.novy_doklad(), 1, 'dar', '7e57c100-0000-0000-0000-000000157d01', '7e57c100-0000-0000-0000-000000157a01', 30, 'DEED', 'deed');
create temp table k3 as select public.zmaz_testovacie() x;
insert into t select 'mínus po výmaze → NEZMAZANÉ', (select x like '0157: NEZMAZANÉ%' from k3) and exists (select 1 from public.pohyb where testovaci);

select ok, c from t order by ok, c;
rollback;
