-- ============================================================
-- 0142 · OPRAVY 442 doplnok · darcovia skutku usera len zo servera (ledger)
-- ------------------------------------------------------------
-- Dar na skutok (príspevok vo feede Domov) sa zapisuje cez platba_create (platba.case_id = príspevok).
-- Zoznam darcov skutku doteraz poznal len dary z toho istého zariadenia → každý videl iný zoznam.
-- prispevok_dary vráti dary príspevku z ledgera v tom istom tvare ako zbierka_dary (0067 / 0140):
--   { sucty, pocet, dary: [{ id, cas, mena, kanal, meno, registrovany, moj, suma, omsa }] }
-- Meno len podľa voľby darcu (platba.odosielatel_text, anonym = null, 0061). Podiel platformy sa nepočíta.
-- ============================================================
begin;

create or replace function public.prispevok_dary(p_prispevok uuid, p_limit int default 200) returns jsonb
  language sql stable security definer set search_path = public as $$
  with d as (
    select pl.id::text as id, pl.vytvorene as cas, pl.mena, pl.kanal, pl.odosielatel_text as meno,
           pl.odosielatel is not null as registrovany,
           coalesce(pl.odosielatel = public.moj_ucet(), false) as moj,
           sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma
      from public.platba pl join public.pohyb po on po.platba_id = pl.id
     where pl.case_id = p_prispevok and pl.zbierka is null
       and po.typ in ('dar', 'sluzba', 'vratenie')
       and po.ucet_kredit <> public.ucet_systemu('platforma')
     group by pl.id
    having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
  )
  select jsonb_build_object(
    'sucty', coalesce((select jsonb_object_agg(mena, s) from (select mena, sum(suma) as s from d group by mena) x), '{}'::jsonb),
    'pocet', (select count(*) from d),
    'dary', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'cas', cas, 'mena', mena, 'kanal', kanal, 'meno', meno,
                        'registrovany', registrovany, 'moj', moj, 'suma', suma, 'omsa', false) order by cas desc)
                      from (select * from d order by cas desc limit greatest(coalesce(p_limit, 200), 1)) y), '[]'::jsonb));
$$;
revoke all on function public.prispevok_dary(uuid, int) from public;
grant execute on function public.prispevok_dary(uuid, int) to anon, authenticated, service_role;

commit;
