-- ============================================================
-- 0141 · OPRAVY 442 · skutok charity vo feede Domov nesie svoju stránku
-- ------------------------------------------------------------
-- Skutok za charitu je vo feede ako príspevok (prispevok), autor je správca charity, nie stránka.
-- Väzbu na stránku drží skutok_stranky.data.prispevokId (OPRAVY 436, 0138) — zapisuje ju len správca stránky.
-- prispevok_feed dostane na koniec stĺpec `stranka` (len nestiahnutý skutok). Appka podľa neho:
--   karta ako 426 (logo, štít, mesto charity), detail bez Overujem / Namietam (len skutky userov).
-- Ostatné stĺpce bez zmeny (0134). feed_stranka vracia setof prispevok_feed — znovu vytvorená, telo bez zmeny (0063).
-- ============================================================
begin;

create index if not exists skutok_stranky_prispevok on public.skutok_stranky ((data->>'prispevokId')) where stiahnuty is null;

create or replace view public.prispevok_feed as
 SELECT p.id, p.cislo, p.autor_ucet_id, p.autor_nazov, p.autor_ini, p.autor_pfp, p.autor_karma, p.modul, p.typ, p.kat,
    p.titul, p.popis, p.emoji, p.media,
    round(p.lat::numeric, 2)::double precision AS lat,
    round(p.lng::numeric, 2)::double precision AS lng,
    p.mesto, p.stvrt, p.lok, p.narodne, p.typ_situacie, p.skore, p.overene, p.topovane, p.vyznam, p.ciel,
    p.pomocnici, p.lajky, p.data, p.vytvorene, p.aktualizovane, p.ukoncene,
    v.vyzbierane_eur AS vyzbierane,
    COALESCE(v.vyzbierane_deed, 0::numeric) AS vyzbierane_deed,
    COALESCE(v.pocet_darov, 0::bigint)::integer AS podpora_count,
    p.feed,
    p.vs,
    (select s.stranka from public.skutok_stranky s
      where s.data->>'prispevokId' = p.id::text and s.stiahnuty is null
      order by s.vytvorene limit 1) AS stranka
   FROM prispevok p
     LEFT JOIN v_vyzbierane v ON v.case_id = p.id;
grant select on public.prispevok_feed to anon, authenticated;

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
