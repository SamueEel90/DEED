-- ============================================================
-- 0190 · Kontrola 24. 10. · poistka k oprave 5 — zahodiť skorší názov ucet_overeny(uuid), ak bol na DB nasadený
-- ------------------------------------------------------------
-- Migrácia 0180 mala v prvej verzii funkciu ucet_overeny(uuid) — kolízia s ucet_overeny(uuid, boolean) z 0065 (overenie
-- príjemcu KYC/KYB). Pred zlúčením sa premenovala na clovek_overeny(uuid), ale ak sa 0180 nasadila ešte so starým
-- názvom, duplicitný názov ostal v DB. Nasadená migrácia sa nemení (pravidlo 2) → poistka ako nová migrácia.
-- Na čistej DB nerobí nič. Spúšťa sa po 0189. Idempotentné.
-- ============================================================
begin;
drop function if exists public.ucet_overeny(uuid);
commit;
