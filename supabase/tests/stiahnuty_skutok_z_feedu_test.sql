-- Test 0146 — stiahnutý skutok charity zmizne z feedu. ROLLBACK na konci, každý riadok ok = t.
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000146c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000146c01','7e57c000-0000-0000-0000-000000146c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t146-ch','7e57c100-0000-0000-0000-000000146c01','charita','Test 146',true);
insert into public.prispevok (id, autor_ucet_id, autor_nazov, modul, typ, titul) values
 ('a1460000-0000-0000-0000-000000000001','7e57c100-0000-0000-0000-000000146c01','Test 146','good','skutok','Ostáva'),
 ('a1460000-0000-0000-0000-000000000002','7e57c100-0000-0000-0000-000000146c01','Test 146','good','skutok','Stiahne sa');
insert into public.skutok_stranky (id, stranka, data) values
 ('s146a','t146-ch','{"nazov":"Ostáva","prispevokId":"a1460000-0000-0000-0000-000000000001"}'),
 ('s146b','t146-ch','{"nazov":"Stiahne sa","prispevokId":"a1460000-0000-0000-0000-000000000002"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
update public.skutok_stranky set stiahnuty = now() where id = 's146b';
insert into t select 'stiahnutý skutok zmizol z feedu', not exists (select 1 from public.prispevok where id = 'a1460000-0000-0000-0000-000000000002');
insert into t select 'ostatný skutok vo feede ostal', exists (select 1 from public.prispevok where id = 'a1460000-0000-0000-0000-000000000001');
update public.skutok_stranky set data = data || '{"nazov":"Ostáva 2"}' where id = 's146a';
insert into t select 'úprava textu nič nezmaže', exists (select 1 from public.prispevok where id = 'a1460000-0000-0000-0000-000000000001');
select ok, c from t order by ok, c;
rollback;
