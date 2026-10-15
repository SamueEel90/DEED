-- ============================================================
-- 0093 · Balík 8 B — Reťaz dobra na serveri: split-config, podiely v ledgeri, posun radu, oznámenia
-- ------------------------------------------------------------
-- Doteraz bola reťaz len jsonb v moja_retaz (0080b) a rozdelenie daru server nepoznal.
-- Teraz:
--  · retaz + retaz_polozka = split-config zapečatenej reťaze (rad zbierok, percentá). Po zapečatení sa nemení
--    nič okrem stavu položky, ten mení len server (posun radu).
--  · retaz_zapecat: zapečatí raz (rovnaké id = tá istá reťaz, nič nové), starú bežiacu reťaz účtu ukončí,
--    každému organizátorovi zbierky v rade pošle oznámenie.
--  · retaz_dar: dar na QR reťaze → JEDNA platba cez platba_zapis s podielmi: bežiaca zbierka N %, zvyšok tvorcovi.
--    Bez bežiacej zbierky 100 % tvorcovi. Súčet na cent (centy z orezania dostane zbierka).
--  · retaz_posun: Beží · Čaká · Naplnená · Skončila · Preskočená. Naplnená = vyzbierané (ledger, EUR) ≥ cieľ,
--    skončila / preskočená = zbierka už nie je aktívna (bežiaca → skončila, čakajúca → preskočená).
--    Keď rad prejde na ďalšiu zbierku, jej organizátor dostane oznámenie „Ste na rade“.
--  · Platba reťaze patrí bežiacej zbierke (platba.zbierka), podiel tvorcu sa do zbierky nepočíta:
--    v_zbierka_vyzbierane a zbierka_dary vynechajú pohyby tvorcu z platieb reťaze (retaz_platba).
-- Pravidlá: jedna bežiaca reťaz na účet; percentá 5–100 po 5; len verejné bežiace zbierky:
-- zapečatená zbierka alebo zbierka stránky v module (hlavná / sektorová, napr. oprava strechy farnosti — riadok
-- vznikne pri zapečatení ako pri prvom dare, 0077). Nie zvončeková zbierka omše (-zv-, mení sa každou omšou),
-- nie súkromná zbierka s príjemcom (rodina, pohreb); vlastná zbierka nie.
-- Reťaz robí osoba (môj účet) alebo stránka, ktorú spravujem (p_stranka) — peniaze tvorcu idú na jej účet.
-- ============================================================
begin;

-- ---------- 1 · split-config reťaze ----------
create table if not exists public.retaz (
  id          text primary key check (length(id) between 4 and 80),
  ucet_id     uuid not null references public.ucet(id),          -- kto reťaz robí (dostane zvyšok a po skončení 100 %)
  stranka     text references public.stranka(id),                -- reťaz robí stránka (Konáš ako)
  meno        text not null,                                     -- meno tvorcu v oznámeniach
  robi        jsonb,                                             -- karta „Reťaz robí“ (len na zobrazenie)
  zapecatena  timestamptz not null default now(),
  ukoncena    timestamptz
);
create unique index if not exists retaz_jedna_bezi on public.retaz (ucet_id) where ukoncena is null;

create table if not exists public.retaz_polozka (
  retaz    text not null references public.retaz(id) on delete restrict,
  poradie  smallint not null check (poradie between 1 and 20),
  zbierka  text not null references public.zbierka(id),
  ucet     uuid not null references public.ucet(id),             -- organizátor (príjemca podielu)
  pct      smallint not null check (pct between 5 and 100 and pct % 5 = 0),
  stav     text not null default 'caka' check (stav in ('caka', 'bezi', 'naplnena', 'skoncila', 'preskocena')),
  zmena    timestamptz not null default now(),
  primary key (retaz, poradie),
  unique (retaz, zbierka)
);

-- platba reťaze: komu išiel podiel (tvorca sa nepočíta do zbierky)
create table if not exists public.retaz_platba (
  platba_id  uuid primary key references public.platba(id),
  retaz      text not null references public.retaz(id),
  zbierka    text references public.zbierka(id),                 -- null = 100 % tvorcovi (rad skončil)
  tvorca     uuid not null references public.ucet(id),
  pct        smallint not null default 0
);
create index if not exists retaz_platba_retaz_idx on public.retaz_platba (retaz);

alter table public.retaz enable row level security;
alter table public.retaz_polozka enable row level security;
alter table public.retaz_platba enable row level security;
drop policy if exists verejne_citat on public.retaz;
create policy verejne_citat on public.retaz for select to anon, authenticated using (true);           -- darca vidí „25 % → zbierka“
drop policy if exists verejne_citat on public.retaz_polozka;
create policy verejne_citat on public.retaz_polozka for select to anon, authenticated using (true);
revoke all on table public.retaz, public.retaz_polozka, public.retaz_platba from anon, authenticated;
grant select on table public.retaz, public.retaz_polozka to anon, authenticated;

