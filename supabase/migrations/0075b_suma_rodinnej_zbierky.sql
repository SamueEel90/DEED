-- ============================================================
-- 0075b · Odkazy 3 · bod 4 · KARTA 57 A.7 — sumu zbierky rodiny server nepošle, kým človek nedaruje
-- ------------------------------------------------------------
-- Zbierka rodiny = zbierka s príjemcom v zbierka_podiel (pohreb, svadba, pre veriaceho — 0065).
-- Rozmazaná suma v appke nestačí: zbierka_dary (0067) a v_zbierka_vyzbierane (0065) posielali
-- súčty a sumy darov každému. Teraz ich dostane len:
--   · príjemca zbierky,
--   · prihlásený človek, ktorý na zbierku už daroval.
-- Ostatní (aj overovateľ / farár — KARTA 57 A.6, aj neprihlásený) dostanú len počet darov a príznak skryte.
-- Bežné zbierky bez príjemcu: bez zmeny.
-- ============================================================
begin;

create or replace function public.zbierka_suma_vidim(p_zbierka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.zbierka_podiel where zbierka = p_zbierka and druh = 'prijemca')
      or exists (select 1 from public.zbierka_podiel where zbierka = p_zbierka and druh = 'prijemca' and ucet = public.moj_ucet())
      or exists (select 1 from public.platba where zbierka = p_zbierka and odosielatel is not null and odosielatel = public.moj_ucet())
$$;
revoke all on function public.zbierka_suma_vidim(text) from public;
grant execute on function public.zbierka_suma_vidim(text) to anon, authenticated, service_role;

-- zbierka_dary: rovnaký výpočet ako 0067; bez práva vidieť sumu len počet
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

-- vyzbierané: zbierka rodiny len pre toho, kto smie vidieť sumu
create or replace view public.v_zbierka_vyzbierane with (security_invoker = false) as
  select pl.zbierka, po.mena,
         sum(case when po.storno_pre is null then po.suma else -po.suma end) as vyzbierane,
         count(distinct pl.id) filter (where po.storno_pre is null) as darov
    from public.pohyb po join public.platba pl on pl.id = po.platba_id
   where pl.zbierka is not null and po.typ in ('dar', 'sluzba', 'vratenie')
     and po.ucet_kredit <> public.ucet_systemu('platforma')
     and public.zbierka_suma_vidim(pl.zbierka)
   group by pl.zbierka, po.mena;
grant select on public.v_zbierka_vyzbierane to anon, authenticated;

commit;
