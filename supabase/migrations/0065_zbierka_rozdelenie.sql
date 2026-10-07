-- ============================================================
-- 0065 · Karta 56E — rozdelenie zbierky s overovateľom = split zbierky v ledgeri
-- ------------------------------------------------------------
-- Žiadny výplatný stroj. Rozdelenie, ktoré overovateľ a príjemca potvrdili (zbierka.nastavenie.rozdelenie),
-- sa pri zapečatení zapíše do zbierka_podiel (split-config zbierky). Každý dar na zbierku (zbierka_dar)
-- z neho cez platba_zapis vytvorí podiely jedného dokladu: príjemca / overovateľ / podelené stránky, súčet na cent.
-- Reálne smerovanie peňazí robí rúra/PSP pri napojení (karta N9); v teste tečie testovacia pokladňa.
--
-- Pravidlá (Martin 7. 10.):
--  · peniaze tečú len na overené ciele — zapečatiť sa nedá, kým KAŽDÝ príjemca podielu nemá overený účet
--    (pozostalý: KYC „sedí"; stránka: účet overený pre stránku 0044; organizácia: KYB „overená").
--    Na testovacej stránke (ako 0044 'testovaci') stačí účet v DEED — sken príjemcu je zatiaľ PLACEBO.
--  · overovateľ = stránka zbierky. Farnosť = overovateľ-dar (podiel v splite, typ 'dar').
--    Firma / inštitúcia = overovateľ-služba (typ 'sluzba'). Obaja najviac 3 % a spolu najviac 100 € za zbierku —
--    potom vypínacia poistka: podiel overovateľa pri ďalších daroch neexistuje, jeho časť ide ostatným v pomere.
--  · podeliť sa dá najviac s 2 stránkami registrovanými v DEED, každá aspoň 5 %. Voľný IBAN nikdy.
--  · po zapečatení sa split nemení (ako zámok 0041).
-- ============================================================
begin;

-- ---------- 1 · druh pohybu „služba" (podiel overovateľa-služby; faktúra mimo ledgera) ----------
alter table public.pohyb drop constraint if exists pohyb_typ_check;
alter table public.pohyb add constraint pohyb_typ_check
  check (typ in ('dar','dorovnanie','vratenie','poplatok','dobitie','sluzba'));

-- ---------- 2 · platba patrí zbierke (KAM) ----------
alter table public.platba add column if not exists zbierka text references public.zbierka(id);
create index if not exists platba_zbierka_idx on public.platba (zbierka) where zbierka is not null;

-- ---------- 3 · split-config zbierky ----------
create table if not exists public.zbierka_podiel (
  zbierka  text not null references public.zbierka(id) on delete restrict,
  poradie  smallint not null,                       -- 1 = príjemca, 2 = overovateľ, 3.. = podelené
  druh     text not null check (druh in ('prijemca', 'overovatel', 'podelene')),
  ucet     uuid not null references public.ucet(id),
  stranka  text references public.stranka(id),
  text     text,                                    -- len na zobrazenie
  podiel   numeric(6,5) not null check (podiel >= 0 and podiel <= 1),
  sluzba   boolean not null default false,          -- overovateľ-služba (firma, inštitúcia)
  strop    numeric(14,4),                           -- najviac pre overovateľa za celú zbierku
  primary key (zbierka, poradie)
);
alter table public.zbierka_podiel enable row level security;
drop policy if exists verejne_citat on public.zbierka_podiel;
create policy verejne_citat on public.zbierka_podiel for select to anon, authenticated using (true);  -- darca vidí rozdelenie pred darom
revoke insert, update, delete on public.zbierka_podiel from anon, authenticated;
grant select on public.zbierka_podiel to anon, authenticated;

create or replace function public.zbierka_podiel_nemenny() returns trigger
  language plpgsql as $$
begin
  raise exception 'Rozdelenie zapečatenej zbierky sa nedá zmeniť.' using errcode = '42501', detail = 'zapecatene';
end $$;
drop trigger if exists zbierka_podiel_nemenny on public.zbierka_podiel;
create trigger zbierka_podiel_nemenny before update or delete on public.zbierka_podiel
  for each row execute function public.zbierka_podiel_nemenny();

-- ---------- 4 · overený účet príjemcu ----------
create or replace function public.ucet_overeny(p_ucet uuid, p_test boolean default false) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kyc where ucet_id = p_ucet and vysledok = 'sedi')
      or exists (select 1 from public.kyb where org_ucet_id = p_ucet and vysledok = 'overena')
      or exists (select 1 from public.ucet where id = p_ucet and (typ = 'system' or stav_registracie = 'testovaci' or p_test))
$$;
revoke all on function public.ucet_overeny(uuid, boolean) from public, anon, authenticated;

create or replace function public.stranka_overena(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.overenie_uctu where stranka = p_stranka and stav = 'overeny')
$$;
revoke all on function public.stranka_overena(text) from public, anon, authenticated;

-- ---------- 5 · pri zapečatení: nastavenie.rozdelenie → zbierka_podiel ----------
-- vstup: [{druh:'prijemca', ucet, text, podiel}, {druh:'overovatel', podiel}, {druh:'podelene', stranka, text, podiel}]
create or replace function public.zbierka_rozdelenie() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  r jsonb := new.nastavenie->'rozdelenie'; e jsonb; v_s public.stranka; v_ov public.stranka;
  v_sum numeric := 0; v_n int := 2; v_prij int := 0; v_ovn int := 0; v_pod int := 0; v_ucet uuid; v_test boolean;
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
      if v_ucet is null or not public.ucet_overeny(v_ucet, v_test) then
        raise exception 'Príjemca nemá overený účet.' using errcode = '42501', detail = 'prijemca_neovereny';
      end if;
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
drop trigger if exists zbierka_rozdelenie on public.zbierka;
create trigger zbierka_rozdelenie after insert or update of zapecatena on public.zbierka
  for each row execute function public.zbierka_rozdelenie();