-- po zapečatení sa nemení rad ani percentá (stav a čas zmeny mení len server)
create or replace function public.retaz_nemenna() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'DELETE' or (new.id, new.ucet_id, new.stranka, new.zapecatena) is distinct from (old.id, old.ucet_id, old.stranka, old.zapecatena) then
    raise exception 'Zapečatená reťaz sa nedá zmeniť.' using errcode = '42501', detail = 'zapecatene';
  end if;
  return new;
end $$;
create or replace function public.retaz_polozka_nemenna() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'DELETE' or (new.retaz, new.poradie, new.zbierka, new.ucet, new.pct) is distinct from (old.retaz, old.poradie, old.zbierka, old.ucet, old.pct) then
    raise exception 'Zapečatená reťaz sa nedá zmeniť.' using errcode = '42501', detail = 'zapecatene';
  end if;
  return new;
end $$;
drop trigger if exists retaz_nemenna on public.retaz;
create trigger retaz_nemenna before update or delete on public.retaz for each row execute function public.retaz_nemenna();
drop trigger if exists retaz_polozka_nemenna on public.retaz_polozka;
create trigger retaz_polozka_nemenna before update or delete on public.retaz_polozka for each row execute function public.retaz_polozka_nemenna();

-- ---------- 2 · vyzbierané zbierky bez podielu tvorcu (ledger) ----------
create or replace function public.retaz_bez_tvorcu(p_platba uuid, p_kredit uuid, p_debet uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.retaz_platba rp where rp.platba_id = p_platba and rp.tvorca in (p_kredit, p_debet))
$$;
revoke all on function public.retaz_bez_tvorcu(uuid, uuid, uuid) from public;
grant execute on function public.retaz_bez_tvorcu(uuid, uuid, uuid) to anon, authenticated, service_role;  -- volá ho pohľad v_zbierka_vyzbierane

create or replace view public.v_zbierka_vyzbierane with (security_invoker = false) as
  select pl.zbierka, po.mena,
         sum(case when po.storno_pre is null then po.suma else -po.suma end) as vyzbierane,
         count(distinct pl.id) filter (where po.storno_pre is null) as darov
    from public.pohyb po join public.platba pl on pl.id = po.platba_id
   where pl.zbierka is not null and po.typ in ('dar', 'sluzba', 'vratenie')
     and po.ucet_kredit <> public.ucet_systemu('platforma')
     and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
     and public.zbierka_suma_vidim(pl.zbierka)
   group by pl.zbierka, po.mena;
grant select on public.v_zbierka_vyzbierane to anon, authenticated;

-- zbierka_dary (0075b) 1 : 1, pribudla len podmienka bez podielu tvorcu
create or replace function public.zbierka_dary(p_zbierka text, p_limit int default 200) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  v := (
    with d as (
      select pl.id, pl.vytvorene as cas, pl.mena, pl.kanal, pl.odosielatel_text as meno,
             pl.odosielatel is not null as registrovany,
             coalesce(pl.odosielatel = public.moj_ucet(), false) as moj,
             sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma
        from public.platba pl join public.pohyb po on po.platba_id = pl.id
       where pl.zbierka = p_zbierka and po.typ in ('dar', 'sluzba', 'vratenie')
         and po.ucet_kredit <> public.ucet_systemu('platforma')
         and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
       group by pl.id
      having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
    )
    select jsonb_build_object(
      'sucty', coalesce((select jsonb_object_agg(mena, s) from (select mena, sum(suma) as s from d group by mena) x), '{}'::jsonb),
      'pocet', (select count(*) from d),
      'dary', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'cas', cas, 'mena', mena, 'kanal', kanal, 'meno', meno,
                          'registrovany', registrovany, 'moj', moj, 'suma', suma) order by cas desc)
                        from (select * from d order by cas desc limit greatest(coalesce(p_limit, 200), 1)) y), '[]'::jsonb))
  );
  if public.zbierka_suma_vidim(p_zbierka) then return v; end if;
  return jsonb_build_object('pocet', v->'pocet', 'sucty', '{}'::jsonb, 'dary', '[]'::jsonb, 'skryte', true);
end $$;
revoke all on function public.zbierka_dary(text, int) from public;
grant execute on function public.zbierka_dary(text, int) to anon, authenticated, service_role;

-- vyzbierané EUR zbierky pre posun radu (bez filtra viditeľnosti)
create or replace function public.retaz_vyzbierane(p_zbierka text) returns numeric
  language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when po.storno_pre is null then po.suma else -po.suma end), 0)
    from public.pohyb po join public.platba pl on pl.id = po.platba_id
   where pl.zbierka = p_zbierka and po.mena = 'EUR' and po.typ in ('dar', 'sluzba', 'vratenie')
     and po.ucet_kredit <> public.ucet_systemu('platforma')
     and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
$$;
revoke all on function public.retaz_vyzbierane(text) from public, anon, authenticated;

