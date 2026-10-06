-- ============================================================
-- 0047 · Zadanie 4 · 4.1 — identita volajúceho LEN zo session (auth.uid() → moj_ucet())
-- ------------------------------------------------------------
-- Vzor: iskra_zverejni (0034). Žiadna RPC pre appku neberie identitu z parametra:
--   platba_create, qr_split_pay, qr_split_create, qr_split_list, recurring_create, chain_create,
--   escrow_create / _uvolni / _vrat, badge_bind, badge_scan, scan_validate, event_token, event_secret_create.
-- Parametre p_odosielatel / p_user / p_employee / p_sponzor / p_darca / p_owner / p_zakaznik / p_organizator
-- sú z podpisov preč. Neprihlásený (moj_ucet() je NULL) = chyba 28000 'neprihlaseny'.
-- Vnútorný zápis platby (darca zadaný serverom — pravidelné platby, odznak, QR split) je
-- public.platba_zapis: appka ho zavolať nemôže (execute len pre service_role a vnútorné funkcie).
-- Čítanie verejného obsahu (qr_split_get) ostáva bez prihlásenia.
-- ============================================================
begin;

create or replace function public.ja_prihlaseny() returns uuid
  language plpgsql stable security definer set search_path = public as $$
declare v uuid := public.moj_ucet();
begin
  if v is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  return v;
end $$;
revoke all on function public.ja_prihlaseny() from public, anon, authenticated;

-- ---------- platba: vnútorný zápis (darcu určuje server) ----------
CREATE OR REPLACE FUNCTION public.platba_zapis(p_idem_kluc text, p_suma numeric, p_mena text, p_kanal text, p_case_id uuid DEFAULT NULL::uuid, p_ucet_darcu uuid DEFAULT NULL::uuid, p_meno_darcu text DEFAULT NULL::text, p_prijemca_ucet uuid DEFAULT NULL::uuid, p_prijemca_text text DEFAULT NULL::text, p_obe_registrovane boolean DEFAULT false, p_tip numeric DEFAULT 0, p_meta jsonb DEFAULT '{}'::jsonb, p_split jsonb DEFAULT NULL::jsonb)
 RETURNS platba
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_scope uuid := coalesce(p_ucet_darcu, '00000000-0000-0000-0000-000000000000');
  v_ex public.platba; v_row public.platba;
  v_presnost int := case when p_mena = 'EUR' then 2 else 4 end;
  v_suma numeric(14,4); v_tip numeric(14,4) := round(greatest(coalesce(p_tip, 0), 0), case when p_mena = 'EUR' then 2 else 4 end);
  v_marza numeric(14,4) := 0; v_poplatok numeric(14,4) := 0; v_cista numeric(14,4);
  v_mikro boolean; v_stav text := 'pending'; v_vs text; v_hash text; v_sms text;
  v_credited timestamptz; v_settled timestamptz;
  v_zdroj uuid; v_doklad text; v_prijemca uuid; v_sum_podiel numeric := 0; v_sum_suma numeric := 0;
  v_podiely jsonb := '[]'::jsonb; e jsonb; i int := 0; v_n int; v_suma_podielu numeric; v_ucet uuid; v_case uuid;
  v_prijem numeric(14,4) := 0; v_f record; v_je_split boolean;
