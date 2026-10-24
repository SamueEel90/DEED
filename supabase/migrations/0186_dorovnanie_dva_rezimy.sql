-- ============================================================
-- 0186 · Kontrola 24. 10. · oprava 11 — dorovnanie: dva režimy úhrady (Martin 24. 10.)
-- ------------------------------------------------------------
-- Doteraz: appka neposielala, či firma platí kartou alebo SEPA → server bral každé dorovnanie ako „zaplatené cez
-- DEED“ (pri SEPA strhol rozpočet hneď, hoci firma nič nepreviedla); po karte dorovnanie aj tak čakalo na charitu
-- (alebo sa spustilo samo po 48 h); charita nedostala žiadnu správu.
-- Teraz:
--   · karta cez nás  = platba overená → peniaze na viazaný účet a dorovnanie BEŽÍ HNEĎ po zapečatení;
--                      charita dostane oznam „Vašu zbierku začala dorovnávať firma XY“
--   · SEPA mimo nás  = čaká, kým charita v správe stránky potvrdí príjem; až potom peniaze na viazaný účet a beží.
--                      Žiadny 48 h automat. Charita dostane oznam „Potvrďte príjem platby“ s VS.
--   · spôsob úhrady určí server zo zvoleného kanála (sepa → mimo, inak deed), nie appka
--   · potvrdenie príjmu = hneď beží (medzikrok „spustiť“ ostáva len pre staré záznamy v stave 'potvrdene')
-- Telá dorovnanie_zapecat a dorovnanie_krok sú 1 : 1 z 0046, zmenené len označené riadky. Spúšťa sa po 0185. Idempotentné.
-- ============================================================
begin;

-- 48 h tichý súhlas zrušený: SEPA čaká na charitu, karta beží hneď
create or replace function public.dorovnania_obnov() returns void
  language plpgsql security definer set search_path = public as $$
begin
  return;
end $$;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then perform cron.unschedule('deed-dorovnanie-automat'); end if;
exception when others then null;
end $$;

create or replace function public.dorovnanie_zapecat(p jsonb) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare
  v_firma uuid := public.ucet_podla_cisla(p->>'firmaUcet'); v_stranka text; v_ciel_nazov text; v_prijemca uuid;
  v_id text := 'dv-' || replace(gen_random_uuid()::text, '-', ''); d public.dorovnanie; v_pomer numeric := (p->>'pomer')::numeric;
  v_test boolean;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if v_firma is null or not public.konam_za_firmu(v_firma) then raise exception 'Za túto firmu nemôžete konať.' using errcode = '42501', detail = 'cudzia_firma'; end if;
  -- cieľ musí existovať: zbierka stránky v DB alebo zaregistrovaný cieľ
  select z.stranka, z.nazov into v_stranka, v_ciel_nazov from public.zbierka z where z.id = p->>'ciel' and z.stranka is not null;
  if v_stranka is null then select c.stranka, c.nazov into v_stranka, v_ciel_nazov from public.dorovnanie_ciel c where c.ciel = p->>'ciel'; end if;
  if v_stranka is null then raise exception 'Cieľ dorovnania v DEED neexistuje.' using errcode = '22023', detail = 'ciel_neexistuje'; end if;
  v_prijemca := public.ucet_stranky(v_stranka);
  if v_prijemca is null then raise exception 'Stránka nemá účet.' using errcode = '22023', detail = 'bez_prijemcu'; end if;
  if not public.dorovnanie_smie(v_stranka, v_firma) then raise exception 'Táto zbierka dorovnanie od vás neprijíma.' using errcode = '42501', detail = 'obmedzene'; end if;
  if v_pomer is null or v_pomer not in (0.5, 1, 2, 5) then raise exception 'Neplatný pomer dorovnania.' using errcode = '22023', detail = 'pomer'; end if;
  if coalesce((p->>'strop')::numeric, 0) <= 0 then raise exception 'Rozpočet musí byť kladný.' using errcode = '22023', detail = 'strop'; end if;
  if (p->>'stropDaru') is not null and (p->>'stropDaru')::numeric > 300 then raise exception 'Najviac 300 € k jednému daru.' using errcode = '22023', detail = 'strop_daru'; end if;
  select testovacia into v_test from public.stranka where id = v_stranka;
  insert into public.dorovnanie (id, entita, stranka, prijemca_ucet, ciel, ciel_nazov, firma_ucet, firma_nazov, firma_logo,
      pomer, strop, strop_daru, od, koniec, do_vycerpania, zvysok, len_zamestnanci, len_tvorca, tvorca_nazov, suhlas_tvorcu,
      kanal, uhrada, doklad, testovaci)
    values (v_id, coalesce(p->>'entita', v_stranka), v_stranka, v_prijemca, p->>'ciel', coalesce(nullif(p->>'cielNazov', ''), v_ciel_nazov),
      v_firma, coalesce((select nazov from public.firma_udaje where ucet_id = v_firma), p->>'firma', 'Firma'), p->>'firmaLogo',
      v_pomer, round((p->>'strop')::numeric, 2), round(nullif(p->>'stropDaru', '')::numeric, 2),
      coalesce(to_timestamp((p->>'od')::numeric / 1000), now()), to_timestamp((p->>'do')::numeric / 1000),
      coalesce((p->>'doVycerpania')::boolean, false), coalesce(p->>'zvysok', 'zbierke'), coalesce((p->>'lenZamestnanci')::boolean, false),
      nullif(p->>'lenTvorca', ''), nullif(p->>'tvorcaNazov', ''), case when nullif(p->>'lenTvorca', '') is not null then 'caka' end,
      coalesce(p->>'kanal', 'karta'), case when coalesce(p->>'kanal', 'karta') = 'sepa' then 'mimo' else 'deed' end, public.novy_doklad(), coalesce(v_test, false))
    returning * into d;
  -- 0186 · karta cez nás = platba overená: peniaze na viazaný účet a dorovnanie beží HNEĎ, charita dostane oznam
  --        SEPA mimo nás = čaká, kým charita potvrdí príjem (nič sa nefinancuje, žiadny automat)
  if d.uhrada = 'deed' then
    perform public.dorovnanie_financuj(d.id, d.strop, d.testovaci);
    update public.dorovnanie set stav = 'aktivne', zaplatene = now() where id = d.id;
    perform public.notifikuj_ucet(d.prijemca_ucet, 'Vašu zbierku začala dorovnávať firma ' || d.firma_nazov,
      d.ciel_nazov || ': ' || d.firma_nazov || ' dorovnáva dary, rozpočet ' || to_char(d.strop, 'FM999G999G990D00') || ' €. Beží od zapečatenia.', 'ciel');
  else
    perform public.notifikuj_ucet(d.prijemca_ucet, 'Potvrďte príjem platby — dorovnanie od firmy ' || d.firma_nazov,
      d.ciel_nazov || ': ' || d.firma_nazov || ' posiela ' || to_char(d.strop, 'FM999G999G990D00') || ' € prevodom (VS ' || d.doklad || '). Keď peniaze prídu, potvrďte to v správe stránky — až potom sa dorovnanie spustí.', 'ciel');
  end if;
  select * into d from public.dorovnanie where id = v_id;
  return public.dorovnanie_json(d);
