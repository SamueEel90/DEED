-- ============================================================
-- 0098 · OPRAVY 298 — upozornenia farnosti: pribudla kategória „Vypočuj si“ (blok vyp, kód 'vy').
-- Okno „O čom vám dáme vedieť?“ má všetky kategórie podľa blokov stránky, pri farnosti aj pri každom kostole.
-- Mení sa len zoznam povolených kódov (bloky_ok z 0087); tabuľky a nastav_bloky ostávajú.
-- ============================================================
begin;

create or replace function public.bloky_ok(p text[]) returns boolean language sql immutable as $$
  select coalesce(p <@ array['oz','om','pr','po','de','vy','te','sp','mo','ve','zb']::text[], false)
$$;

commit;