begin
  if p_suma is null or p_suma <= 0 then raise exception 'Suma musí byť kladná.' using errcode = '22023', detail = 'suma_neplatna'; end if;
  if not exists (select 1 from public.kanal_mena where kanal = p_kanal and mena = p_mena) then
    raise exception 'Mena % sa nedá poslať kanálom %.', p_mena, p_kanal using errcode = '22023', detail = 'kanal_mena';
  end if;
  v_suma := round(p_suma, v_presnost);

  -- 2.5 idempotencia per odosielateľ: rovnaký kľúč = tá istá platba; iná suma = chyba
  select * into v_ex from public.platba where idem_scope = v_scope and idem_kluc = p_idem_kluc;
  if found then
    if v_ex.suma <> v_suma or v_ex.mena <> p_mena or v_ex.kanal <> p_kanal or v_ex.case_id is distinct from p_case_id then
      raise exception 'Platba s týmto kľúčom už existuje s inými údajmi.' using errcode = '23505', detail = 'idem_konflikt';
    end if;
    return v_ex;
  end if;

  -- Zadanie 3 · 3.4: poplatok z JEDNÉHO miesta (public.poplatok nad configom poplatok_sadzba).
  -- Darca platí poplatok NAVRCH — príjemca dostane celú sumu daru (čistá = suma).
  v_je_split := p_split is not null and jsonb_typeof(p_split) = 'array' and jsonb_array_length(p_split) > 1;
  select * into v_f from public.poplatok(p_kanal, v_suma, v_je_split);   -- pod minimom kanála vyhodí chybu
  v_poplatok := v_f.poplatok; v_marza := v_f.marza;
  v_cista := v_suma;

  -- zdroj peňazí: DEED z účtu darcu, EUR prichádzajú cez procesor
  if p_kanal = 'deed' then
    if p_ucet_darcu is null then
      raise exception 'Platba v DeeD potrebuje účet darcu.' using errcode = '22023', detail = 'deed_bez_uctu';
    end if;
    v_zdroj := p_ucet_darcu;
    perform 1 from public.ucet where id = v_zdroj for update;
    if public.zostatok(v_zdroj, 'DEED') < v_suma + v_poplatok + v_tip then
      raise exception 'Na účte nie je dosť DeeD.' using errcode = '23514', detail = 'nedostatok_deed';
    end if;
  elsif p_ucet_darcu is not null then
    -- EUR od darcu s účtom: prídu cez procesor na jeho účet a od neho idú ďalej (rebríček a výpis čítajú ledger)
    v_zdroj := p_ucet_darcu;
    v_prijem := v_suma + v_marza + v_tip;    -- poplatok procesora si procesor ponechá vonku
  else
    v_zdroj := public.ucet_systemu('procesor');      -- anonymný EUR dar: bez darcu
  end if;

  -- 2.3 podiely: povinný príjemca, z čistej sumy, na cent, zvyšok prvému
  if p_split is not null and jsonb_typeof(p_split) = 'array' and jsonb_array_length(p_split) > 0 then
    v_n := jsonb_array_length(p_split);
    for e in select * from jsonb_array_elements(p_split) loop
      v_case := nullif(e->>'case_id', '')::uuid;
      v_ucet := coalesce(nullif(e->>'prijemca_ucet', '')::uuid, (select autor_ucet_id from public.prispevok where id = v_case));
      if v_ucet is null then
        raise exception 'Podiel % nemá príjemcu s účtom.', coalesce(e->>'prijemca_text', '?') using errcode = '23502', detail = 'split_bez_prijemcu';
      end if;
      if coalesce((e->>'podiel')::numeric, 0) <= 0 then
        raise exception 'Podiel musí byť kladný.' using errcode = '22023', detail = 'split_podiel';
      end if;
      v_sum_podiel := v_sum_podiel + (e->>'podiel')::numeric;
      v_suma_podielu := trunc(v_cista * (e->>'podiel')::numeric, v_presnost);
      v_sum_suma := v_sum_suma + v_suma_podielu;
      v_podiely := v_podiely || jsonb_build_array(jsonb_build_object(
        'ucet', v_ucet, 'case', v_case, 'text', e->>'prijemca_text', 'podiel', (e->>'podiel')::numeric,
        'suma', v_suma_podielu, 'fixny', coalesce((e->>'fixny')::boolean, false)));
    end loop;
    if abs(v_sum_podiel - 1.0) > 0.0005 then
      raise exception 'Súčet podielov musí byť 100 %%.' using errcode = '22023', detail = 'split_sucet';
    end if;
    -- zvyšok (centy z orezania) prvému podielu
    v_podiely := jsonb_set(v_podiely, '{0,suma}', to_jsonb(((v_podiely->0->>'suma')::numeric + (v_cista - v_sum_suma))));
  else
    v_prijemca := coalesce(p_prijemca_ucet, (select autor_ucet_id from public.prispevok where id = p_case_id));
    if v_prijemca is null then
      raise exception 'Platba nemá príjemcu s účtom.' using errcode = '23502', detail = 'bez_prijemcu';
    end if;
    v_podiely := jsonb_build_array(jsonb_build_object('ucet', v_prijemca, 'case', p_case_id, 'text', p_prijemca_text,
      'podiel', 1, 'suma', v_cista, 'fixny', true));
  end if;

  -- dar sám sebe z vlastného účtu nič nepresunie (len by zaplatil poplatok) → odmietnuť
  if exists (select 1 from jsonb_array_elements(v_podiely) x where (x->>'ucet')::uuid = v_zdroj) then
    raise exception 'Z vlastného účtu sa na vlastný účet darovať nedá.' using errcode = '22023', detail = 'vlastny_ucet';
  end if;

  -- stav + externý identifikátor (simulované rúry)
  v_mikro := (p_kanal = 'deed' and v_suma <= 1);
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
  v_doklad := public.novy_doklad();

  insert into public.platba (
    case_id, odosielatel, odosielatel_text, prijemca_ucet, prijemca_text,
    suma, mena, kanal, ext_vs, ext_hash, ext_sms_kod,
    poplatok, marza, cista_suma, tip, stav, idem_kluc, idem_scope, meta, credited_at, settled_at, doklad
  ) values (
    p_case_id, p_ucet_darcu, p_meno_darcu, v_prijemca, p_prijemca_text,
    v_suma, p_mena, p_kanal, v_vs, v_hash, v_sms,
    v_poplatok, v_marza, v_cista, v_tip, v_stav, p_idem_kluc, v_scope, coalesce(p_meta,'{}'::jsonb), v_credited, v_settled, v_doklad
  )
  on conflict (idem_scope, idem_kluc) do nothing
  returning * into v_row;
  if v_row.id is null then   -- súbeh: iný request medzitým vložil
    select * into v_row from public.platba where idem_scope = v_scope and idem_kluc = p_idem_kluc;
    if v_row.suma <> v_suma then
      raise exception 'Platba s týmto kľúčom už existuje s inými údajmi.' using errcode = '23505', detail = 'idem_konflikt';
    end if;
    return v_row;
  end if;

  -- pohyby: príchod EUR na účet darcu, podiely, marža, tip
  if v_prijem > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (v_doklad, 0, 'dobitie', public.ucet_systemu('procesor'), v_zdroj, v_prijem, p_mena, p_kanal, v_row.id, p_case_id);
  end if;
  for e in select * from jsonb_array_elements(v_podiely) loop
    i := i + 1;
    if (e->>'suma')::numeric > 0 then
      if p_split is not null and jsonb_typeof(p_split) = 'array' and jsonb_array_length(p_split) > 0 then
        insert into public.platba_split (platba_id, prijemca, prijemca_text, podiel, suma, fixny, case_id)
          values (v_row.id, (e->>'ucet')::uuid, e->>'text', (e->>'podiel')::numeric, (e->>'suma')::numeric,
                  (e->>'fixny')::boolean, nullif(e->>'case','')::uuid);
      end if;
      insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, pre_zbierku)
        values (v_doklad, i, 'dar', v_zdroj, (e->>'ucet')::uuid, (e->>'suma')::numeric, p_mena, p_kanal, v_row.id,
                coalesce(nullif(e->>'case','')::uuid, p_case_id),
                (e->>'fixny')::boolean and coalesce(nullif(e->>'case','')::uuid, p_case_id) is not null);
    end if;
  end loop;
  if v_marza > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (v_doklad, 0, 'poplatok', v_zdroj, public.ucet_systemu('platforma'), v_marza, p_mena, p_kanal, v_row.id, p_case_id);
  end if;
  if v_tip > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (v_doklad, i + 1, 'dar', v_zdroj, public.ucet_systemu('platforma'), v_tip, p_mena, p_kanal, v_row.id, p_case_id);
  end if;

  return v_row;
