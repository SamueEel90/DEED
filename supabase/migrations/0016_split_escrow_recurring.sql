-- ============================================================
-- DEED · Payment Engine — split · escrow · recurring   [Fáza 4]
-- ------------------------------------------------------------
-- Tabuľky platba_split/escrow/opakovana_platba vznikli v 0014; tu pridávame LOGIKU:
--  · split: platba_create dostane p_split[] → platba + N platba_split (Σ podiel = 1.0)
--  · escrow: escrow_create + escrow_uvolni (strop chráni sponzora — nikdy < 0)
--  · recurring (LEN charita): recurring_create + recurring_tick (pg_cron) +
--    trigger na ukončenie zbierky → request-recurring sa OKAMŽITE zastaví + notif
-- Všetky platby idú cez jedinú cestu platba_create (idempotentne).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- prispevok: lifecycle flag (ukončenie zbierky → stop request-recurring)
alter table public.prispevok add column if not exists ukoncene boolean not null default false;

-- ============================================================
-- platba_create + p_split (rozdelenie na N príjemcov). DROP+CREATE (mení signatúru).
-- ============================================================
drop function if exists public.platba_create(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb);

create or replace function public.platba_create(
  p_idem_kluc        text,
  p_suma             numeric,
  p_mena             text,
  p_kanal            text,
  p_case_id          uuid    default null,
  p_odosielatel      uuid    default null,
  p_odosielatel_text text    default null,
  p_prijemca_ucet    uuid    default null,
  p_prijemca_text    text    default null,
  p_obe_registrovane boolean default false,
  p_tip              numeric default 0,
  p_meta             jsonb   default '{}'::jsonb,
  p_split            jsonb   default null         -- [{prijemca_ucet?, prijemca_text?, podiel, fixny?}]
) returns public.platba
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_existuje public.platba; v_marza numeric(14,4) := 0; v_poplatok numeric(14,4) := 0;
  v_cista numeric(14,4); v_mikro boolean := (p_kanal = 'deed' and p_suma <= 1);
  v_stav text := 'pending'; v_vs text := null; v_hash text := null; v_sms text := null;
  v_credited timestamptz := null; v_settled timestamptz := null; v_row public.platba; e jsonb;
begin
  select * into v_existuje from public.platba where idem_kluc = p_idem_kluc;
  if found then return v_existuje; end if;

  if p_kanal = 'deed' then
    if p_suma <= 0.5 and p_obe_registrovane then v_marza := 0;
    else v_marza := round(p_suma * 0.03, 4); end if;
    v_poplatok := v_marza;
  elsif p_kanal = 'sepa' then
    v_marza := 0; v_poplatok := 0;
  elsif p_kanal = 'fiat' then
    v_marza := round(p_suma * 0.015, 4);
    v_poplatok := round(p_suma * 0.014 + 0.15 + v_marza, 4);
  elsif p_kanal = 'sms' then
    v_marza := round(p_suma * 0.05, 4);
    v_poplatok := round(p_suma * 0.10 + v_marza, 4);
  end if;
  v_cista := round(p_suma - v_poplatok, 4);

  if v_mikro then
    v_stav := 'credited'; v_credited := now();
  elsif p_kanal = 'deed' then
    v_stav := 'settled'; v_credited := now(); v_settled := now();
    v_hash := '0x' || encode(gen_random_bytes(8), 'hex');
  elsif p_kanal in ('fiat','sepa') then
    v_stav := 'settled'; v_credited := now(); v_settled := now();
    v_vs := lpad(nextval('public.vs_seq')::text, 10, '0');
  elsif p_kanal = 'sms' then
    v_stav := 'settled'; v_credited := now(); v_settled := now();
    v_sms := upper(encode(gen_random_bytes(3), 'hex'));
  end if;

  insert into public.platba (
    case_id, odosielatel, odosielatel_text, prijemca_ucet, prijemca_text,
    suma, mena, kanal, ext_vs, ext_hash, ext_sms_kod,
    poplatok, marza, cista_suma, tip, stav, idem_kluc, meta, credited_at, settled_at
  ) values (
    p_case_id, p_odosielatel, p_odosielatel_text, p_prijemca_ucet, p_prijemca_text,
    p_suma, p_mena, p_kanal, v_vs, v_hash, v_sms,
    v_poplatok, v_marza, v_cista, coalesce(p_tip,0), v_stav, p_idem_kluc, coalesce(p_meta,'{}'::jsonb),
    v_credited, v_settled
  )
  on conflict (idem_kluc) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.platba where idem_kluc = p_idem_kluc;
    return v_row;
  end if;

  if p_case_id is not null then
    update public.prispevok
      set vyzbierane = coalesce(vyzbierane, 0) + p_suma,
          podpora_count = coalesce(podpora_count, 0) + 1
      where id = p_case_id;
  end if;

  -- SPLIT: rozdeľ na N príjemcov podľa pomeru (Σ podiel = 1.0; UI validuje)
  if p_split is not null and jsonb_typeof(p_split) = 'array' then
    for e in select * from jsonb_array_elements(p_split) loop
      insert into public.platba_split (platba_id, prijemca, prijemca_text, podiel, suma, fixny)
        values (v_row.id,
                nullif(e->>'prijemca_ucet','')::uuid,
                e->>'prijemca_text',
                (e->>'podiel')::numeric,
                round(p_suma * (e->>'podiel')::numeric, 4),
                coalesce((e->>'fixny')::boolean, false));
    end loop;
  end if;

  return v_row;
