-- ============================================================
-- 0073 · oznamy / akcie / inzeráty subjektu (lib/oznamy) a záujemcovia „Mám záujem"
-- ------------------------------------------------------------
-- Starší engine oznamov (Môj DEED+ firemný → Inzeráty, verejný profil → ponuky práce) žil len
-- v localStorage: inzerát videl len ten, kto ho napísal, a kontakt záujemcu sa zapísal len do
-- prehliadača záujemcu — organizácia ho nikdy nedostala.
--   oznam_subjektu    — obsah oznamu (bez záujemcov); čítajú všetci, píše správca stránky
--   zaujemca_inzeratu — kontakt záujemcu; vidí ho len on sám a správca stránky (GDPR: minimum)
-- ============================================================
begin;

create table if not exists public.oznam_subjektu (
  id         text primary key,
  stranka    text not null references public.stranka(id) on update cascade on delete cascade,
  kategoria  text not null check (kategoria in ('oznam', 'akcia', 'inzerat')),
  data       jsonb not null check (jsonb_typeof(data) = 'object'),
  vytvorene  timestamptz not null default now(),
  upravene   timestamptz not null default now(),
  upravil    uuid default public.moj_ucet() references public.ucet(id) on delete set null
);
create index if not exists oznam_subjektu_stranka_idx on public.oznam_subjektu (stranka, vytvorene desc);
alter table public.oznam_subjektu enable row level security;

drop policy if exists verejne_citat on public.oznam_subjektu;
create policy verejne_citat on public.oznam_subjektu for select to anon, authenticated using (true);
drop policy if exists spravca_pisat on public.oznam_subjektu;
create policy spravca_pisat on public.oznam_subjektu for all to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));
grant select on public.oznam_subjektu to anon, authenticated;
grant insert, update, delete on public.oznam_subjektu to authenticated;

drop trigger if exists bez_data_url on public.oznam_subjektu;
create trigger bez_data_url before insert or update on public.oznam_subjektu
  for each row execute function public.bez_data_url();

create table if not exists public.zaujemca_inzeratu (
  id        uuid primary key default gen_random_uuid(),
  oznam_id  text not null references public.oznam_subjektu(id) on delete cascade,
  stranka   text not null references public.stranka(id) on update cascade on delete cascade,
  ucet_id   uuid not null default public.moj_ucet() references public.ucet(id) on delete cascade,
  meno      text not null check (length(trim(meno)) between 3 and 120),
  telefon   text check (telefon is null or length(telefon) <= 40),
  email     text check (email is null or length(email) <= 200),
  poznamka  text check (poznamka is null or length(poznamka) <= 2000),
  stit      text,
  karma     int,
  kedy      timestamptz not null default now(),
  check (telefon is not null or email is not null)
);
create index if not exists zaujemca_inzeratu_oznam_idx on public.zaujemca_inzeratu (oznam_id);
alter table public.zaujemca_inzeratu enable row level security;

drop policy if exists zaujemca_pridat on public.zaujemca_inzeratu;
create policy zaujemca_pridat on public.zaujemca_inzeratu for insert to authenticated
  with check (ucet_id = public.moj_ucet()
              and stranka = (select o.stranka from public.oznam_subjektu o where o.id = oznam_id and o.kategoria = 'inzerat'));
drop policy if exists zaujemca_citat on public.zaujemca_inzeratu;
create policy zaujemca_citat on public.zaujemca_inzeratu for select to authenticated
  using (ucet_id = public.moj_ucet() or public.spravujem_stranku(stranka));
drop policy if exists zaujemca_zmazat on public.zaujemca_inzeratu;
create policy zaujemca_zmazat on public.zaujemca_inzeratu for delete to authenticated
  using (ucet_id = public.moj_ucet() or public.spravujem_stranku(stranka));
grant select, insert, delete on public.zaujemca_inzeratu to authenticated;

commit;
