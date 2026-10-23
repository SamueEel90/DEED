-- ============================================================
-- 0164 · Svetlúšik · číselník cirkví podľa Soni (23. 10.)
-- 1) Modlitebňa namiesto kostola: BJB, CB, KZ, ACS, CASD (adventisti), ECM. Ostatné ostávajú, ako sú (kostol · chrám · synagóga).
-- 2) CČSH: náboženská obec · pán farár / pani farárka · bohoslužba · kostol · bez dozorcu.
--    Nový stĺpec oslovenie_zena (zatiaľ len CČSH) — appka ho zatiaľ nepoužíva, nevie, či je duchovný muž alebo žena.
-- Dozorca ostáva podľa 0078 (7 cirkví). Spúšťa sa po 0163.
-- ============================================================
begin;

update public.cirkev set miesto = 'modlitebňa', miesto_a = 'modlitebňu'
 where kod in ('BJB', 'CB', 'KZ', 'ACS', 'CASD', 'ECM');

alter table public.cirkev add column if not exists oslovenie_zena text;

update public.cirkev set
  titul = 'Farár', titul_2p = 'farára', jednotka_2p = 'náboženskej obce',
  oslovenie = 'pán farár', oslovenie_zena = 'pani farárka', dozorca = false,
  jednotka = 'náboženská obec', vasa = 'Vaša náboženská obec',
  bohosluzba = 'bohoslužba', bohosluzby = 'bohoslužby', miesto = 'kostol', miesto_a = 'kostol'
 where kod = 'CČSH';

commit;
