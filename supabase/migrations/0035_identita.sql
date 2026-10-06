-- ============================================================
-- DEED · 0035 — Jedna identita: všetko sa viaže na ucet.id   [Zadanie 1 · Blok 1, 6. 10. 2026]
-- ------------------------------------------------------------
-- 1. stránka → účet: nová tabuľka `stranka` (id = doterajší textový kľúč „svetlo", „farnost"…,
--    ucet_id = účet ORGANIZÁCIE, not null). Tabuľky, ktoré sa viazali na stránku voľným textom,
--    dostanú cudzí kľúč na stranka(id) — text už nie je voľný, každá stránka má majiteľa.
--    Kto smie stránku spravovať: majiteľ alebo osoba prepojená cez `statutar` (osoba ↔ organizácia).
-- 2. auth → účet na jednom mieste: moj_ucet() (= ucet.auth_id, migrácia 0012). Tabuľky s auth.uid()
--    priamo prechádzajú na ucet_id; zaisti_ucet() založí účet aj anonymnej session (obľúbené a pod.).
-- 3. väzby podľa mena zrušené: qr_split_list už nehľadá podľa owner_text; qr_split_create vyžaduje účet.
--    owner_text / odosielatel_text / darca_nazov / autor_nazov ostávajú LEN ako zobrazovací snapshot.
-- 4. (appka) registrácia s existujúcim telefónom vráti chybu — DB to drží unique(ucet.telefon).
-- penazenka.pouzivatel sa tu nemení — tabuľka sa ruší v Zadaní 2 (ledger).
-- Idempotentné kde sa dá; spúšťa sa raz v poradí za 0034.
-- ============================================================

begin;

-- ---------- 0 · typy účtu: firma ako organizácia ----------
alter table public.ucet drop constraint if exists ucet_typ_check;
alter table public.ucet add constraint ucet_typ_check check (typ in ('pasivny','aktivny','charita','firma'));

-- ---------- 2 · auth → účet (jediný prevod) ----------
-- VOLATILE zámerne: v tom istom príkaze ho volá default zaisti_ucet() (založí účet anonymnej session)
-- a kontrola RLS ho musí vidieť; STABLE by videl len stav pred príkazom.
create or replace function public.moj_ucet() returns uuid
  language sql volatile security definer set search_path = public as $$
  select u.id from public.ucet u where u.auth_id = auth.uid() and auth.uid() is not null
$$;
comment on function public.moj_ucet() is 'Jediný prevod auth.uid() → ucet.id. Bez prihlásenia null.';

-- účet pre prihlásenú (aj anonymnú) session; ak ho ešte nemá, založí pasívny „anonym" účet
create or replace function public.zaisti_ucet() returns uuid
  language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then return null; end if;
  select id into v from public.ucet where auth_id = auth.uid();
  if v is null then
    insert into public.ucet (auth_id, typ, stav_registracie) values (auth.uid(), 'pasivny', 'anonym')
      on conflict (auth_id) do nothing
      returning id into v;
    if v is null then select id into v from public.ucet where auth_id = auth.uid(); end if;
  end if;
  return v;
end $$;
comment on function public.zaisti_ucet() is 'Účet prihlásenej session (anonymná dostane pasívny účet). Používa sa ako default stĺpcov ucet_id.';

-- ---------- 1 · stránka → účet ----------
create table if not exists public.stranka (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  ucet_id     uuid not null references public.ucet(id) on delete restrict,   -- majiteľ = účet organizácie
  typ         text not null,                                                 -- charita · firma · tvorca · farnost · spolok …
  nazov       text not null,                                                 -- len na zobrazenie
  testovacia  boolean not null default false,                                -- testovacia stránka: tester sa smie pridať ako správca
  vytvorene   timestamptz not null default now()
);
create index if not exists stranka_ucet_idx on public.stranka(ucet_id);
alter table public.stranka enable row level security;
drop policy if exists verejne_citat on public.stranka;
create policy verejne_citat on public.stranka for select to anon, authenticated using (true);
-- zápis len cez funkcie nižšie (security definer) — klient stránku priamo nezakladá ani neprepisuje

