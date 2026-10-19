-- ============================================================
-- Test 0131 — premenuj_stranku: vlastník áno, pracovník s „nastavenia“ áno, bez neho nie, cudzí nie, prázdny názov nie
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000131f01', 'org131@test.sk'), ('7e57c000-0000-0000-0000-000000131a01', 'nast131@test.sk'),
  ('7e57c000-0000-0000-0000-000000131b01', 'obsah131@test.sk'), ('7e57c000-0000-0000-0000-000000131c01', 'cudzi131@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000131f01','7e57c000-0000-0000-0000-000000131f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000131a01','7e57c000-0000-0000-0000-000000131a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000131b01','7e57c000-0000-0000-0000-000000131b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000131c01','7e57c000-0000-0000-0000-000000131c01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t131-ch','7e57c100-0000-0000-0000-000000131f01','charita','OZ Pomoc 173',false);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000131f01', false);
insert into public.nastavenia_stranky (stranka, data) values ('t131-ch',
  '{"ludia":[{"id":1,"n":"","k":"nast131@test.sk","r":"Pracovník","prava":["nastavenia"]},{"id":2,"n":"","k":"obsah131@test.sk","r":"Pracovník","prava":["obsah"]}]}');
select public.premenuj_stranku('t131-ch', 'Pod korunami, o. z.');
insert into t select 'vlastník premenoval', (select nazov from public.stranka where id = 't131-ch') = 'Pod korunami, o. z.';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000131a01', false);
select public.premenuj_stranku('t131-ch', 'Pod korunami');
insert into t select 'pracovník s nastavenia premenoval', (select nazov from public.stranka where id = 't131-ch') = 'Pod korunami';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000131b01', false);
do $$ begin perform public.premenuj_stranku('t131-ch', 'X'); insert into t values ('bez nastavenia nie', false);
exception when insufficient_privilege then insert into t values ('bez nastavenia nie', true); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000131c01', false);
do $$ begin perform public.premenuj_stranku('t131-ch', 'X'); insert into t values ('cudzí nie', false);
exception when insufficient_privilege then insert into t values ('cudzí nie', true); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000131f01', false);
do $$ begin perform public.premenuj_stranku('t131-ch', '  '); insert into t values ('prázdny nie', false);
exception when invalid_parameter_value then insert into t values ('prázdny nie', true); end $$;
reset role;
insert into t select 'názov ostal', (select nazov from public.stranka where id = 't131-ch') = 'Pod korunami';

select ok, c from t order by ok, c;
rollback;
