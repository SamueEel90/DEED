-- ============================================================
-- 0050 · Nastavenia charity do účtu stránky (OPRAVY 88) — Samuel, 6. 10. 2026
-- ------------------------------------------------------------
-- Obrazovky Správa → Nastavenia (oznámenia, dary v EUR/EURC, údaje, súhlasy, správcovia, zariadenia,
-- stiahnutie, podpora) držali stav len v pamäti relácie. Teraz sa ukladajú do jedného jsonb na stránku:
-- { "<kľúč obrazovky>": hodnota, … } — rovnaké kľúče ako v appke (NastaveniaCharity.tsx).
-- Číta a píše len správca stránky (spravujem_stranku). Verejnosť nevidí nič.
-- Pozn.: zoznam správcov a zariadení je zatiaľ obsah obrazovky; skutočné oprávnenia drží statutar (0035)
-- a prihlásené zariadenia Supabase Auth — prepojenie je ďalší krok.
-- Spúšťa sa po 0049.
-- ============================================================
begin;

create table if not exists public.nastavenia_stranky (
  stranka   text primary key references public.stranka(id) on update cascade on delete cascade,
  data      jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  upravene  timestamptz not null default now(),
  upravil   uuid default public.moj_ucet() references public.ucet(id) on delete set null
);
alter table public.nastavenia_stranky enable row level security;

drop policy if exists spravca_citat on public.nastavenia_stranky;
create policy spravca_citat on public.nastavenia_stranky for select to authenticated
  using (public.spravujem_stranku(stranka));
drop policy if exists spravca_pisat on public.nastavenia_stranky;
create policy spravca_pisat on public.nastavenia_stranky for insert to authenticated
  with check (public.spravujem_stranku(stranka));
drop policy if exists spravca_upravit on public.nastavenia_stranky;
create policy spravca_upravit on public.nastavenia_stranky for update to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));

create or replace function public.nastavenia_stranky_cas() returns trigger
  language plpgsql as $$
begin
  new.upravene := now();
  new.upravil := coalesce(public.moj_ucet(), new.upravil);
  return new;
end $$;
drop trigger if exists nastavenia_stranky_cas on public.nastavenia_stranky;
create trigger nastavenia_stranky_cas before insert or update on public.nastavenia_stranky
  for each row execute function public.nastavenia_stranky_cas();

commit;
