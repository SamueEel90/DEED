-- ============================================================
-- 0083b · Správa zbierky (lib/zbierkaSprava) do DB
-- ------------------------------------------------------------
-- Stav správy (koniec, predĺženia, dokladovanie — text, fotky, doklady, správy darcom, výsledok…)
-- žil len v localStorage autora → darcovia nevideli zverejnené dokladovanie. Jeden jsonb na zbierku.
-- Číta každý (dokladovanie je verejné). Píše zakladateľ zbierky alebo správca jej stránky;
-- zbierka, ktorá v DB nie je (ukážkové dáta appky), = TESTOVACÍ REŽIM: každý prihlásený.
-- Stav zbierky v tabuľke zbierka (aktívna / ukončená, dary) to NEMENÍ — to ide cez jej funkcie.
-- ============================================================
begin;

create table if not exists public.zbierka_sprava (
  zbierka   text primary key check (length(zbierka) between 1 and 200),
  data      jsonb not null check (jsonb_typeof(data) = 'object'),
  upravil   uuid default public.moj_ucet() references public.ucet(id) on delete set null,
  upravene  timestamptz not null default now()
);
alter table public.zbierka_sprava enable row level security;

create or replace function public.smiem_spravovat_zbierku(p_zbierka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.moj_ucet() is not null and coalesce(
    (select z.ucet_id = public.moj_ucet() or (z.stranka is not null and public.spravujem_stranku(z.stranka))
       from public.zbierka z where z.id = p_zbierka),
    true)  -- zbierka mimo DB (ukážka) = testovací režim
$$;
revoke all on function public.smiem_spravovat_zbierku(text) from public;
grant execute on function public.smiem_spravovat_zbierku(text) to authenticated, service_role;

drop policy if exists sprava_citat on public.zbierka_sprava;
create policy sprava_citat on public.zbierka_sprava for select to anon, authenticated using (true);
drop policy if exists sprava_pisat on public.zbierka_sprava;
create policy sprava_pisat on public.zbierka_sprava for all to authenticated
  using (public.smiem_spravovat_zbierku(zbierka)) with check (public.smiem_spravovat_zbierku(zbierka));
revoke all on table public.zbierka_sprava from anon, authenticated;
grant select on table public.zbierka_sprava to anon, authenticated;
grant insert, update, delete on table public.zbierka_sprava to authenticated;

create or replace function public.zbierka_sprava_cas() returns trigger
  language plpgsql as $$
begin
  new.upravene := now();
  new.upravil := coalesce(public.moj_ucet(), new.upravil);
  return new;
end $$;
drop trigger if exists zbierka_sprava_cas on public.zbierka_sprava;
create trigger zbierka_sprava_cas before update on public.zbierka_sprava
  for each row execute function public.zbierka_sprava_cas();

drop trigger if exists bez_data_url on public.zbierka_sprava;
create trigger bez_data_url before insert or update on public.zbierka_sprava
  for each row execute function public.bez_data_url();

commit;
