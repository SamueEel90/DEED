-- ============================================================
-- 0143 · OPRAVY 449 · pozvánky na webe
-- ------------------------------------------------------------
-- 1. Osobná pozvánka (Môj QR → Pozvánka): odkaz deedgood.eu/u/<odkaz> otvorí profil usera.
--    Doteraz /p/<meno-x> hľadalo stránku s takým id a ukázalo prázdnu „farnosť“.
--    odkaz_osoby: stály krátky odkaz usera (z prezývky alebo mena), unikátny.
--    profil_osoby(odkaz): meno podľa jeho voľby zobrazenia (0001 zobrazenie.rezim), fotka, mesto len pri voľbe „mesto“.
-- 2. Pozvánka ku skutku (Opíšte skutok → Poslať pozvánku): odkaz deedgood.eu/pozvanka/<token> otvorí rovno
--    „… ťa pozýva ku skutku · Bol som pri tom“. Platí 2 hodiny. Potvrdiť môže len prihlásený, každý raz.
--    Organizátor vidí, kto potvrdil (pozvanky_skutku).
-- ============================================================
begin;

-- 1 ----------------------------------------------------------
create table if not exists public.odkaz_osoby (
  odkaz    text primary key check (odkaz ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  ucet_id  uuid not null unique references public.ucet(id) on delete cascade,
  vytvorene timestamptz not null default now()
);
alter table public.odkaz_osoby enable row level security;
revoke all on public.odkaz_osoby from anon, authenticated;

/** môj odkaz — vytvorí ho pri prvom volaní z návrhu (prezývka / meno-p), pri zhode pridá číslo */
create or replace function public.moj_odkaz(p_navrh text) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_o text; v_zaklad text; i int := 1;
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  select odkaz into v_o from public.odkaz_osoby where ucet_id = v_ja;
  if v_o is not null then return v_o; end if;
  v_zaklad := left(trim(both '-' from regexp_replace(lower(coalesce(p_navrh, '')), '[^a-z0-9]+', '-', 'g')), 36);
  if length(v_zaklad) < 2 then v_zaklad := 'clen'; end if;
  v_o := v_zaklad;
  while exists (select 1 from public.odkaz_osoby where odkaz = v_o) loop i := i + 1; v_o := v_zaklad || '-' || i; end loop;
  insert into public.odkaz_osoby (odkaz, ucet_id) values (v_o, v_ja);
  return v_o;
end $$;
revoke all on function public.moj_odkaz(text) from public, anon;
grant execute on function public.moj_odkaz(text) to authenticated, service_role;

/** verejný profil usera z odkazu; null = odkaz neexistuje */
create or replace function public.profil_osoby(p_odkaz text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'odkaz', o.odkaz,
    'meno', case coalesce(z.rezim, 'anonym')
              when 'cele' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(p.priezvisko, '')), '')
              when 'mesto' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(p.priezvisko, '')), '')
              when 'iniciala' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(left(p.priezvisko, 1) || '.', '')), '')
              when 'nick' then nullif(trim(z.nick), '')
              else null end,
    'mesto', case when z.rezim = 'mesto' then p.mesto end,
    'foto', case when coalesce(z.rezim, 'anonym') <> 'anonym' and p.profilovka_url like 'http%' then p.profilovka_url end,
    'od', u.vytvorene)
    from public.odkaz_osoby o
    join public.ucet u on u.id = o.ucet_id
    left join public.profil p on p.ucet_id = o.ucet_id
    left join public.zobrazenie z on z.ucet_id = o.ucet_id
   where o.odkaz = lower(p_odkaz);
$$;
revoke all on function public.profil_osoby(text) from public;
grant execute on function public.profil_osoby(text) to anon, authenticated, service_role;

-- 2 ----------------------------------------------------------
create table if not exists public.pozvanka_skutku (
  token      text primary key default encode(extensions.gen_random_bytes(12), 'hex'),
  skutok     text not null,                 -- id skutku v appke (skutok sa zverejní až neskôr)
  nazov      text not null,
  stranka    text references public.stranka(id) on delete cascade,  -- skutok za charitu
  od_ucet    uuid not null references public.ucet(id) on delete cascade,
  od_meno    text not null,                 -- „Pod korunami, o. z.“ alebo meno organizátora
  vytvorene  timestamptz not null default now(),
  plati_do   timestamptz not null default now() + interval '2 hours',
  prijal     uuid references public.ucet(id) on delete set null,
  prijal_meno text,
  prijate    timestamptz
);
create index if not exists pozvanka_skutku_skutok on public.pozvanka_skutku (skutok);
alter table public.pozvanka_skutku enable row level security;
revoke all on public.pozvanka_skutku from anon, authenticated;

