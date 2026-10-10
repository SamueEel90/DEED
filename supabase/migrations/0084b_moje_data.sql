-- ============================================================
-- 0084b · Osobné nastavenia účtu (lib/mojeData) — kľúč → jsonb, len vlastník
-- ------------------------------------------------------------
-- Drobné osobné veci žili len v localStorage (iné zariadenie = prázdne): zablokovaní ľudia,
-- osobný profil (miesto, okruh), dlaždice profilu, vyvesené štíty, čo vidia priatelia,
-- bežiaca organizovaná akcia. Jeden riadok na (účet, kľúč). Číta a píše len vlastník (ako 0072b).
-- Kľúč = kľúč z localStorage appky (deed.*). Fotky nie (bez_data_url, 0064).
-- ============================================================
begin;

create table if not exists public.moje_data (
  ucet_id   uuid not null default public.moj_ucet() references public.ucet(id) on delete cascade,
  kluc      text not null check (kluc ~ '^deed\.[a-zA-Z0-9_.-]{1,80}$'),
  data      jsonb not null,
  upravene  timestamptz not null default now(),
  primary key (ucet_id, kluc)
);
alter table public.moje_data enable row level security;

drop policy if exists vlastnik on public.moje_data;
create policy vlastnik on public.moje_data for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());
revoke all on table public.moje_data from anon, authenticated;
grant select, insert, update, delete on public.moje_data to authenticated;

drop trigger if exists moje_data_cas on public.moje_data;
create trigger moje_data_cas before update on public.moje_data
  for each row execute function public.moje_skutky_cas();

drop trigger if exists bez_data_url on public.moje_data;
create trigger bez_data_url before insert or update on public.moje_data
  for each row execute function public.bez_data_url();

commit;
