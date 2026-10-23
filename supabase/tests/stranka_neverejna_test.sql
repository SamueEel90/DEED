-- ============================================================
-- Test 0162 — neverejná stránka: vidí ju len správa, nedá sa na ňu darovať, Zverejniť len plné práva, farnosti začne skúšobná doba.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000162a01'), ('7e57c000-0000-0000-0000-000000162b01'), ('7e57c000-0000-0000-0000-000000162c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000162a01','7e57c000-0000-0000-0000-000000162a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000162b01','7e57c000-0000-0000-0000-000000162b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000162c01','7e57c000-0000-0000-0000-000000162c01','aktivny','hotovo');
-- A = charita neverejná (nová), F = farnosť neverejná (vlastník C), V = verejná charita
insert into public.stranka (id, ucet_id, typ, nazov, testovacia, zverejnena) values
 ('t162-a','7e57c100-0000-0000-0000-000000162a01','charita','Charita 162',true, null),
 ('t162-f','7e57c100-0000-0000-0000-000000162c01','farnost','Farnosť 162',true, null);
insert into public.stranka (id, ucet_id, typ, nazov, testovacia, zverejnena) values ('t162-v','7e57c100-0000-0000-0000-000000162a01','charita','Verejná 162',true, now());
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel) values
 ('t162-z','Strecha','charity','zbierka','aktivna','t162-a','7e57c100-0000-0000-0000-000000162a01', now(), 1000),
 ('t162-zv','Lavice','charity','zbierka','aktivna','t162-v','7e57c100-0000-0000-0000-000000162a01', now(), 1000);
insert into public.profil_stranky (stranka, ulozeny) values ('t162-a', '{"meno":"Charita 162"}');
-- ako RPC v appke (security definer, rola authenticated)
create function public.t162_zaloz() returns void language sql security definer set search_path = public as $$
  insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t162-n','7e57c100-0000-0000-0000-000000162c01','charita','Nová 162',true) $$;
grant execute on function public.t162_zaloz() to authenticated;
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
insert into t select 'nová stránka je neverejná', (select zverejnena is null from public.stranka where id = 't162-a');

set role anon;
insert into t select 'anon nevidí riadok neverejnej stránky', not exists (select 1 from public.stranka where id = 't162-a');
insert into t select 'anon vidí verejnú', exists (select 1 from public.stranka where id = 't162-v');
insert into t select 'anon nevidí profil ani zbierku neverejnej', not exists (select 1 from public.profil_stranky_verejny where stranka = 't162-a') and not exists (select 1 from public.zbierka_verejna where id = 't162-z');
insert into t select 'anon vidí zbierku verejnej', exists (select 1 from public.zbierka_verejna where id = 't162-zv');
insert into t select 'QR: stránka sa pripravuje', public.stranka_pripravuje('t162-a') and not public.stranka_pripravuje('t162-v');
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000162a01', false);
insert into t select 'správca vidí svoju neverejnú stránku a profil', exists (select 1 from public.stranka where id = 't162-a') and exists (select 1 from public.profil_stranky_verejny where stranka = 't162-a');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000162b01', false);
do $$ begin
  perform public.zbierka_dar('t162-z', 'r162-1', 10, 'EUR', 'fiat', 'Eva', null, null, null);
  insert into t values ('dar na zbierku neverejnej stránky neprejde', false);
exception when others then insert into t values ('dar na zbierku neverejnej stránky neprejde', sqlerrm like 'Stránka sa ešte pripravuje%');
end $$;
do $$ begin
  perform public.stranka_zverejni('t162-a');
  insert into t values ('cudzí stránku nezverejní', false);
exception when others then insert into t values ('cudzí stránku nezverejní', true);
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000162a01', false);
select public.stranka_zverejni('t162-a');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000162c01', false);
select public.stranka_zverejni('t162-f');
-- stránka založená v appke je neverejná, zverejnenie appka sama nezmení
select t162_zaloz();
update public.stranka set zverejnena = now() where id = 't162-n';
reset role;
insert into t select 'stránka z appky je neverejná a update ju nezverejní', (select zverejnena is null from public.stranka where id = 't162-n');
insert into t select 'po zverejnení je verejná', (select zverejnena is not null from public.stranka where id = 't162-a');
insert into t select 'farnosť: skúšobná doba od zverejnenia', (select (data->'predplatne'->>'start')::bigint > 0 from public.nastavenia_stranky where stranka = 't162-f');
insert into t select 'charita: skúšobná doba sa nezapisuje', not exists (select 1 from public.nastavenia_stranky where stranka = 't162-a' and data ? 'predplatne');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000162b01', false);
do $$ begin
  perform public.zbierka_dar('t162-z', 'r162-2', 10, 'EUR', 'fiat', 'Eva', null, null, null);
  insert into t values ('po zverejnení dar prejde', true);
exception when others then insert into t values ('po zverejnení dar prejde: ' || sqlerrm, false);
end $$;
reset role;
select ok, c from t order by ok, c;
rollback;
