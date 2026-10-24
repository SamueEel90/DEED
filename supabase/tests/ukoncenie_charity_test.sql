-- ============================================================
-- Test 0174 — ukončenie zbierky charity na serveri: Vrátiť späť do 15 minút, centrálna zastaví dary, sekcia ako oblasť.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000174a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000174a01','7e57c000-0000-0000-0000-000000174a01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t174','7e57c100-0000-0000-0000-000000174a01','charita','Charita 174',true);
insert into public.stranka_program (stranka, tier) values ('t174', 2);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t174-z','A','charity','zbierka','aktivna','t174','7e57c100-0000-0000-0000-000000174a01', now());
insert into public.profil_stranky (stranka, centralna) values ('t174', '{"spustena":"2026-10-24T08:00:00Z"}');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id) values ('t174:hlavna','Celá činnosť','charity','hlavna','aktivna','t174','7e57c100-0000-0000-0000-000000174a01');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create function public.t174_chyba(p_sql text) returns text language plpgsql security definer set search_path = public as $$
begin execute p_sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function public.t174_chyba(text) to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000174a01', false);
insert into t select 'ručné ukončenie zastaví zbierku na serveri', public.t174_chyba($$select public.ukonci_zbierku('t174-z')$$) = 'ok';
reset role;
insert into t select 'zbierka je ukončená', (select stav from public.zbierka where id = 't174-z') = 'ukoncena';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000174a01', false);
insert into t select 'Vrátiť späť do 15 minút prejde', public.t174_chyba($$select public.obnov_zbierku('t174-z')$$) = 'ok';
reset role;
insert into t select 'zbierka je znova aktívna', (select stav from public.zbierka where id = 't174-z') = 'aktivna';
update public.zbierka set stav = 'ukoncena' where id = 't174-z';
set session_replication_role = replica; -- 0068 by koniec vrátil
update public.zbierka set koniec = now() - interval '16 minutes' where id = 't174-z';
set session_replication_role = origin;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000174a01', false);
insert into t select 'po 15 minútach sa nevráti', public.t174_chyba($$select public.obnov_zbierku('t174-z')$$) = 'vratit_neskoro';
reset role;
update public.profil_stranky set centralna = null where stranka = 't174';
insert into t select 'zmazaná centrálna: zbierka ukončená', (select stav from public.zbierka where id = 't174:hlavna') = 'ukoncena';
update public.profil_stranky set centralna = '{"spustena":"2026-10-24T09:00:00Z"}' where stranka = 't174';
insert into t select 'nová centrálna: zbierka znova aktívna', (select stav from public.zbierka where id = 't174:hlavna') = 'aktivna';
update public.profil_stranky set centralna = '{"popis":"x","spustena":"2026-10-24T09:00:00Z"}' where stranka = 't174';
insert into t select 'úprava bežiacej centrálnej nič nemení', (select stav from public.zbierka where id = 't174:hlavna') = 'aktivna';
insert into t select 'charita bez podskupín: hlavná sekcia ako oblasť', public.oblast_sektora_povolena('t174', 'Zvieratá');
insert into t select 'charita bez podskupín: vymyslená neprejde', not public.oblast_sektora_povolena('t174', 'Niečo');
select ok, c from t order by ok, c;
rollback;
