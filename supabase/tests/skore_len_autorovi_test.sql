-- ============================================================
-- Test 0183 — AI skóre sa pripne len k behu autora skutku. Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000183d01'), ('7e57c000-0000-0000-0000-000000183d02');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000183d01','7e57c000-0000-0000-0000-000000183d01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000183d02','7e57c000-0000-0000-0000-000000183d02','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000183d01', 'Adam', 'Prvý'), ('7e57c100-0000-0000-0000-000000183d02', 'Boris', 'Druhý');
insert into public.zobrazenie (ucet_id, rezim) values ('7e57c100-0000-0000-0000-000000183d01', 'cele'), ('7e57c100-0000-0000-0000-000000183d02', 'cele');   -- 0182: príspevok len s menom
-- behy AI: môj (d01), cudzí (d02), starý (d01, pred 2 dňami), anonymný (ip)
insert into public.scoring_log (run_id, user_id, config_version, verdikt, vstup, dopocitane, ts) values
 ('18300000-0000-0000-0000-00000000aa01', '7e57c100-0000-0000-0000-000000183d01', 'v1', 'ok', '{"opis":"x"}', '{"skore": 7.5, "pasmo": 2}', now()),
 ('18300000-0000-0000-0000-00000000aa02', '7e57c100-0000-0000-0000-000000183d02', 'v1', 'ok', '{"opis":"x"}', '{"skore": 9.9, "pasmo": 3}', now()),
 ('18300000-0000-0000-0000-00000000aa03', '7e57c100-0000-0000-0000-000000183d01', 'v1', 'ok', '{"opis":"x"}', '{"skore": 8.0, "pasmo": 2}', now() - interval '2 days'),
 ('18300000-0000-0000-0000-00000000aa04', 'ip:abcdef', 'v1', 'ok', '{"opis":"x"}', '{"skore": 9.0, "pasmo": 3}', now());
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000183d01', false);
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, score_run_id, skore, overene, karma) values
 ('18300000-0000-0000-0000-000000000001', 'good', 'skutok', 'Môj beh', '7e57c100-0000-0000-0000-000000183d01', '18300000-0000-0000-0000-00000000aa01', 11, true, 999),
 ('18300000-0000-0000-0000-000000000002', 'good', 'skutok', 'Cudzí beh', '7e57c100-0000-0000-0000-000000183d01', '18300000-0000-0000-0000-00000000aa02', 11, true, 999),
 ('18300000-0000-0000-0000-000000000003', 'good', 'skutok', 'Starý beh', '7e57c100-0000-0000-0000-000000183d01', '18300000-0000-0000-0000-00000000aa03', 11, true, 999),
 ('18300000-0000-0000-0000-000000000004', 'good', 'skutok', 'Anonymný beh', '7e57c100-0000-0000-0000-000000183d01', '18300000-0000-0000-0000-00000000aa04', 11, true, 999);
reset role;
insert into t select 'moj beh: skore 7,5, overene, karma 75', (select skore = 7.5 and overene and karma = 75 and score_run_id is not null from public.prispevok where id = '18300000-0000-0000-0000-000000000001');
insert into t select 'cudzi beh: 0, neoverene, bez behu', (select skore = 0 and not overene and karma is null and score_run_id is null from public.prispevok where id = '18300000-0000-0000-0000-000000000002');
insert into t select 'stary beh: 0, bez behu', (select skore = 0 and score_run_id is null from public.prispevok where id = '18300000-0000-0000-0000-000000000003');
insert into t select 'anonymny beh: 0, bez behu', (select skore = 0 and score_run_id is null from public.prispevok where id = '18300000-0000-0000-0000-000000000004');
insert into t select 'klient hodnoty z appky nikdy nepresadi', not exists (select 1 from public.prispevok where id::text like '18300000-%' and (skore = 11 or karma = 999));

select ok, c from t order by ok, c;
rollback;
