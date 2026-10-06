-- ============================================================
-- Test ledgera (Zadanie 2, migrácia 0037) — akceptačné kritériá 1, 3–7.
-- Spustiť po migráciách: psql -f supabase/tests/ledger_test.sql
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK) — v DB nič neostane.
-- Výsledok: tabuľka ok | kontrola; všetky riadky musia mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57a000-0000-0000-0000-00000000000a'), ('7e57a000-0000-0000-0000-00000000000b');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e570000-0000-0000-0000-00000000000a','7e57a000-0000-0000-0000-00000000000a','aktivny','hotovo'),
 ('7e570000-0000-0000-0000-00000000000b','7e57a000-0000-0000-0000-00000000000b','aktivny','hotovo');
insert into public.ucet (id, typ, stav_registracie) values ('7e570000-0000-0000-0000-00000000000c','charita','hotovo');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
-- prípady: 1 = autor B, 2 = organizácia C, 3 = autor A
insert into public.prispevok (id, modul, typ, titul, autor_ucet_id, ciel) values
 ('20000000-0000-0000-0000-000000000001','charity','charita','Test zbierka','7e570000-0000-0000-0000-00000000000b', 1000),
 ('20000000-0000-0000-0000-000000000002','charity','charita','Druhá zbierka','7e570000-0000-0000-0000-00000000000c', 1000),
 ('20000000-0000-0000-0000-000000000003','charity','charita','Zbierka A','7e570000-0000-0000-0000-00000000000a', 1000);
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
-- 3 · split 100 € kartou: 50 % autor (vlastník, nepočíta sa) + 50 % zbierka 2
select (public.platba_create('s1', 100, 'EUR', 'fiat', '20000000-0000-0000-0000-000000000001', 'Jozef A', null, null, false, 0, '{}',
  '[{"prijemca_ucet":"7e570000-0000-0000-0000-00000000000b","podiel":0.5,"fixny":false},{"case_id":"20000000-0000-0000-0000-000000000002","podiel":0.5,"fixny":true}]')).id is not null;
reset role;
insert into t select 'split: podiely = cista suma',
  (select sum(suma) from pohyb where platba_id = pl.id and typ='dar') = pl.cista_suma
  and (select sum(suma) from platba_split where platba_id = pl.id) = pl.cista_suma
  and pl.cista_suma = pl.suma                                   -- 0043: darca platí poplatok navrch
  from platba pl where idem_kluc='s1';
-- 0043 · akceptácia 3.4: poplatok zobrazený pred platbou = poplatok strhnutý
insert into t select 'poplatok nahlad = strhnuty (karta, split)',
  (public.poplatok_nahlad('fiat', 100, true)->>'poplatok')::numeric = pl.poplatok from platba pl where idem_kluc='s1';
insert into t select 'split: zbierka 1 nedostala podiel vlastnika', not exists (select 1 from v_vyzbierane where case_id='20000000-0000-0000-0000-000000000001');
insert into t select 'split: zbierka 2 = polovica cistej (orezane na cent)', (select vyzbierane_eur from v_vyzbierane where case_id='20000000-0000-0000-0000-000000000002') = (select trunc(cista_suma/2,2) from platba where idem_kluc='s1');
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
-- podiel bez príjemcu
do $$ begin perform public.platba_create('s2', 100, 'EUR', 'fiat', null, null, null, null, false, 0, '{}', '[{"prijemca_text":"Niekto","podiel":1}]');
  insert into t values ('split bez prijemcu odmietnuty', false);
exception when others then insert into t values ('split bez prijemcu odmietnuty: '||sqlerrm, true); end $$;
-- 4 · 0,10 € kartou
do $$ begin perform public.platba_create('m1', 0.10, 'EUR', 'fiat', '20000000-0000-0000-0000-000000000002', null);
  insert into t values ('0,10 kartou odmietnute', false);