end;
$fn$;
grant execute on function public.platba_create(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) to anon, authenticated;

-- ============================================================
-- ESCROW — vklad sponzora, uvoľnenie podľa pravidla (strop chráni sponzora)
-- ============================================================
create or replace function public.escrow_create(
  p_case uuid, p_typ text, p_vklad numeric, p_mena text,
  p_sponzor uuid default null, p_pravidlo jsonb default '{}'::jsonb
) returns public.escrow
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_row public.escrow;
begin
  insert into public.escrow (case_id, typ, vklad, zostatok, mena, sponzor, pravidlo, stav)
    values (p_case, p_typ, p_vklad, p_vklad, p_mena, p_sponzor, coalesce(p_pravidlo,'{}'::jsonb), 'aktivny')
    returning * into v_row;
  return v_row;
end;
$fn$;
grant execute on function public.escrow_create(uuid,text,numeric,text,uuid,jsonb) to anon, authenticated;

create or replace function public.escrow_uvolni(
  p_escrow uuid, p_suma numeric,
  p_prijemca_ucet uuid default null, p_prijemca_text text default null
) returns public.escrow
language plpgsql security definer set search_path = public, extensions as $fn$
declare e public.escrow; v_uvolnit numeric(14,4);
begin
  select * into e from public.escrow where id = p_escrow for update;   -- zámok proti súbehu
  if not found or e.stav not in ('aktivny','uvolneny') then return e; end if;
  v_uvolnit := least(p_suma, e.zostatok);                              -- STROP: nikdy viac než zostatok
  if v_uvolnit <= 0 then return e; end if;

  perform public.platba_create(
    'escrow:' || p_escrow::text || ':' || gen_random_uuid()::text,
    v_uvolnit, e.mena, case when e.mena = 'DEED' then 'deed' else 'sepa' end,
    e.case_id, e.sponzor, null, p_prijemca_ucet, p_prijemca_text,
    false, 0, jsonb_build_object('escrow', p_escrow)
  );

  update public.escrow
    set zostatok = zostatok - v_uvolnit,
        stav = case when zostatok - v_uvolnit <= 0 then 'vycerpany' else 'uvolneny' end
    where id = p_escrow
    returning * into e;
  return e;
