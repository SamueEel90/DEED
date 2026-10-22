-- Test 0156 — centrálna a sektor charity Míľnik preč aj s darmi; Ben a centrálna inej charity ostávajú.
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000156c01'), ('7e57c000-0000-0000-0000-000000156d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000156c01','7e57c000-0000-0000-0000-000000156c01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000156d01','7e57c000-0000-0000-0000-000000156d01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t156-mi','7e57c100-0000-0000-0000-000000156c01','charita','Míľnik, o. z.',true),
 ('t156-in','7e57c100-0000-0000-0000-000000156c01','charita','Iná charita 156',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t156-mi','SK0011000000002612345679','T6','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-156ben','Ben','charity','zbierka','aktivna','t156-mi','7e57c100-0000-0000-0000-000000156c01', now(), '{"ucet":"SK0011000000002612345679","popis":"<p>Ben</p>"}');
insert into public.profil_stranky (stranka, centralna) values ('t156-mi', '{"popis":"<p>Celá činnosť</p>"}'), ('t156-in', '{"popis":"<p>Iná</p>"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000156d01', false);
select public.zbierka_dar_volba('t156-mi:hlavna', 't156-1', 45, 'EUR', 'fiat', 'Martin Š.', 't156-mi', 'Celá činnosť', null, true);
select public.zbierka_dar_volba('t156-mi:t156-mi-sek-seniori', 't156-2', 10, 'EUR', 'fiat', null, 't156-mi', 'Seniori', null, true);
select public.zbierka_dar_volba('zb-156ben', 't156-3', 20, 'EUR', 'fiat', 'Dana', 't156-mi', 'Ben', null, true);
select public.zbierka_dar_volba('t156-in:hlavna', 't156-4', 5, 'EUR', 'fiat', 'Eva', 't156-in', 'Celá činnosť', null, true);
reset role;
insert into t select 'pred: centrálna a sektor Míľnika majú dary', (select count(*) = 2 from public.platba where zbierka like 't156-mi:%');
create temp table po0 as select count(*) n from public.pohyb where platba_id in (select id from public.platba where zbierka in ('zb-156ben','t156-in:hlavna'));
select public.zmaz_centralne_481();
insert into t select 'zbierky hlavna a sektor Míľnika preč', not exists (select 1 from public.zbierka where id like 't156-mi:%');
insert into t select 'dary k nim preč', not exists (select 1 from public.platba where zbierka like 't156-mi:%');
insert into t select 'pohyby darov preč', not exists (select 1 from public.pohyb po where not exists (select 1 from public.platba pl where pl.id = po.platba_id) and po.platba_id is not null);
insert into t select 'centrálna v profile Míľnika preč', (select centralna is null from public.profil_stranky where stranka = 't156-mi');
insert into t select 'Ben ostal aj s darom', exists (select 1 from public.zbierka where id = 'zb-156ben') and exists (select 1 from public.platba where zbierka = 'zb-156ben');
insert into t select 'iná charita ostala', exists (select 1 from public.platba where zbierka = 't156-in:hlavna') and (select centralna is not null from public.profil_stranky where stranka = 't156-in');
insert into t select 'pohyby Bena a inej charity nedotknuté', (select n from po0) = (select count(*) from public.pohyb where platba_id in (select id from public.platba where zbierka in ('zb-156ben','t156-in:hlavna')));
insert into t select 'ledger je znova nemenný', exists (select 1 from pg_trigger where tgname = 'pohyb_nemenny' and tgenabled = 'O');
insert into t select 'druhé spustenie nič nemaže', public.zmaz_centralne_481() like '%zmazané zbierky 0, platby 0%';
insert into t select 'authenticated nevolá', not has_function_privilege('authenticated', 'public.zmaz_centralne_481()', 'execute');
select ok, c from t order by ok, c;
rollback;
