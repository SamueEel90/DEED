-- ============================================================
-- 0076 · KARTA 60 — Adresár cirkví + Moje farnosti
-- 1. moje_farnosti: používateľ má najviac jednu domovskú farnosť + ľubovoľne veľa sledovaných (aj inej cirkvi).
--    Domovská = súhlas so spracovaním vierovyznania (A9) → čas súhlasu v stĺpci suhlas_a9.
--    Číta a mení ho len majiteľ (RLS). Zmena domovskej cez nastav_domovsku(): stará ostane medzi sledovanými.
-- 2. farnost_adresar: pre každú stránku farnosti cirkev (18 registrovaných v SR, kód) a obec.
--    Číta každý, píše len správca stránky. Doterajšie stránky farností dostanú RKC.
-- 3. v_adresar_farnosti: farnosti registrované v DEED pre Adresár (id, názov, cirkev, obec, súradnice).
-- ============================================================

create table if not exists public.moje_farnosti (
  ucet_id    uuid not null default public.zaisti_ucet() references public.ucet (id) on delete cascade,
  stranka    text not null references public.stranka (id) on delete cascade,
  domovska   boolean not null default false,
  suhlas_a9  timestamptz,                       -- pri domovskej: kedy používateľ súhlasil (A9)
  pridane    timestamptz not null default now(),
  primary key (ucet_id, stranka),
  check (not domovska or suhlas_a9 is not null)
);
create unique index if not exists moje_farnosti_jedna_domovska on public.moje_farnosti (ucet_id) where domovska;
alter table public.moje_farnosti enable row level security;
drop policy if exists moje_citat on public.moje_farnosti;
create policy moje_citat on public.moje_farnosti for select to authenticated using (ucet_id = public.moj_ucet());
drop policy if exists moje_pridat on public.moje_farnosti;
create policy moje_pridat on public.moje_farnosti for insert to authenticated with check (ucet_id = public.moj_ucet() and not domovska);
drop policy if exists moje_zmazat on public.moje_farnosti;
create policy moje_zmazat on public.moje_farnosti for delete to authenticated using (ucet_id = public.moj_ucet());
-- domovská len cez funkciu (kvôli súhlasu A9 a výmene starej za novú v jednom kroku)
revoke all on table public.moje_farnosti from anon, authenticated;
grant select, insert, delete on table public.moje_farnosti to authenticated;

-- nastaví domovskú farnosť; doterajšia domovská ostane medzi sledovanými. p_stranka null = odstrániť domovskú.
create or replace function public.nastav_domovsku(p_stranka text) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.zaisti_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_stranka is not null and not exists (select 1 from public.stranka where id = p_stranka and typ = 'farnost') then
    raise exception 'nie_je_farnost' using errcode = 'P0002';
  end if;
  if p_stranka is null then
    delete from public.moje_farnosti where ucet_id = v_ja and domovska;
    return true;
  end if;
  update public.moje_farnosti set domovska = false, suhlas_a9 = null where ucet_id = v_ja and domovska and stranka <> p_stranka;
  insert into public.moje_farnosti (ucet_id, stranka, domovska, suhlas_a9) values (v_ja, p_stranka, true, now())
    on conflict (ucet_id, stranka) do update set domovska = true, suhlas_a9 = coalesce(public.moje_farnosti.suhlas_a9, now());
  return true;
end $$;
revoke all on function public.nastav_domovsku(text) from public;
grant execute on function public.nastav_domovsku(text) to authenticated, service_role;

create table if not exists public.farnost_adresar (
  stranka  text primary key references public.stranka (id) on delete cascade,
  cirkev   text not null default 'RKC' check (cirkev in ('RKC','GKC','PC','ECAV','RKCr','ECM','BJB','CB','ACS','KZ','CASD','CČSH','LDS','JS','NAC','SKC','ÚZŽNO','BS')),
  obec     text,
  lat      double precision,
  lng      double precision,
  upravene timestamptz not null default now()
);
alter table public.farnost_adresar enable row level security;
drop policy if exists adresar_citat on public.farnost_adresar;
create policy adresar_citat on public.farnost_adresar for select to anon, authenticated using (true);
drop policy if exists adresar_spravca on public.farnost_adresar;
create policy adresar_spravca on public.farnost_adresar for all to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));
grant select on table public.farnost_adresar to anon, authenticated;
grant insert, update, delete on table public.farnost_adresar to authenticated;

insert into public.farnost_adresar (stranka) select id from public.stranka where typ = 'farnost' on conflict do nothing;

create or replace view public.v_adresar_farnosti with (security_invoker = true) as
  select s.id, s.nazov, coalesce(a.cirkev, 'RKC') as cirkev, a.obec, a.lat, a.lng, s.testovacia
  from public.stranka s left join public.farnost_adresar a on a.stranka = s.id
  where s.typ = 'farnost';
grant select on public.v_adresar_farnosti to anon, authenticated;

-- nová stránka farnosti dostane riadok v adresári (cirkev RKC, kým ju správca nezmení)
create or replace function public.farnost_adresar_nova() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.typ = 'farnost' then insert into public.farnost_adresar (stranka) values (new.id) on conflict do nothing; end if;
  return new;
end $$;
drop trigger if exists farnost_adresar_nova on public.stranka;
create trigger farnost_adresar_nova after insert on public.stranka for each row execute function public.farnost_adresar_nova();
