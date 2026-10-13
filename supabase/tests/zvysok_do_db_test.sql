-- ============================================================
-- Test 0085b — Aktivity prírastky, výzvy tvorcu, zariadenia, počítadlo do streamu, Moja firma, Moje stránky
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- T = tvorca (správca stránky t9-tv), X = iný prihlásený
insert into auth.users (id) values ('7e57c000-0000-0000-0000-0000000009a1'), ('7e57c000-0000-0000-0000-0000000009b1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-0000000009a1','7e57c000-0000-0000-0000-0000000009a1','charita','hotovo'),
 ('7e57c100-0000-0000-0000-0000000009b1','7e57c000-0000-0000-0000-0000000009b1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t9-tv','7e57c100-0000-0000-0000-0000000009a1','tvorca','Tvorca Test',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
-- ---- Aktivity ----
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009b1', false);
select public.aktivita_podpora('7', 20, true) is not null;
select (public.aktivita_podpora('7', 0, false))->>'support' = '2';
insert into t select 'aktivita: suma a pomocnik len pri pripade', raised = 20 and helpers = 1 from public.aktivita_pocty where id = '7';
do $$ begin
  insert into public.aktivita_pocty (id, support) values ('8', 999);
  insert into t values ('aktivita: priamy zapis zakazany', false);
exception when others then insert into t values ('aktivita: priamy zapis zakazany', true);
end $$;

-- ---- Výzvy ----
-- X nie je správca → nevyhlási
do $$ begin
  insert into public.vyzva (id, stranka, tvorca, nazov, podmienka, odmena, od, do_)
  values ('vz-x', 't9-tv', 'tvorca', 'Cudzia výzva', '{"typ":"dar"}', '{"typ":"kazdemu","popis":"nič"}', now() - interval '1 day', now() + interval '1 day');
  insert into t values ('vyzva: cudzi nevyhlasi', false);
exception when others then insert into t values ('vyzva: cudzi nevyhlasi', true);
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009a1', false);
insert into public.vyzva (id, stranka, tvorca, nazov, podmienka, odmena, od, do_) values
 ('vz-1', 't9-tv', 'tvorca', 'Daruj aspoň 10 €', '{"typ":"darNad","min":10}', '{"typ":"zreb","popis":"vstupenka","pocet":1}', now() - interval '2 day', now() + interval '1 day'),
 ('vz-2', 't9-tv', 'tvorca', 'Dar cez môj QR', '{"typ":"cezMojQr"}', '{"typ":"kazdemu","popis":"zľava"}', now() - interval '2 day', now() + interval '1 day');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009b1', false);
insert into t select 'vyzva: dar 5 € nesplni darNad 10', coalesce(array_length(public.vyzva_zapis_cin('Jana', 5, null, null, null), 1), 0) = 0;
insert into t select 'vyzva: dar 15 € cez QR splni obe', array_length(public.vyzva_zapis_cin('Jana', 15, null, null, 'tvorca'), 1) = 2;
insert into t select 'vyzva: jeden clovek najviac raz', coalesce(array_length(public.vyzva_zapis_cin(' jana ', 50, null, null, 'tvorca'), 1), 0) = 0;
-- žreb pred uzávierkou nejde
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009a1', false);
do $$ begin
  perform public.vyzva_zreb('vz-1', 1, 'ab', array['Jana']);
  insert into t values ('vyzva: zreb az po uzavierke', false);
exception when others then insert into t values ('vyzva: zreb az po uzavierke', true);
end $$;
reset role;
update public.vyzva set od = now() - interval '3 day', do_ = now() - interval '1 hour' where id = 'vz-1';
set role authenticated;
do $$ begin
  perform public.vyzva_zreb('vz-1', 1, 'ab', array['Cudzi']);
  insert into t values ('vyzva: vyherca musi byt ucastnik', false);
exception when others then insert into t values ('vyzva: vyherca musi byt ucastnik', true);
end $$;
insert into t select 'vyzva: zreb zapisany', (public.vyzva_zreb('vz-1', 42, 'abcd', array['Jana']))->>'blok' = '42';
insert into t select 'vyzva: zreb sa neprepise', (public.vyzva_zreb('vz-1', 99, 'ffff', array['Jana']))->>'blok' = '42';
-- X nezruší cudziu výzvu
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009b1', false);
do $$ begin
  perform public.vyzva_stav('vz-2', 'zrusena');
  insert into t values ('vyzva: cudzi nezrusi', false);
exception when others then insert into t values ('vyzva: cudzi nezrusi', true);
end $$;

-- ---- Zariadenia ----
insert into public.zariadenie_uctu (device_id, nazov, typ) select 'zariadenie-' || i, 'Telefón ' || i, 'telefon' from generate_series(1, 5) i;
do $$ begin
  insert into public.zariadenie_uctu (device_id, nazov, typ) values ('zariadenie-6', 'Šieste', 'pocitac');
  insert into t values ('zariadenia: najviac 5', false);
exception when others then insert into t values ('zariadenia: najviac 5', true);
end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009a1', false);
insert into t select 'zariadenia: cudzie nevidno', count(*) = 0 from public.zariadenie_uctu;

-- ---- Počítadlo do streamu ----
insert into public.overlay_stav (split_id, stav) values ('split-1', '{"nazov":"Krmivo","vyzbierane":10,"ciel":100}');
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009b1', false);
update public.overlay_stav set stav = '{"nazov":"Hack"}' where split_id = 'split-1';
reset role;
set role anon;
insert into t select 'overlay: anon cita, cudzi neprepise', stav->>'nazov' = 'Krmivo' from public.overlay_stav where split_id = 'split-1';
reset role;

-- ---- Moja firma ----
set role authenticated;
insert into t select 'firma: pociatocny obsah', count(*) >= 2 from public.firma_obsah;
update public.firma_obsah set data = '{}' where firma = 'firma-pekaren';
reset role;
insert into t select 'firma: cudzi neupravi', jsonb_array_length(data->'benefity') > 0 from public.firma_obsah where firma = 'firma-pekaren';

-- ---- Moje stránky ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009a1', false);
insert into t select 'moje_stranky: tvorca vidi svoju', public.moje_stranky() @> '[{"id":"t9-tv"}]';
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000000009b1', false);
insert into t select 'moje_stranky: cudzi nie', not (public.moje_stranky() @> '[{"id":"t9-tv"}]');
reset role;

\pset tuples_only off
select c, ok from t order by c;
rollback;
