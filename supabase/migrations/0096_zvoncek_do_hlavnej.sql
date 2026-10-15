-- ============================================================
-- 0096 · OPRAVY 294 (Martin 15. 10.) — zvončeková omša po skončení patrí do Hlavnej zbierky na serveri
-- ------------------------------------------------------------
-- Chyba: riadok „Ranná omša 6:00 · Pán Boh zaplať · 138 €“ pridávala do Hlavnej len karta na Nástenke (appka),
-- detail Hlavnej zbierky a Správa čítajú server → dve rôzne čísla (233 € vs 95 €).
-- Oprava (peniaze tečú len raz — prelev okna do Hlavnej je agregácia, nie nový pohyb, pravidlo ledgera):
--  · skončená omša (už beží neskoršia omša toho kostola, alebo ju zavreli) sa v Hlavnej zbierke stránky
--    počíta ako JEDEN dar: v_zbierka_vyzbierane (suma Hlavnej) a zbierka_dary (riadok s omsa = true).
--    Jeden zdroj pre detail, Správu aj všetky vzhľady stránky.
--  · zvoncek_okno preskočí omšu, ktorú zavreli; zvoncek_zavri_test (Testovanie: „Zavrieť omšu (test)“) zavrie
--    bežiacu omšu na serveri — vidno to na každom zariadení, aj po obnovení stránky.
-- Mení len čítanie (pohľad a funkcie), pohyby ostávajú.
-- ============================================================
begin;

-- ---------- 1 · okno podľa kalendára (telo 0091) a okno bez zavretých omší ----------
create or replace function public.zvoncek_okno_kal(p_stranka text, p_kostol text default '0', p_cas timestamptz default now())
  returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_k jsonb; v_dnes date := (p_cas at time zone 'Europe/Bratislava')::date; v_t bigint := extract(epoch from p_cas)::bigint;
  v_l record; v_ma boolean := false; a_zac bigint; a_den date; a_cas text; a_naz text; v_do bigint;
begin
  select data->'kostoly'->coalesce(nullif(p_kostol, ''), '0') into v_k from public.naboz_stav where oblast = 'kalendar' and id = p_stranka;
  if v_k is null then return null; end if;
  -- omše ±8 dní podľa začiatku; aktuálna = posledná, ktorej okamih prepnutia z predchádzajúcej už nastal
  for v_l in
    select extract(epoch from ((d.den + make_interval(mins => o.m)) at time zone 'Europe/Bratislava'))::bigint as zac,
           d.den, o.cas, o.nazov
      from (select (v_dnes + g)::date as den from generate_series(-8, 8) g) d
      cross join lateral public.zvoncek_omse_dna(v_k, d.den) o
     order by 1
  loop
    if v_ma and v_t < public.zvoncek_prepni(a_zac, v_l.zac) then v_do := public.zvoncek_prepni(a_zac, v_l.zac); exit; end if;
    v_ma := true; a_zac := v_l.zac; a_den := v_l.den; a_cas := v_l.cas; a_naz := v_l.nazov;
  end loop;
  if not v_ma then return null; end if;
  return jsonb_build_object(
    'ref', p_stranka || '-zv-' || coalesce(nullif(p_kostol, ''), '0') || '-' || to_char(a_den, 'YYYY-MM-DD') || '-' || replace(lpad(a_cas, 5, '0'), ':', ''),
    'kostol', coalesce(nullif(p_kostol, ''), '0'),
    'den', to_char(a_den, 'YYYY-MM-DD'), 'cas', a_cas, 'nazov', a_naz,
    'zaciatok', to_timestamp(a_zac),
    'do', case when v_do is not null then to_timestamp(v_do) end);
end $$;
revoke all on function public.zvoncek_okno_kal(text, text, timestamptz) from public, anon, authenticated;


create or replace function public.zvoncek_okno(p_stranka text, p_kostol text default '0', p_cas timestamptz default now())
  returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare v_o jsonb; v_t timestamptz := p_cas; i int := 0;
