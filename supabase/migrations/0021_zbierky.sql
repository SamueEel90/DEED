-- ============================================================
-- DEED · Moje zbierky napojené na DB  [Fáza 5 — owner-only okruh]
-- ------------------------------------------------------------
-- Zbierka/žiadosť, ktorú SOM vytvoril → spravujem ju v „Môj DEED":
-- ukončiť, podať vyúčtovacie doklady, poslať ďakovnú správu / ďakovné video.
-- Doteraz žila v localStorage — teraz trvalo v DB.
--
-- IDENTITA: kľúčované PRIAMO na auth.uid() (ako 0019), takže funguje aj pre
-- anonymné konto. `id` je TEXT (klientom generované — mock ids ako "z-1720…"),
-- aby netreba round-trip na DB uuid a create bol idempotentný.
--
-- Doklady sa ukladajú ako jsonb pole [{nazov,url,suma,cas}]; súbory (doklad/video)
-- idú do Storage bucketu `prispevky` (migrácia 0020). `dakovne_video` = URL/'ano'.
--
-- RLS = OWNER-ONLY OD ZAČIATKU. Idempotentné (IF NOT EXISTS / drop policy if exists).
-- ============================================================

create table if not exists public.zbierka (
  id             text primary key,
  pouzivatel     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nazov          text not null,
  modul          text not null default 'help',   -- good|help|charity|nabozenstvo
  typ            text,                            -- ziadost|charita|zbierka
  emoji          text,
  lok            text,
  ciel           numeric,
  vyzbierane     numeric default 0,
  stav           text not null default 'aktivna' check (stav in ('aktivna','ukoncena','vyuctovana')),
  dakovna_sprava text,
  dakovne_video  text,                            -- Storage URL (alebo 'ano' bez uploadu)
  doklady        jsonb not null default '[]'::jsonb,  -- [{nazov,url,suma,cas}]
  vytvorene      timestamptz not null default now(),
  upravene       timestamptz not null default now()
);
create index if not exists zbierka_pouzivatel_idx on public.zbierka(pouzivatel, vytvorene desc);

-- ============ RLS — OWNER-ONLY (vidím/píšem len svoje) ============
alter table public.zbierka enable row level security;
drop policy if exists owner_all on public.zbierka;
create policy owner_all on public.zbierka
  for all to authenticated
  using (pouzivatel = auth.uid())
  with check (pouzivatel = auth.uid());
