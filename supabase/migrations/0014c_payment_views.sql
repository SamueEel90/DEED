-- ============================================================
-- DEED · Payment Engine — pohľady (výpis + zostatok)   [Fáza 2]
-- v_vypis    = jednotný výpis (dal/dostal) naprieč modulmi cez interné ID prípadu.
-- v_zostatok = reálny DEED zostatok peňaženky (prijaté − odoslané).
-- POZN.: pohľady bežia ako owner → obchádzajú RLS bázových tabuliek; pri
--        TEST-ONLY RLS je to bez rozdielu, v produkčnej Fáze 5 sa doplní
--        security_invoker / owner-only politiky.
-- ============================================================

create or replace view public.v_vypis as
  select p.id as platba_id, p.odosielatel as ucet_id, 'dal'::text as smer,
         p.case_id, p.prijemca_text as protistrana, p.suma, p.mena, p.kanal,
         p.poplatok, p.tip, p.cista_suma, p.stav,
         coalesce(p.ext_vs, p.ext_hash, p.ext_sms_kod) as externy_id,
         p.batch_id, p.cas
    from public.platba p
   where p.odosielatel is not null
  union all
  select p.id, p.prijemca_ucet as ucet_id, 'dostal'::text as smer,
         p.case_id, p.odosielatel_text as protistrana, p.cista_suma as suma, p.mena, p.kanal,
         p.poplatok, p.tip, p.cista_suma, p.stav,
         coalesce(p.ext_vs, p.ext_hash, p.ext_sms_kod),
         p.batch_id, p.cas
    from public.platba p
   where p.prijemca_ucet is not null;

create or replace view public.v_zostatok as
  select u.id as ucet_id,
         round(
           coalesce((select sum(p.cista_suma) from public.platba p
                      where p.prijemca_ucet = u.id and p.mena = 'DEED'
                        and p.stav in ('credited','settled')), 0)
           - coalesce((select sum(p.suma) from public.platba p
                      where p.odosielatel = u.id and p.mena = 'DEED'
                        and p.stav in ('credited','settled')), 0)
         , 4) as zostatok_deed
    from public.ucet u;

grant select on public.v_vypis, public.v_zostatok to anon, authenticated;
