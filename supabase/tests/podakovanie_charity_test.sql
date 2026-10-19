-- ============================================================
-- Test 0130 — Poďakovať darcom pri charite: titulok s názvom charity, zbierka charity, farnosť bez zmeny
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000130f1'), ('7e57c000-0000-0000-0000-0000000130d1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000130f1','7e57c000-0000-0000-0000-0000000130f1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000130d1','7e57c000-0000-0000-0000-0000000130d1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t-130c','7e57c100-0000-0000-0000-0000000130f1','charita','Úsmev pre deti',true),
 ('t-130f','7e57c100-0000-0000-0000-0000000130f1','farnost','Farnosť 130',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t-130c','SK0011000000002612345679','T4','overeny'), ('t-130f','SK0011000000002612345679','T5','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-130c','Zimné bundy','charity','zbierka','aktivna','t-130c','7e57c100-0000-0000-0000-0000000130f1', now(), '{"ucet":"SK0011000000002612345679"}'),
 ('zb-130f','Organ','viera','zbierka','aktivna','t-130f','7e57c100-0000-0000-0000-0000000130f1', now(), '{"ucet":"SK0011000000002612345679","farnost":{"druh":"farnost"}}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000130d1', false);
select (public.zbierka_dar('zb-130c', 'c130-1', 15, 'EUR', 'fiat'))->>'platba_id' is not null;
select (public.zbierka_dar('zb-130f', 'c130-2', 5, 'EUR', 'fiat'))->>'platba_id' is not null;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000130f1', false);
insert into t select 'charita vsetkym = 1', public.farnost_podakuj('t-130c', 'vsetci', 'Ďakujeme') = 1;
insert into t select 'charita zbierka = 1', public.farnost_podakuj('t-130c', 'zb-130c', 'Za bundy') = 1;
insert into t select 'farnost vsetkym = 1', public.farnost_podakuj('t-130f', 'vsetci', 'Pán Boh zaplať') = 1;
reset role;
insert into t select 'titulok charity', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000130d1' and titul = 'Poďakovanie od Úsmev pre deti' and odkaz = 'str:t-130c:-');
insert into t select 'titulok zbierky charity', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000130d1' and titul = 'Poďakovanie · Zimné bundy');
insert into t select 'farnost bez zmeny', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-0000000130d1' and titul = 'Poďakovanie od farnosti' and odkaz = 'str:t-130f:-');

select ok, c from t order by ok, c;
rollback;
