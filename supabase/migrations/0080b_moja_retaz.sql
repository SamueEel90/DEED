-- ============================================================
-- 0080b · Reťaz dobra tvorcu (lib/retaz, karta 14) do účtu
-- ------------------------------------------------------------
-- Zapečatený rad zbierok tvorcu (percentá, stav položiek, súčty) žil len v localStorage
-- → na inom zariadení chýbal. Jeden jsonb na účet, číta a píše len vlastník (ako 0072b).
-- Peniaze to nehýbe — rozdelenie daru je vecou platobného modulu.
-- ============================================================
begin;

create table if not exists public.moja_retaz (
  ucet_id   uuid primary key default public.moj_ucet() references public.ucet(id) on delete cascade,
  data      jsonb not null check (jsonb_typeof(data) = 'object'),
  upravene  timestamptz not null default now()
);
alter table public.moja_retaz enable row level security;

drop policy if exists vlastnik on public.moja_retaz;
create policy vlastnik on public.moja_retaz for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());
revoke all on table public.moja_retaz from anon, authenticated;
grant select, insert, update, delete on public.moja_retaz to authenticated;

drop trigger if exists moja_retaz_cas on public.moja_retaz;
create trigger moja_retaz_cas before update on public.moja_retaz
  for each row execute function public.moje_skutky_cas();

commit;
