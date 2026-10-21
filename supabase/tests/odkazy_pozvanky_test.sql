-- ============================================================
-- Test 0143 — osobný odkaz usera a pozvánka ku skutku (OPRAVY 449)
-- Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
-- C = správca charity (Martin), D = pozvaná (manželka), E = tretí
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000143c01'), ('7e57c000-0000-0000-0000-000000143d01'), ('7e57c000-0000-0000-0000-000000143e01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000143c01','7e57c000-0000-0000-0000-000000143c01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000143d01','7e57c000-0000-0000-0000-000000143d01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000143e01','7e57c000-0000-0000-0000-000000143e01','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko, mesto, profilovka_url) values
 ('7e57c100-0000-0000-0000-000000143c01','Martin','Štofik','Trenčín','https://x.test/f.jpg'),
 ('7e57c100-0000-0000-0000-000000143d01','Jana','Štofiková','Trenčín',null);
insert into public.zobrazenie (ucet_id, rezim) values ('7e57c100-0000-0000-0000-000000143c01','iniciala');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t143-ch','7e57c100-0000-0000-0000-000000143c01','charita','Pod korunami test',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table tok(t text);
grant all on tok to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000143c01', false);
insert into t select 'môj odkaz z návrhu', public.moj_odkaz('Martin-Š') = 'martin';
insert into t select 'druhé volanie vráti ten istý', public.moj_odkaz('iný') = 'martin';
insert into tok select public.pozvanka_vytvor('m123', 'Teplé jedlo', 't143-ch');
do $$ begin perform public.pozvanka_vytvor('m124', 'X', 'cudzia'); insert into t values ('cudzia stránka neprejde', false);
exception when others then insert into t values ('cudzia stránka neprejde', true); end $$;
do $$ begin perform public.pozvanka_prijmi((select t from tok)); insert into t values ('vlastnú pozvánku nepotvrdí', false);
exception when others then insert into t values ('vlastnú pozvánku nepotvrdí', sqlerrm = 'Vlastnú pozvánku potvrdiť nemôžete.'); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000143d01', false);
insert into t select 'iný user s rovnakým návrhom dostane číslo', public.moj_odkaz('martin') = 'martin-2';
reset role;

set role anon;
insert into t select 'profil: meno podľa voľby (iniciála) a fotka', (select p->>'meno' = 'Martin Š.' and p->>'foto' = 'https://x.test/f.jpg' and p->>'mesto' is null from (select public.profil_osoby('martin') p) x);
insert into t select 'profil: anonym bez mena a fotky', (select p->>'meno' is null and p->>'foto' is null from (select public.profil_osoby('martin-2') p) x);
insert into t select 'profil: neexistujúci odkaz = null', public.profil_osoby('nikto') is null;
insert into t select 'pozvánka bez prihlásenia: názov a od', (select i->>'nazov' = 'Teplé jedlo' and i->>'od' = 'Pod korunami test' and (i->>'plati')::boolean from (select public.pozvanka_info((select t from tok)) i) x);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000143d01', false);
insert into t select 'pozvaná potvrdí', public.pozvanka_prijmi((select t from tok))->>'nazov' = 'Teplé jedlo';
insert into t select 'druhé potvrdenie tou istou je ok', public.pozvanka_prijmi((select t from tok))->>'nazov' = 'Teplé jedlo';
insert into t select 'info: moja', (public.pozvanka_info((select t from tok))->>'moja')::boolean;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000143e01', false);
do $$ begin perform public.pozvanka_prijmi((select t from tok)); insert into t values ('iný už nepotvrdí', false);
exception when others then insert into t values ('iný už nepotvrdí', sqlerrm = 'Túto pozvánku už potvrdil niekto iný.'); end $$;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000143c01', false);
insert into t select 'organizátor vidí potvrdenie', (select prijal_meno = 'Jana Š.' from public.pozvanky_skutku('m123'));
reset role;

-- po 2 hodinách neplatí
update public.pozvanka_skutku set plati_do = now() - interval '1 minute', prijal = null, prijal_meno = null, prijate = null where token = (select t from tok);
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000143d01', false);
do $$ begin perform public.pozvanka_prijmi((select t from tok)); insert into t values ('neplatná po 2 h', false);
exception when others then insert into t values ('neplatná po 2 h', sqlerrm = 'Pozvánka už neplatí. Platí 2 hodiny.'); end $$;
reset role;

select ok, c from t order by ok, c;
rollback;
