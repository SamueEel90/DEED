-- ============================================================
-- 0094 · Balík 8 C — Reťaz dobra: stránky, darcovia cez QR, oznámenia organizátorom, Testovanie
-- ------------------------------------------------------------
-- Nadväzuje na 0093 (tá sa nemení). Mení:
--  · oznámenia organizátorom ako v prototype (krok 4): „Nová reťaz dobra“ · „… Ste N. v rade.“ a „Ste na rade“;
--    každé oznámenie má kópiu v retaz_oznam (Testovanie: „Ukázať oznámenia organizátorov“ ich ukáže tvorcovi).
--  · retaz_dar s p_test: testovací dar prichádza od iného, neregistrovaného darcu (tvorca si ho môže poslať sám),
--    meno darcu ostane (napr. „Testovací darca“). Ostrý dar bez zmeny.
--  · retaz_stav: položka nesie aj organizátora (org, org_stranka) a vyzbierané zbierky (stránka tvorcu).
-- Nové:
--  · retaz_podporuju(zbierka) — stránka zbierky: kto ju podporuje reťazou a koľko už poslal.
--  · retaz_strany(stránka) — stránka tvorcu: posledná reťaz stránky (bez stránky moja), bežiaca má prednosť.
--  · retaz_darcovia(reťaz, zbierka) — darcovia cez QR tvorcu pri jednej zbierke (meno len keď ho darca dovolil).
--  · retaz_oznamy(reťaz) — oznámenia organizátorom, len tvorca.
--  · retaz_test(reťaz, 'naplnena' | 'uzavreli') — Testovanie, len tvorca a len so zapnutou testovacou pokladňou:
--    bežiaca zbierka sa naplnila / prvú čakajúcu uzavreli (preskočená), potom posun radu ako naostro.
-- ============================================================
begin;

-- oznámenia organizátorom (kópia notifikacia, aby ich tvorca videl v Testovaní)
create table if not exists public.retaz_oznam (
  id       bigint generated always as identity primary key,
  retaz    text not null references public.retaz(id),
  ucet     uuid not null references public.ucet(id),
  zbierka  text references public.zbierka(id),
  titul    text not null,
  text     text not null,
  cas      timestamptz not null default now()
);
create index if not exists retaz_oznam_retaz_idx on public.retaz_oznam (retaz);
alter table public.retaz_oznam enable row level security;
revoke all on table public.retaz_oznam from anon, authenticated;

create or replace function public.retaz_posli(p_retaz text, p_ucet uuid, p_zbierka text, p_titul text, p_text text) returns void
  language sql volatile security definer set search_path = public as $$
  insert into public.notifikacia (ucet_id, kat, titul, text) values (p_ucet, 'penazenka', p_titul, p_text);
  insert into public.retaz_oznam (retaz, ucet, zbierka, titul, text) values (p_retaz, p_ucet, p_zbierka, p_titul, p_text);
$$;
revoke all on function public.retaz_posli(text, uuid, text, text, text) from public, anon, authenticated;

-- smie reťaz spravovať (tvorca alebo správca stránky, ktorá ju robí)
create or replace function public.retaz_moja(p_retaz text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.retaz r where r.id = p_retaz
    and (r.ucet_id = public.moj_ucet() or (r.stranka is not null and public.spravujem_stranku(r.stranka))))
$$;
revoke all on function public.retaz_moja(text) from public, anon, authenticated;

