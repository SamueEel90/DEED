-- ============================================================
-- 0144 · OPRAVY 448 · pomocník ku skutku skenom osobného QR (naostro, bez DEV simulácie)
-- ------------------------------------------------------------
-- 1. Osobný rotujúci kód (Môj QR, záložka Na akciu aj Overiť ma — platí ktorákoľvek):
--    moj_qr_kod() vráti „<účet>.<okno>.<podpis>“, okno = 15 s, podpis HMAC tajomstvom účtu (len na serveri).
--    Doteraz kód tvorilo zariadenie bez podpisu — dal sa vyrobiť bez telefónu človeka.
-- 2. Organizátor naskenuje kód → skutok_pridaj_skenom: overí podpis a čas (aktuálne alebo predchádzajúce okno),
--    zapíše pomocníka ku skutku a pošle mu upozornenie „… ťa pridal(a) ku skutku ✓“.
-- 3. skutky_kde_som_pomahal(): zverejnené skutky, pri ktorých som bol (sken alebo potvrdená pozvánka, 0143) — denník.
-- 4. Poslať pozvánku registrovanému: hladaj_osoby (meno tak, ako ho človek ukazuje; anonym sa nedá nájsť)
--    a pozvanka_posli (upozornenie v zvončeku s odkazom na pozvánku 0143).
-- ============================================================
begin;

-- 1 ----------------------------------------------------------
create table if not exists public.qr_tajomstvo (
  ucet_id    uuid primary key references public.ucet(id) on delete cascade,
  tajomstvo  bytea not null default extensions.gen_random_bytes(32)
);
alter table public.qr_tajomstvo enable row level security;
revoke all on public.qr_tajomstvo from anon, authenticated;

create or replace function public.qr_podpis(p_ucet uuid, p_okno bigint) returns text
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v bytea;
begin
  select tajomstvo into v from public.qr_tajomstvo where ucet_id = p_ucet;
  if v is null then insert into public.qr_tajomstvo (ucet_id) values (p_ucet) on conflict do nothing returning tajomstvo into v;
    if v is null then select tajomstvo into v from public.qr_tajomstvo where ucet_id = p_ucet; end if; end if;
  return left(encode(extensions.hmac(convert_to(p_ucet::text || '|' || p_okno::text, 'UTF8'), v, 'sha256'), 'hex'), 20);
end $$;
revoke all on function public.qr_podpis(uuid, bigint) from public, anon, authenticated;

create or replace function public.moj_qr_kod() returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_t double precision := extract(epoch from now()); v_okno bigint := floor(v_t / 15);
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  return jsonb_build_object('kod', v_ja::text || '.' || v_okno || '.' || public.qr_podpis(v_ja, v_okno), 'okno', v_okno, 'zostava', 15 - floor(v_t - v_okno * 15));
end $$;
revoke all on function public.moj_qr_kod() from public, anon;
grant execute on function public.moj_qr_kod() to authenticated, service_role;

/** účet z kódu, ak je podpis platný a kód nie je starší ako 30 s; inak null */
create or replace function public.qr_kod_ucet(p_kod text) returns uuid
  language plpgsql volatile security definer set search_path = public as $$
declare m text[]; v_u uuid; v_o bigint; v_teraz bigint := floor(extract(epoch from now()) / 15);
begin
  m := regexp_match(coalesce(p_kod, ''), '^([0-9a-f-]{36})\.([0-9]+)\.([0-9a-f]{20})$');
  if m is null then return null; end if;
  v_u := m[1]::uuid; v_o := m[2]::bigint;
  if v_o not in (v_teraz, v_teraz - 1) then return null; end if;
  if not exists (select 1 from public.qr_tajomstvo where ucet_id = v_u) then return null; end if;
  if public.qr_podpis(v_u, v_o) <> m[3] then return null; end if;
  return v_u;
end $$;
revoke all on function public.qr_kod_ucet(text) from public, anon, authenticated;

/** meno človeka tak, ako ho chce ukazovať (0001 zobrazenie) — „Mária Š.“; anonym = „Pomocník“ */
create or replace function public.meno_pomocnika(p_ucet uuid) returns text
  language sql stable security definer set search_path = public as $$
  select coalesce(case coalesce(z.rezim, 'iniciala')
           when 'cele' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(p.priezvisko, '')), '')
           when 'mesto' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(p.priezvisko, '')), '')
           when 'nick' then nullif(trim(z.nick), '')
           when 'anonym' then null
           else nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(left(p.priezvisko, 1) || '.', '')), '') end, 'Pomocník')
    from public.ucet u left join public.profil p on p.ucet_id = u.id left join public.zobrazenie z on z.ucet_id = u.id
   where u.id = p_ucet;
$$;
revoke all on function public.meno_pomocnika(uuid) from public, anon;
grant execute on function public.meno_pomocnika(uuid) to authenticated, service_role;

-- 2 ----------------------------------------------------------
create table if not exists public.pomocnik_skutku (
  skutok   text not null,
  ucet_id  uuid not null references public.ucet(id) on delete cascade,
  meno     text not null,
  stranka  text references public.stranka(id) on delete cascade,
  pridal   uuid not null references public.ucet(id) on delete cascade,
  cas      timestamptz not null default now(),
  primary key (skutok, ucet_id)
);
alter table public.pomocnik_skutku enable row level security;
revoke all on public.pomocnik_skutku from anon, authenticated;

