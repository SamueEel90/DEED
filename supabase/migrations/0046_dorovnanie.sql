-- ============================================================
-- 0046 · Zadanie 3 · 3.3 — DOROVNANIE: jediná implementácia, v DB (nad escrow zo Zadania 2)
-- ------------------------------------------------------------
-- Stavový automat sa prenáša z src/lib/dorovnanie.ts 1 : 1 (nevymýšľa sa):
--   zapecatene → (charita potvrdí) potvrdene → (Spustiť) aktivne → vycerpane | pozastavene → ukoncene
--   zapecatene → aktivne samo po 48 h (tichý súhlas) — LEN pri úhrade cez DEED; prevod mimo DEED nikdy samo
--   odmietnutie charitou do 24 h od oznámenia (dôvod povinný) → pozastavene + vrátenie celej sumy
--   „Neprišli" (po 24 h) → odmietnute · predčasné ukončenie → pozastavene + vrátenie zvyšku · vratný doklad s VS
-- Peniaze (ledger, 0037): úhrada cez DEED = hneď pohyby procesor → firma → viazané (escrow);
--   úhrada mimo DEED = záznam s dokladom čaká na potvrdenie charity, pohyby vzniknú až pri potvrdení.
--   Dorovnanie k daru = presun viazané → príjemca (nie nový dar). Vrátenie = viazané → firma, typ vratenie, VS dokladu.
-- Cieľ dorovnania musí existovať: zbierka stránky v DB, alebo cieľ zaregistrovaný v dorovnanie_ciel
--   (testovacie ciele len na testovacích stránkach) — príjemca je vždy účet stránky.
-- Zapečatené parametre sa nedajú zmeniť ani priamym UPDATE (trigger); jediná zmena = doliatie stropu.
-- Appka len zobrazuje (rpc dorovnania_nacitaj) a posiela kroky (dorovnanie_krok / _zapecat / _dar).
-- ============================================================
begin;

-- ---------- údaje firmy, ktoré potrebuje server (názov, odvetvie pre obmedzenia) ----------
create table if not exists public.firma_udaje (
  ucet_id   uuid primary key references public.ucet(id) on delete cascade,
  nazov     text not null,
  odvetvie  text
);
insert into public.firma_udaje (ucet_id, nazov, odvetvie) values
  ('f1000000-0000-4000-8000-000000000001', 'Pekáreň Dobrota s.r.o.', 'Gastro'),
  ('f1000000-0000-4000-8000-000000000002', 'Nordika SK', 'Retail'),
  ('f1000000-0000-4000-8000-000000000003', 'ITech Solutions', 'IT'),
  ('f1000000-0000-4000-8000-000000000004', 'Zelená stavba', 'Stavebníctvo'),
  ('f1000000-0000-4000-8000-000000000005', 'Kaviareň Pod Hradom', 'Gastro'),
  ('f1000000-0000-4000-8000-000000000006', 'Kvety Viola', 'Služby'),
  ('f1000000-0000-4000-8000-000000000007', 'Herňa Eldorádo s.r.o.', 'Kasína a herne'),
  ('f1000000-0000-4000-8000-000000000008', 'Stávky Plus a.s.', 'Stávkové kancelárie'),
  ('f1000000-0000-4000-8000-000000000009', 'Autoservis Kováč s.r.o.', 'Služby'),
  ('f1000000-0000-4000-8000-00000000000a', 'Elektro Mráz s.r.o.', 'Obchod'),
  ('f1000000-0000-4000-8000-00000000000b', 'Stavebniny Opatová s.r.o.', 'Stavebníctvo')
on conflict (ucet_id) do nothing;
alter table public.firma_udaje enable row level security;
drop policy if exists citaj on public.firma_udaje;
create policy citaj on public.firma_udaje for select to anon, authenticated using (true);

-- ---------- ciele, obmedzenia ----------
create table if not exists public.dorovnanie_ciel (
  ciel      text primary key,
  stranka   text not null references public.stranka(id),
  nazov     text not null,
  vytvorene timestamptz not null default now()
);
alter table public.dorovnanie_ciel enable row level security;

create table if not exists public.dorovnanie_obmedzenie (
  stranka   text primary key references public.stranka(id),
  zapnute   boolean not null default false,
  odvetvia  text[] not null default array['Kasína a herne', 'Stávkové kancelárie', 'Obsah pre dospelých'],
  firmy     text[] not null default '{}'               -- čísla účtov firiem (U-…)
);
alter table public.dorovnanie_obmedzenie enable row level security;