exception when others then insert into t values ('0,10 kartou odmietnute: '||sqlerrm, true); end $$;
-- DEED do mínusu
do $$ begin perform public.platba_create('d1', 999999, 'DEED', 'deed', '20000000-0000-0000-0000-000000000002', null);
  insert into t values ('DEED do minusu odmietnute', false);
exception when others then insert into t values ('DEED do minusu odmietnute: '||sqlerrm, true); end $$;
-- mena vs kanál
do $$ begin perform public.platba_create('k1', 5, 'DEED', 'fiat', '20000000-0000-0000-0000-000000000002', null);
  insert into t values ('mena-kanal odmietnute', false);
exception when others then insert into t values ('mena-kanal odmietnute: '||sqlerrm, true); end $$;
-- 5 · dvojitý tap
select (public.platba_create('tap', 10, 'DEED', 'deed', '20000000-0000-0000-0000-000000000001', null)).id is not null;
select (public.platba_create('tap', 10, 'DEED', 'deed', '20000000-0000-0000-0000-000000000001', null)).id is not null;
reset role;
insert into t select 'dvojity tap = 1 platba', (select count(*) from platba where idem_kluc='tap') = 1 and (select count(*) from pohyb p join platba pl on pl.id=p.platba_id where pl.idem_kluc='tap' and p.typ='dar') = 1;
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
do $$ begin perform public.platba_create('tap', 11, 'DEED', 'deed', '20000000-0000-0000-0000-000000000001', null);
  insert into t values ('rovnaky kluc ina suma = chyba', false);
