-- OPRAVY 94 · Pripnuté v správe stránky: najviac 12 (predtým 6, migrácia 0025). Idempotentné.
alter table public.sprava_piny drop constraint if exists sprava_piny_max6;
alter table public.sprava_piny drop constraint if exists sprava_piny_max12;
alter table public.sprava_piny add constraint sprava_piny_max12 check (coalesce(array_length(piny, 1), 0) <= 12);