begin
  loop
    v_o := public.zvoncek_okno_kal(p_stranka, p_kostol, v_t);
    -- omšu zavreli (Testovanie alebo farár) → ďalšia omša
    exit when v_o is null or v_o->>'do' is null or i >= 30
      or not exists (select 1 from public.zbierka where id = p_stranka || ':' || (v_o->>'ref') and stav <> 'aktivna');
    v_t := (v_o->>'do')::timestamptz; i := i + 1;
  end loop;
  return v_o;
end $$;
revoke all on function public.zvoncek_okno(text, text, timestamptz) from public;
grant execute on function public.zvoncek_okno(text, text, timestamptz) to anon, authenticated, service_role;

-- ---------- 2 · skončená omša ----------
-- id zbierky omše: „<stránka>:<stránka>-zv-<kostol>-RRRR-MM-DD-HHMM“; skončená = zavretá, alebo už beží neskoršia omša
create or replace function public.zvoncek_uzavreta(p_id text) returns boolean
  language plpgsql stable security definer set search_path = public as $$
declare v_s text := split_part(p_id, ':', 1); v_ref text := substr(p_id, length(split_part(p_id, ':', 1)) + 2);
  m text[]; v_o jsonb;
begin
  m := regexp_match(v_ref, '^(.+)-zv-([^-]+)-(\d{4}-\d{2}-\d{2})-(\d{4})$');
  if m is null or m[1] <> v_s then return false; end if;
  if exists (select 1 from public.zbierka where id = p_id and stav <> 'aktivna') then return true; end if;
  v_o := public.zvoncek_okno(v_s, m[2], now());
  return v_o is null or (v_o->>'ref') > v_ref;
end $$;
revoke all on function public.zvoncek_uzavreta(text) from public;
grant execute on function public.zvoncek_uzavreta(text) to anon, authenticated, service_role;  -- volá ho pohľad v_zbierka_vyzbierane

-- ---------- 3 · suma Hlavnej zbierky obsahuje skončené omše (jedna omša = jeden dar) ----------
create or replace view public.v_zbierka_vyzbierane with (security_invoker = false) as
  with zc as materialized (   -- skončené omše (každá sa vyhodnotí raz)
    select z.id, z.stranka from public.zbierka z
     where z.stranka is not null and z.id like z.stranka || ':' || z.stranka || '-zv-%' and public.zvoncek_uzavreta(z.id)
  )
  select x.zbierka, x.mena, sum(x.vyzbierane) as vyzbierane, sum(x.darov)::bigint as darov
    from (
      select pl.zbierka, po.mena,
             sum(case when po.storno_pre is null then po.suma else -po.suma end) as vyzbierane,
             count(distinct pl.id) filter (where po.storno_pre is null) as darov
        from public.pohyb po join public.platba pl on pl.id = po.platba_id
       where pl.zbierka is not null and po.typ in ('dar', 'sluzba', 'vratenie')
         and po.ucet_kredit <> public.ucet_systemu('platforma')
         and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
       group by pl.zbierka, po.mena
      union all
      select zc.stranka || ':hlavna', po.mena,
             sum(case when po.storno_pre is null then po.suma else -po.suma end),
             count(distinct zc.id)
        from public.pohyb po join public.platba pl on pl.id = po.platba_id join zc on zc.id = pl.zbierka
       where po.typ in ('dar', 'sluzba', 'vratenie') and po.ucet_kredit <> public.ucet_systemu('platforma')
       group by zc.stranka, po.mena
    ) x
   where public.zbierka_suma_vidim(x.zbierka)
   group by x.zbierka, x.mena;
grant select on public.v_zbierka_vyzbierane to anon, authenticated;

