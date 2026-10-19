-- ============================================================
-- Test 0112 — vecná zbierka bez voľby ukazHodnotu = Áno; Nie ostáva Nie (OPRAVY 363)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000112a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000112a01','7e57c000-0000-0000-0000-000000112a01','aktivny','hotovo');
insert into public.naboz_stav (oblast, id, data) values ('vecne', 't112-far', '[
  {"id":"stara","nazov":"Staršia","stav":"aktivna"},
  {"id":"nie","nazov":"Bez hodnoty","stav":"aktivna","ukazHodnotu":false}]');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000112a01', false);
select public.vecny_dar_zapis('t112-far', 'stara', 'Anna', 12);
select public.vecny_dar_zapis('t112-far', 'nie', 'Anna', 12);
reset role;

insert into t select 'staršia: hodnota sa uloží a ukáže', (select (j->>'spolu')::numeric = 12 and (j->'darcovia'->0->>'hodnota')::numeric = 12 from (select public.vecne_dary('t112-far', 'stara') j) q);
insert into t select 'Nie: hodnota sa neuloží ani neukáže', (select hodnota is null from public.vecny_dar where zbierka = 'nie')
  and (select j->'spolu' = 'null'::jsonb from (select public.vecne_dary('t112-far', 'nie') j) q);

select ok, c from t order by ok, c;
rollback;
