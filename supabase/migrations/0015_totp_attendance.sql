-- ============================================================
-- DEED · QR — TOTP proof-of-presence (rotujúce QR)   [Fáza 3]
-- ------------------------------------------------------------
-- Rotujúci QR (RFC 6238, HMAC-SHA256) na overenie fyzickej prítomnosti.
-- Secret žije LEN na serveri (event_secret, revoke + RLS deny) — generovanie aj
-- validácia idú cez SECURITY DEFINER RPC s pgcrypto `extensions.hmac`.
-- Validácia + anti-replay zápis = JEDNA transakcia (partial unique `scan_once`).
-- DB `now()` na oboch stranách (žiadny klientský čas — kvôli ±1 tolerancii).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- EVENT SECRET (secret NIKDY neopustí server) ----------
create table public.event_secret (
  event_id     uuid primary key,                  -- ID akcie/VTO/identity (opaque)
  secret       bytea not null,                     -- 256-bit; čítané len vnútri SECURITY DEFINER RPC
  step         int  not null default 15,           -- s (identita = 30)
  alg          text not null default 'sha256',
  mod          text not null default 'threshold' check (mod in ('threshold','exact','milestone')),
  prah_pct     int  not null default 60,
  nazov        text,
  organizator  uuid references public.ucet(id) on delete set null,
  vytvorene    timestamptz not null default now()
);
alter table public.event_secret enable row level security;       -- bez politiky → anon/auth nečíta
revoke all on public.event_secret from anon, authenticated;      -- secret len cez definer RPC

-- ---------- SCAN LOG (anti-replay) ----------
create table public.scan_log (
  id        bigint generated always as identity primary key,
  event_id  uuid not null,
  user_id   uuid references public.ucet(id) on delete set null,
  device_id text not null,
  counter   bigint not null,
  vysledok  text not null check (vysledok in ('ok','fake','expired','replay','out_of_radius')),
  gps       point,
  cas       timestamptz not null default now()
);
-- ANTI-REPLAY: jedna (event, device, counter) smie uspieť (ok) najviac raz
create unique index scan_once on public.scan_log (event_id, device_id, counter) where vysledok = 'ok';
create index on public.scan_log (event_id, cas desc);

-- ---------- DOCHÁDZKA (3 režimy) ----------
create table public.dochadzka (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null,
  user_id   uuid references public.ucet(id) on delete set null,
  prichod   timestamptz,
  odchod    timestamptz,
  mod       text not null check (mod in ('threshold','exact','milestone')),
  hodiny    numeric(6,2),
  splneny   boolean not null default false,
  vytvorene timestamptz not null default now(),
  unique (event_id, user_id)
);
create index on public.dochadzka (event_id);

