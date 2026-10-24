-- ============================================================
-- 0180 · Kontrola 24. 10. · N3 — štartovací kredit, dobitie a sken na akcii len pre overený účet
-- ------------------------------------------------------------
-- Doteraz: každá anonymná session dostala cez zaisti_ucet účet 'pasivny' a k nemu 1 240 DeeD (ucet_start_kredit
-- platil aj pre pasívny), vlastný limit AI skóre a vlastný sken na akcii. Anonymných účtov je neobmedzene →
-- neobmedzený kredit, falošné dary (s N2) a falošné rebríčky.
-- Teraz:
--   1. Štartovací kredit 1 240 DeeD dostane účet až keď je 'aktivny' a overený (telefón alebo e-mail) — pri založení
--      alebo neskôr pri dokončení registrácie anonymného účtu. Raz (ucet.start_kredit). Len kým je zapnutá
--      testovacia pokladňa (0037 bez zmeny).
--   2. testovacie_dobitie: len overený 'aktivny' účet.
--   3. scan_validate: sken rotujúceho QR len overený 'aktivny' účet ('neovereny'), inak nič sa nezapíše.
--   (Limit AI skóre na účet — api/_lib/log.ts: anonymný / neoverený účet = limit bez prihlásenia.)
-- Spúšťa sa po 0179. Idempotentné.
-- ============================================================
begin;

alter table public.ucet add column if not exists start_kredit timestamptz;

-- overený účet človeka (clovek_overeny — ucet_overeny(uuid, boolean) z 0065 je overenie príjemcu KYC/KYB) = aktivny + telefón alebo e-mail overený (ucet_strazca_identity 0179: overenie píše len server)
drop function if exists public.ucet_overeny(uuid);   -- skorší názov z tejto migrácie (kolízia s ucet_overeny(uuid, boolean) z 0065)
create or replace function public.clovek_overeny(p_ucet uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ucet u where u.id = p_ucet and u.typ = 'aktivny' and (u.telefon_overeny or u.email_overeny))
$$;
revoke all on function public.clovek_overeny(uuid) from public;
grant execute on function public.clovek_overeny(uuid) to anon, authenticated, service_role;

-- ---------- 1 · štartovací kredit len overenému, raz ----------
create or replace function public.ucet_start_kredit() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.start_kredit is null and new.typ = 'aktivny' and (new.telefon_overeny or new.email_overeny)
     and new.stav_registracie is distinct from 'testovaci'
     and (select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna') then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, testovaci)
      values (public.novy_doklad(), 1, 'dobitie', public.ucet_systemu('testovacia_pokladna'), new.id, 1240, 'DEED', 'deed', true);
    update public.ucet set start_kredit = now() where id = new.id;
  end if;
  return null;
end $$;
drop trigger if exists ucet_start_kredit on public.ucet;
create trigger ucet_start_kredit after insert or update of typ, telefon_overeny, email_overeny on public.ucet
  for each row execute function public.ucet_start_kredit();

-- účty, ktoré kredit už dostali (pred 0180), sa označia — nedostanú ho druhý raz
update public.ucet u set start_kredit = p.cas
  from (select ucet_kredit, min(cas) as cas from public.pohyb
         where typ = 'dobitie' and ucet_debet = public.ucet_systemu('testovacia_pokladna') and suma = 1240 group by ucet_kredit) p
 where p.ucet_kredit = u.id and u.start_kredit is null;

-- ---------- 2 · dobitie len overenému ----------
create or replace function public.testovacie_dobitie(p_deed numeric) returns numeric
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.clovek_overeny(v_ja) then raise exception 'Dobiť si môže len overený účet.' using errcode = '42501', detail = 'neovereny'; end if;
  if p_deed is null or p_deed <= 0 or p_deed > 100000 then raise exception 'neplatna_suma' using errcode = '22023'; end if;
  if not (select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna') then
    raise exception 'Dobitie v testovacej verzii je vypnuté.' using errcode = '42501', detail = 'pokladna_vypnuta';
  end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, testovaci)
    values (public.novy_doklad(), 1, 'dobitie', public.ucet_systemu('testovacia_pokladna'), v_ja, round(p_deed, 4), 'DEED', 'deed', true);
  return public.zostatok(v_ja, 'DEED');
end $$;

-- ---------- 3 · sken na akcii len overenému (telo 1 : 1 z 0057 + jedna kontrola) ----------
create or replace function public.scan_validate(p_token text, p_lat double precision default null, p_lng double precision default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  parts text[]; v_event uuid; v_counter bigint; v_sig text; e public.event_secret;
  v_calc text; v_now bigint; v_logid bigint; v_doch public.dochadzka; v_ja uuid := public.ja_prihlaseny();
  v_dev text := 'ucet:' || v_ja::text;            -- zariadenie = účet (nie reťazec od klienta)
  v_gps point := case when p_lat is not null and p_lng is not null then point(p_lng, p_lat) end;
begin
  -- 0180: anonymný / neoverený účet neskenuje (nič sa nezapíše)
  if not public.clovek_overeny(v_ja) then return jsonb_build_object('vysledok', 'neovereny'); end if;
  -- limit pokusov: 20 za minútu na účet (0048)
  if (select count(*) from public.scan_log where user_id = v_ja and cas > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('vysledok', 'limit');
  end if;
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
  -- atomický anti-replay: jeden ok na (akcia, účet, okno) — obidva unikátne indexy (scan_once, scan_once_user)
  begin
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok,gps)
      values (v_event,v_ja,v_dev,v_counter,'ok',v_gps)
      returning id into v_logid;
  exception when unique_violation then
    v_logid := null;
  end;
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

commit;
