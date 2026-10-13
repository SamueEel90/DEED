-- ============================================================
-- Test 0082 — farár z Ľudia → Farár farnosti (nastavenia_stranky, kľúč „duch“)
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- O = účet farnosti (majiteľ stránky), F = farár, K = kaplán (štatutár, nie majiteľ)
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000009a1'), ('7e57c000-0000-0000-0000-0000000009f1'), ('7e57c000-0000-0000-0000-0000000009b1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000009a1','7e57c000-0000-0000-0000-0000000009a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000009f1','7e57c000-0000-0000-0000-0000000009f1','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-0000000009b1','7e57c000-0000-0000-0000-0000000009b1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t9-far','7e57c100-0000-0000-0000-0000000009a1','farnost','Farnosť Stakčín',true);
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values
 ('7e57c100-0000-0000-0000-0000000009a1','7e57c100-0000-0000-0000-0000000009f1','test'),
 ('7e57c100-0000-0000-0000-0000000009a1','7e57c100-0000-0000-0000-0000000009b1','test');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
-- F uloží Ľudia „Som farár“ (appka pošle duch.ucet = F)
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009f1', false);
insert into public.nastavenia_stranky (stranka, data) values ('t9-far', '{"duch":{"meno":"Peter Rak","som":0,"ucet":"7e57c100-0000-0000-0000-0000000009f1"}}');
insert into t select 'F je farar po ulozeni Ludi', public.som_farar('t9-far');
-- K upraví fotku farára (som ostáva 0, ucet chýba) → farár ostáva F
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009b1', false);
update public.nastavenia_stranky set data = jsonb_build_object('duch', '{"meno":"Peter Rak","som":0,"foto":"x"}'::jsonb) where stranka = 't9-far';
insert into t select 'K nie je farar po uprave fotky', not public.som_farar('t9-far');
-- K sa skúsi zapísať za farára → nezmení sa
update public.nastavenia_stranky set data = jsonb_build_object('duch', '{"meno":"Ján","som":0,"ucet":"7e57c100-0000-0000-0000-0000000009b1"}'::jsonb) where stranka = 't9-far';
insert into t select 'K sa nezapise za farara', not public.som_farar('t9-far');
reset role;
insert into t select 'duch.ucet zarovnany na F', (select data->'duch'->>'ucet' from public.nastavenia_stranky where stranka = 't9-far') = '7e57c100-0000-0000-0000-0000000009f1';
set role authenticated;
-- preloženie: majiteľ stránky zapíše K
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009a1', false);
update public.nastavenia_stranky set data = jsonb_build_object('duch', '{"meno":"Ján","som":0,"ucet":"7e57c100-0000-0000-0000-0000000009b1"}'::jsonb) where stranka = 't9-far';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009b1', false);
insert into t select 'majitel prelozi farara na K', public.som_farar('t9-far');
-- „Vypĺňam za farára“ → farnosť farára s účtom nemá
update public.nastavenia_stranky set data = jsonb_build_object('duch', '{"meno":"Ján","som":1}'::jsonb) where stranka = 't9-far';
insert into t select 'vyplnam za farara = bez farara', not public.som_farar('t9-far');
reset role;
insert into t select 'stranka_farar prazdna', not exists (select 1 from public.stranka_farar where stranka = 't9-far');

select ok, c from t order by ok, c;
rollback;
