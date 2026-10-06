-- ============================================================
-- Test 0047 (vzhľad stránky + príbeh zbierky). Spustiť po migráciách:
--   psql -f supabase/tests/vzhlad_pribeh_test.sql
-- Beží v transakcii a na konci sa vráti (ROLLBACK). Všetky riadky musia mať ok = t.
-- ============================================================
begin;
create temp table t(c text, ok boolean);
grant all on t to public;

-- osoby: A = správca stránky „tst", B = cudzí
insert into auth.users (id) values ('7e57b000-0000-0000-0000-00000000000a'), ('7e57b000-0000-0000-0000-00000000000b');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57b100-0000-0000-0000-00000000000a', '7e57b000-0000-0000-0000-00000000000a', 'aktivny', 'hotovo'),
 ('7e57b100-0000-0000-0000-00000000000b', '7e57b000-0000-0000-0000-00000000000b', 'aktivny', 'hotovo'),
 ('7e57b100-0000-0000-0000-0000000000c0', null, 'charita', 'hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('tst', '7e57b100-0000-0000-0000-0000000000c0', 'charita', 'Test o.z.', false),
 ('tstfara', '7e57b100-0000-0000-0000-0000000000c0', 'farnost', 'Test fara', false);
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('7e57b100-0000-0000-0000-0000000000c0', '7e57b100-0000-0000-0000-00000000000a', 'hlavny');

-- ---------- vzhľad ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-00000000000a', false);
insert into public.profil_stranky (stranka, vzhlad) values ('tst', 'pirat') on conflict (stranka) do update set vzhlad = excluded.vzhlad;
insert into public.profil_stranky (stranka, vzhlad) values ('tstfara', 'vyklad') on conflict (stranka) do update set vzhlad = excluded.vzhlad;
reset role;
insert into t select 'vzhlad: spravca ulozil', (select vzhlad from profil_stranky where stranka = 'tst') = 'pirat';

set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into t select 'vzhlad: Zadarmo verejnosti null', (select vzhlad from profil_stranky_verejny where stranka = 'tst') is null;
insert into t select 'vzhlad: farnost aj bez programu', (select vzhlad from profil_stranky_verejny where stranka = 'tstfara') = 'vyklad';
reset role;
insert into public.stranka_program (stranka, tier) values ('tst', 1) on conflict (stranka) do update set tier = 1;
set role anon;
insert into t select 'vzhlad: P1 verejnosti pirat', (select vzhlad from profil_stranky_verejny where stranka = 'tst') = 'pirat';
reset role;

-- cudzí nezapíše
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-00000000000b', false);
do $$ begin
  update public.profil_stranky set vzhlad = 'kronika' where stranka = 'tst';
end $$;
reset role;
insert into t select 'vzhlad: cudzi nezmenil', (select vzhlad from profil_stranky where stranka = 'tst') = 'pirat';

do $$ begin
  begin
    update public.profil_stranky set vzhlad = 'neon' where stranka = 'tst';
    insert into t values ('vzhlad: neplatna hodnota odmietnuta', false);
  exception when check_violation then
    insert into t values ('vzhlad: neplatna hodnota odmietnuta', true);
  end;
end $$;

-- ---------- príbeh ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-00000000000a', false);
insert into public.pribeh_zbierky (zbierka, stranka, koncept) values ('z-1', 'tst', '{"kratky":"koncept"}');
insert into public.pribeh_zbierky (zbierka, stranka, zverejneny, tyzdna) values ('z-2', 'tst', '{"kratky":"verejny"}', true);
insert into public.pribeh_zbierky (zbierka, stranka, zverejneny) values ('z-1b', 'tst', '{"kratky":"iny"}')
  on conflict (zbierka) do nothing;
-- Príbeh týždňa prepnúť na z-1b → z-2 sa vypne
insert into public.pribeh_zbierky (zbierka, stranka, tyzdna) values ('z-1b', 'tst', true)
  on conflict (zbierka) do update set tyzdna = excluded.tyzdna;
reset role;
insert into t select 'pribeh: tyzdna len jeden na stranku', (select count(*) from pribeh_zbierky where stranka = 'tst' and tyzdna) = 1
  and (select tyzdna from pribeh_zbierky where zbierka = 'z-1b');

set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into t select 'pribeh: anon nevidi tabulku (koncept)', not exists (select 1 from pribeh_zbierky);
insert into t select 'pribeh: anon vidi len zverejnene', (select count(*) from pribeh_zbierky_verejny where stranka = 'tst') = 2
  and not exists (select 1 from pribeh_zbierky_verejny where zbierka = 'z-1');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-00000000000b', false);
insert into t select 'pribeh: cudzi nevidi koncept', not exists (select 1 from pribeh_zbierky where zbierka = 'z-1');
do $$ begin
  begin
    insert into public.pribeh_zbierky (zbierka, stranka, koncept) values ('z-cudzi', 'tst', '{}');
    insert into t values ('pribeh: cudzi nezapise', false);
  exception when insufficient_privilege then
    insert into t values ('pribeh: cudzi nezapise', true);
  end;
end $$;
reset role;

do $$ begin
  begin
    insert into public.pribeh_zbierky (zbierka, stranka, zverejneny)
      values ('z-3', 'tst', '{"citat":{"text":"Ďakujeme","meno":"Jana","suhlas":false}}');
    insert into t values ('pribeh: citat bez suhlasu sa nezverejni', false);
  exception when check_violation then
    insert into t values ('pribeh: citat bez suhlasu sa nezverejni', true);
  end;
end $$;
insert into public.pribeh_zbierky (zbierka, stranka, koncept)
  values ('z-4', 'tst', '{"citat":{"text":"Ďakujeme","meno":"Jana","suhlas":false}}');
insert into t select 'pribeh: citat bez suhlasu v koncepte smie', exists (select 1 from pribeh_zbierky where zbierka = 'z-4');

select ok, c from t order by ok, c;
rollback;
