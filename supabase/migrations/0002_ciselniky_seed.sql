-- ============================================================
-- DEED · Naplnenie číselníkov (štartovací set)
--   · cis_zaujmy   — záujmy osoby (§6.2) — úroveň skupín (accordion prehľadný)
--   · cis_segmenty — 10 sektorov charity + pod-segmenty (§6.2)
-- Otvorené číselníky — rastú podľa dopytu (user/charita dopĺňa "vlastný").
-- Idempotentné: on conflict do nothing.
-- ============================================================

-- ---------- ZÁUJMY OSOBY (oblasť → pod-položka) ----------
insert into public.cis_zaujmy (oblast, pod_polozka, poradie) values
  ('Šport','Tímové/loptové',1),('Šport','Raketové',2),('Šport','Beh a vytrvalosť',3),
  ('Šport','Cyklistika',4),('Šport','Vodné športy',5),('Šport','Zimné športy',6),
  ('Šport','Sila/fitness',7),('Šport','Bojové športy',8),('Šport','Outdoor/hory',9),
  ('Šport','Precízne/mentálne',10),('Šport','Pohyb/tanec',11),('Šport','Iné',12),
  ('Hudba','Rock/tvrdšie',1),('Hudba','Pop',2),('Hudba','Rap/hip-hop',3),
  ('Hudba','Elektronická',4),('Hudba','Tradičné',5),('Hudba','Jazz/blues',6),
  ('Hudba','Klasická',7),('Hudba','Svetová',8),
  ('Umenie','Výtvarné',1),('Umenie','Priestorové',2),('Umenie','Fotografia',3),
  ('Umenie','Film/video',4),('Umenie','Scénické',5),('Umenie','Literatúra',6),
  ('Umenie','Dizajn/remeslá',7),('Umenie','Digitálne',8),
  ('Učenie','Jazyky',1),('Učenie','IT/tech',2),('Učenie','Financie/právo',3),
  ('Učenie','Remeslá/praktické',4),('Učenie','Soft skills',5),('Učenie','Veda',6),
  ('Učenie','Doučovanie',7),('Učenie','Technické hobby',8),
  ('Zdravie','Výživa/strava',1),('Zdravie','Pohyb/telo',2),('Zdravie','Duševné zdravie',3),
  ('Zdravie','Prevencia',4),('Zdravie','Závislosti',5),('Zdravie','Skupiny',6),
  ('Eko','Akcie',1),('Eko','Životný štýl',2),('Eko','Zvieratá/príroda',3),
  ('Eko','Udržateľnosť',4),('Eko','Eko pestovanie/záhrada',5)
on conflict (oblast, pod_polozka) do nothing;

