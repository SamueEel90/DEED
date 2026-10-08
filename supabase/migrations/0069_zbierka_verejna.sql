-- ============================================================
-- 0069 · spustené zbierky stránky vidí aj návštevník
-- ------------------------------------------------------------
-- zbierka má RLS len pre vlastníka a správcu stránky (0035) → návštevník verejného profilu
-- charity / farnosti nedostal z DB žiadnu zbierku (appka ich videla len u správcu).
-- Verejný pohľad: len zapečatené zbierky stránky, bez účtu a IBAN (rovnako ako 0059 pri profile).
-- Zápis ostáva bez zmeny (len správca cez tabuľku).
-- ============================================================
begin;

create or replace view public.zbierka_verejna as
  select z.id, z.stranka, z.vs, z.stav, z.zapecatena, z.vytvorene,
         (z.nastavenie - 'iban' - 'ucet') #- '{farnost,prijemca,ucet}' as nastavenie
    from public.zbierka z
   where z.stranka is not null
     and z.zapecatena is not null;
grant select on public.zbierka_verejna to anon, authenticated;

commit;
