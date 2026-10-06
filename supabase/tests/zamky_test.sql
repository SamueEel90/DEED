-- ============================================================
-- Test zámkov (Zadanie 4) — cron funkcie, RLS, PIN, TOTP. Beží v transakcii s ROLLBACK.
-- Výsledok: ok | kontrola; všetky riadky musia mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57a000-0000-0000-0000-0000000000e1'), ('7e57a000-0000-0000-0000-0000000000e2');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e570000-0000-0000-0000-0000000000e1','7e57a000-0000-0000-0000-0000000000e1','aktivny','hotovo'),
 ('7e570000-0000-0000-0000-0000000000e2','7e57a000-0000-0000-0000-0000000000e2','aktivny','hotovo');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- ---------- 4.2 · cron funkcie zvonka nie ----------
insert into t select '4.2 anon/authenticated nevolaju cron: ' || f,
  not has_function_privilege('anon', f, 'execute') and not has_function_privilege('authenticated', f, 'execute')
  from unnest(array['public.platba_batch_close(timestamptz)', 'public.recurring_tick()', 'public.badge_auto_unbind()', 'public.dorovnania_obnov()']) f;

-- recurring_tick dobehne zameškané obdobia, každé raz; ukončená zbierka sa nestrhne
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, ciel) values
 ('20000000-0000-0000-0000-0000000000e1','charity','charita','Beží','7e570000-0000-0000-0000-0000000000e2', 1000),
 ('20000000-0000-0000-0000-0000000000e2','charity','charita','Skončila','7e570000-0000-0000-0000-0000000000e2', 1000);
update public.prispevok set ukoncene = true where id = '20000000-0000-0000-0000-0000000000e2';
insert into public.opakovana_platba (id, rozsah, case_id, darca, suma, mena, perioda, viazane_na_zbierku, stav, dalsia_platba) values
 ('7e5e0000-0000-0000-0000-0000000000a1','request','20000000-0000-0000-0000-0000000000e1','7e570000-0000-0000-0000-0000000000e1', 2, 'DEED','tyzdenne', true, 'aktivny', now() - interval '20 days'),
 ('7e5e0000-0000-0000-0000-0000000000a2','request','20000000-0000-0000-0000-0000000000e2','7e570000-0000-0000-0000-0000000000e1', 2, 'DEED','tyzdenne', true, 'aktivny', now() - interval '1 day');
-- (opakovana_platba na skončenej zbierke ostala aktívna len preto, že ju test vložil priamo)
select public.recurring_tick();
select public.recurring_tick();     -- druhý beh nič nezopakuje
insert into t select '4.2 dobehnute 3 zameskane obdobia, raz', (select count(*) from platba where meta->>'recurring' = '7e5e0000-0000-0000-0000-0000000000a1') = 3
  and (select dalsia_platba > now() from opakovana_platba where id = '7e5e0000-0000-0000-0000-0000000000a1');
insert into t select '4.2 skoncena zbierka sa nestrhne', not exists (select 1 from platba where meta->>'recurring' = '7e5e0000-0000-0000-0000-0000000000a2')
  and (select stav from opakovana_platba where id = '7e5e0000-0000-0000-0000-0000000000a2') = 'ukonceny';

