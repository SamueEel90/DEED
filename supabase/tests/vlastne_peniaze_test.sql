-- ============================================================
-- Test 0083 — Vložiť vlastné peniaze do vlastnej zbierky (Spolufinancovanie B), len farár
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- O = účet farnosti, F = farár (štatutár), X = iný prihlásený
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000000ba1'), ('7e57c000-0000-0000-0000-000000000bf1'), ('7e57c000-0000-0000-0000-000000000be1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000000ba1','7e57c000-0000-0000-0000-000000000ba1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000000bf1','7e57c000-0000-0000-0000-000000000bf1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000000be1','7e57c000-0000-0000-0000-000000000be1','aktivny','hotovo');
insert into public.organizacia (ucet_id, nazov, bankovy_ucet) values ('7e57c100-0000-0000-0000-000000000ba1', 'Farnosť Stakčín', 'SK3112000000198742637541');
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('7e57c100-0000-0000-0000-000000000ba1','7e57c100-0000-0000-0000-000000000bf1','test');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('tb-far','7e57c100-0000-0000-0000-000000000ba1','farnost','Farnosť Stakčín',true);
insert into public.stranka_farar (stranka, ucet) values ('tb-far','7e57c100-0000-0000-0000-000000000bf1');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel, nastavenie) values
 ('zbb-vl','Oprava strechy','nabozenstvo','zbierka','aktivna','tb-far','7e57c100-0000-0000-0000-000000000ba1', now(), 10000, '{"ucet":"SK8909000000005122334455","farnost":{"druh":"farnost"}}'),
 ('zbb-hl','Lavice','nabozenstvo','zbierka','aktivna','tb-far','7e57c100-0000-0000-0000-000000000ba1', now(), null, '{"ucet":"SK31 1200 0000 1987 4263 7541","farnost":{"druh":"farnost"}}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000000be1', false);
do $$ begin
  perform public.zbierka_vklad_vlastny('zbb-vl', 3000);
  insert into t values ('X nesmie vlozit vlastne peniaze', false);
exception when others then insert into t values ('X nesmie vlozit vlastne peniaze', true);
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000000bf1', false);
do $$ begin
  perform public.zbierka_vklad_vlastny('zbb-hl', 3000);
  insert into t values ('zbierka na hlavnom ucte nie', false);
exception when others then insert into t values ('zbierka na hlavnom ucte nie', true);
end $$;
create temp table v as select public.zbierka_vklad_vlastny('zbb-vl', 3000) as j;
insert into t select 'vklad caka, VS a ucty', (j->>'stav') = 'caka' and (j->>'vs') is not null and (j->>'z_uctu') = 'SK3112000000198742637541' and (j->>'na_ucet') = 'SK8909000000005122334455' from v;
insert into t select 'kym caka, nie je pohyb', not exists (select 1 from public.platba where zbierka = 'zbb-vl');
do $$ begin
  perform public.zbierka_vklad_vlastny('zbb-vl', 100);
  insert into t values ('druhy prevod kym prvy caka nie', false);
exception when others then insert into t values ('druhy prevod kym prvy caka nie', true);
end $$;
-- testovacia stránka: farár si odsimuluje príchod platby
insert into t select 'potvrdene', (public.zbierka_vklad_potvrd((select (j->>'id')::uuid from v))->>'stav') = 'potvrdene';
reset role;
insert into t select 'je pohyb v ledgeri', exists (select 1 from pohyb po join platba pl on pl.id = po.platba_id where pl.zbierka = 'zbb-vl' and pl.darca_stranka = 'tb-far');
update public.stranka set testovacia = false where id = 'tb-far';
insert into public.zbierka_vklad (zbierka, stranka, suma, vs, z_uctu, na_ucet) values ('zbb-vl','tb-far',50,'T-0000001','A','B');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000000bf1', false);
do $$ begin
  perform public.zbierka_vklad_potvrd((select id from public.zbierka_vklad where vs = 'T-0000001'));
  insert into t values ('ostro potvrdi len server', false);
exception when others then insert into t values ('ostro potvrdi len server', true);
end $$;
set role anon;
insert into t select 'prispievatelia: vlastne 3000', (public.zbierka_prispievatelia('zbb-vl')->0->>'vlastne')::boolean and (public.zbierka_prispievatelia('zbb-vl')->0->>'suma')::numeric = 3000;
insert into t select 'vlastne nie su Prispeli sme', jsonb_array_length(public.stranka_prispela('tb-far')) = 0;
reset role;

select ok, c from t order by ok, c;
rollback;
