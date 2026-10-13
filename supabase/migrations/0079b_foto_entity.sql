-- ============================================================
-- 0079b · Fotky subjektov (lib/fotoentity) do DB
-- ------------------------------------------------------------
-- Profilová fotka / logo a titulná fotka každého profilu (org, osoba, rola, farnosť, ja) žili
-- len v localStorage → iný človek ani iné zariadenie ich nevideli. Kľúč = klucEntity() z appky
-- („org:oz-tulava-labka"). V DB sú len URL zo Storage (bez_data_url, 0064).
-- TESTOVACÍ REŽIM (= FOTO_TEST_REZIM v appke): meniť smie každý prihlásený, aj cudzí profil.
-- Pred launchom zúžiť zápis na držiteľa profilu.
-- ============================================================
begin;

create table if not exists public.foto_entity (
  kluc      text primary key check (length(kluc) between 3 and 200),
  avatar    text check (avatar is null or avatar ~ '^https?://'),
  cover     text check (cover is null or cover ~ '^https?://'),
  upravil   uuid default public.moj_ucet() references public.ucet(id) on delete set null,
  upravene  timestamptz not null default now()
);
alter table public.foto_entity enable row level security;

drop policy if exists foto_citat on public.foto_entity;
create policy foto_citat on public.foto_entity for select to anon, authenticated using (true);
drop policy if exists foto_test_zapis on public.foto_entity;
create policy foto_test_zapis on public.foto_entity for all to authenticated
  using (public.moj_ucet() is not null) with check (public.moj_ucet() is not null);
revoke all on table public.foto_entity from anon, authenticated;
grant select on table public.foto_entity to anon, authenticated;
grant insert, update, delete on table public.foto_entity to authenticated;

create or replace function public.foto_entity_cas() returns trigger
  language plpgsql as $$
begin
  new.upravene := now();
  new.upravil := coalesce(public.moj_ucet(), new.upravil);
  return new;
end $$;
drop trigger if exists foto_entity_cas on public.foto_entity;
create trigger foto_entity_cas before update on public.foto_entity
  for each row execute function public.foto_entity_cas();

drop trigger if exists bez_data_url on public.foto_entity;
create trigger bez_data_url before insert or update on public.foto_entity
  for each row execute function public.bez_data_url();

commit;
