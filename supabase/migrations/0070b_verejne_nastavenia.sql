-- ============================================================
-- 0070b · verejné nastavenia stránky (rýchle sumy, krypto, viditeľnosť súm, centrálna zbierka)
-- ------------------------------------------------------------
-- Správa stránky ich držala len v prehliadači (localStorage deed.rola.*) → po prihlásení na inom
-- zariadení zmizli a návštevník verejného profilu ich nevidel. Patria k stránke a čítať ich musí
-- aj návštevník (darovací panel), preto nejdú do nastavenia_stranky.data (len správca).
-- Vlastný stĺpec `verejne`: zápis ho mení samostatne, súkromné `data` sa neprepíše.
-- Zápis = správca stránky (existujúce RLS 0050), čítanie = verejný pohľad.
-- ============================================================
begin;

alter table public.nastavenia_stranky
  add column if not exists verejne jsonb not null default '{}'::jsonb;
alter table public.nastavenia_stranky drop constraint if exists nastavenia_stranky_verejne_check;
alter table public.nastavenia_stranky
  add constraint nastavenia_stranky_verejne_check check (jsonb_typeof(verejne) = 'object');

create or replace view public.nastavenia_stranky_verejne as
  select stranka, verejne from public.nastavenia_stranky where verejne <> '{}'::jsonb;
grant select on public.nastavenia_stranky_verejne to anon, authenticated;

commit;
