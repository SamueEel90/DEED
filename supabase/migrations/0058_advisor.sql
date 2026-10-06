-- ============================================================
-- 0058 · Zadanie 4 · 4.3 (get_advisors) — pevný search_path funkcií, v_escrow cez RLS volajúceho
-- ------------------------------------------------------------
-- Advisor „function_search_path_mutable": každá funkcia v public dostane pevný search_path.
-- v_escrow: security_invoker (escrow vidí len sponzor podľa RLS z 0055).
-- Zámerne ostávajú security definer pohľady s verejnými súčtami (v_vyzbierane, v_top_darcovia,
-- prispevok_feed so zaokrúhlenou polohou, profil_stranky_verejny) — viď správa pre Martina.
-- ============================================================
begin;

do $$ declare r record; begin
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prokind = 'f'
              and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') loop
    execute format('alter function %s set search_path = public, extensions', r.f);
  end loop;
end $$;

alter view public.v_escrow set (security_invoker = true);

commit;