-- smie prihlásený spravovať stránku? majiteľ alebo štatutár/správca organizácie
create or replace function public.spravujem_stranku(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select exists (
    select 1 from public.stranka s
    where s.id = p_stranka
      and public.moj_ucet() is not null
      and (s.ucet_id = public.moj_ucet()
           or exists (select 1 from public.statutar t where t.org_ucet_id = s.ucet_id and t.osoba_ucet_id = public.moj_ucet())))
$$;

-- účet, ktorému stránka (a teda jej zbierky a platby) patrí
create or replace function public.ucet_stranky(p_stranka text) returns uuid
  language sql stable security definer set search_path = public as $$
  select ucet_id from public.stranka where id = p_stranka
$$;

-- založenie stránky: organizácia (charita/firma/farnosť…) dostane vlastný účet, zakladateľ je jej správca;
-- stránka tvorcu patrí priamo účtu tvorcu. Existujúce id = chyba (nikto si cudziu stránku neprivlastní).
create or replace function public.zaloz_stranku(p_id text, p_typ text, p_nazov text) returns public.stranka
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.zaisti_ucet(); v_org uuid; v_row public.stranka;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if exists (select 1 from public.stranka where id = p_id) then raise exception 'stranka_existuje' using errcode = '23505'; end if;
  if p_typ = 'tvorca' then
    v_org := v_ja;
  else
    insert into public.ucet (typ, stav_registracie) values (case when p_typ = 'firma' then 'firma' else 'charita' end, 'stranka')
      returning id into v_org;
    insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values (v_org, v_ja, 'hlavny');
  end if;
  insert into public.stranka (id, ucet_id, typ, nazov) values (p_id, v_org, p_typ, p_nazov) returning * into v_row;
  return v_row;
end $$;

-- testovacia stránka (Svetlo pomoci, Pekáreň, Tvorca, Farnosť): prihlásený tester sa pridá ako správca.
-- Na ostrej stránke (testovacia = false) to nejde — tam rozhoduje len majiteľ.
create or replace function public.testovaci_spravca(p_stranka text) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.zaisti_ucet(); v_s public.stranka;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into v_s from public.stranka where id = p_stranka;
  if not found then raise exception 'stranka_neexistuje' using errcode = 'P0002'; end if;
  if v_s.ucet_id = v_ja or public.spravujem_stranku(p_stranka) then return true; end if;
  if not v_s.testovacia then raise exception 'nie_spravca' using errcode = '42501'; end if;
  insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values (v_s.ucet_id, v_ja, 'testovaci');
  return true;
end $$;

-- prázdny text = žiadna stránka (osobná zbierka)
update public.zbierka set stranka = null where stranka = '';
update public.iskra set stranka = null where stranka = '';

-- ---------- 1b · backfill: každý doterajší textový kľúč stránky dostane riadok a majiteľa ----------
-- Testovacie stránky z appky (lib/mojeStranky) + všetko, čo už v DB je. Každá organizácia = vlastný účet.
create temporary table _stranky_kluce (id text primary key, typ text, nazov text) on commit drop;
insert into _stranky_kluce values
  ('svetlo', 'charita', 'Svetlo pomoci o.z.'),
  ('pekaren', 'firma', 'Pekáreň Dobrota'),
  ('tvorca', 'tvorca', 'Martin Konaľ'),
  ('farnost', 'farnost', 'Farnosť Trenčín — mesto')
on conflict do nothing;
insert into _stranky_kluce (id, typ, nazov)
select distinct k, 'charita', k from (
  select stranka as k from public.profil_stranky union
  select stranka from public.oznam_charity union
  select stranka from public.zbierka where stranka is not null union
  select stranka from public.sprava_piny union
  select stranka from public.overenie_uctu union
  select stranka from public.stranka_program union
  select stranka from public.iskra where stranka is not null union
  select stranka from public.iskra_poplatok
) x where k is not null
on conflict do nothing;

do $$
declare r record; v_org uuid;
begin
  for r in select * from _stranky_kluce k where not exists (select 1 from public.stranka s where s.id = k.id) loop
    if r.id !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
      raise exception 'Kľúč stránky „%" nemá platný tvar — oprav ho ručne pred migráciou', r.id;
    end if;
    insert into public.ucet (typ, stav_registracie)
      values (case when r.typ = 'firma' then 'firma' when r.typ = 'tvorca' then 'aktivny' else 'charita' end, 'testovaci')
      returning id into v_org;
    insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values (r.id, v_org, r.typ, r.nazov, true);
  end loop;
end $$;

-- ---------- 2b · každý auth používateľ, ktorý už v týchto tabuľkách niečo má, dostane účet ----------
insert into public.ucet (auth_id, typ, stav_registracie)
select distinct a, 'pasivny', 'anonym' from (
  select pouzivatel as a from public.oblubene union
  select pouzivatel from public.rsvp union
  select nahlasovatel from public.nahlasenie union
  select odosielatel from public.sprava union
  select autor from public.naboz_prispevok union
  select pouzivatel from public.zbierka union
  select upravil from public.profil_stranky union
  select vytvoril from public.oznam_charity union
  select pouzivatel from public.sprava_piny union
  select vytvoril from public.overenie_uctu union
  select autor_uid from public.iskra union
  select vytvoril from public.iskra_poplatok
) x
where a is not null and not exists (select 1 from public.ucet u where u.auth_id = x.a)
  and exists (select 1 from auth.users au where au.id = x.a);

-- pomocná: auth → účet pri prevode stĺpcov
create or replace function pg_temp.ucet_z_auth(a uuid) returns uuid language sql stable as $$
  select id from public.ucet where auth_id = a
$$;

-- ---------- 2c · prevod stĺpcov auth.uid() → ucet_id ----------
-- obľúbené
drop policy if exists owner_all on public.oblubene;
alter table public.oblubene add column if not exists ucet_id uuid references public.ucet(id) on delete cascade;
update public.oblubene set ucet_id = pg_temp.ucet_z_auth(pouzivatel) where ucet_id is null;
delete from public.oblubene where ucet_id is null;
alter table public.oblubene drop column pouzivatel;
alter table public.oblubene alter column ucet_id set not null, alter column ucet_id set default public.zaisti_ucet();
create unique index if not exists oblubene_ucet_ref_key on public.oblubene(ucet_id, ref_id);
create index if not exists oblubene_ucet_idx on public.oblubene(ucet_id, vytvorene desc);
create policy owner_all on public.oblubene for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());

