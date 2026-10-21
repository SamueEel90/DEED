-- ============================================================
-- Test 0144 — pomocník ku skutku skenom osobného QR (OPRAVY 448)
-- Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000144c01'), ('7e57c000-0000-0000-0000-000000144d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000144c01','7e57c000-0000-0000-0000-000000144c01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000144d01','7e57c000-0000-0000-0000-000000144d01','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000144d01','Mária','Šimková');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t144-ch','7e57c100-0000-0000-0000-000000144c01','charita','Pod korunami test',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table k(kod text);
grant all on k to public;

-- Mária ukáže Môj QR
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000144d01', false);
insert into k select public.moj_qr_kod()->>'kod';
insert into t select 'kód má tvar účet.okno.podpis', (select kod ~ '^7e57c100-0000-0000-0000-000000144d01\.[0-9]+\.[0-9a-f]{20}$' from k);
-- organizátor skenuje
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000144c01', false);
insert into t select 'sken pridá Máriu Š.', public.skutok_pridaj_skenom((select kod from k), 'm777', 'Teplé jedlo', 't144-ch')->>'meno' = 'Mária Š.';
insert into t select 'druhý sken toho istého je ok', public.skutok_pridaj_skenom((select kod from k), 'm777', 'Teplé jedlo', 't144-ch')->>'meno' = 'Mária Š.';
do $$ begin perform public.skutok_pridaj_skenom(regexp_replace((select kod from k), '.{4}$', 'abcd'), 'm777', 'X', 't144-ch'); insert into t values ('falošný podpis neprejde', false);
exception when others then insert into t values ('falošný podpis neprejde', sqlerrm like 'Kód neplatí%'); end $$;
do $$ begin perform public.skutok_pridaj_skenom((select kod from k), 'm777', 'X', 'cudzia'); insert into t values ('cudzia stránka neprejde', false);
exception when others then insert into t values ('cudzia stránka neprejde', true); end $$;
reset role;
insert into t select 'jeden pomocník, jedno upozornenie', (select count(*) = 1 from public.pomocnik_skutku where skutok = 'm777') and (select count(*) = 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000144d01');

-- starý kód (2 okná dozadu) neplatí
create temp table k2 as select '7e57c100-0000-0000-0000-000000144d01.' || (floor(extract(epoch from now()) / 15) - 2)::bigint || '.' || public.qr_podpis('7e57c100-0000-0000-0000-000000144d01', floor(extract(epoch from now()) / 15)::bigint - 2) as kod;
grant all on k2 to public;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000144c01', false);
do $$ begin perform public.skutok_pridaj_skenom((select kod from k2), 'm778', 'X', 't144-ch'); insert into t values ('kód starší ako 30 s neplatí', false);
exception when others then insert into t values ('kód starší ako 30 s neplatí', sqlerrm like 'Kód neplatí%'); end $$;
reset role;

-- po zverejnení je skutok v denníku pomocníka
insert into public.skutok_stranky (id, stranka, data) values ('m777', 't144-ch', '{"nazov":"Teplé jedlo"}');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000144d01', false);
insert into t select 'denník: skutok, pri ktorom som bol', exists (select 1 from public.skutky_kde_som_pomahal() where skutok = 'm777' and od = 'Pod korunami test');
reset role;

-- hľadanie a pozvánka registrovanému
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000144c01', false);
insert into t select 'hľadanie nájde Máriu Š.', exists (select 1 from public.hladaj_osoby('šimk') where meno = 'Mária Š.');
insert into t select 'krátke hľadanie nič', not exists (select 1 from public.hladaj_osoby('ši'));
create temp table pz as select public.pozvanka_vytvor('m777', 'Teplé jedlo', 't144-ch') as t;
insert into t select 'pozvánka poslaná registrovanej', public.pozvanka_posli((select t from pz), '7e57c100-0000-0000-0000-000000144d01');
reset role;
insert into t select 'upozornenie s odkazom na pozvánku', exists (select 1 from public.notifikacia where ucet_id = '7e57c100-0000-0000-0000-000000144d01' and odkaz = 'pzs:-:' || (select t from pz));

select ok, c from t order by ok, c;
rollback;
