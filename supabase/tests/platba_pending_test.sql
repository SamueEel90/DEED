-- ============================================================
-- Test 0176 — EUR vznikajú v ledgeri až po potvrdení rúrou (pending → settled).
-- Testovacia pokladňa zapnutá = všetko ako doteraz (potvrdené hneď). Vypnutá = dar kartou / SEPA čaká na rúru,
-- vyzbierané a zoznam darcov ho nevidia, až platba_potvrd ho zapíše. Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
-- A = charita (stránka), D = darca s účtom
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000176a01'), ('7e57c000-0000-0000-0000-000000176d01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000176a01','7e57c000-0000-0000-0000-000000176a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000176d01','7e57c000-0000-0000-0000-000000176d01','aktivny','hotovo');
update public.ucet set telefon_overeny = true where id = '7e57c100-0000-0000-0000-000000176d01';   -- 0180: kredit len overenému
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t176-a','7e57c100-0000-0000-0000-000000176a01','charita','Charita 176',true);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel) values
 ('t176-z1','Strecha','charity','zbierka','aktivna','t176-a','7e57c100-0000-0000-0000-000000176a01', now(), 100000);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create or replace function pg_temp.pohybov(k text) returns bigint language sql as $$
  select count(*) from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = k $$;

-- ---- 1 · pokladňa zapnutá (testovacia verzia): dar kartou je hneď potvrdený, pohyby hneď, testovací ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000176d01', false);
select public.zbierka_dar_volba('t176-z1', 'p176-1', 25, 'EUR', 'fiat', 'Jana', 't176-a', 'Strecha', null, false);
reset role;
insert into t select 'zapnutá: platba settled hneď', (select stav = 'settled' and potvrdil = 'testovacia_pokladna' from public.platba where idem_kluc = 'p176-1');
insert into t select 'zapnutá: pohyby hneď, testovacie', pg_temp.pohybov('p176-1') >= 2
  and (select bool_and(po.testovaci) from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-1');
insert into t select 'zapnutá: plán pohybov uložený', (select pohyby_plan ? 'podiely' from public.platba where idem_kluc = 'p176-1');
insert into t select 'zapnutá: zbierka vidí 25', coalesce((select vyzbierane from public.v_zbierka_vyzbierane where zbierka = 't176-z1' and mena = 'EUR'), 0) = 25;
-- anonym (bez prihlásenia) kartou — tiež hneď
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select public.zbierka_dar_volba('t176-z1', 'p176-2', 5, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
reset role;
insert into t select 'zapnutá: anonym hneď potvrdený', (select stav = 'settled' from public.platba where idem_scope = '00000000-0000-0000-0000-000000000000' and idem_kluc = 'p176-2');
insert into t select 'zapnutá: zbierka vidí 30', coalesce((select vyzbierane from public.v_zbierka_vyzbierane where zbierka = 't176-z1' and mena = 'EUR'), 0) = 30;

-- ---- 2 · pokladňa vypnutá (ostrý štart): anonym kartou 10 000 € = pending, bez pohybov, zbierka nič nevidí ----
update public.ledger_prepinac set zapnute = false where kluc = 'testovacia_pokladna';
select set_config('deed.test_tx', '', true);
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select public.zbierka_dar_volba('t176-z1', 'p176-3', 10000, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
reset role;
insert into t select 'vypnutá: anonym 10 000 € je pending', (select stav = 'pending' and settled_at is null and potvrdil is null and ext_vs is not null
  from public.platba where idem_scope = '00000000-0000-0000-0000-000000000000' and idem_kluc = 'p176-3');
insert into t select 'vypnutá: bez pohybov', pg_temp.pohybov('p176-3') = 0;
insert into t select 'vypnutá: zbierka stále vidí 30', coalesce((select vyzbierane from public.v_zbierka_vyzbierane where zbierka = 't176-z1' and mena = 'EUR'), 0) = 30;
insert into t select 'vypnutá: zoznam darcov pending nevidí', (public.zbierka_dary('t176-z1')->>'pocet')::int = 2;
insert into t select 'vypnutá: rebríček pending nevidí', not exists (select 1 from public.v_top_darcovia d
  join public.platba pl on pl.odosielatel = d.ucet_id where pl.idem_kluc = 'p176-3');
-- appka (anon ani authenticated) platbu potvrdiť nevie
set role anon;
do $$ begin
  perform public.platba_potvrd((select id from public.platba where idem_kluc = 'p176-3'), 'rura');
  insert into t values ('vypnutá: anon nepotvrdí', false);
exception when others then insert into t values ('vypnutá: anon nepotvrdí', true);
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000176d01', false);
do $$ begin
  perform public.platba_potvrd_admin((select id from public.platba where idem_kluc = 'p176-3'));
  insert into t values ('vypnutá: ne-admin nepotvrdí', false);
exception when others then insert into t values ('vypnutá: ne-admin nepotvrdí', sqlerrm like '%nie_admin%');
end $$;
reset role;
-- rúra (server) potvrdí → settled, pohyby, zbierka vidí
select public.platba_potvrd(id, 'rura') from public.platba where idem_kluc = 'p176-3';
insert into t select 'potvrdené: settled, rura', (select stav = 'settled' and potvrdil = 'rura' and settled_at is not null from public.platba where idem_kluc = 'p176-3');
insert into t select 'potvrdené: pohyby ostré (nie testovacie)', pg_temp.pohybov('p176-3') >= 1
  and (select not bool_or(po.testovaci) from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-3');
insert into t select 'potvrdené: zbierka vidí 10 030', coalesce((select vyzbierane from public.v_zbierka_vyzbierane where zbierka = 't176-z1' and mena = 'EUR'), 0) = 10030;
insert into t select 'potvrdené: zoznam darcov 3', (public.zbierka_dary('t176-z1')->>'pocet')::int = 3;
insert into t select 'potvrdené: druhé potvrdenie nič nepridá', (select public.platba_potvrd(id, 'rura') is not null from public.platba where idem_kluc = 'p176-3')
  and pg_temp.pohybov('p176-3') = (select count(*) from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-3');
insert into t select 'potvrdené: podvojnosť (súčet zostatkov 0)', (select coalesce(sum(case when ucet_kredit = u.id then suma else -suma end), 0) = 0
  from public.pohyb po join public.ucet u on u.id in (po.ucet_debet, po.ucet_kredit) join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-3');

-- ---- 3 · darca s účtom, SEPA: pending, vo výpise „čaká", po potvrdení príchod cez procesor + dar ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000176d01', false);
select public.zbierka_dar_volba('t176-z1', 'p176-4', 40, 'EUR', 'sepa', 'Jana', 't176-a', 'Strecha', null, false);
insert into t select 'sepa: pending vo výpise darcu', exists (select 1 from public.v_vypis where platba_id = (select id from public.platba where idem_kluc = 'p176-4') and stav = 'pending' and smer = 'dal' and suma = 40);
reset role;
insert into t select 'sepa: VS pridelený, bez pohybov', (select ext_vs is not null and stav = 'pending' from public.platba where idem_kluc = 'p176-4') and pg_temp.pohybov('p176-4') = 0;
select public.platba_potvrd(id, 'rura') from public.platba where idem_kluc = 'p176-4';
insert into t select 'sepa: po potvrdení príchod procesor → darca → zbierka', (select count(*) = 2 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-4')
  and exists (select 1 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-4' and po.typ = 'dobitie' and po.ucet_debet = public.ucet_systemu('procesor') and po.ucet_kredit = '7e57c100-0000-0000-0000-000000176d01')
  and exists (select 1 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-4' and po.typ = 'dar' and po.ucet_debet = '7e57c100-0000-0000-0000-000000176d01');
insert into t select 'sepa: zbierka vidí 10 070', coalesce((select vyzbierane from public.v_zbierka_vyzbierane where zbierka = 't176-z1' and mena = 'EUR'), 0) = 10070;

-- ---- 4 · zlyhanie a expirácia ----
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select public.zbierka_dar_volba('t176-z1', 'p176-5', 7, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
select public.zbierka_dar_volba('t176-z1', 'p176-6', 8, 'EUR', 'sepa', null, 't176-a', 'Strecha', null, false);
select public.zbierka_dar_volba('t176-z1', 'p176-7', 9, 'EUR', 'sepa', null, 't176-a', 'Strecha', null, false);
reset role;
select public.platba_zlyhala(id, 'karta_odmietnuta') from public.platba where idem_kluc = 'p176-5';
insert into t select 'zlyhala: failed, bez pohybov, bez podpory', (select stav = 'failed' and zlyhanie = 'karta_odmietnuta' from public.platba where idem_kluc = 'p176-5')
  and pg_temp.pohybov('p176-5') = 0 and not exists (select 1 from public.podpora po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'p176-5');
do $$ begin
  perform public.platba_potvrd((select id from public.platba where idem_kluc = 'p176-5'), 'rura');
  insert into t values ('zlyhaná sa nedá potvrdiť', false);
exception when others then insert into t values ('zlyhaná sa nedá potvrdiť', sqlerrm like '%failed%');
end $$;
update public.platba set cas = now() - interval '8 days' where idem_kluc = 'p176-6';   -- SEPA po lehote
update public.platba set cas = now() - interval '2 days' where idem_kluc = 'p176-7';   -- SEPA v lehote
insert into t select 'expirácia: 1 platba', public.platba_pending_expiruj() = 1;
insert into t select 'expirácia: po lehote failed, v lehote pending', (select stav = 'failed' from public.platba where idem_kluc = 'p176-6') and (select stav = 'pending' from public.platba where idem_kluc = 'p176-7');
insert into t select 'zbierka nezmenená (10 070)', coalesce((select vyzbierane from public.v_zbierka_vyzbierane where zbierka = 't176-z1' and mena = 'EUR'), 0) = 10070;

-- ---- 5 · neprihlásený: z jednej IP najviac 30 nepotvrdených za hodinu (dokopy), iná IP ide ďalej, bez IP bez limitu ----
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.7, 10.0.0.1"}', false);
do $$ declare i int; begin
  for i in 1..30 loop
    perform public.zbierka_dar_volba('t176-z1', 'p176-L' || i, 3, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
  end loop;
end $$;
do $$ begin
  perform public.zbierka_dar_volba('t176-z1', 'p176-L31', 3, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
  insert into t values ('anonym: 31. pending z tej istej IP odmietne', false);
exception when others then insert into t values ('anonym: 31. pending z tej istej IP odmietne', sqlerrm like '%nepotvrdených%'); end $$;
insert into t select 'ip sa uklada len k pending platbe', (select count(*) from public.platba where ip_darcu = '203.0.113.7' and stav = 'pending') = 30;
select set_config('request.headers', '{"x-forwarded-for":"198.51.100.9"}', false);
select public.zbierka_dar_volba('t176-z1', 'p176-L32', 3, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
insert into t select 'ina IP prejde', (select stav = 'pending' from public.platba where idem_kluc = 'p176-L32');
select set_config('request.headers', '', false);
select public.zbierka_dar_volba('t176-z1', 'p176-L33', 3, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
insert into t select 'bez IP bez limitu', (select stav = 'pending' and ip_darcu is null from public.platba where idem_kluc = 'p176-L33');
reset role;
select public.platba_potvrd((select id from public.platba where idem_kluc = 'p176-L32'), 'rura');
insert into t select 'po potvrdeni sa IP zmaze', (select ip_darcu is null and stav = 'settled' from public.platba where idem_kluc = 'p176-L32');
set role anon;
reset role;
-- prihlásený darca limit nemá
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000176d01', false);
select public.zbierka_dar_volba('t176-z1', 'p176-8', 3, 'EUR', 'fiat', null, 't176-a', 'Strecha', null, false);
reset role;
insert into t select 'prihlásený: limit anonymov sa ho netýka', (select stav = 'pending' from public.platba where idem_kluc = 'p176-8');

-- ---- 6 · DeeD ostáva ako doteraz: pohyby hneď aj pri vypnutej pokladni ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000176d01', false);
select public.zbierka_dar_volba('t176-z1', 'p176-9', 10, 'DEED', 'deed', null, 't176-a', 'Strecha', null, false);
reset role;
insert into t select 'deed: settled hneď, pohyby hneď', (select stav = 'settled' and potvrdil = 'deed' from public.platba where idem_kluc = 'p176-9') and pg_temp.pohybov('p176-9') >= 1;

select ok, c from t order by ok, c;
rollback;
