-- ============================================================
-- DEED · Nová zbierka charity (KARTA 37 · OPRAVY 114)
-- ------------------------------------------------------------
-- 1) Rozpísaná zbierka (koncept) sa ukladá automaticky do účtu stránky:
--    profil_stranky.koncept_zbierky (jsonb) + čas.
-- 2) Spustená zbierka ide do tabuľky zbierka (migrácia 0021) s väzbou na stránku
--    a so zapečatenými údajmi: stranka, nastavenie (jsonb — názov, text, fotky, dĺžka,
--    suma, účet, rýchle sumy, EURC, pravidelná podpora, účel, lehota), zapecatena (čas).
-- Zapečatené údaje sa po spustení nemenia (ani charita, ani DEED+). Fotky a video áno.
-- TODO (Samuel): fotky sú zatiaľ data-URL v jsonb — presunúť do Storage (bucket prispevky, 0020).
-- Idempotentné.
-- ============================================================
alter table public.profil_stranky add column if not exists koncept_zbierky jsonb;
alter table public.profil_stranky add column if not exists koncept_zbierky_cas timestamptz;

alter table public.zbierka add column if not exists stranka text;
alter table public.zbierka add column if not exists nastavenie jsonb;
alter table public.zbierka add column if not exists zapecatena timestamptz;
create index if not exists zbierka_stranka_idx on public.zbierka(stranka, vytvorene desc);