end;
$function$;
revoke all on function public.platba_zapis(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.platba_zapis(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) to service_role;

-- ---------- platba_create: darca = prihlásený účet ----------
drop function if exists public.platba_create(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb);
create function public.platba_create(
  p_idem_kluc text, p_suma numeric, p_mena text, p_kanal text, p_case_id uuid default null,
  p_meno_darcu text default null, p_prijemca_ucet uuid default null, p_prijemca_text text default null,
  p_obe_registrovane boolean default false, p_tip numeric default 0, p_meta jsonb default '{}'::jsonb, p_split jsonb default null)
  returns public.platba
  language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  return public.platba_zapis(p_idem_kluc, p_suma, p_mena, p_kanal, p_case_id, public.ja_prihlaseny(), p_meno_darcu,
    p_prijemca_ucet, p_prijemca_text, p_obe_registrovane, p_tip, p_meta, p_split);
end $$;
revoke all on function public.platba_create(text,numeric,text,text,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) from public, anon;
grant execute on function public.platba_create(text,numeric,text,text,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) to authenticated, service_role;

-- ---------- pravidelné platby: darca z riadku (server) ----------
create or replace function public.recurring_tick() returns int
language plpgsql security definer set search_path = public, extensions as $fn$
declare r public.opakovana_platba; n int := 0; v_kanal text; v_int interval;
begin
  for r in select * from public.opakovana_platba
            where stav = 'aktivny' and dalsia_platba is not null and dalsia_platba <= now() loop
    v_kanal := case when r.mena = 'DEED' then 'deed' else 'sepa' end;
    begin
      perform public.platba_zapis(
        'rec:' || r.id::text || ':' || extract(epoch from r.dalsia_platba)::bigint::text,
        r.suma, r.mena, v_kanal, r.case_id, r.darca, null,
        case when r.rozsah <> 'request' then r.charita_ucet else null end,
        null, false, 0, jsonb_build_object('recurring', r.id, 'rozsah', r.rozsah));
      n := n + 1;
    exception when others then
      insert into public.notifikacia (ucet_id, kat, titul, text)
        values (r.darca, 'penazenka', 'Pravidelná podpora neprešla', 'Tento raz sa platba nezapísala: ' || sqlerrm);
    end;
    v_int := case r.perioda when 'tyzdenne' then interval '7 days' when 'rocne' then interval '1 year' else interval '1 month' end;
    update public.opakovana_platba set dalsia_platba = dalsia_platba + v_int where id = r.id;
  end loop;
  return n;
end $fn$;

drop function if exists public.recurring_create(text,uuid,numeric,text,text,uuid,uuid,bigint,boolean);
create function public.recurring_create(p_rozsah text, p_suma numeric, p_mena text, p_perioda text,
  p_case uuid default null, p_charita uuid default null, p_segment bigint default null, p_viazane boolean default true)
  returns public.opakovana_platba
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_row public.opakovana_platba; v_int interval; v_ja uuid := public.ja_prihlaseny();
begin
  v_int := case p_perioda when 'tyzdenne' then interval '7 days' when 'rocne' then interval '1 year' else interval '1 month' end;
  insert into public.opakovana_platba
    (rozsah, case_id, segment_id, charita_ucet, darca, suma, mena, perioda, viazane_na_zbierku, stav, dalsia_platba)
    values (p_rozsah, p_case, p_segment, p_charita, v_ja, p_suma, p_mena, p_perioda, coalesce(p_viazane, true), 'aktivny', now() + v_int)
    returning * into v_row;
  return v_row;
end $$;

-- ---------- QR split ----------
drop function if exists public.qr_split_pay(text,text,numeric,text,text,uuid,text);
create function public.qr_split_pay(p_slug text, p_idem text, p_suma numeric, p_mena text, p_kanal text, p_meno_darcu text default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_qr public.qr_split; v_split jsonb; v_pl public.platba; v_ja uuid := public.ja_prihlaseny();
begin
  select * into v_qr from public.qr_split where slug = p_slug and aktivny;
  if not found then raise exception 'QR split % neexistuje', p_slug; end if;
  if v_qr.owner_ucet_id is null then
    raise exception 'Vlastník QR nemá účet v DEED.' using errcode = '23502', detail = 'split_bez_prijemcu';
  end if;
  v_split := jsonb_build_array(jsonb_build_object(
    'prijemca_ucet', v_qr.owner_ucet_id, 'prijemca_text', v_qr.owner_text, 'podiel', v_qr.owner_podiel, 'fixny', false));
  select v_split || coalesce(jsonb_agg(jsonb_build_object(
           'prijemca_ucet', c.prijemca_ucet, 'case_id', coalesce(c.case_id, v_qr.case_id), 'prijemca_text', c.prijemca_text,
           'podiel', c.podiel, 'fixny', true) order by c.id), '[]'::jsonb)
    into v_split from public.qr_split_ciel c where c.qr_split_id = v_qr.id;
  v_pl := public.platba_zapis(p_idem, p_suma, coalesce(p_mena, v_qr.mena), p_kanal, v_qr.case_id, v_ja, p_meno_darcu,
    null, v_qr.owner_text, false, 0, jsonb_build_object('qr_split_id', v_qr.id, 'slug', p_slug), v_split);
  update public.platba set qr_split_id = v_qr.id where id = v_pl.id and qr_split_id is null;
  return jsonb_build_object('platba_id', v_pl.id, 'qr_split_id', v_qr.id, 'stav', v_pl.stav, 'suma', v_pl.suma);
end $$;

drop function if exists public.qr_split_create(uuid,uuid,text,numeric,jsonb,text,text);
create function public.qr_split_create(p_case uuid, p_owner_text text, p_owner_podiel numeric, p_ciele jsonb,
  p_zdroj text default 'osobny', p_mena text default 'DEED')
  returns public.qr_split
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_slug text; v_row public.qr_split; v_sum numeric := 0; e jsonb; v_owner uuid := public.ja_prihlaseny(); v_ucet uuid; v_case uuid;
begin
  if coalesce(p_owner_podiel,0) < 0.03 then
    raise exception 'owner_podiel musí byť ≥ 0.03 (dostal %)', p_owner_podiel;
  end if;
  select coalesce(sum((x->>'podiel')::numeric), 0) into v_sum from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) x;
  if exists (select 1 from jsonb_array_elements(coalesce(p_ciele,'[]'::jsonb)) x where (x->>'podiel')::numeric < 0.03) then
    raise exception 'každý podiel organizácie musí byť ≥ 0.03';
  end if;
  if abs((coalesce(p_owner_podiel,0) + v_sum) - 1.0) > 0.0005 then
    raise exception 'Σ podielov musí byť 1.0 (owner % + ciele % = %)', p_owner_podiel, v_sum, p_owner_podiel + v_sum;
  end if;
  for e in select * from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) loop
    v_case := nullif(e->>'case_id','')::uuid;
    v_ucet := coalesce(nullif(e->>'prijemca_ucet','')::uuid, (select autor_ucet_id from public.prispevok where id = v_case));
    if v_ucet is null then
      raise exception 'Príjemca % nemá účet v DEED.', coalesce(e->>'prijemca_text', '?') using errcode = '23502', detail = 'ciel_bez_uctu';
    end if;
  end loop;
  v_slug := public.gen_slug();
  insert into public.qr_split (case_id, owner_ucet_id, owner_text, owner_podiel, zdroj, mena, slug)
    values (p_case, v_owner, p_owner_text, p_owner_podiel, coalesce(p_zdroj,'osobny'), coalesce(p_mena,'DEED'), v_slug)
    returning * into v_row;
  for e in select * from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) loop
    v_case := nullif(e->>'case_id','')::uuid;
    insert into public.qr_split_ciel (qr_split_id, prijemca_ucet, prijemca_text, podiel, fixny, case_id)
      values (v_row.id, coalesce(nullif(e->>'prijemca_ucet','')::uuid, (select autor_ucet_id from public.prispevok where id = v_case)),
              e->>'prijemca_text', (e->>'podiel')::numeric, coalesce((e->>'fixny')::boolean, true), v_case);
  end loop;
  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','split', v_row.id::text, v_slug, 'https://deed.good/split/'||v_slug, 'qr')
    on conflict (objekt_druh, objekt_ref) do nothing;
  return v_row;