-- ---------- dorovnanie + záznamy ----------
create table if not exists public.dorovnanie (
  id               text primary key,
  entita           text not null,                     -- kľúč subjektu v appke („charita", „fara:12"…)
  stranka          text not null references public.stranka(id),
  prijemca_ucet    uuid not null references public.ucet(id),
  ciel             text not null,
  ciel_nazov       text not null,
  firma_ucet       uuid not null references public.ucet(id),
  firma_nazov      text not null,
  firma_logo       text,
  pomer            numeric(6,2) not null check (pomer > 0),
  strop            numeric(14,2) not null check (strop > 0),
  strop_daru       numeric(14,2) check (strop_daru is null or strop_daru > 0),
  od               timestamptz not null,
  koniec           timestamptz not null,
  do_vycerpania    boolean not null default false,
  zvysok           text not null default 'zbierke' check (zvysok in ('zbierke', 'firme')),
  stav             text not null default 'zapecatene' check (stav in ('zapecatene','potvrdene','aktivne','pozastavene','vycerpane','ukoncene','odmietnute','zrusene')),
  len_zamestnanci  boolean not null default false,
  len_tvorca       text,
  tvorca_nazov     text,
  suhlas_tvorcu    text check (suhlas_tvorcu in ('caka', 'prijate', 'odmietnute')),
  kanal            text not null default 'karta' check (kanal in ('karta', 'krypto', 'sepa')),
  uhrada           text not null default 'deed' check (uhrada in ('deed', 'mimo')),
  automaticky      boolean not null default false,
  doklad           text not null,                     -- doklad zapečatenia (rada dokladov)
  escrow_id        uuid references public.escrow(id),
  financovane      boolean not null default false,    -- peniaze sú v ledgeri na viazanom účte
  testovaci        boolean not null default false,
  zapecatene       timestamptz not null default now(),
  oznamene         timestamptz not null default now(),
  zaplatene        timestamptz,
  ukoncene         timestamptz,
  pozastavene      timestamptz,
  vysporiadane     jsonb,
  odmietnutie      jsonb,                             -- {dovod, kedy} — vidí len DEED a charita
  neprisli         timestamptz,
  vratenie         jsonb,                             -- {suma, do, vs, cez?, doklad?, kedy?}
  upozornena_firma timestamptz,
  skryte           timestamptz,                       -- „zmazať" uzavreté = skryť, nikdy fyzicky
  check (koniec > od)
);
create index if not exists dorovnanie_ciel_idx on public.dorovnanie (ciel);
create index if not exists dorovnanie_firma_idx on public.dorovnanie (firma_ucet);
alter table public.dorovnanie enable row level security;

create table if not exists public.dorovnanie_zaznam (
  id             bigint generated always as identity primary key,
  dorovnanie_id  text not null references public.dorovnanie(id),
  dar            numeric(14,2) not null check (dar > 0),
  dorovnane      numeric(14,2) not null check (dorovnane > 0),
  kedy           timestamptz not null default now(),
  darca          text,                                -- len meno na zobrazenie
  darca_ucet     uuid references public.ucet(id),
  pohyb_id       bigint references public.pohyb(id),
  idem           text,
  unique (dorovnanie_id, idem)
);
alter table public.dorovnanie_zaznam enable row level security;

-- ---------- zámok zapečatených parametrov (3.6) ----------
create or replace function public.dorovnanie_pecat() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Dorovnanie sa nemaže.' using errcode = '42501', detail = 'zapecatene'; end if;
  if (new.entita, new.stranka, new.prijemca_ucet, new.ciel, new.firma_ucet, new.pomer, new.strop_daru, new.od, new.koniec,
      new.do_vycerpania, new.zvysok, new.len_zamestnanci, new.len_tvorca, new.kanal, new.uhrada, new.doklad, new.zapecatene)
     is distinct from
     (old.entita, old.stranka, old.prijemca_ucet, old.ciel, old.firma_ucet, old.pomer, old.strop_daru, old.od, old.koniec,
      old.do_vycerpania, old.zvysok, old.len_zamestnanci, old.len_tvorca, old.kanal, old.uhrada, old.doklad, old.zapecatene)
     or new.strop < old.strop then
    raise exception 'Dorovnanie je zapečatené — parametre sa nedajú zmeniť (strop sa dá len doliať).' using errcode = '42501', detail = 'zapecatene';
  end if;
  return new;
end $$;
drop trigger if exists dorovnanie_pecat on public.dorovnanie;
create trigger dorovnanie_pecat before update or delete on public.dorovnanie for each row execute function public.dorovnanie_pecat();
drop trigger if exists dorovnanie_zaznam_nemenny on public.dorovnanie_zaznam;
create trigger dorovnanie_zaznam_nemenny before update or delete on public.dorovnanie_zaznam for each row execute function public.pohyb_nemenny();

-- ---------- pomocné ----------
create or replace function public.dorovnanie_zostatok(p_id text) returns numeric
  language sql stable security definer set search_path = public as $$
  select greatest(0, d.strop - coalesce((select sum(z.dorovnane) from public.dorovnanie_zaznam z where z.dorovnanie_id = d.id), 0))
    from public.dorovnanie d where d.id = p_id
$$;

