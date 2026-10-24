-- ============================================================
-- 0189 · Kontrola 24. 10. · oprava 15 — práva na funkcie: z appky len to, čo má výslovné povolenie
-- ------------------------------------------------------------
-- Nález (Paľo, 24. 10.): na Supabase je každá nová funkcia automaticky volateľná rolami anon aj authenticated
-- (predvolené práva schémy public) a navyše Postgres dáva EXECUTE roli PUBLIC. Staršie migrácie zamykali len
-- „revoke … from public“ — to automatické práva anon / authenticated neodoberie. Dôsledok: interné funkcie
-- (dorovnanie_financuj, dorovnanie_presun, notifikuj_ucet, upozorni_farnost, vyplata_oznam, …) mohol volať ktokoľvek.
-- Teraz:
--   1. predvolené práva: nová funkcia v public už NIE JE automaticky volateľná z appky (anon, authenticated, PUBLIC)
--   2. tabuľka api_funkcie = jediný zoznam funkcií, ktoré appka smie volať (anon / authenticated) — zostavený
--      z výslovných GRANT v migráciách 0001–0188 (205 funkcií; appka ich volá 155, zvyšok sú staršie verejné RPC)
--   3. každej funkcii v public sa odoberie EXECUTE pre PUBLIC; anon a authenticated ostanú len tým z api_funkcie
--   4. service_role (server, cron) bez zmeny
-- Pravidlo pre kóderov (do registra): nová funkcia pre appku = riadok v api_funkcie + grant execute; inak appka
-- dostane „permission denied“. Test api_prava_test.sql to stráži.
-- Po nasadení (Samuel): dotaz z opravy_15_odovzdanie.md — predvolené práva sa menia len pre rolu, ktorá migráciu spustila.
-- Spúšťa sa po 0188. Idempotentné.
-- ============================================================
begin;

