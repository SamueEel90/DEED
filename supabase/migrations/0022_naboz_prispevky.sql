-- ============================================================
-- DEED · Náboženstvo — príspevky farnosti v DB  [prenos medzi zariadeniami]
-- ------------------------------------------------------------
-- Príspevky (zbierka/udalosť/oznam/dobrovoľníctvo/parte) doteraz žili len
-- v localStorage (deed.naboz.prispevky.<farnostId>) → na inom zariadení
-- neexistovali. Táto tabuľka je zdieľané úložisko: klient pri otvorení
-- farnosti stiahne DB stav a zrkadlí ho do localStorage (offline fallback),
-- pri publikovaní/úprave/zmazaní zapíše aj do DB (dual-write).
--
-- `data` = celý NabozFeedItem ako jsonb (klientský tvar; štruktúru vlastní
-- frontend — src/features/nabozenstvo/mock.ts). `id` TEXT klientom generované
-- ("naboz-<ts>"), create idempotentný (upsert).
--
-- RLS: obsah farnosti je VEREJNÝ feed → select pre všetkých. Zápisy
-- `to authenticated` (funguje aj pre anonymné konto — anon-auth bootstrap).
-- Update/delete zámerne permisívne (TEST-ONLY ako test_all_access politiky):
-- farár moderuje/maže aj cudzie príspevky a roly zatiaľ v DB nemáme.
-- Sprísnenie príde s ostrým RLS kolom (Vlna 6).
-- ============================================================

create table if not exists public.naboz_prispevok (
  id          text primary key,
  farnost_id  text not null,
  autor       uuid default auth.uid() references auth.users(id) on delete set null,
  data        jsonb not null,
  vytvorene   timestamptz not null default now(),
  upravene    timestamptz not null default now()
);
create index if not exists naboz_prispevok_farnost_idx
  on public.naboz_prispevok(farnost_id, vytvorene desc);

alter table public.naboz_prispevok enable row level security;

drop policy if exists naboz_select_all on public.naboz_prispevok;
create policy naboz_select_all on public.naboz_prispevok
  for select to anon, authenticated using (true);

-- TEST-ONLY permisívne zápisy (viď hlavička) — ostré kolo nahradí owner/rola.
drop policy if exists naboz_write_auth on public.naboz_prispevok;
create policy naboz_write_auth on public.naboz_prispevok
  for all to authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- Ostatný stav farnosti (stav.ts namespace deed.naboz.<oblast>.<id>):
-- profil (kontakt/omše/osoby), viditelnost súm, selfadd konfig, rozvrh…
-- Generické KV zrkadlo — ulozStav zapíše aj sem, sync pri otvorení stiahne.
-- Last-write-wins; oblasti "prispevky"/"dbsync" sem NEJDÚ (vlastná tabuľka).
-- ------------------------------------------------------------
create table if not exists public.naboz_stav (
  oblast     text not null,
  id         text not null,          -- spravidla farnost_id
  data       jsonb not null,
  upravene   timestamptz not null default now(),
  primary key (oblast, id)
);

alter table public.naboz_stav enable row level security;

drop policy if exists naboz_stav_select_all on public.naboz_stav;
create policy naboz_stav_select_all on public.naboz_stav
  for select to anon, authenticated using (true);

-- TEST-ONLY permisívne zápisy (edituje farár; roly zatiaľ v DB nemáme).
drop policy if exists naboz_stav_write_auth on public.naboz_stav;
create policy naboz_stav_write_auth on public.naboz_stav
  for all to authenticated using (true) with check (true);
