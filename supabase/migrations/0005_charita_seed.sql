-- DEED · SEED Charita — vygenerované z features/charita/mock.ts
-- Idempotentné: zmaže LEN charita-page riadky (data->>'comp' not null) + adresár.
-- (Spúšťa sa cez Supabase MCP / service role; beží PO 0004_good_seed.)

alter table public.adresar_charita add column if not exists chipy text[];

delete from public.prispevok where data ? 'comp';
delete from public.adresar_charita;

insert into public.prispevok (autor_nazov, modul, typ, kat, titul, popis, emoji, media, lat, lng, lok, narodne, typ_situacie, skore, overene, ciel, vyzbierane, podpora_count, data, vytvorene) values
(NULL, 'charity', 'ziadost', 'Pomoc', NULL, NULL, NULL, '{"fotky":[]}'::jsonb, 48.892, 18.02, NULL, false, 'kriza', 9, false, NULL, NULL, 38, '{"comp":"urgent","zbierka":{"nazov":"Rodina Kováčová","lok":"Trenčín · Zámostie","karma":"Silver","pribeh":"V noci nám zhorel dom, ostali sme bez strechy s dvomi deťmi. Potrebujeme provizórne bývanie a základné veci.","suma":1430,"ciel":2200,"ludia":38,"avatar":"https://i.pravatar.cc/100?img=47","fotky":["https://images.unsplash.com/photo-1542856391-010fb87dcfed?auto=format&fit=crop&w=800&q=60","/img/dom.jpg","https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=60"]}}'::jsonb, now() - interval '0 days'),
(NULL, 'charity', 'charita', 'Zdravie', NULL, NULL, NULL, '{"fotky":[]}'::jsonb, 48.7, 19, NULL, true, 'normal', 8, false, NULL, NULL, 30, '{"comp":"top"}'::jsonb, now() - interval '1 days'),
(NULL, 'charity', 'charita', 'Zdravie2', NULL, NULL, NULL, '{"fotky":[]}'::jsonb, 48.905, 18.03, NULL, false, 'normal', 6, false, NULL, NULL, 8, '{"comp":"mala"}'::jsonb, now() - interval '1 days'),
(NULL, 'charity', 'skutok', 'Priroda', NULL, NULL, NULL, '{"fotky":[]}'::jsonb, 48.905, 18.03, NULL, false, 'normal', 5, false, NULL, NULL, 7, '{"comp":"zapoj"}'::jsonb, now() - interval '0 days'),
(NULL, 'charity', 'skutok', 'Komunita', NULL, NULL, NULL, '{"fotky":[]}'::jsonb, 48.875, 18.03, NULL, false, 'normal', 4, false, NULL, NULL, 5, '{"comp":"material"}'::jsonb, now() - interval '2 days'),
('Hospic Pod Brezinou', 'charity', 'charita', 'Zdravie', 'Hospic Pod Brezinou', 'Zbierka na polohovacie lôžka pre paliatívne oddelenie. Dôstojnosť do poslednej chvíle.', NULL, '{"fotky":["https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=60"]}'::jsonb, 48.895, 18.047, 'Trenčín · centrum', false, 'normal', 6.5, true, 6000, 2380, 34, '{"comp":"data","badgeL":"🕊 PALIATÍVA","tag":"Zdravie"}'::jsonb, now() - interval '0 days'),
('OZ Túlavá labka', 'charity', 'charita', 'Komunita', 'OZ Túlavá labka', 'Krmivo a deky pre 40 psov a mačiek na zimu. Pomôže aj materiálny dar.', NULL, '{"fotky":["https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=800&q=60"]}'::jsonb, 48.87, 18.062, 'Trenčín · okraj', false, 'normal', 5.5, true, 1200, 540, 28, '{"comp":"data","badgeL":"🐾 ÚTULOK","tag":"Zvieratá"}'::jsonb, now() - interval '1 days'),
('OZ Otvorené dvere Trenčín', 'charity', 'charita', 'Pomoc', 'OZ Otvorené dvere Trenčín', 'Nízkoprahová jedáleň vydáva denne 120 teplých obedov ľuďom bez domova. Pred zimou chýbajú zásoby.', NULL, '{"fotky":["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=60"]}'::jsonb, 48.894, 18.046, 'Trenčín · centrum', false, 'normal', 6, true, 2500, 940, 41, '{"comp":"data","badgeL":"🍲 NÚDZA","tag":"Sociálne"}'::jsonb, now() - interval '0 days');

