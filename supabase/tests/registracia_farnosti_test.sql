-- ============================================================
-- Test 0154 — registrácia farnosti z osobného účtu (testovacia verzia). ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000154f01'), ('7e57c000-0000-0000-0000-000000154a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000154f01','7e57c000-0000-0000-0000-000000154f01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000154a01','7e57c000-0000-0000-0000-000000154a01','aktivny','hotovo');
\pset tuples_only on
create temp table t(c text, ok boolean);
create temp table v(id text);
grant all on t, v to public;

insert into t select 'anon nezaloží farnosť', not has_function_privilege('anon', 'public.zaloz_farnost(text,text,text,text,text)', 'execute');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000154f01', false);
insert into v select public.zaloz_farnost('Farnosť Test 154', 'Testovce', 'ECAV', 'Kostol Svätej Trojice', 'SK31 1200 0000 1987 4263 7541');
insert into t select 'id farnosti fa-…', (select id like 'fa-%' from v);
insert into t select 'zakladateľ je Farár', (select public.uroven_stranky(id) = 'farar' from v);
insert into t select 'farnosť je medzi mojimi stránkami', (select public.moje_stranky() @> jsonb_build_array(jsonb_build_object('id', v.id, 'typ', 'farnost', 'uroven', 'farar')) from v);
do $$ begin
  perform public.zaloz_farnost('Farnosť X', 'Obec', 'NEEXISTUJE', 'Kostol');
  insert into t values ('neznáma cirkev neprejde', false);
exception when others then insert into t values ('neznáma cirkev neprejde', sqlstate = '22023'); end $$;
do $$ begin
  perform public.zaloz_farnost('Farnosť X', 'Obec', 'RKC', 'Kostol', 'nie-iban');
  insert into t values ('zlý IBAN neprejde', false);
exception when others then insert into t values ('zlý IBAN neprejde', sqlstate = '22023'); end $$;
insert into v select public.zaloz_farnost('Farnosť Bez Účtu', 'Obec', 'RKC', 'Farský kostol');
reset role;

insert into t select 'stránka typu farnosť s názvom', (select typ = 'farnost' and nazov = 'Farnosť Test 154' and not testovacia from public.stranka where id = (select id from v limit 1));
insert into t select 'adresár: cirkev a obec z registrácie', (select cirkev = 'ECAV' and obec = 'Testovce' from public.farnost_adresar where stranka = (select id from v limit 1));
insert into t select 'v adresári farností', exists (select 1 from public.v_adresar_farnosti where id = (select id from v limit 1) and cirkev = 'ECAV');
insert into t select 'hlavný kostol = prvé miesto „0“', (select data->0->>'id' = '0' and data->0->>'druh' = 'farsky' and data->0->>'nazov' = 'Kostol Svätej Trojice' from public.naboz_stav where oblast = 'miesta' and id = (select id from v limit 1));
insert into t select 'IBAN uložený ako účet farnosti', (select data->>'ucetFarnosti' = 'SK3112000000198742637541' from public.nastavenia_stranky where stranka = (select id from v limit 1));
insert into t select 'bez IBAN žiadny účet farnosti', not exists (select 1 from public.nastavenia_stranky where stranka = (select id from v offset 1 limit 1) and data ? 'ucetFarnosti');
insert into t select 'dve farnosti, dve stránky', (select count(distinct id) = 2 from v);

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000154a01', false);
insert into t select 'cudzí nie je správca', (select public.uroven_stranky(id) is null from v limit 1);
reset role;

select ok, c from t order by ok, c;
rollback;
