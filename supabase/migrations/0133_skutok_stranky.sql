-- ============================================================
-- 0133 · OPRAVY 418 (charita) — skutky charity na verejnom profile
-- ------------------------------------------------------------
-- Skutok za charitu sa doteraz ukladal len do osobného denníka správcu (moje_skutky, číta len on) a do feedu
-- (bez väzby na stránku) → verejný profil charity skutky nevidel.
-- Nová tabuľka skutok_stranky (stránka, id, data): číta každý (verejný profil), stiahnutý skutok len správa;
-- zapisuje správca stránky (pracovník charity len s právom „obsah“, 0129).
-- ============================================================
begin;

create table if not exists public.skutok_stranky (
  id         text primary key,
  stranka    text not null references public.stranka(id) on delete cascade,
  data       jsonb not null,
  stiahnuty  timestamptz,
  vytvorene  timestamptz not null default now(),
  upravene   timestamptz not null default now()
);
create index if not exists skutok_stranky_stranka on public.skutok_stranky (stranka);
alter table public.skutok_stranky enable row level security;

drop policy if exists skutok_stranky_citat on public.skutok_stranky;
create policy skutok_stranky_citat on public.skutok_stranky for select to anon, authenticated
  using (stiahnuty is null or public.spravujem_stranku(stranka));
drop policy if exists skutok_stranky_zapis on public.skutok_stranky;
create policy skutok_stranky_zapis on public.skutok_stranky for insert to authenticated
  with check (public.spravujem_stranku(stranka) and public.smie_v_stranke(stranka, 'obsah'));
drop policy if exists skutok_stranky_uprava on public.skutok_stranky;
create policy skutok_stranky_uprava on public.skutok_stranky for update to authenticated
  using (public.spravujem_stranku(stranka) and public.smie_v_stranke(stranka, 'obsah'))
  with check (public.spravujem_stranku(stranka) and public.smie_v_stranke(stranka, 'obsah'));
drop policy if exists skutok_stranky_mazanie on public.skutok_stranky;
create policy skutok_stranky_mazanie on public.skutok_stranky for delete to authenticated
  using (public.spravujem_stranku(stranka) and public.smie_v_stranke(stranka, 'obsah'));

revoke all on public.skutok_stranky from anon;
grant select on public.skutok_stranky to anon;
grant select, insert, update, delete on public.skutok_stranky to authenticated;

commit;
