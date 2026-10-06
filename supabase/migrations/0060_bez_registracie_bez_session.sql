-- ============================================================
-- 0060 · Zrušený starý registračný tok bez prihlásenia
-- ------------------------------------------------------------
-- Účet vzniká len auth-first (session najprv, auth_id = auth.uid()). ucet_s_telefonom zakladal účet
-- bez prihlásenia (bez auth_id) — po RLS (0055) by s ním appka už nič nespravila. Volať ho smie len server.
-- ============================================================
begin;
revoke all on function public.ucet_s_telefonom(text, text, text) from public, anon, authenticated;
grant execute on function public.ucet_s_telefonom(text, text, text) to service_role;
commit;
