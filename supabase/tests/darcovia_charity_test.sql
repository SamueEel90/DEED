-- Test 0148 — Darcovia charity: 1 účet = 1 kľúč, anonymné bez kľúča, len správca. ROLLBACK na konci, každý riadok ok = t.
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000148c01'), ('7e57c000-0000-0000-0000-000000148d01'), ('7e57c000-0000-0000-0000-000000148e01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000148c01','7e57c000-0000-0000-0000-000000148c01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000148d01','7e57c000-0000-0000-0000-000000148d01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000148e01','7e57c000-0000-0000-0000-000000148e01','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t148-ch','7e57c100-0000-0000-0000-000000148c01','charita','Charita Test 148',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t148-ch','SK0011000000002612345679','T3','overeny');
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-148a','Teplé jedlo','charity','zbierka','aktivna','t148-ch','7e57c100-0000-0000-0000-000000148c01', now(), '{"ucet":"SK0011000000002612345679"}'),
 ('zb-148b','Strecha','charity','zbierka','aktivna','t148-ch','7e57c100-0000-0000-0000-000000148c01', now(), '{"ucet":"SK0011000000002612345679"}');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table r(v jsonb);
grant all on r to public;

-- D dá 2× s menom (dve zbierky) a 1× bez mena; E dá 1× s menom; hosť bez účtu 1×
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000148d01', false);
select public.zbierka_dar_volba('zb-148a', 't148-1', 10, 'EUR', 'fiat', 'Dana K.', 't148-ch', 'Teplé jedlo', null, true);
select public.zbierka_dar_volba('zb-148b', 't148-2', 15, 'EUR', 'fiat', 'Dana K.', 't148-ch', 'Strecha', null, true);
select public.zbierka_dar_volba('zb-148a', 't148-3', 7, 'EUR', 'fiat', null, 't148-ch', 'Teplé jedlo', null, true);
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000148e01', false);
select public.zbierka_dar_volba('zb-148a', 't148-4', 5, 'EUR', 'fiat', 'Eva', 't148-ch', 'Teplé jedlo', null, true);
do $$ begin perform public.stranka_darcovia('t148-ch'); insert into t values ('cudzí nevidí darcov', false);
exception when others then insert into t values ('cudzí nevidí darcov', sqlerrm = 'Darcov vidí len správca stránky.'); end $$;
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select public.zbierka_dar_volba('zb-148b', 't148-5', 3, 'EUR', 'fiat', null, 't148-ch', 'Strecha', null, true);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000148c01', false);
insert into r select public.stranka_darcovia('t148-ch');
reset role;
insert into t select '5 darov', (select jsonb_array_length(v) from r) = 5;
insert into t select 'Dana 2 dary pod jedným kľúčom (25 €)', (select count(distinct e->>'darca') = 1 and count(*) = 2 and sum((e->>'suma')::numeric) = 25 from r, jsonb_array_elements(v) e where e->>'meno' = 'Dana K.');
insert into t select 'Eva má iný kľúč', (select count(distinct e->>'darca') from r, jsonb_array_elements(v) e where e->>'darca' is not null) = 2;
insert into t select 'anonymné 2 dary bez kľúča (10 €)', (select count(*) = 2 and sum((e->>'suma')::numeric) = 10 from r, jsonb_array_elements(v) e where e->>'darca' is null);
insert into t select 'kľúč nie je id účtu', not exists (select 1 from r, jsonb_array_elements(v) e where e->>'darca' like '7e57c%');
insert into t select 'názov zbierky pri dare', exists (select 1 from r, jsonb_array_elements(v) e where e->>'nazov' = 'Strecha');
select ok, c from t order by ok, c;
rollback;