end $$;

drop function if exists public.qr_split_list(uuid);
create function public.qr_split_list() returns jsonb
  language sql stable security definer set search_path = public, extensions as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'slug', q.slug, 'zdroj', q.zdroj, 'mena', q.mena,
      'owner_podiel', q.owner_podiel, 'case_id', q.case_id, 'vytvorene', q.vytvorene,
      'titul', (select coalesce(p.titul, p.autor_nazov, 'Prispevok') from public.prispevok p where p.id = q.case_id),
      'emoji', (select p.emoji from public.prispevok p where p.id = q.case_id),
      'org_odoslane', (select coalesce(t.org_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'owner_odoslane', (select coalesce(t.owner_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'pocet', (select coalesce(t.pocet,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'ciele', (select coalesce(jsonb_agg(jsonb_build_object('prijemca_text', c.prijemca_text, 'podiel', c.podiel) order by c.id), '[]'::jsonb)
                from public.qr_split_ciel c where c.qr_split_id = q.id)
    ) order by q.vytvorene desc), '[]'::jsonb)
  from public.qr_split q
  where q.owner_ucet_id = public.ja_prihlaseny();
$$;

-- ---------- reťaz ----------
drop function if exists public.chain_create(uuid,uuid,numeric,text,numeric,text);
create function public.chain_create(p_case uuid, p_pct numeric, p_ciel text, p_suma_zaklad numeric default null, p_mena text default 'DEED')
  returns public.retazec_qr
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_slug text; v_row public.retazec_qr; v_ja uuid := public.ja_prihlaseny();
begin
  v_slug := public.gen_slug();
  insert into public.retazec_qr (case_id, darca, postup_pct, ciel_text, suma_zaklad, mena, slug)
    values (p_case, v_ja, p_pct, p_ciel, p_suma_zaklad, coalesce(p_mena,'DEED'), v_slug)
    returning * into v_row;
  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','chain', v_row.chain_id::text, v_slug, 'https://deed.good/chain/'||v_slug, 'retaz')
    on conflict (objekt_druh, objekt_ref) do nothing;
  return v_row;
end $$;

-- ---------- escrow: sponzor = prihlásený účet ----------
drop function if exists public.escrow_create(uuid,text,numeric,text,uuid,jsonb);
create function public.escrow_create(p_case uuid, p_typ text, p_vklad numeric, p_mena text, p_pravidlo jsonb default '{}'::jsonb)
  returns public.v_escrow
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_row public.escrow; v_doklad text := public.novy_doklad(); v_kanal text; v_out public.v_escrow; v_ja uuid := public.ja_prihlaseny();
begin
  if p_vklad is null or p_vklad <= 0 then raise exception 'neplatna_suma' using errcode = '22023'; end if;
  v_kanal := case when p_mena = 'DEED' then 'deed' else 'sepa' end;
  insert into public.escrow (case_id, typ, vklad, mena, sponzor, pravidlo, stav)
    values (p_case, p_typ, round(p_vklad, 2), p_mena, v_ja, coalesce(p_pravidlo,'{}'::jsonb), 'aktivny')
    returning * into v_row;
  if p_mena = 'EUR' then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id)
      values (v_doklad, 1, 'dobitie', public.ucet_systemu('procesor'), v_ja, v_row.vklad, p_mena, v_kanal, v_row.id, p_case);
  end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id)
    values (v_doklad, 2, 'dorovnanie', v_ja, public.ucet_systemu('viazane'), v_row.vklad, p_mena, v_kanal, v_row.id, p_case);
  select * into v_out from public.v_escrow where id = v_row.id;
  return v_out;
end $$;

-- uvoľniť / vrátiť smie len sponzor (prihlásený); server (service_role, cron) bez obmedzenia
create or replace function public.escrow_sponzor_som(p_vlastnik uuid) returns void
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.zapis_klienta() then return; end if;
  if public.ja_prihlaseny() is distinct from p_vlastnik then raise exception 'cudzi_ucet' using errcode = '42501'; end if;
end $$;
revoke all on function public.escrow_sponzor_som(uuid) from public, anon, authenticated;

create or replace function public.escrow_uvolni(p_escrow uuid, p_suma numeric, p_prijemca_ucet uuid default null, p_prijemca_text text default null)
  returns public.v_escrow
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare e public.escrow; v numeric(14,4); v_prijemca uuid; v_out public.v_escrow;
begin
  select * into e from public.escrow where id = p_escrow for update;
  if not found then raise exception 'escrow_neexistuje' using errcode = 'P0002'; end if;
  perform public.escrow_sponzor_som(e.sponzor);
  if e.stav not in ('aktivny','uvolneny') then raise exception 'Escrow je uzavretý.' using errcode = '22023', detail = 'escrow_uzavrety'; end if;
  v := least(round(coalesce(p_suma, 0), 2), public.escrow_zostatok(p_escrow));
  if v <= 0 then raise exception 'Escrow je vyčerpaný.' using errcode = '22023', detail = 'escrow_prazdny'; end if;
  v_prijemca := coalesce(p_prijemca_ucet, (select autor_ucet_id from public.prispevok where id = e.case_id));
  if v_prijemca is null then raise exception 'Uvoľnenie nemá príjemcu s účtom.' using errcode = '23502', detail = 'bez_prijemcu'; end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id, pre_zbierku)
    values (public.novy_doklad(), 1, 'dorovnanie', public.ucet_systemu('viazane'), v_prijemca, v, e.mena,
            case when e.mena = 'DEED' then 'deed' else 'sepa' end, e.id, e.case_id, e.case_id is not null);
  update public.escrow set stav = case when public.escrow_zostatok(p_escrow) <= 0 then 'vycerpany' else 'uvolneny' end where id = p_escrow;
  select * into v_out from public.v_escrow where id = p_escrow;
  return v_out;
