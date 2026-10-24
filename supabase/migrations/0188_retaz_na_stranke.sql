-- ============================================================
-- 0188 · Kontrola 24. 10. · oprava 13 — Prehľad stránky: Reťaz dobra zo servera (nie ukážka)
-- ------------------------------------------------------------
-- Doteraz: rámček „Reťaz dobra“ v Prehľade stránky ukazoval vymyslené mená a sumy z prototypu.
-- Teraz: retaz_na_stranke(stránka) — ľudia (reťaze), ktoré majú v rade zbierku tejto stránky: meno tvorcu, zbierka,
-- podiel, stav v rade a koľko už cez reťaz poslali (ten istý výpočet ako retaz_podporuju, 0094).
-- Dorovnávané zbierky v Prehľade číta appka z dorovnania_nacitaj (0046) podľa stránky — bez novej funkcie.
-- Spúšťa sa po 0187. Idempotentné.
-- ============================================================
begin;

create or replace function public.retaz_na_stranke(p_stranka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('retaz', r.id, 'meno', r.meno, 'robi', r.robi, 'stranka', r.stranka,
           'zbierka', z.id, 'zbierkaNazov', z.nazov, 'pct', p.pct, 'stav', p.stav,
           'bezi', p.stav = 'bezi' and r.ukoncena is null,
           'poslane', coalesce((select sum(case when po.storno_pre is null then po.suma else -po.suma end)
                                  from public.retaz_platba rp join public.pohyb po on po.platba_id = rp.platba_id
                                 where rp.retaz = r.id and rp.zbierka = p.zbierka and po.mena = 'EUR'
                                   and po.typ in ('dar', 'vratenie') and p.ucet in (po.ucet_kredit, po.ucet_debet)), 0))
           order by (p.stav = 'bezi' and r.ukoncena is null) desc, r.zapecatena desc), '[]'::jsonb)
    from public.retaz_polozka p
    join public.retaz r on r.id = p.retaz
    join public.zbierka z on z.id = p.zbierka
   where z.stranka = p_stranka
     and (p.stav = 'bezi' or exists (select 1 from public.retaz_platba rp where rp.retaz = r.id and rp.zbierka = p.zbierka))
$$;
revoke all on function public.retaz_na_stranke(text) from public;
grant execute on function public.retaz_na_stranke(text) to anon, authenticated, service_role;

commit;