-- rsvp
drop policy if exists owner_all on public.rsvp;
alter table public.rsvp add column if not exists ucet_id uuid references public.ucet(id) on delete cascade;
update public.rsvp set ucet_id = pg_temp.ucet_z_auth(pouzivatel) where ucet_id is null;
delete from public.rsvp where ucet_id is null;
alter table public.rsvp drop column pouzivatel;
alter table public.rsvp alter column ucet_id set not null, alter column ucet_id set default public.zaisti_ucet();
create unique index if not exists rsvp_ucet_ref_modul_key on public.rsvp(ucet_id, ref_id, modul);
create policy owner_all on public.rsvp for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());

-- nahlásenie
drop policy if exists owner_all on public.nahlasenie;
alter table public.nahlasenie add column if not exists ucet_id uuid references public.ucet(id) on delete cascade;
update public.nahlasenie set ucet_id = pg_temp.ucet_z_auth(nahlasovatel) where ucet_id is null;
delete from public.nahlasenie where ucet_id is null;
alter table public.nahlasenie drop column nahlasovatel;
alter table public.nahlasenie alter column ucet_id set not null, alter column ucet_id set default public.zaisti_ucet();
create index if not exists nahlasenie_ucet_idx on public.nahlasenie(ucet_id, vytvorene desc);
create policy owner_all on public.nahlasenie for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());

