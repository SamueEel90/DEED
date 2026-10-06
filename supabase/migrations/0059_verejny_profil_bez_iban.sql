-- ============================================================
-- 0059 · Zadanie 4 (kontrola security definer pohľadov) — verejný profil stránky bez IBAN
-- ------------------------------------------------------------
-- profil_stranky_verejny je security definer (číta ho každý). Centrálna zbierka v ňom niesla
-- vlastný účet (centralna.ucet = IBAN) — von. Ostatné stĺpce a ich typy bez zmeny.
-- ============================================================
begin;

create or replace view public.profil_stranky_verejny as
 SELECT p.stranka,
    p.ulozeny,
    p.ulozeny_cas,
    p.centralna - 'ucet' AS centralna,
        CASE
            WHEN s.testovacia OR s.typ = 'farnost'::text OR COALESCE(sp.tier::integer, 0) > 0 THEN p.vzhlad
            ELSE NULL::text
        END AS vzhlad
   FROM profil_stranky p
     LEFT JOIN stranka s ON s.id = p.stranka
     LEFT JOIN stranka_program sp ON sp.stranka = p.stranka
  WHERE p.ulozeny IS NOT NULL OR p.centralna IS NOT NULL OR p.vzhlad IS NOT NULL;

commit;