end $$;

create or replace function public.escrow_vrat(p_escrow uuid) returns public.v_escrow
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare e public.escrow; v numeric(14,4); v_doklad text; v_out public.v_escrow;
begin
  select * into e from public.escrow where id = p_escrow for update;
  if not found then raise exception 'escrow_neexistuje' using errcode = 'P0002'; end if;
  perform public.escrow_sponzor_som(e.sponzor);
  v := public.escrow_zostatok(p_escrow);
  if v > 0 then
    v_doklad := public.novy_doklad();
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id, vs)
      values (v_doklad, 1, 'vratenie', public.ucet_systemu('viazane'), e.sponzor, v, e.mena,
              case when e.mena = 'DEED' then 'deed' else 'sepa' end, e.id, e.case_id, v_doklad);
  end if;
  update public.escrow set stav = 'vrateny' where id = p_escrow;
  select * into v_out from public.v_escrow where id = p_escrow;
  return v_out;
end $$;

-- ---------- odznak: zamestnanec / zákazník = prihlásený ----------
drop function if exists public.badge_bind(uuid,uuid,integer);
create function public.badge_bind(p_badge uuid, p_hodiny integer default 12) returns public.badge_bind
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_row public.badge_bind; v_ja uuid := public.ja_prihlaseny();
begin
  insert into public.badge_bind (badge_id, employee_id, shift_start, shift_end, auto_unbind)
    values (p_badge, v_ja, now(), null, now() + make_interval(hours => greatest(coalesce(p_hodiny,12),1)))
    on conflict (badge_id) do update
      set employee_id = excluded.employee_id, shift_start = excluded.shift_start, shift_end = null, auto_unbind = excluded.auto_unbind
    returning * into v_row;
  return v_row;
