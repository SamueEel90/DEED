-- ============================================================
-- Test 0164 — modlitebňa pri šiestich cirkvách, CČSH ako náboženská obec s farárom, dozorca pri 7 cirkvách.
-- ============================================================
begin;
\pset tuples_only on
create temp table t(c text, ok boolean);
insert into t select 'modlitebňa: BJB, CB, KZ, ACS, CASD, ECM', (select count(*) from public.cirkev where miesto = 'modlitebňa' and miesto_a = 'modlitebňu' and kod in ('BJB','CB','KZ','ACS','CASD','ECM')) = 6;
insert into t select 'RKC a ECAV ostávajú kostol', (select count(*) from public.cirkev where miesto = 'kostol' and kod in ('RKC','ECAV')) = 2;
insert into t select 'CČSH: náboženská obec, pán farár / pani farárka, kostol, bez dozorcu', exists (select 1 from public.cirkev where kod = 'CČSH' and jednotka = 'náboženská obec' and vasa = 'Vaša náboženská obec' and oslovenie = 'pán farár' and oslovenie_zena = 'pani farárka' and bohosluzba = 'bohoslužba' and miesto = 'kostol' and not dozorca);
insert into t select 'dozorca pri 7 cirkvách', (select count(*) from public.cirkev where dozorca) = 7;
select ok, c from t order by ok, c;
rollback;
