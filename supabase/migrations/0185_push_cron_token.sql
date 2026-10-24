-- ============================================================
-- 0185 · Kontrola 24. 10. · R7 — pg_cron volá /api/push s heslom (hlavička x-cron-token)
-- ------------------------------------------------------------
-- Doteraz: POST /api/push bez akejkoľvek kontroly — ktokoľvek ho mohol volať v slučke a míňať kvótu Vercelu
-- a push služby (nič nepoškodil, poslal len čakajúce).
-- Teraz: ten istý job „deed-push-kop“ (0088b → 0110; cron.schedule s rovnakým menom ho prepíše), len s hlavičkou
-- x-cron-token. Heslo je v Supabase Vault pod menom push_cron_token — to isté, čo je vo Verceli ako PUSH_CRON_TOKEN.
-- Kým vo Vaulte nie je, hlavička je prázdna a /api/push vráti 401 → push sa neposiela (nič sa nestratí: notifikácie
-- čakajú v DB, pošlú sa po doplnení hesla). Postup (Samuel, SQL editor Supabase):
--   select vault.create_secret('<to isté heslo ako PUSH_CRON_TOKEN vo Verceli>', 'push_cron_token');
-- Spúšťa sa po 0184. Idempotentné.
-- ============================================================
begin;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') and exists (select 1 from pg_namespace where nspname = 'net') then
    perform cron.schedule('deed-push-kop', '* * * * *', $c$
      select net.http_post(url := 'https://www.deedgood.eu/api/push', body := '{}'::jsonb,
               headers := jsonb_build_object('Content-Type', 'application/json',
                 'x-cron-token', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_token' limit 1), '')))
       where exists (select 1 from public.notifikacia where push and push_odoslane is null and cas > now() - interval '1 day')$c$);
  end if;
end $$;

commit;
