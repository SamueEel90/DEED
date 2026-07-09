-- ============================================================
-- DEED · Osobné funkcie napojené na DB  [Fáza 5 — prvý owner-only okruh]
-- ------------------------------------------------------------
-- Správy „Ozvať sa", nahlásenia obsahu, RSVP, obľúbené, peňaženka (zostatok).
-- Doteraz žili v localStorage — teraz sú trvalo v DB.
--
-- IDENTITA: kľúčované PRIAMO na auth.uid() (nie ucet_id), takže fungujú aj pre
-- ANONYMNÉ konto (hosť bez `ucet` riadku dostane auth.users id cez signInAnonymously).
-- Anonymný používateľ má rolu `authenticated` (JWT `is_anonymous:true`), preto RLS
-- cieli `to authenticated` — bez session (rola `anon`) sa nedá nič zapísať/čítať.
--
-- RLS = OWNER-ONLY OD ZAČIATKU (nie test_all_access): vidím a píšem len svoje riadky.
-- Idempotentné: re-run nič nerozbije (IF NOT EXISTS / drop policy if exists).
-- ============================================================

-- ============ SPRÁVA — „Ozvať sa" (jednosmerná správa organizácii) ============
create table if not exists public.sprava (
  id          uuid primary key default gen_random_uuid(),
  odosielatel uuid not null default auth.uid() references auth.users(id) on delete cascade,
  komu_text   text not null,                 -- názov org/farnosti (denormalizované)
  ref_id      text,                          -- id príspevku (mixed typy → text)
  modul       text,
  sprava      text not null,
  vytvorene   timestamptz not null default now()
);
create index if not exists sprava_odosielatel_idx on public.sprava(odosielatel, vytvorene desc);

-- ============ NAHLÁSENIE — report obsahu (§11: nahlásiť, nie hlasovať) ============
create table if not exists public.nahlasenie (
  id           uuid primary key default gen_random_uuid(),
  nahlasovatel uuid not null default auth.uid() references auth.users(id) on delete cascade,
  co_text      text not null,
  ref_id       text,
  modul        text,
  dovod        text not null check (dovod in ('podvod','urazlive','spam','ine')),
  poznamka     text,
  vytvorene    timestamptz not null default now()
);
create index if not exists nahlasenie_nahlasovatel_idx on public.nahlasenie(nahlasovatel, vytvorene desc);

-- ============ RSVP — účasť na udalosti (toggle: riadok existuje = idem) ============
create table if not exists public.rsvp (
  id         uuid primary key default gen_random_uuid(),
  pouzivatel uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref_id     text not null,
  modul      text not null default 'nabozenstvo',
  vytvorene  timestamptz not null default now(),
  unique (pouzivatel, ref_id, modul)
);

-- ============ OBĽÚBENÉ — bookmark (Môj DEED → Obľúbené) ============
create table if not exists public.oblubene (
  id         uuid primary key default gen_random_uuid(),
  pouzivatel uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref_id     text not null,
  typ        text,
  modul      text,
  nazov      text,
  emoji      text,
  lok        text,
  data       jsonb not null default '{}'::jsonb,   -- vyzbierane/ciel a iné extra
  vytvorene  timestamptz not null default now(),
  unique (pouzivatel, ref_id)
);
create index if not exists oblubene_pouzivatel_idx on public.oblubene(pouzivatel, vytvorene desc);

-- ============ PEŇAŽENKA — mock zostatok DEED (do event-sourced walletu) ============
create table if not exists public.penazenka (
  pouzivatel    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  zostatok_deed numeric(14,2) not null default 1240,
  aktualizovane timestamptz not null default now()
);

-- dobitie (mock kúpa DEED kartou) — pripíše a vráti nový zostatok.
-- SECURITY DEFINER, ale píše výhradne pre auth.uid() volajúceho → owner-safe.
create or replace function public.penazenka_dobit(p_deed numeric)
returns numeric
language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_zostatok numeric;
begin
  if v_uid is null then raise exception 'neprihlaseny'; end if;
  if p_deed is null or p_deed <= 0 then raise exception 'neplatna suma'; end if;
  insert into public.penazenka (pouzivatel, zostatok_deed)
    values (v_uid, 1240 + p_deed)
    on conflict (pouzivatel) do update
      set zostatok_deed = public.penazenka.zostatok_deed + p_deed,
          aktualizovane = now()
    returning zostatok_deed into v_zostatok;
  return v_zostatok;
end;
$fn$;
grant execute on function public.penazenka_dobit(numeric) to authenticated;

-- ============ RLS — OWNER-ONLY (vidím/píšem len svoje) ============
do $$
declare t text;
begin
  foreach t in array array['sprava','nahlasenie','rsvp','oblubene','penazenka'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
  end loop;
  execute 'create policy owner_all on public.sprava     for all to authenticated using (odosielatel  = auth.uid()) with check (odosielatel  = auth.uid())';
  execute 'create policy owner_all on public.nahlasenie for all to authenticated using (nahlasovatel = auth.uid()) with check (nahlasovatel = auth.uid())';
  execute 'create policy owner_all on public.rsvp       for all to authenticated using (pouzivatel   = auth.uid()) with check (pouzivatel   = auth.uid())';
  execute 'create policy owner_all on public.oblubene   for all to authenticated using (pouzivatel   = auth.uid()) with check (pouzivatel   = auth.uid())';
  execute 'create policy owner_all on public.penazenka  for all to authenticated using (pouzivatel   = auth.uid()) with check (pouzivatel   = auth.uid())';
end $$;
