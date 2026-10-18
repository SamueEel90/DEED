-- ============================================================
-- 0110 · OPRAVY 353 — push kop cez doménu deedgood.eu (doteraz deed-help.vercel.app, 0088b)
-- ------------------------------------------------------------
-- Ten istý plánovaný job „deed-push-kop“ (cron.schedule s rovnakým menom ho prepíše), len nová adresa.
-- Adresa = hlavná doména vo Verceli: deedgood.eu je presmerovaná (308) na www.deedgood.eu a pg_net
-- presmerovanie pri POST nenasleduje — preto priamo www. Keď sa hlavná doména vo Verceli otočí, treba novú migráciu.
-- ============================================================
begin;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') and exists (select 1 from pg_namespace where nspname = 'net') then
    perform cron.schedule('deed-push-kop', '* * * * *', $c$
      select net.http_post(url := 'https://www.deedgood.eu/api/push', body := '{}'::jsonb, headers := '{"Content-Type":"application/json"}'::jsonb)
       where exists (select 1 from public.notifikacia where push and push_odoslane is null and cas > now() - interval '1 day')$c$);
  end if;
end $$;

commit;
