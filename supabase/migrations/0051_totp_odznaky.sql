-- ============================================================
-- 0051 · Zadanie 4 · 4.5 — TOTP a odznaky proti farmeniu
-- ------------------------------------------------------------
-- Akcia (event_secret) patrí organizátorovi:
--   · event_secret_create: len vlastník akcie (ak je akcia príspevok, jeho autor/správca; inak ten,
--     kto ju založil prvý). Cudziu akciu neprepíše — chyba.
--   · event_token: rotujúci kód dostane LEN organizátor (zobrazuje ho na mieste). Na diaľku ho nikto
--     iný nezíska → sken bez účasti nejde.
--   · event_poloha: organizátor pri štarte uloží polohu akcie; event_ukonci: ukončí akciu pre všetkých.
-- scan_validate: zariadenie = účet (nie reťazec od klienta) → jeden platný sken na účet a okno.
--   Akcia s polohou: sken bez GPS alebo ďalej než polomer = out_of_radius (nič sa nezapíše).
-- Splnené = podiel prítomnosti na trvaní akcie ≥ prah_pct (počíta event_ukonci), nie dva skeny.
-- Odznak: na zmenu sa prihlási len potvrdený zamestnanec firmy (väzba 0045); badge_create len správca
--   firmy; badge_aggregate len správca a len skupiny s k ≥ 5 pochvalami (k-anonymita).
-- ============================================================
begin;

alter table public.event_secret add column if not exists zaciatok timestamptz not null default now();
alter table public.event_secret add column if not exists koniec timestamptz;
alter table public.event_secret add column if not exists lat double precision;
alter table public.event_secret add column if not exists lng double precision;
alter table public.event_secret add column if not exists polomer_m int not null default 300;

-- vzdialenosť v metroch (haversine)
create or replace function public.vzdialenost_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
  returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- som organizátor tejto akcie?
create or replace function public.organizujem(p_event uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.event_secret e where e.event_id = p_event and public.spravujem_ucet(e.organizator))
$$;
revoke all on function public.organizujem(uuid) from public, anon, authenticated;

create or replace function public.event_secret_create(p_event uuid, p_step integer default 15, p_mod text default 'threshold', p_nazov text default null)
  returns uuid
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.ja_prihlaseny(); v_autor uuid; v_org uuid;
begin
  select autor_ucet_id into v_autor from public.prispevok where id = p_event;
  if v_autor is not null and not public.spravujem_ucet(v_autor) then
    raise exception 'Akciu môže viesť len jej organizátor.' using errcode = '42501', detail = 'cudzia_akcia';
  end if;
  select organizator into v_org from public.event_secret where event_id = p_event;
  if found and not public.spravujem_ucet(v_org) then
    raise exception 'Akciu môže viesť len jej organizátor.' using errcode = '42501', detail = 'cudzia_akcia';
  end if;
  insert into public.event_secret (event_id, secret, step, mod, nazov, organizator)
    values (p_event, gen_random_bytes(32), greatest(coalesce(p_step,15), 5), coalesce(p_mod,'threshold'), p_nazov, coalesce(v_autor, v_ja))
    on conflict (event_id) do update
      set step = excluded.step, mod = excluded.mod, nazov = coalesce(excluded.nazov, public.event_secret.nazov);   -- secret sa nerotuje
  return p_event;
end $$;

create or replace function public.event_token(p_event uuid) returns text
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_secret bytea; v_step int; v_counter bigint; v_data text; v_sig text;
begin
  perform public.ja_prihlaseny();
  if not public.organizujem(p_event) then
    raise exception 'Kód akcie zobrazuje len organizátor.' using errcode = '42501', detail = 'nie_organizator';
  end if;
  select secret, step into v_secret, v_step from public.event_secret where event_id = p_event and koniec is null;
  if v_secret is null then return null; end if;
  v_counter := floor(extract(epoch from now()) / v_step)::bigint;
  v_data := p_event::text || '.' || v_counter::text;
  v_sig := encode(extensions.hmac(convert_to(v_data,'UTF8'), v_secret, 'sha256'), 'hex');
  return 'DEED1.' || p_event::text || '.' || v_counter::text || '.' || left(v_sig, 16);
