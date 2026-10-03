-- ============================================================
-- DEED · Iskry na serveri (KARTA 41 · Martin 3. 10.: body 1 a 2)
-- ------------------------------------------------------------
-- 1) Nahratie a uloženie videa
--    Bucket `iskry` (verejné čítanie). Nahrávať smie prihlásený (aj anonymné konto)
--    len do priečinka `<auth.uid()>/`. Limit 50 MB na súbor (strop Supabase free tier),
--    len video/mp4 · video/quicktime · video/webm + plagát image/jpeg.
--    Riadok Iskry (tabuľka `iskra`) sa NEDÁ vložiť priamo — len cez `iskra_zverejni()`,
--    ktorá overí, že video naozaj leží v Storage v priečinku volajúceho.
-- 2) Kvóta charity na mesiac
--    Videá „všetkým v Iskrách" za kalendárny mesiac (Europe/Bratislava) podľa programu:
--    Zadarmo 1 · Zbierka 1 · Akcia 2 · Kampaň 4 · Spolok 1. Každé ďalšie 10 € → riadok
--    v `iskra_poplatok` (stav 'neuhradene' — platobná brána zatiaľ nie je).
--    Program stránky je v `stranka_program`. Klient ho meniť NESMIE (len service_role / SQL).
--    Stránka bez riadku = program Zadarmo.
--
-- TODO (Samuel):
--  · stránka ↔ organizácia: dnes si stránku „zaberie" prvý, kto za ňu zverejní Iskru
--    (rovnaký dočasný vzor ako profil_stranky 0028). Po väzbe na organizáciu (statutár /
--    správcovia) nahradiť kontrolou správcu.
--  · dĺžku videa posiela klient — server ju bez ffmpeg neoverí (príde s bodom 3).
--  · iskra_poplatok → faktúra / platba, keď bude brána.
-- Idempotentné.
-- ============================================================

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('iskry', 'iskry', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists iskry_read on storage.objects;
create policy iskry_read on storage.objects for select to public
  using (bucket_id = 'iskry');
drop policy if exists iskry_write on storage.objects;
create policy iskry_write on storage.objects for insert to authenticated
  with check (bucket_id = 'iskry' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists iskry_delete on storage.objects;
create policy iskry_delete on storage.objects for delete to authenticated
  using (bucket_id = 'iskry' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Program stránky (kvóta) ----------
-- tier: 0 Zadarmo · 1 Zbierka · 2 Akcia · 3 Kampaň · 4 Spolok (ako tiery v appke)
create table if not exists public.stranka_program (
  stranka   text primary key,
  tier      smallint not null default 0 check (tier between 0 and 4),
  spravca   uuid references auth.users(id) on delete set null,
  zmenene   timestamptz not null default now()
);
alter table public.stranka_program enable row level security;
-- správca vidí svoj program; zápis len service_role (žiadna insert/update policy)
drop policy if exists spravca_citat on public.stranka_program;
create policy spravca_citat on public.stranka_program for select to authenticated using (spravca = auth.uid());

-- ---------- Iskry ----------
create table if not exists public.iskra (
  id          text primary key default ('i-' || replace(gen_random_uuid()::text, '-', '')),
  autor_uid   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stranka     text,                                   -- null = človek, inak kľúč stránky charity
  druh        smallint not null check (druh between 1 and 5),
  autor       text not null check (char_length(autor) between 1 and 120),
  kto         text not null default '' check (char_length(kto) <= 120),
  ini         text not null default '' check (char_length(ini) <= 4),
  popis       text not null check (char_length(popis) between 5 and 150),
  video       text not null,                          -- cesta v buckete iskry: <uid>/<uuid>.mp4
  plagat      text,                                   -- cesta v buckete iskry: <uid>/<uuid>.jpg
  dlzka_s     numeric(5, 1) check (dlzka_s is null or dlzka_s <= 60.5),
  zbierka     jsonb,                                  -- { id, nazov, pozn }
  bez_darov   boolean not null default false,
  retaz_pct   smallint check (retaz_pct is null or retaz_pct between 1 and 100),
  len_stranka boolean not null default false,         -- charita bez „Ukázať všetkým v Iskrách"
  nad_kvotu   boolean not null default false,         -- zverejnené nad rámec programu (10 €)
  iskry       integer not null default 0,
  zverejnene  timestamptz not null default now(),
  zmazane     timestamptz
);
create index if not exists iskra_prud_idx on public.iskra(zverejnene desc) where zmazane is null;
create index if not exists iskra_stranka_idx on public.iskra(stranka, zverejnene desc) where stranka is not null;
alter table public.iskra enable row level security;
-- čítať smie ktokoľvek (aj web stránka /i/{id} bez prihlásenia); zmazané len autor
drop policy if exists verejne_citat on public.iskra;
create policy verejne_citat on public.iskra for select to anon, authenticated
  using (zmazane is null or autor_uid = auth.uid());
-- vkladanie LEN cez iskra_zverejni(); autor smie Iskru zmazať (zmazane = now())
drop policy if exists autor_zmazat on public.iskra;
create policy autor_zmazat on public.iskra for update to authenticated
  using (autor_uid = auth.uid()) with check (autor_uid = auth.uid());

-- ---------- Poplatky za Iskry nad kvótu ----------
create table if not exists public.iskra_poplatok (
  id         bigint generated always as identity primary key,
  stranka    text not null,
  iskra_id   text not null references public.iskra(id) on delete cascade,
  mesiac     text not null,                           -- 'YYYY-MM' (Europe/Bratislava)
  suma_eur   numeric(8, 2) not null,
  stav       text not null default 'neuhradene' check (stav in ('neuhradene', 'uhradene', 'odpustene')),
  vytvoril   uuid default auth.uid() references auth.users(id) on delete set null,
  vytvorene  timestamptz not null default now()
);
create index if not exists iskra_poplatok_stranka_idx on public.iskra_poplatok(stranka, mesiac);
alter table public.iskra_poplatok enable row level security;
drop policy if exists spravca_citat on public.iskra_poplatok;
create policy spravca_citat on public.iskra_poplatok for select to authenticated using (vytvoril = auth.uid());

-- ---------- Kvóta ----------
-- limit videí „všetkým" za mesiac podľa programu (cenník: Zadarmo 1 · Zbierka 1 · Akcia 2 · Kampaň 4 · Spolok 1)
create or replace function public.iskry_limit(p_tier smallint) returns int
  language sql immutable as $$ select (array[1, 1, 2, 4, 1])[p_tier + 1] $$;

-- { tier, limit, pouzite, ostava, cena_nad, mesiac } pre stránku; kto nie je správca, dostane chybu
create or replace function public.iskra_kvota(p_stranka text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_prog    public.stranka_program;
  v_tier    smallint;
  v_od      timestamptz := date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava';
  v_pouzite int;
begin
  if auth.uid() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into v_prog from public.stranka_program where stranka = p_stranka;
  if found and v_prog.spravca is not null and v_prog.spravca <> auth.uid() then
    raise exception 'nie_spravca' using errcode = '42501';
  end if;
  v_tier := coalesce(v_prog.tier, 0);
  select count(*) into v_pouzite from public.iskra
    where stranka = p_stranka and not len_stranka and zverejnene >= v_od;
  return jsonb_build_object(
    'tier', v_tier, 'limit', public.iskry_limit(v_tier), 'pouzite', v_pouzite,
    'ostava', greatest(0, public.iskry_limit(v_tier) - v_pouzite), 'cena_nad', 10,
    'mesiac', to_char(now() at time zone 'Europe/Bratislava', 'YYYY-MM'));
end $$;

-- ---------- Zverejnenie ----------
-- p = { video, plagat?, dlzka_s?, stranka?, druh, autor, kto, ini, popis, zbierka?, bez_darov?, retaz_pct?, len_stranka? }
-- Vracia celý riadok iskra. Pri stránke drží zámok, aby dve súbežné zverejnenia neminuli kvótu dvakrát.
create or replace function public.iskra_zverejni(p jsonb) returns public.iskra
  language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_video   text := p->>'video';
  v_plagat  text := nullif(p->>'plagat', '');
  v_stranka text := nullif(p->>'stranka', '');
  v_len     boolean := coalesce((p->>'len_stranka')::boolean, false) and v_stranka is not null;
  v_prog    public.stranka_program;
  v_tier    smallint := 0;
  v_od      timestamptz := date_trunc('month', now() at time zone 'Europe/Bratislava') at time zone 'Europe/Bratislava';
  v_pouzite int;
  v_nad     boolean := false;
  v_riadok  public.iskra;
begin
  if v_uid is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  -- video (a plagát) musia ležať v Storage v priečinku volajúceho
  if v_video is null or split_part(v_video, '/', 1) <> v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'iskry' and name = v_video) then
    raise exception 'video_chyba' using errcode = '22023';
  end if;
  if v_plagat is not null and (split_part(v_plagat, '/', 1) <> v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'iskry' and name = v_plagat)) then
    v_plagat := null;
  end if;

  if v_stranka is not null then
    perform pg_advisory_xact_lock(hashtext('iskra_kvota:' || v_stranka));
    select * into v_prog from public.stranka_program where stranka = v_stranka for update;
    if not found then
      -- dočasne: stránku si zaberie prvý zverejňujúci (pozri TODO hore), program Zadarmo
      insert into public.stranka_program (stranka, tier, spravca) values (v_stranka, 0, v_uid);
    elsif v_prog.spravca is null then
      update public.stranka_program set spravca = v_uid where stranka = v_stranka;
      v_tier := v_prog.tier;
    elsif v_prog.spravca <> v_uid then
      raise exception 'nie_spravca' using errcode = '42501';
    else
      v_tier := v_prog.tier;
    end if;
    if not v_len then
      select count(*) into v_pouzite from public.iskra
        where stranka = v_stranka and not len_stranka and zverejnene >= v_od;
      v_nad := v_pouzite >= public.iskry_limit(v_tier);
    end if;
  end if;

  insert into public.iskra (autor_uid, stranka, druh, autor, kto, ini, popis, video, plagat, dlzka_s,
                            zbierka, bez_darov, retaz_pct, len_stranka, nad_kvotu)
  values (v_uid, v_stranka, (p->>'druh')::smallint, p->>'autor', coalesce(p->>'kto', ''), coalesce(p->>'ini', ''),
          p->>'popis', v_video, v_plagat, nullif(p->>'dlzka_s', '')::numeric,
          case when jsonb_typeof(p->'zbierka') = 'object' then p->'zbierka' end,
          coalesce((p->>'bez_darov')::boolean, false), nullif(p->>'retaz_pct', '')::smallint, v_len, v_nad)
  returning * into v_riadok;

  if v_nad then
    insert into public.iskra_poplatok (stranka, iskra_id, mesiac, suma_eur, vytvoril)
      values (v_stranka, v_riadok.id, to_char(now() at time zone 'Europe/Bratislava', 'YYYY-MM'), 10, v_uid);
  end if;
  return v_riadok;
end $$;

revoke all on function public.iskra_zverejni(jsonb) from public, anon;
grant execute on function public.iskra_zverejni(jsonb) to authenticated;
revoke all on function public.iskra_kvota(text) from public, anon;
grant execute on function public.iskra_kvota(text) to authenticated;
