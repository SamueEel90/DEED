-- ============================================================
-- 0048 · Rotujúci QR (0015) — diery 1 až 4 z kontroly 22. 9. (Samuel, 6. 10. 2026)
-- ------------------------------------------------------------
-- 1. event_token volá len organizátor akcie (organizator = moj_ucet()). Token sa nedá vyrobiť z domu.
-- 2. event_secret_create len prihlásený (nie anon). Organizátor = moj_ucet() (parameter p_organizator sa
--    ignoruje). Existujúcu akciu mení len jej organizátor; krok je 5–60 s (nie hodina).
-- 3. scan_validate: používateľ je moj_ucet(), p_user od klienta sa ignoruje (podpis ostáva kvôli appke).
--    Limit: najviac 20 pokusov za minútu na účet (bez účtu na zariadenie) → 'limit';
--    jeden účet = najviac jeden úspešný sken v okne kódu (aj z viacerých zariadení).
-- 4. scan_log a dochadzka bez testovacieho RLS: klient do nich nepíše (len cez funkcie vyššie),
--    dochádzku vidí jej človek a organizátor akcie, záznam skenov len organizátor.
-- Body 5 (GPS, okruh akcie) a 6 (režimy dochádzky, prah_pct) sú dorobenie funkcií — nie sú tu.
-- Spúšťa sa po 0047.
-- ============================================================
begin;

