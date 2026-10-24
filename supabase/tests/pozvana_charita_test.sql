-- ============================================================
-- Test 0173 — pozvaná charita: P3 platí N mesiacov od zverejnenia, potom Zadarmo.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000173a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000173a01','7e57c000-0000-0000-0000-000000173a01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia, zverejnena) values
 ('t173-n','7e57c100-0000-0000-0000-000000173a01','charita','Nezverejnená 173',true, null),
 ('t173-z','7e57c100-0000-0000-0000-000000173a01','charita','Zverejnená 173',true, now() - interval '2 months'),
 ('t173-s','7e57c100-0000-0000-0000-000000173a01','charita','Stará 173',true, now() - interval '7 months'),
 ('t173-b','7e57c100-0000-0000-0000-000000173a01','charita','Bežná P2 173',true, now() - interval '9 months');
insert into public.stranka_program (stranka, tier, pozvana_mesiacov) values ('t173-n', 3, 6), ('t173-z', 3, 6), ('t173-s', 3, 6), ('t173-b', 2, null);
\pset tuples_only on
create temp table t(c text, ok boolean);
insert into t select 'nezverejnená: P3', public.program_stranky('t173-n') = 3;
insert into t select 'zverejnená pred 2 mesiacmi: P3', public.program_stranky('t173-z') = 3;
insert into t select 'zverejnená pred 7 mesiacmi: Zadarmo', public.program_stranky('t173-s') = 0;
insert into t select 'bežný program bez zmeny', public.program_stranky('t173-b') = 2;
insert into t select 'pozvana_stranky: 6 mesiacov, dátum', (select (public.pozvana_stranky('t173-z')->>'mesiacov')::int = 6 and public.pozvana_stranky('t173-z')->>'do' is not null);
insert into t select 'pozvana_stranky: nezverejnená bez dátumu', (select public.pozvana_stranky('t173-n')->>'do' is null);
insert into t select 'pozvana_stranky: bežná null', public.pozvana_stranky('t173-b') is null;
update public.stranka_program set pozvana_mesiacov = 12 where stranka = 't173-s';
insert into t select 'predĺženie na 12 mesiacov: znova P3', public.program_stranky('t173-s') = 3;
select ok, c from t order by ok, c;
rollback;
