-- ============================================================
-- 0121 · OPRAVY 384 — verejný pohľad zbierky (zbierka_verejna) bez rozdelenia a podielu farnosti
-- ------------------------------------------------------------
-- 0069b vracala celé nastavenie zbierky okrem účtu a IBAN: aj „rozdelenie“ (príjemca s účtom, podiel overovateľa),
-- „overenie_prijemcu“ a farnost.podiel — to si prečítal aj neprihlásený.
-- Teraz verejne len to, čo vidí darca (ako 0118): bez rozdelenia, bez podielu farnosti, bez overenia príjemcu.
-- Ak sa rodina podelila (farnost.podelit = komu a koľko %), to ostáva — darca to vidí pred darom.
-- Správca a príjemca čítajú celé rozdelenie z tabuliek ako doteraz.
-- ============================================================
begin;

create or replace view public.zbierka_verejna as
  select z.id, z.stranka, z.vs, z.stav, z.zapecatena, z.vytvorene,
         (z.nastavenie - 'iban' - 'ucet' - 'rozdelenie' - 'overenie_prijemcu') #- '{farnost,prijemca,ucet}' #- '{farnost,podiel}' as nastavenie
    from public.zbierka z
   where z.stranka is not null
     and z.zapecatena is not null;
grant select on public.zbierka_verejna to anon, authenticated;

commit;
