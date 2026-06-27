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
('Hospic Milosrdných sestier', 'charity', 'charita', 'Zdravie', 'Hospic Milosrdných sestier', 'Zbierka na polohovacie lôžka pre paliatívne oddelenie. Dôstojnosť do poslednej chvíle.', NULL, '{"fotky":["https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=60"]}'::jsonb, 48.895, 18.047, 'Trenčín · centrum', false, 'normal', 6.5, true, 6000, 2380, 34, '{"comp":"data","badgeL":"🕊 PALIATÍVA","tag":"Zdravie"}'::jsonb, now() - interval '0 days'),
('OZ Túlavá labka', 'charity', 'charita', 'Komunita', 'OZ Túlavá labka', 'Krmivo a deky pre 40 psov a mačiek na zimu. Pomôže aj materiálny dar.', NULL, '{"fotky":["https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=800&q=60"]}'::jsonb, 48.87, 18.062, 'Trenčín · okraj', false, 'normal', 5.5, true, 1200, 540, 28, '{"comp":"data","badgeL":"🐾 ÚTULOK","tag":"Zvieratá"}'::jsonb, now() - interval '1 days'),
('Charita Trenčín', 'charity', 'charita', 'Pomoc', 'Charita Trenčín', 'Nízkoprahová jedáleň vydáva denne 120 teplých obedov ľuďom bez domova. Pred zimou chýbajú zásoby.', NULL, '{"fotky":["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=60"]}'::jsonb, 48.894, 18.046, 'Trenčín · centrum', false, 'normal', 6, true, 2500, 940, 41, '{"comp":"data","badgeL":"🍲 NÚDZA","tag":"Sociálne"}'::jsonb, now() - interval '0 days');