create or replace function public.retaz_posun(p_retaz text, p_oznam boolean default true) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare p record; v_z public.zbierka; v_r public.retaz;
begin
  select * into v_r from public.retaz where id = p_retaz for update;
  if not found then raise exception 'Reťaz neexistuje.' using errcode = 'P0002', detail = 'retaz_neexistuje'; end if;
  if v_r.ukoncena is null then
    for p in select * from public.retaz_polozka where retaz = p_retaz and stav in ('bezi', 'caka') order by poradie loop
      select * into v_z from public.zbierka where id = p.zbierka;
      if v_z.stav <> 'aktivna' then
        update public.retaz_polozka set stav = case when p.stav = 'bezi' then 'skoncila' else 'preskocena' end, zmena = now()
         where retaz = p_retaz and poradie = p.poradie;
        continue;
      end if;
      if v_z.ciel is not null and v_z.ciel > 0 and public.retaz_vyzbierane(p.zbierka) >= v_z.ciel then
        update public.retaz_polozka set stav = 'naplnena', zmena = now() where retaz = p_retaz and poradie = p.poradie;
        continue;
      end if;
      if p.stav = 'caka' then
        update public.retaz_polozka set stav = 'bezi', zmena = now() where retaz = p_retaz and poradie = p.poradie;
        if p_oznam then
          perform public.retaz_posli(p_retaz, p.ucet, p.zbierka, 'Ste na rade',
            v_r.meno || ' teraz posiela ' || p.pct || ' % z každého daru na vašu zbierku ' || v_z.nazov || '.');
        end if;
      end if;
      exit;
    end loop;
  end if;
  return public.retaz_stav(p_retaz);
end $$;
revoke all on function public.retaz_posun(text, boolean) from public, anon, authenticated;

-- p_polozky: [{zbierka, pct, stranka?, nazov?}] v poradí radu (stranka a nazov pri zbierke stránky v module)
create or replace function public.retaz_zapecat(p_id text, p_polozky jsonb, p_stranka text default null, p_robi jsonb default null)
  returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare
  v_ja uuid := public.moj_ucet(); v_ucet uuid; v_meno text; v_r public.retaz; e jsonb; i int := 0;
  v_z public.zbierka; v_org uuid; v_pct int; v_s public.stranka;
