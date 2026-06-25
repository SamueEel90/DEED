-- ============================================================
-- DEED · Registrácia (fyzická osoba + charita/OZ) — schéma v1
-- Podľa funkčných špecifikácií:
--   · DEED_Registracia_Fyzicka_Osoba (§13 Dátové entity)
--   · DEED_Registracia_Charita_OZ    (§11 Dátové entity)
-- Univerzálny základ (Účet) zdieľajú osoba aj charita.
-- Identifikátory bez diakritiky (ASCII), dátové hodnoty s diakritikou OK.
-- POZN.: RLS politiky na konci sú TEST-ONLY (povolia všetko) — pred
--        ostrým nasadením ich nahradiť reálnymi (po napojení Auth).
-- ============================================================

-- ---------- UNIVERZÁLNY ZÁKLAD ----------

-- Účet — vstupná entita, na ktorú sa vešia všetko (osoba aj charita)
create table public.ucet (
  id                uuid primary key default gen_random_uuid(),
  typ               text not null default 'aktivny'
                      check (typ in ('pasivny','aktivny','charita')),
  telefon           text unique,                 -- overené číslo = kľúč k účtu (§4.1)
  telefon_overeny   boolean not null default false,
  email             text,                        -- charita: povinný a overený (§2.1)
  email_overeny     boolean not null default false,
  pin_hash          text,                        -- PIN/heslo (§4.2) — hash, nie plaintext
  biometria         boolean not null default false,
  stav_registracie  text not null default 'telefon', -- priebežné ukladanie (§11)
  poradove_cislo    bigint generated always as identity, -- registračné poradie ("pôvodný člen")
  vytvorene         timestamptz not null default now(),
  aktualizovane     timestamptz not null default now()
);
comment on table public.ucet is 'Univerzálny účet (osoba/charita). Doklad ani biometria sa neukladajú.';

-- ---------- FYZICKÁ OSOBA ----------

-- Profil — povinné údaje, ktoré user zadá sám (§5). Doklad sa pri KYC len POROVNÁVA.
create table public.profil (
  ucet_id        uuid primary key references public.ucet(id) on delete cascade,
  meno           text,
  druhe_meno     text,
  priezvisko     text,
  titul          text,
  rok_narodenia  int,            -- len rok (data minimisation, §5)
  ulica          text,
  popisne_cislo  text,           -- nepovinné
  mesto          text,
  psc            text,
  krajina        text,
  profilovka_url text,           -- Foto (nepovinné, §6 mock 6)
  aktualizovane  timestamptz not null default now()
);

-- Zobrazenie v aplikácii (§7) — ako usera vidí komunita
create table public.zobrazenie (
  ucet_id  uuid primary key references public.ucet(id) on delete cascade,
  rezim    text not null default 'anonym'
             check (rezim in ('cele','iniciala','nick','mesto','anonym')),
  nick     text
);

-- Záujmy (§6) — otvorený číselník; 1 riadok = 1 zaškrtnutá pod-položka
create table public.zaujmy (
  id          bigint generated always as identity primary key,
  ucet_id     uuid not null references public.ucet(id) on delete cascade,
  oblast      text not null,
  pod_polozka text not null,
  vlastny     boolean not null default false,   -- user dopísal "vlastný"
  unique (ucet_id, oblast, pod_polozka)
);

-- Lokalita (§6.3) — verejne len región, nikdy presná poloha
create table public.lokalita (
  ucet_id  uuid primary key references public.ucet(id) on delete cascade,
  region   text,
  mesto    text,
  stvrt    text,
  zdroj    text check (zdroj in ('gps','manual')),
  lat      double precision,     -- interne (akcie v okolí), nezobrazuje sa verejne
  lng      double precision
);

-- KYC (§8) — ukladáme len VÝSLEDOK zhody; doklad/biometriu NIE
create table public.kyc (
  id        bigint generated always as identity primary key,
  ucet_id   uuid not null references public.ucet(id) on delete cascade,
  vendor    text default 'mock',                -- 'didit' | 'mock'
  vysledok  text default 'caka'
              check (vysledok in ('caka','sedi','nesedi','sporne')),
  sposob    text check (sposob in ('nove','reusable')),
  cas       timestamptz not null default now()
);

-- Súhlasy (§9) — briefing + čestné vyhlásenie + reusable audit log
create table public.suhlasy (
  id       bigint generated always as identity primary key,
  ucet_id  uuid not null references public.ucet(id) on delete cascade,
  druh     text not null check (druh in ('briefing','cestne_vyhlasenie','reusable')),
  hodnota  boolean not null default true,
  cas      timestamptz not null default now(),
  detail   jsonb                                -- audit info (napr. pri reusable použití)
);

-- Dar (§2) — pasívny (host) aj registrovaný; anonym = ucet_id NULL
create table public.dar (
  id          bigint generated always as identity primary key,
  ucet_id     uuid references public.ucet(id) on delete set null,
  suma_eur    numeric(10,2) not null,
  kanal       text not null check (kanal in ('fiat','sms','deed')),
  prijemca    text,                              -- charita/prípad (zatiaľ text)
  zobrazenie  text,                              -- ako sa dar zobrazí (anonym default)
  cas         timestamptz not null default now()
);

-- ---------- CHARITA / OZ (nadstavba nad účtom typu 'charita') ----------

