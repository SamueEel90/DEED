-- ============================================================
-- DEED · QR systém — základ (odkazové/identifikačné QR)   [Fáza 1]
-- ------------------------------------------------------------
-- Jedna tabuľka `qr_kod` = mapovanie krátky slug → interný objekt.
-- QR (qrcode lib na klientovi) kóduje URL `…/r/{slug}` (príp. /c, /@, /o…);
-- resolver vráti `objekt_druh + objekt_ref` a appka skočí na živý detail.
-- „QR je živý odkaz, nie zamrznuté dáta“ (QR funk. špec, §2.1).
--
-- POZN. RLS: SELECT verejné (resolver je verejný), zápis TEST-ONLY do
--       napojenia Supabase Auth (Fáza 5) — rovnaká konvencia ako 0003.
-- Identifikátory bez diakritiky (ASCII); hodnoty s diakritikou OK.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create table public.qr_kod (
  id          uuid primary key default gen_random_uuid(),
  typ         text not null default 'static'
                check (typ in ('static','totp')),         -- odkazové vs rotujúce
  objekt_druh text not null
                check (objekt_druh in
                  ('case','handle','org','branch','chain','badge','event')),
  objekt_ref  text not null,                              -- prispevok.id | handle | ucet.id | pobocka.id | chain_id | badge_id | event_id
  slug        text not null unique,                       -- krátky kód v URL (default: slug, nie UUID)
  url         text not null,                              -- materializovaný deep link (canonical)
  modul       text,                                       -- good/help/charity/… (kontext)
  aktivny     boolean not null default true,
  vytvorene   timestamptz not null default now(),
  unique (objekt_druh, objekt_ref)                        -- jedno kanonické QR na objekt
);
comment on table public.qr_kod is 'Odkazové QR — mapovanie krátky slug → interný objekt (živý resolver).';

create index on public.qr_kod (objekt_druh, objekt_ref);
-- slug je unique-indexovaný constraintom → resolver naň ide priamo.

-- ---------- RLS (TEST-ONLY: povoliť všetko pre anon/authenticated) ----------
-- SELECT je verejné zámerne (resolver je verejný). Zápis sa zamkne reálnymi
-- politikami po napojení Supabase Auth (Fáza 5).
do $$
declare t text;
begin
  foreach t in array array['qr_kod'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists test_all_access on public.%I', t);
    execute format(
      'create policy test_all_access on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