begin
  if v_ja is null then raise exception 'Prihláste sa.' using errcode = '28000', detail = 'neprihlaseny'; end if;
  if p_stranka is not null then
    select * into v_s from public.stranka where id = p_stranka;
    if not found or not public.spravujem_stranku(p_stranka) then
      raise exception 'Túto stránku nespravujete.' using errcode = '42501', detail = 'nie_spravca';
    end if;
    v_ucet := v_s.ucet_id; v_meno := v_s.nazov;
  else
    v_ucet := v_ja;
    v_meno := (select nullif(trim(concat_ws(' ', meno, priezvisko)), '') from public.profil where ucet_id = v_ja);
  end if;
  v_meno := coalesce(v_meno, nullif(trim(p_robi->>'meno'), ''), 'Tvorca');

  -- rovnaké id = tá istá reťaz (opakované zapečatenie po výpadku siete)
  select * into v_r from public.retaz where id = p_id;
  if found then
    if v_r.ucet_id <> v_ucet then raise exception 'Reťaz patrí inému účtu.' using errcode = '42501', detail = 'cudzia_retaz'; end if;
    return public.retaz_stav(p_id);
  end if;

  if p_polozky is null or jsonb_typeof(p_polozky) <> 'array' or jsonb_array_length(p_polozky) = 0 then
    raise exception 'Reťaz potrebuje aspoň jednu zbierku.' using errcode = '22023', detail = 'retaz_prazdna';
  end if;
  if jsonb_array_length(p_polozky) > 20 then
    raise exception 'V reťazi je najviac 20 zbierok.' using errcode = '22023', detail = 'retaz_dlha';
  end if;

  -- stará bežiaca reťaz účtu sa ukončí (Vytvoriť novú reťaz)
  update public.retaz set ukoncena = now() where ucet_id = v_ucet and ukoncena is null;
  insert into public.retaz (id, ucet_id, stranka, meno, robi) values (p_id, v_ucet, p_stranka, v_meno, p_robi);

  for e in select * from jsonb_array_elements(p_polozky) loop
    i := i + 1;
    v_pct := (e->>'pct')::int;
    if v_pct is null or v_pct < 5 or v_pct > 100 or v_pct % 5 <> 0 then
      raise exception 'Percento je 5 až 100 po 5.' using errcode = '22023', detail = 'retaz_pct';
    end if;
    select * into v_z from public.zbierka where id = e->>'zbierka';
    -- zbierka stránky v module (hlavná / sektorová): riadok vznikne teraz, ako pri prvom dare (0077)
    if not found and coalesce(e->>'stranka', '') <> '' and (e->>'zbierka') like (e->>'stranka') || ':%' and (e->>'zbierka') not like '%-zv-%' then
      select * into v_s from public.stranka where id = e->>'stranka';
      if found then
        insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id)
          values (e->>'zbierka', coalesce(nullif(trim(e->>'nazov'), ''), 'Hlavná zbierka'),
                  case when v_s.typ = 'farnost' then 'nabozenstvo' else 'charity' end,
                  case when e->>'zbierka' = v_s.id || ':hlavna' then 'hlavna' else 'sektor' end, 'aktivna', v_s.id, v_s.ucet_id)
          on conflict (id) do nothing;
        select * into v_z from public.zbierka where id = e->>'zbierka';
      end if;
    end if;
    if v_z.id is null then
      raise exception 'Zbierka % nie je v DEED.', coalesce(e->>'zbierka', '?') using errcode = 'P0002', detail = 'zbierka_neexistuje';
    end if;
    if v_z.stav <> 'aktivna' or (v_z.zapecatena is null and coalesce(v_z.typ, '') not in ('hlavna', 'sektor')) or v_z.id like '%-zv-%'
       or exists (select 1 from public.zbierka_podiel where zbierka = v_z.id and druh = 'prijemca') then
      raise exception 'Zbierka % nie je verejná bežiaca zbierka.', v_z.nazov using errcode = '22023', detail = 'zbierka_nie_verejna';
    end if;
    v_org := coalesce((select ucet_id from public.stranka where id = v_z.stranka), v_z.ucet_id);
    if v_org is null then raise exception 'Zbierka % nemá organizátora.', v_z.nazov using errcode = '23502', detail = 'bez_organizatora'; end if;
    if v_org = v_ucet then
      raise exception 'Vlastnú zbierku do reťaze dať nejde.' using errcode = '22023', detail = 'vlastna_zbierka';
    end if;
    insert into public.retaz_polozka (retaz, poradie, zbierka, ucet, pct) values (p_id, i, v_z.id, v_org, v_pct);
    perform public.retaz_posli(p_id, v_org, v_z.id, 'Nová reťaz dobra',
      v_meno || ' posiela ' || v_pct || ' % z každého daru na vašu zbierku ' || v_z.nazov || '. Ste ' || i || '. v rade.');
  end loop;

  return public.retaz_posun(p_id, false);
end $$;
revoke all on function public.retaz_zapecat(text, jsonb, text, jsonb) from public, anon;
grant execute on function public.retaz_zapecat(text, jsonb, text, jsonb) to authenticated, service_role;

create or replace function public.retaz_dar(p_retaz text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null, p_test boolean default false)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  -- testovací dar (Testovanie: „Simulovať dar 10 € na QR reťaze“) prichádza od iného, neregistrovaného darcu
  v_ja uuid := case when p_test then null else public.moj_ucet() end; v_r public.retaz; v_b public.retaz_polozka; v_z public.zbierka; v_split jsonb;
  v_pl public.platba; v_meno text := nullif(left(trim(coalesce(p_meno_darcu, '')), 80), ''); v_ex public.retaz_platba;
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

  v_pl := public.platba_zapis(p_idem, p_suma, p_mena, p_kanal, null, v_ja, v_meno, null, coalesce(v_z.nazov, v_r.meno),
    false, 0, jsonb_build_object('retaz', p_retaz, 'zbierka', v_b.zbierka, 'pct', coalesce(v_b.pct, 0)) ||
      case when p_test then jsonb_build_object('testovaci', true) else '{}'::jsonb end, v_split);
  perform set_config('deed.testovaci', '0', true);
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
revoke all on function public.retaz_dar(text, text, numeric, text, text, text, boolean) from public;
grant execute on function public.retaz_dar(text, text, numeric, text, text, text, boolean) to anon, authenticated, service_role;

