-- ============================================================
-- Test 0080 — farnosť prispeje na cudziu zbierku (OPRAVY 222)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- C = charita, F = farár (správca farnosti), X = iný prihlásený
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000008c1'), ('7e57c000-0000-0000-0000-0000000008f1'), ('7e57c000-0000-0000-0000-0000000008e1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000008c1','7e57c000-0000-0000-0000-0000000008c1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000008f1','7e57c000-0000-0000-0000-0000000008f1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000008e1','7e57c000-0000-0000-0000-0000000008e1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t8-char','7e57c100-0000-0000-0000-0000000008c1','charita','Charita Trenčín',true),
 ('t8-far','7e57c100-0000-0000-0000-0000000008f1','farnost','Farnosť Stakčín',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel, nastavenie) values
 ('zb8-char','Teplé jedlo','charity','zbierka','aktivna','t8-char','7e57c100-0000-0000-0000-0000000008c1', now(), 2000, '{}'),
 ('zb8-far','Lavice','nabozenstvo','zbierka','aktivna','t8-far','7e57c100-0000-0000-0000-0000000008f1', now(), null, '{"farnost":{"druh":"farnost"}}');

set role authenticated;
-- X nie je správca farnosti
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000008e1', false);
do $$ begin
  perform public.zbierka_dar_farnosti('zb8-char', 'f-x', 50, 'EUR', 'sepa', 't8-far');
  insert into t values ('X nesmie prispiet za farnost', false);
exception when others then insert into t values ('X nesmie prispiet za farnost', true);
end $$;
-- F prispeje SEPA prevodom
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000008f1', false);
select (public.zbierka_dar_farnosti('zb8-char', 'f-1', 200, 'EUR', 'sepa', 't8-far'))->>'platba_id' is not null;
-- nie z peňaženky (DEED)
do $$ begin
  perform public.zbierka_dar_farnosti('zb8-char', 'f-2', 5, 'DEED', 'deed', 't8-far');
  insert into t values ('farnost neprispieva z penazenky', false);
exception when others then insert into t values ('farnost neprispieva z penazenky', true);
end $$;
-- nie na vlastnú zbierku
do $$ begin
  perform public.zbierka_dar_farnosti('zb8-far', 'f-3', 10, 'EUR', 'fiat', 't8-far');
  insert into t values ('farnost neprispieva na vlastnu zbierku', false);
exception when others then insert into t values ('farnost neprispieva na vlastnu zbierku', true);
end $$;
reset role;
insert into t select 'dar nesie darca_stranka', (select darca_stranka from platba where idem_kluc = 'f-1') = 't8-far';
insert into t select 'dar je pohyb v ledgeri', exists (select 1 from pohyb po join platba pl on pl.id = po.platba_id where pl.idem_kluc = 'f-1');
set role anon;
insert into t select 'prispela: Charita Trenčín 200', (public.stranka_prispela('t8-far')->0->>'kto') = 'Charita Trenčín' and (public.stranka_prispela('t8-far')->0->>'suma')::numeric = 200;
insert into t select 'prispievatelia zbierky: farnost 200', (public.zbierka_prispievatelia('zb8-char')->0->>'meno') = 'Farnosť Stakčín' and (public.zbierka_prispievatelia('zb8-char')->0->>'suma')::numeric = 200;
reset role;

select ok, c from t order by ok, c;
rollback;