-- ---------- 4 · dary Hlavnej zbierky: skončená omša = jeden riadok (omsa = true, meno = „Ranná omša 6:00“) ----------
create or replace function public.zbierka_dary(p_zbierka text, p_limit int default 200) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare v jsonb; v_s text := case when p_zbierka like '%:hlavna' then split_part(p_zbierka, ':', 1) end;
begin
  v := (
    with zc as materialized (
      select z.id, z.nazov, z.koniec from public.zbierka z
       where v_s is not null and z.stranka = v_s and z.id like v_s || ':' || v_s || '-zv-%' and public.zvoncek_uzavreta(z.id)
    ), d as (
      select pl.id::text as id, pl.vytvorene as cas, pl.mena, pl.kanal, pl.odosielatel_text as meno,
             pl.odosielatel is not null as registrovany,
             coalesce(pl.odosielatel = public.moj_ucet(), false) as moj, false as omsa,
             sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma
        from public.platba pl join public.pohyb po on po.platba_id = pl.id
       where pl.zbierka = p_zbierka and po.typ in ('dar', 'sluzba', 'vratenie')
         and po.ucet_kredit <> public.ucet_systemu('platforma')
         and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
       group by pl.id
      having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
      union all
      select zc.id || ':' || po.mena, coalesce(zc.koniec, max(pl.vytvorene)), po.mena, 'omsa', zc.nazov, false, false, true,
             sum(case when po.storno_pre is null then po.suma else -po.suma end)
        from zc join public.platba pl on pl.zbierka = zc.id join public.pohyb po on po.platba_id = pl.id
       where po.typ in ('dar', 'sluzba', 'vratenie') and po.ucet_kredit <> public.ucet_systemu('platforma')
       group by zc.id, zc.koniec, zc.nazov, po.mena
      having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
    )
    select jsonb_build_object(
      'sucty', coalesce((select jsonb_object_agg(mena, s) from (select mena, sum(suma) as s from d group by mena) x), '{}'::jsonb),
      'pocet', (select count(*) from d),
      'dary', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'cas', cas, 'mena', mena, 'kanal', kanal, 'meno', meno,
                          'registrovany', registrovany, 'moj', moj, 'suma', suma, 'omsa', omsa) order by cas desc)
                        from (select * from d order by cas desc limit greatest(coalesce(p_limit, 200), 1)) y), '[]'::jsonb))
  );
  if public.zbierka_suma_vidim(p_zbierka) then return v; end if;
  return jsonb_build_object('pocet', v->'pocet', 'sucty', '{}'::jsonb, 'dary', '[]'::jsonb, 'skryte', true);
end $$;
revoke all on function public.zbierka_dary(text, int) from public;
grant execute on function public.zbierka_dary(text, int) to anon, authenticated, service_role;

-- ---------- 5 · Testovanie: „Zavrieť omšu (test)“ — bežiaca omša sa zavrie na serveri ----------
create or replace function public.zvoncek_zavri_test(p_stranka text, p_kostol text default '0') returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_o jsonb; v_id text; v_s public.stranka;
begin
  if not coalesce((select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna'), false) then
    raise exception 'Testovanie je vypnuté.' using errcode = '42501', detail = 'test_vypnuty';
  end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'Túto stránku nespravujete.' using errcode = '42501', detail = 'nie_spravca'; end if;
  v_o := public.zvoncek_okno(p_stranka, p_kostol, now());
  if v_o is null or v_o->>'do' is null then raise exception 'Ďalšia omša nie je v kalendári.' using errcode = '22023', detail = 'bez_omsi'; end if;
  v_id := p_stranka || ':' || (v_o->>'ref');
  select * into v_s from public.stranka where id = p_stranka;
  insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id)
    values (v_id, (v_o->>'nazov') || ' ' || (v_o->>'cas'), 'nabozenstvo', 'sektor', 'ukoncena', p_stranka, v_s.ucet_id)
    on conflict (id) do update set stav = 'ukoncena' where public.zbierka.stav = 'aktivna';
  return public.zvoncek_okno(p_stranka, p_kostol, now());
end $$;
revoke all on function public.zvoncek_zavri_test(text, text) from public, anon;
grant execute on function public.zvoncek_zavri_test(text, text) to authenticated, service_role;

commit;
