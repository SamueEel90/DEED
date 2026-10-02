-- ============================================================
-- DEED · Úvod „Veríme vám" pre charitu (OPRAVY 121)
-- ------------------------------------------------------------
-- Pred prvým skutkom (a prvou zbierkou) charity sa raz ukáže úvod „Veríme vám".
-- Po „Rozumiem" sa uloží čas do účtu stránky a úvod sa už neukáže.
-- uvod = { "skutok": "<čas>", "zbierka": "<čas>" }. Idempotentné.
-- ============================================================
alter table public.profil_stranky add column if not exists uvod jsonb not null default '{}'::jsonb;