-- ---------- 6 · platba_zapis: podiel nesie druh pohybu ('dar' | 'sluzba') ----------
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
        values (v_doklad, i, e->>'typ', v_zdroj, (e->>'ucet')::uuid, (e->>'suma')::numeric, p_mena, p_kanal, v_row.id,
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

-- ---------- 7 · dar na zbierku s rozdelením ----------
create or replace function public.zbierka_dar(p_zbierka text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_z public.zbierka; v_ja uuid := public.ja_prihlaseny(); v_pl public.platba; v_split jsonb := '[]'::jsonb;
  v_ov public.zbierka_podiel; v_dostal numeric := 0; v_ov_suma numeric := 0; v_ov_podiel numeric := 0;
  v_ostatne numeric; v_koef numeric; r public.zbierka_podiel;
begin
  select * into v_z from public.zbierka where id = p_zbierka;
  if not found or v_z.zapecatena is null then
    raise exception 'Zbierka neexistuje.' using errcode = 'P0002', detail = 'zbierka_neexistuje';
  end if;
  if v_z.stav <> 'aktivna' then
    raise exception 'Zbierka už neberie dary.' using errcode = '22023', detail = 'zbierka_ukoncena';
  end if;
  if not exists (select 1 from public.zbierka_podiel where zbierka = p_zbierka) then
    raise exception 'Zbierka nemá rozdelenie.' using errcode = '22023', detail = 'bez_rozdelenia';
  end if;

  -- overovateľ: najviac strop za celú zbierku (z ledgera, storno odpočíta); potom vypínacia poistka
  select * into v_ov from public.zbierka_podiel where zbierka = p_zbierka and druh = 'overovatel' and podiel > 0;
  if found then
    select coalesce(sum(case when po.storno_pre is null then po.suma else -po.suma end), 0) into v_dostal
      from public.pohyb po join public.platba pl on pl.id = po.platba_id
     where pl.zbierka = p_zbierka and (po.ucet_kredit = v_ov.ucet or po.ucet_debet = v_ov.ucet) and po.typ in ('dar', 'sluzba', 'vratenie');
    v_ov_suma := least(trunc(p_suma * v_ov.podiel, 2), greatest(coalesce(v_ov.strop, p_suma) - v_dostal, 0));
    v_ov_podiel := round(v_ov_suma / p_suma, 5);
  end if;

  -- ostatní dostanú svoj podiel + časť overovateľa nad strop v pomere (príjemca prvý: dostane centy z orezania)
  select coalesce(sum(podiel), 0) into v_ostatne from public.zbierka_podiel where zbierka = p_zbierka and druh <> 'overovatel' and podiel > 0;
  if v_ostatne <= 0 then raise exception 'Zbierka nemá príjemcu podielu.' using errcode = '22023', detail = 'bez_prijemcu'; end if;
  v_koef := (1 - v_ov_podiel) / v_ostatne;
  for r in select * from public.zbierka_podiel where zbierka = p_zbierka and druh <> 'overovatel' and podiel > 0 order by poradie loop
    v_split := v_split || jsonb_build_array(jsonb_build_object('prijemca_ucet', r.ucet, 'prijemca_text', r.text,
      'podiel', r.podiel * v_koef, 'fixny', false, 'typ', 'dar'));
  end loop;
  if v_ov_podiel > 0 then
    v_split := v_split || jsonb_build_array(jsonb_build_object('prijemca_ucet', v_ov.ucet, 'prijemca_text', v_ov.text,
      'podiel', v_ov_podiel, 'fixny', false, 'typ', case when v_ov.sluzba then 'sluzba' else 'dar' end));
  end if;

  v_pl := public.platba_zapis(p_idem, p_suma, p_mena, p_kanal, null, v_ja, p_meno_darcu,
    null, v_z.nazov, false, 0, jsonb_build_object('zbierka', p_zbierka), v_split);
  update public.platba set zbierka = p_zbierka where id = v_pl.id and zbierka is null;
  return jsonb_build_object('platba_id', v_pl.id, 'zbierka', p_zbierka, 'stav', v_pl.stav, 'suma', v_pl.suma);
end $$;
revoke all on function public.zbierka_dar(text,text,numeric,text,text,text) from public, anon;
grant execute on function public.zbierka_dar(text,text,numeric,text,text,text) to authenticated, service_role;

-- ---------- 8 · vyzbierané zbierky s rozdelením — len z ledgera ----------
create or replace view public.v_zbierka_vyzbierane with (security_invoker = false) as
  select pl.zbierka, po.mena,
         sum(case when po.storno_pre is null then po.suma else -po.suma end) as vyzbierane,
         count(distinct pl.id) filter (where po.storno_pre is null) as darov
    from public.pohyb po join public.platba pl on pl.id = po.platba_id
   where pl.zbierka is not null and po.typ in ('dar', 'sluzba', 'vratenie')
     and po.ucet_kredit <> public.ucet_systemu('platforma')
   group by pl.zbierka, po.mena;
grant select on public.v_zbierka_vyzbierane to anon, authenticated;

commit;
