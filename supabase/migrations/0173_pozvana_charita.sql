-- ============================================================
-- 0173 · Balík 50 bod 3 (Martin 23. 10.) · pozvaná charita: P3 zadarmo N mesiacov od zverejnenia stránky
-- ------------------------------------------------------------
-- Tester (a ďalšia Martinova charita) má P3 zadarmo 6 mesiacov od zverejnenia stránky (nie 2 mesiace od registrácie).
-- stranka_program.pozvana_mesiacov (null = bežný program): kým stránka nie je zverejnená, platí tier bez obmedzenia;
-- od zverejnenia + N mesiacov program_stranky vráti 0 (Zadarmo). Predĺženie = Samuel zvýši pozvana_mesiacov.
-- Zapisuje len server (ako tier, 0034). Nová pozvana_stranky(stránka) → { mesiacov, do } pre appku (anon, authenticated).
-- Idempotentné.
-- ============================================================
begin;

alter table public.stranka_program add column if not exists pozvana_mesiacov smallint check (pozvana_mesiacov is null or pozvana_mesiacov between 1 and 60);

create or replace function public.program_stranky(p_stranka text) returns smallint
  language sql stable security definer set search_path = public as $$
  select coalesce((
    select case when sp.pozvana_mesiacov is not null and s.zverejnena is not null
                     and now() >= s.zverejnena + make_interval(months => sp.pozvana_mesiacov) then 0
                else sp.tier end
      from public.stranka_program sp left join public.stranka s on s.id = sp.stranka
     where sp.stranka = p_stranka), 0)::smallint
$$;
revoke all on function public.program_stranky(text) from public;
grant execute on function public.program_stranky(text) to anon, authenticated;

create or replace function public.pozvana_stranky(p_stranka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select case when sp.pozvana_mesiacov is null then null else jsonb_build_object(
           'mesiacov', sp.pozvana_mesiacov,
           'do', case when s.zverejnena is null then null else s.zverejnena + make_interval(months => sp.pozvana_mesiacov) end) end
    from public.stranka_program sp left join public.stranka s on s.id = sp.stranka
   where sp.stranka = p_stranka
$$;
revoke all on function public.pozvana_stranky(text) from public;
grant execute on function public.pozvana_stranky(text) to anon, authenticated;

commit;
