-- Test 0147 — miesto na akcii podržané 15 minút. ROLLBACK na konci, každý riadok ok = t.
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000147c01'), ('7e57c000-0000-0000-0000-000000147e01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000147c01','7e57c000-0000-0000-0000-000000147c01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000147e01','7e57c000-0000-0000-0000-000000147e01','aktivny','hotovo');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
create temp table k(tok text, rez text);
grant all on k to public;
\set A '\'a1470000-0000-0000-0000-000000000001\''
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000147c01', false);
select public.event_secret_create(:A, 15, 'threshold', 'Pod korunami');
insert into k (tok) select public.event_token(:A);
reset role;
-- hosť bez účtu naskenuje → miesto podržané
set role anon;
update k set rez = public.akcia_rezervuj((select tok from k))->>'rez';
insert into t select 'hosť dostane pozvanie', (select rez is not null from k);
insert into t select 'info pre hosťa', (public.akcia_info_rez((select rez from k))->>'nazov') = 'Pod korunami';
insert into t select 'falošný kód nič', (public.akcia_rezervuj('DEED1.a1470000-0000-0000-0000-000000000001.1.abcdabcdabcdabcd')->>'plati')::boolean = false;
reset role;
-- o 10 minút (kód QR už dávno neplatí) sa po registrácii pripojí bez nového skenu
update public.akcia_pozvanie set plati_do = now() + interval '5 minutes';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000147e01', false);
insert into t select 'pripojí sa bez nového skenu', (public.akcia_pripoj_rez((select rez from k))->>'nove')::boolean;
insert into t select 'je na akcii', (public.akcia_info_rez((select rez from k))->>'som')::boolean;
reset role;
-- po 15 minútach: čas vypršal
update public.akcia_pozvanie set plati_do = now() - interval '1 second';
delete from public.dochadzka where event_id = :A;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000147e01', false);
do $$ begin perform public.akcia_pripoj_rez((select rez from k)); insert into t values ('po 15 min čas vypršal', false);
exception when others then insert into t values ('po 15 min čas vypršal', sqlerrm like 'Čas vypršal%'); end $$;
insert into t select 'info: vypršal', (public.akcia_info_rez((select rez from k))->>'vyprsal')::boolean;
reset role;
select ok, c from t order by ok, c;
rollback;
