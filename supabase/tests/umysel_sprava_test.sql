-- ============================================================
-- Test 0117 — správa farára pri úmysle príde autorovi do zvončeka (OPRAVY 375)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000117f01'), ('7e57c000-0000-0000-0000-000000117a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000117f01','7e57c000-0000-0000-0000-000000117f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000117a01','7e57c000-0000-0000-0000-000000117a01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t117-far','7e57c100-0000-0000-0000-000000117f01','farnost','Farnosť Test 117',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000117a01', false);
select public.odf_uloz('t117-far', '{"id":"u1","k":"umysel","t":"Za rodinu","s":""}');
do $$ begin
  perform public.umysel_sprava('t117-far', 'u1', 'Ahoj');
  insert into t values ('správu posiela len správca', false);
exception when others then insert into t values ('správu posiela len správca', sqlerrm = 'nie_spravca'); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000117f01', false);
insert into t select 'farár pošle správu', public.umysel_sprava('t117-far', 'u1', 'Omša bude v nedeľu o 9:00.');
reset role;
insert into t select 'autor má upozornenie s odkazom na úmysel', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000117a01'
  and titul = 'Správa od farnosti · Farnosť Test 117' and text = 'Omša bude v nedeľu o 9:00.' and odkaz = 'um:t117-far:u1');
insert into t select 'správa je pri úmysle', (select data->'sprava'->>'text' = 'Omša bude v nedeľu o 9:00.' from public.odfarnikov_umysly where id = 'u1');

select ok, c from t order by ok, c;
rollback;
