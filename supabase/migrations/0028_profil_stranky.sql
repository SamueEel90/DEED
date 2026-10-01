-- ============================================================
-- DEED · Profil stránky — koncept a uložený profil (KARTA 33 · OPRAVY 106)
-- ------------------------------------------------------------
-- Upraviť profil ukladá KONCEPT (automaticky 600 ms po zmene) a po „Uložiť profil"
-- zverejnený profil. Oboje do účtu organizácie (nie do prehliadača).
-- Kľúč = stránka (id stránky v správe). Verejnosť číta LEN uložený profil cez view.
-- TODO (Samuel): prístup rozšíriť na všetkých správcov stránky, keď bude väzba stránka ↔ organizácia
-- (statutar / správcovia). Zatiaľ riadok číta a mení len ten, kto ho založil. Idempotentné.
-- ============================================================
create table if not exists public.profil_stranky (
  stranka        text primary key,
  koncept        jsonb,
  koncept_cas    timestamptz,
  ulozeny        jsonb,
  ulozeny_cas    timestamptz,
  upravil        uuid default auth.uid() references auth.users(id) on delete set null
);

alter table public.profil_stranky enable row level security;
drop policy if exists spravca_all on public.profil_stranky;
create policy spravca_all on public.profil_stranky for all to authenticated
  using (upravil = auth.uid()) with check (upravil = auth.uid());

-- verejnosť vidí len uložený profil, koncept nikdy
create or replace view public.profil_stranky_verejny as
  select stranka, ulozeny, ulozeny_cas from public.profil_stranky where ulozeny is not null;
grant select on public.profil_stranky_verejny to anon, authenticated;
