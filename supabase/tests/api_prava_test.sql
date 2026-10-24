-- ============================================================
-- Test 0189 — z appky sa dá volať len to, čo je v api_funkcie (alebo čo beží DB sama v mene volajúceho).
-- Beží v transakcii s ROLLBACK, každý riadok ok = t. Pri novej funkcii pre appku: pridať do api_funkcie + grant execute.
-- ============================================================
begin;
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table v_def as select public.api_funkcie_z_definicii() f;

-- 1 · žiadna funkcia v public nie je volateľná z appky mimo zoznamu (vypíše prvé mená, keby bola)
create temp table unik as
  select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as auth
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind in ('f', 'p')
     and p.proname not in (select f from v_def)
     and ((has_function_privilege('anon', p.oid, 'execute') and not exists (select 1 from public.api_funkcie a where a.funkcia = p.proname and a.anon))
       or (has_function_privilege('authenticated', p.oid, 'execute') and not exists (select 1 from public.api_funkcie a where a.funkcia = p.proname and a.authenticated)));
insert into t select 'ziadna funkcia mimo zoznamu nie je volatelna z appky' || coalesce(' — UNIKA: ' || (select string_agg(proname, ', ') from (select proname from unik limit 8) x), ''), not exists (select 1 from unik);
-- PUBLIC nemá execute na ničom v public
insert into t select 'PUBLIC nema execute', not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
   where n.nspname = 'public' and a.grantee = 0 and a.privilege_type = 'EXECUTE');

-- 2 · všetko zo zoznamu je naozaj volateľné (grant nechýba)
insert into t select 'vsetko zo zoznamu je volatelne', not exists (
  select 1 from public.api_funkcie a
   where (a.authenticated and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = a.funkcia and has_function_privilege('authenticated', p.oid, 'execute')))
      or (a.anon and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = a.funkcia and has_function_privilege('anon', p.oid, 'execute'))));
insert into t select 'zoznam neobsahuje neexistujuce funkcie', not exists (
  select 1 from public.api_funkcie a where not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = a.funkcia));

-- 3 · diery z 24. 10. sú zavreté: neprihlásený ani prihlásený nespustí interné funkcie
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000189d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000189d01','7e57c000-0000-0000-0000-000000189d01','aktivny','hotovo');
set role anon;
do $$ begin perform public.dorovnanie_financuj('dv-x', 10000, false); insert into t values ('anon: dorovnanie_financuj odmietne', false);
exception when insufficient_privilege then insert into t values ('anon: dorovnanie_financuj odmietne', true); end $$;
do $$ begin perform public.dorovnanie_presun('dv-x', 10000, false, null); insert into t values ('anon: dorovnanie_presun odmietne', false);
exception when insufficient_privilege then insert into t values ('anon: dorovnanie_presun odmietne', true); end $$;
do $$ begin perform public.notifikuj_ucet('7e57c100-0000-0000-0000-000000189d01', 'Váš účet je zablokovaný', 'Zadajte PIN'); insert into t values ('anon: notifikuj_ucet odmietne', false);
exception when insufficient_privilege then insert into t values ('anon: notifikuj_ucet odmietne', true); end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000189d01', false);
do $$ begin perform public.notifikuj_ucet('7e57c100-0000-0000-0000-000000189d01', 'x', 'y'); insert into t values ('prihlaseny: notifikuj_ucet odmietne', false);
exception when insufficient_privilege then insert into t values ('prihlaseny: notifikuj_ucet odmietne', true); end $$;
do $$ begin perform public.upozorni_farnost('x', 'oznamy', array['a'], 'text', true, 'zdroj'); insert into t values ('prihlaseny: upozorni_farnost odmietne', false);
exception when insufficient_privilege then insert into t values ('prihlaseny: upozorni_farnost odmietne', true); end $$;
-- appka funguje: verejné RPC ostali (moj_ucet, zaisti_ucet, dorovnania_nacitaj)
insert into t select 'prihlaseny: zaisti_ucet ide', public.zaisti_ucet() is not null;
insert into t select 'prihlaseny: dorovnania_nacitaj ide', public.dorovnania_nacitaj() is not null;
reset role;
set role anon;
insert into t select 'anon: je_testovaci / dorovnanie_smie_cislo idu (verejne)', public.dorovnanie_smie_cislo('x', 'y') is not null;
reset role;

-- 4 · nová funkcia bez grantu nie je volateľná z appky (predvolené práva)
create function public.test189_nova() returns int language sql as $$ select 1 $$;
insert into t select 'nova funkcia: anon ani authenticated ju nevolaju', not has_function_privilege('anon', 'public.test189_nova()', 'execute') and not has_function_privilege('authenticated', 'public.test189_nova()', 'execute');
drop function public.test189_nova();

select ok, c from t order by ok, c;
rollback;