end $$;

-- odhlásiť zo zmeny sa smie len ten, kto je na nej prihlásený
create or replace function public.badge_unbind(p_badge uuid) returns void
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.ja_prihlaseny();
begin
  update public.badge_bind set employee_id = null, shift_end = now() where badge_id = p_badge and employee_id = v_ja;
end $$;

drop function if exists public.badge_scan(uuid,uuid,numeric);
create function public.badge_scan(p_badge uuid, p_suma numeric default 0) returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_emp uuid; v_org uuid; v_pob bigint; v_prijemca text; v_ja uuid := public.ja_prihlaseny();
begin
  select employee_id into v_emp from public.badge_bind
    where badge_id = p_badge and employee_id is not null and (auto_unbind is null or auto_unbind > now());
  select org_ucet_id, pobocka_id into v_org, v_pob from public.odznak where id = p_badge;
  if v_emp is not null then
    v_prijemca := 'employee';
    insert into public.pochvala (badge_id, employee_id, zakaznik_ucet, suma) values (p_badge, v_emp, v_ja, nullif(p_suma,0));
    if coalesce(p_suma,0) > 0 then
      perform public.platba_zapis('badge:'||p_badge::text||':'||gen_random_uuid()::text,
        p_suma, 'DEED','deed', null, v_ja, null, v_emp, null, false, 0, jsonb_build_object('badge', p_badge));
    end if;
  else
    v_prijemca := 'pobocka';
    insert into public.pochvala (badge_id, employee_id, zakaznik_ucet, suma) values (p_badge, null, v_ja, nullif(p_suma,0));
    if coalesce(p_suma,0) > 0 and v_org is not null then
      perform public.platba_zapis('badge:'||p_badge::text||':'||gen_random_uuid()::text,
        p_suma, 'DEED','deed', null, v_ja, null, v_org, 'Pobočka', false, 0, jsonb_build_object('badge', p_badge, 'pobocka', v_pob));
    end if;
  end if;
  return jsonb_build_object('prijemca', v_prijemca, 'employee', v_emp);
