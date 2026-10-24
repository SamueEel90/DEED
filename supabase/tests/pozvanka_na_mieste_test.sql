-- ============================================================
-- Test 0167 — pozvánka „Je pri vás“ (QR na mieste, mení sa každých 15 s): sken viaže pozvánku na účet,
-- starý/cudzí token neplatí, viazanú pozvánku iný účet neprijme, práva až po Prijať, po čase vyprší.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000167f01', 'statutar@test.sk'), ('7e57c000-0000-0000-0000-000000167a01', 'Jana@Test.sk'),
  ('7e57c000-0000-0000-0000-000000167b01', 'iny@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000167f01','7e57c000-0000-0000-0000-000000167f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000167a01','7e57c000-0000-0000-0000-000000167a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000167b01','7e57c000-0000-0000-0000-000000167b01','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000167a01', 'Jana', 'Kováčová');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t167-ch','7e57c100-0000-0000-0000-000000167f01','charita','Pevný bod 167',false);
insert into public.nastavenia_stranky (stranka, data) values ('t167-ch', ('{"ludia":[{"id":1,"n":"","k":"","r":"Pracovník","p":"referentka","prava":["obsah"],"caka":"miesto","tajne":"abc123","od":{"meno":"Mária H.","f":"štatutárka"},"dos":'
  || ((extract(epoch from now()) * 1000)::bigint + 600000) || '},{"id":2,"n":"","k":"","r":"Pracovník","caka":"miesto","tajne":"zzz","dos":1}]}')::jsonb);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create function pg_temp.skus(p_sql text) returns text language plpgsql as $$ declare r text; begin execute p_sql into r; return coalesce(r, 'ok'); exception when others then return sqlerrm; end $$;
grant execute on function pg_temp.skus(text) to public;   -- 0189: nové funkcie už nie sú automaticky volateľné, test ju volá aj pod rolou appky
-- tokeny počíta test ako server (postgres)
create temp table tok as select public.pozvanka_token('abc123', floor(extract(epoch from now()) / 15)::bigint) teraz,
  public.pozvanka_token('abc123', floor(extract(epoch from now()) / 15)::bigint - 1) pred,
  public.pozvanka_token('abc123', floor(extract(epoch from now()) / 15)::bigint - 3) stary,
  public.pozvanka_token('zzz', floor(extract(epoch from now()) / 15)::bigint) vyprs;
grant select on tok to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000167a01', false);
insert into t select 'starý token (45 s) neplatí', pg_temp.skus(format('select public.pozvanka_miesto(%L, %L, %L)::text', 't167-ch', '1', (select stary from tok))) = 'qr_neplatny';
insert into t select 'vymyslený token neplatí', pg_temp.skus($$select public.pozvanka_miesto('t167-ch', '1', 'abcdef0123')::text$$) = 'qr_neplatny';
insert into t select 'vypršaná relácia', pg_temp.skus(format('select public.pozvanka_miesto(%L, %L, %L)::text', 't167-ch', '2', (select vyprs from tok))) = 'vyprsala';
insert into t select 'token predchádzajúcich 15 s platí · ukáže kto pridáva a práva',
  (select (r->>'stav') = 'caka' and r->'od'->>'meno' = 'Mária H.' and r->'prava' = '["obsah"]'::jsonb and r->>'nazov' = 'Pevný bod 167'
     from (select public.pozvanka_miesto('t167-ch', '1', (select pred from tok)) r) x);
insert into t select 'pred prijatím bez práv', not public.spravujem_stranku('t167-ch');

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000167b01', false);
insert into t select 'iný účet viazanú pozvánku nevidí', pg_temp.skus(format('select public.pozvanka_miesto(%L, %L, %L)::text', 't167-ch', '1', (select teraz from tok))) = 'pozvanka_neplati';
insert into t select 'iný účet ju neprijme', pg_temp.skus($$select public.pozvanka_odpoved('t167-ch', '1', true)$$) = 'pozvanka_neplati';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000167a01', false);
insert into t select 'Jana podrží Prijať', public.pozvanka_odpoved('t167-ch', '1', true) = 'prijal';
insert into t select 'po prijatí spravuje stránku', public.spravujem_stranku('t167-ch');
reset role;
insert into t select 'v zozname: jej e-mail, meno z profilu, prijal, bez tajomstva',
  (select x->>'k' = 'jana@test.sk' and x->>'m' = 'Jana Kováčová' and x->'caka' = 'false'::jsonb and x ? 'prijal' and not x ? 'tajne'
     from public.nastavenia_stranky n, jsonb_array_elements(n.data->'ludia') x where n.stranka = 't167-ch' and x->>'id' = '1');
insert into t select 'appka nevolá pomocné funkcie', not has_function_privilege('authenticated', 'public.pozvanka_token(text, bigint)', 'execute');

select ok, c from t order by ok, c;
rollback;
