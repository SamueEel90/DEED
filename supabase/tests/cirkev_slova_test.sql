-- ============================================================
-- Test 0163 — číselník cirkví má výrazy pre sprievodcu (jednotka, bohoslužba, miesto) pri každej cirkvi.
-- ============================================================
begin;
\pset tuples_only on
create temp table t(c text, ok boolean);
insert into t select 'každá cirkev má jednotku, bohoslužbu aj miesto', not exists (select 1 from public.cirkev where jednotka is null or vasa is null or bohosluzba is null or bohosluzby is null or miesto is null or miesto_a is null);
insert into t select 'RKC: farnosť, sväté omše, kostol', exists (select 1 from public.cirkev where kod = 'RKC' and vasa = 'Vaša farnosť' and bohosluzby = 'sväté omše' and miesto = 'kostol');
insert into t select 'ÚZŽNO: synagógu, nie kostol', exists (select 1 from public.cirkev where kod = 'ÚZŽNO' and miesto_a = 'synagógu' and jednotka = 'náboženská obec');
insert into t select 'GKC: svätá liturgia v chráme', exists (select 1 from public.cirkev where kod = 'GKC' and bohosluzba = 'svätá liturgia' and miesto = 'chrám');
select ok, c from t order by ok, c;
rollback;