-- smiem konať za charitu (stránku)? testovacia stránka = ktokoľvek v ukážke
create or replace function public.konam_za_stranku(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.spravujem_stranku(p_stranka) or exists (select 1 from public.stranka where id = p_stranka and testovacia)
$$;

-- peniaze firmy na viazaný účet (escrow). p_test = z testovacej pokladne (ukážkové dáta)
create or replace function public.dorovnanie_financuj(p_id text, p_suma numeric, p_test boolean default false) returns void
  language plpgsql security definer set search_path = public as $$
declare d public.dorovnanie; v_doklad text := public.novy_doklad(); v_kanal text; v_e uuid;
begin
  select * into d from public.dorovnanie where id = p_id for update;
  if p_suma <= 0 then return; end if;
  v_kanal := case d.kanal when 'karta' then 'fiat' else 'sepa' end;
  v_e := d.escrow_id;
  if v_e is null then
    insert into public.escrow (typ, vklad, mena, sponzor, pravidlo, stav)
      values ('matching', p_suma, 'EUR', d.firma_ucet, jsonb_build_object('dorovnanie', d.id), 'aktivny') returning id into v_e;
  else
    update public.escrow set vklad = vklad + p_suma where id = v_e;
  end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, testovaci)
    values (v_doklad, 1, 'dobitie',
            case when p_test then public.ucet_systemu('testovacia_pokladna') else public.ucet_systemu('procesor') end,
            d.firma_ucet, p_suma, 'EUR', v_kanal, v_e, p_test),
           (v_doklad, 2, 'dorovnanie', d.firma_ucet, public.ucet_systemu('viazane'), p_suma, 'EUR', v_kanal, v_e, p_test);
  update public.dorovnanie set escrow_id = v_e, financovane = true where id = p_id;
end $$;

-- viazané → príjemca (dorovnanie daru / zvyšok zbierke) alebo viazané → firma (vrátenie)
create or replace function public.dorovnanie_presun(p_id text, p_suma numeric, p_firme boolean, p_vs text default null) returns bigint
  language plpgsql security definer set search_path = public as $$
declare d public.dorovnanie; v_pohyb bigint; v_doklad text := coalesce(p_vs, public.novy_doklad());
begin
  select * into d from public.dorovnanie where id = p_id;
  if not d.financovane or p_suma <= 0 then return null; end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, vs, testovaci)
    values (v_doklad, 1, case when p_firme then 'vratenie' else 'dorovnanie' end,
            public.ucet_systemu('viazane'), case when p_firme then d.firma_ucet else d.prijemca_ucet end,
            least(p_suma, public.escrow_zostatok(d.escrow_id)), 'EUR', case d.kanal when 'karta' then 'fiat' else 'sepa' end,
            d.escrow_id, case when p_firme then v_doklad end, d.testovaci)
    returning id into v_pohyb;
  return v_pohyb;
end $$;

-- lenivé prechody v čase (tichý súhlas po 48 h) — volá sa pri každom čítaní a kroku
create or replace function public.dorovnania_obnov() returns void
  language plpgsql security definer set search_path = public as $$
begin
  update public.dorovnanie
     set stav = 'aktivne', zaplatene = oznamene + interval '48 hours', automaticky = true
   where stav = 'zapecatene' and uhrada <> 'mimo' and now() >= oznamene + interval '48 hours';
end $$;

-- beží teraz? (rovnaké pravidlo ako lib: aktívne, v termíne, zostatok > 0, súhlas tvorcu)
create or replace function public.dorovnanie_bezi(d public.dorovnanie) returns boolean
  language sql stable security definer set search_path = public as $$
  select d.stav = 'aktivne' and now() between d.od and d.koniec and public.dorovnanie_zostatok(d.id) > 0
     and (d.len_tvorca is null or d.suhlas_tvorcu = 'prijate')
$$;

-- smie firma dorovnávať zbierky tejto stránky?
create or replace function public.dorovnanie_smie(p_stranka text, p_firma uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select not coalesce((
    select o.zapnute and ((select cislo from public.ucet where id = p_firma) = any (array(select upper(regexp_replace(x, '[\s-]', '', 'g')) from unnest(o.firmy) x))
                          or (select odvetvie from public.firma_udaje where ucet_id = p_firma) = any (o.odvetvia))
      from public.dorovnanie_obmedzenie o where o.stranka = p_stranka), false)
$$;

-- riadok pre appku (zaznamy s menami darcov len pre charitu a firmu)
create or replace function public.dorovnanie_json(d public.dorovnanie) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', d.id, 'entita', d.entita, 'stranka', d.stranka, 'ciel', d.ciel, 'cielNazov', d.ciel_nazov,
    'firmaUcet', (select cislo from public.ucet where id = d.firma_ucet), 'firma', d.firma_nazov, 'firmaLogo', d.firma_logo,
    'pomer', d.pomer, 'strop', d.strop, 'stropDaru', d.strop_daru, 'od', d.od, 'do', d.koniec, 'doVycerpania', d.do_vycerpania,
    'zvysok', d.zvysok, 'stav', d.stav, 'lenZamestnanci', d.len_zamestnanci, 'lenTvorca', d.len_tvorca, 'tvorcaNazov', d.tvorca_nazov,
    'suhlasTvorcu', d.suhlas_tvorcu, 'kanal', d.kanal, 'uhrada', d.uhrada, 'automaticky', d.automaticky, 'doklad', d.doklad,
    'zapecatene', d.zapecatene, 'oznamene', d.oznamene, 'zaplatene', d.zaplatene, 'ukoncene', d.ukoncene, 'pozastavene', d.pozastavene,
    'vysporiadane', d.vysporiadane, 'neprisli', d.neprisli, 'vratenie', d.vratenie, 'upozornenaFirma', d.upozornena_firma,
    'odmietnutie', case when public.konam_za_stranku(d.stranka) then d.odmietnutie end,
    'zaznamy', coalesce((select jsonb_agg(jsonb_build_object(
        'id', z.id::text, 'dar', z.dar, 'dorovnane', z.dorovnane, 'kedy', z.kedy,
        'darca', case when public.konam_za_stranku(d.stranka) or public.konam_za_firmu(d.firma_ucet) then z.darca end,
        'darcaUcet', case when public.konam_za_stranku(d.stranka) or public.konam_za_firmu(d.firma_ucet) then (select cislo from public.ucet where id = z.darca_ucet) end
      ) order by z.kedy) from public.dorovnanie_zaznam z where z.dorovnanie_id = d.id), '[]'::jsonb))
