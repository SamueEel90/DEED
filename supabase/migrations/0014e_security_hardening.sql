-- ============================================================
-- DEED · Payment Engine — bezpečnostné dotiahnutie   [Fáza 2]
-- · views ako security_invoker (rešpektuj RLS volajúceho; pri TEST-ONLY = bez
--   rozdielu, ale rieši advisor ERROR security_definer_view).
-- · trigger fn: zafixuj search_path (advisor WARN function_search_path_mutable).
-- POZN.: TEST-ONLY RLS na tabuľkách a SECURITY DEFINER na platba_create/
--        platba_batch_close sú ZÁMERNÉ (zápisová cesta + demo batch) — riešia sa
--        v produkčnej Fáze 5 (owner-only RLS, revoke anon na batch_close).
-- ============================================================
alter view public.v_vypis    set (security_invoker = true);
alter view public.v_zostatok set (security_invoker = true);

alter function public.platba_do_podpory() set search_path = public;
