-- ============================================================
-- Test 0124 — Farár a Pomocník (OPRAVY 393): pomocník spravuje stránku, ale nemení ľudí, účet farnosti ani predplatné;
-- človek v Ľuďoch s rolou duchovného je farár; moje_stranky vráti stránku s úrovňou; po odobratí práva zmiznú.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000124f01', 'vlastnik@test.sk'), ('7e57c000-0000-0000-0000-000000124a01', 'pomocnik@test.sk'),
  ('7e57c000-0000-0000-0000-000000124b01', 'farar2@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000124f01','7e57c000-0000-0000-0000-000000124f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000124a01','7e57c000-0000-0000-0000-000000124a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000124b01','7e57c000-0000-0000-0000-000000124b01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t124-far','7e57c100-0000-0000-0000-000000124f01','farnost','Farnosť Test 124',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t124-far',
  '{"ludia":[{"id":1,"n":"","k":"pomocnik@test.sk","r":"Pomocník","p":"kaplán"},{"id":2,"n":"","k":"farar2@test.sk","r":"Farár"}],"ucetFarnosti":"SK00"}');
insert into t select 'vlastník je farár', public.uroven_stranky('t124-far') = 'farar';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124a01', false);
insert into t select 'pomocník má úroveň pomocník', public.uroven_stranky('t124-far') = 'pomocnik';
insert into public.naboz_stav (oblast, id, data) values ('profil', 't124-far', '{"nazov":"od pomocníka"}');
insert into t select 'pomocník zapíše stav farnosti', exists (select 1 from public.naboz_stav where oblast = 'profil' and id = 't124-far');
update public.nastavenia_stranky set data = data || '{"vzhlad":"x"}' where stranka = 't124-far';
insert into t select 'pomocník zmení iné nastavenie', (select data->>'vzhlad' from public.nastavenia_stranky where stranka = 't124-far') = 'x';
do $$ declare k text; begin
  foreach k in array array['ludia', 'ucetFarnosti', 'predplatne', 'duch'] loop
    begin
      update public.nastavenia_stranky set data = data || jsonb_build_object(k, '[]'::jsonb) where stranka = 't124-far';
      insert into t values ('pomocník nezmení ' || k, false);
    exception when insufficient_privilege then insert into t values ('pomocník nezmení ' || k, true); end;
  end loop;
end $$;
insert into t select 'moje_stranky: pomocník', exists (select 1 from jsonb_array_elements(public.moje_stranky()) x where x->>'id' = 't124-far' and x->>'uroven' = 'pomocnik');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124b01', false);
insert into t select 'druhý farár z Ľudí je farár', public.plne_prava('t124-far');
update public.nastavenia_stranky set data = data || '{"ucetFarnosti":"SK11"}' where stranka = 't124-far';
insert into t select 'farár zmení účet farnosti', (select data->>'ucetFarnosti' from public.nastavenia_stranky where stranka = 't124-far') = 'SK11';
update public.nastavenia_stranky set data = data || '{"ludia":[{"id":2,"n":"","k":"farar2@test.sk","r":"Farár"}]}' where stranka = 't124-far';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000124a01', false);
insert into t select 'odobratý pomocník nemá práva', public.uroven_stranky('t124-far') is null and not public.spravujem_stranku('t124-far');
reset role;

-- prevod starých rolí (0124 bod 5) — rovnaký výraz na ukážkovom zozname
insert into t select 'stará rola → Pomocník s popisom', (
  select c->>'r' = 'Pomocník' and c->>'p' = 'Kaplán / zástupca'
    from jsonb_array_elements((select coalesce(jsonb_agg(case when c->>'r' = 'Dozorca' or c->>'r' = 'Pomocník' or c->>'r' in (select titul from public.cirkev) then c
                   else c || jsonb_build_object('r', 'Pomocník', 'p', coalesce(nullif(trim(c->>'p'), ''), c->>'r')) end), '[]'::jsonb)
       from jsonb_array_elements('[{"k":"a@b.sk","r":"Kaplán / zástupca"}]'::jsonb) c)) c);

select ok, c from t order by ok, c;
rollback;