-- Organizácia (§5) — údaje z registra sú zamknuté
create table public.organizacia (
  ucet_id        uuid primary key references public.ucet(id) on delete cascade,
  ico            text,
  nazov          text,          -- z registra (zamknuté)
  sidlo          text,          -- z registra (zamknuté)
  datum_vzniku   date,          -- z registra (zamknuté)
  pravna_forma   text,          -- z registra (zamknuté)
  bankovy_ucet   text,          -- na výplatu darov (overiť)
  z_registra     boolean not null default false
);

-- Štatutár (§4) — overená osoba ↔ charita; účty sú ODDELENÉ
create table public.statutar (
  id              bigint generated always as identity primary key,
  org_ucet_id     uuid not null references public.ucet(id) on delete cascade,   -- účet charity
  osoba_ucet_id   uuid references public.ucet(id) on delete set null,           -- osobný účet štatutára
  opravnenie      text,          -- z KYB registra (kto smie konať)
  unique (org_ucet_id, osoba_ucet_id)
);

-- KYB (§3) — overenie organizácie (Didit KYB / fallback RPO/ORSR)
create table public.kyb (
  id            bigint generated always as identity primary key,
  org_ucet_id   uuid not null references public.ucet(id) on delete cascade,
  vendor        text default 'mock',
  vysledok      text default 'caka'
                  check (vysledok in ('caka','overena','zamietnuta')),
  stanovy_ref   text,            -- odkaz na nahrané stanovy (Storage)
  aml           text,            -- výsledok AML kontroly
  cas           timestamptz not null default now()
);

-- Profil charity (§5) — časť zamknutá z registra, časť dopĺňa charita
create table public.profil_charity (
  org_ucet_id  uuid primary key references public.ucet(id) on delete cascade,
  misia        text,
  vysledky     text,
  web          text,
  siete        jsonb default '[]'::jsonb,   -- [{typ, url, overene}]
  logo_url     text,
  cover_url    text,
  uplnost      int not null default 0       -- % úplnosti profilu = dôvera
);

-- Dobrovoľníctvo (§5.2) — párovací príznak pre VTO / jednotlivcov
create table public.dobrovolnictvo (
  org_ucet_id   uuid primary key references public.ucet(id) on delete cascade,
  zaujem        boolean not null default false,
  typ           text[] not null default '{}', -- jednorazove/dlhodobe/odborne/podla_potreby
  aktivne_vyzvy int not null default 0
);

-- Segmenty (§6) — sektor + pod-segmenty z číselníka (výber podľa stanov)
create table public.segmenty (
  id           bigint generated always as identity primary key,
  org_ucet_id  uuid not null references public.ucet(id) on delete cascade,
  sektor       text not null,
  pod_segment  text,
  vlastny      boolean not null default false,
  unique (org_ucet_id, sektor, pod_segment)
);

-- Pobočka (§7.1) — pridáva len overená centrála
create table public.pobocka (
  id                bigint generated always as identity primary key,
  centrala_ucet_id  uuid not null references public.ucet(id) on delete cascade,
  mesto             text not null,
  rezim             text not null check (rezim in ('samostatna','pod_centralou')),
  ico               text,
  bankovy_ucet      text,
  statutar_ucet_id  uuid references public.ucet(id) on delete set null,
  pocitadlo         int not null default 0
);

-- Počítadlá (§7.2) — tri úrovne (platforma/centrála/pobočka)
create table public.pocitadla (
  id                bigint generated always as identity primary key,
  subjekt_ucet_id   uuid not null references public.ucet(id) on delete cascade,
  uroven            text not null check (uroven in ('platforma','centrala','pobocka')),
  pocet_akcii       int not null default 0
);

-- Balík (§9) — registrácia je free; funkcie sa dokupujú za ňou
create table public.balik (
  org_ucet_id   uuid primary key references public.ucet(id) on delete cascade,
  plan          text not null default 'free' check (plan in ('free','basic','pro','enterprise')),
  platnost_do   date,
  funkcie       jsonb not null default '{}'::jsonb
);

-- ---------- ČÍSELNÍKY (otvorené — rastú podľa dopytu) ----------

-- Číselník záujmov osoby: oblasť → pod-položka (§6.2)
create table public.cis_zaujmy (
  id           bigint generated always as identity primary key,
  oblast       text not null,
  pod_polozka  text not null,
  poradie      int not null default 0,
  aktivny      boolean not null default true,
  unique (oblast, pod_polozka)
);

-- Číselník sektorov charity: sektor → pod-segment (§6.2)
create table public.cis_segmenty (
  id           bigint generated always as identity primary key,
  sektor       text not null,
  pod_segment  text not null,
  od_balika    text not null default 'basic' check (od_balika in ('free','basic','pro','enterprise')),
  poradie      int not null default 0,
  aktivny      boolean not null default true,
  unique (sektor, pod_segment)
);

-- ---------- INDEXY ----------
create index on public.zaujmy (ucet_id);
create index on public.segmenty (org_ucet_id);
create index on public.dar (cas desc);
create index on public.statutar (osoba_ucet_id);

-- ---------- RLS (TEST-ONLY: povoliť všetko pre anon/authenticated) ----------
-- TODO: nahradiť reálnymi politikami po napojení Supabase Auth.
do $$
declare t text;
begin
  foreach t in array array[
    'ucet','profil','zobrazenie','zaujmy','lokalita','kyc','suhlasy','dar',
    'organizacia','statutar','kyb','profil_charity','dobrovolnictvo','segmenty',
    'pobocka','pocitadla','balik','cis_zaujmy','cis_segmenty'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists test_all_access on public.%I', t);
    execute format(
      'create policy test_all_access on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
