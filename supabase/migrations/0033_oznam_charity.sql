-- ============================================================
-- DEED · Oznamy charity (KARTA 40)
-- ------------------------------------------------------------
-- Tri druhy: oznam (profil + sledujúci po 5 min) · verejny (nástenka mesta, akcia ≤ 2 mesiace) · vyzva
-- (súrna pomoc, ≤ 10 dní, aj v Zadarmo). Celý oznam je v data (jsonb): forma, texty, galéria / plagát,
-- dátum, miesto, pozvanie (bez · nezáväzne · záväzne, limit), prihlásení, zrušené, upravené.
-- Verejnosť číta nezrušené oznamy (nástenka, profil). Píše len správca stránky.
-- TODO (Samuel): plagát a fotky sú data-URL — presunúť do Storage; prihlásenie ľudí cez server
-- (oznam_prihlasenie), oznámenie sledujúcim po 5 min, pripomienka deň pred akciou, správa pri zmene / zrušení.
-- Idempotentné.
-- ============================================================
create table if not exists public.oznam_charity (
  id         text primary key,
  stranka    text not null,
  druh       text not null check (druh in ('oznam', 'verejny', 'vyzva')),
  data       jsonb not null,
  zverejnene timestamptz not null default now(),
  zrusene    timestamptz,
  vytvoril   uuid default auth.uid() references auth.users(id) on delete set null
);
create index if not exists oznam_charity_stranka_idx on public.oznam_charity(stranka, zverejnene desc);

alter table public.oznam_charity enable row level security;
drop policy if exists verejne_citat on public.oznam_charity;
create policy verejne_citat on public.oznam_charity for select to anon, authenticated using (zrusene is null or vytvoril = auth.uid());
drop policy if exists spravca_pisat on public.oznam_charity;
create policy spravca_pisat on public.oznam_charity for all to authenticated using (vytvoril = auth.uid()) with check (vytvoril = auth.uid());
