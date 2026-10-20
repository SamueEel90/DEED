-- ============================================================
-- 0140 · OPRAVY 438 (3) · dar cez skutok charity
-- ------------------------------------------------------------
-- Skutok za charitu má pri zverejnení zapečatené, kam idú peniaze (data.peniaze + data.dar, 0133):
--   centralna → <stránka>:hlavna · nasa / ina → data.dar[0].id (zbierka „zb-…“) · bez → žiadny dar.
-- Dar poslaný z detailu skutku ide 100 % na tú zbierku (telo daru je zbierka_dar_volba, 0084)
-- a platba si zapamätá, cez ktorý skutok prišla (platba.cez_skutok).
--   1. platba.cez_skutok
--   2. zbierka_dar_skutok — overí skutok a jeho zbierku, zapíše dar, označí platbu
--   3. zbierka_dary (0096) — riadok daru nesie skutok (id, názov) → v module zbierky „Cez skutok“
--   4. skutok_dary — súčet a počet darov podľa skutkov (detail skutku)
--   5. voľba „kam idú peniaze“ je po zverejnení zapečatená aj na serveri (úprava skutku ju nezmení)
-- Pohyby sa nemenia, čo sa počíta, je v pohyb ako doteraz.
-- ============================================================
begin;

-- 1 ----------------------------------------------------------
alter table public.platba add column if not exists cez_skutok text references public.skutok_stranky (id) on delete set null;
create index if not exists platba_cez_skutok_idx on public.platba (cez_skutok) where cez_skutok is not null;

-- 2 ----------------------------------------------------------
/** zbierka, kam idú peniaze zo skutku (null = skutok bez platobného modulu alebo neplatný) */
create or replace function public.skutok_zbierka(p_skutok text) returns text
  language sql stable security definer set search_path = public as $$
  select case s.data->>'peniaze'
           when 'centralna' then s.stranka || ':hlavna'
           when 'nasa' then nullif(s.data->'dar'->0->>'id', '')
           when 'ina' then nullif(s.data->'dar'->0->>'id', '')
         end
    from public.skutok_stranky s
   where s.id = p_skutok and s.stiahnuty is null;
$$;
revoke all on function public.skutok_zbierka(text) from public;
grant execute on function public.skutok_zbierka(text) to anon, authenticated, service_role;

create or replace function public.zbierka_dar_skutok(p_skutok text, p_zbierka text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_meno_darcu text default null, p_stranka text default null, p_nazov text default null, p_zdroj text default null, p_test boolean default false)
  returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_r jsonb; v_z text := public.skutok_zbierka(p_skutok);
begin
  if v_z is null then
    raise exception 'Tento skutok nezbiera peniaze.' using errcode = '22023', detail = 'skutok_bez_zbierky';
  end if;
  if v_z <> p_zbierka then
    raise exception 'Skutok posiela peniaze na inú zbierku.' using errcode = '22023', detail = 'skutok_ina_zbierka';
  end if;
  v_r := public.zbierka_dar_volba(p_zbierka, p_idem, p_suma, p_mena, p_kanal, p_meno_darcu, p_stranka, p_nazov, p_zdroj, p_test);
  update public.platba set cez_skutok = p_skutok where id = (v_r->>'platba_id')::uuid and cez_skutok is null;
  return v_r || jsonb_build_object('cez_skutok', p_skutok);
end $$;
revoke all on function public.zbierka_dar_skutok(text,text,text,numeric,text,text,text,text,text,text,boolean) from public;
grant execute on function public.zbierka_dar_skutok(text,text,text,numeric,text,text,text,text,text,text,boolean) to anon, authenticated, service_role;

-- 3 ---------- 0096 + skutok pri riadku daru ----------
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
             sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma,
             pl.cez_skutok as skutok
        from public.platba pl join public.pohyb po on po.platba_id = pl.id
       where pl.zbierka = p_zbierka and po.typ in ('dar', 'sluzba', 'vratenie')
         and po.ucet_kredit <> public.ucet_systemu('platforma')
         and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
       group by pl.id
      having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
      union all
      select zc.id || ':' || po.mena, coalesce(zc.koniec, max(pl.vytvorene)), po.mena, 'omsa', zc.nazov, false, false, true,
             sum(case when po.storno_pre is null then po.suma else -po.suma end), null::text
        from zc join public.platba pl on pl.zbierka = zc.id join public.pohyb po on po.platba_id = pl.id
       where po.typ in ('dar', 'sluzba', 'vratenie') and po.ucet_kredit <> public.ucet_systemu('platforma')
       group by zc.id, zc.koniec, zc.nazov, po.mena
      having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
    )
    select jsonb_build_object(
      'sucty', coalesce((select jsonb_object_agg(mena, s) from (select mena, sum(suma) as s from d group by mena) x), '{}'::jsonb),
      'pocet', (select count(*) from d),
      'dary', coalesce((select jsonb_agg(jsonb_build_object('id', y.id, 'cas', y.cas, 'mena', y.mena, 'kanal', y.kanal, 'meno', y.meno,
                          'registrovany', y.registrovany, 'moj', y.moj, 'suma', y.suma, 'omsa', y.omsa,
                          'skutok', y.skutok, 'skutok_nazov', sk.data->>'nazov') order by y.cas desc)
                        from (select * from d order by cas desc limit greatest(coalesce(p_limit, 200), 1)) y
                        left join public.skutok_stranky sk on sk.id = y.skutok and sk.stiahnuty is null), '[]'::jsonb))
  );
  if public.zbierka_suma_vidim(p_zbierka) then return v; end if;
  return jsonb_build_object('pocet', v->'pocet', 'sucty', '{}'::jsonb, 'dary', '[]'::jsonb, 'skryte', true);
end $$;
revoke all on function public.zbierka_dary(text, int) from public;
grant execute on function public.zbierka_dary(text, int) to anon, authenticated, service_role;

-- 4 ----------------------------------------------------------
-- súčet darov cez skutky (len skutky, ktorých zbierku smie volajúci vidieť — zbierka_suma_vidim)
create or replace function public.skutok_dary(p_skutky text[])
  returns table (skutok text, mena text, suma numeric, pocet int)
  language sql stable security definer set search_path = public as $$
  with d as (
    select pl.id, pl.cez_skutok, pl.mena,
           sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma
      from public.platba pl join public.pohyb po on po.platba_id = pl.id
     where pl.cez_skutok = any (coalesce(p_skutky, '{}'))
       and po.typ in ('dar', 'sluzba', 'vratenie')
       and po.ucet_kredit <> public.ucet_systemu('platforma')
       and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
       and public.zbierka_suma_vidim(pl.zbierka)
     group by pl.id, pl.cez_skutok, pl.mena
    having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
  )
  select cez_skutok, mena, sum(suma), count(*)::int from d group by cez_skutok, mena;
$$;
revoke all on function public.skutok_dary(text[]) from public;
grant execute on function public.skutok_dary(text[]) to anon, authenticated, service_role;

-- 5 ----------------------------------------------------------
create or replace function public.skutok_stranky_pecat() returns trigger
  language plpgsql as $$
begin
  new.data := (new.data - 'peniaze' - 'dar')
    || case when old.data ? 'peniaze' then jsonb_build_object('peniaze', old.data->'peniaze') else '{}'::jsonb end
    || case when old.data ? 'dar' then jsonb_build_object('dar', old.data->'dar') else '{}'::jsonb end;
  return new;
end $$;
drop trigger if exists skutok_stranky_pecat on public.skutok_stranky;
create trigger skutok_stranky_pecat before update on public.skutok_stranky
  for each row execute function public.skutok_stranky_pecat();

commit;
