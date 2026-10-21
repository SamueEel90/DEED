-- Test 0151 — PIN na citlivé akcie. ROLLBACK na konci, každý riadok ok = t.
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000151a01', 'pin@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000151a01','7e57c000-0000-0000-0000-000000151a01','aktivny','hotovo');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000151a01', false);
-- staré prihlásenie (pred hodinou)
select set_config('request.jwt.claims', json_build_object('sub','7e57c000-0000-0000-0000-000000151a01','amr', json_build_array(json_build_object('method','password','timestamp', extract(epoch from now() - interval '1 hour')::bigint)))::text, false);
insert into t select 'bez PINu: mam_pin nie', not public.mam_pin();
do $$ begin perform public.zmen_pin('1234'); insert into t values ('prvý PIN po starom prihlásení nie', false);
exception when others then insert into t values ('prvý PIN po starom prihlásení nie', sqlerrm like 'PIN si nastavíte%'); end $$;
reset role;
update public.ucet set pin_hash = crypt('1234', gen_salt('bf', 10)) where id = '7e57c100-0000-0000-0000-000000151a01';
set role authenticated;
insert into t select 'mam_pin áno', public.mam_pin();
insert into t select 'over_pin správny', public.over_pin('1234');
do $$ begin perform public.zmen_pin('5678'); insert into t values ('zmena bez starého nie', false);
exception when others then insert into t values ('zmena bez starého nie', sqlerrm = 'Zadajte súčasný PIN.'); end $$;
do $$ begin perform public.zmen_pin('5678', '0000'); insert into t values ('zlý starý nie', false);
exception when others then insert into t values ('zlý starý nie', sqlerrm = 'Súčasný PIN nesedí.'); end $$;
do $$ begin perform public.zmen_pin('12'); insert into t values ('krátky PIN nie', false);
exception when others then insert into t values ('krátky PIN nie', sqlerrm like 'PIN má%'); end $$;
insert into t select 'zmena so starým', public.zmen_pin('5678', '1234');
-- čerstvé prihlásenie heslom: zabudnutý PIN sa dá nastaviť bez starého
select set_config('request.jwt.claims', json_build_object('sub','7e57c000-0000-0000-0000-000000151a01','amr', json_build_array(json_build_object('method','password','timestamp', extract(epoch from now() - interval '2 minutes')::bigint)))::text, false);
insert into t select 'po prihlásení heslom bez starého', public.zmen_pin('2468');
insert into t select 'nový PIN platí', public.over_pin('2468');
reset role;
select ok, c from t order by ok, c;
rollback;
