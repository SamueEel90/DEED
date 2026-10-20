-- ============================================================
-- Test 0138 — skutok charity ↔ príspevok vo feede: prepojenie podľa nadpisu a času, stiahnutý preč z feedu,
-- príspevok s darom ostane. Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000138a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000138a01','7e57c000-0000-0000-0000-000000138a01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t138-ch','7e57c100-0000-0000-0000-000000138a01','charita','Charita 138',true);
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, feed, vytvorene) values
 ('20000000-0000-0000-0000-000000138001','good','skutok','Výrik sa vrátil do lesa','7e57c100-0000-0000-0000-000000138a01','domov', now()),
 ('20000000-0000-0000-0000-000000138002','good','skutok','bxbxc','7e57c100-0000-0000-0000-000000138a01','domov', now()),
 ('20000000-0000-0000-0000-000000138003','good','skutok','Iný skutok','7e57c100-0000-0000-0000-000000138a01','domov', now() - interval '1 hour');
insert into public.skutok_stranky (id, stranka, data, stiahnuty, vytvorene) values
 ('s138a','t138-ch','{"nazov":"Výrik sa vrátil do lesa"}', null, now()),
 ('s138b','t138-ch','{"nazov":"bxbxc"}', now(), now()),
 ('s138c','t138-ch','{"nazov":"Iný skutok"}', now(), now());
\pset tuples_only on
create temp table t(c text, ok boolean);
select from public.skutok_charity_prepoj();
insert into t values ('1 prepojený podľa nadpisu a času', (select data->>'prispevokId' from public.skutok_stranky where id = 's138a') = '20000000-0000-0000-0000-000000138001');
insert into t values ('2 bežiaci skutok ostal vo feede', exists (select 1 from public.prispevok where id = '20000000-0000-0000-0000-000000138001'));
insert into t values ('3 stiahnutý zmizol z feedu', not exists (select 1 from public.prispevok where id = '20000000-0000-0000-0000-000000138002'));
insert into t values ('4 o hodinu inak = neprepojí, nezmaže', exists (select 1 from public.prispevok where id = '20000000-0000-0000-0000-000000138003') and (select data->>'prispevokId' from public.skutok_stranky where id = 's138c') is null);
select from public.skutok_charity_prepoj();
insert into t values ('5 opakovane bez zmeny', (select count(*) from public.prispevok where id::text like '20000000-0000-0000-0000-000000138%') = 2);
select ok, c from t order by c collate "C";
rollback;
