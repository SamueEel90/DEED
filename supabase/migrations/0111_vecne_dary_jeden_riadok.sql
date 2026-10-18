-- ============================================================
-- 0111 · OPRAVY 362 — vecná zbierka: jeden darca = jeden riadok v zozname darcov
-- ------------------------------------------------------------
-- Doteraz vecne_dary vracala každý zápis zvlášť: ten istý človek zapísaný 2× (raz bez mena, raz menom)
-- mal v zozname 2 riadky, ale počet ľudí 1. Teraz jeden riadok na účet:
--   meno a čas = posledný zápis (posledná voľba mena), hodnota = súčet jeho zápisov (len pri ukazHodnotu).
-- Počet ľudí = počet riadkov. 'pocet' (počet zápisov) a 'spolu' ostávajú ako boli. Tabuľka sa nemení.
-- ============================================================
begin;

create or replace function public.vecne_dary(p_stranka text, p_zbierka text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare z jsonb := public.vecna_zbierka(p_stranka, p_zbierka); v_ukaz boolean;
begin
  if z is null then return null; end if;
  v_ukaz := coalesce(z->>'ukazHodnotu', 'false') = 'true';
  return jsonb_build_object(
    'pocet', (select count(*) from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka),
    'ludi', (select count(distinct d.ucet_id) from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka),
    'spolu', case when v_ukaz then (select coalesce(sum(d.hodnota), 0) from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka) end,
    'darcovia', (select coalesce(jsonb_agg(jsonb_build_object('meno', q.meno, 'hodnota', case when v_ukaz then q.hodnota end, 'cas', q.vytvorene) order by q.vytvorene desc, q.id desc), '[]'::jsonb)
                 from (select * from (
                         select distinct on (d.ucet_id) d.id, d.meno, d.vytvorene,
                                sum(d.hodnota) over (partition by d.ucet_id) as hodnota
                           from public.vecny_dar d where d.stranka = p_stranka and d.zbierka = p_zbierka
                          order by d.ucet_id, d.vytvorene desc, d.id desc) r
                       order by r.vytvorene desc, r.id desc limit 200) q));
end $$;

revoke all on function public.vecne_dary(text, text) from public;
grant execute on function public.vecne_dary(text, text) to anon, authenticated;

commit;
