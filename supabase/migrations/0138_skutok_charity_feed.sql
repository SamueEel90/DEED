-- ============================================================
-- 0138 · OPRAVY 436 · skutok charity ↔ jeho príspevok vo feede Domov
-- ------------------------------------------------------------
-- Skutok za charitu sa zverejní dvakrát: do skutok_stranky (profil charity, 0133) a ako príspevok do feedu Domov.
-- Doteraz medzi nimi nebolo prepojenie, takže zmazaný (stiahnutý) skutok ostal vo feede.
-- Appka od OPRAVY 436 ukladá id príspevku do skutku (data.prispevokId) a pri zmazaní ho zmaže aj z feedu.
-- Táto migrácia to doplní starým skutkom:
--   a) prispevokId podľa nadpisu a času zverejnenia (do 2 minút od seba, feed domov),
--   b) príspevky stiahnutých skutkov z feedu preč — len keď na ne nikto nedaroval (žiadny pohyb, platba ani podpora).
-- Idempotentné. Na čistej DB nič nerobí.
-- ============================================================
begin;

-- jedna funkcia (aby ju test vedel spustiť nad vlastnými dátami); spustí sa raz na konci migrácie
create or replace function public.skutok_charity_prepoj() returns void language sql security definer set search_path = public as $$
update public.skutok_stranky s
   set data = s.data || jsonb_build_object('prispevokId', p.id::text)
  from public.prispevok p
 where coalesce(s.data->>'prispevokId', '') = ''
   and p.feed = 'domov'
   and p.titul = s.data->>'nazov'
   and abs(extract(epoch from (p.vytvorene - s.vytvorene))) < 120;
delete from public.prispevok p
 using public.skutok_stranky s
 where s.stiahnuty is not null
   and p.id::text = s.data->>'prispevokId'
   and not exists (select 1 from public.pohyb x where x.case_id = p.id)
   and not exists (select 1 from public.platba x where x.case_id = p.id)
   and not exists (select 1 from public.podpora x where x.prispevok_id = p.id)
   and not exists (select 1 from public.platba_split x where x.case_id = p.id)
   and not exists (select 1 from public.escrow x where x.case_id = p.id)
   and not exists (select 1 from public.opakovana_platba x where x.case_id = p.id)
   and not exists (select 1 from public.retazec_qr x where x.case_id = p.id)
   and not exists (select 1 from public.qr_split x where x.case_id = p.id)
   and not exists (select 1 from public.qr_split_ciel x where x.case_id = p.id);
$$;
revoke all on function public.skutok_charity_prepoj() from public, anon, authenticated;
select from public.skutok_charity_prepoj();

commit;