$$;

-- ---------- RPC: čítanie ----------
create or replace function public.dorovnania_nacitaj() returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.dorovnania_obnov();
  return coalesce((select jsonb_agg(public.dorovnanie_json(d) order by d.zapecatene desc) from public.dorovnanie d where d.skryte is null), '[]'::jsonb);
end $$;

create or replace function public.dorovnanie_obmedzenie_citaj(p_stranka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('zapnute', zapnute, 'odvetvia', to_jsonb(odvetvia), 'firmy', to_jsonb(firmy))
                     from public.dorovnanie_obmedzenie where stranka = p_stranka),
                  jsonb_build_object('zapnute', false, 'odvetvia', to_jsonb(array['Kasína a herne', 'Stávkové kancelárie', 'Obsah pre dospelých']), 'firmy', '[]'::jsonb))
$$;

create or replace function public.dorovnanie_smie_cislo(p_stranka text, p_firma text) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.dorovnanie_smie(p_stranka, public.ucet_podla_cisla(p_firma))
$$;

-- ---------- RPC: charita nastaví obmedzenie, zaregistruje cieľ ----------
create or replace function public.dorovnanie_obmedzenie_uloz(p_stranka text, p_zapnute boolean, p_odvetvia text[], p_firmy text[]) returns void
  language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.konam_za_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  insert into public.dorovnanie_obmedzenie (stranka, zapnute, odvetvia, firmy) values (p_stranka, p_zapnute, coalesce(p_odvetvia, '{}'), coalesce(p_firmy, '{}'))
    on conflict (stranka) do update set zapnute = excluded.zapnute, odvetvia = excluded.odvetvia, firmy = excluded.firmy;
end $$;

create or replace function public.dorovnanie_ciel_pridaj(p_ciel text, p_stranka text, p_nazov text) returns void
  language plpgsql volatile security definer set search_path = public as $$
begin
  if not exists (select 1 from public.stranka where id = p_stranka and testovacia) then
    raise exception 'Cieľ dorovnania musí byť zbierka stránky v DEED.' using errcode = '42501', detail = 'ciel_neexistuje';
  end if;
  insert into public.dorovnanie_ciel (ciel, stranka, nazov) values (p_ciel, p_stranka, coalesce(nullif(trim(p_nazov), ''), p_ciel))
    on conflict (ciel) do nothing;
end $$;