end $$;

-- ---------- TOTP: organizátor / skenujúci = prihlásený ----------
drop function if exists public.event_secret_create(uuid,integer,text,text,uuid);
create function public.event_secret_create(p_event uuid, p_step integer default 15, p_mod text default 'threshold', p_nazov text default null)
  returns uuid
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.ja_prihlaseny();
begin
  insert into public.event_secret (event_id, secret, step, mod, nazov, organizator)
    values (p_event, gen_random_bytes(32), greatest(coalesce(p_step,15), 5), coalesce(p_mod,'threshold'), p_nazov, v_ja)
    on conflict (event_id) do update
      set step = excluded.step, mod = excluded.mod, nazov = coalesce(excluded.nazov, public.event_secret.nazov)
      where public.event_secret.organizator is null or public.event_secret.organizator = v_ja;   -- cudziu akciu neprepíše
  return p_event;
end $$;

create or replace function public.event_token(p_event uuid) returns text
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_secret bytea; v_step int; v_counter bigint; v_data text; v_sig text;
begin
  perform public.ja_prihlaseny();
  select secret, step into v_secret, v_step from public.event_secret where event_id = p_event;
  if v_secret is null then return null; end if;
  v_counter := floor(extract(epoch from now()) / v_step)::bigint;
  v_data := p_event::text || '.' || v_counter::text;
  v_sig := encode(extensions.hmac(convert_to(v_data,'UTF8'), v_secret, 'sha256'), 'hex');
  return 'DEED1.' || p_event::text || '.' || v_counter::text || '.' || left(v_sig, 16);
