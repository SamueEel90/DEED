-- OPRAVY 95 · zbalené sekcie Prehľadu v správe stránky (mobil, tablet) — pamätá sa v účte správcu. Idempotentné.
alter table public.sprava_piny add column if not exists zbalene jsonb not null default '{}'::jsonb;
