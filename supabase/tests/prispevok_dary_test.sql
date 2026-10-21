-- ============================================================
-- Test 0142 — darcovia skutku usera zo servera (prispevok_dary)
-- Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57a000-0000-0000-0000-000000142a01'), ('7e57a000-0000-0000-0000-000000142b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e570000-0000-0000-0000-000000142a01','7e57a000-0000-0000-0000-000000142a01','aktivny','hotovo'),
 ('7e570000-0000-0000-0000-000000142b01','7e57a000-0000-0000-0000-000000142b01','aktivny','hotovo');
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, feed) values
 ('20000000-0000-0000-0000-000000142001','good','skutok','Skutok B','7e570000-0000-0000-0000-000000142b01','domov'),
 ('20000000-0000-0000-0000-000000142002','good','skutok','Skutok bez darov','7e570000-0000-0000-0000-000000142b01','domov');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
-- A daruje 10 € s menom a 3 € anonymne
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-000000142a01', false);
select (public.platba_create(p_idem_kluc => 't142-1', p_suma => 10, p_mena => 'EUR', p_kanal => 'fiat', p_case_id => '20000000-0000-0000-0000-000000142001', p_meno_darcu => 'Jozef A', p_meta => '{"zobrazenie":1}')).id is not null;
select (public.platba_create(p_idem_kluc => 't142-2', p_suma => 3, p_mena => 'EUR', p_kanal => 'fiat', p_case_id => '20000000-0000-0000-0000-000000142001', p_meno_darcu => 'Jozef A', p_meta => '{"zobrazenie":4}')).id is not null;
reset role;
set role anon;
insert into t select 'skutok má 2 dary', (public.prispevok_dary('20000000-0000-0000-0000-000000142001')->>'pocet')::int = 2;
insert into t select 'súčet 13 €', (public.prispevok_dary('20000000-0000-0000-0000-000000142001')->'sucty'->>'EUR')::numeric = 13;
insert into t select 'meno len pri voľbe s menom', exists (select 1 from jsonb_array_elements(public.prispevok_dary('20000000-0000-0000-0000-000000142001')->'dary') x where x->>'meno' = 'Jozef A' and (x->>'suma')::numeric = 10)
  and exists (select 1 from jsonb_array_elements(public.prispevok_dary('20000000-0000-0000-0000-000000142001')->'dary') x where x->>'meno' is null and (x->>'suma')::numeric = 3);
insert into t select 'skutok bez darov: 0', (public.prispevok_dary('20000000-0000-0000-0000-000000142002')->>'pocet')::int = 0;
reset role;
select ok, c from t order by ok, c;
rollback;
