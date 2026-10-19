-- ============================================================
-- Test 0121 — verejný pohľad zbierky bez rozdelenia a podielu farnosti (OPRAVY 384)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000121f01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000121f01','7e57c000-0000-0000-0000-000000121f01','charita','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t121-far','7e57c100-0000-0000-0000-000000121f01','farnost','Farnosť Test 121',false);
-- bez spúšťačov (overenie účtu, rozdelenie) — testuje sa len pohľad
set session_replication_role = replica;
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, nastavenie) values
 ('zb-121','Pohreb','nabozenstvo','zbierka','aktivna','t121-far','7e57c100-0000-0000-0000-000000121f01',
  '{"nazov":"Pohreb","rozdelenie":[{"druh":"prijemca","ucet":"x","podiel":0.97},{"druh":"overovatel","podiel":0.03}],"overenie_prijemcu":"abc",
    "farnost":{"druh":"pohreb","podiel":3,"prijemca":{"meno":"Pozostalý","ucet":"x"},"podelit":[{"id":"ch","nazov":"Charita","pct":10}]}}');
update public.zbierka set zapecatena = now() where id = 'zb-121';
set session_replication_role = origin;
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role anon;
insert into t select 'anon: bez rozdelenia, podielu farnosti a overenia', (select not (nastavenie ? 'rozdelenie') and not (nastavenie ? 'overenie_prijemcu') and not (nastavenie->'farnost' ? 'podiel')
  and not (nastavenie->'farnost'->'prijemca' ? 'ucet') from public.zbierka_verejna where id = 'zb-121');
insert into t select 'anon: podelenie rodiny ostáva', (select nastavenie->'farnost'->'podelit'->0->>'nazov' = 'Charita' and nastavenie->>'nazov' = 'Pohreb' from public.zbierka_verejna where id = 'zb-121');
reset role;
select ok, c from t order by ok, c;
rollback;