exception when others then insert into t values ('rovnaky kluc ina suma = chyba: '||sqlerrm, true); end $$;
-- iný darca, ten istý kľúč = iná platba
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000b', false);
select (public.platba_create('tap', 10, 'DEED', 'deed', '20000000-0000-0000-0000-000000000002', null)).id is not null;
reset role;
insert into t select 'kluc per odosielatel', (select count(*) from platba where idem_kluc='tap') = 2;
-- 6 · escrow: firma = Jozef A (DEED), vklad 100, uvoľní 30, vráti zvyšok
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
create temp table es as select (public.escrow_create('20000000-0000-0000-0000-000000000002', 'matching', 100, 'DEED')).id;
reset role;
insert into t select 'escrow vytvor: zbierka este nic', coalesce((select vyzbierane_deed from v_vyzbierane where case_id='20000000-0000-0000-0000-000000000002'),0) = 10;
-- (10 = dar B cez „tap"; poplatok DEED 0, platí ho darca navrch)
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
select (public.escrow_uvolni((select id from es), 30)).zostatok;
reset role;
insert into t select 'escrow uvolni: zbierka +30 raz', (select vyzbierane_deed from v_vyzbierane where case_id='20000000-0000-0000-0000-000000000002') = 40;
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
select (public.escrow_vrat((select id from es))).stav;
reset role;
insert into t select 'escrow vratenie: vlastny doklad a VS', exists (select 1 from pohyb where escrow_id=(select id from es) and typ='vratenie' and suma=70 and vs=doklad and length(doklad)=10 and luhn9(left(doklad,9)) = right(doklad,1)::int);
insert into t select 'escrow zostatok 0', (select zostatok from v_escrow where id=(select id from es)) = 0;
-- 7 · refund (server)
create temp table pred as select vyzbierane_deed v, pocet_darov n from v_vyzbierane where case_id='20000000-0000-0000-0000-000000000002';
select (public.platba_refund((select id from platba where idem_kluc='tap' and odosielatel='7e570000-0000-0000-0000-00000000000b'))).stav;
insert into t select 'refund vrati vyzbierane a pocet', v.vyzbierane_deed = p.v - 10 and v.pocet_darov = p.n - 1 from v_vyzbierane v, pred p where v.case_id='20000000-0000-0000-0000-000000000002';
insert into t select 'refund vrati darcovi', public.zostatok('7e570000-0000-0000-0000-00000000000b','DEED') >= 1230;
create temp table s1 as select id from platba where idem_kluc='s1';
grant select on s1 to public;
set role authenticated;
do $$ begin perform public.platba_refund((select id from s1));
  insert into t values ('refund z klienta zakazany', false);
exception when others then insert into t values ('refund z klienta zakazany: '||sqlerrm, true); end $$;
reset role;
-- pohyb sa nedá meniť (ani vlastníkom tabuľky)
do $$ begin update public.pohyb set suma = 1 where id = 1;
  insert into t values ('pohyb nemenny', false);
exception when others then insert into t values ('pohyb nemenny: '||sqlerrm, true); end $$;
-- vlastný účet → vlastná zbierka
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
do $$ begin perform public.platba_create('self', 5, 'DEED', 'deed', '20000000-0000-0000-0000-000000000003', null);
  insert into t values ('dar sam sebe odmietnuty', false);
exception when others then insert into t values ('dar sam sebe odmietnuty: '||sqlerrm, true); end $$;
-- Zadanie 4 · 4.1: identita LEN zo session
reset role;
set role anon;
select set_config('request.jwt.claim.sub','', false);
do $$ begin perform public.platba_create('anon1', 5, 'EUR', 'fiat', '20000000-0000-0000-0000-000000000002', null);
  insert into t values ('4.1 neprihlaseny neposle platbu', false);
exception when insufficient_privilege or sqlstate '28000' then insert into t values ('4.1 neprihlaseny neposle platbu', true); end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000b', false);
do $$ begin perform public.escrow_uvolni((select id from es), 1);
  insert into t values ('4.1 B neuvolni escrow A', false);
exception when sqlstate '42501' then insert into t values ('4.1 B neuvolni escrow A', true); end $$;
do $$ begin perform public.platba_zapis('zap1', 5, 'DEED', 'deed', '20000000-0000-0000-0000-000000000002', '7e570000-0000-0000-0000-00000000000a', null);
  insert into t values ('4.1 platba_zapis z klienta zakazana', false);
exception when insufficient_privilege then insert into t values ('4.1 platba_zapis z klienta zakazana', true); end $$;
select (public.platba_create('b-ja', 1, 'DEED', 'deed', '20000000-0000-0000-0000-000000000002', null)).id is not null;
reset role;
insert into t select '4.1 odosielatel = prihlaseny', odosielatel = '7e570000-0000-0000-0000-00000000000b' from platba where idem_kluc = 'b-ja';
set role authenticated;
-- dobitie z testovacej pokladne
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-00000000000a', false);
select public.testovacie_dobitie(50) > 0;
-- nový účet = štartovací kredit
reset role;
insert into auth.users(id) values ('7e57a000-0000-0000-0000-0000000000f1');
set role authenticated;
select set_config('request.jwt.claim.sub','7e57a000-0000-0000-0000-0000000000f1', false);
select public.zaisti_ucet() is not null;
insert into t select 'novy ucet ma 1240', (select zostatok_deed from v_zostatok) = 1240;
insert into t select 'v_zostatok len moj', (select count(*) from v_zostatok) = 1;
reset role;
-- 1 · súčet = 0
insert into t select 'sucet pohybov = 0 per mena', bool_and(s = 0) from (select mena, sum(z) s from (select mena, suma z from pohyb union all select mena, -suma from pohyb) x group by mena) y;
insert into t select 'ziadne sirotske riadky podpory (suma bez platby)', not exists (select 1 from podpora where platba_id is null);
insert into t select 'rebricek z ledgera: EUR dar darcu A', (select eur from v_top_darcovia where ucet_id = '7e570000-0000-0000-0000-00000000000a') = (select cista_suma from platba where idem_kluc = 's1');
insert into t select 'ziadny ne-systemovy ucet v minuse', not exists (select 1 from ucet u where typ <> 'system' and (public.zostatok(u.id,'DEED') < 0 or public.zostatok(u.id,'EUR') < 0));
\pset tuples_only off
select ok, c from t order by ok, c;

rollback;
