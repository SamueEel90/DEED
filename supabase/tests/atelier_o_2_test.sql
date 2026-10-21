-- ============================================================
-- Test 0153 — Ateliér: prepnutie o 2:00 (atelier_prepni) a počet sledujúcich. ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000153f01'), ('7e57c000-0000-0000-0000-000000153a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000153f01','7e57c000-0000-0000-0000-000000153f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000153a01','7e57c000-0000-0000-0000-000000153a01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t153-a','7e57c100-0000-0000-0000-000000153f01','farnost','Farnosť Test 153 A',false),
 ('t153-b','7e57c100-0000-0000-0000-000000153f01','farnost','Farnosť Test 153 B',false),
 ('t153-c','7e57c100-0000-0000-0000-000000153f01','farnost','Farnosť Test 153 C',false);
insert into public.nastavenia_stranky (stranka, data, verejne) values
 ('t153-a', jsonb_build_object('duch', '{"meno":"Ján"}'::jsonb, 'atelier', jsonb_build_object('rozlozenie','kronika','usporiadanie','{"poradie":["ozn"]}'::jsonb,'naplanovane', now() - interval '1 minute')),
   '{"rozlozenie":"nastenka","sumy":true}'),
 ('t153-b', jsonb_build_object('atelier', jsonb_build_object('rozlozenie','moderne','usporiadanie','{}'::jsonb,'naplanovane', now() + interval '3 hours')), '{"rozlozenie":"nastenka"}'),
 ('t153-c', jsonb_build_object('atelier', jsonb_build_object('rozlozenie','klasika','naplanovane', now() - interval '1 minute')), '{"rozlozenie":"nastenka"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

insert into t select 'anon ani prihlásený nespustia prepnutie',
  not has_function_privilege('anon', 'public.atelier_prepni()', 'execute') and not has_function_privilege('authenticated', 'public.atelier_prepni()', 'execute');
insert into t select 'prepnutý je len jeden koncept (čas prišiel, platný vzhľad)', public.atelier_prepni() = 1;
insert into t select 'A: verejne má nový vzhľad a poradie, ostatné ostali',
  (select verejne->>'rozlozenie' = 'kronika' and verejne->'usporiadanie' = '{"poradie":["ozn"]}'::jsonb and verejne->'sumy' = 'true'::jsonb from public.nastavenia_stranky where stranka = 't153-a');
insert into t select 'A: koncept zmazaný, starý vzhľad odložený na 7 dní, súkromné ostalo',
  (select not data ? 'atelier' and data->'atelierSpat'->>'rozlozenie' = 'nastenka' and (data->'atelierSpat'->>'do')::timestamptz > now() + interval '6 days' and data->'duch'->>'meno' = 'Ján'
   from public.nastavenia_stranky where stranka = 't153-a');
insert into t select 'B: naplánované neskôr sa nezmenilo', (select verejne->>'rozlozenie' = 'nastenka' and data ? 'atelier' from public.nastavenia_stranky where stranka = 't153-b');
insert into t select 'C: neplatný vzhľad sa neprepne', (select verejne->>'rozlozenie' = 'nastenka' from public.nastavenia_stranky where stranka = 't153-c');
insert into t select 'druhý beh nič neprepne', public.atelier_prepni() = 0;

insert into public.moje_farnosti (ucet_id, stranka) values ('7e57c100-0000-0000-0000-000000153a01', 't153-a');
insert into public.moje_kostoly (ucet_id, stranka, miesto) values ('7e57c100-0000-0000-0000-000000153a01', 't153-a', '0'), ('7e57c100-0000-0000-0000-000000153f01', 't153-a', '0');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000153f01', false);
insert into t select 'správca: sledujú 2 ľudia (človek s farnosťou aj kostolom raz)', public.sledujuci_stranky('t153-a') = 2;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000153a01', false);
do $$ begin
  perform public.sledujuci_stranky('t153-a');
  insert into t values ('cudzí počet nevidí', false);
exception when others then insert into t values ('cudzí počet nevidí', sqlstate = '42501'); end $$;
reset role;

select ok, c from t order by ok, c;
rollback;
