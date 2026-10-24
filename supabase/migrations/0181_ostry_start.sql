-- ============================================================
-- 0181 · Kontrola 24. 10. · R2 + R3 — ostrý štart na jednom mieste + kontrola, že každá testovacia poistka drží
-- ------------------------------------------------------------
-- Doteraz: prepínač testovacia_pokladna čítalo 8 rôznych funkcií, otp/kyc/kyb mali vlastné prepínače a stránky
-- so stranka.testovacia = true (a firmy so stav_registracie 'testovaci') púšťali kohokoľvek ako správcu bez ohľadu
-- na prepínač. Zabudnutý krok = testovacie správanie naostro.
-- Teraz: ostry_start() — JEDEN krok (volá len server / Samuel v SQL editore):
--   1. ledger_prepinac testovacia_pokladna = false (štartovací kredit, dobitie, testovacie platby, dev overenie účtu,
--      zapečatenie bez overeného účtu … — všetko, čo prepínač číta)
--   2. server_prepinac otp_mock / kyc_mock / kyb_mock = false (kód SMS sa nevracia, KYC/KYB bez vendora = chyba)
--   3. stranka.testovacia = false pre všetky stránky (testovaci_spravca, konam_za_stranku, dorovnania_testovacie,
--      dorovnanie_ciel_pridaj, 0079 zapečatenie bez overenia — už nepustia)
--   4. firmy so stav_registracie 'testovaci' → 'hotovo' (konam_za_firmu = ktokoľvek — už nie)
--   5. správcovské väzby vytvorené testermi (statutar.opravnenie = 'testovaci') sa zrušia
--   Vráti správu: čo prepol, koľko stránok / firiem / väzieb, a zoznam zápisových politík „using (true)" pre appku
--   (má byť prázdny). Výmaz testovacích peňazí (zmaz_testovacie, 0157) a stránok (prístupové kódy, 0158) sú
--   samostatné kroky checklistu — tie ostry_start nerobí.
-- Test ostry_start_test.sql prejde každú poistku po ostrom štarte. Spúšťa sa po 0180. Idempotentné.
-- ============================================================
begin;

create or replace function public.ostry_start() returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare n_stranky int; n_firmy int; n_vazby int; v_politiky jsonb;
begin
  if public.zapis_klienta() then raise exception 'len_server' using errcode = '42501'; end if;
  update public.ledger_prepinac set zapnute = false where kluc = 'testovacia_pokladna';
  update public.server_prepinac set zapnute = false where kluc in ('otp_mock', 'kyc_mock', 'kyb_mock');
  update public.stranka set testovacia = false where testovacia;
  get diagnostics n_stranky = row_count;
  update public.ucet set stav_registracie = 'hotovo' where typ = 'firma' and stav_registracie = 'testovaci';
  get diagnostics n_firmy = row_count;
  delete from public.statutar where opravnenie = 'testovaci';
  get diagnostics n_vazby = row_count;
  -- zápisové politiky pre appku bez podmienky — po ostrom štarte nemá byť žiadna
  select coalesce(jsonb_agg(jsonb_build_object('tabulka', tablename, 'politika', policyname, 'cmd', cmd)), '[]'::jsonb) into v_politiky
    from pg_policies
   where schemaname = 'public' and cmd <> 'SELECT'
     and (qual = 'true' or with_check = 'true')
     and (roles::text like '%anon%' or roles::text like '%authenticated%');
  return jsonb_build_object(
    'testovacia_pokladna', false, 'otp_mock', false, 'kyc_mock', false, 'kyb_mock', false,
    'stranky_z_testovacich', n_stranky, 'firmy_z_testovacich', n_firmy, 'zrusene_testovacie_vazby', n_vazby,
    'je_testovaci', public.je_testovaci(),
    'otvorene_zapisove_politiky', v_politiky);
end $$;
revoke all on function public.ostry_start() from public, anon, authenticated;
grant execute on function public.ostry_start() to service_role;

commit;
