-- ============================================================
-- 0120 · OPRAVY 380 — ľudia zo Správy → Ľudia s rolou, ktorá smie spravovať, sú správcovia stránky
-- ------------------------------------------------------------
-- Po 0115 zapisuje stav farnosti len spravujem_stranku (vlastník stránky alebo štatutár organizácie).
-- Kaplán a ďalší, ktorých farár pridal v Správa → Ľudia (nastavenia_stranky, kľúč „ludia“: { k: e-mail, r: rola }),
-- nemali práva. Teraz spravujem_stranku navyše pustí účet, ktorého e-mail je v zozname „ludia“ s rolou,
-- ktorá smie spravovať: všetky okrem Kostolník / pomocník, Koordinátor detí a mládeže, Účtovník.
-- Kontrola je pri každom volaní — keď farár človeka odoberie (alebo mu zmení rolu), práva hneď stratí.
-- Ručné priradenie (statutar) netreba.
-- ============================================================
begin;

create or replace function public.spravujem_stranku(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select public.moj_ucet() is not null and (
    exists (
      select 1 from public.stranka s
      where s.id = p_stranka
        and (s.ucet_id = public.moj_ucet()
             or exists (select 1 from public.statutar t where t.org_ucet_id = s.ucet_id and t.osoba_ucet_id = public.moj_ucet())))
    or exists (
      select 1
        from public.nastavenia_stranky n,
             jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
             auth.users a
       where n.stranka = p_stranka
         and a.id = auth.uid()
         and coalesce(a.email, '') <> ''
         and lower(trim(c->>'k')) = lower(a.email)
         and coalesce(c->>'r', '') not in ('Kostolník / pomocník', 'Koordinátor detí a mládeže', 'Účtovník')))
$$;

commit;
