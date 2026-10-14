-- ============================================================
-- 0089b · bod 254 — Verejné fotky (fotobanka)
-- ------------------------------------------------------------
-- 1. bucket „verejne-fotky“ (verejné čítanie): fotky z Pexels/Pixabay/Openverse, ktoré si správca vybral.
--    Zapisuje len server (/api/fotky/uloz so service role), appka nikdy priamo.
-- 2. verejne_fotky — každá uložená fotka raz (zdroj + id v banke), s autorom a licenciou.
--    Unsplash sa NEukladá (ich podmienka): url ostane ich adresa.
-- 3. verejne_fotky_vyber — náš ručný výber po kategóriách (aj z Cathopic). Appka ho ukazuje prvý.
--    Plní sa ručne cez SQL Editor / Storage (žiadny zápis z appky).
-- 4. fotky_pocitadlo — denný strop hľadaní na účet (/api/fotky).
-- ============================================================
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verejne-fotky', 'verejne-fotky', true, 8 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists verejne_fotky_citat on storage.objects;
create policy verejne_fotky_citat on storage.objects for select to anon, authenticated using (bucket_id = 'verejne-fotky');

create table if not exists public.verejne_fotky (
  id           bigint generated always as identity primary key,
  zdroj        text not null check (zdroj in ('pexels', 'pixabay', 'unsplash', 'openverse', 'cathopic', 'vlastna')),
  zdroj_id     text not null check (length(zdroj_id) between 1 and 120),
  url          text not null,           -- veľká (≈1600 px): náš Storage, pri Unsplash ich adresa
  maly         text,                    -- náhľad (≈400 px)
  sirka        int,
  vyska        int,
  autor        text,
  odkaz_autora text,
  odkaz_zdroja text,
  licencia     text,
  ulozil       uuid references public.ucet (id) on delete set null,
  vytvorene    timestamptz not null default now(),
  unique (zdroj, zdroj_id)
);
alter table public.verejne_fotky enable row level security;
drop policy if exists verejne_fotky_citat on public.verejne_fotky;
create policy verejne_fotky_citat on public.verejne_fotky for select to anon, authenticated using (true);
revoke all on table public.verejne_fotky from anon, authenticated;
grant select on table public.verejne_fotky to anon, authenticated;

create table if not exists public.verejne_fotky_vyber (
  id           bigint generated always as identity primary key,
  kategoria    text not null check (kategoria in ('kostol', 'priroda', 'ludia', 'deti', 'sviecky', 'svadba', 'jedlo', 'praca')),
  url          text not null,           -- adresa v našom Storage (bucket verejne-fotky)
  maly         text,
  sirka        int,
  vyska        int,
  autor        text,
  odkaz_autora text,
  zdroj        text not null default 'vlastna',
  licencia     text,
  poradie      int not null default 0,
  aktivna      boolean not null default true,
  vytvorene    timestamptz not null default now()
);
create index if not exists verejne_fotky_vyber_kat on public.verejne_fotky_vyber (kategoria, poradie) where aktivna;
alter table public.verejne_fotky_vyber enable row level security;
drop policy if exists vyber_citat on public.verejne_fotky_vyber;
create policy vyber_citat on public.verejne_fotky_vyber for select to anon, authenticated using (aktivna);
revoke all on table public.verejne_fotky_vyber from anon, authenticated;
grant select on table public.verejne_fotky_vyber to anon, authenticated;

create table if not exists public.fotky_pocitadlo (
  ucet_id uuid not null references public.ucet (id) on delete cascade,
  den     date not null default current_date,
  pocet   int not null default 0,
  primary key (ucet_id, den)
);
alter table public.fotky_pocitadlo enable row level security;
revoke all on table public.fotky_pocitadlo from anon, authenticated;

-- zvýši počítadlo a vráti nový stav (volá len server)
create or replace function public.fotky_pocitaj(p_ucet uuid) returns int
  language sql security definer set search_path = public as $$
  insert into public.fotky_pocitadlo (ucet_id, den, pocet) values (p_ucet, current_date, 1)
  on conflict (ucet_id, den) do update set pocet = public.fotky_pocitadlo.pocet + 1
  returning pocet;
$$;
revoke all on function public.fotky_pocitaj(uuid) from public;
grant execute on function public.fotky_pocitaj(uuid) to service_role;

commit;
