-- ============================================================
-- 0045 · Zadanie 3 — väzba zamestnanec ↔ firma v DB (identita, Martin 6. 10.)
-- ------------------------------------------------------------
-- Väzba sa viaže na ÚČTY (firma ↔ osoba), nikdy na meno. Appka pozná ľudí aj firmy podľa
-- verejného čísla účtu „U-…" → ucet.cislo (rovnaký výpočet ako src/lib/cisloObjektu.ts:
-- 9 číslic z FNV-1a hashu ucet.id + Luhn; kým server nemá radu objektov, je to testovacie číslo).
-- Stavy: pozvany (firma pozvala) · ziadost (človek požiadal) · potvrdeny · odmietnuty · odpojeny.
-- Obojstranné: čo začala firma, potvrdí človek; čo začal človek, potvrdí firma. Logika LEN tu (RPC).
-- Testovacie firmy (register v src/lib/firma.ts) dostanú účty s pevnými id; za testovaciu firmu
-- smie v ukážke konať ktokoľvek (ako testovací správca stránky v 0035) — pri ostrom štarte preč.
-- ============================================================
begin;

-- ---------- verejné číslo účtu (U-…) ----------
create or replace function public.vs_z_id(p_id text) returns text
  language plpgsql immutable as $$
declare h bigint := 2166136261; i int; n text;
begin
  for i in 1..length(p_id) loop
    h := h # ascii(substr(p_id, i, 1));
    h := (h * 16777619) % 4294967296;
  end loop;
  n := (100000000 + (h % 900000000))::text;
  return n || public.luhn9(n);
end $$;

alter table public.ucet add column if not exists cislo text generated always as ('U' || public.vs_z_id(id::text)) stored;
create index if not exists ucet_cislo_idx on public.ucet (cislo);

create or replace function public.ucet_podla_cisla(p_cislo text) returns uuid
  language sql stable security definer set search_path = public as $$
  select id from public.ucet where cislo = upper(regexp_replace(coalesce(p_cislo, ''), '[\s-]', '', 'g'))
$$;

-- ---------- testovacie firmy (pevné id = src/lib/firma.ts) ----------
insert into public.ucet (id, typ, stav_registracie) values
  ('f1000000-0000-4000-8000-000000000001', 'firma', 'testovaci'),   -- Pekáreň Dobrota (stránka pekaren)
  ('f1000000-0000-4000-8000-000000000002', 'firma', 'testovaci'),   -- Nordika SK
  ('f1000000-0000-4000-8000-000000000003', 'firma', 'testovaci'),   -- ITech Solutions
  ('f1000000-0000-4000-8000-000000000004', 'firma', 'testovaci'),   -- Zelená stavba
  ('f1000000-0000-4000-8000-000000000005', 'firma', 'testovaci'),   -- Kaviareň Pod Hradom
  ('f1000000-0000-4000-8000-000000000006', 'firma', 'testovaci'),   -- Kvety Viola
  ('f1000000-0000-4000-8000-000000000007', 'firma', 'testovaci'),   -- Herňa Eldorádo
  ('f1000000-0000-4000-8000-000000000008', 'firma', 'testovaci'),   -- Stávky Plus
  ('f1000000-0000-4000-8000-000000000009', 'firma', 'testovaci'),   -- Autoservis Kováč
  ('f1000000-0000-4000-8000-00000000000a', 'firma', 'testovaci'),   -- Elektro Mráz
  ('f1000000-0000-4000-8000-00000000000b', 'firma', 'testovaci')    -- Stavebniny Opatová
on conflict (id) do nothing;

-- stránka pekaren patrí účtu Pekárne (správcovia sa presunú)
do $$
declare v_stary uuid;
begin
  select ucet_id into v_stary from public.stranka where id = 'pekaren';
  if v_stary is not null and v_stary <> 'f1000000-0000-4000-8000-000000000001' then
    update public.statutar set org_ucet_id = 'f1000000-0000-4000-8000-000000000001' where org_ucet_id = v_stary;
    update public.stranka set ucet_id = 'f1000000-0000-4000-8000-000000000001' where id = 'pekaren';
  end if;
end $$;

-- ---------- väzby ----------
create table if not exists public.firma_zamestnanec (
  firma_ucet  uuid not null references public.ucet(id) on delete cascade,
  osoba_ucet  uuid not null references public.ucet(id) on delete cascade,
  stav        text not null check (stav in ('pozvany', 'ziadost', 'potvrdeny', 'odmietnuty', 'odpojeny')),
  zaciatok    text not null check (zaciatok in ('firma', 'osoba')),
  meno        text,                                   -- len na zobrazenie (doplní človek)
  kedy        timestamptz not null default now(),
  potvrdene   timestamptz,
  ukoncene    timestamptz,
  primary key (firma_ucet, osoba_ucet),
  check (firma_ucet <> osoba_ucet)
);
alter table public.firma_zamestnanec enable row level security;     -- bez politík: len cez funkcie nižšie

-- smiem konať za firmu? (štatutár / správca; testovacia firma = ktokoľvek v ukážke)
create or replace function public.konam_za_firmu(p_firma uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.statutar t where t.org_ucet_id = p_firma and t.osoba_ucet_id = public.moj_ucet())
      or exists (select 1 from public.ucet u where u.id = p_firma and u.typ = 'firma' and u.stav_registracie = 'testovaci')
$$;

