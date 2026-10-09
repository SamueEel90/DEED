-- ============================================================
-- 0072b · Môj denník skutkov do účtu (lib/mojeSkutky)
-- ------------------------------------------------------------
-- Pridané skutky (aj tie, čo nešli do feedu: „ostáva v denníku", „Kontroluje AI"), koncept,
-- ohlásený skutok a skutky za stránku žili len v localStorage → na inom zariadení chýbali,
-- pri plnom úložisku (fotky) sa ticho stratili. Jeden jsonb na účet, číta a píše len vlastník.
-- Fotky nie (bez_data_url, 0064) — appka ich pred zápisom nahrá do Storage.
-- ============================================================
begin;

create table if not exists public.moje_skutky (
  ucet_id   uuid primary key default public.moj_ucet() references public.ucet(id) on delete cascade,
  data      jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  upravene  timestamptz not null default now()
);
alter table public.moje_skutky enable row level security;

drop policy if exists vlastnik on public.moje_skutky;
create policy vlastnik on public.moje_skutky for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());
grant select, insert, update, delete on public.moje_skutky to authenticated;

create or replace function public.moje_skutky_cas() returns trigger
  language plpgsql as $$
begin
  new.upravene := now();
  return new;
end $$;
drop trigger if exists moje_skutky_cas on public.moje_skutky;
create trigger moje_skutky_cas before update on public.moje_skutky
  for each row execute function public.moje_skutky_cas();

drop trigger if exists bez_data_url on public.moje_skutky;
create trigger bez_data_url before insert or update on public.moje_skutky
  for each row execute function public.bez_data_url();

commit;
