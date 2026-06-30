-- ============================================================
-- DEED · Payment Engine — 24h dávkové zúčtovanie cez pg_cron   [Fáza 2]
-- Funkcia `platba_batch_close` je idempotentná → cron (denne 02:00) aj manuálny
-- RPC volajú to isté bez kolízie. Pri studenom projekte beží cron len kým je
-- projekt aktívny; pre demo ostáva manuálny `platba_batch_close()`.
-- ============================================================
create extension if not exists pg_cron;

select cron.schedule('deed-batch-24h', '0 2 * * *', $$select public.platba_batch_close();$$);
