-- ============================================================
-- Test 0086 — Sledovať kostol, Môj kostol, počet sledujúcich per miesto
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = farár (správca stránky t86-far), V = veriaci, X = iný veriaci
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000086a1'), ('7e57c000-0000-0000-0000-0000000086b1'), ('7e57c000-0000-0000-0000-0000000086c1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000086a1','7e57c000-0000-0000-0000-0000000086a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000086b1','7e57c000-0000-0000-0000-0000000086b1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000086c1','7e57c000-0000-0000-0000-0000000086c1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t86-far','7e57c100-0000-0000-0000-0000000086a1','farnost','Farnosť Test',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
-- ---- V sleduje kostol „1“, X sleduje „1“ aj „2“ ----
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000086b1', false);
insert into public.moje_kostoly (stranka, miesto) values ('t86-far', '1');
insert into t select 'kostol: V vidi svoj', count(*) = 1 from public.moje_kostoly;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000086c1', false);
insert into public.moje_kostoly (stranka, miesto) values ('t86-far', '1'), ('t86-far', '2');
insert into t select 'kostol: X nevidi cudzie', count(*) = 2 from public.moje_kostoly;
do $$ begin
  insert into public.moje_kostoly (ucet_id, stranka, miesto) values ('7e57c100-0000-0000-0000-0000000086b1', 't86-far', '2');
  insert into t values ('kostol: za ineho nezapise', false);
exception when others then insert into t values ('kostol: za ineho nezapise', true);
end $$;

-- ---- Môj kostol len pri domovskej ----
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000086b1', false);
insert into t select 'moj kostol: bez domovskej false', public.nastav_moj_kostol('1') = false;
select public.nastav_domovsku('t86-far');
insert into t select 'moj kostol: pri domovskej true', public.nastav_moj_kostol('1');
insert into t select 'moj kostol: ulozeny', moj_kostol = '1' from public.moje_farnosti where domovska;
select public.nastav_moj_kostol(null);
insert into t select 'moj kostol: zruseny', moj_kostol is null from public.moje_farnosti where domovska;

-- ---- počty len pre správcu ----
do $$ begin
  perform public.sledujuci_miest('t86-far');
  insert into t values ('pocty: veriaci nevidi', false);
exception when others then insert into t values ('pocty: veriaci nevidi', true);
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000086a1', false);
insert into t select 'pocty: kostol 1 = 2', pocet = 2 from public.sledujuci_miest('t86-far') where miesto = '1';
insert into t select 'pocty: kostol 2 = 1', pocet = 1 from public.sledujuci_miest('t86-far') where miesto = '2';
reset role;

\pset tuples_only off
select c, ok from t order by c;
rollback;