-- ---------- RPC: firma zapečatí ----------
create or replace function public.dorovnanie_zapecat(p jsonb) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare
  v_firma uuid := public.ucet_podla_cisla(p->>'firmaUcet'); v_stranka text; v_ciel_nazov text; v_prijemca uuid;
  v_id text := 'dv-' || replace(gen_random_uuid()::text, '-', ''); d public.dorovnanie; v_pomer numeric := (p->>'pomer')::numeric;
  v_test boolean;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if v_firma is null or not public.konam_za_firmu(v_firma) then raise exception 'Za túto firmu nemôžete konať.' using errcode = '42501', detail = 'cudzia_firma'; end if;
  -- cieľ musí existovať: zbierka stránky v DB alebo zaregistrovaný cieľ
  select z.stranka, z.nazov into v_stranka, v_ciel_nazov from public.zbierka z where z.id = p->>'ciel' and z.stranka is not null;
  if v_stranka is null then select c.stranka, c.nazov into v_stranka, v_ciel_nazov from public.dorovnanie_ciel c where c.ciel = p->>'ciel'; end if;
  if v_stranka is null then raise exception 'Cieľ dorovnania v DEED neexistuje.' using errcode = '22023', detail = 'ciel_neexistuje'; end if;
  v_prijemca := public.ucet_stranky(v_stranka);
  if v_prijemca is null then raise exception 'Stránka nemá účet.' using errcode = '22023', detail = 'bez_prijemcu'; end if;
  if not public.dorovnanie_smie(v_stranka, v_firma) then raise exception 'Táto zbierka dorovnanie od vás neprijíma.' using errcode = '42501', detail = 'obmedzene'; end if;
  if v_pomer is null or v_pomer not in (0.5, 1, 2, 5) then raise exception 'Neplatný pomer dorovnania.' using errcode = '22023', detail = 'pomer'; end if;
  if coalesce((p->>'strop')::numeric, 0) <= 0 then raise exception 'Rozpočet musí byť kladný.' using errcode = '22023', detail = 'strop'; end if;
  if (p->>'stropDaru') is not null and (p->>'stropDaru')::numeric > 300 then raise exception 'Najviac 300 € k jednému daru.' using errcode = '22023', detail = 'strop_daru'; end if;
  select testovacia into v_test from public.stranka where id = v_stranka;
  insert into public.dorovnanie (id, entita, stranka, prijemca_ucet, ciel, ciel_nazov, firma_ucet, firma_nazov, firma_logo,
      pomer, strop, strop_daru, od, koniec, do_vycerpania, zvysok, len_zamestnanci, len_tvorca, tvorca_nazov, suhlas_tvorcu,
      kanal, uhrada, doklad, testovaci)
    values (v_id, coalesce(p->>'entita', v_stranka), v_stranka, v_prijemca, p->>'ciel', coalesce(nullif(p->>'cielNazov', ''), v_ciel_nazov),
      v_firma, coalesce((select nazov from public.firma_udaje where ucet_id = v_firma), p->>'firma', 'Firma'), p->>'firmaLogo',
      v_pomer, round((p->>'strop')::numeric, 2), round(nullif(p->>'stropDaru', '')::numeric, 2),
      coalesce(to_timestamp((p->>'od')::numeric / 1000), now()), to_timestamp((p->>'do')::numeric / 1000),
      coalesce((p->>'doVycerpania')::boolean, false), coalesce(p->>'zvysok', 'zbierke'), coalesce((p->>'lenZamestnanci')::boolean, false),
      nullif(p->>'lenTvorca', ''), nullif(p->>'tvorcaNazov', ''), case when nullif(p->>'lenTvorca', '') is not null then 'caka' end,
      coalesce(p->>'kanal', 'karta'), coalesce(p->>'uhrada', 'deed'), public.novy_doklad(), coalesce(v_test, false))
    returning * into d;
  -- úhrada cez DEED: platbu vidíme → peniaze hneď na viazaný účet; mimo DEED čaká na potvrdenie charity
  if d.uhrada = 'deed' then perform public.dorovnanie_financuj(d.id, d.strop, d.testovaci); end if;
  select * into d from public.dorovnanie where id = v_id;
  return public.dorovnanie_json(d);
end $$;

