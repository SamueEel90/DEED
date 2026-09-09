-- DEED · SEED podpora (Fáza D) — in-app dary ako event-log.
-- Idempotentné: zmaže len seed dary (darca_nazov not null), potom vloží.
--   • Demo darca „Martin K." podporuje REÁLNE prispevky (prispevok_id cez subselect)
--     → „Čo podporujem" sa páruje na uuid a detail preklik funguje.
--   • ~10 ďalších darcov = substrát pre živý „Top Darcovia" (group by darca_nazov).
-- kanal: deed|fiat|sms (app DEED→deed, EUR→fiat). Snapshot vyzbierane/ciel na riadku.

delete from public.podpora where darca_nazov is not null;

-- „Martin K." (demo identita) — Čo podporujem (real prispevok_id kde sa dá)
insert into public.podpora (darca_nazov, prispevok_id, prijemca, suma, kanal, vyzbierane, ciel, cas) values
('Martin K.', (select id from public.prispevok where data->>'comp' = 'urgent' limit 1),                'Rodina Kováčová',             50,  'deed', 1430, 2200, now() - interval '2 days'),
('Martin K.', (select id from public.prispevok where autor_nazov = 'Hospic Pod Brezinou' limit 1), 'Hospic Pod Brezinou', 20,  'fiat', 2380, 6000, now() - interval '5 days'),
('Martin K.', (select id from public.prispevok where autor_nazov = 'OZ Otvorené dvere Trenčín' limit 1),         'OZ Otvorené dvere Trenčín',             15,  'deed', 940,  2500, now() - interval '9 days'),
('Martin K.', null,                                                                                     'Motýlik',                   965, 'deed', 8200, 15000, now() - interval '26 days');

-- ostatní darcovia — Top Darcovia (sumárne dary, bez prispevok_id)
insert into public.podpora (darca_nazov, prijemca, suma, kanal, cas) values
('Lukáš H.',  'Nádej pacientom',  1850, 'deed', now() - interval '3 days'),
('Eva K.',    'Náruč deťom',         1420, 'deed', now() - interval '6 days'),
('Zuzana P.', 'Tichý pomocník',            880, 'deed', now() - interval '4 days'),
('Tomáš R.',  'Zvieracia archa',        640, 'deed', now() - interval '8 days'),
('Anonym',    'Prístrešie SK',       510, 'deed', now() - interval '1 days'),
('Jana N.',   'Motýlik',              430, 'deed', now() - interval '7 days'),
('Peter V.',  'Detské domovčeky',     390, 'deed', now() - interval '11 days'),
('Ivana S.',  'EkoStráž',   350, 'deed', now() - interval '13 days'),
('Lucia M.',  'OZ Túlavá labka',        300, 'deed', now() - interval '15 days');