-- správa (Ozvať sa)
drop policy if exists owner_all on public.sprava;
alter table public.sprava add column if not exists ucet_id uuid references public.ucet(id) on delete cascade;
update public.sprava set ucet_id = pg_temp.ucet_z_auth(odosielatel) where ucet_id is null;
delete from public.sprava where ucet_id is null;
alter table public.sprava drop column odosielatel;
alter table public.sprava alter column ucet_id set not null, alter column ucet_id set default public.zaisti_ucet();
create index if not exists sprava_ucet_idx on public.sprava(ucet_id, vytvorene desc);
create policy owner_all on public.sprava for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet());

-- príspevok farnosti (Viera) — autor
alter table public.naboz_prispevok add column if not exists autor_ucet uuid references public.ucet(id) on delete set null;
update public.naboz_prispevok set autor_ucet = pg_temp.ucet_z_auth(autor) where autor_ucet is null and autor is not null;
alter table public.naboz_prispevok drop column autor;
alter table public.naboz_prispevok alter column autor_ucet set default public.zaisti_ucet();

-- zbierka: autor (moje zbierky) + stránka (zbierka organizácie)
drop policy if exists owner_all on public.zbierka;
alter table public.zbierka add column if not exists ucet_id uuid references public.ucet(id) on delete cascade;
update public.zbierka set ucet_id = pg_temp.ucet_z_auth(pouzivatel) where ucet_id is null;
delete from public.zbierka where ucet_id is null;
alter table public.zbierka drop column pouzivatel;
alter table public.zbierka alter column ucet_id set not null, alter column ucet_id set default public.zaisti_ucet();
create index if not exists zbierka_ucet_idx on public.zbierka(ucet_id, vytvorene desc);
create policy owner_all on public.zbierka for all to authenticated
  using (ucet_id = public.moj_ucet() or (stranka is not null and public.spravujem_stranku(stranka)))
  with check (ucet_id = public.moj_ucet() and (stranka is null or public.spravujem_stranku(stranka)));

-- profil stránky: smie ho meniť správca stránky; upravil = účet (audit)
drop policy if exists spravca_all on public.profil_stranky;
alter table public.profil_stranky add column if not exists upravil_ucet uuid references public.ucet(id) on delete set null;
update public.profil_stranky set upravil_ucet = pg_temp.ucet_z_auth(upravil) where upravil_ucet is null and upravil is not null;
alter table public.profil_stranky drop column upravil;
alter table public.profil_stranky alter column upravil_ucet set default public.moj_ucet();
create policy spravca_all on public.profil_stranky for all to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));

-- oznamy charity
drop policy if exists spravca_pisat on public.oznam_charity;
drop policy if exists verejne_citat on public.oznam_charity;
alter table public.oznam_charity add column if not exists vytvoril_ucet uuid references public.ucet(id) on delete set null;
update public.oznam_charity set vytvoril_ucet = pg_temp.ucet_z_auth(vytvoril) where vytvoril_ucet is null and vytvoril is not null;
alter table public.oznam_charity drop column vytvoril;
alter table public.oznam_charity alter column vytvoril_ucet set default public.moj_ucet();
create policy spravca_pisat on public.oznam_charity for all to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));
create policy verejne_citat on public.oznam_charity for select to anon, authenticated
  using (zrusene is null or public.spravujem_stranku(stranka));

-- piny v Správe (osobné nastavenie správcu pre stránku)
drop policy if exists owner_all on public.sprava_piny;
alter table public.sprava_piny add column if not exists ucet_id uuid references public.ucet(id) on delete cascade;
update public.sprava_piny set ucet_id = pg_temp.ucet_z_auth(pouzivatel) where ucet_id is null;
delete from public.sprava_piny where ucet_id is null;
alter table public.sprava_piny drop constraint if exists sprava_piny_pkey;
alter table public.sprava_piny drop column pouzivatel;
alter table public.sprava_piny alter column ucet_id set not null, alter column ucet_id set default public.zaisti_ucet();
alter table public.sprava_piny add primary key (ucet_id, stranka);
create policy owner_all on public.sprava_piny for all to authenticated
  using (ucet_id = public.moj_ucet()) with check (ucet_id = public.moj_ucet() and public.spravujem_stranku(stranka));

