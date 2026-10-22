-- ============================================================
-- 0157 · Reťaz na pohybe + testovací príznak zo servera + výmaz testovacích peňazí (Martin 22. 10.)
-- ------------------------------------------------------------
-- 1) Reťaz priamo na pohybe: pohyb.retaz, retaz_pct (% pre zbierku v momente daru), retaz_cast ('zbierka' | 'tvorca').
--    Zapíše sa pri vložení (pohyb je nemenný) zo session premenných, ktoré nastaví retaz_dar → súčasť nemenného dokladu.
--    Podiely počíta platba_zapis: z čistej sumy, orezané na presnosť meny, zvyšková stotina ide prvému podielu (zbierke).
--    retaz_dar po zápise overí: súčet reťazových pohybov = čistá suma platby na cent, inak dar neprejde.
--    retaz_pct 0 = žiadna zbierka v rade, celý dar tvorcovi.
-- 2) Testovací príznak píše server: kým je testovacia pokladňa zapnutá, je testovací KAŽDÝ pohyb, platba a vecný dar,
--    bez ohľadu na appku. Upozornenia (notifikacia) vzniknuté v tej istej transakcii ako testovacia platba / vecný dar
--    dostanú príznak tiež. Reakcie a prihlásenia nie. Príznak sa nikdy neodoberá.
-- 3) zmaz_testovacie(kod): 1. spustenie = len počty a kód potvrdenia, nič nezmaže. 2. spustenie s kódom = výmaz.
--    Doklad sa nedelí (všetky jeho pohyby aj storná). Poistka: keby po výmaze ostal niekto v mínuse, nezmaže nič.
--    Volá len postgres (Samuel v SQL editore). Ochrana nemenného ledgera sa vypne len na výmaz a hneď zapne (ako 0135).
-- Existujúce pohyby bez príznaku (napr. dary zo štartovacieho kreditu pred 0157) sa NEDOPĹŇAJÚ — pohyb je nemenný.
-- ============================================================
begin;

-- ---------- 1) reťaz na pohybe ----------
alter table public.pohyb add column if not exists retaz text references public.retaz(id);
alter table public.pohyb add column if not exists retaz_pct smallint;
alter table public.pohyb add column if not exists retaz_cast text;
alter table public.pohyb drop constraint if exists pohyb_retaz_konzistentne;
alter table public.pohyb add constraint pohyb_retaz_konzistentne check (
  (retaz is null and retaz_pct is null and retaz_cast is null)
  or (retaz is not null and retaz_pct between 0 and 100 and retaz_pct % 5 = 0
      and retaz_cast in ('zbierka', 'tvorca')
      and (retaz_cast <> 'zbierka' or retaz_pct > 0)
      and (retaz_cast <> 'tvorca' or retaz_pct < 100)));
create index if not exists pohyb_retaz_idx on public.pohyb (retaz) where retaz is not null;

create or replace function public.pohyb_retaz() returns trigger language plpgsql as $$
declare v_r text := nullif(current_setting('deed.retaz', true), '');
begin
  if v_r is null then return new; end if;
  -- len podiely daru (poradie 1, 2 …), nie príchod peňazí, marža ani tip platforme
  if new.typ = 'dar' and new.poradie >= 1 and new.ucet_kredit <> public.ucet_systemu('platforma') then
    new.retaz := v_r;
    new.retaz_pct := current_setting('deed.retaz_pct', true)::smallint;
    new.retaz_cast := case when current_setting('deed.retaz_zb', true) = '1' and new.poradie = 1 then 'zbierka' else 'tvorca' end;
  end if;
  return new;
end $$;
drop trigger if exists pohyb_retaz on public.pohyb;
create trigger pohyb_retaz before insert on public.pohyb for each row execute function public.pohyb_retaz();