-- ---------- 4.3 · RLS ----------
insert into t select '4.3 ziadna test_all_access', not exists (select 1 from pg_policies where policyname = 'test_all_access');
update public.ucet set telefon = '+421900000001' where id = '7e570000-0000-0000-0000-0000000000e2';
insert into public.lokalita (ucet_id, region, mesto, lat, lng) values ('7e570000-0000-0000-0000-0000000000e2', 'TN', 'Trenčín', 48.89, 18.04);
insert into public.organizacia (ucet_id, nazov, bankovy_ucet) values ('7e570000-0000-0000-0000-0000000000e2', 'Cudzia o.z.', 'SK0000000000000000000001');
-- anonym (anon kľúč, bez prihlásenia)
set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into t select '4.3 anon necita ucet', not exists (select 1 from public.ucet);
insert into t select '4.3 anon necita lokalitu', not exists (select 1 from public.lokalita);
insert into t select '4.3 anon necita IBAN', not exists (select 1 from public.organizacia);
insert into t select '4.3 anon necita platby', not exists (select 1 from public.platba);
insert into t select '4.3 anon cita verejne prispevky', exists (select 1 from public.prispevok where id = '20000000-0000-0000-0000-0000000000e1');
do $$ begin
  update public.prispevok set titul = 'X' where id = '20000000-0000-0000-0000-0000000000e1';
  insert into t select '4.3 anon nezmeni prispevok', (select titul from public.prispevok where id = '20000000-0000-0000-0000-0000000000e1') = 'Beží';
exception when others then insert into t values ('4.3 anon nezmeni prispevok', true); end $$;
do $$ begin perform public.zaloz_stranku('cudzia-charita', 'charita', 'Cudzia');
  insert into t values ('4.3 anon nezalozi stranku', false);
exception when others then insert into t values ('4.3 anon nezalozi stranku', true); end $$;
do $$ begin perform public.recurring_tick();
  insert into t values ('4.3 anon nezavola cron', false);
exception when insufficient_privilege then insert into t values ('4.3 anon nezavola cron', true); end $$;
reset role;
-- prihlásený A (neoverený, cudzí obsah)
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e1', false);
insert into t select '4.3 A vidi len svoj ucet', (select count(*) from public.ucet where typ <> 'system') = 1
  and exists (select 1 from public.ucet where id = '7e570000-0000-0000-0000-0000000000e1');
insert into t select '4.3 A necita telefon B', not exists (select 1 from public.ucet where telefon = '+421900000001');
insert into t select '4.3 A necita GPS ani IBAN B', not exists (select 1 from public.lokalita) and not exists (select 1 from public.organizacia);
insert into t select '4.3 A nevidi platby B', not exists (select 1 from public.platba where odosielatel <> '7e570000-0000-0000-0000-0000000000e1');
update public.prispevok set titul = 'Ukradnuté' where id = '20000000-0000-0000-0000-0000000000e1';
do $$ begin perform public.zaloz_stranku('moja-nova', 'charita', 'Nová');
  insert into t values ('4.3 neovereny ucet nezalozi stranku', false);
exception when sqlstate '42501' then insert into t values ('4.3 neovereny ucet nezalozi stranku', true); end $$;
do $$ begin insert into public.stranka (id, ucet_id, typ, nazov) values ('obsadena', '7e570000-0000-0000-0000-0000000000e2', 'charita', 'Cudzia');
  insert into t values ('4.3 stranka sa neda vlozit priamo', false);
exception when others then insert into t values ('4.3 stranka sa neda vlozit priamo', true); end $$;
do $$ begin insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('7e570000-0000-0000-0000-0000000000e2', '7e570000-0000-0000-0000-0000000000e1', 'ja');
  insert into t values ('4.3 A sa neprida za statutara cudzej org', false);
exception when others then insert into t values ('4.3 A sa neprida za statutara cudzej org', true); end $$;
do $$ begin insert into public.balik (org_ucet_id, plan) values ((select (public.zaloz_organizaciu('charita')).id), 'premium');
  insert into t values ('4.3 platený balík si appka nezapíše', false);
exception when others then insert into t values ('4.3 platený balík si appka nezapíše', true); end $$;
select (public.zaloz_organizaciu('charita')).id is not null;
insert into t select '4.3 zaloz_organizaciu: som spravca', exists (select 1 from public.statutar where osoba_ucet_id = '7e570000-0000-0000-0000-0000000000e1');
insert into t select '4.3 v_zostatok len moj (invoker)', (select count(*) from public.v_zostatok) = 1;
reset role;
insert into t select '4.3 A nezmenil cudzi prispevok', (select titul from public.prispevok where id = '20000000-0000-0000-0000-0000000000e1') = 'Beží';
insert into t select '4.3 v_zostatok a v_vypis su security_invoker',
  (select bool_and(coalesce(reloptions::text like '%security_invoker=true%', false)) from pg_class where relname in ('v_zostatok', 'v_vypis'));