-- ---------- 1 · predvolené práva pre nové funkcie ----------
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------- 2 · zoznam funkcií pre appku ----------
create table if not exists public.api_funkcie (
  funkcia        text primary key,
  anon           boolean not null default false,    -- smie volať aj neprihlásený
  authenticated  boolean not null default true,     -- smie volať prihlásený
  pridane        timestamptz not null default now()
);
comment on table public.api_funkcie is 'Funkcie, ktoré appka smie volať (0189). Nová funkcia pre appku = riadok tu + grant execute. Stráži api_prava_test.sql.';
alter table public.api_funkcie enable row level security;   -- appka ju nečíta
insert into public.api_funkcie (funkcia, anon, authenticated) values
  ('akcia_info', true, true),
  ('akcia_info_rez', true, true),
  ('akcia_odober', false, true),
  ('akcia_pridaj_skenom', false, true),
  ('akcia_pripoj', false, true),
  ('akcia_pripoj_rez', false, true),
  ('akcia_rezervuj', true, true),
  ('akcia_ucastnici', false, true),
  ('aktivita_podpora', false, true),
  ('badge_aggregate', false, true),
  ('badge_bind', false, true),
  ('badge_create', false, true),
  ('badge_scan', false, true),
  ('badge_unbind', false, true),
  ('chain_create', false, true),
  ('clovek_overeny', true, true),
  ('deti_pocty', true, true),
  ('deti_prihlas', false, true),
  ('dev_over_ucet', false, true),
  ('dorovnania_nacitaj', true, true),
  ('dorovnania_testovacie', false, true),
  ('dorovnanie_ciel_pridaj', false, true),
  ('dorovnanie_dar', true, true),
  ('dorovnanie_krok', false, true),
  ('dorovnanie_obmedzenie_citaj', true, true),
  ('dorovnanie_obmedzenie_uloz', false, true),
  ('dorovnanie_smie_cislo', true, true),
  ('dorovnanie_zapecat', false, true),
  ('editor_prehlad', false, true),
  ('editor_zapis', false, true),
  ('email_potvrdeny', true, true),
  ('escrow_create', false, true),
  ('escrow_uvolni', false, true),
  ('escrow_vrat', false, true),
  ('event_poloha', false, true),
  ('event_secret_create', false, true),
  ('event_token', false, true),
  ('event_ukonci', false, true),
  ('farnost_podakuj', false, true),
  ('feed_stranka', true, true),
  ('hladaj_osoby', false, true),
  ('iskra_kvota', false, true),
  ('iskra_zverejni', false, true),
  ('kod_over', false, true),
  ('kod_uplatni', false, true),
  ('kod_vytvor', false, true),
  ('kod_zoznam', false, true),
  ('kyb_spusti', false, true),
  ('kyc_spusti', false, true),
  ('mam_pin', false, true),
  ('meno_pomocnika', false, true),
  ('meno_uctu', true, true),
  ('moj_odkaz', false, true),
  ('moj_qr_kod', false, true),
  ('moj_ucet', true, true),
  ('moje_stranky', false, true),
  ('moje_zbierky_prijemcu', false, true),
  ('napis_prihlasenym', false, true),
  ('nastav_bloky', false, true),
  ('nastav_domovsku', false, true),
  ('nastav_farara', false, true),
  ('nastav_moj_kostol', false, true),
  ('nastav_v_rebricku', false, true),
  ('nastav_zabezpecenie', false, true),
  ('nastavenia_zapis', false, true),
  ('obnov_zbierku', false, true),
  ('odf_nahlas', false, true),
  ('odf_reaguj', false, true),
  ('odf_uloz', false, true),
  ('odf_zmaz', false, true),
  ('odpoj_filialku', false, true),
  ('oprav_zbierku', false, true),
  ('organizujem_akciu', false, true),
  ('otp_over', true, true),
  ('otp_posli', true, true),
  ('over_pin', false, true),
  ('ovp_kod', false, true),
  ('ovp_nahlad', true, true),
  ('ovp_otvor', true, true),
  ('ovp_potvrd', false, true),
  ('ovp_stav', false, true),
  ('ovp_suhlas', false, true),
  ('ovp_token', false, true),
  ('ovp_zaloz', false, true),
  ('oznam_darcom', false, true),
  ('oznam_ucast_pocty', true, true),
  ('oznam_ucast_prihlas', false, true),
  ('penazenka_dobit', false, true),
  ('platba_create', false, true),
  ('platba_potvrd_admin', false, true),
  ('plne_prava', false, true),
  ('podpora_firmy_archiv', false, true),
  ('podpora_firmy_pridaj', false, true),
  ('poplatok_nahlad', true, true),
  ('pozvana_stranky', true, true),
  ('pozvanka', false, true),
  ('pozvanka_info', true, true),
  ('pozvanka_miesto', false, true),
  ('pozvanka_odpoved', false, true),
  ('pozvanka_posli', false, true),
  ('pozvanka_prijmi', false, true),
  ('pozvanka_vytvor', false, true),
  ('pozvanky_skutku', false, true),
  ('pravidelna_zapni', false, true),
  ('pravidelna_zrus', false, true),
  ('premenuj_stranku', false, true),
  ('pripoj_filialku', false, true),
  ('prispevok_dary', true, true),
  ('profil_osoby', true, true),
  ('program_stranky', true, true),
  ('qr_prihlasenie_info', false, true),
  ('qr_prihlasenie_potvrd', false, true),
  ('qr_prihlasenie_zrus', false, true),
  ('qr_split_create', false, true),
  ('qr_split_get', true, true),
  ('qr_split_list', false, true),
  ('qr_split_pay', false, true),
  ('reakcia_f', false, true),
  ('recurring_create', false, true),
  ('retaz_bez_tvorcu', true, true),
  ('retaz_dar', true, true),
  ('retaz_darcovia', true, true),
  ('retaz_na_stranke', true, true),
  ('retaz_obnov', true, true),
  ('retaz_oznamy', false, true),
  ('retaz_podporuju', true, true),
  ('retaz_stav', true, true),
  ('retaz_strany', true, true),
  ('retaz_test', false, true),
  ('retaz_ukonci', false, true),
  ('retaz_zapecat', false, true),
  ('retaz_zbierky', true, true),
  ('rozhodni_od_veriacich', false, true),
  ('scan_validate', false, true),
  ('skutky_kde_som_pomahal', false, true),
  ('skutok_dary', true, true),
  ('skutok_pridaj_skenom', false, true),
  ('skutok_zbierka', true, true),
  ('sledujuci_blokov', false, true),
  ('sledujuci_miest', false, true),
  ('sledujuci_stranky', false, true),
  ('smie_v_stranke', false, true),
  ('smie_vlastne_peniaze', false, true),
  ('smiem_spravovat_zbierku', false, true),
  ('som_deed_admin', false, true),
  ('som_farar', false, true),
  ('spravujem_deti', false, true),
  ('spravujem_stranku', true, true),
  ('spravujem_ucet', true, true),
  ('statistiky_farnosti', false, true),
  ('stranka_darcovia', false, true),
  ('stranka_pripravuje', true, true),
  ('stranka_prispela', true, true),
  ('stranka_rezim_moj', false, true),
  ('stranka_rezim_nastav', false, true),
  ('stranka_viditelna', true, true),
  ('stranka_zverejni', false, true),
  ('testovaci_spravca', true, true),
  ('testovacie_dobitie', false, true),
  ('ucet_podla_cisla', false, true),
  ('ucet_stranky', true, true),
  ('ucet_zbierky', true, true),
  ('ukonci_zbierku', false, true),
  ('uloz_push_odber', false, true),
  ('umysel_sprava', false, true),
  ('umysel_zmaz', false, true),
  ('uroven_stranky', false, true),
  ('vazby_zamestnancov', false, true),
  ('vecna_podakuj', false, true),
  ('vecne_dary', true, true),
  ('vecny_dar_zapis', false, true),
  ('vidim_platbu', false, true),
  ('vyzva_stav', false, true),
  ('vyzva_zapis_cin', true, true),
  ('vyzva_zreb', false, true),
  ('zaisti_ucet', true, true),
  ('zaloz_farnost', false, true),
  ('zaloz_filialku', false, true),
  ('zaloz_organizaciu', false, true),
  ('zaloz_stranku', false, true),
  ('zaloz_stranku_organizacie', false, true),
  ('zamestnanec_akcia', false, true),
  ('zapis_overeny_telefon', false, true),
  ('zariadenie_odhlas', false, true),
  ('zariadenie_odhlas_ostatne', false, true),
  ('zbierka_auto_uzavriet', false, true),
  ('zbierka_cez_stranku', true, true),
  ('zbierka_dar', true, true),
  ('zbierka_dar_farnosti', false, true),
  ('zbierka_dar_skutok', true, true),
  ('zbierka_dar_volba', true, true),
  ('zbierka_dary', true, true),
  ('zbierka_ma_podelene', true, true),
  ('zbierka_prispievatelia', true, true),
  ('zbierka_suma_vidim', true, true),
  ('zbierka_vidim_rozdelenie', false, true),
  ('zbierka_vklad_potvrd', false, true),
  ('zbierka_vklad_vlastny', false, true),
  ('zmaz_cakajuci', false, true),
  ('zmen_pin', false, true),
  ('zvoncek_dar', true, true),
  ('zvoncek_okno', true, true),
  ('zvoncek_omse', true, true),
  ('zvoncek_uzavreta', true, true),
  ('zvoncek_zavri_test', false, true)
