-- ============================================================
-- 0071 · KARTA 57C (odpoveď 2) — väzba stránok matka ↔ filiálky
-- Filiálka je riadna stránka (riadok v `stranka`) s vlastnou podstránkou a vlastným majiteľom-subjektom.
-- Táto tabuľka drží len väzbu. Na nej neskôr stojí cena za miesto, „oznam raz a zaškrtni kde“
-- a odovzdanie správy pri preložení farára (samostatné karty).
-- Pravidlá: filiálka má najviac jednu matku; filiálka nemôže mať vlastné filiálky; matka nemôže byť filiálkou.
-- Zápis len cez funkcie (security definer), čítanie verejné.
-- ============================================================

create table if not exists public.stranka_filialka (
  filialka   text primary key references public.stranka (id) on delete cascade,
  matka      text not null references public.stranka (id) on delete restrict,
  poradie    int not null default 0,
  pripojene  timestamptz not null default now(),
  check (matka <> filialka)
);
create index if not exists stranka_filialka_matka_idx on public.stranka_filialka (matka);

alter table public.stranka_filialka enable row level security;
drop policy if exists verejne_citat on public.stranka_filialka;
create policy verejne_citat on public.stranka_filialka for select to anon, authenticated using (true);
revoke insert, update, delete on table public.stranka_filialka from anon, authenticated;
grant select on table public.stranka_filialka to anon, authenticated;

-- jedna úroveň: matka nie je filiálkou, filiálka nemá filiálky
create or replace function public.stranka_filialka_uroven() returns trigger
  language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.stranka_filialka where filialka = new.matka) then
    raise exception 'matka_je_filialka' using errcode = '23514';
  end if;
  if exists (select 1 from public.stranka_filialka where matka = new.filialka) then
    raise exception 'filialka_ma_filialky' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists stranka_filialka_uroven on public.stranka_filialka;
create trigger stranka_filialka_uroven before insert or update on public.stranka_filialka
  for each row execute function public.stranka_filialka_uroven();

-- pripojenie existujúcej stránky ako filiálky: prihlásený musí spravovať obe stránky
create or replace function public.pripoj_filialku(p_matka text, p_filialka text, p_poradie int default 0)
  returns public.stranka_filialka
  language plpgsql security definer set search_path = public as $$
declare v_row public.stranka_filialka;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_matka) or not public.spravujem_stranku(p_filialka) then
    raise exception 'nie_spravca' using errcode = '42501';
  end if;
  if exists (select 1 from public.stranka_filialka where filialka = p_filialka and matka <> p_matka) then
    raise exception 'filialka_ma_matku' using errcode = '23505';
  end if;
  insert into public.stranka_filialka (filialka, matka, poradie) values (p_filialka, p_matka, coalesce(p_poradie, 0))
    on conflict (filialka) do update set poradie = excluded.poradie
    returning * into v_row;
  return v_row;
end $$;

-- založenie novej filiálky: nová stránka s vlastným účtom (zaloz_stranku, typ ako matka) + väzba
create or replace function public.zaloz_filialku(p_matka text, p_id text, p_nazov text, p_poradie int default 0)
  returns public.stranka
  language plpgsql security definer set search_path = public as $$
declare v_typ text; v_row public.stranka;
begin
  if not public.spravujem_stranku(p_matka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  select typ into v_typ from public.stranka where id = p_matka;
  v_row := public.zaloz_stranku(p_id, v_typ, p_nazov);
  insert into public.stranka_filialka (filialka, matka, poradie) values (p_id, p_matka, coalesce(p_poradie, 0));
  return v_row;
end $$;

-- odpojenie: smie správca matky alebo správca filiálky; stránka filiálky ostáva
create or replace function public.odpoj_filialku(p_filialka text) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_matka text;
begin
  select matka into v_matka from public.stranka_filialka where filialka = p_filialka;
  if v_matka is null then return false; end if;
  if not public.spravujem_stranku(v_matka) and not public.spravujem_stranku(p_filialka) then
    raise exception 'nie_spravca' using errcode = '42501';
  end if;
  delete from public.stranka_filialka where filialka = p_filialka;
  return true;
end $$;

revoke all on function public.pripoj_filialku(text, text, int) from public;
revoke all on function public.zaloz_filialku(text, text, text, int) from public;
revoke all on function public.odpoj_filialku(text) from public;
grant execute on function public.pripoj_filialku(text, text, int) to authenticated, service_role;
grant execute on function public.zaloz_filialku(text, text, text, int) to authenticated, service_role;
grant execute on function public.odpoj_filialku(text) to authenticated, service_role;
