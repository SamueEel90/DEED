-- ============================================================
-- 0137 · OPRAVY 432 · program stránky čitateľný pre verejný profil
-- ------------------------------------------------------------
-- Verejný profil charity ukazuje bloky podľa programu (Zadarmo nemá centrálnu zbierku, pravidelnú podporu
-- ani pracovné ponuky). Program je v stranka_program (0034), čítať ho smel len správca stránky, takže
-- návštevník programu nevedel. Táto funkcia vráti LEN číslo programu (0 Zadarmo … 4), nič iné.
-- Bez riadku = 0 (Zadarmo). Zápis programu sa nemení (len service_role / SQL).
-- Idempotentné.
-- ============================================================
begin;
create or replace function public.program_stranky(p_stranka text) returns smallint
  language sql stable security definer set search_path = public as $$
  select coalesce((select tier from public.stranka_program where stranka = p_stranka), 0)::smallint
$$;
revoke all on function public.program_stranky(text) from public;
grant execute on function public.program_stranky(text) to anon, authenticated;
commit;