-- ---------- 3 · stav reťaze (čo appka zobrazí) ----------
create or replace function public.retaz_stav(p_retaz text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', r.id, 'meno', r.meno, 'robi', r.robi, 'stranka', r.stranka,
    'zapecatena', r.zapecatena, 'ukoncena', r.ukoncena,
    'moja', r.ucet_id = public.moj_ucet() or (r.stranka is not null and public.spravujem_stranku(r.stranka)),
    'dostal', coalesce((select sum(pl.cista_suma) from public.retaz_platba rp join public.platba pl on pl.id = rp.platba_id
                         where rp.retaz = r.id and pl.mena = 'EUR'), 0),
    'polozky', coalesce((select jsonb_agg(jsonb_build_object('poradie', p.poradie, 'zbierka', p.zbierka, 'nazov', z.nazov,
                 'pct', p.pct, 'stav', p.stav, 'zmena', p.zmena, 'ciel', z.ciel,
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

-- ---------- 4 · posun radu ----------
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
          insert into public.notifikacia (ucet_id, kat, titul, text)
            values (p.ucet, 'penazenka', 'Reťaz dobra · ste na rade',
                    'Vaša zbierka ' || v_z.nazov || ' je teraz v reťazi na rade. ' || v_r.meno || ' na ňu posiela ' || p.pct || ' % z každého daru.');
        end if;
      end if;
      exit;
    end loop;
  end if;
  return public.retaz_stav(p_retaz);
end $$;
revoke all on function public.retaz_posun(text, boolean) from public, anon, authenticated;

-- verejný posun (appka ho volá pri zobrazení; pravidlá sú pevné, nikomu nič nedovolí)
create or replace function public.retaz_obnov(p_retaz text) returns jsonb
  language sql volatile security definer set search_path = public as $$
  select public.retaz_posun(p_retaz, true)
$$;
revoke all on function public.retaz_obnov(text) from public;
grant execute on function public.retaz_obnov(text) to anon, authenticated, service_role;

-- ---------- 5 · zapečatenie ----------
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
    insert into public.notifikacia (ucet_id, kat, titul, text)
      values (v_org, 'penazenka', 'Reťaz dobra',
              v_meno || ' posiela ' || v_pct || ' % z každého daru na vašu zbierku ' || v_z.nazov
              || case when i = 1 then '.' else ', keď na ňu príde rad (' || i || '. v poradí).' end);
  end loop;

  return public.retaz_posun(p_id, false);
end $$;
revoke all on function public.retaz_zapecat(text, jsonb, text, jsonb) from public, anon;
grant execute on function public.retaz_zapecat(text, jsonb, text, jsonb) to authenticated, service_role;

-- „Vytvoriť novú reťaz“ bez zapečatenia novej: bežiaca reťaz účtu skončí
create or replace function public.retaz_ukonci(p_stranka text default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ucet uuid := public.moj_ucet();
begin
  if v_ucet is null then raise exception 'Prihláste sa.' using errcode = '28000', detail = 'neprihlaseny'; end if;
  if p_stranka is not null then
    if not public.spravujem_stranku(p_stranka) then raise exception 'Túto stránku nespravujete.' using errcode = '42501', detail = 'nie_spravca'; end if;
    v_ucet := (select ucet_id from public.stranka where id = p_stranka);
  end if;
  update public.retaz set ukoncena = now() where ucet_id = v_ucet and ukoncena is null;
end $$;
revoke all on function public.retaz_ukonci(text) from public, anon;
grant execute on function public.retaz_ukonci(text) to authenticated, service_role;

-- ---------- 6 · dar na QR reťaze ----------
create or replace function public.retaz_dar(p_retaz text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null, p_test boolean default false)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ja uuid := public.moj_ucet(); v_r public.retaz; v_b public.retaz_polozka; v_z public.zbierka; v_split jsonb;
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
         odosielatel_text = case when v_ja is not null and odosielatel = v_ja then v_meno else null end,
         zobrazenie = case when v_ja is not null and odosielatel = v_ja and v_meno is not null then 1 else 4 end
   where id = v_pl.id;
  insert into public.retaz_platba (platba_id, retaz, zbierka, tvorca, pct)
    values (v_pl.id, p_retaz, v_b.zbierka, v_r.ucet_id, coalesce(v_b.pct, 0)) on conflict (platba_id) do nothing;

  -- dar mohol zbierku naplniť → rad sa posunie hneď
  return jsonb_build_object('platba_id', v_pl.id, 'zbierka', v_b.zbierka, 'pct', coalesce(v_b.pct, 0), 'stav', v_pl.stav,
    'testovaci', p_test, 'retaz', public.retaz_posun(p_retaz, true));
end $$;
revoke all on function public.retaz_dar(text, text, numeric, text, text, text, boolean) from public;
grant execute on function public.retaz_dar(text, text, numeric, text, text, text, boolean) to anon, authenticated, service_role;

commit;
