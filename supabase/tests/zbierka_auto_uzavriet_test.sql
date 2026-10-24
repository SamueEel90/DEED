-- ============================================================
-- Test 0168 — cieľ zbierky je spúšťač uzavretia: dar sa pripíše celý, potom sa zbierka (s prepínačom) uzavrie,
-- správca dostane upozornenie; vypnutý prepínač, zbierka bez cieľa a centrálna sa neuzatvárajú.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000168f01'), ('7e57c000-0000-0000-0000-000000168d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000168f01','7e57c000-0000-0000-0000-000000168f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000168d01','7e57c000-0000-0000-0000-000000168d01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t168','7e57c100-0000-0000-0000-000000168f01','charita','Charita 168',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t168','SK0011000000002612345679','T8','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel, nastavenie) values
 ('t168-a','Strecha','charity','zbierka','aktivna','t168','7e57c100-0000-0000-0000-000000168f01', now(), 100, '{"ucet":"SK0011000000002612345679"}'),
 ('t168-b','Lavice','charity','zbierka','aktivna','t168','7e57c100-0000-0000-0000-000000168f01', now(), 100, '{"ucet":"SK0011000000002612345679","autoUzavriet":false}'),
 ('t168-c','Otvorená','charity','zbierka','aktivna','t168','7e57c100-0000-0000-0000-000000168f01', now(), null, '{"ucet":"SK0011000000002612345679"}');
insert into public.zbierka_sprava (zbierka, data) values ('t168-a', '{"stav":"aktivna","lehota":"30"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create function pg_temp.skus(p_sql text) returns text language plpgsql as $$ begin execute p_sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.skus(text) to public;   -- 0189: nové funkcie už nie sú automaticky volateľné, test ju volá aj pod rolou appky
insert into t select 'prepínač z nastavenia pri založení', (select not auto_uzavriet from public.zbierka where id = 't168-b') and (select auto_uzavriet from public.zbierka where id = 't168-a');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000168d01', false);
select public.zbierka_dar('t168-a', 'a-1', 60, 'EUR', 'fiat');
reset role;
insert into t select 'pod cieľom beží', (select stav from public.zbierka where id = 't168-a') = 'aktivna';
set role authenticated;
select public.zbierka_dar('t168-a', 'a-2', 70, 'EUR', 'fiat');
reset role;
insert into t select 'dar sa pripísal celý (130 z cieľa 100)', public.retaz_vyzbierane('t168-a') >= 130;
insert into t select 'po prekročení uzavretá', (select stav = 'ukoncena' and koniec is not null from public.zbierka where id = 't168-a');
insert into t select 'v správe ukončená · Cieľ je splnený', (select data->>'stav' = 'ukoncena' and data->>'dovodUkoncenia' = 'Cieľ je splnený' and (data->>'autoUzavreta')::boolean from public.zbierka_sprava where zbierka = 't168-a');
insert into t select 'správca dostal upozornenie', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000168f01' and titul = 'Zbierka Strecha je naplnená a uzavretá');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000168d01', false);
insert into t select 'ďalší dar už nepríde', pg_temp.skus($$select public.zbierka_dar('t168-a', 'a-3', 5, 'EUR', 'fiat')$$) <> 'ok';
select public.zbierka_dar('t168-b', 'b-1', 150, 'EUR', 'fiat');
select public.zbierka_dar('t168-c', 'c-1', 1000, 'EUR', 'fiat');
reset role;
insert into t select 'vypnutý prepínač: beží ďalej', (select stav from public.zbierka where id = 't168-b') = 'aktivna';
insert into t select 'bez cieľa: beží ďalej', (select stav from public.zbierka where id = 't168-c') = 'aktivna';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000168d01', false);
insert into t select 'darca prepínač nezmení', pg_temp.skus($$select public.zbierka_auto_uzavriet('t168-b', true)$$) = 'nemate_povolene';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000168f01', false);
insert into t select 'zbierka bez cieľa prepínač nemá', pg_temp.skus($$select public.zbierka_auto_uzavriet('t168-c', true)$$) = 'bez_ciela';
insert into t select 'správca zapne pri naplnenej → hneď uzavretá', (public.zbierka_auto_uzavriet('t168-b', true)->>'uzavreta')::boolean;
reset role;
insert into t select 'appka nevolá pomocné funkcie', not has_function_privilege('authenticated', 'public.zbierka_skus_uzavriet(text)', 'execute');

select coalesce(ok, false), c from t order by ok, c;
rollback;
