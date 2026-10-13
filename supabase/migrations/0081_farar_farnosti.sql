-- ============================================================
-- 0081 · OPRAVY 222 (Martin 13. 10.) — „Prispieť za farnosť" len farár, stráži to server.
-- 1. stranka_farar: ktorý účet je farár (duchovný správca) farnosti. Jeden na farnosť.
--    Zapíše sa, keď správca stránky v Ľudia uloží „Som farár“; „Vypĺňam za farára“ (farár bez účtu) ho zruší.
--    Prepísať iného farára smie len majiteľ stránky (účet farnosti). Číta správa stránky.
-- 2. som_farar(p_stranka): appka podľa neho ukáže „Prispieť za farnosť“.
-- 3. zbierka_dar_farnosti: namiesto „správca farnosti“ teraz „farár farnosti“. Inak 1 : 1 ako 0080 (bez dorovnania, len pevná suma).
-- ============================================================
begin;

create table if not exists public.stranka_farar (
  stranka   text primary key references public.stranka (id) on delete cascade,
  ucet      uuid not null references public.ucet (id) on delete cascade,
  od        timestamptz not null default now()
);
alter table public.stranka_farar enable row level security;
drop policy if exists farar_citat on public.stranka_farar;
create policy farar_citat on public.stranka_farar for select to authenticated using (public.spravujem_stranku(stranka));
grant select on table public.stranka_farar to authenticated;

create or replace function public.som_farar(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stranka_farar f where f.stranka = p_stranka and f.ucet = public.moj_ucet() and public.moj_ucet() is not null)
$$;

create or replace function public.nastav_farara(p_stranka text, p_som boolean) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_s public.stranka; v_f public.stranka_farar;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into v_s from public.stranka where id = p_stranka;
  if not found or v_s.typ <> 'farnost' then raise exception 'Stránka nie je farnosť.' using errcode = '22023', detail = 'nie_farnost'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'Farára nastaví len správa farnosti.' using errcode = '42501', detail = 'nie_spravca'; end if;
  select * into v_f from public.stranka_farar where stranka = p_stranka;
  if p_som then
    if found and v_f.ucet <> v_ja and v_s.ucet_id <> v_ja then
      raise exception 'Farnosť už má farára.' using errcode = '42501', detail = 'iny_farar';
    end if;
    insert into public.stranka_farar (stranka, ucet) values (p_stranka, v_ja)
      on conflict (stranka) do update set ucet = excluded.ucet, od = now();
    return true;
  end if;
  delete from public.stranka_farar where stranka = p_stranka and ucet = v_ja;
  return false;
end $$;

create or replace function public.zbierka_dar_farnosti(p_zbierka text, p_idem text, p_suma numeric, p_mena text, p_kanal text, p_farnost text)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ja uuid := public.moj_ucet(); v_s public.stranka; v_z public.zbierka; v_r jsonb;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_kanal not in ('fiat', 'sepa') then
    raise exception 'Farnosť prispieva prevodom alebo kartou.' using errcode = '22023', detail = 'zly_kanal';
  end if;
  select * into v_s from public.stranka where id = p_farnost;
  if not found or v_s.typ <> 'farnost' then
    raise exception 'Stránka nie je farnosť.' using errcode = '22023', detail = 'nie_farnost';
  end if;
  if not public.som_farar(p_farnost) then
    raise exception 'Za farnosť môže prispieť len farár.' using errcode = '42501', detail = 'nie_farar';
  end if;
  select * into v_z from public.zbierka where id = p_zbierka;
  -- vlastná zbierka farnosti (peniaze by sa vrátili farnosti); zbierka rodiny s príjemcom je cudzia
  if found and v_z.stranka = p_farnost and not exists (select 1 from public.zbierka_podiel where zbierka = p_zbierka and druh = 'prijemca') then
    raise exception 'Na vlastnú zbierku farnosť neprispieva.' using errcode = '22023', detail = 'vlastna_zbierka';
  end if;
  v_r := public.zbierka_dar(p_zbierka, p_idem, p_suma, p_mena, p_kanal, v_s.nazov, null, null, null);
  update public.platba set darca_stranka = p_farnost where id = (v_r->>'platba_id')::uuid and darca_stranka is null;
  return v_r || jsonb_build_object('farnost', p_farnost);
end $$;

revoke all on function public.som_farar(text), public.nastav_farara(text, boolean) from public;
grant execute on function public.som_farar(text), public.nastav_farara(text, boolean) to authenticated, service_role;
revoke all on function public.zbierka_dar_farnosti(text,text,numeric,text,text,text) from public;
grant execute on function public.zbierka_dar_farnosti(text,text,numeric,text,text,text) to authenticated, service_role;

commit;
