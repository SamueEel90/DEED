-- ============================================================
-- Test 0048 (rotujúci QR — diery 1 až 4). Spustiť po migráciách:
--   psql -f supabase/tests/qr_rotujuci_test.sql
-- Beží v transakcii a na konci sa vráti (ROLLBACK). Všetky riadky musia mať ok = t.
-- ============================================================
begin;
create temp table t(c text, ok boolean);
create temp table tok(token text);
grant all on t, tok to public;

-- A = organizátor, B = účastník, C = cudzí
insert into auth.users (id) values ('7e57c000-0000-0000-0000-00000000000a'), ('7e57c000-0000-0000-0000-00000000000b'), ('7e57c000-0000-0000-0000-00000000000c');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-00000000000a', '7e57c000-0000-0000-0000-00000000000a', 'aktivny', 'hotovo'),
 ('7e57c100-0000-0000-0000-00000000000b', '7e57c000-0000-0000-0000-00000000000b', 'aktivny', 'hotovo'),
 ('7e57c100-0000-0000-0000-00000000000c', '7e57c000-0000-0000-0000-00000000000c', 'aktivny', 'hotovo');

-- ---------- 2 · anon akciu nezaloží ----------
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  begin
    perform public.event_secret_create('e0000000-0000-0000-0000-000000000001'::uuid, 15, 'threshold', 'Test', null);
    insert into t values ('anon nezalozi akciu', false);
  exception when insufficient_privilege then
    insert into t values ('anon nezalozi akciu', true);
  end;
end $$;
reset role;

-- A založí akciu (krok 3600 → orezaný na 60), p_organizator = cudzí sa ignoruje
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-00000000000a', false);
select public.event_secret_create('e0000000-0000-0000-0000-000000000001'::uuid, 3600, 'threshold', 'Brigáda', '7e57c100-0000-0000-0000-00000000000c');
insert into tok select public.event_token('e0000000-0000-0000-0000-000000000001'::uuid);
reset role;
insert into t select 'krok orezany na 60 s', (select step from event_secret where event_id = 'e0000000-0000-0000-0000-000000000001') = 60;
insert into t select 'organizator = moj_ucet, nie parameter', (select organizator from event_secret where event_id = 'e0000000-0000-0000-0000-000000000001') = '7e57c100-0000-0000-0000-00000000000a';
insert into t select 'organizator dostal token', (select token from tok) like 'DEED1.e0000000-%';

-- ---------- 1 · cudzí token nedostane, akciu nezmení ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-00000000000c', false);
do $$ begin
  begin
    perform public.event_token('e0000000-0000-0000-0000-000000000001'::uuid);
    insert into t values ('cudzi nedostane token', false);
  exception when insufficient_privilege then
    insert into t values ('cudzi nedostane token', true);
  end;
  begin
    perform public.event_secret_create('e0000000-0000-0000-0000-000000000001'::uuid, 60, 'exact', null, null);
    insert into t values ('cudzi nezmeni akciu', false);
  exception when insufficient_privilege then
    insert into t values ('cudzi nezmeni akciu', true);
  end;
end $$;
reset role;

-- ---------- 3 · sken: používateľ z auth ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-00000000000b', false);
-- B pošle ako p_user účet A → zapíše sa B
insert into t select 'sken ok', (public.scan_validate((select token from tok), 'zariadenie-B1', '7e57c100-0000-0000-0000-00000000000a'))->>'vysledok' = 'ok';
insert into t select 'ten isty ucet z ineho zariadenia = replay', (public.scan_validate((select token from tok), 'zariadenie-B2', null))->>'vysledok' = 'replay';
reset role;
insert into t select 'dochadzka patri B, nie podvrhnutemu A',
  exists (select 1 from dochadzka where user_id = '7e57c100-0000-0000-0000-00000000000b')
  and not exists (select 1 from dochadzka where user_id = '7e57c100-0000-0000-0000-00000000000a');

-- anonymný sken: zaloguje sa, dochádzka nie
set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into t select 'anonymny sken ok bez dochadzky', (public.scan_validate((select token from tok), 'zariadenie-X', null))->>'vysledok' = 'ok';
reset role;
insert into t select 'anonymny sken nema dochadzku', (select count(*) from dochadzka) = 1;
insert into t select 'falosny token = fake', (public.scan_validate('DEED1.e0000000-0000-0000-0000-000000000001.1.abcdef0123456789', 'zariadenie-Y', null))->>'vysledok' = 'fake';

-- limit: 20 pokusov za minútu na zariadenie
insert into scan_log (event_id, device_id, counter, vysledok)
  select 'e0000000-0000-0000-0000-000000000001', 'zariadenie-Z', g, 'fake' from generate_series(1, 20) g;
insert into t select 'limit pokusov', (public.scan_validate((select token from tok), 'zariadenie-Z', null))->>'vysledok' = 'limit';

-- ---------- 4 · RLS ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-00000000000b', false);
do $$ begin
  begin
    insert into public.dochadzka (event_id, user_id, prichod, mod, splneny, hodiny)
      values ('e0000000-0000-0000-0000-000000000001', '7e57c100-0000-0000-0000-00000000000b', now(), 'threshold', true, 99);
    insert into t values ('klient nezapise hodiny priamo', false);
  exception when insufficient_privilege then
    insert into t values ('klient nezapise hodiny priamo', true);
  end;
  begin
    insert into public.scan_log (event_id, device_id, counter, vysledok) values ('e0000000-0000-0000-0000-000000000001', 'x', 1, 'ok');
    insert into t values ('klient nezapise scan_log', false);
  exception when insufficient_privilege then
    insert into t values ('klient nezapise scan_log', true);
  end;
end $$;
insert into t select 'ucastnik vidi svoju dochadzku', (select count(*) from dochadzka) = 1;
insert into t select 'ucastnik nevidi scan_log', (select count(*) from scan_log) = 0;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-00000000000c', false);
insert into t select 'cudzi nevidi dochadzku', (select count(*) from dochadzka) = 0;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-00000000000a', false);
insert into t select 'organizator vidi dochadzku a skeny', (select count(*) from dochadzka) = 1 and (select count(*) from scan_log) > 20;
reset role;

select ok, c from t order by ok, c;
rollback;
