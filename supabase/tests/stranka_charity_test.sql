-- ============================================================
-- Test 0126 — registrácia charity založí vlastnú stránku (OPRAVY 402): dve charity = dve stránky, cudzí nezaloží.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000126a01', 'zakladatel@test.sk'), ('7e57c000-0000-0000-0000-000000126c01', 'cudzi@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000126a01','7e57c000-0000-0000-0000-000000126a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000126c01','7e57c000-0000-0000-0000-000000126c01','aktivny','hotovo');
\pset tuples_only on
create temp table t(c text, ok boolean);
create temp table o(n int, org uuid, st text);
grant all on t, o to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000126a01', false);
insert into o select 1, (public.zaloz_organizaciu('charita')).id, null;
insert into o select 2, (public.zaloz_organizaciu('charita')).id, null;
update o set st = public.zaloz_stranku_organizacie(org, 'Pod korunami, o. z.') where n = 1;
update o set st = public.zaloz_stranku_organizacie(org, 'Druhá charita') where n = 2;
insert into t select 'dve charity = dve stránky', (select count(distinct st) from o) = 2 and (select bool_and(st like 'ch-%') from o);
insert into t select 'opakovanie vráti tú istú', public.zaloz_stranku_organizacie((select org from o where n = 1), 'Pod korunami, o. z.') = (select st from o where n = 1);
insert into t select 'zakladateľ spravuje svoju', public.spravujem_stranku((select st from o where n = 1));
insert into t select 'v Moje stránky sú obe', (select count(*) from jsonb_array_elements(public.moje_stranky()) x where x->>'id' in (select st from o)) = 2;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000126c01', false);
do $$ begin begin perform public.zaloz_stranku_organizacie((select org from o where n = 1), 'Ukradnutá'); insert into t values ('cudzí nezaloží', false);
  exception when insufficient_privilege then insert into t values ('cudzí nezaloží', true); end; end $$;
insert into t select 'cudzí nespravuje', not public.spravujem_stranku((select st from o where n = 1));
reset role;

select ok, c from t order by ok, c;
rollback;