-- overený účet si stránku založí
update public.ucet set stav_registracie = 'hotovo', email_overeny = true where id = '7e570000-0000-0000-0000-0000000000e1';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e1', false);
select (public.zaloz_stranku('overena-nova', 'charita', 'Nová')).id = 'overena-nova';
reset role;
insert into t select '4.3 overeny ucet zalozi stranku sebe', exists (select 1 from public.stranka s join public.statutar st on st.org_ucet_id = s.ucet_id
  where s.id = 'overena-nova' and st.osoba_ucet_id = '7e570000-0000-0000-0000-0000000000e1');

-- ---------- 4.4 · PIN a GPS ----------
update public.prispevok set lat = 48.894567, lng = 18.044321 where id = '20000000-0000-0000-0000-0000000000e1';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e1', false);
select public.nastav_zabezpecenie('4821', false);
do $$ begin perform pin_hash from public.ucet limit 1;
  insert into t values ('4.4 pin_hash sa z klienta neda SELECT-nut', false);
exception when insufficient_privilege then insert into t values ('4.4 pin_hash sa z klienta neda SELECT-nut', true); end $$;
do $$ begin update public.ucet set pin_hash = 'x' where id = '7e570000-0000-0000-0000-0000000000e1';
  insert into t values ('4.4 pin_hash sa z klienta neda zapisat', false);
exception when insufficient_privilege then insert into t values ('4.4 pin_hash sa z klienta neda zapisat', true); end $$;
insert into t select '4.4 spravny PIN prejde', public.over_pin('4821');
insert into t select '4.4 zly PIN neprejde', not public.over_pin('0000');
do $$ begin perform lat from public.prispevok limit 1;
  insert into t values ('4.4 presne GPS z prispevok nie', false);
exception when insufficient_privilege then insert into t values ('4.4 presne GPS z prispevok nie', true); end $$;
insert into t select '4.4 feed vracia polohu zaokruhlenu', lat = 48.89 and lng = 18.04 from public.prispevok_feed where id = '20000000-0000-0000-0000-0000000000e1';
do $$ declare i int; begin
  for i in 1..5 loop perform public.over_pin('1111'); end loop;
  perform public.over_pin('4821');
  insert into t values ('4.4 po 5 zlych pokusoch zamok', false);
exception when sqlstate '54000' then insert into t values ('4.4 po 5 zlych pokusoch zamok', true); end $$;
reset role;
insert into t select '4.4 pin je bcrypt', pin_hash like '$2%' from public.ucet where id = '7e570000-0000-0000-0000-0000000000e1';

-- ---------- 4.5 · TOTP a odznaky ----------
insert into auth.users (id) values ('7e57a000-0000-0000-0000-0000000000e3');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e570000-0000-0000-0000-0000000000e3','7e57a000-0000-0000-0000-0000000000e3','aktivny','hotovo');
create temp table tok(k text primary key, v text);
grant all on tok to public;
-- organizátor e2 založí akciu a uloží polohu
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e2', false);
select public.event_secret_create('7e5e0000-0000-0000-0000-0000000000f1', 15, 'threshold', 'Brigáda');
select public.event_poloha('7e5e0000-0000-0000-0000-0000000000f1', 48.8945, 18.0443);
insert into tok select 'org', public.event_token('7e5e0000-0000-0000-0000-0000000000f1');
-- účastník e1 kód na diaľku nedostane a cudziu akciu neprevezme
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e1', false);
do $$ begin perform public.event_token('7e5e0000-0000-0000-0000-0000000000f1');
  insert into t values ('4.5 ucastnik nezíska kod na dialku', false);