-- ---------- SEKTORY CHARITY (sektor → pod-segment) ----------
-- 10 sektorov = free; pod-segmenty = od BASIC.
insert into public.cis_segmenty (sektor, pod_segment, od_balika, poradie) values
  ('Zdravie','onkológia','basic',1),('Zdravie','hospic/paliatíva','basic',2),
  ('Zdravie','vzácne choroby','basic',3),('Zdravie','duševné zdravie','basic',4),
  ('Zdravie','postihnutie/ŤZP','basic',5),('Zdravie','rehabilitácia','basic',6),
  ('Zdravie','prevencia','basic',7),('Zdravie','darcovstvo (krv/orgány)','basic',8),
  ('Zdravie','seniori','basic',9),('Zdravie','liečba jednotlivca (cez charitu)','basic',10),
  ('Zdravie','liečba v zahraničí','basic',11),('Zdravie','zdravotné pomôcky','basic',12),
  ('Zdravie','detské zdravie','basic',13),
  ('Deti','detská rakovina','basic',1),('Deti','vzácne genetické/zriedkavé ochorenia','basic',2),
  ('Deti','krvné ochorenia','basic',3),('Deti','autizmus a neurovývinové poruchy','basic',4),
  ('Deti','choré deti (všeobecne)','basic',5),('Deti','náhradná starostlivosť/siroty','basic',6),
  ('Deti','deti so znevýhodnením','basic',7),('Deti','týrané/zanedbávané deti','basic',8),
  ('Deti','detské domovy','basic',9),('Deti','talentované deti','basic',10),
  ('Deti','voľný čas','basic',11),('Deti','ohrozené rodiny','basic',12),
  ('Deti','predčasniatka','basic',13),('Deti','výživa/prevencia/vakcíny (humanitárne)','basic',14),
  ('Zvieratá','útulky','basic',1),('Zvieratá','túlavé zvieratá','basic',2),
  ('Zvieratá','veterinárna pomoc','basic',3),('Zvieratá','ochrana voľne žijúcich','basic',4),
  ('Zvieratá','kone/hospodárske','basic',5),('Zvieratá','záchranné stanice','basic',6),
  ('Zvieratá','CHKO/ohrozené druhy','basic',7),('Zvieratá','kastračné programy','basic',8),
  ('Príroda','výsadba/lesy','basic',1),('Príroda','čistenie/odpad','basic',2),
  ('Príroda','ochrana vôd','basic',3),('Príroda','biodiverzita','basic',4),
  ('Príroda','klíma/energia','basic',5),('Príroda','environmentálna výchova','basic',6),
  ('Príroda','ochrana pôdy','basic',7),('Príroda','obnova krajiny','basic',8),
  ('Sociálne','ľudia bez domova','basic',1),('Sociálne','chudoba/núdza','basic',2),
  ('Sociálne','týrané osoby (násilie)','basic',3),('Sociálne','závislosti','basic',4),
  ('Sociálne','menšiny/inklúzia','basic',5),('Sociálne','nezamestnaní','basic',6),
  ('Sociálne','dlhová pomoc','basic',7),('Sociálne','osamelí seniori','basic',8),
  ('Sociálne','utečenci/migranti','basic',9),('Sociálne','pamiatka/pohreb','basic',10),
  ('Sociálne','krízová rodina','basic',11),
  ('Vzdelávanie','doučovanie/podpora žiakov','basic',1),('Vzdelávanie','štipendiá','basic',2),
  ('Vzdelávanie','znevýhodnení vo vzdelávaní','basic',3),('Vzdelávanie','digitálna gramotnosť','basic',4),
  ('Vzdelávanie','celoživotné vzdelávanie','basic',5),('Vzdelávanie','komunitné vzdelávanie','basic',6),
  ('Vzdelávanie','školské pomôcky','basic',7),('Vzdelávanie','mimoškolské aktivity','basic',8),
  ('Kultúra','kultúrne dedičstvo','basic',1),('Kultúra','folklór/tradície','basic',2),
  ('Kultúra','umelecké súbory','basic',3),('Kultúra','podpora tvorcov','basic',4),
  ('Kultúra','komunitné akcie','basic',5),('Kultúra','pamiatky','basic',6),
  ('Kultúra','knižnice','basic',7),('Kultúra','divadlo/film','basic',8),
  ('Záchrana','horská služba','basic',1),('Záchrana','vodná záchrana','basic',2),
  ('Záchrana','dobrovoľní hasiči','basic',3),('Záchrana','pátracie tímy','basic',4),
  ('Záchrana','prvá pomoc','basic',5),('Záchrana','krízová intervencia','basic',6),
  ('Záchrana','kynológia (záchranárske psy)','basic',7),
  ('Humanitárna','katastrofy/živly','basic',1),('Humanitárna','vojna/utečenci','basic',2),
  ('Humanitárna','zahraničná pomoc','basic',3),('Humanitárna','potravinová pomoc','basic',4),
  ('Humanitárna','krízová pomoc','basic',5),('Humanitárna','obnova po katastrofe','basic',6),
  ('Humanitárna','humanitárne konvoje','basic',7),
  ('Šport','mládežnícky šport','basic',1),('Šport','šport znevýhodnených (para)','basic',2),
  ('Šport','kluby/oddiely','basic',3),('Šport','pohybové aktivity komunity','basic',4),
  ('Šport','podpora talentov','basic',5),('Šport','školský šport','basic',6),
  ('Šport','seniorský šport','basic',7)
on conflict (sektor, pod_segment) do nothing;
