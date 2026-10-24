-- ============================================================
-- Test 0182 — meno autora, odznak a prednosť vo feede určuje server. Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000182d01'), ('7e57c000-0000-0000-0000-000000182d02'), ('7e57c000-0000-0000-0000-000000182c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000182d01','7e57c000-0000-0000-0000-000000182d01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000182d02','7e57c000-0000-0000-0000-000000182d02','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000182c01','7e57c000-0000-0000-0000-000000182c01','charita','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000182d01', 'Jana', 'Nová'), ('7e57c100-0000-0000-0000-000000182d02', 'Peter', 'Tichý');
insert into public.zobrazenie (ucet_id, rezim) values ('7e57c100-0000-0000-0000-000000182d01', 'cele'), ('7e57c100-0000-0000-0000-000000182d02', 'anonym');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t182-a','7e57c100-0000-0000-0000-000000182c01','charita','Charita 182',true);
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('7e57c100-0000-0000-0000-000000182c01', '7e57c100-0000-0000-0000-000000182d01', 'hlavny');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- osoba s celým menom: čo pošle appka, server prepíše
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000182d01', false);
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, autor_nazov, autor_ini, autor_karma, topovane, vyznam, typ_situacie, narodne, lat, lng)
  values ('18200000-0000-0000-0000-000000000001', 'good', 'skutok', 'Skutok', '7e57c100-0000-0000-0000-000000182d01', 'Pápež František', 'P', 'Legend', true, 'Výnimočný', 'kriza', true, 48.89, 18.04);
-- bez autor_ucet_id: doplní ho session (0055) a meno zo servera
insert into public.prispevok (id, modul, typ, titul) values ('18200000-0000-0000-0000-000000000002', 'good', 'skutok', 'Druhý');
-- úprava nič z toho nezmení
update public.prispevok set topovane = true, autor_nazov = 'Niekto iný', typ_situacie = 'kriza', titul = 'Skutok 2' where id = '18200000-0000-0000-0000-000000000001';
reset role;
insert into t select 'meno zo servera, nie z appky', (select autor_nazov = 'Jana Nová' and autor_ini = 'J' from public.prispevok where id = '18200000-0000-0000-0000-000000000001');
insert into t select 'odznak, topovane, vyznam, kriza, narodne = server', (select autor_karma is null and not topovane and vyznam is null and typ_situacie = 'normal' and not narodne
  from public.prispevok where id = '18200000-0000-0000-0000-000000000001');
insert into t select 'bez autor_ucet_id: zo session + meno', (select autor_ucet_id = '7e57c100-0000-0000-0000-000000182d01' and autor_nazov = 'Jana Nová' from public.prispevok where id = '18200000-0000-0000-0000-000000000002');
insert into t select 'uprava nemeni meno ani prednost, titul ano', (select autor_nazov = 'Jana Nová' and not topovane and typ_situacie = 'normal' and titul = 'Skutok 2' from public.prispevok where id = '18200000-0000-0000-0000-000000000001');

-- anonymné zobrazenie: príspevok sa nezaloží (anonymne sa dá len darovať — Martin 24. 10.)
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000182d02', false);
do $$ begin
  insert into public.prispevok (id, modul, typ, titul, autor_nazov, narodne) values ('18200000-0000-0000-0000-000000000003', 'good', 'skutok', 'Online', 'Peter Tichý', true);
  insert into t values ('anonymny autor = prispevok odmietnuty', false);
exception when others then insert into t values ('anonymny autor = prispevok odmietnuty', sqlerrm like '%anonymn%'); end $$;
-- online (bez polohy) smie byť národné — autor s menom
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000182d01', false);
insert into public.prispevok (id, modul, typ, titul, narodne) values ('18200000-0000-0000-0000-000000000003', 'good', 'skutok', 'Online', true);
reset role;
insert into t select 'online (bez polohy) smie byt narodne', (select narodne and autor_nazov = 'Jana Nová' from public.prispevok where id = '18200000-0000-0000-0000-000000000003');

-- správca charity píše za charitu: meno = názov stránky
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000182d01', false);
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, autor_nazov) values ('18200000-0000-0000-0000-000000000004', 'charity', 'charita', 'Charitný', '7e57c100-0000-0000-0000-000000182c01', 'Falošná charita');
reset role;
insert into t select 'organizacia: meno = nazov stranky', (select autor_nazov = 'Charita 182' from public.prispevok where id = '18200000-0000-0000-0000-000000000004');

-- server (seed, funkcie) bez obmedzenia
insert into public.prispevok (id, modul, typ, titul, autor_nazov, autor_karma, topovane) values ('18200000-0000-0000-0000-000000000005', 'good', 'skutok', 'Seed', 'Seed autor', 'Gold', true);
insert into t select 'server zapise, co chce', (select autor_nazov = 'Seed autor' and autor_karma = 'Gold' and topovane from public.prispevok where id = '18200000-0000-0000-0000-000000000005');

select ok, c from t order by ok, c;
rollback;
