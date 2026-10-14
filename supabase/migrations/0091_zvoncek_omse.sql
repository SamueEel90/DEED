-- ============================================================
-- 0091 · OPRAVY 289 · Zvončeková zbierka ku každej omši z kalendára (Karta 58)
-- ------------------------------------------------------------
-- Namiesto týždenného okna po–ne: ku každej omši z kalendára kostola jedna zbierka.
-- Omše dňa = týždenný vzor + zrušené (bez zbierky) + posunuté (nový čas) + pridané omše dňa,
-- bez omší s poznámkou, ktorej obdobie od–do pokrýva deň (OPRAVY 283).
-- Prepnutie: v polovici medzi začiatkami dvoch omší, nikdy skôr ako 60 min po začiatku;
-- medzera ≥ 4 h → celá hodina dole, inak na 15 min.
-- Kalendár: naboz_stav, oblasť „kalendar“, id = stránka, data.kostoly[kostol] (hlavný kostol = „0“;
-- zvončeková pri filiálke číta kalendár filiálky).
-- Poďakovanie v riadku Hlavnej zbierky: cirkev.podakovanie (predvolené „Pán Boh zaplať“), farár ho prepíše v Správe zvončekovej.
-- Zbierka okna v ledgeri: id „{stránka}:{stránka}-zv-{kostol}-RRRR-MM-DD-HHMM“ (typ sektor, vznikne pri prvom dare,
-- peniaze na účet stránky). Okno určuje server (zvoncek_dar), nie prehliadač.
-- ============================================================
begin;

-- poďakovanie v riadku Hlavnej zbierky podľa cirkvi (jedno slovo v číselníku; zbory a obce „Ďakujeme“)
alter table public.cirkev add column if not exists podakovanie text not null default 'Pán Boh zaplať';
update public.cirkev set podakovanie = 'Ďakujeme' where jednotka_2p ~ '(zboru|obce)$';

-- názov omše: Ranná / Večerná / Hlavná, pridaný druh (OPRAVY 283) alebo názov pridanej omše dňa
create or replace function public.zvoncek_nazov_druhu(p_k jsonb, p_g int) returns text
  language sql immutable set search_path = public as $$
  select case p_g when 0 then 'Ranná omša' when 1 then 'Večerná omša' when 2 then 'Hlavná omša' else
    coalesce((select case
        when d->>'nazov' in ('Detská', 'Mládežnícka', 'Školská') then (d->>'nazov') || ' omša'
        when d->>'nazov' = 'Za zosnulých' then 'Omša za zosnulých'
        else nullif(trim(d->>'nazov'), '') end
      from jsonb_array_elements(case when jsonb_typeof(p_k->'druhy') = 'array' then p_k->'druhy' else '[]'::jsonb end) d
     where (d->>'g') ~ '^\d+$' and (d->>'g')::int = p_g limit 1), 'Svätá omša') end
$$;

-- omše dňa kostola: minúty od polnoci, čas „7:00“, názov (zrušené vynechané)
create or replace function public.zvoncek_omse_dna(p_k jsonb, p_den date)
  returns table (m int, cas text, nazov text)
  language plpgsql immutable set search_path = public as $$
declare
  v_key text := to_char(p_den, 'YYYY-MM-DD'); v_wd text := (extract(isodow from p_den)::int - 1)::text;
  v_kod text; v_g int; v_j int; v_t text; v_p jsonb; v_ps text; x jsonb;
  v_re text := '^([01]?\d|2[0-3]):[0-5]\d$';
