-- ============================================================
-- 0074b · Odkazy 3 · bod 4 — neprihlásený darca na zbierku (len SEPA / karta)
-- ------------------------------------------------------------
-- zbierka_dar (0066) volal ja_prihlaseny() → neprihlásený (pasívny divák, ktorý platí EUR) dostal
-- chybu 'neprihlaseny' a dar sa do ledgera nezapísal. Teraz: bez prihlásenia sa dá darovať len
-- kanálom fiat (karta) a sepa — platba_zapis ho zapíše ako anonymný EUR dar cez procesor
-- (bez účtu darcu, bez mena). DeeD a SMS ostávajú len pre prihláseného.
-- Telo funkcie je 1:1 ako 0066, zmenený je len začiatok (kto daruje) a execute pre anon.
-- Pozn.: v teste tečú simulované rúry; ostrý EUR dar potvrdí až procesor (karta N9).
-- ============================================================
begin;

create or replace function public.zbierka_dar(p_zbierka text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null, p_stranka text default null, p_nazov text default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_z public.zbierka; v_ja uuid := public.moj_ucet(); v_pl public.platba; v_split jsonb := '[]'::jsonb;
  v_ov public.zbierka_podiel; v_dostal numeric := 0; v_ov_suma numeric := 0; v_ov_podiel numeric := 0;
  v_ostatne numeric; v_koef numeric; r public.zbierka_podiel; v_s public.stranka; v_ucet uuid;
begin
  -- bez prihlásenia len EUR kartou alebo SEPA (anonymný dar cez procesor)
  if v_ja is null and p_kanal not in ('fiat', 'sepa') then
    raise exception 'neprihlaseny' using errcode = '28000';
  end if;
  select * into v_z from public.zbierka where id = p_zbierka;
  -- hlavná / sektorová zbierka stránky: riadok vznikne pri prvom dare
  if not found and p_stranka is not null and p_zbierka like p_stranka || ':%' then
    select * into v_s from public.stranka where id = p_stranka;
    if found then
      insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id)
        values (p_zbierka, coalesce(nullif(trim(p_nazov), ''), 'Hlavná zbierka'),
                case when v_s.typ = 'farnost' then 'nabozenstvo' else 'charity' end,
                case when p_zbierka = p_stranka || ':hlavna' then 'hlavna' else 'sektor' end, 'aktivna', p_stranka, v_s.ucet_id)
        on conflict (id) do nothing;
      select * into v_z from public.zbierka where id = p_zbierka;
    end if;
  end if;
  if v_z.id is null or (v_z.zapecatena is null and v_z.stranka is not null and coalesce(v_z.typ, '') not in ('hlavna', 'sektor')) then
    raise exception 'Zbierka neexistuje.' using errcode = 'P0002', detail = 'zbierka_neexistuje';
  end if;
  if v_z.stav <> 'aktivna' then
    raise exception 'Zbierka už neberie dary.' using errcode = '22023', detail = 'zbierka_ukoncena';
  end if;
  -- bez rozdelenia: celý dar na účet stránky (inak zakladateľa zbierky)
  if not exists (select 1 from public.zbierka_podiel where zbierka = p_zbierka) then
    v_ucet := coalesce((select ucet_id from public.stranka where id = v_z.stranka), v_z.ucet_id);
    v_pl := public.platba_zapis(p_idem, p_suma, p_mena, p_kanal, null, v_ja, p_meno_darcu,
      null, v_z.nazov, false, 0, jsonb_build_object('zbierka', p_zbierka),
      jsonb_build_array(jsonb_build_object('prijemca_ucet', v_ucet, 'prijemca_text', v_z.nazov, 'podiel', 1, 'fixny', false, 'typ', 'dar')));
    update public.platba set zbierka = p_zbierka where id = v_pl.id and zbierka is null;
    return jsonb_build_object('platba_id', v_pl.id, 'zbierka', p_zbierka, 'stav', v_pl.stav, 'suma', v_pl.suma);
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
revoke all on function public.zbierka_dar(text,text,numeric,text,text,text,text,text) from public;
grant execute on function public.zbierka_dar(text,text,numeric,text,text,text,text,text) to anon, authenticated, service_role;

commit;
