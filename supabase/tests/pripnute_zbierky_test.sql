-- ============================================================
-- Test 0077 — zbierka charity pripnutá na stránke farnosti (OPRAVY 187, KARTA 61 §4)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- C = charita (vlastník zbierky), F = farár, D = darca, X = iný prihlásený
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000000c1'), ('7e57c000-0000-0000-0000-0000000000f1'),
 ('7e57c000-0000-0000-0000-0000000000d1'), ('7e57c000-0000-0000-0000-0000000000e1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000000c1','7e57c000-0000-0000-0000-0000000000c1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000000f1','7e57c000-0000-0000-0000-0000000000f1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000000d1','7e57c000-0000-0000-0000-0000000000d1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000000e1','7e57c000-0000-0000-0000-0000000000e1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t-char','7e57c100-0000-0000-0000-0000000000c1','charita','Testovacia charita',true),
 ('t-far2','7e57c100-0000-0000-0000-0000000000f1','farnost','Testovacia fara 2',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t-char','SK0011000000002612340001','T2','overeny');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel, nastavenie) values
 ('zb-char','Zimná pomoc — test','charity','zbierka','aktivna','t-char','7e57c100-0000-0000-0000-0000000000c1', now(), 1000, '{"ucet":"SK0011000000002612340001"}');
insert into t select 'zbierka charity je v zozname na pripnutie', exists (select 1 from v_zbierky_na_pripnutie where id = 'zb-char' and kto = 'Testovacia charita');

-- X nesmie pripnúť na cudziu stránku
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000e1', false);
do $$ begin
  insert into public.stranka_pripnuta_zbierka (stranka, zbierka) values ('t-far2', 'zb-char');
  insert into t values ('X nesmie pripnut na cudziu stranku', false);
exception when others then insert into t values ('X nesmie pripnut na cudziu stranku', true);
end $$;
-- dar pred pripnutím: zdroj sa nezapíše
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000d1', false);
select (public.zbierka_dar('zb-char', 'p-0', 7, 'EUR', 'fiat', null, null, null, 't-far2'))->>'platba_id' is not null;
reset role;
insert into t select 'bez pripnutia zdroj nie je', (select zdroj_stranka from platba where idem_kluc = 'p-0') is null;

-- F (správca farnosti) pripne
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000f1', false);
insert into public.stranka_pripnuta_zbierka (stranka, zbierka) values ('t-far2', 'zb-char');
-- D daruje cez farnosť a raz priamo
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000d1', false);
select (public.zbierka_dar('zb-char', 'p-1', 30, 'EUR', 'fiat', null, null, null, 't-far2'))->>'platba_id' is not null;
select (public.zbierka_dar('zb-char', 'p-2', 20, 'EUR', 'sepa'))->>'platba_id' is not null;
reset role;
insert into t select 'dar cez farnost nesie zdroj', (select zdroj_stranka from platba where idem_kluc = 'p-1') = 't-far2';
set role anon;
insert into t select 'cez stranku: suma 30 a 1 dar', (public.zbierka_cez_stranku('zb-char', 't-far2')->>'suma')::numeric = 30
  and (public.zbierka_cez_stranku('zb-char', 't-far2')->>'pocet')::int = 1;
insert into t select 'celkova suma zbierky 57', (select sum(vyzbierane) from v_zbierky_na_pripnutie where id = 'zb-char') = 57;
insert into t select 'pripnute vidi kazdy', exists (select 1 from stranka_pripnuta_zbierka where stranka = 't-far2' and zbierka = 'zb-char');
reset role;

-- F odopne
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000f1', false);
delete from public.stranka_pripnuta_zbierka where stranka = 't-far2' and zbierka = 'zb-char';
reset role;
insert into t select 'odopnute', not exists (select 1 from stranka_pripnuta_zbierka where stranka = 't-far2');
insert into t select 'odopnutim sa dar nemeni', (select zdroj_stranka from platba where idem_kluc = 'p-1') = 't-far2';

select ok, c from t order by ok, c;
rollback;
