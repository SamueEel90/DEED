-- ============================================================
-- 0081b · Oznamy darcom zbierky (lib/oznamyDarcom) — skutočné doručenie
-- ------------------------------------------------------------
-- Správa počas zbierky / dokladovanie / výsledok sa doteraz uložila len do prehliadača autora.
-- oznam_darcom() ju rozpošle každému, kto na zbierku daroval prihlásený (platba.odosielatel).
-- Posiela len zakladateľ zbierky alebo správca jej stránky. Darca číta a označuje len svoje.
-- ============================================================
begin;

create table if not exists public.oznam_darcovi (
  id         bigint generated always as identity primary key,
  ucet_id    uuid not null references public.ucet(id) on delete cascade,   -- príjemca (darca)
  zbierka    text not null references public.zbierka(id) on delete cascade,
  typ        text not null check (typ in ('dolozene', 'sprava', 'vysledok')),
  text       text check (text is null or length(text) <= 4000),
  vytvorene  timestamptz not null default now(),
  precitane  timestamptz
);
create index if not exists oznam_darcovi_ucet_idx on public.oznam_darcovi (ucet_id, vytvorene desc);
alter table public.oznam_darcovi enable row level security;
drop policy if exists darca_citat on public.oznam_darcovi;
create policy darca_citat on public.oznam_darcovi for select to authenticated using (ucet_id = public.moj_ucet());
drop policy if exists darca_precitat on public.oznam_darcovi;
create policy darca_precitat on public.oznam_darcovi for update to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());
revoke all on table public.oznam_darcovi from anon, authenticated;
grant select on table public.oznam_darcovi to authenticated;
grant update (precitane) on table public.oznam_darcovi to authenticated;

-- rozpošle oznam darcom zbierky; vráti počet príjemcov (0 = zbierka bez prihlásených darcov / mimo DB)
create or replace function public.oznam_darcom(p_zbierka text, p_typ text, p_text text default null) returns int
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_z public.zbierka; v_n int;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into v_z from public.zbierka where id = p_zbierka;
  if not found then return 0; end if;
  if v_z.ucet_id is distinct from v_ja and not (v_z.stranka is not null and public.spravujem_stranku(v_z.stranka)) then
    raise exception 'nie_som_spravca' using errcode = '42501';
  end if;
  insert into public.oznam_darcovi (ucet_id, zbierka, typ, text)
    select distinct pl.odosielatel, p_zbierka, p_typ, nullif(left(trim(p_text), 4000), '')
      from public.platba pl
     where pl.zbierka = p_zbierka and pl.stav in ('credited', 'settled') and pl.odosielatel is not null and pl.odosielatel <> v_ja;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.oznam_darcom(text, text, text) from public;
grant execute on function public.oznam_darcom(text, text, text) to authenticated, service_role;

commit;
