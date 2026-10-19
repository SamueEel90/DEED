-- ============================================================
-- Test 0111 — vecná zbierka: ten istý darca 2× = jeden riadok (posledné meno, súčet hodnôt), počet ľudí = počet riadkov (OPRAVY 362)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000111a01'), ('7e57c000-0000-0000-0000-000000111b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000111a01','7e57c000-0000-0000-0000-000000111a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000111b01','7e57c000-0000-0000-0000-000000111b01','aktivny','hotovo');
insert into public.naboz_stav (oblast, id, data) values ('vecne', 't111-far', '[
  {"id":"v1","nazov":"Ponožky","stav":"aktivna","ukazHodnotu":true},
  {"id":"v2","nazov":"Potraviny","stav":"aktivna","ukazHodnotu":false}]');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000111a01', false);
select public.vecny_dar_zapis('t111-far', 'v1', '', 10);
select public.vecny_dar_zapis('t111-far', 'v2', '', null);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000111b01', false);
select public.vecny_dar_zapis('t111-far', 'v1', 'Boris', 4);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000111a01', false);
select public.vecny_dar_zapis('t111-far', 'v1', 'Anna K.', 5);
select public.vecny_dar_zapis('t111-far', 'v2', 'Anna K.', null);
reset role;
update public.vecny_dar set vytvorene = vytvorene + (id - (select min(id) from public.vecny_dar)) * interval '1 second';

insert into t select 'v1: 2 riadky = 2 ľudia', (select jsonb_array_length(j->'darcovia') = 2 and (j->>'ludi')::int = 2 and (j->>'pocet')::int = 3 and (j->>'spolu')::numeric = 19 from (select public.vecne_dary('t111-far', 'v1') j) q);
insert into t select 'v1: Anna navrchu s posledným menom a súčtom 15', (select d->>'meno' = 'Anna K.' and (d->>'hodnota')::numeric = 15 from (select public.vecne_dary('t111-far', 'v1')->'darcovia'->0 d) q);
insert into t select 'v1: Boris 4', (select d->>'meno' = 'Boris' and (d->>'hodnota')::numeric = 4 from (select public.vecne_dary('t111-far', 'v1')->'darcovia'->1 d) q);
insert into t select 'v2: 1 riadok, meno posledné, bez hodnoty', (select jsonb_array_length(j->'darcovia') = 1 and (j->>'ludi')::int = 1 and j->'darcovia'->0->>'meno' = 'Anna K.' and j->'darcovia'->0->'hodnota' = 'null'::jsonb from (select public.vecne_dary('t111-far', 'v2') j) q);
insert into t select 'súhrn nevracia účty', (select public.vecne_dary('t111-far', 'v1')::text not like '%7e57c100%');

select ok, c from t order by ok, c;
rollback;