insert into public.adresar_charita (sekcia, skratka, nazov, popis, level, ponuky, chipy, poradie) values
('Zdravie & pacienti', 'LR', 'Liga proti rakovine', 'Onkopacienti · celé SR', 'Legend', '💶 🙋', array['Zdravie']::text[], 0),
('Zdravie & pacienti', 'PL', 'Plamienok', 'Detský hospic · SR', 'Gold', '💶', array['Zdravie']::text[], 1),
('Zdravie & pacienti', 'DA', 'Dobrý anjel', 'Rodiny s vážnou chorobou · SR', 'Gold', '💶', array['Zdravie']::text[], 2),
('Zdravie & pacienti', 'SP', 'Svetielko pomoci', 'Deti s rakovinou · Košice', 'Silver', '💶 📦', array['Zdravie']::text[], 3),
('Zdravie & pacienti', 'LDZ', 'Liga za duševné zdravie', 'Psychické zdravie · SR', 'Silver', '💶 🙋', array['Zdravie']::text[], 4),
('Zdravie & pacienti', 'NOÚ', 'Nadácia NOÚ', 'Onkológia · Bratislava', 'Gold', '💶', array['Zdravie']::text[], 5),
('Deti & mládež', 'ÚD', 'Úsmev ako dar', 'Deti v náhradnej starostlivosti · SR', 'Gold', '💶 🙋', array['Deti']::text[], 6),
('Deti & mládež', 'SOS', 'SOS detské dedinky', 'Opustené deti · SR', 'Gold', '💶 🙋', array['Deti']::text[], 7),
('Deti & mládež', 'DM', 'Divé maky', 'Talentované rómske deti · SR', 'Silver', '💶', array['Deti']::text[], 8),
('Deti & mládež', 'LDI', 'Linka detskej istoty', 'Krízová linka pre deti · SR', 'Gold', '💶 🙋', array['Deti']::text[], 9),
('Deti & mládež', 'DF', 'Detský fond SR', 'Ohrozené deti · SR', 'Silver', '💶', array['Deti']::text[], 10),
('Zvieratá', 'SZ', 'Sloboda zvierat', 'Útulky · SR', 'Gold', '💶 🙋 📦', array['Zvieratá']::text[], 11),
('Zvieratá', 'TL', 'OZ Túlavá labka', 'Záchrana psov a mačiek · Trenčín', 'Silver', '💶 📦', array['Zvieratá']::text[], 12),
('Zvieratá', 'DŠ', 'OZ Druhá šanca', 'Týrané zvieratá · Bardejov', 'Bronze', '💶 📦', array['Zvieratá']::text[], 13),
('Zvieratá', 'ZH', 'Zvierací ombudsman', 'Práva zvierat · SR', 'Silver', '💶 🙋', array['Zvieratá']::text[], 14),
('Príroda & ekológia', 'GP', 'Greenpeace Slovensko', 'Klíma, lesy · SR', 'Silver', '💶 🙋', array['Príroda']::text[], 15),
('Príroda & ekológia', 'ST', 'Stromosvet', 'Výsadba stromov · SR', 'Bronze', '💶 🙋', array['Príroda']::text[], 16),
('Príroda & ekológia', 'WWF', 'WWF Slovensko', 'Ochrana prírody · SR', 'Silver', '💶', array['Príroda']::text[], 17),
('Príroda & ekológia', 'DPH', 'DAPHNE', 'Ochrana biotopov · SR', 'Bronze', '💶 🙋', array['Príroda']::text[], 18),
('Sociálne & humanitárna', 'DP', 'Depaul Slovensko', 'Ľudia bez domova · Bratislava', 'Silver', '💶 📦 🙋', array['Sociálne', 'Humanitárna']::text[], 19),
('Sociálne & humanitárna', 'VG', 'Vagus', 'Ľudia bez domova · Bratislava', 'Silver', '💶 🙋', array['Sociálne', 'Humanitárna']::text[], 20),
('Sociálne & humanitárna', 'SKCH', 'Slovenská katolícka charita', 'Núdza, humanitárna · SR', 'Gold', '💶 📦 🙋', array['Sociálne', 'Humanitárna']::text[], 21),
('Sociálne & humanitárna', 'ČvO', 'Človek v ohrození', 'Humanitárna a rozvojová · SR', 'Gold', '💶', array['Sociálne', 'Humanitárna']::text[], 22),
('Sociálne & humanitárna', 'SČK', 'Slovenský Červený kríž', 'Humanitárna, krv · SR', 'Gold', '💶 🙋', array['Sociálne', 'Humanitárna']::text[], 23),
('Sociálne & humanitárna', 'PP', 'Proti prúdu (Nota bene)', 'Ľudia bez domova · BA', 'Silver', '💶 📦', array['Sociálne', 'Humanitárna']::text[], 24),
('Sociálne & humanitárna', 'UNI', 'UNICEF Slovensko', 'Deti vo svete · SR', 'Gold', '💶', array['Sociálne', 'Humanitárna']::text[], 25),
('Nevidiaci & hendikep', 'ÚN', 'Únia nevidiacich a slabozrakých', 'Zrakovo postihnutí · SR', 'Gold', '💶 🙋', array['Sociálne']::text[], 26),
('Nevidiaci & hendikep', 'MJ', 'Maják n.o.', 'Hluchoslepí · Bratislava', 'Bronze', '💶 🙋', array['Sociálne']::text[], 27),
('Nevidiaci & hendikep', 'OMD', 'Org. muskulárnych dystrofikov', 'Telesne postihnutí · SR', 'Silver', '💶 🙋', array['Sociálne']::text[], 28),
('Seniori & rodina', 'KS', 'Klub seniorov Sihoť', 'Aktivity pre osamelých seniorov · Trenčín', 'Silver', '🙋 📦', array['Sociálne', 'Seniori']::text[], 29),
('Seniori & rodina', 'RD', 'OZ Rodinka', 'Pomoc rodinám v núdzi · Trenčín', 'Bronze', '💶 📦', array['Sociálne', 'Seniori']::text[], 30),
('Seniori & rodina', 'BR', 'Brána do života', 'Týrané ženy a deti · BA', 'Silver', '💶 🙋', array['Sociálne', 'Seniori']::text[], 31),
('Trenčín a okolie', 'HMS', 'Hospic Milosrdných sestier', 'Paliatívna starostlivosť · Trenčín', 'Gold', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 32),
('Trenčín a okolie', 'SČK-TN', 'Červený kríž — ÚS Trenčín', 'Prvá pomoc, humanitárna · Trenčín', 'Gold', '💶 🙋 📦', array['Trenčín', 'Sociálne']::text[], 33),
('Trenčín a okolie', 'CHT', 'Charita Trenčín', 'Núdza, jedáleň, nocľaháreň · Trenčín', 'Gold', '💶 📦 🙋', array['Trenčín', 'Sociálne']::text[], 34),
('Trenčín a okolie', 'MÚT', 'Mestský útulok Trenčín', 'Opustené zvieratá · Trenčín', 'Silver', '💶 📦', array['Trenčín', 'Sociálne']::text[], 35),
('Trenčín a okolie', 'MCS', 'Materské centrum Srdiečko', 'Rodiny s deťmi · Trenčín', 'Silver', '🙋 📦', array['Trenčín', 'Sociálne']::text[], 36),
('Trenčín a okolie', 'ÚNS-TN', 'Únia nevidiacich — Trenčín', 'Zrakovo postihnutí · Trenčín', 'Silver', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 37),
('Trenčín a okolie', 'VAZ', 'OZ Vážka', 'Onkologickí pacienti · Trenčín', 'Bronze', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 38),
('Trenčín a okolie', 'HOB', 'Hospic Bánovce', 'Paliatívna starostlivosť · Bánovce n. B.', 'Silver', '💶 🙋', array['Trenčín', 'Sociálne']::text[], 39);
