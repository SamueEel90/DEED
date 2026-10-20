-- ============================================================
-- Test 0141 — skutok charity vo feede nesie stránku (prispevok_feed.stranka), skutok usera nie
-- Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000141a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000141a01','7e57c000-0000-0000-0000-000000141a01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t141-ch','7e57c100-0000-0000-0000-000000141a01','charita','Charita 141',true);
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, feed, vytvorene) values
 ('20000000-0000-0000-0000-000000141001','good','skutok','Skutok charity','7e57c100-0000-0000-0000-000000141a01','domov', now()),
 ('20000000-0000-0000-0000-000000141002','good','skutok','Skutok usera','7e57c100-0000-0000-0000-000000141a01','domov', now()),
 ('20000000-0000-0000-0000-000000141003','good','skutok','Stiahnutý skutok','7e57c100-0000-0000-0000-000000141a01','domov', now());
insert into public.skutok_stranky (id, stranka, data) values
 ('sk-141a','t141-ch','{"nazov":"Skutok charity","prispevokId":"20000000-0000-0000-0000-000000141001"}');
insert into public.skutok_stranky (id, stranka, data, stiahnuty) values
 ('sk-141c','t141-ch','{"nazov":"Stiahnutý skutok","prispevokId":"20000000-0000-0000-0000-000000141003"}', now());
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role anon;
insert into t select 'skutok charity má stránku', (select stranka = 't141-ch' from public.prispevok_feed where id = '20000000-0000-0000-0000-000000141001');
insert into t select 'skutok usera bez stránky', (select stranka is null from public.prispevok_feed where id = '20000000-0000-0000-0000-000000141002');
insert into t select 'stiahnutý skutok bez stránky', (select stranka is null from public.prispevok_feed where id = '20000000-0000-0000-0000-000000141003');
insert into t select 'feed_stranka vracia stránku', exists (select 1 from public.feed_stranka('domov') f where f.id = '20000000-0000-0000-0000-000000141001' and f.stranka = 't141-ch');
reset role;
select ok, c from t order by ok, c;
rollback;