create or replace function public.skutok_pridaj_skenom(p_kod text, p_skutok text, p_nazov text, p_stranka text default null) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_u uuid; v_meno text; v_od text;
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  if p_stranka is not null and not public.spravujem_stranku(p_stranka) then raise exception 'Túto stránku nespravujete.' using errcode = '42501', detail = 'nie_spravca'; end if;
  v_u := public.qr_kod_ucet(p_kod);
  if v_u is null then raise exception 'Kód neplatí. Nech pomocník otvorí Môj QR znova a ukáže aktuálny kód.' using errcode = '22023', detail = 'kod_neplati'; end if;
  if v_u = v_ja then raise exception 'Vlastný kód naskenovať nemôžete.' using errcode = '22023', detail = 'vlastny'; end if;
  v_meno := public.meno_pomocnika(v_u);
  insert into public.pomocnik_skutku (skutok, ucet_id, meno, stranka, pridal) values (left(p_skutok, 80), v_u, v_meno, p_stranka, v_ja)
    on conflict (skutok, ucet_id) do nothing;
  if found then
    if p_stranka is not null then
      select coalesce(nullif(trim(v.verejne->'registra'->>'nazov'), ''), nullif(trim(s.nazov), ''), 'Charita') into v_od
        from public.stranka s left join public.nastavenia_stranky_verejne v on v.stranka = s.id where s.id = p_stranka;
    else v_od := public.meno_pomocnika(v_ja); end if;
    perform public.notifikuj_ucet(v_u, v_od || ' ťa pridal(a) ku skutku ✓', coalesce(nullif(trim(p_nazov), ''), 'Skutok') || ' · keď ho zverejní, príde ti do denníka.', 'kal');
  end if;
  return jsonb_build_object('ucet', v_u, 'meno', v_meno);
end $$;
revoke all on function public.skutok_pridaj_skenom(text, text, text, text) from public, anon;
grant execute on function public.skutok_pridaj_skenom(text, text, text, text) to authenticated, service_role;

-- 3 ----------------------------------------------------------
create or replace function public.skutky_kde_som_pomahal() returns table (skutok text, stranka text, od text, data jsonb, vytvorene timestamptz)
  language sql stable security definer set search_path = public as $$
  with moje as (
    select p.skutok from public.pomocnik_skutku p where p.ucet_id = public.moj_ucet()
    union select z.skutok from public.pozvanka_skutku z where z.prijal = public.moj_ucet()
  )
  select s.id, s.stranka, coalesce(nullif(trim(v.verejne->'registra'->>'nazov'), ''), st.nazov), s.data, s.vytvorene
    from moje m join public.skutok_stranky s on s.id = m.skutok and s.stiahnuty is null
    join public.stranka st on st.id = s.stranka
    left join public.nastavenia_stranky_verejne v on v.stranka = s.stranka
   order by s.vytvorene desc;
$$;
revoke all on function public.skutky_kde_som_pomahal() from public, anon;
grant execute on function public.skutky_kde_som_pomahal() to authenticated, service_role;

-- 4 ----------------------------------------------------------
create or replace function public.hladaj_osoby(p_q text) returns table (ucet uuid, meno text, mesto text)
  language sql stable security definer set search_path = public as $$
  select u.id, public.meno_pomocnika(u.id), case when z.rezim = 'mesto' then p.mesto end
    from public.ucet u join public.profil p on p.ucet_id = u.id left join public.zobrazenie z on z.ucet_id = u.id
   where public.moj_ucet() is not null and length(trim(coalesce(p_q, ''))) >= 3 and u.id <> public.moj_ucet() and u.typ = 'aktivny'
     and coalesce(z.rezim, 'iniciala') <> 'anonym'
     and (lower(coalesce(p.meno, '') || ' ' || coalesce(p.priezvisko, '')) like '%' || lower(trim(p_q)) || '%'
          or (z.rezim = 'nick' and lower(coalesce(z.nick, '')) like '%' || lower(trim(p_q)) || '%'))
   order by p.priezvisko, p.meno
   limit 8;
$$;
revoke all on function public.hladaj_osoby(text) from public, anon;
grant execute on function public.hladaj_osoby(text) to authenticated, service_role;

create or replace function public.pozvanka_posli(p_token text, p_ucet uuid) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare z public.pozvanka_skutku;
begin
  select * into z from public.pozvanka_skutku where token = p_token;
  if not found or z.od_ucet <> public.moj_ucet() then raise exception 'Pozvánka neexistuje.' using errcode = '22023', detail = 'neexistuje'; end if;
  if z.plati_do <= now() then raise exception 'Pozvánka už neplatí. Pošlite novú.' using errcode = '22023', detail = 'neplati'; end if;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    values (p_ucet, 'skutky', 'kal', left(z.od_meno || ' ťa pozýva ku skutku', 200), left(z.nazov || ' · Bol si pri tom? Potvrď do 2 hodín.', 500), 'pzs:-:' || z.token,
            exists (select 1 from public.push_odber o where o.ucet_id = p_ucet));
  return true;
end $$;
revoke all on function public.pozvanka_posli(text, uuid) from public, anon;
grant execute on function public.pozvanka_posli(text, uuid) to authenticated, service_role;

commit;
