-- ============================================================
-- Test 0172 — limit zbierok charity je súčet: P1 = 4 (centrálna + sektory + bežné), P3 bez limitu.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000172a01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000172a01','7e57c000-0000-0000-0000-000000172a01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t172-p','7e57c100-0000-0000-0000-000000172a01','charita','P1 172',true),
 ('t172-v','7e57c100-0000-0000-0000-000000172a01','charita','P3 172',true);
insert into public.stranka_program (stranka, tier) values ('t172-p', 1), ('t172-v', 3);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create function public.t172_chyba(p_sql text) returns text language plpgsql security definer set search_path = public as $$
begin execute p_sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function public.t172_chyba(text) to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000172a01', false);

insert into t select 'P1: centrálna (1)', public.t172_chyba($$insert into public.profil_stranky (stranka, centralna) values ('t172-p', '{"spustena":"2026-10-23T12:00:00Z"}')$$) = 'ok';
insert into t select 'P1: sektor (2)', public.t172_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov, spusteny) values ('sek-t172a','t172-p','útulky','Útulky', now())$$) = 'ok';
insert into t select 'P1: dve bežné (3, 4)', public.t172_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t172-p1','A','charity','zbierka','aktivna','t172-p','7e57c100-0000-0000-0000-000000172a01', now()), ('t172-p2','B','charity','zbierka','aktivna','t172-p','7e57c100-0000-0000-0000-000000172a01', now())$$) = 'ok';
insert into t select 'P1: piata bežná neprejde', public.t172_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t172-p3','C','charity','zbierka','aktivna','t172-p','7e57c100-0000-0000-0000-000000172a01', now())$$) = 'limit_zbierok';
insert into t select 'P1: piaty ako sektor neprejde', public.t172_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov, spusteny) values ('sek-t172b','t172-p','nepočujúci','Nepočujúci', now())$$) = 'limit_zbierok';
insert into t select 'P1: koncept sektora prejde (nebeží)', public.t172_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t172c','t172-p','autizmus','Autizmus')$$) = 'ok';
insert into t select 'P1: úprava bežiacej centrálnej prejde', public.t172_chyba($$update public.profil_stranky set centralna = '{"popis":"y","spustena":"2026-10-23T12:00:00Z"}' where stranka = 't172-p'$$) = 'ok';
insert into t select 'P1: po ukončení bežnej sa sektor spustí', public.t172_chyba($$update public.zbierka set stav = 'ukoncena' where id = 't172-p1'; update public.sektor_stranky set spusteny = now() where id = 'sek-t172c'$$) = 'ok';
insert into t select 'P3: šesť bežných prejde', public.t172_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) select 't172-v' || g, 'V', 'charity', 'zbierka', 'aktivna', 't172-v', '7e57c100-0000-0000-0000-000000172a01', now() from generate_series(1, 6) g$$) = 'ok';
reset role;
insert into t select 'server (postgres) obíde limit', (select public.t172_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t172-p9','S','charity','zbierka','aktivna','t172-p','7e57c100-0000-0000-0000-000000172a01', now())$$)) = 'ok';

select ok, c from t order by ok, c;
rollback;
