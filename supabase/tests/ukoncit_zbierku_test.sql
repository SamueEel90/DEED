-- ============================================================
-- Test 0090 — ukončenie zbierky správcom stránky (OPRAVY 264)
-- Z = zakladateľ zbierky (iný účet), F = správca stránky (farár), X = cudzí prihlásený.
-- Všetko v transakcii s ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000000a1'), ('7e57c000-0000-0000-0000-0000000000f1'), ('7e57c000-0000-0000-0000-0000000000e1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000000a1','7e57c000-0000-0000-0000-0000000000a1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000000f1','7e57c000-0000-0000-0000-0000000000f1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000000e1','7e57c000-0000-0000-0000-0000000000e1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t-fara-uk','7e57c100-0000-0000-0000-0000000000f1','farnost','Testovacia fara',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- zbierku na stránke farnosti založil iný účet (Z)
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-uk-1','Test ukončenia','nabozenstvo','zbierka','aktivna','t-fara-uk','7e57c100-0000-0000-0000-0000000000a1', now(), '{"nazov":"Test ukončenia"}'),
 ('zb-uk-2','Test cudzí','nabozenstvo','zbierka','aktivna','t-fara-uk','7e57c100-0000-0000-0000-0000000000a1', now(), '{"nazov":"Test cudzí"}');

-- X (cudzí) nesmie
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000e1', false);
do $$ begin
  perform public.ukonci_zbierku('zb-uk-2');
  insert into t values ('cudzi nesmie ukoncit', false);
exception when others then
  insert into t values ('cudzi nesmie ukoncit', sqlstate = '42501');
end $$;

-- F (správca stránky, nie zakladateľ) smie
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000000f1', false);
insert into t select 'spravca stranky ukonci cudziu zbierku', public.ukonci_zbierku('zb-uk-1') = 'ukoncena';
insert into t select 'opakovane ukoncenie nic nepokazi', public.ukonci_zbierku('zb-uk-1') = 'ukoncena';
reset role;

insert into t select 'stav v DB je ukoncena a ma cas konca', exists (select 1 from public.zbierka where id = 'zb-uk-1' and stav = 'ukoncena' and koniec is not null);
insert into t select 'druha zbierka ostala aktivna', exists (select 1 from public.zbierka where id = 'zb-uk-2' and stav = 'aktivna');
insert into t select 'verejny pohlad ukazuje stav ukoncena', exists (select 1 from public.zbierka_verejna where id = 'zb-uk-1' and stav = 'ukoncena');

select ok, c from t order by ok, c;
rollback;