create or replace function public.vazby_zamestnancov()
  returns table (firma text, osoba text, meno text, stav text, zaciatok text, kedy timestamptz, potvrdene timestamptz, ukoncene timestamptz)
  language sql stable security definer set search_path = public as $$
  select f.cislo, o.cislo, v.meno, v.stav, v.zaciatok, v.kedy, v.potvrdene, v.ukoncene
    from public.firma_zamestnanec v
    join public.ucet f on f.id = v.firma_ucet
    join public.ucet o on o.id = v.osoba_ucet
   where v.osoba_ucet = public.moj_ucet() or public.konam_za_firmu(v.firma_ucet)
$$;

-- jeden vstup pre všetky kroky (akcia: pozvi · poziadaj · potvrd · odmietni · odpoj)
create or replace function public.zamestnanec_akcia(p_akcia text, p_firma text, p_osoba text default null, p_meno text default null)
  returns text
  language plpgsql volatile security definer set search_path = public as $$
declare
  v_ja uuid := public.moj_ucet();
  v_firma uuid := public.ucet_podla_cisla(p_firma);
  v_osoba uuid := coalesce(public.ucet_podla_cisla(p_osoba), v_ja);
  v_za_firmu boolean; v_som_osoba boolean; r public.firma_zamestnanec;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if v_firma is null or not exists (select 1 from public.ucet where id = v_firma and typ = 'firma') then
    raise exception 'Firma s týmto číslom nie je v DEED.' using errcode = '22023', detail = 'firma_neznama';
  end if;
  if v_osoba is null then raise exception 'Účet s týmto číslom nie je v DEED.' using errcode = '22023', detail = 'osoba_neznama'; end if;
  v_za_firmu := public.konam_za_firmu(v_firma);
  v_som_osoba := v_osoba = v_ja;
  select * into r from public.firma_zamestnanec where firma_ucet = v_firma and osoba_ucet = v_osoba for update;

  if p_akcia = 'pozvi' then
    if not v_za_firmu then raise exception 'cudzia_firma' using errcode = '42501'; end if;
    if found and r.stav in ('pozvany', 'ziadost', 'potvrdeny') then return r.stav; end if;
    insert into public.firma_zamestnanec (firma_ucet, osoba_ucet, stav, zaciatok, kedy)
      values (v_firma, v_osoba, 'pozvany', 'firma', now())
      on conflict (firma_ucet, osoba_ucet) do update set stav = 'pozvany', zaciatok = 'firma', kedy = now(), potvrdene = null, ukoncene = null;
    return 'pozvany';
  elsif p_akcia = 'poziadaj' then
    if not v_som_osoba then raise exception 'cudzi_ucet' using errcode = '42501'; end if;
    if found and r.stav in ('pozvany', 'ziadost', 'potvrdeny') then return r.stav; end if;
    insert into public.firma_zamestnanec (firma_ucet, osoba_ucet, stav, zaciatok, meno, kedy)
      values (v_firma, v_osoba, 'ziadost', 'osoba', nullif(trim(p_meno), ''), now())
      on conflict (firma_ucet, osoba_ucet) do update set stav = 'ziadost', zaciatok = 'osoba', meno = coalesce(excluded.meno, public.firma_zamestnanec.meno), kedy = now(), potvrdene = null, ukoncene = null;
    return 'ziadost';
  elsif p_akcia = 'potvrd' then
    if not found or r.stav not in ('pozvany', 'ziadost') then raise exception 'Nie je čo potvrdiť.' using errcode = '22023', detail = 'nie_je_co'; end if;
    -- pozvánku potvrdzuje človek, žiadosť firma
    if (r.stav = 'pozvany' and not v_som_osoba) or (r.stav = 'ziadost' and not v_za_firmu) then
      raise exception 'Túto väzbu potvrdzuje druhá strana.' using errcode = '42501', detail = 'druha_strana';
    end if;
    update public.firma_zamestnanec set stav = 'potvrdeny', potvrdene = now(),
      meno = case when v_som_osoba then coalesce(nullif(trim(p_meno), ''), meno) else meno end
     where firma_ucet = v_firma and osoba_ucet = v_osoba;
    return 'potvrdeny';
  elsif p_akcia in ('odmietni', 'odpoj') then
    if not (v_som_osoba or v_za_firmu) then raise exception 'cudzia_vazba' using errcode = '42501'; end if;
    if not found then return null; end if;
    update public.firma_zamestnanec set stav = case when p_akcia = 'odmietni' then 'odmietnuty' else 'odpojeny' end, ukoncene = now()
     where firma_ucet = v_firma and osoba_ucet = v_osoba;
    return case when p_akcia = 'odmietni' then 'odmietnuty' else 'odpojeny' end;
  end if;
  raise exception 'neznama_akcia' using errcode = '22023';
end $$;

-- som potvrdeným zamestnancom firmy? (dorovnanie len pre zamestnancov)
create or replace function public.je_zamestnanec(p_firma uuid, p_osoba uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.firma_zamestnanec where firma_ucet = p_firma and osoba_ucet = p_osoba and stav = 'potvrdeny')
$$;

revoke all on function public.vazby_zamestnancov(), public.zamestnanec_akcia(text, text, text, text) from public;
grant execute on function public.vazby_zamestnancov(), public.zamestnanec_akcia(text, text, text, text) to authenticated;
grant execute on function public.ucet_podla_cisla(text) to authenticated;

commit;
