-- ============================================================
-- Test 0169 — sektorové zbierky charity na serveri (koncept, spustenie od P1, verejný pohľad, dary, ukončenie).
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000169a01'), ('7e57c000-0000-0000-0000-000000169b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000169a01','7e57c000-0000-0000-0000-000000169a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000169b01','7e57c000-0000-0000-0000-000000169b01','aktivny','hotovo');
-- Z = Zadarmo, P = P1 (obe spravuje účet a01)
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t169-z','7e57c100-0000-0000-0000-000000169a01','charita','Zadarmo 169',true),
 ('t169-p','7e57c100-0000-0000-0000-000000169a01','charita','P1 169',true);
insert into public.stranka_program (stranka, tier) values ('t169-p', 1);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create function public.t169_chyba(p_sql text) returns text language plpgsql security definer set search_path = public as $$
begin execute p_sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function public.t169_chyba(text) to authenticated;
-- RLS: príkaz s právami volajúceho
create function public.t169_inv(p_sql text) returns text language plpgsql security invoker set search_path = public as $$
begin execute p_sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function public.t169_inv(text) to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000169a01', false);
insert into t select 'správca: koncept sektora sa uloží (RLS)', public.t169_inv($$insert into public.sektor_stranky (id, stranka, oblast, nazov, obsah) values ('sek-t169a','t169-p','osamelí seniori','Seniori','{"popis":"<p>x</p>"}')$$) = 'ok';
insert into t select 'správca: koncept vidí', (select count(*) from public.sektor_stranky where stranka = 't169-p') = 1;
insert into t select 'koncept nie je vo verejnom pohľade', not exists (select 1 from public.sektor_stranky_verejny where id = 'sek-t169a');
insert into t select 'druhý sektor na tú istú oblasť neprejde', public.t169_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t169b','t169-p','Osamelí seniori','Seniori 2')$$) <> 'ok';
insert into t select 'dar na koncept: riadok zbierky nevznikne', public.t169_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id) values ('t169-p:sek-t169a','Seniori','charity','sektor','aktivna','t169-p','7e57c100-0000-0000-0000-000000169a01')$$) = 'Zbierka neexistuje.';
insert into t select 'Zadarmo: koncept sa uloží', public.t169_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t169z','t169-z','útulky','Útulky')$$) = 'ok';
insert into t select 'Zadarmo: spustenie neprejde', public.t169_chyba($$update public.sektor_stranky set spusteny = now() where id = 'sek-t169z'$$) = 'sektor_od_p1';
insert into t select 'P1: spustenie prejde', public.t169_chyba($$update public.sektor_stranky set spusteny = now(), iban = 'SK3112000000198742637541' where id = 'sek-t169a'$$) = 'ok';
insert into t select 'spustený nejde späť do konceptu', public.t169_chyba($$update public.sektor_stranky set spusteny = null where id = 'sek-t169a'$$) = 'ok' and (select spusteny is not null from public.sektor_stranky where id = 'sek-t169a');
insert into t select 'zlý IBAN neprejde', public.t169_chyba($$update public.sektor_stranky set iban = 'xx' where id = 'sek-t169a'$$) <> 'ok';
insert into t select 'dar na spustený: riadok zbierky vznikne', public.t169_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id) values ('t169-p:sek-t169a','Seniori','charity','sektor','aktivna','t169-p','7e57c100-0000-0000-0000-000000169a01')$$) = 'ok';

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000169b01', false);
insert into t select 'cudzí účet: sektory nevidí v tabuľke', not exists (select 1 from public.sektor_stranky where stranka = 't169-p');
insert into t select 'cudzí účet: nezapíše', public.t169_inv($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t169x','t169-p','nepočujúci','Nepočujúci')$$) <> 'ok';
reset role;
insert into t select 'verejný pohľad: spustený je, bez účtu', exists (select 1 from public.sektor_stranky_verejny where id = 'sek-t169a' and not (obsah ? 'ucet'))
  and not exists (select 1 from information_schema.columns where table_name = 'sektor_stranky_verejny' and column_name = 'iban');

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000169a01', false);
insert into t select 'ukončenie sektora prejde', public.t169_chyba($$update public.sektor_stranky set ukonceny = now() where id = 'sek-t169a'$$) = 'ok';
insert into t select 'ukončený sa neotvorí', public.t169_chyba($$update public.sektor_stranky set ukonceny = null where id = 'sek-t169a'$$) = 'sektor_ukonceny';
insert into t select 'po ukončení nový sektor na tú istú oblasť prejde', public.t169_chyba($$insert into public.sektor_stranky (id, stranka, oblast, nazov) values ('sek-t169c','t169-p','osamelí seniori','Seniori')$$) = 'ok';
insert into t select 'koncept bez darov sa dá zmazať', public.t169_chyba($$delete from public.sektor_stranky where id = 'sek-t169c'$$) = 'ok' ;
reset role;
insert into t select 'ukončenie ukončilo aj zbierku', (select stav from public.zbierka where id = 't169-p:sek-t169a') = 'ukoncena';
insert into t select 'ukončený nie je vo verejnom pohľade', not exists (select 1 from public.sektor_stranky_verejny where id = 'sek-t169a');
insert into t select 'zmazaný koncept je preč', not exists (select 1 from public.sektor_stranky where id = 'sek-t169c');

select ok, c from t order by ok, c;
rollback;
