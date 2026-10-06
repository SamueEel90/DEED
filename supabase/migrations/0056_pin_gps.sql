-- ============================================================
-- 0056 · Zadanie 4 · 4.4 — PIN a citlivé údaje
-- ------------------------------------------------------------
-- PIN: pomalý hash bcrypt (pgcrypto crypt + gen_salt('bf', 10)) LEN na serveri. Appka posiela PIN
--   cez rpc nastav_zabezpecenie / over_pin, ucet.pin_hash z klienta neprečíta ani nezapíše
--   (stĺpcové práva). Overenie: 5 zlých pokusov za 15 min = zámok. Staré SHA-256 hashe sa
--   zmažú (krátky PIN v nesolenom SHA-256 sa dá spätne vylúštiť) — PIN si človek nastaví znova.
-- GPS: presné súradnice príspevku vidí len server. Klient číta prispevok bez stĺpcov lat/lng;
--   prispevok_feed vracia polohu zaokrúhlenú na 0,01° (~1 km) — stačí na okruh a mapu, dom nie.
-- ============================================================
begin;

-- ---------- PIN ----------
create table if not exists public.pin_pokus (
  ucet_id uuid not null references public.ucet(id) on delete cascade,
  kedy    timestamptz not null default now(),
  ok      boolean not null
);
create index if not exists pin_pokus_idx on public.pin_pokus (ucet_id, kedy desc);
alter table public.pin_pokus enable row level security;   -- bez politík: klient nevidí nič

create or replace function public.nastav_zabezpecenie(p_pin text default null, p_biometria boolean default false) returns void
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.ja_prihlaseny();
begin
  if p_pin is not null and (length(p_pin) < 4 or octet_length(p_pin) > 72) then
    raise exception 'PIN musí mať aspoň 4 znaky.' using errcode = '22023', detail = 'pin_dlzka';
  end if;
  update public.ucet
     set pin_hash = case when p_pin is null then null else crypt(p_pin, gen_salt('bf', 10)) end,
         biometria = coalesce(p_biometria, false), stav_registracie = 'udaje', aktualizovane = now()
   where id = v_ja;
end $$;

create or replace function public.over_pin(p_pin text) returns boolean
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.ja_prihlaseny(); v_hash text; v_ok boolean;
begin
  if (select count(*) from public.pin_pokus where ucet_id = v_ja and not ok and kedy > now() - interval '15 minutes') >= 5 then
    raise exception 'Priveľa pokusov. Skúste o 15 minút.' using errcode = '54000', detail = 'pin_zamok';
  end if;
  select pin_hash into v_hash from public.ucet where id = v_ja;
  v_ok := v_hash is not null and v_hash like '$2%' and crypt(coalesce(p_pin, ''), v_hash) = v_hash;
  insert into public.pin_pokus (ucet_id, ok) values (v_ja, v_ok);
  return v_ok;
end $$;

revoke all on function public.nastav_zabezpecenie(text, boolean), public.over_pin(text) from public, anon;
grant execute on function public.nastav_zabezpecenie(text, boolean), public.over_pin(text) to authenticated;

-- staré SHA-256 hashe preč (bcrypt začína „$2")
update public.ucet set pin_hash = null where pin_hash is not null and pin_hash not like '$2%';

-- stĺpcové práva: pin_hash appka nečíta ani nepíše (ostatné stĺpce podľa RLS z 0055)
do $$ declare v_cols text;
begin
  revoke select, insert, update on public.ucet from anon, authenticated;
  select string_agg(quote_ident(column_name), ', ') into v_cols from information_schema.columns
   where table_schema = 'public' and table_name = 'ucet' and column_name <> 'pin_hash';
  execute format('grant select (%s) on public.ucet to anon, authenticated', v_cols);
  select string_agg(quote_ident(column_name), ', ') into v_cols from information_schema.columns
   where table_schema = 'public' and table_name = 'ucet' and column_name not in ('pin_hash', 'id', 'poradove_cislo', 'cislo', 'system_kluc')
     and is_generated = 'NEVER' and identity_generation is null;
  execute format('grant insert (%s), update (%s) on public.ucet to authenticated', v_cols, v_cols);
end $$;

-- ---------- GPS príspevkov ----------
do $$ declare v_cols text;
begin
  revoke select on public.prispevok from anon, authenticated;
  select string_agg(quote_ident(column_name), ', ') into v_cols from information_schema.columns
   where table_schema = 'public' and table_name = 'prispevok' and column_name not in ('lat', 'lng');
  execute format('grant select (%s) on public.prispevok to anon, authenticated', v_cols);
end $$;

create or replace view public.prispevok_feed as
 SELECT p.id, p.cislo, p.autor_ucet_id, p.autor_nazov, p.autor_ini, p.autor_pfp, p.autor_karma, p.modul, p.typ, p.kat,
    p.titul, p.popis, p.emoji, p.media,
    round(p.lat::numeric, 2)::double precision AS lat,      -- ~1 km, nie adresa
    round(p.lng::numeric, 2)::double precision AS lng,
    p.mesto, p.stvrt, p.lok, p.narodne, p.typ_situacie, p.skore, p.overene, p.topovane, p.vyznam, p.ciel,
    p.pomocnici, p.lajky, p.data, p.vytvorene, p.aktualizovane, p.ukoncene,
    v.vyzbierane_eur AS vyzbierane,
    COALESCE(v.vyzbierane_deed, 0::numeric) AS vyzbierane_deed,
    COALESCE(v.pocet_darov, 0::bigint)::integer AS podpora_count
   FROM prispevok p
     LEFT JOIN v_vyzbierane v ON v.case_id = p.id;

commit;
