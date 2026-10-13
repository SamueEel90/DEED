-- ============================================================
-- Test 0087 — bloky upozornení pri farnosti a kostole, počty pre správcu
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- F = správca stránky t87-far, V = veriaci, X = iný veriaci
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000087a1'), ('7e57c000-0000-0000-0000-0000000087b1'), ('7e57c000-0000-0000-0000-0000000087c1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000087a1','7e57c000-0000-0000-0000-0000000087a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000087b1','7e57c000-0000-0000-0000-0000000087b1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000087c1','7e57c000-0000-0000-0000-0000000087c1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t87-far','7e57c100-0000-0000-0000-0000000087a1','farnost','Farnosť Test 87',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
-- ---- V sleduje farnosť, X sleduje kostol „1“ ----
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000087b1', false);
insert into public.moje_farnosti (stranka) values ('t87-far');
insert into t select 'predvolene: farnost oz om sp', bloky = array['oz','om','sp'] from public.moje_farnosti where stranka = 't87-far';
insert into t select 'bloky farnosti: ulozi', public.nastav_bloky('t87-far', null, array['oz','zb']);
insert into t select 'bloky farnosti: ulozene', bloky = array['oz','zb'] from public.moje_farnosti where stranka = 't87-far';
do $$ begin
  perform public.nastav_bloky('t87-far', null, array['xx']);
  insert into t values ('bloky: neznamy blok zakazany', false);
exception when others then insert into t values ('bloky: neznamy blok zakazany', true);
end $$;
insert into t select 'bloky kostola: nesledovany = false', public.nastav_bloky('t87-far', '1', array['oz']) = false;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000087c1', false);
insert into public.moje_kostoly (stranka, miesto) values ('t87-far', '1');
insert into t select 'predvolene: kostol oz om', bloky = array['oz','om'] from public.moje_kostoly where stranka = 't87-far';
insert into t select 'bloky kostola: ulozi', public.nastav_bloky('t87-far', '1', array['om']);
insert into t select 'bloky: cudzie neprepise', not public.nastav_bloky('t87-far', null, array['om']);

-- ---- počty len pre správcu ----
do $$ begin
  perform public.sledujuci_blokov('t87-far');
  insert into t values ('pocty blokov: veriaci nevidi', false);
exception when others then insert into t values ('pocty blokov: veriaci nevidi', true);
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000087a1', false);
insert into t select 'pocty: farnost oz = 1', pocet = 1 from public.sledujuci_blokov('t87-far') where miesto is null and blok = 'oz';
insert into t select 'pocty: farnost om = 0', not exists (select 1 from public.sledujuci_blokov('t87-far') where miesto is null and blok = 'om');
insert into t select 'pocty: kostol 1 om = 1', pocet = 1 from public.sledujuci_blokov('t87-far') where miesto = '1' and blok = 'om';
reset role;

\pset tuples_only off
select c, ok from t order by c;
rollback;
