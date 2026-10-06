-- ============================================================
-- Test 0050 (nastavenia stránky). Spustiť po migráciách:
--   psql -f supabase/tests/nastavenia_stranky_test.sql
-- Beží v transakcii a na konci sa vráti (ROLLBACK). Všetky riadky musia mať ok = t.
-- ============================================================
begin;
create temp table t(c text, ok boolean);
grant all on t to public;

insert into auth.users (id) values ('7e57e000-0000-0000-0000-00000000000a'), ('7e57e000-0000-0000-0000-00000000000b');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57e100-0000-0000-0000-00000000000a', '7e57e000-0000-0000-0000-00000000000a', 'aktivny', 'hotovo'),
 ('7e57e100-0000-0000-0000-00000000000b', '7e57e000-0000-0000-0000-00000000000b', 'aktivny', 'hotovo'),
 ('7e57e100-0000-0000-0000-0000000000c0', null, 'charita', 'hotovo');
insert into public.stranka (id, ucet_id, typ, nazov) values ('tstnast', '7e57e100-0000-0000-0000-0000000000c0', 'charita', 'Test');
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('7e57e100-0000-0000-0000-0000000000c0', '7e57e100-0000-0000-0000-00000000000a', 'hlavny');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57e000-0000-0000-0000-00000000000a', false);
insert into public.nastavenia_stranky (stranka, data) values ('tstnast', '{"nf":{"dary":true},"ek.p":2}')
  on conflict (stranka) do update set data = excluded.data;
insert into public.nastavenia_stranky (stranka, data) values ('tstnast', '{"nf":{"dary":false},"ek.p":1}')
  on conflict (stranka) do update set data = excluded.data;
insert into t select 'spravca ulozil a prepisal', (select data->>'ek.p' from nastavenia_stranky where stranka = 'tstnast') = '1';
insert into t select 'upravil = spravca', (select upravil from nastavenia_stranky where stranka = 'tstnast') = '7e57e100-0000-0000-0000-00000000000a';
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57e000-0000-0000-0000-00000000000b', false);
insert into t select 'cudzi nevidi', not exists (select 1 from nastavenia_stranky);
update public.nastavenia_stranky set data = '{}' where stranka = 'tstnast';
do $$ begin
  begin
    insert into public.nastavenia_stranky (stranka, data) values ('svetlo', '{}');
    insert into t values ('cudzi nezalozi', false);
  exception when insufficient_privilege then insert into t values ('cudzi nezalozi', true); end;
end $$;
reset role;
insert into t select 'cudzi neprepisal', (select data->>'ek.p' from nastavenia_stranky where stranka = 'tstnast') = '1';

set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into t select 'anon nevidi', not exists (select 1 from nastavenia_stranky);
reset role;

do $$ begin
  begin
    insert into public.nastavenia_stranky (stranka, data) values ('pekaren', '[1,2]');
    insert into t values ('data musi byt objekt', false);
  exception when check_violation then insert into t values ('data musi byt objekt', true); end;
end $$;

select ok, c from t order by ok, c;
rollback;
