-- ============================================================
-- 0139 · OPRAVY 436 · skutok „Mirka má po štrnástich mesiacoch domov“ preč zo všetkých miest (Martin 20. 10.)
-- ------------------------------------------------------------
-- Vznikol 19. 10. pred 0133 pod nesprávnou charitou (vtedy „OZ Pomoc 173“), ostal len ako príspevok vo feede Domov
-- (a v TOP DNES). Martin ho pridá znova pod Pod korunami. Zmaže sa len vtedy, keď naň nikto nedaroval;
-- inak migrácia nič nezmaže a vypíše prečo. Idempotentné, na čistej DB nič nerobí.
-- ============================================================
begin;
do $$
declare v_id uuid := 'd6d4ef52-f827-49ca-9cf2-6d22565c5187'; v_dary int;
begin
  if not exists (select 1 from public.prispevok where id = v_id) then raise notice '0139: príspevok už nie je'; return; end if;
  select (select count(*) from public.pohyb where case_id = v_id) + (select count(*) from public.platba where case_id = v_id)
       + (select count(*) from public.podpora where prispevok_id = v_id) + (select count(*) from public.platba_split where case_id = v_id)
       + (select count(*) from public.escrow where case_id = v_id) + (select count(*) from public.opakovana_platba where case_id = v_id)
       + (select count(*) from public.retazec_qr where case_id = v_id) + (select count(*) from public.qr_split where case_id = v_id)
       + (select count(*) from public.qr_split_ciel where case_id = v_id) into v_dary;
  if v_dary > 0 then raise notice '0139: NEZMAZANÉ — na skutok sú naviazané dary / platby (%), napíš Martinovi', v_dary; return; end if;
  delete from public.skutok_stranky where data->>'prispevokId' = v_id::text or data->>'nazov' = 'Mirka má po štrnástich mesiacoch domov';
  delete from public.prispevok where id = v_id;
  raise notice '0139: skutok Mirka zmazaný z feedu';
end $$;
commit;
