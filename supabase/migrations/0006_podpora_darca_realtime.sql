-- DEED · Rekonštrukcia chýbajúcej 0006 (pôvodne aplikovaná len priamo do DB, v repe nebola).
-- · podpora.darca_nazov — denormalizovaný darca (0007 seed, 0014 trigger, top.supabase.ts)
-- · notifikacia v publikácii supabase_realtime (useNotifikacieRealtime / hooks.ts)

alter table public.podpora add column if not exists darca_nazov text;

alter publication supabase_realtime add table public.notifikacia;
