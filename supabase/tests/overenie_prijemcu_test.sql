-- ============================================================
-- Test 0104 — zbierka s overovateľom naostro (OPRAVY 338): sken QR → potvrdenie → kód → zapečatenie na registrovaný účet
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- F = farár (správca), P = príjemca (registrovaný, bez KYC), X = iný (nedokončená registrácia)
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000104f01'), ('7e57c000-0000-0000-0000-000000104a01'), ('7e57c000-0000-0000-0000-000000104b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000104f01','7e57c000-0000-0000-0000-000000104f01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000104a01','7e57c000-0000-0000-0000-000000104a01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000104b01','7e57c000-0000-0000-0000-000000104b01','aktivny','telefon');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000104a01','Anna','Nová');
-- stránka NIE je testovacia: bez osobného overenia by príjemca neprešiel
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t104-far','7e57c100-0000-0000-0000-000000104f01','farnost','Farnosť Test 104',false);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t104-far','SK0011000000002612345678','T104','overeny');
\pset tuples_only on
create temp table t(c text, ok boolean);
create temp table v(k text primary key, h text);
grant all on t, v to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000104f01', false);
insert into v select 'id', public.ovp_zaloz('t104-far', 'pohreb')::text;
insert into v select 'tok', public.ovp_token((select h from v where k = 'id')::uuid);

-- neprihlásený sken: lístok áno
set role anon;
select set_config('request.jwt.claim.sub', '', false);
insert into v select 'lis', public.ovp_otvor((select h from v where k = 'tok'));
do $$ begin
  perform public.ovp_otvor('zly-token');
  insert into t values ('starý / zlý token neplatí', false);
exception when others then insert into t values ('starý / zlý token neplatí', sqlerrm = 'kod_neplati'); end $$;
insert into t select 'náhľad bez prihlásenia: názov farnosti', (public.ovp_nahlad((select h from v where k = 'lis')))->>'nazov' = 'Farnosť Test 104';

-- nedokončená registrácia nepotvrdí
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000104b01', false);
do $$ begin
  perform public.ovp_potvrd((select h from v where k = 'lis'));
  insert into t values ('bez dokončenej registrácie nie', false);
exception when others then insert into t values ('bez dokončenej registrácie nie', sqlerrm = 'neregistrovany'); end $$;

-- príjemca potvrdí
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000104a01', false);
insert into t select 'príjemca potvrdil, meno z profilu', public.ovp_potvrd((select h from v where k = 'lis')) = 'Anna Nová';

-- farár vidí meno, zapečatenie bez kódu neprejde
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000104f01', false);
insert into t select 'farár vidí meno', (public.ovp_stav((select h from v where k = 'id')::uuid))->>'meno' = 'Anna Nová';
do $$ begin
  insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
   ('zb-104a','Pohreb · test','nabozenstvo','zbierka','aktivna','t104-far','7e57c100-0000-0000-0000-000000104f01', now(),
    jsonb_build_object('ucet','SK0011000000002612345678','overenie_prijemcu',(select h from v where k = 'id'),
      'rozdelenie', jsonb_build_array(jsonb_build_object('druh','prijemca','ucet','7e57c100-0000-0000-0000-000000104a01','text','Pozostalý','podiel',0.97), jsonb_build_object('druh','overovatel','podiel',0.03))));
  insert into t values ('bez súhlasu s rozdelením sa nezapečatí', false);
exception when others then insert into t values ('bez súhlasu s rozdelením sa nezapečatí', sqlerrm = 'Príjemca nemá overený účet.'); end $$;
select public.ovp_kod((select h from v where k = 'id')::uuid, 'pozostalému 97 % · farnosti 3 %');
reset role;
-- 0113: bez kódu — upozornenie s odkazom na obrazovku potvrdenia
insert into t select 'príjemca má upozornenie', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000104a01'
  and odkaz = 'ovp:t104-far:' || (select h from v where k = 'lis'));

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000104a01', false);
insert into t select 'príjemca vidí rozdelenie', (public.ovp_nahlad((select h from v where k = 'lis')))->>'rozdelenie' like 'pozostalému%';
select public.ovp_suhlas((select h from v where k = 'lis'));

-- zapečatenie na registrovaný účet bez KYC
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000104f01', false);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
 ('zb-104b','Pohreb · test','nabozenstvo','zbierka','aktivna','t104-far','7e57c100-0000-0000-0000-000000104f01', now(),
  jsonb_build_object('ucet','SK0011000000002612345678','overenie_prijemcu',(select h from v where k = 'id'),
    'rozdelenie', jsonb_build_array(jsonb_build_object('druh','prijemca','ucet','7e57c100-0000-0000-0000-000000104a01','text','Pozostalý','podiel',0.97), jsonb_build_object('druh','overovatel','podiel',0.03))));
-- overenie sa použije raz
do $$ begin
  insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, nastavenie) values
   ('zb-104c','Pohreb · test','nabozenstvo','zbierka','aktivna','t104-far','7e57c100-0000-0000-0000-000000104f01', now(),
    jsonb_build_object('ucet','SK0011000000002612345678','overenie_prijemcu',(select h from v where k = 'id'),
      'rozdelenie', jsonb_build_array(jsonb_build_object('druh','prijemca','ucet','7e57c100-0000-0000-0000-000000104a01','text','Pozostalý','podiel',0.97), jsonb_build_object('druh','overovatel','podiel',0.03))));
  insert into t values ('overenie druhýkrát nie', false);
exception when others then insert into t values ('overenie druhýkrát nie', sqlerrm = 'Príjemca nemá overený účet.'); end $$;

select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000104a01', false);
insert into t select 'zbierka je v Moja zbierka príjemcu', (select count(*) = 1 from public.moje_zbierky_prijemcu() where id = 'zb-104b');
insert into t select 'príjemca ju ukončí', public.ukonci_zbierku('zb-104b') = 'ukoncena';
reset role;
insert into t select 'podiel príjemcu = Anna', exists (select 1 from public.zbierka_podiel where zbierka = 'zb-104b' and druh = 'prijemca' and ucet = '7e57c100-0000-0000-0000-000000104a01');

select ok, c from t order by ok, c;
rollback;