/** nová pozvánka ku skutku; vráti token */
create or replace function public.pozvanka_vytvor(p_skutok text, p_nazov text, p_stranka text default null) returns text
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.moj_ucet(); v_meno text; v_t text;
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  if p_stranka is not null then
    if not public.spravujem_stranku(p_stranka) then raise exception 'Túto stránku nespravujete.' using errcode = '42501', detail = 'nie_spravca'; end if;
    select coalesce(nullif(trim(v.verejne->'registra'->>'nazov'), ''), nullif(trim(s.nazov), ''), 'Charita') into v_meno
      from public.stranka s left join public.nastavenia_stranky_verejne v on v.stranka = s.id where s.id = p_stranka;
  else
    select nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(left(p.priezvisko, 1) || '.', '')), '') into v_meno from public.profil p where p.ucet_id = v_ja;
  end if;
  insert into public.pozvanka_skutku (skutok, nazov, stranka, od_ucet, od_meno)
    values (left(p_skutok, 80), left(coalesce(nullif(trim(p_nazov), ''), 'Skutok'), 120), p_stranka, v_ja, coalesce(v_meno, 'Člen DEED+'))
    returning token into v_t;
  return v_t;
end $$;
revoke all on function public.pozvanka_vytvor(text, text, text) from public, anon;
grant execute on function public.pozvanka_vytvor(text, text, text) to authenticated, service_role;

/** čo pozvánka ukáže (aj bez prihlásenia) */
create or replace function public.pozvanka_info(p_token text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nazov', z.nazov, 'od', z.od_meno, 'stranka', z.stranka,
           'plati', z.plati_do > now(), 'plati_do', z.plati_do,
           'prijata', z.prijal is not null, 'moja', z.prijal is not null and z.prijal = public.moj_ucet(),
           'vlastna', z.od_ucet = public.moj_ucet())
    from public.pozvanka_skutku z where z.token = p_token;
$$;
revoke all on function public.pozvanka_info(text) from public;
grant execute on function public.pozvanka_info(text) to anon, authenticated, service_role;

/** „Bol som pri tom“ — prihlásený, v lehote, nie vlastná, každá pozvánka raz */
create or replace function public.pozvanka_prijmi(p_token text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); z public.pozvanka_skutku; v_meno text;
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  select * into z from public.pozvanka_skutku where token = p_token for update;
  if not found then raise exception 'Pozvánka neexistuje.' using errcode = '22023', detail = 'neexistuje'; end if;
  if z.od_ucet = v_ja then raise exception 'Vlastnú pozvánku potvrdiť nemôžete.' using errcode = '22023', detail = 'vlastna'; end if;
  if z.prijal is not null then
    if z.prijal = v_ja then return jsonb_build_object('nazov', z.nazov, 'od', z.od_meno); end if;
    raise exception 'Túto pozvánku už potvrdil niekto iný.' using errcode = '22023', detail = 'prijata';
  end if;
  if z.plati_do <= now() then raise exception 'Pozvánka už neplatí. Platí 2 hodiny.' using errcode = '22023', detail = 'neplati'; end if;
  select nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(left(p.priezvisko, 1) || '.', '')), '') into v_meno from public.profil p where p.ucet_id = v_ja;
  update public.pozvanka_skutku set prijal = v_ja, prijal_meno = coalesce(v_meno, 'Člen DEED+'), prijate = now() where token = p_token;
  return jsonb_build_object('nazov', z.nazov, 'od', z.od_meno);
end $$;
revoke all on function public.pozvanka_prijmi(text) from public, anon;
grant execute on function public.pozvanka_prijmi(text) to authenticated, service_role;

/** pozvánky skutku pre organizátora: kto potvrdil, čo čaká */
create or replace function public.pozvanky_skutku(p_skutok text) returns table (token text, prijal_meno text, prijate timestamptz, plati_do timestamptz)
  language sql stable security definer set search_path = public as $$
  select z.token, z.prijal_meno, z.prijate, z.plati_do from public.pozvanka_skutku z
   where z.skutok = p_skutok and z.od_ucet = public.moj_ucet() order by z.vytvorene;
$$;
revoke all on function public.pozvanky_skutku(text) from public, anon;
grant execute on function public.pozvanky_skutku(text) to authenticated, service_role;

commit;