-- overenie účtu (IBAN) stránky
drop policy if exists spravca_citat on public.overenie_uctu;
drop policy if exists spravca_ziadost on public.overenie_uctu;
alter table public.overenie_uctu add column if not exists vytvoril_ucet uuid references public.ucet(id) on delete set null;
update public.overenie_uctu set vytvoril_ucet = pg_temp.ucet_z_auth(vytvoril) where vytvoril_ucet is null and vytvoril is not null;
alter table public.overenie_uctu drop column vytvoril;
alter table public.overenie_uctu alter column vytvoril_ucet set default public.moj_ucet();
create policy spravca_citat on public.overenie_uctu for select to authenticated using (public.spravujem_stranku(stranka));
create policy spravca_ziadost on public.overenie_uctu for insert to authenticated
  with check (public.spravujem_stranku(stranka) and stav = 'caka');

-- program stránky (Iskry kvóta): správca už nie je „kto prvý zverejnil", ale správca stránky
drop policy if exists spravca_citat on public.stranka_program;
alter table public.stranka_program drop column if exists spravca;
create policy spravca_citat on public.stranka_program for select to authenticated using (public.spravujem_stranku(stranka));

-- Iskry: autor = účet (súbor v Storage ostáva v priečinku auth uid — to je vlastník súboru, nie väzba dát)
drop policy if exists verejne_citat on public.iskra;
drop policy if exists autor_zmazat on public.iskra;
alter table public.iskra add column if not exists autor_ucet uuid references public.ucet(id) on delete cascade;
update public.iskra set autor_ucet = pg_temp.ucet_z_auth(autor_uid) where autor_ucet is null;
delete from public.iskra where autor_ucet is null;
alter table public.iskra drop column autor_uid;
alter table public.iskra alter column autor_ucet set not null, alter column autor_ucet set default public.zaisti_ucet();
create policy verejne_citat on public.iskra for select to anon, authenticated
  using (zmazane is null or autor_ucet = public.moj_ucet());
create policy autor_zmazat on public.iskra for update to authenticated
  using (autor_ucet = public.moj_ucet()) with check (autor_ucet = public.moj_ucet());

drop policy if exists spravca_citat on public.iskra_poplatok;
alter table public.iskra_poplatok add column if not exists vytvoril_ucet uuid references public.ucet(id) on delete set null;
update public.iskra_poplatok set vytvoril_ucet = pg_temp.ucet_z_auth(vytvoril) where vytvoril_ucet is null and vytvoril is not null;
alter table public.iskra_poplatok drop column vytvoril;
alter table public.iskra_poplatok alter column vytvoril_ucet set default public.moj_ucet();
create policy spravca_citat on public.iskra_poplatok for select to authenticated using (public.spravujem_stranku(stranka));

-- ---------- 1c · cudzie kľúče: stránka už nie je voľný text ----------
alter table public.profil_stranky drop constraint if exists profil_stranky_stranka_fk;
alter table public.profil_stranky add constraint profil_stranky_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade;
alter table public.oznam_charity drop constraint if exists oznam_charity_stranka_fk;
alter table public.oznam_charity add constraint oznam_charity_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade;
alter table public.zbierka drop constraint if exists zbierka_stranka_fk;
alter table public.zbierka add constraint zbierka_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade;
alter table public.sprava_piny drop constraint if exists sprava_piny_stranka_fk;
alter table public.sprava_piny add constraint sprava_piny_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade on delete cascade;
alter table public.overenie_uctu drop constraint if exists overenie_uctu_stranka_fk;
alter table public.overenie_uctu add constraint overenie_uctu_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade;
alter table public.stranka_program drop constraint if exists stranka_program_stranka_fk;
alter table public.stranka_program add constraint stranka_program_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade on delete cascade;
alter table public.iskra drop constraint if exists iskra_stranka_fk;
alter table public.iskra add constraint iskra_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade;
alter table public.iskra_poplatok drop constraint if exists iskra_poplatok_stranka_fk;
alter table public.iskra_poplatok add constraint iskra_poplatok_stranka_fk foreign key (stranka) references public.stranka(id) on update cascade;

