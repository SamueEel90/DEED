-- ============================================================
-- Test 0179 — overenie a typ účtu nastavuje server, nie appka. Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-000000179d01', 'd179@test.sk'), ('7e57c000-0000-0000-0000-000000179d02', 'x179@test.sk');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000179d01', false);
-- appka založí účet a tvrdí email_overeny = true → server ho dá podľa Auth (nepotvrdený = false)
insert into public.ucet (auth_id, typ, email, email_overeny, stav_registracie) values ('7e57c000-0000-0000-0000-000000179d01', 'aktivny', 'd179@test.sk', true, 'udaje');
reset role;
insert into t select 'email_overeny z klienta sa ignoruje (false)', (select not email_overeny from public.ucet where auth_id = '7e57c000-0000-0000-0000-000000179d01');
-- Auth e-mail potvrdí → ďalší zápis z appky ho prenesie
update auth.users set email_confirmed_at = now() where id = '7e57c000-0000-0000-0000-000000179d01';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000179d01', false);
update public.ucet set stav_registracie = 'hotovo' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
reset role;
insert into t select 'po potvrdení v Auth je email_overeny true', (select email_overeny and stav_registracie = 'hotovo' from public.ucet where auth_id = '7e57c000-0000-0000-0000-000000179d01');
-- typ firma, stav testovaci, cudzí auth_id, system_kluc → odmietne
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000179d01', false);
do $$ begin update public.ucet set typ = 'firma' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
  insert into t values ('typ firma z appky odmietnutý', false);
exception when others then insert into t values ('typ firma z appky odmietnutý', sqlerrm like '%Typ účtu%'); end $$;
do $$ begin update public.ucet set stav_registracie = 'testovaci' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
  insert into t values ('stav testovaci z appky odmietnutý', false);
exception when others then insert into t values ('stav testovaci z appky odmietnutý', sqlerrm like '%stav účtu%'); end $$;
do $$ begin update public.ucet set auth_id = '7e57c000-0000-0000-0000-000000179d02' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
  insert into t values ('zmena auth_id odmietnutá', false);
exception when others then insert into t values ('zmena auth_id odmietnutá', true); end $$;
do $$ begin update public.ucet set system_kluc = 'procesor2' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
  insert into t values ('system_kluc z appky odmietnutý', false);
exception when others then insert into t values ('system_kluc z appky odmietnutý', true); end $$;
-- pasivny ↔ aktivny z appky ostáva (dokončenie registrácie anonymného účtu)
update public.ucet set typ = 'pasivny' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
update public.ucet set typ = 'aktivny' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
reset role;
insert into t select 'pasivny → aktivny z appky prejde', (select typ = 'aktivny' from public.ucet where auth_id = '7e57c000-0000-0000-0000-000000179d01');
-- server (postgres / service_role) bez obmedzenia
update public.ucet set stav_registracie = 'testovaci' where auth_id = '7e57c000-0000-0000-0000-000000179d01';
insert into t select 'server stav nastaví', (select stav_registracie = 'testovaci' from public.ucet where auth_id = '7e57c000-0000-0000-0000-000000179d01');

select ok, c from t order by ok, c;
rollback;