end $$;

drop function if exists public.scan_validate(text,text,uuid,double precision,double precision);
create function public.scan_validate(p_token text, p_device text, p_lat double precision default null, p_lng double precision default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  parts text[]; v_event uuid; v_counter bigint; v_sig text;
  v_secret bytea; v_step int; v_mod text;
  v_data text; v_calc text; v_now bigint; v_logid bigint; v_doch public.dochadzka; v_ja uuid := public.ja_prihlaseny();
begin
  parts := string_to_array(coalesce(p_token,''), '.');
  if array_length(parts,1) <> 4 or parts[1] <> 'DEED1' then return jsonb_build_object('vysledok','fake'); end if;
  begin
    v_event := parts[2]::uuid; v_counter := parts[3]::bigint;
  exception when others then return jsonb_build_object('vysledok','fake');
  end;
  v_sig := parts[4];
  select secret, step, mod into v_secret, v_step, v_mod from public.event_secret where event_id = v_event;
  if v_secret is null then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,p_device,v_counter,'fake');
    return jsonb_build_object('vysledok','fake');
  end if;
  v_data := v_event::text || '.' || v_counter::text;
  v_calc := left(encode(extensions.hmac(convert_to(v_data,'UTF8'), v_secret, 'sha256'), 'hex'), 16);
  if v_calc <> v_sig then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,p_device,v_counter,'fake');
    return jsonb_build_object('vysledok','fake');
  end if;
  v_now := floor(extract(epoch from now()) / v_step)::bigint;
  if abs(v_now - v_counter) > 1 then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,p_device,v_counter,'expired');
    return jsonb_build_object('vysledok','expired');
  end if;
  insert into public.scan_log (event_id,user_id,device_id,counter,vysledok,gps)
    values (v_event,v_ja,p_device,v_counter,'ok', case when p_lat is not null and p_lng is not null then point(p_lng,p_lat) else null end)
    on conflict (event_id, device_id, counter) where vysledok = 'ok' do nothing
    returning id into v_logid;
  if v_logid is null then
    insert into public.scan_log (event_id,user_id,device_id,counter,vysledok) values (v_event,v_ja,p_device,v_counter,'replay');
    return jsonb_build_object('vysledok','replay');
  end if;
  select * into v_doch from public.dochadzka where event_id = v_event and user_id = v_ja;
  if not found then
    insert into public.dochadzka (event_id,user_id,prichod,mod,splneny) values (v_event,v_ja,now(),v_mod,false);
  elsif v_doch.prichod is not null and v_doch.odchod is null then
    update public.dochadzka set odchod = now(), hodiny = round(extract(epoch from (now() - v_doch.prichod)) / 3600.0, 2), splneny = true
      where id = v_doch.id;
  end if;
  return jsonb_build_object('vysledok','ok','event', v_event, 'mod', v_mod);
end $$;

-- ---------- práva: zápisové RPC len pre prihlásených ----------
revoke all on function public.recurring_create(text,numeric,text,text,uuid,uuid,bigint,boolean), public.qr_split_pay(text,text,numeric,text,text,text),
  public.qr_split_create(uuid,text,numeric,jsonb,text,text), public.qr_split_list(), public.chain_create(uuid,numeric,text,numeric,text),
  public.escrow_create(uuid,text,numeric,text,jsonb), public.escrow_uvolni(uuid,numeric,uuid,text), public.escrow_vrat(uuid),
  public.badge_bind(uuid,integer), public.badge_unbind(uuid), public.badge_scan(uuid,numeric),
  public.event_secret_create(uuid,integer,text,text), public.event_token(uuid), public.scan_validate(text,text,double precision,double precision)
  from public, anon;
grant execute on function public.recurring_create(text,numeric,text,text,uuid,uuid,bigint,boolean), public.qr_split_pay(text,text,numeric,text,text,text),
  public.qr_split_create(uuid,text,numeric,jsonb,text,text), public.qr_split_list(), public.chain_create(uuid,numeric,text,numeric,text),
  public.escrow_create(uuid,text,numeric,text,jsonb), public.escrow_uvolni(uuid,numeric,uuid,text), public.escrow_vrat(uuid),
  public.badge_bind(uuid,integer), public.badge_unbind(uuid), public.badge_scan(uuid,numeric),
  public.event_secret_create(uuid,integer,text,text), public.event_token(uuid), public.scan_validate(text,text,double precision,double precision)
  to authenticated, service_role;

commit;
