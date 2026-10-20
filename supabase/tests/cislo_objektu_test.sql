-- ============================================================
-- Test 0134 — číslo objektu: server ho pridelí pri vzniku (aj keď klient pošle vlastné), nemení sa, oznamy ho nemajú
-- ============================================================
begin;
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000134f01', 'org134@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000134f01','7e57c000-0000-0000-0000-000000134f01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t134-ch','7e57c100-0000-0000-0000-000000134f01','charita','OZ Test 134',false);
insert into t select 'stránka má číslo', vs ~ '^\d{10}$' and public.luhn9(left(vs, 9)) = right(vs, 1)::int from public.stranka where id = 't134-ch';

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000134f01', false);
insert into public.oznam_subjektu (id, stranka, kategoria, data) values ('oz134-o','t134-ch','oznam','{}'), ('oz134-i','t134-ch','inzerat','{}');
insert into public.oznam_subjektu (id, stranka, kategoria, data, vs) values ('oz134-x','t134-ch','inzerat','{}','1111111116');
reset role;
insert into t select 'oznam bez čísla', vs is null from public.oznam_subjektu where id = 'oz134-o';
insert into t select 'pracovná ponuka s číslom', vs is not null from public.oznam_subjektu where id = 'oz134-i';
insert into t select 'klient si číslo nevymyslí', vs <> '1111111116' from public.oznam_subjektu where id = 'oz134-x';
do $$ begin
  update public.stranka set vs = '2222222224' where id = 't134-ch';
  insert into t values ('číslo sa nemení', false);
exception when insufficient_privilege then insert into t values ('číslo sa nemení', true);
end $$;
insert into t select 'existujúce príspevky majú číslo', not exists (select 1 from public.prispevok where vs is null);
insert into t select 'feed vidí číslo', exists (select 1 from public.prispevok_feed where vs is not null) or not exists (select 1 from public.prispevok);
select ok, c from t;
rollback;
