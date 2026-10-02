-- ============================================================
-- DEED · Centrálna zbierka charity (KARTA 39 · bod 3)
-- ------------------------------------------------------------
-- Na celú činnosť, nikdy vo verejnom feede, stále hore na stránke charity. Nie je zapečatená:
-- text (textové polia), galéria, rýchle sumy EUR / EURC a účet sa dajú meniť kedykoľvek.
-- Účet = hlavný z registrácie; iný len po overovacej platbe (overenie_uctu, migrácia 0031).
-- profil_stranky.centralna (jsonb) + čas uloženia. Verejnosť ju číta cez profil_stranky_verejny.
-- TODO (Samuel): fotky sú data-URL v jsonb — presunúť do Storage ako pri zbierkach (0030).
-- Idempotentné.
-- ============================================================
alter table public.profil_stranky add column if not exists centralna jsonb;
alter table public.profil_stranky add column if not exists centralna_cas timestamptz;

create or replace view public.profil_stranky_verejny as
  select stranka, ulozeny, ulozeny_cas, centralna from public.profil_stranky where ulozeny is not null or centralna is not null;
grant select on public.profil_stranky_verejny to anon, authenticated;
