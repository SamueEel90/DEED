-- ============================================================
-- Test 0106 — Poďakovať darcom (farnosť): posiela len správca, každý darca raz, zbierky rodiny nie
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = správca farnosti, D1 = darca hlavnej a zvončeka, D2 = darca zbierky farnosti, D3 = darca zbierky rodiny
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000001f1'), ('7e57c000-0000-0000-0000-0000000001d1'), ('7e57c000-0000-0000-0000-0000000001d2'), ('7e57c000-0000-0000-0000-0000000001d3');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000001f1','7e57c000-0000-0000-0000-0000000001f1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000001d1','7e57c000-0000-0000-0000-0000000001d1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000001d2','7e57c000-0000-0000-0000-0000000001d2','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000001d3','7e57c000-0000-0000-0000-0000000001d3','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t-fp','7e57c100-0000-0000-0000-0000000001f1','charita','Testovacia farnosť',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t-fp','SK0011000000002612345679','T3','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('t-fp:hlavna','Hlavná zbierka','viera','zbierka','aktivna','t-fp','7e57c100-0000-0000-0000-0000000001f1', now(), '{"ucet":"SK0011000000002612345679"}'),
 ('t-fp:t-fp-zv-0-2026-10-18-0900','Zvončeková','viera','zbierka','aktivna','t-fp','7e57c100-0000-0000-0000-0000000001f1', now(), '{"ucet":"SK0011000000002612345679"}'),
 ('zb-fp1','Oprava organa','viera','zbierka','aktivna','t-fp','7e57c100-0000-0000-0000-0000000001f1', now(), '{"ucet":"SK0011000000002612345679","farnost":{"druh":"farnost"}}'),
 ('zb-fp2','Rozlúčka','viera','zbierka','aktivna','t-fp','7e57c100-0000-0000-0000-0000000001f1', now(), '{"ucet":"SK0011000000002612345679","farnost":{"druh":"pohreb"}}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000001d1', false);
select (public.zbierka_dar('t-fp:hlavna', 'fp-1', 20, 'EUR', 'fiat'))->>'platba_id' is not null;
select (public.zbierka_dar('t-fp:t-fp-zv-0-2026-10-18-0900', 'fp-2', 5, 'EUR', 'fiat'))->>'platba_id' is not null;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000001d2', false);
select (public.zbierka_dar('zb-fp1', 'fp-3', 10, 'EUR', 'fiat'))->>'platba_id' is not null;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000001d3', false);
select (public.zbierka_dar('zb-fp2', 'fp-4', 10, 'EUR', 'fiat'))->>'platba_id' is not null;

-- darca nesmie posielať
do $$ begin perform public.farnost_podakuj('t-fp', 'vsetci', 'x'); insert into t values ('darca nesmie poslat', false);
exception when insufficient_privilege then insert into t values ('darca nesmie poslat', true); end $$;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000001f1', false);
do $$ begin perform public.farnost_podakuj('t-fp', 'vsetci', '  '); insert into t values ('prazdny text = chyba', false);
exception when invalid_parameter_value then insert into t values ('prazdny text = chyba', true); end $$;
do $$ begin perform public.farnost_podakuj('t-fp', 'zb-fp2', 'x'); insert into t values ('zbierka rodiny = chyba', false);
exception when no_data_found then insert into t values ('zbierka rodiny = chyba', true); end $$;
insert into t select 'vsetkym = D1 a D2 (bez rodiny, D1 raz)', public.farnost_podakuj('t-fp', 'vsetci', 'Ďakujeme všetkým') = 2;
insert into t select 'hlavna = D1 (hlavna aj zvoncek)', public.farnost_podakuj('t-fp', 'hlavna', 'Ďakujeme za hlavnú') = 1;
insert into t select 'zbierka farnosti = D2', public.farnost_podakuj('t-fp', 'zb-fp1', 'Ďakujeme za organ') = 1;
reset role;
insert into t select 'D3 nedostal nic', (select count(*) from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000001d3' and odkaz like 'str:t-fp:%') = 0;
insert into t select 'D1 dostal 2', (select count(*) from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000001d1' and odkaz = 'str:t-fp:-') = 2;
insert into t select 'titulok zbierky', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000001d2' and titul = 'Poďakovanie · Oprava organa' and text = 'Ďakujeme za organ');

select ok, c from t order by ok, c;

rollback;
