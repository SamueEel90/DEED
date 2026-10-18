-- ============================================================
-- 0102 · OPRAVY 334 — štatistika Editora oznámení pozná aj typ „ine“
-- (Ďakovný list, Ocenenie za službu, Poďakovanie dobrovoľníkom, Pozvánka, Vlastné).
-- Bez toho by editor_zapis pri type „ine“ zlyhal na kontrole a uloženie Iné by v štatistike chýbalo.
-- ============================================================
begin;

alter table public.editor_vytvorenia drop constraint if exists editor_vytvorenia_typ_check;
alter table public.editor_vytvorenia add constraint editor_vytvorenia_typ_check
  check (typ in ('parte', 'svadba', 'jubileum', 'blahozelanie', 'ine'));

commit;