-- ============================================================
-- RPC event_secret_create — vygeneruj secret (organizátor). Nemení existujúci secret.
-- ============================================================
create or replace function public.event_secret_create(
  p_event uuid, p_step int default 15, p_mod text default 'threshold',
  p_nazov text default null, p_organizator uuid default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $fn$
begin
  insert into public.event_secret (event_id, secret, step, mod, nazov, organizator)
    values (p_event, gen_random_bytes(32), greatest(coalesce(p_step,15), 5), coalesce(p_mod,'threshold'), p_nazov, p_organizator)
    on conflict (event_id) do update
      set step = excluded.step, mod = excluded.mod,
          nazov = coalesce(excluded.nazov, public.event_secret.nazov);  -- secret sa NErotuje
  return p_event;
end;
$fn$;
grant execute on function public.event_secret_create(uuid,int,text,text,uuid) to anon, authenticated;

-- ============================================================
-- RPC event_token — vráť čerstvý TOTP token (organizátor zobrazí). Secret sa nevracia.
-- ============================================================
create or replace function public.event_token(p_event uuid) returns text
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_secret  bytea; v_step int; v_counter bigint; v_data text; v_sig text;
begin
  select secret, step into v_secret, v_step from public.event_secret where event_id = p_event;
  if v_secret is null then return null; end if;
  v_counter := floor(extract(epoch from now()) / v_step)::bigint;
  v_data := p_event::text || '.' || v_counter::text;
  v_sig := encode(extensions.hmac(convert_to(v_data,'UTF8'), v_secret, 'sha256'), 'hex');
  return 'DEED1.' || p_event::text || '.' || v_counter::text || '.' || left(v_sig, 16);
end;
$fn$;
grant execute on function public.event_token(uuid) to anon, authenticated;

-- ============================================================
-- RPC scan_validate — overenie skenu + anti-replay + zápis dochádzky (/scan)
-- ============================================================
create or replace function public.scan_validate(
  p_token text, p_device text, p_user uuid default null,
  p_lat float8 default null, p_lng float8 default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  parts text[]; v_event uuid; v_counter bigint; v_sig text;
  v_secret bytea; v_step int; v_mod text;
  v_data text; v_calc text; v_now bigint; v_logid bigint; v_doch public.dochadzka;
begin
  parts := string_to_array(coalesce(p_token,''), '.');
  if array_length(parts,1) <> 4 or parts[1] <> 'DEED1' then
    return jsonb_build_object('vysledok','fake');
  end if;
  begin
    v_event := parts[2]::uuid; v_counter := parts[3]::bigint;
  exception when others then
    return jsonb_build_object('vysledok','fake');
  end;
  v_sig := parts[4];

  select secret, step, mod into v_secret, v_step, v_mod from public.event_secret where event_id = v_event;
  if v_secret is null then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,p_user,p_device,v_counter,'fake');
    return jsonb_build_object('vysledok','fake');
  end if;

  v_data := v_event::text || '.' || v_counter::text;
  v_calc := left(encode(extensions.hmac(convert_to(v_data,'UTF8'), v_secret, 'sha256'), 'hex'), 16);
  if v_calc <> v_sig then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,p_user,p_device,v_counter,'fake');
    return jsonb_build_object('vysledok','fake');
  end if;

  v_now := floor(extract(epoch from now()) / v_step)::bigint;
  if abs(v_now - v_counter) > 1 then     -- screenshot mimo okna ±1
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,p_user,p_device,v_counter,'expired');
    return jsonb_build_object('vysledok','expired');
  end if;

  -- ATOMICKÝ anti-replay: jeden ok na (event,device,counter)
  insert into public.scan_log (event_id,user_id,device_id,counter,vysledok,gps)
    values (v_event,p_user,p_device,v_counter,'ok',
            case when p_lat is not null and p_lng is not null then point(p_lng,p_lat) else null end)
    on conflict (event_id, device_id, counter) where vysledok = 'ok' do nothing
    returning id into v_logid;
  if v_logid is null then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,p_user,p_device,v_counter,'replay');
    return jsonb_build_object('vysledok','replay');
  end if;

  -- dochádzka (len ak je účet): príchod / odchod podľa režimu
  if p_user is not null then
    select * into v_doch from public.dochadzka where event_id = v_event and user_id = p_user;
    if not found then
      insert into public.dochadzka (event_id,user_id,prichod,mod,splneny) values (v_event,p_user,now(),v_mod,false);
    elsif v_doch.prichod is not null and v_doch.odchod is null then
      update public.dochadzka set odchod = now(),
        hodiny = round(extract(epoch from (now() - v_doch.prichod)) / 3600.0, 2),
        splneny = true
        where id = v_doch.id;
    end if;
  end if;

  return jsonb_build_object('vysledok','ok','event', v_event, 'mod', v_mod);
end;
$fn$;
grant execute on function public.scan_validate(text,text,uuid,float8,float8) to anon, authenticated;

-- ---------- RLS (scan_log + dochadzka TEST-ONLY; event_secret zostáva zamknutý) ----------
do $$
declare t text;
begin
  foreach t in array array['scan_log','dochadzka'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists test_all_access on public.%I', t);
    execute format(
      'create policy test_all_access on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
