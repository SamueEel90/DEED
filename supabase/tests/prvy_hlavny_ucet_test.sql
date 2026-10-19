-- ============================================================
-- Test 0127 — prvý hlavný účet po KYB: registrácia charity zapíše IBAN aj po overení stanov,
-- účet sa prenesie na stránku ako overený; zmena už zapísaného overeného účtu ostáva zakázaná.
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id, email) values ('7e57c000-0000-0000-0000-0000001271a1', 'reg127@test.sk');
insert into public.ucet (id, auth_id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-0000001271a1','7e57c000-0000-0000-0000-0000001271a1','aktivny','hotovo');
insert into public.ucet (id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-0000001271b1','charita','kyb');
insert into public.statutar (org_ucet_id, osoba_ucet_id, opravnenie) values ('7e57c100-0000-0000-0000-0000001271b1','7e57c100-0000-0000-0000-0000001271a1','test');
insert into public.organizacia (ucet_id, ico, nazov) values ('7e57c100-0000-0000-0000-0000001271b1', '12712712', 'OZ Test 127');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t127-ucet','7e57c100-0000-0000-0000-0000001271b1','charita','OZ Test 127',false);
insert into public.kyb (org_ucet_id, vysledok) values ('7e57c100-0000-0000-0000-0000001271b1', 'overena');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-0000001271a1', false);
do $$ begin
  update public.organizacia set bankovy_ucet = 'SK12 0900 2352 4546 5656' where ucet_id = '7e57c100-0000-0000-0000-0000001271b1';
  insert into t values ('prvý IBAN po KYB sa zapíše', (select bankovy_ucet is not null from public.organizacia where ucet_id = '7e57c100-0000-0000-0000-0000001271b1'));
exception when others then insert into t values ('prvý IBAN po KYB sa zapíše: ' || sqlerrm, false); end $$;
do $$ begin
  update public.organizacia set bankovy_ucet = 'SK99 1100 0000 0000 0000 0001' where ucet_id = '7e57c100-0000-0000-0000-0000001271b1';
  insert into t values ('zmena overeného IBAN je zakázaná', false);
exception when insufficient_privilege then insert into t values ('zmena overeného IBAN je zakázaná', true); end $$;
reset role;
insert into t select 'IBAN prenesený na stránku ako overený', exists (select 1 from public.overenie_uctu where stranka = 't127-ucet' and iban = public.norm_iban('SK12 0900 2352 4546 5656') and stav = 'overeny');

select ok, c from t order by ok, c;
rollback;
