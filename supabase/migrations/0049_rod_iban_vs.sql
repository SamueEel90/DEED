-- ============================================================
-- 0049 · Rod v profile · IBAN osoby · verejné číslo zbierky (VS) — serverová časť (Samuel, 6. 10. 2026)
-- ------------------------------------------------------------
-- 1. profil.rod ('muz' | 'zena', null = mužský tvar) — len na tvar vety „Urobil / Urobila som".
-- 2. vyplatny_ucet: IBAN osoby z registrácie (krok Platba). Vlastná tabuľka, nie profil — profil má
--    ešte testovacie RLS „všetko povolené" a IBAN nesmie vidieť nikto cudzí. Číta a píše len majiteľ;
--    stav overenia mení len server (overenie 0,01 € / meno majiteľa = meno z dokladu príde neskôr).
-- 3. zbierka.vs: verejné číslo objektu = variabilný symbol (Číslovanie v1.3: 9 číslic + Luhn).
--    Prideľuje ho server pri vzniku zbierky z rady dokladov (novy_doklad, 0037) — tá istá atomická
--    sekvencia ako doklady, takže VS zbierky a VS dokladu sa nikdy nezrazia. Raz pridelené sa nemení.
--    Appka ho zobrazí ako „Z-123 456 789 0" (src/lib/cisloObjektu.ts).
-- Spúšťa sa po 0048.
-- ============================================================
begin;

-- ---------- 1 · rod ----------
alter table public.profil add column if not exists rod text;
alter table public.profil drop constraint if exists profil_rod_check;
alter table public.profil add constraint profil_rod_check check (rod is null or rod in ('muz', 'zena'));

-- ---------- 2 · IBAN osoby ----------
create table if not exists public.vyplatny_ucet (
  ucet_id     uuid primary key references public.ucet(id) on delete cascade,
  iban        text not null check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  overeny     boolean not null default false,              -- mení len server
  vytvorene   timestamptz not null default now(),
  upravene    timestamptz not null default now()
);
alter table public.vyplatny_ucet enable row level security;
drop policy if exists majitel on public.vyplatny_ucet;
create policy majitel on public.vyplatny_ucet for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());

-- IBAN sa ukladá bez medzier, veľkými; zmena čísla = znova neoverený; overeny nastaví len server
create or replace function public.vyplatny_ucet_strazca() returns trigger
  language plpgsql as $$
begin
  new.iban := upper(regexp_replace(coalesce(new.iban, ''), '\s', '', 'g'));
  new.upravene := now();
  if public.zapis_klienta() then
    new.overeny := case when tg_op = 'UPDATE' then old.overeny and new.iban = old.iban else false end;
  end if;
  return new;
end $$;
drop trigger if exists vyplatny_ucet_strazca on public.vyplatny_ucet;
create trigger vyplatny_ucet_strazca before insert or update on public.vyplatny_ucet
  for each row execute function public.vyplatny_ucet_strazca();

-- ---------- 3 · VS zbierky ----------
alter table public.zbierka add column if not exists vs text;
update public.zbierka set vs = public.novy_doklad() where vs is null;
alter table public.zbierka alter column vs set default public.novy_doklad();
alter table public.zbierka alter column vs set not null;
create unique index if not exists zbierka_vs_key on public.zbierka (vs);

-- raz pridelené číslo sa nemení (ani serverom)
create or replace function public.zbierka_vs_pevne() returns trigger
  language plpgsql as $$
begin
  if new.vs is distinct from old.vs then
    raise exception 'Číslo zbierky sa nedá zmeniť.' using errcode = '42501', detail = 'vs_pevne';
  end if;
  return new;
end $$;
drop trigger if exists zbierka_vs_pevne on public.zbierka;
create trigger zbierka_vs_pevne before update of vs on public.zbierka
  for each row execute function public.zbierka_vs_pevne();

-- klient si číslo nevymyslí: pri vložení z appky ho vždy pridelí server
create or replace function public.zbierka_vs_server() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if public.zapis_klienta() or new.vs is null then new.vs := public.novy_doklad(); end if;
  return new;
end $$;
drop trigger if exists zbierka_vs_server on public.zbierka;
create trigger zbierka_vs_server before insert on public.zbierka
  for each row execute function public.zbierka_vs_server();

-- moje zbierky (0037) s číslom: z.* sa rozvinie pri vytvorení pohľadu, preto znova
drop view if exists public.zbierka_moja;
create view public.zbierka_moja with (security_invoker = true) as
  select z.*, v.vyzbierane_eur as vyzbierane, coalesce(v.vyzbierane_deed, 0) as vyzbierane_deed
    from public.zbierka z
    left join public.v_vyzbierane v on v.case_id::text = z.id;
grant select on public.zbierka_moja to authenticated;

commit;