-- ---------- 2) testovací príznak zo servera ----------
create or replace function public.je_testovaci() returns boolean language sql stable as $$
  select coalesce(current_setting('deed.testovaci', true), '') = '1'
      or coalesce((select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna'), false)
$$;

-- pohyb (trigger pohyb_testovaci z 0084 ostáva, mení sa telo), platba, vecny_dar
create or replace function public.pohyb_testovaci() returns trigger language plpgsql as $$
begin
  if public.je_testovaci() then
    new.testovaci := true;
    perform set_config('deed.test_tx', '1', true);   -- upozornenia z tejto transakcie sú testovacie
  end if;
  return new;
end $$;

alter table public.platba add column if not exists testovaci boolean not null default false;
alter table public.vecny_dar add column if not exists testovaci boolean not null default false;
alter table public.notifikacia add column if not exists testovaci boolean not null default false;

drop trigger if exists platba_testovaci on public.platba;
create trigger platba_testovaci before insert on public.platba for each row execute function public.pohyb_testovaci();
drop trigger if exists vecny_dar_testovaci on public.vecny_dar;
create trigger vecny_dar_testovaci before insert on public.vecny_dar for each row execute function public.pohyb_testovaci();

create or replace function public.notifikacia_testovacia() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('deed.test_tx', true), '') = '1' then new.testovaci := true; end if;
  return new;
end $$;
drop trigger if exists notifikacia_testovacia on public.notifikacia;
create trigger notifikacia_testovacia before insert on public.notifikacia for each row execute function public.notifikacia_testovacia();

-- platby, ktoré už testovacie sú (meta alebo testovacie pohyby) — nový stĺpec, nie zmena ledgera
update public.platba pl set testovaci = true
 where not pl.testovaci
   and ((pl.meta->>'testovaci') = 'true' or exists (select 1 from public.pohyb po where po.platba_id = pl.id and po.testovaci));

-- ---------- 1b) retaz_dar: reťaz na pohyboch + kontrola súčtu na cent ----------
create or replace function public.retaz_dar(p_retaz text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null, p_test boolean default false) returns jsonb
  language plpgsql security definer set search_path = public, extensions as $$
declare
  -- testovací dar (Testovanie: „Simulovať dar 10 € na QR reťaze“) prichádza od iného, neregistrovaného darcu
  v_ja uuid := case when p_test then null else public.moj_ucet() end; v_r public.retaz; v_b public.retaz_polozka; v_z public.zbierka; v_split jsonb;
  v_pl public.platba; v_meno text := nullif(left(trim(coalesce(p_meno_darcu, '')), 80), ''); v_ex public.retaz_platba;
  v_n int; v_sucet numeric;