begin
  if p_k is null then return; end if;
  for v_kod in select jsonb_array_elements_text(case when jsonb_typeof(p_k->'vzor'->v_wd) = 'array' then p_k->'vzor'->v_wd else '[]'::jsonb end) loop
    continue when v_kod !~ '^\d+$';
    v_g := v_kod::int / 10; v_j := v_kod::int % 10;
    v_t := p_k->'casy'->v_g->>v_j;
    continue when v_t is null or v_t !~ v_re;
    -- zrušená v ten deň
    continue when jsonb_typeof(p_k->'zrus'->v_key) = 'array' and (p_k->'zrus'->v_key) @> to_jsonb(v_kod::int);
    -- poznámka s obdobím od–do (omša sa v tom čase nekoná)
    v_p := p_k->'pozn'->v_kod;
    continue when v_p is not null and (coalesce(v_p->>'od', '') <> '' or coalesce(v_p->>'do', '') <> '')
      and v_key >= coalesce(nullif(v_p->>'od', ''), '0000') and v_key <= coalesce(nullif(v_p->>'do', ''), '9999');
    -- posunutá v ten deň
    v_ps := p_k->'posun'->v_key->>v_kod;
    if v_ps is not null and v_ps ~ v_re then v_t := v_ps; end if;
    m := split_part(v_t, ':', 1)::int * 60 + split_part(v_t, ':', 2)::int;
    cas := (m / 60)::text || ':' || lpad((m % 60)::text, 2, '0');
    nazov := public.zvoncek_nazov_druhu(p_k, v_g);
    return next;
  end loop;
  -- pridané omše dňa (Úprava dňa → Omša), názov z poznámky
  for x in select jsonb_array_elements(case when jsonb_typeof(p_k->'extra'->v_key) = 'array' then p_k->'extra'->v_key else '[]'::jsonb end) loop
    continue when x->>'typ' <> 'omsa' or coalesce(x->>'t', '') !~ v_re;
    m := split_part(x->>'t', ':', 1)::int * 60 + split_part(x->>'t', ':', 2)::int;
    cas := (m / 60)::text || ':' || lpad((m % 60)::text, 2, '0');
    nazov := coalesce(nullif(trim(x->>'m'), ''), 'Svätá omša');
    return next;
  end loop;
end $$;

-- okamih prepnutia medzi omšami a a b (epoch sekundy)
create or replace function public.zvoncek_prepni(a bigint, b bigint) returns bigint
  language sql immutable as $$
  select greatest(case when b - a >= 4 * 3600 then floor(((a + b) / 2.0) / 3600) * 3600 else round(((a + b) / 2.0) / 900) * 900 end, a + 3600)::bigint
$$;

-- aktuálne okno zvončekovej zbierky kostola v čase p_cas (null = žiadne omše v kalendári)
create or replace function public.zvoncek_okno(p_stranka text, p_kostol text default '0', p_cas timestamptz default now())
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
revoke all on function public.zvoncek_okno(text, text, timestamptz) from public;
grant execute on function public.zvoncek_okno(text, text, timestamptz) to anon, authenticated, service_role;

-- dar do zvončekovej: okno (omšu) určí server v okamihu daru
create or replace function public.zvoncek_dar(p_stranka text, p_kostol text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null, p_test boolean default false)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_o jsonb;
begin
  if coalesce((select data->>'ukoncena' from public.naboz_stav where oblast = 'zvoncek' and id = p_stranka), '') = 'true' then
    raise exception 'Zvončeková zbierka je ukončená.' using errcode = '22023', detail = 'zbierka_ukoncena';
  end if;
  v_o := public.zvoncek_okno(p_stranka, p_kostol, now());
  if v_o is null then
    raise exception 'Najprv nastavte omše.' using errcode = '22023', detail = 'bez_omsi';
  end if;
  return public.zbierka_dar_volba(p_stranka || ':' || (v_o->>'ref'), p_idem, p_suma, p_mena, p_kanal, p_meno_darcu,
    p_stranka, (v_o->>'nazov') || ' ' || (v_o->>'cas'), null, p_test) || jsonb_build_object('okno', v_o);
end $$;
revoke all on function public.zvoncek_dar(text, text, text, numeric, text, text, text, boolean) from public;
grant execute on function public.zvoncek_dar(text, text, text, numeric, text, text, text, boolean) to anon, authenticated, service_role;

-- omše so zvončekovými darmi (riadky do Hlavnej zbierky, štatistika pre farára), najnovšie hore
create or replace function public.zvoncek_omse(p_stranka text, p_limit int default 200)
  returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.ref desc), '[]'::jsonb) from (
    select substr(z.id, length(p_stranka) + 2) as ref, z.nazov,
           coalesce(sum(v.vyzbierane) filter (where v.mena = 'EUR'), 0) as eur,
           coalesce(sum(v.vyzbierane) filter (where v.mena = 'DEED'), 0) as deed,
           coalesce(sum(v.darov), 0) as darov
      from public.zbierka z join public.v_zbierka_vyzbierane v on v.zbierka = z.id
     where z.stranka = p_stranka and z.id like p_stranka || ':' || p_stranka || '-zv-%'
     group by z.id, z.nazov
     order by z.id desc
     limit greatest(1, least(coalesce(p_limit, 200), 1000))
  ) x
$$;
revoke all on function public.zvoncek_omse(text, int) from public;
grant execute on function public.zvoncek_omse(text, int) to anon, authenticated, service_role;

commit;
