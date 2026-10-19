-- ============================================================
-- 0122 · OPRAVY 381 — starý vypínač „Veriaci môžu pridávať oznamy“ (oblasť „selfadd“) je preč
-- ------------------------------------------------------------
-- Pridávanie veriacich riadi len „Čo môžu veriaci pridávať“ (oblasť „farniksmie“, Správa → Od veriacich).
-- Farnosti, ktoré mali starý vypínač vypnutý, dostanú všetky kategórie Zakázané (nič sa im neotvorí),
-- potom sa uložené nastavenie „selfadd“ zmaže.
-- ============================================================
begin;

insert into public.naboz_stav (oblast, id, data)
select 'farniksmie', s.id, '{"parte":"zakazane","svadba":"zakazane","ine":"zakazane","oznam":"zakazane","udalost":"zakazane","umysel":"zakazane","fotky":"zakazane","modlitba":"zakazane"}'::jsonb
  from public.naboz_stav s
 where s.oblast = 'selfadd' and coalesce(s.data->>'on', 'true') = 'false'
on conflict (oblast, id) do update set data = excluded.data, upravene = now();

delete from public.naboz_stav where oblast = 'selfadd';

commit;
