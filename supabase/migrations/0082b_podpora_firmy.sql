-- ============================================================
-- 0082b · Podpory firiem (lib/podpory) — „dar = pripnutie" viditeľné pre všetkých
-- ------------------------------------------------------------
-- Firma, ktorá dala na zbierku (alebo vyčlenila strop dorovnania), ju má na svojej podstránke
-- a zbierka ukazuje, ktoré firmy ju podporili. Doteraz len v localStorage darujúceho.
-- Kľúč firmy = číslo jej účtu z appky (U-…), nie názov.
-- TESTOVACÍ REŽIM: firemný dar zatiaľ nejde cez platobný modul ako dar firmy (prepínač
-- „Darujem ako firma" je DEV) → zapisuje každý prihlásený cez RPC. Neskôr = pohľad nad platbami.
-- ============================================================
begin;

create table if not exists public.podpora_firmy (
  firma_ucet   text not null check (length(firma_ucet) between 1 and 64),
  zbierka      text not null check (length(zbierka) between 1 and 200),
  firma        text not null check (length(firma) <= 200),
  suma         numeric(12,2) not null default 0 check (suma >= 0),
  vyclenene    numeric(12,2) check (vyclenene is null or vyclenene >= 0),
  prve         timestamptz not null default now(),
  posledne     timestamptz not null default now(),
  archivovane  timestamptz,
  primary key (firma_ucet, zbierka)
);
create index if not exists podpora_firmy_zbierka_idx on public.podpora_firmy (zbierka);
alter table public.podpora_firmy enable row level security;
drop policy if exists podpora_citat on public.podpora_firmy;
create policy podpora_citat on public.podpora_firmy for select to anon, authenticated using (true);
revoke all on table public.podpora_firmy from anon, authenticated;
grant select on table public.podpora_firmy to anon, authenticated;

-- dar (p_suma) alebo vyčlenený strop (p_vyclenene) — pripočíta sa; ďalší dar vracia z archívu
create or replace function public.podpora_firmy_pridaj(p_firma text, p_zbierka text, p_nazov text,
  p_suma numeric default 0, p_vyclenene numeric default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if coalesce(p_suma, 0) < 0 or coalesce(p_vyclenene, 0) < 0 then raise exception 'zla_suma' using errcode = '22023'; end if;
  insert into public.podpora_firmy (firma_ucet, zbierka, firma, suma, vyclenene)
    values (p_firma, p_zbierka, left(coalesce(nullif(trim(p_nazov), ''), p_firma), 200), coalesce(p_suma, 0), p_vyclenene)
  on conflict (firma_ucet, zbierka) do update set
    suma = podpora_firmy.suma + coalesce(p_suma, 0),
    vyclenene = case when p_vyclenene is null then podpora_firmy.vyclenene else coalesce(podpora_firmy.vyclenene, 0) + p_vyclenene end,
    posledne = now(),
    archivovane = case when coalesce(p_suma, 0) > 0 or p_vyclenene is not null then null else podpora_firmy.archivovane end;
end $$;

-- stiahnuť z podstránky / vrátiť (dar ostáva)
create or replace function public.podpora_firmy_archiv(p_firma text, p_zbierka text, p_archiv boolean) returns void
  language plpgsql volatile security definer set search_path = public as $$
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  update public.podpora_firmy set archivovane = case when p_archiv then now() end
   where firma_ucet = p_firma and zbierka = p_zbierka;
end $$;
revoke all on function public.podpora_firmy_pridaj(text, text, text, numeric, numeric) from public;
revoke all on function public.podpora_firmy_archiv(text, text, boolean) from public;
grant execute on function public.podpora_firmy_pridaj(text, text, text, numeric, numeric) to authenticated, service_role;
grant execute on function public.podpora_firmy_archiv(text, text, boolean) to authenticated, service_role;

commit;
