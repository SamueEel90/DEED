-- ============================================================
-- 0086 · KARTA 62 — Sledovať kostol, Môj kostol, počet sledujúcich per miesto
-- ------------------------------------------------------------
-- Miesto (kostol, kaplnka, filiálka) je položka v stave farnosti (oblasť „miesta“), kľúč = id miesta (text).
-- 1. moje_kostoly — používateľ sleduje konkrétny kostol farnosti („Notre Dame · Farnosť Trenčín“).
--    Číta a mení len majiteľ (RLS), rovnako ako moje_farnosti (0076).
-- 2. moje_farnosti.moj_kostol — pri domovskej farnosti nepovinne „Môj kostol“ (kalendár sa otvorí s jeho čipom).
--    Mení sa len cez nastav_moj_kostol() (tabuľka nemá grant update).
-- 3. sledujuci_miest(stranka) — správca stránky vidí v Nástrojoch počet sledujúcich pri každom mieste.
-- ============================================================
begin;

-- ---------- 1 · sledované kostoly ----------
create table if not exists public.moje_kostoly (
  ucet_id  uuid not null default public.zaisti_ucet() references public.ucet (id) on delete cascade,
  stranka  text not null references public.stranka (id) on delete cascade,
  miesto   text not null check (length(miesto) between 1 and 40),
  pridane  timestamptz not null default now(),
  primary key (ucet_id, stranka, miesto)
);
create index if not exists moje_kostoly_stranka on public.moje_kostoly (stranka, miesto);
alter table public.moje_kostoly enable row level security;
drop policy if exists kostoly_citat on public.moje_kostoly;
create policy kostoly_citat on public.moje_kostoly for select to authenticated using (ucet_id = public.moj_ucet());
drop policy if exists kostoly_pridat on public.moje_kostoly;
create policy kostoly_pridat on public.moje_kostoly for insert to authenticated with check (ucet_id = public.moj_ucet());
drop policy if exists kostoly_zmazat on public.moje_kostoly;
create policy kostoly_zmazat on public.moje_kostoly for delete to authenticated using (ucet_id = public.moj_ucet());
revoke all on table public.moje_kostoly from anon, authenticated;
grant select, insert, delete on table public.moje_kostoly to authenticated;

-- ---------- 2 · Môj kostol pri domovskej farnosti ----------
alter table public.moje_farnosti add column if not exists moj_kostol text check (moj_kostol is null or length(moj_kostol) between 1 and 40);

-- nastaví (null = zruší) Môj kostol pri domovskej farnosti; bez domovskej vráti false
create or replace function public.nastav_moj_kostol(p_miesto text) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  update public.moje_farnosti set moj_kostol = nullif(trim(p_miesto), '') where ucet_id = v_ja and domovska;
  return found;
end $$;
revoke all on function public.nastav_moj_kostol(text) from public;
grant execute on function public.nastav_moj_kostol(text) to authenticated, service_role;

-- ---------- 3 · počet sledujúcich per miesto (len správca stránky) ----------
create or replace function public.sledujuci_miest(p_stranka text) returns table (miesto text, pocet bigint)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  return query select k.miesto, count(*)::bigint from public.moje_kostoly k where k.stranka = p_stranka group by k.miesto;
end $$;
revoke all on function public.sledujuci_miest(text) from public;
grant execute on function public.sledujuci_miest(text) to authenticated, service_role;

commit;
