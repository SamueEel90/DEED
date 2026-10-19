-- ============================================================
-- Test 0120 (+0124) — človek zo Správa → Ľudia je správca stránky (pomocník), cudzí nie; po odobratí práva stratí (OPRAVY 380, 393)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000120f01', 'farar@test.sk'), ('7e57c000-0000-0000-0000-000000120a01', 'Kaplan@Test.sk'),
  ('7e57c000-0000-0000-0000-000000120b01', 'kostolnik@test.sk'), ('7e57c000-0000-0000-0000-000000120c01', 'cudzi@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000120f01','7e57c000-0000-0000-0000-000000120f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000120a01','7e57c000-0000-0000-0000-000000120a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000120b01','7e57c000-0000-0000-0000-000000120b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000120c01','7e57c000-0000-0000-0000-000000120c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t120-far','7e57c100-0000-0000-0000-000000120f01','farnost','Farnosť Test 120',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- farár pridá kaplána a kostolníka (ako appka: nastavenia_stranky, kľúč „ludia“)
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t120-far', '{"ludia":[{"id":1,"n":"","k":"kaplan@test.sk","r":"Kaplán / zástupca","caka":false},{"id":2,"n":"","k":"kostolnik@test.sk","r":"Kostolník / pomocník","caka":false}]}');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120a01', false);
insert into t select 'kaplán je správca', public.spravujem_stranku('t120-far');
insert into public.naboz_stav (oblast, id, data) values ('profil', 't120-far', '{"nazov":"od kaplána"}');
insert into t select 'kaplán zapíše stav farnosti', exists (select 1 from public.naboz_stav where oblast = 'profil' and id = 't120-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120b01', false);
insert into t select 'kostolník je pomocník (0124)', public.spravujem_stranku('t120-far') and not public.plne_prava('t120-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120c01', false);
insert into t select 'cudzí nie je správca', not public.spravujem_stranku('t120-far');

-- farár kaplána odoberie
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120f01', false);
update public.nastavenia_stranky set data = '{"ludia":[{"id":2,"n":"","k":"kostolnik@test.sk","r":"Kostolník / pomocník","caka":false}]}' where stranka = 't120-far';
insert into t select 'farár ostáva správca', public.spravujem_stranku('t120-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000120a01', false);
insert into t select 'odobratý kaplán práva stratil', not public.spravujem_stranku('t120-far');
reset role;

select ok, c from t order by ok, c;
rollback;