end;
$fn$;
grant execute on function public.escrow_uvolni(uuid,numeric,uuid,text) to anon, authenticated;

-- ============================================================
-- RECURRING (LEN charita) — create + tick (scheduler) + stop-on-end trigger
-- ============================================================
create or replace function public.recurring_create(
  p_rozsah text, p_darca uuid, p_suma numeric, p_mena text, p_perioda text,
  p_case uuid default null, p_charita uuid default null, p_segment bigint default null,
  p_viazane boolean default true
) returns public.opakovana_platba
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_row public.opakovana_platba; v_int interval;
begin
  v_int := case p_perioda when 'tyzdenne' then interval '7 days'
                          when 'rocne'    then interval '1 year'
                          else interval '1 month' end;
  insert into public.opakovana_platba
    (rozsah, case_id, segment_id, charita_ucet, darca, suma, mena, perioda, viazane_na_zbierku, stav, dalsia_platba)
    values (p_rozsah, p_case, p_segment, p_charita, p_darca, p_suma, p_mena, p_perioda,
            coalesce(p_viazane, true), 'aktivny', now() + v_int)
    returning * into v_row;
  return v_row;
end;
$fn$;
grant execute on function public.recurring_create(text,uuid,numeric,text,text,uuid,uuid,bigint,boolean) to anon, authenticated;

-- spracuj splatné pravidelné platby (pg_cron denne). Idempotentné na due-date.
create or replace function public.recurring_tick() returns int
language plpgsql security definer set search_path = public, extensions as $fn$
declare r public.opakovana_platba; n int := 0; v_kanal text; v_int interval;
begin
  for r in select * from public.opakovana_platba
            where stav = 'aktivny' and dalsia_platba is not null and dalsia_platba <= now() loop
    v_kanal := case when r.mena = 'DEED' then 'deed' else 'sepa' end;
    perform public.platba_create(
      'rec:' || r.id::text || ':' || extract(epoch from r.dalsia_platba)::bigint::text,  -- idem na due-date
      r.suma, r.mena, v_kanal,
      r.case_id, r.darca, null,
      case when r.rozsah <> 'request' then r.charita_ucet else null end,
      null, false, 0,
      jsonb_build_object('recurring', r.id, 'rozsah', r.rozsah)
    );
    v_int := case r.perioda when 'tyzdenne' then interval '7 days'
                            when 'rocne'    then interval '1 year'
                            else interval '1 month' end;
    update public.opakovana_platba set dalsia_platba = dalsia_platba + v_int where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$fn$;
grant execute on function public.recurring_tick() to anon, authenticated;

-- ukončenie zbierky → request-recurring viazané naň sa OKAMŽITE zastaví + notif darcovi
create or replace function public.recurring_stop_on_end() returns trigger
language plpgsql set search_path = public as $fn$
begin
  if NEW.ukoncene = true and (OLD.ukoncene is distinct from true) then
    insert into public.notifikacia (ucet_id, kat, titul, text)
      select op.darca, 'penazenka', 'Zbierka skončila',
             'Tvoja pravidelná podpora sa zastavila — vyber si inú zbierku.'
        from public.opakovana_platba op
       where op.rozsah = 'request' and op.case_id = NEW.id
         and op.stav = 'aktivny' and op.viazane_na_zbierku and op.darca is not null;
    update public.opakovana_platba
       set stav = 'ukonceny'
     where rozsah = 'request' and case_id = NEW.id and stav = 'aktivny' and viazane_na_zbierku;
  end if;
  return NEW;
end;
$fn$;
drop trigger if exists trg_recurring_stop_on_end on public.prispevok;
create trigger trg_recurring_stop_on_end
  after update of ukoncene on public.prispevok
  for each row execute function public.recurring_stop_on_end();

-- pg_cron: pravidelné platby denne o 03:00 (idempotentné)
select cron.schedule('deed-recurring', '0 3 * * *', $$select public.recurring_tick();$$);
