-- ============================================================
-- Test 0165 — charita Zadarmo: jedna zbierka naraz (centrálna alebo pre niekoho), bez pravidelnej podpory.
-- Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000165a01'), ('7e57c000-0000-0000-0000-000000165b01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000165a01','7e57c000-0000-0000-0000-000000165a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000165b01','7e57c000-0000-0000-0000-000000165b01','aktivny','hotovo');
-- Z = Zadarmo (bez riadku programu), C = Zadarmo s centrálnou, P = P1, F = farnosť
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values
 ('t165-z','7e57c100-0000-0000-0000-000000165a01','charita','Zadarmo 165',true),
 ('t165-c','7e57c100-0000-0000-0000-000000165a01','charita','Centrálna 165',true),
 ('t165-p','7e57c100-0000-0000-0000-000000165a01','charita','P1 165',true),
 ('t165-f','7e57c100-0000-0000-0000-000000165a01','farnost','Farnosť 165',true);
insert into public.stranka_program (stranka, tier) values ('t165-p', 1);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
-- zápis ako z appky: rola authenticated, príkaz cez security definer (RLS nerieši tento test)
create function public.t165_chyba(p_sql text) returns text language plpgsql security definer set search_path = public as $$
begin execute p_sql; return 'ok'; exception when others then return sqlerrm; end $$;
grant execute on function public.t165_chyba(text) to authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000165b01', false);

insert into t select 'Zadarmo: prvá zbierka pre niekoho prejde', public.t165_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t165-z1','Prvá','charity','zbierka','aktivna','t165-z', '7e57c100-0000-0000-0000-000000165a01', now())$$) = 'ok';
insert into t select 'Zadarmo: druhá zbierka neprejde', public.t165_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t165-z2','Druhá','charity','zbierka','aktivna','t165-z', '7e57c100-0000-0000-0000-000000165a01', now())$$) = 'zadarmo_jedna_zbierka';
insert into t select 'Zadarmo: centrálna sa nespustí, kým beží zbierka', public.t165_chyba($$insert into public.profil_stranky (stranka, centralna) values ('t165-z', '{"popis":"x","spustena":"2026-10-23T12:00:00Z"}')$$) = 'zadarmo_jedna_zbierka';
insert into t select 'Zadarmo: centrálna sa uloží ako koncept (bez spustenia)', public.t165_chyba($$insert into public.profil_stranky (stranka, centralna) values ('t165-z', '{"popis":"x"}') on conflict (stranka) do update set centralna = excluded.centralna$$) = 'ok';
insert into t select 'ukončenie zbierky', public.t165_chyba($$update public.zbierka set stav = 'ukoncena' where id = 't165-z1'$$) = 'ok';
insert into t select 'Zadarmo: po ukončení zbierky sa centrálna spustí', public.t165_chyba($$update public.profil_stranky set centralna = '{"popis":"x","spustena":"2026-10-23T12:00:00Z"}' where stranka = 't165-z'$$) = 'ok';
insert into t select 'Zadarmo: úprava spustenej centrálnej prejde', public.t165_chyba($$update public.profil_stranky set centralna = '{"popis":"y","spustena":"2026-10-23T12:00:00Z"}' where stranka = 't165-z'$$) = 'ok';
insert into t select 'Zadarmo: so spustenou centrálnou zbierka pre niekoho neprejde', public.t165_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t165-z3','Tretia','charity','zbierka','aktivna','t165-z', '7e57c100-0000-0000-0000-000000165a01', now())$$) = 'zadarmo_jedna_zbierka';
insert into t select 'Zadarmo: dar na centrálnu (riadok hlavna) prejde', public.t165_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id) values ('t165-z:hlavna','Celá činnosť','charity','hlavna','aktivna','t165-z', '7e57c100-0000-0000-0000-000000165a01')$$) = 'ok';
insert into t select 'P1: dve zbierky aj centrálna prejdú', public.t165_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t165-p1','A','charity','zbierka','aktivna','t165-p', '7e57c100-0000-0000-0000-000000165a01', now()), ('t165-p2','B','charity','zbierka','aktivna','t165-p', '7e57c100-0000-0000-0000-000000165a01', now()); insert into public.profil_stranky (stranka, centralna) values ('t165-p', '{"spustena":"2026-10-23T12:00:00Z"}')$$) = 'ok';
insert into t select 'farnosť bez programu: dve zbierky prejdú', public.t165_chyba($$insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t165-f1','A','nabozenstvo','zbierka','aktivna','t165-f', '7e57c100-0000-0000-0000-000000165a01', now()), ('t165-f2','B','nabozenstvo','zbierka','aktivna','t165-f', '7e57c100-0000-0000-0000-000000165a01', now())$$) = 'ok';

insert into t select 'server (postgres) obíde kontrolu', true;
insert into t select 'Zadarmo: pravidelná podpora neprejde', public.t165_chyba($$select public.pravidelna_zapni('t165-z:hlavna', 10, 'EUR', 'mesacne')$$) = 'zadarmo_bez_pravidelnej';
insert into t select 'P1: pravidelná podpora prejde', public.t165_chyba($$select public.pravidelna_zapni('t165-p:hlavna', 10, 'EUR', 'mesacne')$$) = 'ok';
insert into t select 'farnosť: pravidelná podpora prejde', public.t165_chyba($$select public.pravidelna_zapni('t165-f:hlavna', 10, 'EUR', 'mesacne')$$) = 'ok';
reset role;
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena) values ('t165-z9','Seed','charity','zbierka','aktivna','t165-z','7e57c100-0000-0000-0000-000000165a01', now());
update t set ok = exists (select 1 from public.zbierka where id = 't165-z9') where c = 'server (postgres) obíde kontrolu';

select ok, c from t order by ok, c;
rollback;