end $$;

create or replace function public.event_poloha(p_event uuid, p_lat double precision, p_lng double precision) returns void
  language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.ja_prihlaseny();
  -- štart môže prísť skôr, než si obrazovka vypýtala kód — akcia sa založí tu (vlastníctvo overí event_secret_create)
  if not exists (select 1 from public.event_secret where event_id = p_event) then perform public.event_secret_create(p_event); end if;
  if not public.organizujem(p_event) then raise exception 'nie_organizator' using errcode = '42501'; end if;
  if p_lat is null or p_lng is null then raise exception 'Bez polohy akciu nespustíš.' using errcode = '22023'; end if;
  update public.event_secret set lat = p_lat, lng = p_lng, zaciatok = now() where event_id = p_event;
end $$;

-- koniec pre všetkých: splnené = prítomnosť / trvanie ≥ prah_pct
create or replace function public.event_ukonci(p_event uuid) returns int
  language plpgsql volatile security definer set search_path = public as $$
declare e public.event_secret; n int;
begin
  perform public.ja_prihlaseny();
  if not public.organizujem(p_event) then raise exception 'nie_organizator' using errcode = '42501'; end if;
  update public.event_secret set koniec = coalesce(koniec, now()) where event_id = p_event returning * into e;
  update public.dochadzka d set
      odchod = coalesce(d.odchod, e.koniec),
      hodiny = round(extract(epoch from (least(coalesce(d.odchod, e.koniec), e.koniec) - greatest(d.prichod, e.zaciatok))) / 3600.0, 2),
      splneny = e.koniec > e.zaciatok
        and extract(epoch from (least(coalesce(d.odchod, e.koniec), e.koniec) - greatest(d.prichod, e.zaciatok)))
            / extract(epoch from (e.koniec - e.zaciatok)) * 100 >= e.prah_pct
    where d.event_id = p_event and d.prichod is not null;
  get diagnostics n = row_count;
  return n;
end $$;

drop function if exists public.scan_validate(text,text,double precision,double precision);
create function public.scan_validate(p_token text, p_lat double precision default null, p_lng double precision default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  parts text[]; v_event uuid; v_counter bigint; v_sig text; e public.event_secret;
  v_calc text; v_now bigint; v_logid bigint; v_doch public.dochadzka; v_ja uuid := public.ja_prihlaseny();
  v_dev text := 'ucet:' || v_ja::text;            -- zariadenie = účet (nie reťazec od klienta)
  v_gps point := case when p_lat is not null and p_lng is not null then point(p_lng, p_lat) end;
begin
  parts := string_to_array(coalesce(p_token,''), '.');
  if array_length(parts,1) <> 4 or parts[1] <> 'DEED1' then return jsonb_build_object('vysledok','fake'); end if;
  begin
    v_event := parts[2]::uuid; v_counter := parts[3]::bigint;
  exception when others then return jsonb_build_object('vysledok','fake');
  end;
  v_sig := parts[4];
  select * into e from public.event_secret where event_id = v_event;
  if e.secret is null or e.koniec is not null then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,v_dev,v_counter,'fake');
    return jsonb_build_object('vysledok','fake');
  end if;
  v_calc := left(encode(extensions.hmac(convert_to(v_event::text || '.' || v_counter::text,'UTF8'), e.secret, 'sha256'), 'hex'), 16);
  if v_calc <> v_sig then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,v_dev,v_counter,'fake');
    return jsonb_build_object('vysledok','fake');
  end if;
  v_now := floor(extract(epoch from now()) / e.step)::bigint;
  if abs(v_now - v_counter) > 1 then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,v_dev,v_counter,'expired');
    return jsonb_build_object('vysledok','expired');
  end if;
  -- akcia s polohou: bez GPS alebo mimo polomeru sa nič nezapíše
  if e.lat is not null and (v_gps is null or public.vzdialenost_m(e.lat, e.lng, p_lat, p_lng) > e.polomer_m) then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok,gps) values (v_event,v_ja,v_dev,v_counter,'out_of_radius',v_gps);
    return jsonb_build_object('vysledok','out_of_radius');
  end if;
  insert into public.scan_log (event_id,user_id,device_id,counter,vysledok,gps)
    values (v_event,v_ja,v_dev,v_counter,'ok',v_gps)
    on conflict (event_id, device_id, counter) where vysledok = 'ok' do nothing
    returning id into v_logid;
  if v_logid is null then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,v_dev,v_counter,'replay');
    return jsonb_build_object('vysledok','replay');
  end if;
  -- prvý sken = príchod, ďalší (neskôr) = odchod; o splnení rozhodne event_ukonci podľa prah_pct
  select * into v_doch from public.dochadzka where event_id = v_event and user_id = v_ja;
  if not found then
    insert into public.dochadzka (event_id,user_id,prichod,mod,splneny) values (v_event,v_ja,now(),e.mod,false);
  elsif v_doch.prichod is not null and now() > v_doch.prichod + make_interval(secs => e.step * 2) then
    update public.dochadzka set odchod = now() where id = v_doch.id;
  end if;
  return jsonb_build_object('vysledok','ok','event', v_event, 'mod', e.mod);