-- ---------- RPC: kroky ----------
create or replace function public.dorovnanie_krok(p_id text, p_akcia text, p_param jsonb default '{}'::jsonb) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare d public.dorovnanie; v_zost numeric; v_kam text; v_vs text; v_charita boolean; v_firma boolean;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  perform public.dorovnania_obnov();
  select * into d from public.dorovnanie where id = p_id for update;
  if not found then raise exception 'Dorovnanie neexistuje.' using errcode = 'P0002'; end if;
  v_charita := public.konam_za_stranku(d.stranka);
  v_firma := public.konam_za_firmu(d.firma_ucet);
  v_zost := public.dorovnanie_zostatok(d.id);

  if p_akcia in ('potvrd_platbu', 'spusti', 'odmietni', 'neprisli', 'pozastav', 'vysporiadaj', 'ukonci', 'ukonci_dorovnanie', 'vrat_zvysok', 'upozorni_firmu', 'zmaz')
     and not v_charita then raise exception 'Tento krok robí charita.' using errcode = '42501', detail = 'nie_charita'; end if;
  if p_akcia in ('zrus', 'dolej_strop') and not v_firma then raise exception 'Tento krok robí firma.' using errcode = '42501', detail = 'nie_firma'; end if;

  if p_akcia = 'potvrd_platbu' then
    if d.stav <> 'zapecatene' then raise exception 'Nie je čo potvrdiť.' using errcode = '22023'; end if;
    if not d.financovane then perform public.dorovnanie_financuj(d.id, d.strop, d.testovaci); end if;
    update public.dorovnanie set stav = 'potvrdene', zaplatene = now() where id = d.id;
  elsif p_akcia = 'spusti' then
    if d.stav <> 'potvrdene' then raise exception 'Dorovnanie nie je potvrdené.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'aktivne' where id = d.id;
  elsif p_akcia = 'odmietni' then
    if coalesce(trim(p_param->>'dovod'), '') = '' then raise exception 'Napíšte dôvod.' using errcode = '22023'; end if;
    if now() - d.oznamene >= interval '24 hours' then raise exception 'Odmietnuť sa dá len do 24 hodín od oznámenia platby.' using errcode = '22023', detail = 'po_24h'; end if;
    update public.dorovnanie set stav = 'pozastavene', pozastavene = now(),
      odmietnutie = jsonb_build_object('dovod', trim(p_param->>'dovod'), 'kedy', now()),
      vratenie = jsonb_build_object('suma', d.strop, 'do', now() + interval '7 days', 'vs', public.novy_doklad())
     where id = d.id;
  elsif p_akcia = 'neprisli' then
    if now() - d.oznamene < interval '24 hours' then raise exception 'Neprišli sa dá nahlásiť až po 24 hodinách.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'odmietnute', neprisli = now(), ukoncene = now() where id = d.id;
  elsif p_akcia = 'zrus' then
    if d.stav <> 'zapecatene' or d.financovane then raise exception 'Zaplatené dorovnanie sa nedá zrušiť — zvyšok vráti charita.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'zrusene', ukoncene = now() where id = d.id;
  elsif p_akcia = 'dolej_strop' then
    if coalesce((p_param->>'suma')::numeric, 0) <= 0 then raise exception 'Suma musí byť kladná.' using errcode = '22023'; end if;
    if d.stav not in ('aktivne', 'zapecatene', 'vycerpane') then raise exception 'Doliať sa dá len do bežiaceho dorovnania.' using errcode = '22023'; end if;
    update public.dorovnanie set strop = strop + round((p_param->>'suma')::numeric, 2),
      stav = case when d.stav = 'vycerpane' then 'aktivne' else d.stav end,
      ukoncene = case when d.stav = 'vycerpane' then null else d.ukoncene end
     where id = d.id;
    if d.financovane then perform public.dorovnanie_financuj(d.id, round((p_param->>'suma')::numeric, 2), d.testovaci); end if;
  elsif p_akcia = 'pozastav' then
    update public.dorovnanie set stav = 'pozastavene', pozastavene = now() where id = d.id;
  elsif p_akcia = 'vysporiadaj' then
    if d.stav <> 'pozastavene' or d.vysporiadane is not null then raise exception 'Nie je čo vysporiadať.' using errcode = '22023'; end if;
    v_kam := case when coalesce((p_param->>'predcasne')::boolean, true) then 'firme' else d.zvysok end;
    perform public.dorovnanie_presun(d.id, v_zost, v_kam = 'firme');
    update public.dorovnanie set vysporiadane = jsonb_build_object('suma', v_zost, 'kam', v_kam, 'kedy', now(), 'referencia', p_param->>'referencia') where id = d.id;
  elsif p_akcia = 'ukonci' then
    if d.stav <> 'pozastavene' or d.vysporiadane is null then raise exception 'Najprv treba vysporiadať zvyšok.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'ukoncene', ukoncene = now() where id = d.id;
  elsif p_akcia = 'ukonci_dorovnanie' then
    if v_zost <= 0 then
      update public.dorovnanie set stav = 'ukoncene', ukoncene = now() where id = d.id;
    else
      update public.dorovnanie set stav = 'pozastavene', pozastavene = now(),
        vratenie = jsonb_build_object('suma', v_zost, 'do', now() + interval '7 days', 'vs', public.novy_doklad()) where id = d.id;
    end if;
  elsif p_akcia = 'vrat_zvysok' then
    if d.vratenie is null or (d.vratenie->>'kedy') is not null then raise exception 'Nie je čo vrátiť.' using errcode = '22023'; end if;
    if p_param->>'cez' = 'mimo' and coalesce(p_param->>'doklad', '') = '' then raise exception 'Priložte doklad o úhrade.' using errcode = '22023'; end if;
    v_vs := d.vratenie->>'vs';
    perform public.dorovnanie_presun(d.id, (d.vratenie->>'suma')::numeric, true, v_vs);
    update public.dorovnanie set
      vratenie = d.vratenie || jsonb_build_object('cez', coalesce(p_param->>'cez', 'deed'), 'doklad', p_param->>'doklad', 'kedy', now()),
      vysporiadane = jsonb_build_object('suma', (d.vratenie->>'suma')::numeric, 'kam', 'firme', 'kedy', now(), 'referencia', v_vs),
      stav = case when d.odmietnutie is not null then 'odmietnute' else 'ukoncene' end, ukoncene = now()
     where id = d.id;
  elsif p_akcia = 'upozorni_firmu' then
    update public.dorovnanie set upozornena_firma = now() where id = d.id;
  elsif p_akcia in ('prijmi_tvorcom', 'odmietni_tvorcom') then
    if d.len_tvorca is null then raise exception 'Nie je tvorcovské dorovnanie.' using errcode = '22023'; end if;
    if p_akcia = 'prijmi_tvorcom' then update public.dorovnanie set suhlas_tvorcu = 'prijate' where id = d.id;
    else update public.dorovnanie set suhlas_tvorcu = 'odmietnute', stav = 'odmietnute', ukoncene = now() where id = d.id; end if;
  elsif p_akcia = 'zmaz' then
    if not (d.stav in ('ukoncene', 'odmietnute', 'zrusene') or (d.stav = 'vycerpane' and d.ukoncene is not null)) then
      raise exception 'Bežiace dorovnanie drží peniaze — zmazať sa nedá.' using errcode = '22023';
    end if;
    update public.dorovnanie set skryte = now() where id = d.id;
  else
    raise exception 'neznama_akcia' using errcode = '22023';
  end if;
  select * into d from public.dorovnanie where id = p_id;
  return public.dorovnanie_json(d);
end $$;

