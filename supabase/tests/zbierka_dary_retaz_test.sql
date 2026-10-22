-- ============================================================
-- Test 0159 — zbierka_dary vráti pri dare cez reťaz id reťaze (verzia u toho, kto reťazí); bežný dar bez reťaze.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000159a01'), ('7e57c000-0000-0000-0000-000000159c01'), ('7e57c000-0000-0000-0000-000000159d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000159a01','7e57c000-0000-0000-0000-000000159a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000159c01','7e57c000-0000-0000-0000-000000159c01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000159d01','7e57c000-0000-0000-0000-000000159d01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t159-a','7e57c100-0000-0000-0000-000000159a01','charita','Charita 159',true);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel) values
 ('t159-z1','Strecha','charity','zbierka','aktivna','t159-a','7e57c100-0000-0000-0000-000000159a01', now(), 100000);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000159c01', false);
select public.retaz_zapecat('rt-159', '[{"zbierka":"t159-z1","pct":40}]', null, '{"meno":"Jana Reťazová","stit":"Silver"}');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000159d01', false);
select public.retaz_dar('rt-159', 'r159-1', 10, 'EUR', 'fiat', 'Eva', false);
select public.zbierka_dar_volba('t159-z1', 'r159-2', 5, 'EUR', 'fiat', null, 't159-a', 'Strecha', null, false);
reset role;
create temp table d as select e from jsonb_array_elements(public.zbierka_dary('t159-z1')->'dary') e;
insert into t select 'dar cez reťaz má retaz a sumu pre zbierku 4 €', exists (select 1 from d where e->>'retaz' = 'rt-159' and (e->>'suma')::numeric = 4);
insert into t select 'bežný dar bez reťaze', exists (select 1 from d where e->>'retaz' is null and (e->>'suma')::numeric = 5);
insert into t select 'spolu 2 dary', (select count(*) = 2 from d);
select ok, c from t order by ok, c;
rollback;
