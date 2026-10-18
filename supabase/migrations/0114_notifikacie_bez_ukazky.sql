-- ============================================================
-- 0114 · OPRAVY 365 — zvonček na ostrom bez ukážkových hromadných upozornení
-- ------------------------------------------------------------
-- 0008 vložila ukážkové hromadné upozornenia (ucet_id null: „Jana N. podporila tvoj skutok“, „Peter chce byť tvoj priateľ“…).
-- Videl ich každý a miešali sa so skutočnými (napr. upozornenie na potvrdenie rozdelenia zbierky).
-- Žiadna funkcia hromadné upozornenia nezapisuje (všetky majú ucet_id), takže sa zmažú všetky riadky s ucet_id null.
-- ============================================================
begin;
delete from public.notifikacia where ucet_id is null;
commit;