begin
  if v_ja is null and p_kanal not in ('fiat', 'sepa') then
    raise exception 'neprihlaseny' using errcode = '28000';
  end if;
  select * into v_r from public.retaz where id = p_retaz;
  if not found then raise exception 'Reťaz neexistuje.' using errcode = 'P0002', detail = 'retaz_neexistuje'; end if;
  if v_r.ukoncena is not null then raise exception 'Táto reťaz už skončila.' using errcode = '22023', detail = 'retaz_ukoncena'; end if;

  -- rovnaký kľúč = tá istá platba (ďalšie kolo nič nezapíše ani neposunie)
  select rp.* into v_ex from public.retaz_platba rp join public.platba pl on pl.id = rp.platba_id
   where rp.retaz = p_retaz and pl.idem_kluc = p_idem and pl.idem_scope = coalesce(v_ja, '00000000-0000-0000-0000-000000000000');
  if found then
    return jsonb_build_object('platba_id', v_ex.platba_id, 'zbierka', v_ex.zbierka, 'pct', v_ex.pct, 'retaz', public.retaz_stav(p_retaz));
  end if;

  if p_test then
    if not coalesce((select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna'), false) then
      raise exception 'Testovacia platba je vypnutá.' using errcode = '42501', detail = 'test_vypnuty';
    end if;
    perform set_config('deed.testovaci', '1', true);
  end if;

  perform public.retaz_posun(p_retaz, true);
  select * into v_b from public.retaz_polozka where retaz = p_retaz and stav = 'bezi';
  if found then
    select * into v_z from public.zbierka where id = v_b.zbierka;
    v_split := jsonb_build_array(jsonb_build_object('prijemca_ucet', v_b.ucet, 'prijemca_text', v_z.nazov,
      'podiel', v_b.pct / 100.0, 'fixny', false, 'typ', 'dar'));
    if v_b.pct < 100 then
      v_split := v_split || jsonb_build_array(jsonb_build_object('prijemca_ucet', v_r.ucet_id, 'prijemca_text', v_r.meno,
        'podiel', 1 - v_b.pct / 100.0, 'fixny', false, 'typ', 'dar'));
    end if;
  else
    v_split := jsonb_build_array(jsonb_build_object('prijemca_ucet', v_r.ucet_id, 'prijemca_text', v_r.meno,
      'podiel', 1, 'fixny', false, 'typ', 'dar'));
  end if;

  -- 0157: reťaz, % a časť sa zapíšu na pohyby daru pri vložení (súčasť nemenného dokladu)
  perform set_config('deed.retaz', p_retaz, true);
  perform set_config('deed.retaz_pct', coalesce(v_b.pct, 0)::text, true);
  perform set_config('deed.retaz_zb', case when v_b.zbierka is not null then '1' else '0' end, true);
  v_pl := public.platba_zapis(p_idem, p_suma, p_mena, p_kanal, null, v_ja, v_meno, null, coalesce(v_z.nazov, v_r.meno),
    false, 0, jsonb_build_object('retaz', p_retaz, 'zbierka', v_b.zbierka, 'pct', coalesce(v_b.pct, 0)) ||
      case when p_test then jsonb_build_object('testovaci', true) else '{}'::jsonb end, v_split);
  perform set_config('deed.retaz', '', true);
  perform set_config('deed.retaz_pct', '', true);
  perform set_config('deed.retaz_zb', '', true);
  perform set_config('deed.testovaci', '0', true);

  -- súčet častí = čistá suma daru na cent (ak už pohyby vznikli)
  select count(*), coalesce(sum(suma), 0) into v_n, v_sucet from public.pohyb where platba_id = v_pl.id and retaz is not null;
  if v_n > 0 and v_sucet <> v_pl.cista_suma then
    raise exception 'Reťaz: súčet častí % ≠ čistá suma daru %.', v_sucet, v_pl.cista_suma using errcode = '23514', detail = 'retaz_sucet';
  end if;

  update public.platba
     set zbierka = coalesce(zbierka, v_b.zbierka),
         odosielatel_text = case when p_test or (v_ja is not null and odosielatel = v_ja) then v_meno else null end,
         zobrazenie = case when (p_test or (v_ja is not null and odosielatel = v_ja)) and v_meno is not null then 1 else 4 end
   where id = v_pl.id;
  insert into public.retaz_platba (platba_id, retaz, zbierka, tvorca, pct)
    values (v_pl.id, p_retaz, v_b.zbierka, v_r.ucet_id, coalesce(v_b.pct, 0)) on conflict (platba_id) do nothing;

  -- dar mohol zbierku naplniť → rad sa posunie hneď
  return jsonb_build_object('platba_id', v_pl.id, 'zbierka', v_b.zbierka, 'pct', coalesce(v_b.pct, 0), 'stav', v_pl.stav,
    'testovaci', p_test, 'retaz', public.retaz_posun(p_retaz, true));
end $$;

-- ---------- 3) výmaz testovacích peňazí (dvojkrokovo) ----------
create or replace function public.zmaz_testovacie(p_kod text default null) returns text
  language plpgsql security definer set search_path = public as $$
declare v_po int; v_pl int; v_eur numeric; v_dor int; v_dz int; v_vd int; v_no int; v_rp int; v_zv int; v_pp int; v_ps int;
  v_esc int; v_cudzie int; v_minus int; v_prehlad text; v_kod text;
begin
  if to_regclass('pg_temp._po') is not null then drop table _po, _pl, _dor, _esc; end if;
  -- pohyby: testovacie + celé ich doklady + storná
  create temporary table _po on commit drop as
    select id from public.pohyb where doklad in (select distinct doklad from public.pohyb where testovaci);
  create temporary table _pl on commit drop as
    select id from public.platba where testovaci
    union select distinct platba_id from public.pohyb where id in (select id from _po) and platba_id is not null;
  insert into _po select po.id from public.pohyb po
   where po.doklad in (select distinct doklad from public.pohyb where platba_id in (select id from _pl))
     and po.id not in (select id from _po);
  insert into _po select s.id from public.pohyb s where s.storno_pre in (select id from _po) and s.id not in (select id from _po);
  create temporary table _dor on commit drop as select id from public.dorovnanie where testovaci;
  create temporary table _esc on commit drop as
    select escrow_id id from public.dorovnanie where id in (select id from _dor) and escrow_id is not null
    union select distinct escrow_id from public.pohyb where id in (select id from _po) and escrow_id is not null;

  select count(*) into v_po from _po;
  select count(*), coalesce(sum(suma) filter (where mena = 'EUR'), 0) into v_pl, v_eur from public.platba where id in (select id from _pl);
  select count(*) into v_dor from _dor;
  select count(*) into v_dz from public.dorovnanie_zaznam where pohyb_id in (select id from _po) or dorovnanie_id in (select id from _dor);
  select count(*) into v_vd from public.vecny_dar where testovaci;
  select count(*) into v_no from public.notifikacia where testovaci;
  select count(*) into v_rp from public.retaz_platba where platba_id in (select id from _pl);
  select count(*) into v_zv from public.zbierka_vklad where platba_id in (select id from _pl);
  select count(*) into v_pp from public.podpora where platba_id in (select id from _pl);
  select count(*) into v_ps from public.platba_split where platba_id in (select id from _pl);
  select count(*) into v_esc from _esc;
  -- pohyby bez príznaku, ktoré idú preč len preto, že sú v tom istom doklade
  select count(*) into v_cudzie from public.pohyb where id in (select id from _po) and not testovaci;
  -- poistka: po výmaze nikto (okrem systémových účtov) v mínuse
  select count(*) into v_minus from (
    select u, mena, sum(s) z from (
      select ucet_kredit u, mena, suma s from public.pohyb where id not in (select id from _po)
      union all select ucet_debet, mena, -suma from public.pohyb where id not in (select id from _po)) x
    join public.ucet uc on uc.id = x.u and uc.typ <> 'system'
    group by u, mena having sum(s) < 0) m;

  v_prehlad := format('pohyby %s (z toho bez príznaku v tom istom doklade %s) · platby %s (%s €) · reťaz %s · vklady %s · podpora %s · rozdelenia %s · dorovnania %s, záznamy %s, escrow %s · vecné dary %s · upozornenia %s · v mínuse po výmaze %s',
    v_po, v_cudzie, v_pl, v_eur, v_rp, v_zv, v_pp, v_ps, v_dor, v_dz, v_esc, v_vd, v_no, v_minus);
  v_kod := upper(left(md5(v_prehlad), 6));

  if v_minus > 0 then
    return '0157: NEZMAZANÉ — po výmaze by ' || v_minus || ' účtov skončilo v mínuse, napíš Martinovi · ' || v_prehlad;
  end if;
  if p_kod is distinct from v_kod then
    return '0157 PREHĽAD (nič nezmazané): ' || v_prehlad || ' · zmazať: select public.zmaz_testovacie(''' || v_kod || ''');';
  end if;

  alter table public.dorovnanie_zaznam disable trigger dorovnanie_zaznam_nemenny;
  delete from public.dorovnanie_zaznam where pohyb_id in (select id from _po) or dorovnanie_id in (select id from _dor);
  alter table public.dorovnanie_zaznam enable trigger dorovnanie_zaznam_nemenny;
  alter table public.pohyb disable trigger pohyb_nemenny;
  delete from public.pohyb where storno_pre in (select id from _po);
  delete from public.pohyb where id in (select id from _po);
  alter table public.pohyb enable trigger pohyb_nemenny;

  delete from public.retaz_platba where platba_id in (select id from _pl);
  delete from public.zbierka_vklad where platba_id in (select id from _pl);
  delete from public.podpora where platba_id in (select id from _pl);
  delete from public.platba_split where platba_id in (select id from _pl);
  update public.platba set parent_id = null where parent_id in (select id from _pl);
  delete from public.platba where id in (select id from _pl);

  alter table public.dorovnanie disable trigger dorovnanie_pecat;
  delete from public.dorovnanie where id in (select id from _dor);
  alter table public.dorovnanie enable trigger dorovnanie_pecat;
  delete from public.escrow e where e.id in (select id from _esc)
     and not exists (select 1 from public.pohyb where escrow_id = e.id)
     and not exists (select 1 from public.dorovnanie where escrow_id = e.id);

  delete from public.vecny_dar where testovaci;
  delete from public.notifikacia where testovaci;

  drop table _po, _pl, _dor, _esc;
  return '0157 ZMAZANÉ: ' || v_prehlad;
end $$;
revoke all on function public.zmaz_testovacie(text) from public, anon, authenticated;

commit;