end $$;

-- ---------- odznak ----------
create or replace function public.badge_bind(p_badge uuid, p_hodiny integer default 12) returns public.badge_bind
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_row public.badge_bind; v_ja uuid := public.ja_prihlaseny(); v_org uuid;
begin
  select org_ucet_id into v_org from public.odznak where id = p_badge;
  if v_org is null then raise exception 'Odznak neexistuje.' using errcode = 'P0002'; end if;
  if not public.je_zamestnanec(v_org, v_ja) then
    raise exception 'Na zmenu sa prihlási len potvrdený zamestnanec firmy.' using errcode = '42501', detail = 'nie_zamestnanec';
  end if;
  insert into public.badge_bind (badge_id, employee_id, shift_start, shift_end, auto_unbind)
    values (p_badge, v_ja, now(), null, now() + make_interval(hours => least(greatest(coalesce(p_hodiny,12),1), 16)))
    on conflict (badge_id) do update
      set employee_id = excluded.employee_id, shift_start = excluded.shift_start, shift_end = null, auto_unbind = excluded.auto_unbind
    returning * into v_row;
  return v_row;
end $$;

create or replace function public.badge_create(p_org uuid, p_pobocka bigint default null, p_nazov text default null) returns public.odznak
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_slug text; v_row public.odznak;
begin
  perform public.ja_prihlaseny();
  if not public.spravujem_ucet(p_org) then raise exception 'Odznak zakladá len správca firmy.' using errcode = '42501', detail = 'nie_spravca'; end if;
  v_slug := public.gen_slug();
  insert into public.odznak (org_ucet_id, pobocka_id, nazov, slug) values (p_org, p_pobocka, p_nazov, v_slug) returning * into v_row;
  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','badge', v_row.id::text, v_slug, 'https://deed.good/badge/'||v_slug, 'b2b')
    on conflict (objekt_druh, objekt_ref) do nothing;
  return v_row;
end $$;

create or replace function public.badge_aggregate(p_org uuid) returns table(employee_id uuid, pochval bigint)
  language plpgsql stable security definer set search_path = public, extensions as $$
begin
  perform public.ja_prihlaseny();
  if not public.spravujem_ucet(p_org) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  return query
    select p.employee_id, count(*) as pochval
      from public.pochvala p join public.odznak o on o.id = p.badge_id
     where o.org_ucet_id = p_org and p.employee_id is not null
     group by p.employee_id
    having count(*) >= 5                                   -- k-anonymita: menšie skupiny sa nevracajú
     order by 2 desc;
end $$;

revoke all on function public.event_poloha(uuid,double precision,double precision), public.event_ukonci(uuid),
  public.scan_validate(text,double precision,double precision), public.badge_create(uuid,bigint,text), public.badge_aggregate(uuid)
  from public, anon;
grant execute on function public.event_poloha(uuid,double precision,double precision), public.event_ukonci(uuid),
  public.scan_validate(text,double precision,double precision), public.badge_create(uuid,bigint,text), public.badge_aggregate(uuid)
  to authenticated, service_role;

commit;
