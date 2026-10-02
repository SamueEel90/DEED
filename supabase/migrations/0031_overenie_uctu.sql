-- ============================================================
-- DEED · Overenie účtu overovacou platbou (KARTA 39 · bod 2, centrálna bod 3)
-- ------------------------------------------------------------
-- Charita zadá IBAN, appka jej ukáže kód. Z toho účtu pošle 0,01 € s kódom v správe.
-- Server (výpis z banky) platbu spozná podľa kódu, overí, že majiteľ účtu = organizácia
-- (názov / IČO), a nastaví stav 'overeny'. Klient stav meniť nesmie (RLS: len insert/select).
-- TODO (Samuel): spárovanie platby z bankového výpisu → update stav/overene/majitel (service_role).
-- Idempotentné.
-- ============================================================
create table if not exists public.overenie_uctu (
  stranka    text not null,
  iban       text not null,
  kod        text not null,
  stav       text not null default 'caka' check (stav in ('caka', 'overeny', 'zamietnuty')),
  majitel    text,
  vytvorene  timestamptz not null default now(),
  overene    timestamptz,
  vytvoril   uuid default auth.uid() references auth.users(id) on delete set null,
  primary key (stranka, iban)
);
create unique index if not exists overenie_uctu_kod_idx on public.overenie_uctu(kod);

alter table public.overenie_uctu enable row level security;
drop policy if exists spravca_citat on public.overenie_uctu;
create policy spravca_citat on public.overenie_uctu for select to authenticated using (vytvoril = auth.uid());
drop policy if exists spravca_ziadost on public.overenie_uctu;
create policy spravca_ziadost on public.overenie_uctu for insert to authenticated with check (vytvoril = auth.uid() and stav = 'caka');