-- ---------- 2 · vytvorenie / úprava akcie ----------
create or replace function public.event_secret_create(
  p_event uuid, p_step int default 15, p_mod text default 'threshold',
  p_nazov text default null, p_organizator uuid default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_ja uuid := public.moj_ucet(); v_org uuid; v_step int := greatest(5, least(60, coalesce(p_step, 15)));
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select organizator into v_org from public.event_secret where event_id = p_event for update;
  if found then
    if v_org is distinct from v_ja then
      raise exception 'Akciu môže meniť len jej organizátor.' using errcode = '42501', detail = 'nie_organizator';
    end if;
    update public.event_secret
       set step = v_step, mod = coalesce(p_mod, mod), nazov = coalesce(p_nazov, nazov)   -- secret sa NErotuje
     where event_id = p_event;
  else
    insert into public.event_secret (event_id, secret, step, mod, nazov, organizator)
      values (p_event, gen_random_bytes(32), v_step, coalesce(p_mod, 'threshold'), p_nazov, v_ja);
  end if;
  return p_event;
end;
$fn$;
revoke all on function public.event_secret_create(uuid, int, text, text, uuid) from public, anon;
grant execute on function public.event_secret_create(uuid, int, text, text, uuid) to authenticated;

-- ---------- 1 · token len pre organizátora ----------
create or replace function public.event_token(p_event uuid) returns text
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_secret bytea; v_step int; v_org uuid; v_counter bigint; v_data text; v_sig text;
begin
  select secret, step, organizator into v_secret, v_step, v_org from public.event_secret where event_id = p_event;
  if v_secret is null then return null; end if;
  if public.moj_ucet() is null or v_org is distinct from public.moj_ucet() then
    raise exception 'Kód akcie zobrazí len jej organizátor.' using errcode = '42501', detail = 'nie_organizator';
  end if;
  v_counter := floor(extract(epoch from now()) / v_step)::bigint;
  v_data := p_event::text || '.' || v_counter::text;
  v_sig := encode(extensions.hmac(convert_to(v_data, 'UTF8'), v_secret, 'sha256'), 'hex');
  return 'DEED1.' || p_event::text || '.' || v_counter::text || '.' || left(v_sig, 16);
end;
$fn$;
revoke all on function public.event_token(uuid) from public, anon;
grant execute on function public.event_token(uuid) to authenticated;

-- ---------- 3 · sken: používateľ z auth, limit ----------
alter table public.scan_log drop constraint if exists scan_log_vysledok_check;
alter table public.scan_log add constraint scan_log_vysledok_check
  check (vysledok in ('ok', 'fake', 'expired', 'replay', 'out_of_radius', 'limit'));
create index if not exists scan_log_user_idx on public.scan_log (user_id, cas desc) where user_id is not null;
create index if not exists scan_log_device_idx on public.scan_log (device_id, cas desc);
-- jeden účet = jeden úspešný sken v okne kódu (aj z viacerých zariadení)
create unique index if not exists scan_once_user on public.scan_log (event_id, user_id, counter)
  where vysledok = 'ok' and user_id is not null;

create or replace function public.scan_validate(
  p_token text, p_device text, p_user uuid default null,      -- p_user sa ignoruje (0048)
  p_lat float8 default null, p_lng float8 default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_user uuid := public.moj_ucet();
  parts text[]; v_event uuid; v_counter bigint; v_sig text;
  v_secret bytea; v_step int; v_mod text;
  v_data text; v_calc text; v_now bigint; v_logid bigint; v_doch public.dochadzka; v_pokusy int;
begin
  if coalesce(p_device, '') = '' then return jsonb_build_object('vysledok', 'fake'); end if;

  -- limit pokusov: 20 za minútu na účet, bez účtu na zariadenie
  select count(*) into v_pokusy from public.scan_log
   where cas > now() - interval '1 minute'
     and (case when v_user is not null then user_id = v_user else device_id = p_device end);
  if v_pokusy >= 20 then
    return jsonb_build_object('vysledok', 'limit');
  end if;

  parts := string_to_array(coalesce(p_token, ''), '.');
  if array_length(parts, 1) <> 4 or parts[1] <> 'DEED1' then
    return jsonb_build_object('vysledok', 'fake');
  end if;
  begin
    v_event := parts[2]::uuid; v_counter := parts[3]::bigint;
  exception when others then
    return jsonb_build_object('vysledok', 'fake');
  end;
  v_sig := parts[4];

  select secret, step, mod into v_secret, v_step, v_mod from public.event_secret where event_id = v_event;
  if v_secret is null then
    insert into public.scan_log (event_id, user_id, device_id, counter, vysledok) values (v_event, v_user, p_device, v_counter, 'fake');
    return jsonb_build_object('vysledok', 'fake');
  end if;

  v_data := v_event::text || '.' || v_counter::text;
  v_calc := left(encode(extensions.hmac(convert_to(v_data, 'UTF8'), v_secret, 'sha256'), 'hex'), 16);
  if v_calc <> v_sig then
    insert into public.scan_log (event_id, user_id, device_id, counter, vysledok) values (v_event, v_user, p_device, v_counter, 'fake');
    return jsonb_build_object('vysledok', 'fake');
  end if;

  v_now := floor(extract(epoch from now()) / v_step)::bigint;
  if abs(v_now - v_counter) > 1 then     -- snímka mimo okna ±1
    insert into public.scan_log (event_id, user_id, device_id, counter, vysledok) values (v_event, v_user, p_device, v_counter, 'expired');
    return jsonb_build_object('vysledok', 'expired');
  end if;

  -- ATOMICKÝ anti-replay: jeden ok na (akcia, zariadenie, okno) aj na (akcia, účet, okno)
  begin
    insert into public.scan_log (event_id, user_id, device_id, counter, vysledok, gps)
      values (v_event, v_user, p_device, v_counter, 'ok',
              case when p_lat is not null and p_lng is not null then point(p_lng, p_lat) else null end)
      returning id into v_logid;
  exception when unique_violation then
    v_logid := null;
  end;
  if v_logid is null then
    insert into public.scan_log (event_id, user_id, device_id, counter, vysledok) values (v_event, v_user, p_device, v_counter, 'replay');
    return jsonb_build_object('vysledok', 'replay');
  end if;

  -- dochádzka (len s účtom): príchod / odchod
  if v_user is not null then
    select * into v_doch from public.dochadzka where event_id = v_event and user_id = v_user for update;
    if not found then
      insert into public.dochadzka (event_id, user_id, prichod, mod, splneny) values (v_event, v_user, now(), v_mod, false);
    elsif v_doch.prichod is not null and v_doch.odchod is null then
      update public.dochadzka set odchod = now(),
        hodiny = round(extract(epoch from (now() - v_doch.prichod)) / 3600.0, 2),
        splneny = true
        where id = v_doch.id;
    end if;
  end if;

  return jsonb_build_object('vysledok', 'ok', 'event', v_event, 'mod', v_mod);
end;
$fn$;
grant execute on function public.scan_validate(text, text, uuid, float8, float8) to anon, authenticated;

-- ---------- 4 · RLS bez testovacieho „všetko povolené" ----------
drop policy if exists test_all_access on public.scan_log;
drop policy if exists test_all_access on public.dochadzka;
revoke insert, update, delete, truncate on public.scan_log, public.dochadzka from anon, authenticated;

-- organizátor akcie? (event_secret je pre klienta zamknutá, preto security definer)
create or replace function public.organizujem_akciu(p_event uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.event_secret e where e.event_id = p_event and e.organizator = public.moj_ucet() and public.moj_ucet() is not null)
$$;
revoke all on function public.organizujem_akciu(uuid) from public, anon;
grant execute on function public.organizujem_akciu(uuid) to authenticated;

drop policy if exists organizator_citat on public.scan_log;
create policy organizator_citat on public.scan_log for select to authenticated
  using (public.organizujem_akciu(event_id));

drop policy if exists moja_alebo_organizator on public.dochadzka;
create policy moja_alebo_organizator on public.dochadzka for select to authenticated
  using (user_id = public.moj_ucet()
         or public.organizujem_akciu(event_id));

commit;
