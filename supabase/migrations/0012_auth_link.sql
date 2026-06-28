-- DEED · Fáza 5 — Auth link: pripojenie `ucet` ↔ Supabase Auth (email/heslo).
-- Toto kolo: LEN väzba (auth_id). Identita/credentials prejdú na Supabase Auth,
-- onboarding ostáva (auth-first: preskočí telefón-OTP a PIN). `poradove_cislo`
-- je GENERATED ALWAYS AS IDENTITY — nikdy ho neuvádzať v inserte (netýka sa nás).
-- Idempotentné: re-run nič nezmení (IF NOT EXISTS).
--
-- TODO (RLS kolo, nasleduje hneď potom): nahradiť 25× test_all_access (using true)
-- owner-only politikami:
--   · ucet:          using (auth_id = auth.uid())
--   · child tabuľky: using (ucet_id in (select id from ucet where auth_id = auth.uid()))
--   · obsah (prispevok/udalost/adresar_charita/...): public SELECT, zápis len autorovi
alter table public.ucet
  add column if not exists auth_id uuid unique
    references auth.users(id) on delete cascade;

create index if not exists ucet_auth_id_idx on public.ucet(auth_id);