-- ---------- RPC: dorovnanie k daru (server rozhodne, koľko, a presunie peniaze) ----------
create or replace function public.dorovnanie_dar(p_ciel text, p_dar numeric, p_cez_tvorcu text default null, p_idem text default null, p_darca text default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare d public.dorovnanie; v_ja uuid := public.moj_ucet(); v_suma numeric; v_pohyb bigint;
begin
  perform public.dorovnania_obnov();
  if coalesce(p_dar, 0) <= 0 then return jsonb_build_object('dorovnane', 0); end if;
  -- tvorcovské má prednosť (firma platí za dosah toho tvorcu), potom verejné
  select * into d from public.dorovnanie x
   where x.ciel = p_ciel and public.dorovnanie_bezi(x)
     and ((p_cez_tvorcu is not null and x.len_tvorca = p_cez_tvorcu) or x.len_tvorca is null)
   order by (x.len_tvorca is not null) desc, x.zapecatene
   limit 1 for update;
  if not found then return jsonb_build_object('dorovnane', 0); end if;
  if d.len_zamestnanci and (v_ja is null or not public.je_zamestnanec(d.firma_ucet, v_ja)) then return jsonb_build_object('dorovnane', 0); end if;
  if p_idem is not null and exists (select 1 from public.dorovnanie_zaznam where dorovnanie_id = d.id and idem = p_idem) then
    return jsonb_build_object('dorovnane', (select dorovnane from public.dorovnanie_zaznam where dorovnanie_id = d.id and idem = p_idem), 'firma', d.firma_nazov, 'id', d.id);
  end if;
  v_suma := least(round(p_dar * d.pomer, 2), coalesce(d.strop_daru, 1e12), public.dorovnanie_zostatok(d.id));
  if v_suma <= 0 then return jsonb_build_object('dorovnane', 0); end if;
  v_pohyb := public.dorovnanie_presun(d.id, v_suma, false);
  insert into public.dorovnanie_zaznam (dorovnanie_id, dar, dorovnane, darca, darca_ucet, pohyb_id, idem)
    values (d.id, round(p_dar, 2), v_suma, nullif(trim(p_darca), ''), v_ja, v_pohyb, p_idem);
  if public.dorovnanie_zostatok(d.id) <= 0 then
    update public.dorovnanie set stav = 'vycerpane', ukoncene = now() where id = d.id;
  end if;
  return jsonb_build_object('dorovnane', v_suma, 'firma', d.firma_nazov, 'id', d.id);
end $$;

-- ---------- RPC: testovacie dorovnania (ukážka 1 : 1 podľa prototypu, len testovacia stránka) ----------
create or replace function public.dorovnania_testovacie(p_entita text, p_stranka text, p_ciele jsonb) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare
  v_t timestamptz := now(); v_prijemca uuid := public.ucet_stranky(p_stranka); r record; i int; n int; v_sum numeric; v_k numeric; v_zost numeric;
  v_dary numeric[] := array[20, 50, 25, 10, 40, 20]; v_id text; v_od timestamptz; v_po timestamptz; v_spolu numeric; v_mena text[]; v_kedy timestamptz;
begin
  if not exists (select 1 from public.stranka where id = p_stranka and testovacia) then return; end if;
  if exists (select 1 from public.dorovnanie where entita = p_entita) then return; end if;
  -- ciele ukážky musia existovať
  insert into public.dorovnanie_ciel (ciel, stranka, nazov)
    select v.value, p_stranka, k.nazov
      from jsonb_each_text(p_ciele) v
      join (values ('strecha', 'Strecha pre rodinu Horváthovú'), ('vozik', 'Invalidný vozík pre Ninu'), ('ovocie', 'Ovocie do výdajne'),
                   ('skolske', 'Školské potreby'), ('seniori', 'Sektor Seniori'), ('deti', 'Sektor Deti')) k(kluc, nazov) on k.kluc = v.key
  on conflict (ciel) do nothing;
  for r in select * from (values
      ('g', 'seniori', 'f1000000-0000-4000-8000-00000000000a'::uuid, 1.0, 1500, 100, v_t, timestamptz '2026-12-31 22:00+00', 'zbierke', false, 'sepa', 'mimo', 'zapecatene', v_t - interval '6 hours', 0, 0, null::text[], null::timestamptz, null::timestamptz),
      ('c', 'vozik',   'f1000000-0000-4000-8000-000000000009'::uuid, 1.0, 2000, 200, v_t, timestamptz '2026-11-30 22:00+00', 'zbierke', false, 'sepa', 'deed', 'zapecatene', v_t - interval '4 hours', 0, 0, null, null, null),
      ('e', 'ovocie',  'f1000000-0000-4000-8000-000000000005'::uuid, 0.5, 300, 50, timestamptz '2026-09-01 08:00+00', timestamptz '2026-09-22 20:00+00', 'firme', false, 'karta', 'deed', 'pozastavene', timestamptz '2026-09-01 08:00+00', 27, 210, array['Lucia S.', 'Anonymný darca'], timestamptz '2026-09-21 18:00+00', timestamptz '2026-09-22 20:00+00'),
      ('a', 'strecha', 'f1000000-0000-4000-8000-000000000001'::uuid, 1.0, 1000, 300, timestamptz '2026-10-02 08:00+00', timestamptz '2026-10-27 21:00+00', 'zbierke', false, 'karta', 'deed', 'aktivne', timestamptz '2026-10-02 08:00+00', 41, 820, array['Anonymný darca', 'Zuzana H.', 'Jana K.'], v_t, null),
      ('b', 'deti',    'f1000000-0000-4000-8000-00000000000b'::uuid, 0.5, 500, 100, timestamptz '2026-09-18 08:00+00', timestamptz '2026-12-31 22:00+00', 'firme', true, 'sepa', 'deed', 'aktivne', timestamptz '2026-09-18 08:00+00', 14, 140, array['Eva R.', 'Peter M.'], v_t, null),
      ('d', 'skolske', 'f1000000-0000-4000-8000-000000000001'::uuid, 1.0, 600, 50, timestamptz '2026-08-01 08:00+00', timestamptz '2026-08-25 20:00+00', 'zbierke', false, 'karta', 'deed', 'vycerpane', timestamptz '2026-08-01 08:00+00', 48, 600, array['Anonymný darca', 'Mária V.'], timestamptz '2026-08-19 11:00+00', null)
    ) as t(kod, kluc, firma, pomer, strop, strop_daru, od, koniec, zvysok, len_zam, kanal, uhrada, stav, zapec, pocet, suma, mena, po, pozast)
  loop
    v_id := 'dv-t-' || r.kod || '-' || p_stranka;
    insert into public.dorovnanie (id, entita, stranka, prijemca_ucet, ciel, ciel_nazov, firma_ucet, firma_nazov, pomer, strop, strop_daru,
        od, koniec, zvysok, len_zamestnanci, kanal, uhrada, doklad, testovaci, zapecatene, oznamene, zaplatene, stav, pozastavene, ukoncene)
      values (v_id, p_entita, p_stranka, v_prijemca, p_ciele->>r.kluc, (select nazov from public.dorovnanie_ciel where ciel = p_ciele->>r.kluc),
        r.firma, (select nazov from public.firma_udaje where ucet_id = r.firma), r.pomer, r.strop, r.strop_daru, r.od, r.koniec, r.zvysok, r.len_zam,
        r.kanal, r.uhrada, public.novy_doklad(), true, r.zapec, r.zapec,
        case when r.stav <> 'zapecatene' then r.zapec + interval '1 hour' end, 'zapecatene', null, null);
    if r.stav <> 'zapecatene' or r.uhrada = 'deed' then perform public.dorovnanie_financuj(v_id, r.strop, true); end if;
    -- záznamy darov rovnomerne od začiatku po „po"; dorovnané spolu presne r.suma
    if r.pocet > 0 then
      v_spolu := 0; for i in 1..r.pocet loop v_spolu := v_spolu + v_dary[((i - 1) % 6) + 1]; end loop;
      v_zost := r.suma;
      for i in 1..r.pocet loop
        v_k := case when i = r.pocet then v_zost else round(r.suma * v_dary[((i - 1) % 6) + 1] / v_spolu, 2) end;
        v_zost := v_zost - v_k;
        v_kedy := r.od + (i * ((r.po - r.od) / (r.pocet + 1)));
        insert into public.dorovnanie_zaznam (dorovnanie_id, dar, dorovnane, kedy, darca, pohyb_id, idem)
          values (v_id, v_dary[((i - 1) % 6) + 1], v_k, v_kedy, r.mena[((i - 1) % array_length(r.mena, 1)) + 1],
                  public.dorovnanie_presun(v_id, v_k, false), 'seed-' || i);
      end loop;
    end if;
    update public.dorovnanie set stav = r.stav, pozastavene = r.pozast,
      ukoncene = case when r.stav = 'vycerpane' then timestamptz '2026-08-19 12:00+00' end,
      vratenie = case when r.kod = 'e' then jsonb_build_object('suma', 90, 'do', timestamptz '2026-10-06 20:00+00', 'vs', public.novy_doklad()) end
     where id = v_id;
  end loop;
end $$;

revoke all on function public.dorovnania_nacitaj(), public.dorovnanie_zapecat(jsonb), public.dorovnanie_krok(text, text, jsonb),
  public.dorovnanie_dar(text, numeric, text, text, text), public.dorovnania_testovacie(text, text, jsonb),
  public.dorovnanie_obmedzenie_uloz(text, boolean, text[], text[]), public.dorovnanie_ciel_pridaj(text, text, text),
  public.dorovnanie_financuj(text, numeric, boolean), public.dorovnanie_presun(text, numeric, boolean, text), public.dorovnania_obnov() from public;
grant execute on function public.dorovnania_nacitaj(), public.dorovnanie_obmedzenie_citaj(text), public.dorovnanie_smie_cislo(text, text),
  public.dorovnanie_dar(text, numeric, text, text, text) to anon, authenticated;
grant execute on function public.dorovnanie_zapecat(jsonb), public.dorovnanie_krok(text, text, jsonb), public.dorovnania_testovacie(text, text, jsonb),
  public.dorovnanie_obmedzenie_uloz(text, boolean, text[], text[]), public.dorovnanie_ciel_pridaj(text, text, text) to authenticated;

-- 48 h tichý súhlas aj bez čítania (raz za hodinu)
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('deed-dorovnanie-automat', '17 * * * *', 'select public.dorovnania_obnov();');
  end if;
end $$;

commit;
