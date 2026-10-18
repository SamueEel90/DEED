-- ============================================================
-- 0104 · OPRAVY 338 — zbierka s overovateľom naostro: skutočný sken QR príjemcu a potvrdenie kódom
-- ------------------------------------------------------------
-- Doteraz bol sken aj kód len „Simulovať“: appka neposlala účet príjemcu (alebo poslala účet farára)
-- a zapečatenie skončilo chybou prijemca_neovereny (0065: ucet_overeny = KYC „sedí“ / KYB / testovací účet / testovacia stránka).
-- Teraz:
--   1. farár (správca stránky) založí overenie (ovp_zaloz) a každých 15 s si vypýta nový token (ovp_token, platí 20 s)
--      → QR = https://<appka>/overenie/<token>
--   2. príjemca naskenuje QR fotoaparátom → ovp_otvor(token) vydá lístok na 15 min (prihlásenie / registrácia sa stihne)
--   3. prihlásený príjemca s dokončenou registráciou potvrdí „som to ja“ (ovp_potvrd) → farár to vidí cez ovp_stav
--   4. farár pošle kód (ovp_kod): upozornenie do zvončeka príjemcu (+ push), odkaz ovp:<stránka>:<lístok>, kód platí 5 min
--   5. príjemca napíše kód a potvrdí rozdelenie (ovp_suhlas) → farár zapečatí
--   6. zbierka_rozdelenie (náhrada funkcie z 0065): príjemca prejde aj s osobným overením z bodov 1 – 5
--      (nastavenie.overenie_prijemcu = id overenia), kým nie je overenie totožnosti (KYC). Overenie sa použije raz.
--   7. moje_zbierky_prijemcu() — zbierky, kde som príjemca (Moja zbierka); ukonci_zbierku smie aj príjemca.
-- ============================================================
begin;

create table if not exists public.overenie_prijemcu (
  id            uuid primary key default gen_random_uuid(),
  stranka       text not null references public.stranka(id) on delete cascade,
  druh          text not null default 'pohreb' check (druh in ('pohreb','svadba','ine')),
  vytvoril      uuid not null references public.ucet(id),
  token         text unique,
  token_do      timestamptz,
  listok        text unique,
  listok_do     timestamptz,
  prijemca      uuid references public.ucet(id),
  prijemca_meno text,
  potvrdene     timestamptz,
  rozdelenie    text,
  kod           text,
  kod_do        timestamptz,
  suhlas        timestamptz,
  zbierka       text,
  vytvorene     timestamptz not null default now()
);
alter table public.overenie_prijemcu enable row level security; -- bez politík: len cez funkcie nižšie
revoke all on public.overenie_prijemcu from anon, authenticated;

create or replace function public.ovp_nahodne() returns text language sql volatile as $$
  select replace(gen_random_uuid()::text, '-', '') $$;
revoke all on function public.ovp_nahodne() from public, anon, authenticated;

-- 1 · farár založí overenie
create or replace function public.ovp_zaloz(p_stranka text, p_druh text) returns uuid
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_id uuid;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  insert into public.overenie_prijemcu (stranka, druh, vytvoril) values (p_stranka, coalesce(nullif(p_druh, ''), 'pohreb'), v_ja) returning id into v_id;
  return v_id;
end $$;

