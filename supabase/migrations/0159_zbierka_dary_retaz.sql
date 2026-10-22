-- ============================================================
-- 0159 · OPRAVY 492 (Martin 22. 10.) · zbierka_dary vráti pri dare aj reťaz, cez ktorú prišiel
-- ------------------------------------------------------------
-- Verzia zbierky u toho, kto reťazí (QR /r/{reťaz}/{zbierka}): „Vyzbierané cez reťaz …“ a „DARCOVIA CEZ REŤAZ …“
-- potrebujú vedieť, ktoré dary prišli cez túto reťaz. Zdroj: retaz_platba (0093). Telo 1 : 1 ako 0140, pribudlo pole 'retaz'.
-- Suma daru ostáva časť pre zbierku (časť pre toho, kto reťazí, sa do zbierky nepočíta).
-- ============================================================
begin;

CREATE OR REPLACE FUNCTION public.zbierka_dary(p_zbierka text, p_limit integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
             pl.cez_skutok as skutok,
             (select rp.retaz from public.retaz_platba rp where rp.platba_id = pl.id) as retaz
        from public.platba pl join public.pohyb po on po.platba_id = pl.id
       where pl.zbierka = p_zbierka and po.typ in ('dar', 'sluzba', 'vratenie')
         and po.ucet_kredit <> public.ucet_systemu('platforma')
         and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
       group by pl.id
      having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
      union all
      select zc.id || ':' || po.mena, coalesce(zc.koniec, max(pl.vytvorene)), po.mena, 'omsa', zc.nazov, false, false, true,
             sum(case when po.storno_pre is null then po.suma else -po.suma end), null::text, null::text
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
                          'skutok', y.skutok, 'skutok_nazov', sk.data->>'nazov', 'retaz', y.retaz) order by y.cas desc)
                        from (select * from d order by cas desc limit greatest(coalesce(p_limit, 200), 1)) y
                        left join public.skutok_stranky sk on sk.id = y.skutok and sk.stiahnuty is null), '[]'::jsonb))
  );
  if public.zbierka_suma_vidim(p_zbierka) then return v; end if;
  return jsonb_build_object('pocet', v->'pocet', 'sucty', '{}'::jsonb, 'dary', '[]'::jsonb, 'skryte', true);
end $function$;

commit;