end $$;

create or replace function public.dorovnanie_krok(p_id text, p_akcia text, p_param jsonb default '{}'::jsonb) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare d public.dorovnanie; v_zost numeric; v_kam text; v_vs text; v_charita boolean; v_firma boolean;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  perform public.dorovnania_obnov();
  select * into d from public.dorovnanie where id = p_id for update;
  if not found then raise exception 'Dorovnanie neexistuje.' using errcode = 'P0002'; end if;
  v_charita := public.konam_za_stranku(d.stranka);
  v_firma := public.konam_za_firmu(d.firma_ucet);
  v_zost := public.dorovnanie_zostatok(d.id);

  if p_akcia in ('potvrd_platbu', 'spusti', 'odmietni', 'neprisli', 'pozastav', 'vysporiadaj', 'ukonci', 'ukonci_dorovnanie', 'vrat_zvysok', 'upozorni_firmu', 'zmaz')
     and not v_charita then raise exception 'Tento krok robí charita.' using errcode = '42501', detail = 'nie_charita'; end if;
  if p_akcia in ('zrus', 'dolej_strop') and not v_firma then raise exception 'Tento krok robí firma.' using errcode = '42501', detail = 'nie_firma'; end if;

  if p_akcia = 'potvrd_platbu' then
    if d.stav <> 'zapecatene' then raise exception 'Nie je čo potvrdiť.' using errcode = '22023'; end if;
    if not d.financovane then perform public.dorovnanie_financuj(d.id, d.strop, d.testovaci); end if;
    -- 0186: potvrdenie príjmu = dorovnanie beží (bez medzikroku „spustiť“)
    update public.dorovnanie set stav = 'aktivne', zaplatene = now() where id = d.id;
  elsif p_akcia = 'spusti' then
    if d.stav <> 'potvrdene' then raise exception 'Dorovnanie nie je potvrdené.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'aktivne' where id = d.id;
  elsif p_akcia = 'odmietni' then
    if coalesce(trim(p_param->>'dovod'), '') = '' then raise exception 'Napíšte dôvod.' using errcode = '22023'; end if;
    if now() - d.oznamene >= interval '24 hours' then raise exception 'Odmietnuť sa dá len do 24 hodín od oznámenia platby.' using errcode = '22023', detail = 'po_24h'; end if;
    update public.dorovnanie set stav = 'pozastavene', pozastavene = now(),
      odmietnutie = jsonb_build_object('dovod', trim(p_param->>'dovod'), 'kedy', now()),
      vratenie = jsonb_build_object('suma', d.strop, 'do', now() + interval '7 days', 'vs', public.novy_doklad())
     where id = d.id;
  elsif p_akcia = 'neprisli' then
    if now() - d.oznamene < interval '24 hours' then raise exception 'Neprišli sa dá nahlásiť až po 24 hodinách.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'odmietnute', neprisli = now(), ukoncene = now() where id = d.id;
  elsif p_akcia = 'zrus' then
    if d.stav <> 'zapecatene' or d.financovane then raise exception 'Zaplatené dorovnanie sa nedá zrušiť — zvyšok vráti charita.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'zrusene', ukoncene = now() where id = d.id;
  elsif p_akcia = 'dolej_strop' then
    if coalesce((p_param->>'suma')::numeric, 0) <= 0 then raise exception 'Suma musí byť kladná.' using errcode = '22023'; end if;
    if d.stav not in ('aktivne', 'zapecatene', 'vycerpane') then raise exception 'Doliať sa dá len do bežiaceho dorovnania.' using errcode = '22023'; end if;
    update public.dorovnanie set strop = strop + round((p_param->>'suma')::numeric, 2),
      stav = case when d.stav = 'vycerpane' then 'aktivne' else d.stav end,
      ukoncene = case when d.stav = 'vycerpane' then null else d.ukoncene end
     where id = d.id;
    if d.financovane then perform public.dorovnanie_financuj(d.id, round((p_param->>'suma')::numeric, 2), d.testovaci); end if;
  elsif p_akcia = 'pozastav' then
    update public.dorovnanie set stav = 'pozastavene', pozastavene = now() where id = d.id;
  elsif p_akcia = 'vysporiadaj' then
    if d.stav <> 'pozastavene' or d.vysporiadane is not null then raise exception 'Nie je čo vysporiadať.' using errcode = '22023'; end if;
    v_kam := case when coalesce((p_param->>'predcasne')::boolean, true) then 'firme' else d.zvysok end;
    perform public.dorovnanie_presun(d.id, v_zost, v_kam = 'firme');
    update public.dorovnanie set vysporiadane = jsonb_build_object('suma', v_zost, 'kam', v_kam, 'kedy', now(), 'referencia', p_param->>'referencia') where id = d.id;
  elsif p_akcia = 'ukonci' then
    if d.stav <> 'pozastavene' or d.vysporiadane is null then raise exception 'Najprv treba vysporiadať zvyšok.' using errcode = '22023'; end if;
    update public.dorovnanie set stav = 'ukoncene', ukoncene = now() where id = d.id;
  elsif p_akcia = 'ukonci_dorovnanie' then
    if v_zost <= 0 then
      update public.dorovnanie set stav = 'ukoncene', ukoncene = now() where id = d.id;
    else
      update public.dorovnanie set stav = 'pozastavene', pozastavene = now(),
        vratenie = jsonb_build_object('suma', v_zost, 'do', now() + interval '7 days', 'vs', public.novy_doklad()) where id = d.id;
    end if;
  elsif p_akcia = 'vrat_zvysok' then
    if d.vratenie is null or (d.vratenie->>'kedy') is not null then raise exception 'Nie je čo vrátiť.' using errcode = '22023'; end if;
    if p_param->>'cez' = 'mimo' and coalesce(p_param->>'doklad', '') = '' then raise exception 'Priložte doklad o úhrade.' using errcode = '22023'; end if;
    v_vs := d.vratenie->>'vs';
    perform public.dorovnanie_presun(d.id, (d.vratenie->>'suma')::numeric, true, v_vs);
    update public.dorovnanie set
      vratenie = d.vratenie || jsonb_build_object('cez', coalesce(p_param->>'cez', 'deed'), 'doklad', p_param->>'doklad', 'kedy', now()),
      vysporiadane = jsonb_build_object('suma', (d.vratenie->>'suma')::numeric, 'kam', 'firme', 'kedy', now(), 'referencia', v_vs),
      stav = case when d.odmietnutie is not null then 'odmietnute' else 'ukoncene' end, ukoncene = now()
     where id = d.id;
  elsif p_akcia = 'upozorni_firmu' then
    update public.dorovnanie set upozornena_firma = now() where id = d.id;
  elsif p_akcia in ('prijmi_tvorcom', 'odmietni_tvorcom') then
    if d.len_tvorca is null then raise exception 'Nie je tvorcovské dorovnanie.' using errcode = '22023'; end if;
    if p_akcia = 'prijmi_tvorcom' then update public.dorovnanie set suhlas_tvorcu = 'prijate' where id = d.id;
    else update public.dorovnanie set suhlas_tvorcu = 'odmietnute', stav = 'odmietnute', ukoncene = now() where id = d.id; end if;
  elsif p_akcia = 'zmaz' then
    if not (d.stav in ('ukoncene', 'odmietnute', 'zrusene') or (d.stav = 'vycerpane' and d.ukoncene is not null)) then
      raise exception 'Bežiace dorovnanie drží peniaze — zmazať sa nedá.' using errcode = '22023';
    end if;
    update public.dorovnanie set skryte = now() where id = d.id;
  else
    raise exception 'neznama_akcia' using errcode = '22023';
  end if;
  select * into d from public.dorovnanie where id = p_id;
  return public.dorovnanie_json(d);
end $$;

commit;
