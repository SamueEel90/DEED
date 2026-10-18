-- ============================================================
-- Test 0107 — statistiky_farnosti: darcovia, noví darcovia, sledujúci, podiel farnosti zo zbierky rodiny; len správca
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = farár (správca), P = pozostalý, D1 a D2 = darcovia, S = sledujúci
insert into auth.users (id) values ('7e57d000-0000-0000-0000-0000000000f1'), ('7e57d000-0000-0000-0000-0000000000a1'),
 ('7e57d000-0000-0000-0000-0000000000d1'), ('7e57d000-0000-0000-0000-0000000000d2'), ('7e57d000-0000-0000-0000-0000000000e1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57d100-0000-0000-0000-0000000000f1','7e57d000-0000-0000-0000-0000000000f1','charita','hotovo'),
 ('7e57d100-0000-0000-0000-0000000000a1','7e57d000-0000-0000-0000-0000000000a1','aktivny','hotovo'),
 ('7e57d100-0000-0000-0000-0000000000d1','7e57d000-0000-0000-0000-0000000000d1','aktivny','hotovo'),
 ('7e57d100-0000-0000-0000-0000000000d2','7e57d000-0000-0000-0000-0000000000d2','aktivny','hotovo'),
 ('7e57d100-0000-0000-0000-0000000000e1','7e57d000-0000-0000-0000-0000000000e1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t-sf','7e57d100-0000-0000-0000-0000000000f1','farnost','Testovacia fara',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t-sf','SK0011000000002612345670','T4','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-sf1','Oprava organa','nabozenstvo','zbierka','aktivna','t-sf','7e57d100-0000-0000-0000-0000000000f1', now(), '{"ucet":"SK0011000000002612345670","farnost":{"druh":"farnost"}}'),
 ('zb-sfr','Pohreb — test','nabozenstvo','zbierka','aktivna','t-sf','7e57d100-0000-0000-0000-0000000000f1', now(),
  '{"ucet":"SK0011000000002612345670","farnost":{"druh":"pohreb"},"rozdelenie":[{"druh":"prijemca","ucet":"7e57d100-0000-0000-0000-0000000000a1","text":"Pozostalý","podiel":0.97},{"druh":"overovatel","podiel":0.03}]}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
-- D1: 2 dary na zbierku farnosti, D2: 1 dar na zbierku farnosti + 100 € na zbierku rodiny
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-0000000000d1', false);
select (public.zbierka_dar('zb-sf1', 'sf-1', 10, 'EUR', 'fiat'))->>'platba_id' is not null;
select (public.zbierka_dar('zb-sf1', 'sf-2', 10, 'EUR', 'fiat'))->>'platba_id' is not null;
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-0000000000d2', false);
select (public.zbierka_dar('zb-sf1', 'sf-3', 5, 'EUR', 'fiat'))->>'platba_id' is not null;
select (public.zbierka_dar('zb-sfr', 'sf-4', 100, 'EUR', 'fiat'))->>'platba_id' is not null;
-- S sleduje farnosť
select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-0000000000e1', false);
insert into public.moje_farnosti (stranka) values ('t-sf');

do $$ begin perform public.statistiky_farnosti('t-sf', now() - interval '30 days'); insert into t values ('cudzi nesmie', false);
exception when insufficient_privilege then insert into t values ('cudzi nesmie', true); end $$;

select set_config('request.jwt.claim.sub', '7e57d000-0000-0000-0000-0000000000f1', false);
create temp table s as select public.statistiky_farnosti('t-sf', now() - interval '30 days') as j;
insert into t select 'darcovia spolu = 2 (rodina sa neráta)', (j->>'darcovia_spolu')::int = 2 from s;
insert into t select 'novi darcovia = 2', (j->>'novi_darcovia')::int = 2 from s;
insert into t select 'novi darcovia v buducnosti = 0', (public.statistiky_farnosti('t-sf', now() + interval '1 day')->>'novi_darcovia')::int = 0;
insert into t select 'sledujuci = 1', (j->>'sledujuci')::int = 1 from s;
insert into t select 'sledujuci noví 30 = 1', (j->>'sledujuci_novi_30')::int = 1 from s;
insert into t select 'pravidelna = 0 (0109)', (j->>'pravidelna')::int = 0 from s;
insert into t select 'podiel rodiny = 3 €', (j->'podiel_rodiny'->>'EUR')::numeric = 3 from s;
reset role;

select ok, c from t order by ok, c;

rollback;
