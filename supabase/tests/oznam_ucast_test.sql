-- ============================================================
-- Test 0136 — prihlásenie k výzve charity: limit, dátum, zrušené, „bez“, počty, kto vidí mená
-- Beží v transakcii, na konci ROLLBACK. Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000136a01'), ('7e57c000-0000-0000-0000-000000136b01'), ('7e57c000-0000-0000-0000-000000136c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000136a01','7e57c000-0000-0000-0000-000000136a01','charita','hotovo'),
 ('7e57c100-0000-0000-0000-000000136b01','7e57c000-0000-0000-0000-000000136b01','aktivny','hotovo'),
 ('7e57c100-0000-0000-0000-000000136c01','7e57c000-0000-0000-0000-000000136c01','aktivny','hotovo');
insert into public.profil (ucet_id, meno, priezvisko) values ('7e57c100-0000-0000-0000-000000136b01', 'Jana', 'Kováčová');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t136-ch','7e57c100-0000-0000-0000-000000136a01','charita','Charita Test 136',true);
insert into public.oznam_charity (id, stranka, druh, data, vytvoril_ucet) values
 ('t136-v1','t136-ch','vyzva', jsonb_build_object('pozvanie','zavazne','limit',1,'datum',to_char(now() + interval '3 days','YYYY-MM-DD')), '7e57c100-0000-0000-0000-000000136a01'),
 ('t136-v2','t136-ch','vyzva', jsonb_build_object('pozvanie','nezavazne','datum',to_char(now() - interval '2 days','YYYY-MM-DD')), '7e57c100-0000-0000-0000-000000136a01'),
 ('t136-v3','t136-ch','vyzva', jsonb_build_object('pozvanie','bez','datum',to_char(now() + interval '3 days','YYYY-MM-DD')), '7e57c100-0000-0000-0000-000000136a01');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

create function pg_temp.ako(p uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', p::text, true) $$;
create function pg_temp.chyba(p_id text) returns text language plpgsql as $$
begin perform public.oznam_ucast_prihlas(p_id); return null; exception when others then return sqlerrm; end $$;

set local role authenticated;
select pg_temp.ako('7e57c000-0000-0000-0000-000000136b01');
insert into t values ('1 prihlásenie vráti 1', public.oznam_ucast_prihlas('t136-v1') = 1);
insert into t values ('2 opakované nič nepridá', public.oznam_ucast_prihlas('t136-v1') = 1);
insert into t values ('3 meno Jana K.', (select meno from public.oznam_ucast where oznam = 't136-v1') = 'Jana K.');
insert into t values ('4 po dátume nie', pg_temp.chyba('t136-v2') = 'Oznam už skončil.');
insert into t values ('5 bez prihlásenia nie', pg_temp.chyba('t136-v3') = 'K tomuto oznamu sa neprihlasuje.');
select pg_temp.ako('7e57c000-0000-0000-0000-000000136c01');
insert into t values ('6 limit plný', pg_temp.chyba('t136-v1') = 'Prihlasovanie je už plné.');
insert into t values ('7 cudzie meno nevidno', (select count(*) from public.oznam_ucast) = 0);
insert into t values ('8 počty verejne', (select pocet = 1 and not moja from public.oznam_ucast_pocty(array['t136-v1'])));
insert into t values ('9 priamy zápis nejde', (select case when has_table_privilege('authenticated','public.oznam_ucast','insert') then false else true end));
select pg_temp.ako('7e57c000-0000-0000-0000-000000136a01');
insert into t values ('10 správca vidí meno', (select count(*) from public.oznam_ucast where oznam = 't136-v1') = 1);
reset role;
update public.oznam_charity set zrusene = now() where id = 't136-v1';
set local role authenticated;
select pg_temp.ako('7e57c000-0000-0000-0000-000000136c01');
insert into t values ('11 zrušené nie', pg_temp.chyba('t136-v1') = 'Oznam už neplatí.');
reset role;
select ok, c from t order by c collate "C";
rollback;
