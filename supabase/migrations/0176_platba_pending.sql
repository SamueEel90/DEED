-- ============================================================
-- 0176 · Kontrola 24. 10. · R1 + N9 — EUR vznikajú v ledgeri až po potvrdení rúrou (pending → settled)
-- ------------------------------------------------------------
-- Doteraz: dar kartou / SEPA / SMS vznikol hneď ako 'settled' a hneď mal pohyby (procesor → príjemca). Rúra
-- neexistuje, takže ktokoľvek (aj bez prihlásenia, 0074b) zapísal do hociktorej zbierky dar bez peňazí.
-- Teraz:
--   1. platba_zapis pre kanál fiat / sepa / sms zapíše platbu v stave 'pending' BEZ pohybov. Plán pohybov
--      (zdroj, podiely, marža, tip, reťaz) sa uloží do platba.pohyby_plan — potvrdenie ho vykoná 1 : 1.
--      DeeD ostáva ako doteraz (peniaze už sú v ledgeri, pohyby hneď).
--   2. platba_potvrd(platba, kto): pending → settled + pohyby podľa plánu. Volá len server (service_role —
--      webhook rúry api/platba-webhook.ts, alebo člen tímu DEED cez platba_potvrd_admin).
--   3. Testovacia verzia (je_testovaci(): zapnutá testovacia pokladňa alebo testovací dar): potvrdenie prebehne
--      HNEĎ v tej istej transakcii (potvrdil = 'testovacia_pokladna'). Martinovo testovanie sa nemení.
--   4. platba_zlyhala(platba, dôvod): pending → failed (rúra odmietla). Cron raz za hodinu označí ako failed
--      pending platby, ktoré rúra nepotvrdila: karta a SMS po 1 hodine, SEPA po 7 dňoch.
--   5. Neprihlásený darca: z jednej IP adresy najviac 30 nepotvrdených platieb za hodinu (dokopy, na všetky zbierky).
--      Chráni pred klikačom, tisíc skutočných ľudí = tisíc IP. Bez IP (chýba hlavička) sa limit neuplatní.
--      Martin 24. 10.: do varovaní — keby anonymné dary z jedného miesta (jedna IP, napr. firemná sieť) neprechádzali, je to toto.
--   6. Výpis darcu (v_vypis) ukazuje aj pending platbu so stavom 'pending' („čaká na potvrdenie").
-- Vyzbierané, rebríčky, zoznamy darcov a počítadlá čítajú len pohyby → pending platbu nevidia.
-- Netýka sa: escrow_create (EUR) a dorovnanie_financuj — platby firiem, samostatná oprava.
-- Spúšťa sa po 0175. Idempotentné.
-- ============================================================
begin;

-- ---------- 1 · plán pohybov a kto potvrdil ----------
alter table public.platba add column if not exists pohyby_plan jsonb;
alter table public.platba add column if not exists potvrdil text;        -- 'rura' | 'testovacia_pokladna' | 'admin:<ucet>' | 'deed'
alter table public.platba add column if not exists zlyhanie text;        -- dôvod pri stave failed
alter table public.platba add column if not exists ip_darcu text;        -- IP neprihláseného darcu pri pending platbe (len na limit z bodu 5 vyššie; po potvrdení / zlyhaní sa maže)
create index if not exists platba_pending_ip_idx on public.platba (ip_darcu, cas) where stav = 'pending' and ip_darcu is not null;

-- IP volajúceho z hlavičky požiadavky (PostgREST); null mimo HTTP (cron, SQL editor, testy bez hlavičky)
create or replace function public.ip_klienta() returns text
  language sql stable as $$
  select nullif(trim(split_part(coalesce(
    current_setting('request.headers', true)::json->>'cf-connecting-ip',
    current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), '')
$$;
comment on column public.platba.pohyby_plan is 'Plán pohybov zapísaný pri vzniku platby (0176). platba_pohyby ho vykoná pri potvrdení 1 : 1.';
create index if not exists platba_pending_idx on public.platba (cas) where stav = 'pending';

-- ---------- 2 · platba_pohyby — JEDINÉ miesto, kde dar vytvára pohyby (telo 1 : 1 z 0065) ----------
create or replace function public.platba_pohyby(p_platba uuid) returns void
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  pl public.platba; pn jsonb; e jsonb; i int := 0; v_zdroj uuid; v_prijem numeric; v_marza numeric; v_tip numeric; v_split boolean;
  v_retaz text; v_retaz_pct text; v_retaz_zb text; v_testovaci text;
begin
  select * into pl from public.platba where id = p_platba for update;
  if not found then raise exception 'platba_neexistuje' using errcode = 'P0002'; end if;
  if exists (select 1 from public.pohyb where platba_id = p_platba) then return; end if;   -- pohyby už sú (idempotentné)
  pn := pl.pohyby_plan;
  if pn is null then raise exception 'Platba nemá plán pohybov.' using errcode = '22023', detail = 'bez_planu'; end if;

  v_zdroj := (pn->>'zdroj')::uuid; v_prijem := coalesce((pn->>'prijem')::numeric, 0);
  v_marza := coalesce((pn->>'marza')::numeric, 0); v_tip := coalesce((pn->>'tip')::numeric, 0);
  v_split := coalesce((pn->>'split')::boolean, false);

  -- reťaz (0157) a testovací príznak idú na pohyby zo session premenných — nastavia sa z plánu / platby a potom vrátia
  v_retaz := current_setting('deed.retaz', true); v_retaz_pct := current_setting('deed.retaz_pct', true);
  v_retaz_zb := current_setting('deed.retaz_zb', true); v_testovaci := current_setting('deed.testovaci', true);
  perform set_config('deed.retaz', coalesce(pn->>'retaz', ''), true);
  perform set_config('deed.retaz_pct', coalesce(pn->>'retaz_pct', ''), true);
  perform set_config('deed.retaz_zb', coalesce(pn->>'retaz_zb', ''), true);
  if pl.testovaci then perform set_config('deed.testovaci', '1', true); end if;

  -- pohyby: príchod EUR na účet darcu, podiely, marža, tip (poradie a hodnoty ako v 0065)
  if v_prijem > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (pl.doklad, 0, 'dobitie', public.ucet_systemu('procesor'), v_zdroj, v_prijem, pl.mena, pl.kanal, pl.id, pl.case_id);
  end if;
  for e in select * from jsonb_array_elements(pn->'podiely') loop
    i := i + 1;
    if (e->>'suma')::numeric > 0 then
      if v_split then
        insert into public.platba_split (platba_id, prijemca, prijemca_text, podiel, suma, fixny, case_id)
          values (pl.id, (e->>'ucet')::uuid, e->>'text', (e->>'podiel')::numeric, (e->>'suma')::numeric,
                  (e->>'fixny')::boolean, nullif(e->>'case','')::uuid);
      end if;
      insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, pre_zbierku)
        values (pl.doklad, i, e->>'typ', v_zdroj, (e->>'ucet')::uuid, (e->>'suma')::numeric, pl.mena, pl.kanal, pl.id,
                coalesce(nullif(e->>'case','')::uuid, pl.case_id),
                (e->>'fixny')::boolean and coalesce(nullif(e->>'case','')::uuid, pl.case_id) is not null);
    end if;
  end loop;
  if v_marza > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (pl.doklad, 0, 'poplatok', v_zdroj, public.ucet_systemu('platforma'), v_marza, pl.mena, pl.kanal, pl.id, pl.case_id);
  end if;
  if v_tip > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (pl.doklad, i + 1, 'dar', v_zdroj, public.ucet_systemu('platforma'), v_tip, pl.mena, pl.kanal, pl.id, pl.case_id);
  end if;

  perform set_config('deed.retaz', coalesce(v_retaz, ''), true);
  perform set_config('deed.retaz_pct', coalesce(v_retaz_pct, ''), true);
  perform set_config('deed.retaz_zb', coalesce(v_retaz_zb, ''), true);
  perform set_config('deed.testovaci', coalesce(v_testovaci, ''), true);
end $$;
revoke all on function public.platba_pohyby(uuid) from public, anon, authenticated;

-- ---------- 3 · platba_potvrd — pending → settled + pohyby; len server ----------
create or replace function public.platba_potvrd(p_platba uuid, p_kto text default 'rura') returns public.platba
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare pl public.platba;
begin
  select * into pl from public.platba where id = p_platba for update;
  if not found then raise exception 'platba_neexistuje' using errcode = 'P0002'; end if;
  if pl.stav in ('settled', 'credited') then return pl; end if;                     -- už potvrdená (idempotentné)
  if pl.stav <> 'pending' then
    raise exception 'Platba v stave % sa nedá potvrdiť.', pl.stav using errcode = '22023', detail = 'zly_stav';
  end if;
  -- najprv pohyby, potom stav: spúšťač platba_skus_uzavriet (0168) pri zmene stavu už vidí vyzbierané
  perform public.platba_pohyby(p_platba);
  update public.platba
     set stav = 'settled', credited_at = coalesce(credited_at, now()), settled_at = now(), potvrdil = p_kto, ip_darcu = null
   where id = p_platba returning * into pl;
  -- reťaz: dar mohol zbierku naplniť → rad sa posunie (ako retaz_dar po zápise)
  if pl.meta ? 'retaz' then perform public.retaz_posun(pl.meta->>'retaz', true); end if;
  return pl;
end $$;
revoke all on function public.platba_potvrd(uuid, text) from public, anon, authenticated;
grant execute on function public.platba_potvrd(uuid, text) to service_role;

-- člen tímu DEED potvrdí z appky (kým rúra neexistuje / ručné spárovanie SEPA)
create or replace function public.platba_potvrd_admin(p_platba uuid) returns public.platba
  language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not public.som_deed_admin() then raise exception 'nie_admin' using errcode = '42501'; end if;
  return public.platba_potvrd(p_platba, 'admin:' || public.moj_ucet()::text);
end $$;
revoke all on function public.platba_potvrd_admin(uuid) from public, anon;
grant execute on function public.platba_potvrd_admin(uuid) to authenticated, service_role;

-- ---------- 4 · zlyhanie a expirácia ----------
create or replace function public.platba_zlyhala(p_platba uuid, p_dovod text default null) returns public.platba
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare pl public.platba;
begin
  select * into pl from public.platba where id = p_platba for update;
  if not found then raise exception 'platba_neexistuje' using errcode = 'P0002'; end if;
  if pl.stav = 'failed' then return pl; end if;
  if pl.stav <> 'pending' then
    raise exception 'Platba v stave % sa nedá označiť ako zlyhaná.', pl.stav using errcode = '22023', detail = 'zly_stav';
  end if;
  update public.platba set stav = 'failed', ip_darcu = null, zlyhanie = left(coalesce(p_dovod, 'rura'), 200) where id = p_platba returning * into pl;
  delete from public.podpora where platba_id = p_platba;      -- projekcia „Čo podporujem" (nie peniaze)
  return pl;
end $$;
revoke all on function public.platba_zlyhala(uuid, text) from public, anon, authenticated;
grant execute on function public.platba_zlyhala(uuid, text) to service_role;

create or replace function public.platba_pending_expiruj() returns int
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare r record; n int := 0;
begin
  for r in select id from public.platba
            where stav = 'pending'
              and ((kanal in ('fiat', 'sms') and cas < now() - interval '1 hour')
                   or (kanal = 'sepa' and cas < now() - interval '7 days'))
            for update skip locked loop
    perform public.platba_zlyhala(r.id, 'nepotvrdene_v_lehote');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.platba_pending_expiruj() from public, anon, authenticated;
grant execute on function public.platba_pending_expiruj() to service_role;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('deed-platba-pending', '23 * * * *', 'select public.platba_pending_expiruj();');
  end if;
end $$;

-- ---------- 5 · platba_zapis — telo 1 : 1 z 0065; EUR kanály bez pohybov (pending), DeeD hneď ----------
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
  v_credited timestamptz; v_settled timestamptz; v_ip text;
  v_zdroj uuid; v_doklad text; v_prijemca uuid; v_sum_podiel numeric := 0; v_sum_suma numeric := 0;
  v_podiely jsonb := '[]'::jsonb; e jsonb; v_n int; v_suma_podielu numeric; v_ucet uuid; v_case uuid;
  v_prijem numeric(14,4) := 0; v_f record; v_je_split boolean; v_plan jsonb; v_hned boolean;
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
      if coalesce(e->>'typ', 'dar') not in ('dar', 'sluzba') then
        raise exception 'Neznámy druh podielu.' using errcode = '22023', detail = 'split_typ';
      end if;
      if coalesce((e->>'podiel')::numeric, 0) <= 0 then
        raise exception 'Podiel musí byť kladný.' using errcode = '22023', detail = 'split_podiel';
      end if;
      v_sum_podiel := v_sum_podiel + (e->>'podiel')::numeric;
      v_suma_podielu := trunc(v_cista * (e->>'podiel')::numeric, v_presnost);
      v_sum_suma := v_sum_suma + v_suma_podielu;
      v_podiely := v_podiely || jsonb_build_array(jsonb_build_object(
        'ucet', v_ucet, 'case', v_case, 'text', e->>'prijemca_text', 'podiel', (e->>'podiel')::numeric,
        'suma', v_suma_podielu, 'fixny', coalesce((e->>'fixny')::boolean, false), 'typ', coalesce(e->>'typ', 'dar')));
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
      'podiel', 1, 'suma', v_cista, 'fixny', true, 'typ', 'dar'));
  end if;

  -- dar sám sebe z vlastného účtu nič nepresunie (len by zaplatil poplatok) → odmietnuť
  if exists (select 1 from jsonb_array_elements(v_podiely) x where (x->>'ucet')::uuid = v_zdroj) then
    raise exception 'Z vlastného účtu sa na vlastný účet darovať nedá.' using errcode = '22023', detail = 'vlastny_ucet';
  end if;

  -- 0176: EUR kanály čakajú na rúru. Hneď sa potvrdí len DeeD (peniaze už sú v ledgeri) a testovacia verzia.
  v_hned := p_kanal = 'deed' or public.je_testovaci();

  -- 0176 · 5: neprihlásený darca — z jednej IP najviac 30 nepotvrdených platieb za hodinu (bez IP bez limitu)
  if not v_hned and p_ucet_darcu is null and public.zapis_klienta() then
    v_ip := public.ip_klienta();
    if v_ip is not null and (select count(*) from public.platba pl
         where pl.stav = 'pending' and pl.ip_darcu = v_ip and pl.cas > now() - interval '1 hour') >= 30 then
      raise exception 'Priveľa nepotvrdených darov z vašej siete. Skúste o chvíľu.' using errcode = '54000', detail = 'pending_limit';
    end if;
  end if;

  -- stav + externý identifikátor (simulované rúry); EUR kanály ostávajú 'pending', kým ich nepotvrdí rúra
  v_mikro := (p_kanal = 'deed' and v_suma <= 1);
  if v_mikro then
    v_stav := 'credited'; v_credited := now();
  elsif p_kanal = 'deed' then
    v_stav := 'settled'; v_credited := now(); v_settled := now();
    v_hash := '0x' || encode(gen_random_bytes(8), 'hex');
  elsif p_kanal in ('fiat','sepa') then
    v_stav := 'pending';
    v_vs := lpad(nextval('public.vs_seq')::text, 10, '0');
  elsif p_kanal = 'sms' then
    v_stav := 'pending';
    v_sms := upper(encode(gen_random_bytes(3), 'hex'));
  end if;
  v_doklad := public.novy_doklad();

  -- plán pohybov — potvrdenie ho vykoná 1 : 1 (reťaz zo session premenných, 0157)
  v_plan := jsonb_build_object(
    'zdroj', v_zdroj, 'prijem', v_prijem, 'marza', v_marza, 'tip', v_tip, 'podiely', v_podiely,
    'split', p_split is not null and jsonb_typeof(p_split) = 'array' and jsonb_array_length(p_split) > 0,
    'retaz', nullif(current_setting('deed.retaz', true), ''),
    'retaz_pct', nullif(current_setting('deed.retaz_pct', true), ''),
    'retaz_zb', nullif(current_setting('deed.retaz_zb', true), ''));

  insert into public.platba (
    case_id, odosielatel, odosielatel_text, prijemca_ucet, prijemca_text,
    suma, mena, kanal, ext_vs, ext_hash, ext_sms_kod,
    poplatok, marza, cista_suma, tip, stav, idem_kluc, idem_scope, meta, credited_at, settled_at, doklad, pohyby_plan,
    potvrdil, ip_darcu
  ) values (
    p_case_id, p_ucet_darcu, p_meno_darcu, v_prijemca, p_prijemca_text,
    v_suma, p_mena, p_kanal, v_vs, v_hash, v_sms,
    v_poplatok, v_marza, v_cista, v_tip, v_stav, p_idem_kluc, v_scope, coalesce(p_meta,'{}'::jsonb), v_credited, v_settled, v_doklad, v_plan,
    case when p_kanal = 'deed' then 'deed' end, case when v_stav = 'pending' and p_ucet_darcu is null then v_ip end
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

  if p_kanal = 'deed' then
    perform public.platba_pohyby(v_row.id);                                   -- DeeD: pohyby hneď (ako doteraz)
  elsif v_hned then
    v_row := public.platba_potvrd(v_row.id, 'testovacia_pokladna');          -- testovacia verzia: potvrdené hneď, tá istá transakcia
  end if;
  select * into v_row from public.platba where id = v_row.id;
  return v_row;
end;
$function$;
revoke all on function public.platba_zapis(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.platba_zapis(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) to service_role;

-- ---------- 6 · výpis darcu: aj pending platba („čaká na potvrdenie") ----------
create or replace view public.v_vypis as
  select p.platba_id, p.ucet_debet as ucet_id, 'dal'::text as smer, p.case_id,
         coalesce(pl.prijemca_text, uk.system_kluc) as protistrana,
         p.suma, p.mena, p.kanal, pl.poplatok, pl.tip, pl.cista_suma, coalesce(pl.stav, 'settled') as stav,
         coalesce(pl.ext_vs, pl.ext_hash, pl.ext_sms_kod, p.vs) as externy_id, pl.batch_id, p.cas,
         p.typ, p.doklad, p.poradie
    from public.pohyb p
    left join public.platba pl on pl.id = p.platba_id
    left join public.ucet uk on uk.id = p.ucet_kredit
   where p.ucet_debet = public.moj_ucet()
  union all
  select p.platba_id, p.ucet_kredit, 'dostal'::text, p.case_id,
         coalesce(pl.odosielatel_text, ud.system_kluc),
         p.suma, p.mena, p.kanal, pl.poplatok, pl.tip, pl.cista_suma, coalesce(pl.stav, 'settled'),
         coalesce(pl.ext_vs, pl.ext_hash, pl.ext_sms_kod, p.vs), pl.batch_id, p.cas,
         p.typ, p.doklad, p.poradie
    from public.pohyb p
    left join public.platba pl on pl.id = p.platba_id
    left join public.ucet ud on ud.id = p.ucet_debet
   where p.ucet_kredit = public.moj_ucet()
  union all
  -- 0176: dar, ktorý ešte nepotvrdila rúra — bez pohybov, stav 'pending'
  select pl.id, pl.odosielatel, 'dal'::text, pl.case_id, pl.prijemca_text,
         pl.suma, pl.mena, pl.kanal, pl.poplatok, pl.tip, pl.cista_suma, pl.stav,
         coalesce(pl.ext_vs, pl.ext_hash, pl.ext_sms_kod), pl.batch_id, pl.cas,
         'dar'::text, pl.doklad, 1::smallint
    from public.platba pl
   where pl.stav = 'pending' and pl.odosielatel = public.moj_ucet();
alter view public.v_vypis set (security_invoker = true);
grant select on public.v_vypis to authenticated;

commit;