-- 1 · nový token do QR (platí 20 s: 15 s na obrazovke + 5 s rezerva na sken)
create or replace function public.ovp_token(p_id uuid) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_t text := left(public.ovp_nahodne(), 16);
begin
  select * into o from public.overenie_prijemcu where id = p_id for update;
  if not found or not public.spravujem_stranku(o.stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if o.prijemca is not null then return null; end if;
  update public.overenie_prijemcu set token = v_t, token_do = now() + interval '20 seconds' where id = p_id;
  return v_t;
end $$;

-- 2 · sken: čerstvý token → lístok na 15 min (aj bez prihlásenia)
create or replace function public.ovp_otvor(p_token text) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_l text;
begin
  select * into o from public.overenie_prijemcu where token = p_token and token_do > now() and prijemca is null for update;
  if not found then raise exception 'kod_neplati' using errcode = 'P0002'; end if;
  v_l := case when o.listok is not null and o.listok_do > now() then o.listok else public.ovp_nahodne() end;
  update public.overenie_prijemcu set listok = v_l, listok_do = now() + interval '15 minutes' where id = o.id;
  return v_l;
end $$;

-- stránka /overenie/<lístok>: čo vidí príjemca
create or replace function public.ovp_nahlad(p_listok text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_ja uuid := public.moj_ucet();
begin
  select * into o from public.overenie_prijemcu where listok = p_listok;
  if not found or not (o.listok_do > now() or (v_ja is not null and o.prijemca = v_ja)) then
    raise exception 'kod_neplati' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'stranka', o.stranka, 'nazov', (select nazov from public.stranka where id = o.stranka), 'druh', o.druh,
    'potvrdene', o.potvrdene is not null, 'ja', v_ja is not null and o.prijemca = v_ja, 'iny', o.prijemca is not null and o.prijemca is distinct from v_ja,
    'kod_caka', o.kod is not null and o.kod_do > now() and o.suhlas is null and v_ja is not null and o.prijemca = v_ja,
    'rozdelenie', case when v_ja is not null and o.prijemca = v_ja then o.rozdelenie end,
    'suhlas', o.suhlas is not null, 'zbierka', o.zbierka);
end $$;

-- 3 · príjemca: „Potvrdiť, že som to ja“ — stačí dokončená registrácia
create or replace function public.ovp_potvrd(p_listok text) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_ja uuid := public.moj_ucet(); v_meno text;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not exists (select 1 from public.ucet where id = v_ja and stav_registracie = 'hotovo') then
    raise exception 'neregistrovany' using errcode = '42501';
  end if;
  select * into o from public.overenie_prijemcu where listok = p_listok for update;
  if not found or not (o.listok_do > now() or o.prijemca = v_ja) then raise exception 'kod_neplati' using errcode = 'P0002'; end if;
  if o.prijemca is not null and o.prijemca <> v_ja then raise exception 'uz_potvrdil_iny' using errcode = '23505'; end if;
  select nullif(trim(concat_ws(' ', p.meno, p.priezvisko)), '') into v_meno from public.profil p where p.ucet_id = v_ja;
  v_meno := coalesce(v_meno, 'Člen DEED');
  update public.overenie_prijemcu set prijemca = v_ja, prijemca_meno = v_meno, potvrdene = coalesce(potvrdene, now()), token = null where id = o.id;
  return v_meno;
end $$;

-- farár: stav overenia (meno príjemcu, súhlas s rozdelením)
create or replace function public.ovp_stav(p_id uuid) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare o public.overenie_prijemcu;
begin
  select * into o from public.overenie_prijemcu where id = p_id;
  if not found or not public.spravujem_stranku(o.stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  return jsonb_build_object('meno', o.prijemca_meno, 'potvrdene', o.potvrdene is not null, 'suhlas', o.suhlas is not null,
    'kod_do', o.kod_do, 'ucet', o.prijemca);
end $$;

-- 4 · farár pošle kód: upozornenie do appky príjemcu, kód platí 5 min
create or replace function public.ovp_kod(p_id uuid, p_rozdelenie text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_kod text := lpad((floor(random() * 1000000))::int::text, 6, '0'); v_nazov text;
begin
  select * into o from public.overenie_prijemcu where id = p_id for update;
  if not found or not public.spravujem_stranku(o.stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if o.prijemca is null then raise exception 'bez_prijemcu' using errcode = 'P0002'; end if;
  if o.zbierka is not null then raise exception 'uz_pouzite' using errcode = '23505'; end if;
  update public.overenie_prijemcu set kod = v_kod, kod_do = now() + interval '5 minutes', suhlas = null,
    rozdelenie = left(nullif(trim(coalesce(p_rozdelenie, '')), ''), 400), listok_do = greatest(listok_do, now() + interval '15 minutes')
    where id = p_id;
  select nazov into v_nazov from public.stranka where id = o.stranka;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    values (o.prijemca, 'socialne', 'srd', left('Kód na potvrdenie · ' || coalesce(v_nazov, 'farnosť'), 200),
      'Kód: ' || v_kod || ' · platí 5 minút. Ťuknite a potvrďte rozdelenie zbierky.', 'ovp:' || o.stranka || ':' || o.listok,
      exists (select 1 from public.push_odber p where p.ucet_id = o.prijemca));
end $$;

-- 5 · príjemca napíše kód a potvrdí rozdelenie
create or replace function public.ovp_suhlas(p_listok text, p_kod text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare o public.overenie_prijemcu; v_ja uuid := public.moj_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into o from public.overenie_prijemcu where listok = p_listok and prijemca = v_ja for update;
  if not found then raise exception 'kod_neplati' using errcode = 'P0002'; end if;
  if o.kod is null or o.kod_do <= now() then raise exception 'kod_vyprsal' using errcode = '22023'; end if;
  if o.kod <> regexp_replace(coalesce(p_kod, ''), '\D', '', 'g') then raise exception 'zly_kod' using errcode = '22023'; end if;
  update public.overenie_prijemcu set suhlas = now() where id = o.id;
end $$;

-- 6 · pri zapečatení: príjemca osobne overený touto stránkou, súhlasil s rozdelením, overenie ešte nepoužité
create or replace function public.prijemca_overeny_osobne(p_ovp uuid, p_stranka text, p_ucet uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select p_ovp is not null and exists (
    select 1 from public.overenie_prijemcu o join public.ucet u on u.id = o.prijemca
     where o.id = p_ovp and o.stranka = p_stranka and o.prijemca = p_ucet and o.suhlas is not null and o.zbierka is null
       and u.stav_registracie = 'hotovo')
$$;
revoke all on function public.prijemca_overeny_osobne(uuid, text, uuid) from public, anon, authenticated;

create or replace function public.zbierka_rozdelenie() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  r jsonb := new.nastavenie->'rozdelenie'; e jsonb; v_s public.stranka; v_ov public.stranka;
  v_sum numeric := 0; v_n int := 2; v_prij int := 0; v_ovn int := 0; v_pod int := 0; v_ucet uuid; v_test boolean; v_ovp uuid;
  STROP constant numeric := 100; OV_MAX constant numeric := 0.03; POD_MIN constant numeric := 0.05; POD_MAX constant int := 2;
begin
  if new.zapecatena is null or r is null or jsonb_typeof(r) <> 'array' then return null; end if;
  if tg_op = 'UPDATE' and old.zapecatena is not null then return null; end if;
  select * into v_ov from public.stranka where id = new.stranka;
  if not found then raise exception 'Zbierka s rozdelením potrebuje stránku overovateľa.' using errcode = '23502', detail = 'bez_overovatela'; end if;
  v_test := v_ov.testovacia;
  for e in select * from jsonb_array_elements(r) loop
    if coalesce((e->>'podiel')::numeric, -1) < 0 then
      raise exception 'Podiel musí byť 0 až 100 %%.' using errcode = '22023', detail = 'split_podiel';
    end if;
    v_sum := v_sum + (e->>'podiel')::numeric;
    if e->>'druh' = 'prijemca' then
      v_prij := v_prij + 1;
      v_ucet := nullif(e->>'ucet', '')::uuid;
      -- 0104: príjemca je overený aj osobným overením na fare (sken QR + kód v jeho appke), kým nie je overenie totožnosti
      v_ovp := nullif(new.nastavenie->>'overenie_prijemcu', '')::uuid;
      if v_ucet is null or not (public.ucet_overeny(v_ucet, v_test) or public.prijemca_overeny_osobne(v_ovp, new.stranka, v_ucet)) then
        raise exception 'Príjemca nemá overený účet.' using errcode = '42501', detail = 'prijemca_neovereny',
          hint = 'Príjemca naskenuje QR farnosti v appke DEED, potvrdí sa a napíše kód z upozornenia. Potrebuje dokončenú registráciu.';
      end if;
      if v_ovp is not null then update public.overenie_prijemcu set zbierka = new.id where id = v_ovp and zbierka is null; end if;
      insert into public.zbierka_podiel (zbierka, poradie, druh, ucet, text, podiel)
        values (new.id, 1, 'prijemca', v_ucet, e->>'text', (e->>'podiel')::numeric);
    elsif e->>'druh' = 'overovatel' then
      v_ovn := v_ovn + 1;
      if (e->>'podiel')::numeric > OV_MAX then
        raise exception 'Podiel overovateľa je najviac 3 %%.' using errcode = '22023', detail = 'overovatel_podiel';
      end if;
      insert into public.zbierka_podiel (zbierka, poradie, druh, ucet, stranka, text, podiel, sluzba, strop)
        values (new.id, 2, 'overovatel', v_ov.ucet_id, v_ov.id, v_ov.nazov, (e->>'podiel')::numeric, v_ov.typ <> 'farnost', STROP);
    elsif e->>'druh' = 'podelene' then
      v_pod := v_pod + 1;
      select * into v_s from public.stranka where id = e->>'stranka';
      if not found then
        raise exception 'Podeliť sa dá len so stránkou registrovanou v DEED.' using errcode = '23502', detail = 'podelene_mimo_deed';
      end if;
      if (e->>'podiel')::numeric < POD_MIN then
        raise exception 'Podelený podiel je aspoň 5 %%.' using errcode = '22023', detail = 'podelene_podiel';
      end if;
      if not public.stranka_overena(v_s.id) and not (v_test and v_s.testovacia) then
        raise exception 'Stránka % nemá overený účet.', v_s.nazov using errcode = '42501', detail = 'podelene_neovereny';
      end if;
      v_n := v_n + 1;
      insert into public.zbierka_podiel (zbierka, poradie, druh, ucet, stranka, text, podiel)
        values (new.id, v_n, 'podelene', v_s.ucet_id, v_s.id, v_s.nazov, (e->>'podiel')::numeric);
    else
      raise exception 'Neznámy druh podielu.' using errcode = '22023', detail = 'split_druh';
    end if;
  end loop;
  if v_prij <> 1 or v_ovn > 1 or v_pod > POD_MAX then
    raise exception 'Rozdelenie: jeden príjemca, najviac jeden overovateľ a najviac 2 podelené.' using errcode = '22023', detail = 'split_tvar';
  end if;
  if abs(v_sum - 1.0) > 0.0005 then
    raise exception 'Súčet podielov musí byť 100 %%.' using errcode = '22023', detail = 'split_sucet';
  end if;
  return null;
end $$;

-- 7 · Moja zbierka príjemcu
create or replace function public.moje_zbierky_prijemcu() returns setof public.zbierka_moja
  language sql stable security definer set search_path = public as $$
  select m.* from public.zbierka_moja m
   where m.id in (select p.zbierka from public.zbierka_podiel p where p.druh = 'prijemca' and p.ucet = public.moj_ucet())
   order by m.vytvorene desc
$$;

create or replace function public.ukonci_zbierku(p_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ucet uuid := public.moj_ucet();
  v_z    public.zbierka%rowtype;
begin
  if v_ucet is null then
    raise exception 'Prihláste sa.' using errcode = '42501';
  end if;
  select * into v_z from public.zbierka where id = p_id for update;
  if not found then
    raise exception 'Zbierka neexistuje.' using errcode = 'P0002';
  end if;
  if not (v_z.ucet_id = v_ucet or (v_z.stranka is not null and public.spravujem_stranku(v_z.stranka))
          or exists (select 1 from public.zbierka_podiel p where p.zbierka = p_id and p.druh = 'prijemca' and p.ucet = v_ucet)) then
    raise exception 'Túto zbierku nespravujete.' using errcode = '42501';
  end if;
  if v_z.stav = 'aktivna' then
    update public.zbierka set stav = 'ukoncena' where id = p_id;
  end if;
  return (select stav from public.zbierka where id = p_id);
end;
$$;


revoke all on function public.ovp_zaloz(text, text) from public, anon;
revoke all on function public.ovp_token(uuid) from public, anon;
revoke all on function public.ovp_stav(uuid) from public, anon;
revoke all on function public.ovp_kod(uuid, text) from public, anon;
revoke all on function public.ovp_potvrd(text) from public, anon;
revoke all on function public.ovp_suhlas(text, text) from public, anon;
revoke all on function public.moje_zbierky_prijemcu() from public, anon;
revoke all on function public.ovp_otvor(text) from public;
revoke all on function public.ovp_nahlad(text) from public;
grant execute on function public.ovp_zaloz(text, text), public.ovp_token(uuid), public.ovp_stav(uuid), public.ovp_kod(uuid, text),
  public.ovp_potvrd(text), public.ovp_suhlas(text, text), public.moje_zbierky_prijemcu() to authenticated;
grant execute on function public.ovp_otvor(text), public.ovp_nahlad(text) to anon, authenticated;

commit;
