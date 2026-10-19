-- ============================================================
-- 0112 · OPRAVY 363 — vecná zbierka: staršie zbierky bez voľby „Ukazovať hodnotu“ = Áno
-- ------------------------------------------------------------
-- Voľba ukazHodnotu sa dá po novom meniť aj v Správe vecnej zbierky → Nastavenie (uloží sa do naboz_stav 'vecne').
-- Staršie vecné zbierky túto hodnotu v dátach nemajú; doteraz sa brali ako Nie (darca výber sumy nevidel).
-- Teraz chýbajúca hodnota = Áno, v zápise daru aj v súhrne. Telá funkcií inak bez zmeny (vecne_dary = 0111).
-- ============================================================
begin;

create or replace function public.vecny_dar_zapis(p_stranka text, p_zbierka text, p_meno text, p_hodnota numeric) returns bigint
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); z jsonb; v_id bigint; v_meno text := left(trim(coalesce(p_meno, '')), 120);
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  z := public.vecna_zbierka(p_stranka, p_zbierka);
  if z is null then raise exception 'zbierka_neexistuje' using errcode = 'P0002'; end if;
  if coalesce(z->>'stav', 'aktivna') <> 'aktivna' then raise exception 'zbierka_ukoncena' using errcode = '22023'; end if;
  if v_meno = '' then v_meno := 'Bohu známy veriaci'; end if;
  insert into public.vecny_dar (stranka, zbierka, ucet_id, meno, hodnota)
  values (p_stranka, p_zbierka, v_ja, v_meno,
          case when coalesce(z->>'ukazHodnotu', 'true') = 'true' and p_hodnota > 0 and p_hodnota <= 100000 then round(p_hodnota, 2) end)
  returning id into v_id;
  return v_id;
end $$;


create or replace function public.vecne_dary(p_stranka text, p_zbierka text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare z jsonb := public.vecna_zbierka(p_stranka, p_zbierka); v_ukaz boolean;
begin
  if z is null then return null; end if;
  v_ukaz := coalesce(z->>'ukazHodnotu', 'true') = 'true';
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


revoke all on function public.vecny_dar_zapis(text, text, text, numeric), public.vecne_dary(text, text) from public;
grant execute on function public.vecny_dar_zapis(text, text, text, numeric) to authenticated;
grant execute on function public.vecne_dary(text, text) to anon, authenticated;

commit;