-- stav reťaze (0093) + organizátor zbierky (stránka alebo meno z profilu) a vyzbierané — pre stránku tvorcu
create or replace function public.retaz_stav(p_retaz text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', r.id, 'meno', r.meno, 'robi', r.robi, 'stranka', r.stranka,
    'zapecatena', r.zapecatena, 'ukoncena', r.ukoncena,
    'moja', r.ucet_id = public.moj_ucet() or (r.stranka is not null and public.spravujem_stranku(r.stranka)),
    'dostal', coalesce((select sum(pl.cista_suma) from public.retaz_platba rp join public.platba pl on pl.id = rp.platba_id
                         where rp.retaz = r.id and pl.mena = 'EUR'), 0),
    'polozky', coalesce((select jsonb_agg(jsonb_build_object('poradie', p.poradie, 'zbierka', p.zbierka, 'nazov', z.nazov,
                 'pct', p.pct, 'stav', p.stav, 'zmena', p.zmena, 'ciel', z.ciel, 'vyzbierane', public.retaz_vyzbierane(p.zbierka),
                 'org_stranka', z.stranka,
                 'org', coalesce((select s.nazov from public.stranka s where s.id = z.stranka),
                                 (select nullif(trim(concat_ws(' ', pr.meno, pr.priezvisko)), '') from public.profil pr where pr.ucet_id = p.ucet)),
                 'poslane', coalesce((select sum(case when po.storno_pre is null then po.suma else -po.suma end)
                                        from public.retaz_platba rp join public.pohyb po on po.platba_id = rp.platba_id
                                       where rp.retaz = r.id and rp.zbierka = p.zbierka and po.mena = 'EUR'
                                         and po.typ in ('dar', 'vratenie') and p.ucet in (po.ucet_kredit, po.ucet_debet)), 0))
                 order by p.poradie)
               from public.retaz_polozka p join public.zbierka z on z.id = p.zbierka where p.retaz = r.id), '[]'::jsonb))
    from public.retaz r where r.id = p_retaz
$$;
revoke all on function public.retaz_stav(text) from public;
grant execute on function public.retaz_stav(text) to anon, authenticated, service_role;

-- ---------- 7 · stránky (balík 8 C) ----------
-- stránka zbierky: kto ju podporuje reťazou (bežiace aj skončené podiely; blok „Podporujú reťazou“ berie len bezi)
create or replace function public.retaz_podporuju(p_zbierka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('retaz', r.id, 'meno', r.meno, 'robi', r.robi, 'stranka', r.stranka,
           'pct', p.pct, 'stav', p.stav, 'bezi', p.stav = 'bezi' and r.ukoncena is null,
           'poslane', coalesce((select sum(case when po.storno_pre is null then po.suma else -po.suma end)
                                  from public.retaz_platba rp join public.pohyb po on po.platba_id = rp.platba_id
                                 where rp.retaz = r.id and rp.zbierka = p.zbierka and po.mena = 'EUR'
                                   and po.typ in ('dar', 'vratenie') and p.ucet in (po.ucet_kredit, po.ucet_debet)), 0))
           order by r.zapecatena), '[]'::jsonb)
    from public.retaz_polozka p join public.retaz r on r.id = p.retaz
   where p.zbierka = p_zbierka and (p.stav = 'bezi' or exists (select 1 from public.retaz_platba rp where rp.retaz = r.id and rp.zbierka = p.zbierka))
$$;
revoke all on function public.retaz_podporuju(text) from public;
grant execute on function public.retaz_podporuju(text) to anon, authenticated, service_role;

-- stránka tvorcu: posledná reťaz stránky (alebo moja), bežiaca má prednosť
create or replace function public.retaz_strany(p_stranka text default null) returns jsonb
  language sql stable security definer set search_path = public as $$
  select public.retaz_stav(r.id) from public.retaz r
   where r.ucet_id = coalesce((select ucet_id from public.stranka where id = p_stranka), case when p_stranka is null then public.moj_ucet() end)
   order by r.ukoncena is null desc, r.zapecatena desc limit 1
