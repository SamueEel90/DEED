-- ============================================================
-- Test 0119 — mená prihlásených detí číta len rodič a farár, verejne len počet (OPRAVY 383)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000119f01'), ('7e57c000-0000-0000-0000-000000119a01'), ('7e57c000-0000-0000-0000-000000119c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000119f01','7e57c000-0000-0000-0000-000000119f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000119a01','7e57c000-0000-0000-0000-000000119a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000119c01','7e57c000-0000-0000-0000-000000119c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t119-far','7e57c100-0000-0000-0000-000000119f01','farnost','Farnosť Test 119',false);
insert into public.naboz_stav (oblast, id, data) values ('deti', 't119-far', '[{"id":"tab1","druh":"Tábor","t":"Letný tábor","pz":2,"limit":1}]');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119a01', false);
select public.deti_prihlas('t119-far', 'tab1', true, 'Janko Novák');
do $$ begin
  perform public.reakcia_f('t119-far', 'tab1', 'ucast', true, 'Janko');
  insert into t values ('do verejných reakcií nie', false);
exception when others then insert into t values ('do verejných reakcií nie', sqlerrm = 'deti'); end $$;
insert into t select 'rodič vidí svoje prihlásenie', (select count(*) = 1 from public.deti_prihlasenie where meno = 'Janko Novák');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119c01', false);
insert into t select 'iný nevidí mená', (select count(*) = 0 from public.deti_prihlasenie);
do $$ begin
  perform public.deti_prihlas('t119-far', 'tab1', true, 'Ferko');
  insert into t values ('plný tábor neprihlási', false);
exception when others then insert into t values ('plný tábor neprihlási', sqlerrm = 'plne'); end $$;
reset role;
set role anon;
insert into t select 'anon vidí len počet', (public.deti_pocty('t119-far')->>'tab1')::int = 1;
do $$ declare n int; begin
  select count(*) into n from public.deti_prihlasenie;
  insert into t values ('anon nečíta mená', n = 0);
exception when others then insert into t values ('anon nečíta mená', true); end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119f01', false);
insert into t select 'farár vidí meno', (select meno = 'Janko Novák' from public.deti_prihlasenie where ref = 'tab1');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000119a01', false);
select public.deti_prihlas('t119-far', 'tab1', false);
reset role;
insert into t select 'rodič odhlásil', (select count(*) = 0 from public.deti_prihlasenie);
insert into t select 'verejné reakcie bez mien detí', not exists (select 1 from public.naboz_stav where oblast = 'reakcie' and id = 't119-far' and data::text like '%Janko%');

select ok, c from t order by ok, c;
rollback;
