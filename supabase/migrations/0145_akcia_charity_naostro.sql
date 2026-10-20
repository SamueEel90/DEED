-- ============================================================
-- 0145 · OPRAVY 446 · akcia za charitu „Akcia práve začína“ naostro (bez DEV simulácie)
-- ------------------------------------------------------------
-- 1. akcia_pridaj_skenom(akcia, kód) — organizátor naskenuje Môj QR účastníka (podpísaný kód 0144),
--    server zapíše príchod do dochadzka a pošle účastníkovi „Si na akcii … ✓“.
-- 2. akcia_info(token) / akcia_pripoj(token, poloha) — účastník naskenuje rotujúci QR charity (event_token, 0015)
--    → okno „Pripojiť sa k akcii …?“. Kód platí 60 s od zobrazenia (prihlásenie medzi skenom a potvrdením),
--    snímka obrazovky staršia ako minúta neplatí. Poloha ako pri scan_validate (polomer od miesta štartu).
-- 3. akcia_ucastnici(akcia) — zoznam účastníkov pre organizátora (jeden zdroj: dochadzka),
--    akcia_odober(akcia, účet) — organizátor odoberie účastníka.
-- ============================================================
begin;

-- 1 ----------------------------------------------------------
create or replace function public.akcia_pridaj_skenom(p_akcia uuid, p_kod text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_u uuid; e public.event_secret; v_meno text;
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  if not public.organizujem(p_akcia) then raise exception 'Účastníkov skenuje len organizátor akcie.' using errcode = '42501', detail = 'nie_organizator'; end if;
  select * into e from public.event_secret where event_id = p_akcia;
  if e.koniec is not null then raise exception 'Akcia už skončila.' using errcode = '22023', detail = 'skoncila'; end if;
  v_u := public.qr_kod_ucet(p_kod);
  if v_u is null then raise exception 'Kód neplatí. Nech účastník otvorí Môj QR znova a ukáže aktuálny kód.' using errcode = '22023', detail = 'kod_neplati'; end if;
  if v_u = v_ja then raise exception 'Vlastný kód naskenovať nemôžete.' using errcode = '22023', detail = 'vlastny'; end if;
  v_meno := public.meno_pomocnika(v_u);
  insert into public.dochadzka (event_id, user_id, prichod, mod, splneny) values (p_akcia, v_u, now(), e.mod, false)
    on conflict (event_id, user_id) do nothing;
  if found then
    perform public.notifikuj_ucet(v_u, 'Si na akcii ' || coalesce(nullif(trim(e.nazov), ''), 'charity') || ' ✓', 'Organizátor ťa pridal skenom. Keď akciu ukončí, skutok ti príde do denníka.', 'kal');
  end if;
  return jsonb_build_object('ucet', v_u, 'meno', v_meno);
end $$;
revoke all on function public.akcia_pridaj_skenom(uuid, text) from public, anon;
grant execute on function public.akcia_pridaj_skenom(uuid, text) to authenticated, service_role;

-- 2 ----------------------------------------------------------
/** akcia z kódu QR charity, ak podpis sedí a kód nie je starší ako 60 s; inak null */
create or replace function public.akcia_z_kodu(p_token text) returns uuid
  language plpgsql stable security definer set search_path = public, extensions as $$
declare parts text[]; v_event uuid; v_counter bigint; e public.event_secret;
begin
  parts := string_to_array(coalesce(p_token, ''), '.');
  if array_length(parts, 1) <> 4 or parts[1] <> 'DEED1' then return null; end if;
  begin v_event := parts[2]::uuid; v_counter := parts[3]::bigint; exception when others then return null; end;
  select * into e from public.event_secret where event_id = v_event;
  if e.secret is null then return null; end if;
  if left(encode(extensions.hmac(convert_to(v_event::text || '.' || v_counter::text, 'UTF8'), e.secret, 'sha256'), 'hex'), 16) <> parts[4] then return null; end if;
  if (floor(extract(epoch from now()) / e.step)::bigint - v_counter) * e.step > 60 or v_counter > floor(extract(epoch from now()) / e.step)::bigint + 1 then return null; end if;
  return v_event;
end $$;
revoke all on function public.akcia_z_kodu(text) from public, anon, authenticated;

/** okno „Pripojiť sa k akcii …?“ — aj pred prihlásením (len názov a stav) */
create or replace function public.akcia_info(p_token text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare v_event uuid := public.akcia_z_kodu(p_token); e public.event_secret;
begin
  if v_event is null then return jsonb_build_object('plati', false); end if;
  select * into e from public.event_secret where event_id = v_event;
  return jsonb_build_object('plati', e.koniec is null, 'skoncila', e.koniec is not null,
    'nazov', coalesce(nullif(trim(e.nazov), ''), 'Akcia charity'),
    'som', exists (select 1 from public.dochadzka d where d.event_id = v_event and d.user_id = public.moj_ucet()),
    'organizator', public.organizujem(v_event));
end $$;
revoke all on function public.akcia_info(text) from public;
grant execute on function public.akcia_info(text) to anon, authenticated, service_role;

create or replace function public.akcia_pripoj(p_token text, p_lat double precision default null, p_lng double precision default null) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_event uuid; e public.event_secret;
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  if (select count(*) from public.scan_log where user_id = v_ja and cas > now() - interval '1 minute') >= 20 then
    raise exception 'Priveľa pokusov. Skúste o minútu.' using errcode = '22023', detail = 'limit';
  end if;
  v_event := public.akcia_z_kodu(p_token);
  if v_event is null then raise exception 'Kód už neplatí. Naskenujte QR charity znova.' using errcode = '22023', detail = 'kod_neplati'; end if;
  select * into e from public.event_secret where event_id = v_event;
  if e.koniec is not null then raise exception 'Akcia už skončila.' using errcode = '22023', detail = 'skoncila'; end if;
  if public.organizujem(v_event) then raise exception 'Túto akciu vediete vy.' using errcode = '22023', detail = 'organizator'; end if;
  if e.lat is not null and (p_lat is null or p_lng is null) then
    raise exception 'Zapnite polohu. Bez nej sa k akcii nepripojíte.' using errcode = '22023', detail = 'bez_polohy';
  end if;
  if e.lat is not null and public.vzdialenost_m(e.lat, e.lng, p_lat, p_lng) > e.polomer_m then
    insert into public.scan_log (event_id, user_id, device_id, counter, vysledok, gps) values (v_event, v_ja, 'ucet:' || v_ja::text, 0, 'out_of_radius', point(p_lng, p_lat));
    raise exception 'Ste príliš ďaleko od miesta akcie.' using errcode = '22023', detail = 'mimo';
  end if;
  insert into public.dochadzka (event_id, user_id, prichod, mod, splneny) values (v_event, v_ja, now(), e.mod, false)
    on conflict (event_id, user_id) do nothing;
  return jsonb_build_object('nazov', coalesce(nullif(trim(e.nazov), ''), 'Akcia charity'), 'nove', found);
end $$;
revoke all on function public.akcia_pripoj(text, double precision, double precision) from public, anon;
grant execute on function public.akcia_pripoj(text, double precision, double precision) to authenticated, service_role;

-- 3 ----------------------------------------------------------
create or replace function public.akcia_ucastnici(p_akcia uuid) returns table (ucet uuid, meno text, prichod timestamptz, odchod timestamptz)
  language sql stable security definer set search_path = public as $$
  select d.user_id, public.meno_pomocnika(d.user_id), d.prichod, d.odchod
    from public.dochadzka d
   where d.event_id = p_akcia and d.user_id is not null and public.organizujem(p_akcia)
   order by d.prichod;
$$;
revoke all on function public.akcia_ucastnici(uuid) from public, anon;
grant execute on function public.akcia_ucastnici(uuid) to authenticated, service_role;

create or replace function public.akcia_odober(p_akcia uuid, p_ucet uuid) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.organizujem(p_akcia) then raise exception 'Odoberá len organizátor akcie.' using errcode = '42501', detail = 'nie_organizator'; end if;
  delete from public.dochadzka where event_id = p_akcia and user_id = p_ucet;
  return found;
end $$;
revoke all on function public.akcia_odober(uuid, uuid) from public, anon;
grant execute on function public.akcia_odober(uuid, uuid) to authenticated, service_role;

commit;