exception when sqlstate '42501' then insert into t values ('4.5 ucastnik nezíska kod na dialku', true); end $$;
do $$ begin perform public.event_secret_create('7e5e0000-0000-0000-0000-0000000000f1', 15, 'threshold', 'Moja');
  insert into t values ('4.5 event_secret_create len vlastnik', false);
exception when sqlstate '42501' then insert into t values ('4.5 event_secret_create len vlastnik', true); end $$;
-- sken z diaľky (Bratislava) = out_of_radius; bez GPS tiež
insert into t select '4.5 sken mimo polomeru = out_of_radius', public.scan_validate((select v from tok where k = 'org'), 48.1486, 17.1077)->>'vysledok' = 'out_of_radius';
insert into t select '4.5 sken bez GPS = out_of_radius', public.scan_validate((select v from tok where k = 'org'), null, null)->>'vysledok' = 'out_of_radius';
insert into t select '4.5 sken na mieste = ok', public.scan_validate((select v from tok where k = 'org'), 48.8946, 18.0444)->>'vysledok' = 'ok';
insert into t select '4.5 druhy sken v tom istom okne = replay (zariadenie = ucet)', public.scan_validate((select v from tok where k = 'org'), 48.8946, 18.0444)->>'vysledok' = 'replay';
-- e3 príde neskoro
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e3', false);
select public.scan_validate((select v from tok where k = 'org'), 48.8946, 18.0444)->>'vysledok';
reset role;
insert into t select '4.5 sken sam nesplni', not splneny from public.dochadzka where user_id = '7e570000-0000-0000-0000-0000000000e1';
-- akcia trvala 2 h; e1 prišiel na začiatku, e3 hodinu a pol po štarte (25 % < prah 60 %)
update public.event_secret set zaciatok = now() - interval '2 hours' where event_id = '7e5e0000-0000-0000-0000-0000000000f1';
update public.dochadzka set prichod = now() - interval '2 hours' where user_id = '7e570000-0000-0000-0000-0000000000e1';
update public.dochadzka set prichod = now() - interval '30 minutes' where user_id = '7e570000-0000-0000-0000-0000000000e3';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e1', false);
do $$ begin perform public.event_ukonci('7e5e0000-0000-0000-0000-0000000000f1');
  insert into t values ('4.5 ukoncit moze len organizator', false);
exception when sqlstate '42501' then insert into t values ('4.5 ukoncit moze len organizator', true); end $$;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e2', false);
select public.event_ukonci('7e5e0000-0000-0000-0000-0000000000f1');
reset role;
insert into t select '4.5 splnene podla prah_pct', (select splneny from public.dochadzka where user_id = '7e570000-0000-0000-0000-0000000000e1')
  and not (select splneny from public.dochadzka where user_id = '7e570000-0000-0000-0000-0000000000e3');
-- odznak: na zmenu len potvrdený zamestnanec; agregát len k >= 5
insert into public.odznak (id, org_ucet_id, nazov, slug) values ('7e5e0000-0000-0000-0000-0000000000b1', 'f1000000-0000-4000-8000-000000000001', 'Pult', 'test-odznak-1');
insert into public.pochvala (badge_id, employee_id) select '7e5e0000-0000-0000-0000-0000000000b1', '7e570000-0000-0000-0000-0000000000e1' from generate_series(1, 5);
insert into public.pochvala (badge_id, employee_id) select '7e5e0000-0000-0000-0000-0000000000b1', '7e570000-0000-0000-0000-0000000000e3' from generate_series(1, 2);
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('f1000000-0000-4000-8000-000000000001', '7e570000-0000-0000-0000-0000000000e2', 'test');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e3', false);
do $$ begin perform public.badge_bind('7e5e0000-0000-0000-0000-0000000000b1', 8);
  insert into t values ('4.5 badge_bind len zamestnanec', false);