on conflict (funkcia) do nothing;

-- ---------- 3 · funkcie, ktoré beží sama DB v mene volajúceho (politiky RLS, predvolené hodnoty, obmedzenia,
--                spúšťače bez security definer, pohľady security_invoker, indexy) — tie musia ostať volateľné ----------
create or replace function public.api_funkcie_z_definicii() returns setof text
  language plpgsql stable security definer set search_path = public as $$
declare v_text text := ''; i int;
begin
  select string_agg(coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') || ' ' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), ''), ' ')
    into v_text from pg_policy pol;
  v_text := v_text || ' ' || coalesce((select string_agg(pg_get_expr(d.adbin, d.adrelid), ' ') from pg_attrdef d join pg_class c on c.oid = d.adrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'), '');
  v_text := v_text || ' ' || coalesce((select string_agg(pg_get_constraintdef(c.oid), ' ') from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public' and c.contype = 'c'), '');
  v_text := v_text || ' ' || coalesce((select string_agg(pg_get_indexdef(i.indexrelid), ' ') from pg_index i join pg_class c on c.oid = i.indrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'), '');
  v_text := v_text || ' ' || coalesce((select string_agg(pg_get_viewdef(c.oid), ' ') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'v' and coalesce(array_to_string(c.reloptions, ','), '') like '%security_invoker=true%'), '');
  -- spúšťače bez security definer bežia v mene volajúceho: ich funkcia aj to, čo volajú
  v_text := v_text || ' ' || coalesce((select string_agg(p.proname || '( ' || p.prosrc, ' ') from pg_trigger t join pg_proc p on p.oid = t.tgfoid where not t.tgisinternal and not p.prosecdef), '');
  -- funkcie bez security definer, ktoré sú v tom texte, bežia tiež v mene volajúceho → pridaj ich telá (do ustálenia)
  for i in 1..5 loop
    v_text := v_text || ' ' || coalesce((select string_agg(p.prosrc, ' ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and not p.prosecdef and v_text ~ ('\m' || p.proname || '\s*\(')), '');
  end loop;
  return query select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and v_text ~ ('\m' || p.proname || '\s*\(');
end $$;
revoke all on function public.api_funkcie_z_definicii() from public, anon, authenticated;

-- ---------- 4 · odobrať práva všetkému, čo nie je v zozname ani v definíciách ----------
create or replace function public.api_prava_uprav() returns int
  language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; v_anon boolean; v_auth boolean; v_def text[];
begin
  v_def := array(select public.api_funkcie_z_definicii());
  for r in select p.oid::regprocedure as f, p.proname
             from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.prokind in ('f', 'p') and pg_get_userbyid(p.proowner) = current_user loop
    execute format('revoke execute on function %s from public', r.f);
    if r.proname = any (v_def) then continue; end if;
    select a.anon, a.authenticated into v_anon, v_auth from public.api_funkcie a where a.funkcia = r.proname;
    if not coalesce(v_anon, false) then execute format('revoke execute on function %s from anon', r.f); end if;
    if not coalesce(v_auth, false) then execute format('revoke execute on function %s from authenticated', r.f); end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.api_prava_uprav() from public, anon, authenticated;
select public.api_prava_uprav();

commit;
