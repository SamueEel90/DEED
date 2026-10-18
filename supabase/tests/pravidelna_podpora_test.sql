-- ============================================================
-- Test 0109 — pravidelná podpora: zapnúť (prihlásený), zrušiť (len svoju), počet v statistiky_farnosti
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57f000-0000-0000-0000-0000000000f1'), ('7e57f000-0000-0000-0000-0000000000d1'), ('7e57f000-0000-0000-0000-0000000000d2');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57f100-0000-0000-0000-0000000000f1','7e57f000-0000-0000-0000-0000000000f1','charita','hotovo'),
 ('7e57f100-0000-0000-0000-0000000000d1','7e57f000-0000-0000-0000-0000000000d1','aktivny','hotovo'),
 ('7e57f100-0000-0000-0000-0000000000d2','7e57f000-0000-0000-0000-0000000000d2','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t-pp','7e57f100-0000-0000-0000-0000000000f1','farnost','Testovacia fara',true);
\pset tuples_only on
create temp table t(c text, ok boolean);
create temp table ids(k text, id uuid);
grant all on t to public; grant all on ids to public;

set role anon;
do $$ begin perform public.pravidelna_zapni('t-pp:hlavna', 10, 'EUR', 'mesacne'); insert into t values ('bez prihlasenia nie', false);
exception when others then insert into t values ('bez prihlasenia nie', sqlerrm = 'neprihlaseny' or sqlstate = '42501'); end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57f000-0000-0000-0000-0000000000d1', false);
insert into ids select 'd1', public.pravidelna_zapni('t-pp:hlavna', 10, 'EUR', 'mesacne');
insert into ids select 'd1b', public.pravidelna_zapni('t-pp:hlavna', 5, 'EUR', 'tyzdenne');
select set_config('request.jwt.claim.sub', '7e57f000-0000-0000-0000-0000000000d2', false);
insert into ids select 'd2', public.pravidelna_zapni('t-pp:hlavna', 20, 'EUR', 'mesacne');
insert into t select 'darca vidi len svoje', (select count(*) from public.pravidelna_podpora) = 1;
insert into t select 'cudziu zrusit nejde', not public.pravidelna_zrus((select id from ids where k = 'd1'));
do $$ begin perform public.pravidelna_zapni('neexistuje', 10, 'EUR', 'mesacne'); insert into t values ('neznama zbierka = chyba', false);
exception when no_data_found then insert into t values ('neznama zbierka = chyba', true); end $$;

select set_config('request.jwt.claim.sub', '7e57f000-0000-0000-0000-0000000000f1', false);
insert into t select 'pravidelna = 2 ludia (D1 dvakrat = 1)', (public.statistiky_farnosti('t-pp', now() - interval '30 days')->>'pravidelna')::int = 2;
select set_config('request.jwt.claim.sub', '7e57f000-0000-0000-0000-0000000000d2', false);
insert into t select 'darca zrusi svoju', public.pravidelna_zrus((select id from ids where k = 'd2'));
select set_config('request.jwt.claim.sub', '7e57f000-0000-0000-0000-0000000000f1', false);
insert into t select 'po zruseni pravidelna = 1', (public.statistiky_farnosti('t-pp', now() - interval '30 days')->>'pravidelna')::int = 1;
reset role;
insert into t select 'zrusene ma cas', (select zrusene is not null from public.pravidelna_podpora where id = (select id from ids where k = 'd2'));

select ok, c from t order by ok, c;

rollback;
