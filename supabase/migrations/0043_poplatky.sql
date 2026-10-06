-- ============================================================
-- 0043 · Zadanie 3 · 3.4 — poplatky: jeden zdroj pravdy v DB, sadzby ako config
-- ------------------------------------------------------------
-- Mechanika (Martin 6. 10.): darca platí poplatok NAVRCH, príjemca dostane celú sumu daru.
-- Výpočet žije LEN tu: public.poplatok() nad tabuľkou poplatok_sadzba. platba_create ho používa
-- a appka si pred platbou pýta to isté cez rpc poplatok_nahlad → zobrazené = strhnuté.
-- Sadzby sú config (placeholder): karta 1,4 % + 0,15 € (od 3 €), SEPA 0 (split 0,35 €, od 1 €),
-- DEED 0, SMS 10 % (od 1 €), marža DEED 0. Zmena sadzby = UPDATE configu, nie kód.
-- ============================================================
begin;

create table if not exists public.poplatok_sadzba (
  kanal          text primary key,
  percento       numeric(6,3) not null default 0,     -- % zo sumy (procesor / partner)
  fix            numeric(10,4) not null default 0,    -- pevná časť za platbu
  marza_percento numeric(6,3) not null default 0,     -- naša marža v % (časť poplatku)
  split_fix      numeric(10,4),                       -- pevný poplatok partnera pri splite (null = ako bez splitu)
  min_suma       numeric(14,4) not null default 0,    -- najmenší dar touto rúrou
  popis          text not null,                       -- text do appky („1,4 % + 0,15 €")
  zmenene        timestamptz not null default now()
);
insert into public.poplatok_sadzba (kanal, percento, fix, marza_percento, split_fix, min_suma, popis) values
  ('fiat', 1.4, 0.15, 0, null, 3,      '1,4 % + 0,15 €'),
  ('sepa', 0,   0,    0, 0.35, 1,      'bez poplatku'),
  ('deed', 0,   0,    0, null, 0.0001, 'bez poplatku'),
  ('sms',  10,  0,    0, null, 1,      '10 %')
on conflict (kanal) do nothing;
alter table public.poplatok_sadzba enable row level security;
drop policy if exists citaj on public.poplatok_sadzba;
create policy citaj on public.poplatok_sadzba for select to anon, authenticated using (true);

-- jediný výpočet poplatku (procesor/partner + marža); pod minimom rúry chyba
create or replace function public.poplatok(p_kanal text, p_suma numeric, p_split boolean default false,
                                           out poplatok numeric, out marza numeric, out popis text)
  language plpgsql stable security definer set search_path = public as $$
declare s public.poplatok_sadzba; v_p int := case when p_kanal = 'deed' then 4 else 2 end; v_proc numeric;
begin
  select * into s from public.poplatok_sadzba where kanal = p_kanal;
  if not found then raise exception 'Neznámy spôsob platby.' using errcode = '22023', detail = 'kanal'; end if;
  if p_suma is null or p_suma <= 0 then raise exception 'Suma musí byť kladná.' using errcode = '22023', detail = 'suma_neplatna'; end if;
  if p_suma < s.min_suma then
    raise exception 'Najmenší dar týmto spôsobom je % €.', replace(rtrim(to_char(s.min_suma, 'FM999990.9999'), '.'), '.', ',') using errcode = '22023', detail = 'pod_minimom';
  end if;
  v_proc := case when p_split and s.split_fix is not null then s.split_fix
                 else round(p_suma * s.percento / 100 + s.fix, v_p) end;
  marza := round(p_suma * s.marza_percento / 100, v_p);
  poplatok := v_proc + marza;
  popis := case when p_split and s.split_fix is not null then replace(to_char(s.split_fix, 'FM999990.00'), '.', ',') || ' € (split)' else s.popis end;
end $$;

-- náhľad pred platbou — appka zobrazí presne to, čo platba_create strhne
create or replace function public.poplatok_nahlad(p_kanal text, p_suma numeric, p_split boolean default false) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object('poplatok', f.poplatok, 'marza', f.marza, 'spolu', p_suma + f.poplatok, 'popis', f.popis)
    from public.poplatok(p_kanal, p_suma, p_split) f
$$;
grant execute on function public.poplatok_nahlad(text, numeric, boolean) to anon, authenticated;

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
  p_split            jsonb   default null         -- [{prijemca_ucet | case_id, prijemca_text?, podiel, fixny?}]
) returns public.platba
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_scope uuid := coalesce(p_odosielatel, '00000000-0000-0000-0000-000000000000');
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
    if p_odosielatel is null then
      raise exception 'Platba v DeeD potrebuje účet darcu.' using errcode = '22023', detail = 'deed_bez_uctu';
    end if;
    v_zdroj := p_odosielatel;
    perform 1 from public.ucet where id = v_zdroj for update;
    if public.zostatok(v_zdroj, 'DEED') < v_suma + v_poplatok + v_tip then
      raise exception 'Na účte nie je dosť DeeD.' using errcode = '23514', detail = 'nedostatok_deed';
    end if;
  elsif p_odosielatel is not null then
    -- EUR od darcu s účtom: prídu cez procesor na jeho účet a od neho idú ďalej (rebríček a výpis čítajú ledger)
    v_zdroj := p_odosielatel;
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
    p_case_id, p_odosielatel, p_odosielatel_text, v_prijemca, p_prijemca_text,
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
$fn$;
grant execute on function public.platba_create(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) to anon, authenticated;

commit;
