-- ============================================================
-- Test 0103 — nastavenia stránky: zápis jedného kľúča nezmaže ostatné, cudzí správca nezapíše (OPRAVY 336)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000103f01'), ('7e57c000-0000-0000-0000-000000103a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000103f01','7e57c000-0000-0000-0000-000000103f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000103a01','7e57c000-0000-0000-0000-000000103a01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t103-far','7e57c100-0000-0000-0000-000000103f01','farnost','Farnosť Test 103',false);
insert into public.nastavenia_stranky (stranka, data) values ('t103-far', '{"duch":{"meno":"Ján Novák"},"ludia":[1,2]}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000103f01', false);
select public.nastavenia_zapis('t103-far', '{"ludia":[1,2,3]}');
insert into t select 'farár ostal po zápise ľudí', (select data->'duch'->>'meno' = 'Ján Novák' and data->'ludia' = '[1,2,3]'::jsonb from public.nastavenia_stranky where stranka = 't103-far');
select public.nastavenia_zapis('t103-far', '{"upoz":{"x":true}}');
insert into t select 'nový kľúč pribudol, staré ostali', (select data ? 'upoz' and data ? 'duch' and data ? 'ludia' from public.nastavenia_stranky where stranka = 't103-far');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000103a01', false);
do $$ begin
  perform public.nastavenia_zapis('t103-far', '{"duch":{}}');
  insert into t values ('cudzí nezapíše', false);
exception when others then insert into t values ('cudzí nezapíše', sqlstate = '42501'); end $$;
reset role;
insert into t select 'farár stále ostal', (select data->'duch'->>'meno' = 'Ján Novák' from public.nastavenia_stranky where stranka = 't103-far');

select ok, c from t order by ok, c;
rollback;
