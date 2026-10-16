-- ============================================================
-- Test 0100 — vecná zbierka: zapísať sa smie len prihlásený, hodnota len pri ukazHodnotu, súhrn zo servera (OPRAVY 320)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000100a01'), ('7e57c000-0000-0000-0000-000000100b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000100a01','7e57c000-0000-0000-0000-000000100a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000100b01','7e57c000-0000-0000-0000-000000100b01','aktivny','hotovo');
insert into public.naboz_stav (oblast, id, data) values ('vecne', 't100-far', '[
  {"id":"v1","nazov":"Ponožky","stav":"aktivna","ukazHodnotu":true},
  {"id":"v2","nazov":"Potraviny","stav":"aktivna","ukazHodnotu":false},
  {"id":"v3","nazov":"Skončená","stav":"ukoncena","ukazHodnotu":true}]');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- anon nezapíše, ale súhrn číta
set role anon;
do $$ begin
  perform public.vecny_dar_zapis('t100-far', 'v1', 'Anon', 10);
  insert into t values ('anon sa nezapíše', false);
exception when others then insert into t values ('anon sa nezapíše', true); end $$;
insert into t select 'anon číta súhrn', (public.vecne_dary('t100-far', 'v1')->>'pocet')::int = 0;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000100a01', false);
select public.vecny_dar_zapis('t100-far', 'v1', 'Anna K.', 10);
select public.vecny_dar_zapis('t100-far', 'v1', 'Anna K.', 5);
select public.vecny_dar_zapis('t100-far', 'v2', 'Anna K.', 20);
do $$ begin
  perform public.vecny_dar_zapis('t100-far', 'v3', 'Anna K.', 5);
  insert into t values ('do skončenej sa nezapíše', false);
exception when others then insert into t values ('do skončenej sa nezapíše', sqlstate = '22023'); end $$;
do $$ begin
  perform public.vecny_dar_zapis('t100-far', 'xx', 'Anna K.', 5);
  insert into t values ('do neexistujúcej sa nezapíše', false);
exception when others then insert into t values ('do neexistujúcej sa nezapíše', sqlstate = 'P0002'); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000100b01', false);
select public.vecny_dar_zapis('t100-far', 'v1', '', null);
insert into t select 'B nevidí cudzie riadky', (select count(*) = 1 from public.vecny_dar);
do $$ begin
  insert into public.vecny_dar (stranka, zbierka, ucet_id, meno, hodnota) values ('t100-far', 'v1', '7e57c100-0000-0000-0000-000000100b01', 'X', 1000);
  insert into t values ('priamy zápis nejde', false);
exception when others then insert into t values ('priamy zápis nejde', true); end $$;
reset role;

insert into t select 'v1: 3 dary, 2 ľudia, spolu 15', (select (j->>'pocet')::int = 3 and (j->>'ludi')::int = 2 and (j->>'spolu')::numeric = 15 from (select public.vecne_dary('t100-far', 'v1') j) q);
insert into t select 'v1: bez mena = Bohu známy veriaci', (select public.vecne_dary('t100-far', 'v1')->'darcovia'->0->>'meno' = 'Bohu známy veriaci');
insert into t select 'v2: hodnota sa neuloží ani neukáže', (select hodnota is null from public.vecny_dar where zbierka = 'v2')
  and (select j->'spolu' = 'null'::jsonb and j->'darcovia'->0->'hodnota' = 'null'::jsonb from (select public.vecne_dary('t100-far', 'v2') j) q);
insert into t select 'súhrn nevracia účty', (select public.vecne_dary('t100-far', 'v1')::text not like '%7e57c100%');

select ok, c from t order by ok, c;
rollback;