$$;
revoke all on function public.retaz_strany(text) from public;
grant execute on function public.retaz_strany(text) to anon, authenticated, service_role;

-- darcovia cez QR reťaze pri jednej zbierke (meno len keď ho darca dovolil)
create or replace function public.retaz_darcovia(p_retaz text, p_zbierka text, p_limit int default 50) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object('pocet', (select count(*) from public.retaz_platba where retaz = p_retaz and zbierka = p_zbierka),
    'dary', coalesce((select jsonb_agg(jsonb_build_object('meno', case when x.zobrazenie = 1 then x.odosielatel_text end,
               'registrovany', x.odosielatel is not null, 'suma', x.suma, 'mena', x.mena, 'cas', x.vytvorene) order by x.vytvorene desc)
             from (select pl.* from public.retaz_platba rp join public.platba pl on pl.id = rp.platba_id
                    where rp.retaz = p_retaz and rp.zbierka = p_zbierka order by pl.vytvorene desc
                    limit greatest(1, least(coalesce(p_limit, 50), 500))) x), '[]'::jsonb))
$$;
revoke all on function public.retaz_darcovia(text, text, int) from public;
grant execute on function public.retaz_darcovia(text, text, int) to anon, authenticated, service_role;

-- Testovanie: oznámenia, ktoré dostali organizátori (len tvorca)
create or replace function public.retaz_oznamy(p_retaz text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.retaz_moja(p_retaz) then raise exception 'Táto reťaz nie je vaša.' using errcode = '42501', detail = 'cudzia_retaz'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('komu', coalesce((select s.nazov from public.zbierka z join public.stranka s on s.id = z.stranka where z.id = o.zbierka),
             (select nullif(trim(concat_ws(' ', pr.meno, pr.priezvisko)), '') from public.profil pr where pr.ucet_id = o.ucet), 'Organizátor'),
           'zbierka', (select nazov from public.zbierka where id = o.zbierka), 'titul', o.titul, 'text', o.text, 'cas', o.cas) order by o.cas, o.id)
    from public.retaz_oznam o where o.retaz = p_retaz), '[]'::jsonb);
end $$;
revoke all on function public.retaz_oznamy(text) from public, anon;
grant execute on function public.retaz_oznamy(text) to authenticated, service_role;

-- Testovanie: „Bežiaca zbierka sa naplnila“ / „Ďalšiu v rade uzavreli“ — len tvorca a len s testovacou pokladňou
create or replace function public.retaz_test(p_retaz text, p_akcia text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_p public.retaz_polozka;
begin
  if not coalesce((select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna'), false) then
    raise exception 'Testovanie je vypnuté.' using errcode = '42501', detail = 'test_vypnuty';
  end if;
  if not public.retaz_moja(p_retaz) then raise exception 'Táto reťaz nie je vaša.' using errcode = '42501', detail = 'cudzia_retaz'; end if;
  if p_akcia = 'naplnena' then
    select * into v_p from public.retaz_polozka where retaz = p_retaz and stav = 'bezi';
    if not found then raise exception 'Žiadna zbierka nebeží.' using errcode = '22023', detail = 'nic_nebezi'; end if;
  elsif p_akcia = 'uzavreli' then
    select * into v_p from public.retaz_polozka where retaz = p_retaz and stav = 'caka' order by poradie limit 1;
    if not found then raise exception 'V rade nič nečaká.' using errcode = '22023', detail = 'nic_neceka'; end if;
    p_akcia := 'preskocena';
  else
    raise exception 'Neznáma akcia.' using errcode = '22023', detail = 'akcia';
  end if;
  update public.retaz_polozka set stav = p_akcia, zmena = now() where retaz = p_retaz and poradie = v_p.poradie;
  return public.retaz_posun(p_retaz, true);
end $$;
revoke all on function public.retaz_test(text, text) from public, anon;
grant execute on function public.retaz_test(text, text) to authenticated, service_role;

commit;