exception when sqlstate '42501' then insert into t values ('4.5 badge_bind len zamestnanec', true); end $$;
select set_config('request.jwt.claim.sub', '7e57a000-0000-0000-0000-0000000000e2', false);
insert into t select '4.5 badge_aggregate k >= 5', (select count(*) from public.badge_aggregate('f1000000-0000-4000-8000-000000000001')) = 1
  and (select min(pochval) from public.badge_aggregate('f1000000-0000-4000-8000-000000000001')) >= 5;
reset role;

-- ---------- security definer pohľady: len verejné stĺpce ----------
insert into public.profil_stranky (stranka, centralna) values ('svetlo', '{"popis":"x","ucet":"SK0000000000000000000099"}')
  on conflict (stranka) do update set centralna = excluded.centralna;
set role anon;
insert into t select 'verejny profil stranky bez IBAN', not exists (select 1 from public.profil_stranky_verejny where centralna ? 'ucet');
insert into t select 'feed bez presneho GPS', not exists (select 1 from public.prispevok_feed where lat is not null and lat <> round(lat::numeric, 2)::double precision);
reset role;

-- ---------- 5.4 · feed po stránkach, 5.7 · feed ako stĺpec ----------
insert into public.prispevok (modul, typ, titul, autor_ucet_id, lat, lng, vytvorene)
  select 'good', 'skutok', 'Strana ' || g, '7e570000-0000-0000-0000-0000000000e1', 48.894567, 18.044321, now() - make_interval(mins => g)
    from generate_series(1, 70) g;
set role anon;
create temp table st1 as select * from public.feed_stranka('domov', 48.894, 18.044, 5);
insert into t select '5.4 prva stranka najviac 50', (select count(*) from st1) = 50;
insert into t select '5.4 druha stranka bez prekryvu', not exists (
  select 1 from public.feed_stranka('domov', 48.894, 18.044, 5, (select min(vytvorene) from st1), (select id from st1 order by vytvorene, id limit 1)) x
   where x.id in (select id from st1));
insert into t select '5.4 okruh v SQL (Bratislava nevidi Trencin)', not exists (select 1 from public.feed_stranka('domov', 48.1486, 17.1077, 5) where titul like 'Strana %');
insert into t select '5.4 bez presneho GPS', not exists (select 1 from st1 where lat <> round(lat::numeric, 2)::double precision);
insert into t select '5.4 limit sa neda zvysit', (select count(*) from public.feed_stranka('domov', null, null, null, null, null, 1000)) <= 50;
reset role;
insert into t select '5.7 feed je stlpec s constraintom', exists (select 1 from pg_constraint where conname = 'prispevok_feed_check');

-- ---------- 5.5 · fotky do Storage ----------
do $$ begin
  insert into public.oznam_charity (id, stranka, druh, data, zverejnene) values ('test-oznam-foto', 'svetlo', 'oznam', '{"plagat":"data:image/jpeg;base64,AAAA"}', now());
  insert into t values ('5.5 oznam s data URL odmietnuty', false);
exception when sqlstate '22023' then insert into t values ('5.5 oznam s data URL odmietnuty', true); end $$;
insert into public.oznam_charity (id, stranka, druh, data, zverejnene) values ('test-oznam-url', 'svetlo', 'oznam', '{"plagat":"https://x.supabase.co/storage/v1/object/public/prispevky/u/oznamy/a.jpg"}', now());
insert into t select '5.5 oznam s URL prejde', exists (select 1 from public.oznam_charity where id = 'test-oznam-url');
do $$ begin
  update public.profil_stranky set centralna = '{"media":[{"src":"data:image/png;base64,BBBB"}]}' where stranka = 'svetlo';
  insert into t values ('5.5 profil stranky bez data URL', false);
exception when sqlstate '22023' then insert into t values ('5.5 profil stranky bez data URL', true); end $$;

select ok, c from t order by ok, c;
rollback;
