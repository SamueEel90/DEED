-- ============================================================
-- DEED · Pripnuté položky v Správe charity (KARTA 34 · OPRAVY 80)
-- ------------------------------------------------------------
-- Lišta „Pripnuté" sa ukladá do účtu, aby ju správca videl na každom zariadení.
-- Kľúč = auth.uid() + stránka (charita, ktorú spravuje). Najviac 6 položiek.
-- RLS owner-only ako v 0019. Idempotentné.
-- ============================================================
create table if not exists public.sprava_piny (
  pouzivatel    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stranka       text not null,
  piny          text[] not null default '{}',
  aktualizovane timestamptz not null default now(),
  primary key (pouzivatel, stranka),
  constraint sprava_piny_max6 check (coalesce(array_length(piny, 1), 0) <= 6)
);

alter table public.sprava_piny enable row level security;
drop policy if exists owner_all on public.sprava_piny;
create policy owner_all on public.sprava_piny for all to authenticated
  using (pouzivatel = auth.uid()) with check (pouzivatel = auth.uid());
