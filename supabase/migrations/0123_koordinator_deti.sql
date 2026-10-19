-- ============================================================
-- 0123 · OPRAVY 380 (doplnok) — koordinátor detí a mládeže spravuje sekciu Deti a mládež
-- ------------------------------------------------------------
-- Koordinátor zo Správa → Ľudia (rola „Koordinátor detí a mládeže“) deti pozná, preto:
--   1. spravujem_deti(stránka) = správca stránky (0120) alebo koordinátor detí tejto stránky (e-mail v zozname „ludia“).
--   2. naboz_stav: koordinátor zapisuje len oblasť „deti“ (stretnutia, fotky, texty). Ostatné ostáva len správcovi.
--   3. deti_prihlasenie (0119): mená prihlásených detí vidí aj koordinátor.
-- Kontrola je pri každom volaní — po odobratí alebo zmene roly práva hneď stratí.
-- ============================================================
begin;

create or replace function public.spravujem_deti(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select public.spravujem_stranku(p_stranka) or (public.moj_ucet() is not null and exists (
    select 1
      from public.nastavenia_stranky n,
           jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
           auth.users a
     where n.stranka = p_stranka
       and a.id = auth.uid()
       and coalesce(a.email, '') <> ''
       and lower(trim(c->>'k')) = lower(a.email)
       and c->>'r' = 'Koordinátor detí a mládeže'))
$$;
revoke all on function public.spravujem_deti(text) from public, anon;
grant execute on function public.spravujem_deti(text) to authenticated;

drop policy if exists naboz_stav_zapis_spravca on public.naboz_stav;
drop policy if exists naboz_stav_uprava_spravca on public.naboz_stav;
drop policy if exists naboz_stav_mazanie_spravca on public.naboz_stav;
create policy naboz_stav_zapis_spravca on public.naboz_stav for insert to authenticated
  with check (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end);
create policy naboz_stav_uprava_spravca on public.naboz_stav for update to authenticated
  using (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end)
  with check (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end);
create policy naboz_stav_mazanie_spravca on public.naboz_stav for delete to authenticated
  using (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end);

drop policy if exists deti_prihlasenie_citat on public.deti_prihlasenie;
create policy deti_prihlasenie_citat on public.deti_prihlasenie for select to authenticated
  using (ucet = public.moj_ucet() or public.spravujem_deti(stranka));

commit;
