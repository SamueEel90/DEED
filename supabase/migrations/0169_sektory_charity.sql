-- ============================================================
-- 0169 · Balík 48 bod −1 (Martin 23. 10.) · sektorové zbierky charity na serveri
-- ------------------------------------------------------------
-- Doteraz boli sektory len v pamäti prehliadača (po obnovení zmizli, iný počítač ich nevidel, spoločné pre všetky charity).
-- Teraz riadok v sektor_stranky ku konkrétnej stránke:
--  · koncept (spusteny null) vidí len správca; na profile a pre dary až spustený a neukončený;
--  · dary idú ako doteraz cez zbierka_dar s id „<stránka>:<sektor.id>“ (riadok zbierky typ 'sektor' založí server pri prvom dare, 0066).
--    Nové: riadok zbierky pre „<stránka>:sek-…“ vznikne len pre spustený a neukončený sektor tej stránky;
--    ukončenie sektora ukončí aj jeho zbierku (dary sa zastavia).
--  · spustiť sektor smie charita od programu P1 (Zadarmo bez sektorov) — len zápisy z appky (authenticated/anon), server a testy obídu.
--  · transparentný účet sektora (iban) vidí len správca; verejný pohľad ho nemá (ako účet centrálnej, 0059).
-- Limity počtu zbierok (súčet) rieši ďalšia migrácia (bod 518). Idempotentné.
-- ============================================================
begin;

create table if not exists public.sektor_stranky (
  id            text primary key default ('sek-' || substr(md5(gen_random_uuid()::text), 1, 10)),
  stranka       text not null references public.stranka(id) on delete cascade,
  oblast        text not null check (length(trim(oblast)) between 1 and 80),
  nazov         text not null check (length(trim(nazov)) between 1 and 30),
  obsah         jsonb not null default '{}'::jsonb,
  iban          text check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'),
  iban_overeny  timestamptz,
  poradie       int not null default 0,
  spusteny      timestamptz,
  ukonceny      timestamptz,
  vytvorene     timestamptz not null default now(),
  upravene      timestamptz not null default now(),
  upravil_ucet  uuid references public.ucet(id) on delete set null default public.moj_ucet(),
  check (id ~ '^sek-[a-z0-9-]{1,40}$')
);
create index if not exists sektor_stranky_stranka_idx on public.sektor_stranky(stranka, poradie);
-- jedna bežiaca (neukončená) zbierka na oblasť
create unique index if not exists sektor_stranky_oblast_uq on public.sektor_stranky(stranka, lower(trim(oblast))) where ukonceny is null;

alter table public.sektor_stranky enable row level security;
drop policy if exists spravca_all on public.sektor_stranky;
create policy spravca_all on public.sektor_stranky for all to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));
grant select, insert, update, delete on public.sektor_stranky to authenticated;

drop trigger if exists bez_data_url on public.sektor_stranky;
create trigger bez_data_url before insert or update on public.sektor_stranky for each row execute function public.bez_data_url();

-- upravené + spustenie len od P1 (charita); spustený sa nedá vrátiť do konceptu; ukončený sa neotvára
create or replace function public.sektor_stranky_kontrola() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.upravene := now();
  if tg_op = 'UPDATE' then
    if new.stranka <> old.stranka or new.id <> old.id then raise exception 'sektor_nemenny' using errcode = '22023'; end if;
    if old.spusteny is not null and new.spusteny is null then new.spusteny := old.spusteny; end if;
    if old.ukonceny is not null and new.ukonceny is null then raise exception 'sektor_ukonceny' using errcode = '22023'; end if;
  end if;
  if coalesce(current_setting('role', true), '') in ('authenticated', 'anon')
     and new.spusteny is not null and (tg_op = 'INSERT' or old.spusteny is null)
     and public.zadarmo_charita(new.stranka) then
    raise exception 'sektor_od_p1' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists sektor_stranky_kontrola on public.sektor_stranky;
create trigger sektor_stranky_kontrola before insert or update on public.sektor_stranky for each row execute function public.sektor_stranky_kontrola();

-- ukončenie sektora → jeho zbierka (ak už má dary) sa ukončí, dary sa zastavia
create or replace function public.sektor_stranky_ukonci_zbierku() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.ukonceny is not null and old.ukonceny is null then
    update public.zbierka set stav = 'ukoncena', upravene = now()
     where id = new.stranka || ':' || new.id and stav = 'aktivna';
  end if;
  return new;
end $$;
drop trigger if exists sektor_stranky_ukonci_zbierku on public.sektor_stranky;
create trigger sektor_stranky_ukonci_zbierku after update of ukonceny on public.sektor_stranky for each row execute function public.sektor_stranky_ukonci_zbierku();

-- riadok zbierky pre „<stránka>:sek-…“ len pre spustený a neukončený sektor (zbierka_dar ho zakladá pri prvom dare)
create or replace function public.zbierka_sektor_existuje() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.stranka is not null and new.id like new.stranka || ':sek-%'
     and not exists (select 1 from public.sektor_stranky s
                      where s.stranka = new.stranka and new.id = s.stranka || ':' || s.id
                        and s.spusteny is not null and s.ukonceny is null) then
    raise exception 'Zbierka neexistuje.' using errcode = 'P0002', detail = 'zbierka_neexistuje';
  end if;
  return new;
end $$;
drop trigger if exists zbierka_sektor_existuje on public.zbierka;
create trigger zbierka_sektor_existuje before insert on public.zbierka for each row execute function public.zbierka_sektor_existuje();

-- verejný pohľad: spustené, neukončené, viditeľná stránka; bez účtu
create or replace view public.sektor_stranky_verejny as
  select s.id, s.stranka, s.oblast, s.nazov, (s.obsah - 'ucet') as obsah, s.poradie, s.spusteny
    from public.sektor_stranky s
   where s.spusteny is not null and s.ukonceny is null and public.stranka_viditelna(s.stranka);
grant select on public.sektor_stranky_verejny to anon, authenticated;

commit;
