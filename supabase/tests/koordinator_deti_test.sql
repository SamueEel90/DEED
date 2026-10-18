-- ============================================================
-- Test 0123 — koordinátor detí zapisuje len oblasť „deti“ a vidí mená prihlásených detí (OPRAVY 380 doplnok)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000123f01', 'farar@test.sk'), ('7e57c000-0000-0000-0000-000000123d01', 'Koord@Test.sk'),
  ('7e57c000-0000-0000-0000-000000123b01', 'kostolnik@test.sk'), ('7e57c000-0000-0000-0000-000000123e01', 'rodic@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000123f01','7e57c000-0000-0000-0000-000000123f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000123d01','7e57c000-0000-0000-0000-000000123d01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000123b01','7e57c000-0000-0000-0000-000000123b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000123e01','7e57c000-0000-0000-0000-000000123e01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t123-far','7e57c100-0000-0000-0000-000000123f01','farnost','Farnosť Test 123',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t123-far', '{"ludia":[{"id":1,"n":"","k":"koord@test.sk","r":"Koordinátor detí a mládeže"},{"id":2,"n":"","k":"kostolnik@test.sk","r":"Kostolník / pomocník"}]}');
insert into public.naboz_stav (oblast, id, data) values ('deti', 't123-far', '[{"id":"s1","druh":"Tábor","pz":2,"limit":10}]');

-- rodič prihlási dieťa
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123e01', false);
select public.deti_prihlas('t123-far', 's1', true, 'Janko');

-- koordinátor
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123d01', false);
insert into t select 'koordinátor spravuje deti', public.spravujem_deti('t123-far');
insert into t select 'koordinátor nie je správca stránky', not public.spravujem_stranku('t123-far');
insert into t select 'koordinátor vidí meno dieťaťa', exists (select 1 from public.deti_prihlasenie where stranka = 't123-far' and meno = 'Janko');
update public.naboz_stav set data = '[{"id":"s1","druh":"Tábor","pz":2,"limit":12}]' where oblast = 'deti' and id = 't123-far';
insert into t select 'koordinátor upraví stretnutie', (select data->0->>'limit' from public.naboz_stav where oblast = 'deti' and id = 't123-far') = '12';
do $$ begin
  begin insert into public.naboz_stav (oblast, id, data) values ('profil', 't123-far', '{}'); insert into t values ('koordinátor nezapíše profil', false);
  exception when insufficient_privilege then insert into t values ('koordinátor nezapíše profil', true); end;
end $$;

-- kostolník
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123b01', false);
insert into t select 'kostolník nespravuje deti', not public.spravujem_deti('t123-far');
insert into t select 'kostolník nevidí mená detí', not exists (select 1 from public.deti_prihlasenie where stranka = 't123-far');

-- farár koordinátora odoberie
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123f01', false);
insert into t select 'farár spravuje deti', public.spravujem_deti('t123-far');
update public.nastavenia_stranky set data = '{"ludia":[]}' where stranka = 't123-far';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000123d01', false);
insert into t select 'odobratý koordinátor práva stratil', not public.spravujem_deti('t123-far');
insert into t select 'odobratý koordinátor nevidí mená', not exists (select 1 from public.deti_prihlasenie where stranka = 't123-far');
reset role;

select ok, c from t order by ok, c;
rollback;
