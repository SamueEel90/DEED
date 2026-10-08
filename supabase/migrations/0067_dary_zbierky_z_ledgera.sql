-- ============================================================
-- 0067 · Počítadlá a zoznam darcov zbierky stránky čítajú LEN z ledgera (Martin 7. 10., poradie opráv 1)
-- ------------------------------------------------------------
-- Appka nesmie ukázať dar, ktorý v ledgeri nevznikol. zbierka_dary vráti dary zbierky
-- (jedna platba = jeden riadok, suma = podiely daru bez poplatku a tipu, storno odpočíta) a súčty po menách.
-- Meno len to, ktoré darca pri dare zvolil (platba.odosielatel_text, 0061); inak bez mena.
-- ============================================================
begin;

create or replace function public.zbierka_dary(p_zbierka text, p_limit int default 200) returns jsonb
  language sql stable security definer set search_path = public as $$
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
$$;
revoke all on function public.zbierka_dary(text, int) from public;
grant execute on function public.zbierka_dary(text, int) to anon, authenticated, service_role;

commit;
