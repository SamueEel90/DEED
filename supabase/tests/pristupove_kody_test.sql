-- ============================================================
-- Test 0158 — prístupové kódy: vydá len tím DEED, kód na jednu registráciu, pilot/test, štítok len správcovi,
-- oprava omylu, stránka bez kódu = test. Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
-- M = Martin (tím DEED), F = farár, X = cudzí
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000158a01'), ('7e57c000-0000-0000-0000-000000158f01'), ('7e57c000-0000-0000-0000-000000158e01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000158a01','7e57c000-0000-0000-0000-000000158a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000158f01','7e57c000-0000-0000-0000-000000158f01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000158e01','7e57c000-0000-0000-0000-000000158e01','aktivny','hotovo');
insert into public.deed_admin (ucet) values ('7e57c100-0000-0000-0000-000000158a01');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table k(druh text, kod text);
grant all on k to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000158a01', false);
insert into k select 'pilot', public.kod_vytvor('pilot', 'Evanjelický farár');
insert into k select 'test', public.kod_vytvor('test', 'Bratranec');
insert into k select 'test2', public.kod_vytvor('test', null);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000158f01', false);
do $$ begin
  perform public.kod_vytvor('pilot', 'ja');
  insert into t values ('kód vydá len tím DEED', false);
exception when others then insert into t values ('kód vydá len tím DEED', sqlerrm = 'nie_admin');
end $$;
do $$ begin
  perform public.kod_zoznam();
  insert into t values ('zoznam len tím DEED', false);
exception when others then insert into t values ('zoznam len tím DEED', sqlerrm = 'nie_admin');
end $$;
insert into t select 'formát XXXX-XXXX, pilot a test vyzerajú rovnako', bool_and(kod ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$') from k;
insert into t select 'over: platný kód (malé písmená, medzery)', public.kod_over('  ' || lower((select kod from k where druh = 'pilot')) || ' ');
insert into t select 'over: zlý kód', not public.kod_over('AAAA-AAAA');
insert into t select 'tabuľka kódov nečitateľná', not has_table_privilege('authenticated', 'public.pristupovy_kod', 'select');

-- farár založí farnosť → testovacia, kým nepripne kód
create temp table f as select public.zaloz_farnost('Farnosť ECAV 158', 'Trenčín', 'ECAV', 'Evanjelický kostol') as id;
grant all on f to public;
insert into t select 'nová stránka bez kódu = test', public.stranka_rezim_moj((select id from f)) = 'test';
insert into t select 'pilotný kód → pilot', public.kod_uplatni((select id from f), (select kod from k where druh = 'pilot')) = 'pilot';
insert into t select 'štítok správcovi: pilot', public.stranka_rezim_moj((select id from f)) = 'pilot';
insert into t select 'opakované uplatnenie toho istého = ok', public.kod_uplatni((select id from f), (select kod from k where druh = 'pilot')) = 'pilot';
insert into t select 'použitý kód už neplatí', not public.kod_over((select kod from k where druh = 'pilot'));
do $$ begin
  perform public.kod_uplatni((select id from f), (select kod from k where druh = 'test'));
  insert into t values ('druhý kód na tú istú stránku odmietne', false);
exception when others then insert into t values ('druhý kód na tú istú stránku odmietne', sqlerrm = 'Stránka už má kód.');
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000158e01', false);
insert into t select 'cudzí štítok nevidí', public.stranka_rezim_moj((select id from f)) is null;
do $$ begin
  perform public.kod_uplatni((select id from f), (select kod from k where druh = 'test'));
  insert into t values ('cudzí kód na moju stránku nepripne', false);
exception when others then insert into t values ('cudzí kód na moju stránku nepripne', sqlerrm = 'nie_spravca');
end $$;
create temp table g as select public.zaloz_farnost('Farnosť test 158', 'Nitra', 'RKC', 'Kostol') as id;
grant all on g to public;
do $$ begin
  perform public.kod_uplatni((select id from g), (select kod from k where druh = 'pilot'));
  insert into t values ('použitý kód na inú stránku odmietne', false);
exception when others then insert into t values ('použitý kód na inú stránku odmietne', sqlerrm = 'Kód už bol použitý.');
end $$;
do $$ begin
  perform public.kod_uplatni((select id from g), 'ZZZZ-ZZZZ');
  insert into t values ('neexistujúci kód odmietne', false);
exception when others then insert into t values ('neexistujúci kód odmietne', sqlerrm = 'Kód neplatí.');
end $$;
insert into t select 'testovací kód → test', public.kod_uplatni((select id from g), (select kod from k where druh = 'test')) = 'test';

-- tím DEED: zoznam a oprava omylu
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000158a01', false);
insert into t select 'zoznam: pilot s farnosťou a menom', exists (select 1 from jsonb_array_elements(public.kod_zoznam()) e
  where e->>'druh' = 'pilot' and e->>'nazov' = 'Farnosť ECAV 158' and e->>'komu' = 'Evanjelický farár' and e->>'pouzity' is not null);
insert into t select 'zoznam: nepoužitý kód bez stránky', exists (select 1 from jsonb_array_elements(public.kod_zoznam()) e where e->>'komu' is null and e->>'stranka' is null);
insert into t select 'oprava omylu: test → pilot', public.stranka_rezim_nastav((select id from g), 'pilot') = 'pilot';
insert into t select 'po oprave štítok pilot', public.stranka_rezim_moj((select id from g)) = 'pilot';
reset role;

-- po ostrom štarte (kódy vypnuté): kódy nič nerobia, štítok nikde, nová stránka bez režimu
update public.ledger_prepinac set zapnute = false where kluc = 'pristupove_kody';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000158f01', false);
insert into t select 'vypnuté: kód neplatí', not public.kod_over((select kod from k where druh = 'test2'));
insert into t select 'vypnuté: štítok nie je', public.stranka_rezim_moj((select id from f)) is null;
create temp table h as select public.zaloz_farnost('Farnosť ostrá 158', 'Žilina', 'RKC', 'Kostol') as id;
reset role;
insert into t select 'vypnuté: nová stránka bez režimu', not exists (select 1 from public.stranka_rezim where stranka = (select id from h));

select ok, c from t order by ok, c;
rollback;
