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

select ok, c from t order by ok, c;
rollback;
