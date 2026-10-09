-- ============================================================
-- Test 0074b + 0075b — dar bez prihlásenia (len karta / SEPA) a skrytá suma zbierky rodiny (KARTA 57 A.7)
-- Spustiť po migráciách: psql -f supabase/tests/zbierka_rodiny_test.sql
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- P = príjemca (pozostalý), F = farár (overovateľ, správca stránky), D = darca, X = iný prihlásený
insert into auth.users (id) values ('7e57b000-0000-0000-0000-0000000000a1'), ('7e57b000-0000-0000-0000-0000000000f1'),
 ('7e57b000-0000-0000-0000-0000000000d1'), ('7e57b000-0000-0000-0000-0000000000e1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57b100-0000-0000-0000-0000000000a1','7e57b000-0000-0000-0000-0000000000a1','aktivny','hotovo'),
 ('7e57b100-0000-0000-0000-0000000000f1','7e57b000-0000-0000-0000-0000000000f1','charita','hotovo'),
 ('7e57b100-0000-0000-0000-0000000000d1','7e57b000-0000-0000-0000-0000000000d1','aktivny','hotovo'),
 ('7e57b100-0000-0000-0000-0000000000e1','7e57b000-0000-0000-0000-0000000000e1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t-fara','7e57b100-0000-0000-0000-0000000000f1','farnost','Testovacia fara',true);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t-fara','SK0011000000002612345678','T1','overeny');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- zbierka rodiny: 97 % príjemca P, 3 % farnosť (overovateľ)
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-rodina','Pohreb — test','nabozenstvo','zbierka','aktivna','t-fara','7e57b100-0000-0000-0000-0000000000f1', now(),
  '{"ucet":"SK0011000000002612345678","rozdelenie":[{"druh":"prijemca","ucet":"7e57b100-0000-0000-0000-0000000000a1","text":"Pozostalý","podiel":0.97},{"druh":"overovatel","podiel":0.03}]}');
insert into t select 'zbierka rodiny ma prijemcu v zbierka_podiel', exists (select 1 from zbierka_podiel where zbierka = 'zb-rodina' and druh = 'prijemca');

-- 0074b · neprihlásený: karta a SEPA áno, DeeD nie
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select (public.zbierka_dar('zb-rodina', 'anon-1', 50, 'EUR', 'fiat'))->>'platba_id' is not null;
select (public.zbierka_dar('t-fara:hlavna', 'anon-2', 20, 'EUR', 'sepa', null, 't-fara', 'Hlavná zbierka'))->>'platba_id' is not null;
reset role;
insert into t select 'anon: dar kartou na zbierku rodiny je v ledgeri', exists (select 1 from platba where idem_kluc = 'anon-1' and zbierka = 'zb-rodina' and odosielatel is null);
insert into t select 'anon: SEPA na hlavnu zbierku stranky je v ledgeri', exists (select 1 from platba where idem_kluc = 'anon-2' and zbierka = 't-fara:hlavna');
set role anon;
do $$ begin
  perform public.zbierka_dar('zb-rodina', 'anon-3', 5, 'DEED', 'deed');
  insert into t values ('anon: DeeD bez prihlasenia odmietnuty', false);
exception when others then
  insert into t values ('anon: DeeD bez prihlasenia odmietnuty', sqlerrm = 'neprihlaseny');
end $$;
reset role;

-- D daruje prihlásený
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-0000000000d1', false);
select (public.zbierka_dar('zb-rodina', 'd-1', 100, 'EUR', 'fiat'))->>'platba_id' is not null;
insert into t select 'darca D vidi sumy', not coalesce((public.zbierka_dary('zb-rodina')->>'skryte')::boolean, false)
  and (public.zbierka_dary('zb-rodina')->'sucty'->>'EUR')::numeric > 0;
insert into t select 'darca D vidi vyzbierane', exists (select 1 from v_zbierka_vyzbierane where zbierka = 'zb-rodina');

-- X (prihlásený, nedaroval): len počet
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-0000000000e1', false);
insert into t select 'X bez daru: skryte, ziadne sumy, ziadni darcovia',
  (public.zbierka_dary('zb-rodina')->>'skryte')::boolean and public.zbierka_dary('zb-rodina')->'sucty' = '{}'::jsonb
  and jsonb_array_length(public.zbierka_dary('zb-rodina')->'dary') = 0;
insert into t select 'X bez daru: pocet darov ostava', (public.zbierka_dary('zb-rodina')->>'pocet')::int = 2;
insert into t select 'X bez daru: vyzbierane nevidi', not exists (select 1 from v_zbierka_vyzbierane where zbierka = 'zb-rodina');

-- F (farár, overovateľ): ako X (KARTA 57 A.6)
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-0000000000f1', false);
insert into t select 'farar (overovatel) sumy nevidi', (public.zbierka_dary('zb-rodina')->>'skryte')::boolean;

-- P (príjemca): všetko
select set_config('request.jwt.claim.sub', '7e57b000-0000-0000-0000-0000000000a1', false);
insert into t select 'prijemca vidi sumy aj darcov', not coalesce((public.zbierka_dary('zb-rodina')->>'skryte')::boolean, false)
  and jsonb_array_length(public.zbierka_dary('zb-rodina')->'dary') = 2;
reset role;

-- neprihlásený: zbierka rodiny skrytá, bežná zbierka stránky bez zmeny
set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into t select 'anon: zbierka rodiny skryta', (public.zbierka_dary('zb-rodina')->>'skryte')::boolean;
insert into t select 'anon: bezna zbierka ukazuje sumy', not coalesce((public.zbierka_dary('t-fara:hlavna')->>'skryte')::boolean, false)
  and (public.zbierka_dary('t-fara:hlavna')->'sucty'->>'EUR')::numeric = 20;
insert into t select 'anon: bezna zbierka vo vyzbierane', exists (select 1 from v_zbierka_vyzbierane where zbierka = 't-fara:hlavna');
reset role;

select ok, c from t order by ok, c;

rollback;