-- zbierka → stránka → účet: komu platba na zbierku patrí (jednoznačne, cez kľúče)
create or replace function public.ucet_zbierky(p_zbierka text) returns uuid
  language sql stable security definer set search_path = public as $$
  select coalesce(s.ucet_id, z.ucet_id)
  from public.zbierka z left join public.stranka s on s.id = z.stranka
  where z.id = p_zbierka
$$;
comment on function public.ucet_zbierky(text) is 'Príjemca zbierky: účet stránky (organizácie), osobná zbierka = účet autora.';

-- ---------- 2d · Iskry: kvóta a zverejnenie podľa správcu stránky ----------
create or replace function public.iskra_kvota(p_stranka text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_tier    smallint;
  v_od      timestamptz := date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava';
  v_pouzite int;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  select tier into v_tier from public.stranka_program where stranka = p_stranka;
  v_tier := coalesce(v_tier, 0);
  select count(*) into v_pouzite from public.iskra
    where stranka = p_stranka and not len_stranka and zverejnene >= v_od;
  return jsonb_build_object(
    'tier', v_tier, 'limit', public.iskry_limit(v_tier), 'pouzite', v_pouzite,
    'ostava', greatest(0, public.iskry_limit(v_tier) - v_pouzite), 'cena_nad', 10,
    'mesiac', to_char(now() at time zone 'Europe/Bratislava', 'YYYY-MM'));
end $$;

create or replace function public.iskra_zverejni(p jsonb) returns public.iskra
  language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();                 -- len kvôli priečinku súboru v Storage
  v_ucet    uuid := public.zaisti_ucet();       -- väzba dát = účet
  v_video   text := p->>'video';
  v_plagat  text := nullif(p->>'plagat', '');
  v_stranka text := nullif(p->>'stranka', '');
  v_len     boolean := coalesce((p->>'len_stranka')::boolean, false) and v_stranka is not null;
  v_tier    smallint := 0;
  v_od      timestamptz := date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava';
  v_pouzite int;
  v_nad     boolean := false;
  v_riadok  public.iskra;
begin
  if v_uid is null or v_ucet is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if v_video is null or split_part(v_video, '/', 1) <> v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'iskry' and name = v_video) then
    raise exception 'video_chyba' using errcode = '22023';
  end if;
  if v_plagat is not null and (split_part(v_plagat, '/', 1) <> v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'iskry' and name = v_plagat)) then
    v_plagat := null;
  end if;

  if v_stranka is not null then
    if not public.spravujem_stranku(v_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
    perform pg_advisory_xact_lock(hashtext('iskra_kvota:' || v_stranka));
    insert into public.stranka_program (stranka, tier) values (v_stranka, 0) on conflict (stranka) do nothing;
    select tier into v_tier from public.stranka_program where stranka = v_stranka for update;
    if not v_len then
      select count(*) into v_pouzite from public.iskra
        where stranka = v_stranka and not len_stranka and zverejnene >= v_od;
      v_nad := v_pouzite >= public.iskry_limit(v_tier);
    end if;
  end if;

  insert into public.iskra (autor_ucet, stranka, druh, autor, kto, ini, popis, video, plagat, dlzka_s,
                            zbierka, bez_darov, retaz_pct, len_stranka, nad_kvotu)
  values (v_ucet, v_stranka, (p->>'druh')::smallint, p->>'autor', coalesce(p->>'kto', ''), coalesce(p->>'ini', ''),
          p->>'popis', v_video, v_plagat, nullif(p->>'dlzka_s', '')::numeric,
          case when jsonb_typeof(p->'zbierka') = 'object' then p->'zbierka' end,
          coalesce((p->>'bez_darov')::boolean, false), nullif(p->>'retaz_pct', '')::smallint, v_len, v_nad)
  returning * into v_riadok;

  if v_nad then
    insert into public.iskra_poplatok (stranka, iskra_id, mesiac, suma_eur, vytvoril_ucet)
      values (v_stranka, v_riadok.id, to_char(now() at time zone 'Europe/Bratislava', 'YYYY-MM'), 10, v_ucet);
  end if;
  return v_riadok;
end $$;

-- ---------- 3 · QR split: vlastník = účet, nikdy meno ----------
drop function if exists public.qr_split_list(uuid, text);
create or replace function public.qr_split_list(p_owner uuid) returns jsonb
  language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'slug', q.slug, 'zdroj', q.zdroj, 'mena', q.mena,
      'owner_podiel', q.owner_podiel, 'case_id', q.case_id, 'vytvorene', q.vytvorene,
      'titul', (select coalesce(p.titul, p.autor_nazov, 'Prispevok') from public.prispevok p where p.id = q.case_id),
      'emoji', (select p.emoji from public.prispevok p where p.id = q.case_id),
      'org_odoslane', (select coalesce(t.org_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'owner_odoslane', (select coalesce(t.owner_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'pocet', (select coalesce(t.pocet,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'ciele', (select coalesce(jsonb_agg(jsonb_build_object('prijemca_text', c.prijemca_text, 'podiel', c.podiel) order by c.id), '[]'::jsonb)
                from public.qr_split_ciel c where c.qr_split_id = q.id)
    ) order by q.vytvorene desc), '[]'::jsonb)
  from public.qr_split q
  where p_owner is not null and q.owner_ucet_id = p_owner;
$$;

create or replace function public.qr_split_create(p_case uuid, p_owner uuid, p_owner_text text, p_owner_podiel numeric, p_ciele jsonb, p_zdroj text default 'osobny', p_mena text default 'DEED')
  returns public.qr_split language plpgsql security definer set search_path = public, extensions as $$
declare v_slug text; v_row public.qr_split; v_sum numeric := 0; e jsonb; v_owner uuid;
begin
  -- vlastník QR = účet (prihlásený), meno je len popis na QR
  v_owner := coalesce(p_owner, public.moj_ucet());
  if v_owner is null then raise exception 'qr_bez_uctu' using errcode = '28000'; end if;
  if auth.uid() is not null and v_owner is distinct from public.moj_ucet() then
    raise exception 'cudzi_ucet' using errcode = '42501';
  end if;
  if coalesce(p_owner_podiel,0) < 0.03 then
    raise exception 'owner_podiel musí byť ≥ 0.03 (dostal %)', p_owner_podiel;
  end if;
  select coalesce(sum((x->>'podiel')::numeric), 0) into v_sum
    from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) x;
  if exists (select 1 from jsonb_array_elements(coalesce(p_ciele,'[]'::jsonb)) x
             where (x->>'podiel')::numeric < 0.03) then
    raise exception 'každý podiel organizácie musí byť ≥ 0.03';
  end if;
  if abs((coalesce(p_owner_podiel,0) + v_sum) - 1.0) > 0.0005 then
    raise exception 'Σ podielov musí byť 1.0 (owner % + ciele % = %)', p_owner_podiel, v_sum, p_owner_podiel + v_sum;
  end if;

  v_slug := public.gen_slug();
  insert into public.qr_split (case_id, owner_ucet_id, owner_text, owner_podiel, zdroj, mena, slug)
    values (p_case, v_owner, p_owner_text, p_owner_podiel,
            coalesce(p_zdroj,'osobny'), coalesce(p_mena,'DEED'), v_slug)
    returning * into v_row;

  for e in select * from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) loop
    insert into public.qr_split_ciel (qr_split_id, prijemca_ucet, prijemca_text, podiel, fixny)
      values (v_row.id, nullif(e->>'prijemca_ucet','')::uuid, e->>'prijemca_text',
              (e->>'podiel')::numeric, coalesce((e->>'fixny')::boolean, true));
  end loop;

  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','split', v_row.id::text, v_slug, 'https://deed.good/split/'||v_slug, 'qr')
    on conflict (objekt_druh, objekt_ref) do nothing;

  return v_row;
end $$;

grant execute on function public.moj_ucet(), public.zaisti_ucet(), public.spravujem_stranku(text),
  public.ucet_stranky(text), public.ucet_zbierky(text), public.zaloz_stranku(text, text, text),
  public.testovaci_spravca(text), public.qr_split_list(uuid) to anon, authenticated;

commit;