insert into public.adresar_charita (sekcia, skratka, nazov, popis, level, ponuky, chipy, poradie) values
('Zdravie & pacienti', 'NP', 'Nádej pacientom', 'Onkopacienti · celé SR', 'Legend', '💶 🙋', array['Zdravie']::text[], 0),
('Zdravie & pacienti', 'MT', 'Motýlik', 'Detský hospic · SR', 'Gold', '💶', array['Zdravie']::text[], 1),
('Zdravie & pacienti', 'TP', 'Tichý pomocník', 'Rodiny s vážnou chorobou · SR', 'Gold', '💶', array['Zdravie']::text[], 2),
('Zdravie & pacienti', 'ML', 'Malý lúč', 'Deti s rakovinou · Košice', 'Silver', '💶 📦', array['Zdravie']::text[], 3),
('Zdravie & pacienti', 'FDZ', 'Fórum duševného zdravia', 'Psychické zdravie · SR', 'Silver', '💶 🙋', array['Zdravie']::text[], 4),
('Zdravie & pacienti', 'NOC', 'Nadácia Onkocentrum', 'Onkológia · Bratislava', 'Gold', '💶', array['Zdravie']::text[], 5),
('Deti & mládež', 'ND', 'Náruč deťom', 'Deti v náhradnej starostlivosti · SR', 'Gold', '💶 🙋', array['Deti']::text[], 6),
('Deti & mládež', 'DD', 'Detské domovčeky', 'Opustené deti · SR', 'Gold', '💶 🙋', array['Deti']::text[], 7),
('Deti & mládež', 'KT', 'Kvet talentu', 'Talentované rómske deti · SR', 'Silver', '💶', array['Deti']::text[], 8),
('Deti & mládež', 'DKL', 'Detská krízová linka', 'Krízová linka pre deti · SR', 'Gold', '💶 🙋', array['Deti']::text[], 9),
('Deti & mládež', 'FD', 'Fond pre deti SR', 'Ohrozené deti · SR', 'Silver', '💶', array['Deti']::text[], 10),
('Zvieratá', 'ZA', 'Zvieracia archa', 'Útulky · SR', 'Gold', '💶 🙋 📦', array['Zvieratá']::text[], 11),
('Zvieratá', 'TL', 'OZ Túlavá labka', 'Záchrana psov a mačiek · Trenčín', 'Silver', '💶 📦', array['Zvieratá']::text[], 12),
('Zvieratá', 'ZP', 'OZ Zvierací prístav', 'Týrané zvieratá · Bardejov', 'Bronze', '💶 📦', array['Zvieratá']::text[], 13),
('Zvieratá', 'OPZ', 'Ochranca práv zvierat', 'Práva zvierat · SR', 'Silver', '💶 🙋', array['Zvieratá']::text[], 14),
('Príroda & ekológia', 'EK', 'EkoStráž', 'Klíma, lesy · SR', 'Silver', '💶 🙋', array['Príroda']::text[], 15),
('Príroda & ekológia', 'ST', 'Stromosvet', 'Výsadba stromov · SR', 'Bronze', '💶 🙋', array['Príroda']::text[], 16),
('Príroda & ekológia', 'FDP', 'Fond divokej prírody', 'Ochrana prírody · SR', 'Silver', '💶', array['Príroda']::text[], 17),
('Príroda & ekológia', 'BIO', 'Biotop SK', 'Ochrana biotopov · SR', 'Bronze', '💶 🙋', array['Príroda']::text[], 18),
('Sociálne & humanitárna', 'PS', 'Prístrešie SK', 'Ľudia bez domova · Bratislava', 'Silver', '💶 📦 🙋', array['Sociálne', 'Humanitárna']::text[], 19),
('Sociálne & humanitárna', 'UT', 'OZ Útočisko', 'Ľudia bez domova · Bratislava', 'Silver', '💶 🙋', array['Sociálne', 'Humanitárna']::text[], 20),
('Sociálne & humanitárna', 'KPS', 'Katolícka pomoc SR', 'Núdza, humanitárna · SR', 'Gold', '💶 📦 🙋', array['Sociálne', 'Humanitárna']::text[], 21),
('Sociálne & humanitárna', 'PBH', 'Pomoc bez hraníc', 'Humanitárna a rozvojová · SR', 'Gold', '💶', array['Sociálne', 'Humanitárna']::text[], 22),
('Sociálne & humanitárna', 'HSS', 'Humanitárna služba SR', 'Humanitárna, krv · SR', 'Gold', '💶 🙋', array['Sociálne', 'Humanitárna']::text[], 23),
('Sociálne & humanitárna', 'VK', 'OZ Vlastný krok (Krok)', 'Ľudia bez domova · BA', 'Silver', '💶 📦', array['Sociálne', 'Humanitárna']::text[], 24),
('Sociálne & humanitárna', 'DSS', 'Deti sveta SK', 'Deti vo svete · SR', 'Gold', '💶', array['Sociálne', 'Humanitárna']::text[], 25),
('Nevidiaci & hendikep', 'SN', 'Spolok nevidiacich SR', 'Zrakovo postihnutí · SR', 'Gold', '💶 🙋', array['Sociálne']::text[], 26),
('Nevidiaci & hendikep', 'SVN', 'Svetlonos n.o.', 'Hluchoslepí · Bratislava', 'Bronze', '💶 🙋', array['Sociálne']::text[], 27),
('Nevidiaci & hendikep', 'SDS', 'Spolok dystrofikov SR', 'Telesne postihnutí · SR', 'Silver', '💶 🙋', array['Sociálne']::text[], 28),
('Seniori & rodina', 'KS', 'Klub seniorov Sihoť', 'Aktivity pre osamelých seniorov · Trenčín', 'Silver', '🙋 📦', array['Sociálne', 'Seniori']::text[], 29),
('Seniori & rodina', 'RD', 'OZ Rodinka', 'Pomoc rodinám v núdzi · Trenčín', 'Bronze', '💶 📦', array['Sociálne', 'Seniori']::text[], 30),
('Seniori & rodina', 'BP', 'Bezpečný prah', 'Týrané ženy a deti · BA', 'Silver', '💶 🙋', array['Sociálne', 'Seniori']::text[], 31),
('Trenčín a okolie', 'HPB', 'Hospic Pod Brezinou', 'Paliatívna starostlivosť · Trenčín', 'Gold', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 32),
('Trenčín a okolie', 'HSS-TN', 'Humanitárna služba — Trenčín', 'Prvá pomoc, humanitárna · Trenčín', 'Gold', '💶 🙋 📦', array['Trenčín', 'Sociálne']::text[], 33),
('Trenčín a okolie', 'OD', 'OZ Otvorené dvere Trenčín', 'Núdza, jedáleň, nocľaháreň · Trenčín', 'Gold', '💶 📦 🙋', array['Trenčín', 'Sociálne']::text[], 34),
('Trenčín a okolie', 'UPV', 'Útulok Pri Váhu', 'Opustené zvieratá · Trenčín', 'Silver', '💶 📦', array['Trenčín', 'Sociálne']::text[], 35),
('Trenčín a okolie', 'MCL', 'Materské centrum Lienka', 'Rodiny s deťmi · Trenčín', 'Silver', '🙋 📦', array['Trenčín', 'Sociálne']::text[], 36),
('Trenčín a okolie', 'SN-TN', 'Spolok nevidiacich — Trenčín', 'Zrakovo postihnutí · Trenčín', 'Silver', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 37),
('Trenčín a okolie', 'NAD', 'OZ Nádych', 'Onkologickí pacienti · Trenčín', 'Bronze', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 38),
('Trenčín a okolie', 'HPO', 'Hospic Podhorie', 'Paliatívna starostlivosť · Bánovce n. B.', 'Silver', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 39);
