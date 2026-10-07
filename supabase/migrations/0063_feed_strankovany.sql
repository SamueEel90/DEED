-- ============================================================
-- 0063 · Zadanie 5 · 5.4 — feed nečíta celú tabuľku
-- ------------------------------------------------------------
-- feed_stranka: najviac 50 riadkov, kurzor podľa času (vytvorene + id), okruh v SQL.
-- Okruh = vzdialenosť od stredu, ktorý pošle appka (stred používateľa sa nikam neukladá);
-- príspevky bez polohy (online, celoštátne) prejdú vždy. Poloha v odpovedi je zaokrúhlená
-- (prispevok_feed, 0056) — presné GPS nejde von.
-- ============================================================
begin;

create or replace function public.feed_stranka(
  p_feed text, p_lat double precision default null, p_lng double precision default null, p_km double precision default null,
  p_pred_cas timestamptz default null, p_pred_id uuid default null, p_limit int default 50)
  returns setof public.prispevok_feed
  language sql stable set search_path = public, extensions as $$
  select f.* from public.prispevok_feed f
   where f.feed = p_feed
     and (p_lat is null or p_lng is null or p_km is null or f.lat is null or f.lng is null
          or public.vzdialenost_m(p_lat, p_lng, f.lat, f.lng) <= p_km * 1000)
     and (p_pred_cas is null or (f.vytvorene, f.id) < (p_pred_cas, coalesce(p_pred_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by f.vytvorene desc, f.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 50)
$$;
grant execute on function public.feed_stranka(text, double precision, double precision, double precision, timestamptz, uuid, int) to anon, authenticated;

commit;
