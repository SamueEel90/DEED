-- ============================================================
-- Test 0166 — ženské tvary len pri ECAV, RKCr, ECM, CČSH; ACS Pastor; KZ Starší zboru; malé spoločenstvá bez oslovenia.
-- ============================================================
begin;
\pset tuples_only on
create temp table t(c text, ok boolean);
insert into t select 'ženský tvar len pri 4 cirkvách', (select string_agg(kod || '=' || oslovenie_zena, ',' order by kod) from public.cirkev where oslovenie_zena is not null) = 'CČSH=pani farárka,ECAV=sestra farárka,ECM=sestra kazateľka,RKCr=sestra farárka';
insert into t select 'ACS: Pastor, brat pastor', exists (select 1 from public.cirkev where kod = 'ACS' and titul = 'Pastor' and titul_2p = 'pastora' and oslovenie = 'brat pastor');
insert into t select 'KZ: Starší zboru, brat', exists (select 1 from public.cirkev where kod = 'KZ' and titul = 'Starší zboru' and oslovenie = 'brat');
insert into t select 'malé spoločenstvá: duchovný správca, bez oslovenia, miesto stretnutí', (select count(*) from public.cirkev where kod in ('LDS','JS','NAC','SKC','BS') and titul = 'Duchovný správca' and oslovenie is null and jednotka = 'spoločenstvo' and miesto = 'miesto stretnutí') = 5;
insert into t select 'modlitebňa ostáva (0164)', (select count(*) from public.cirkev where miesto = 'modlitebňa') = 6;
select ok, c from t order by ok, c;
rollback;
