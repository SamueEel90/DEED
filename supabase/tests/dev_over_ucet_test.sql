-- ============================================================
-- Test 0108 — dev_over_ucet: len správca, len testovacia verzia, žiadosť „caka“ → „overeny“
-- Všetko beží v transakcii a na konci sa vráti (ROLLBACK). Každý riadok musí mať ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57e000-0000-0000-0000-0000000000f1'), ('7e57e000-0000-0000-0000-0000000000e1');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57e100-0000-0000-0000-0000000000f1','7e57e000-0000-0000-0000-0000000000f1','charita','hotovo'),
 ('7e57e100-0000-0000-0000-0000000000e1','7e57e000-0000-0000-0000-0000000000e1','aktivny','hotovo');
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t-dev','7e57e100-0000-0000-0000-0000000000f1','farnost','Ostrá fara',false);
insert into public.overenie_uctu (stranka, iban, kod, stav) values ('t-dev','SK0011000000002612345671','DEED TEST01','caka');
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

set role authenticated;
select set_config('request.jwt.claim.sub', '7e57e000-0000-0000-0000-0000000000e1', false);
do $$ begin perform public.dev_over_ucet('t-dev', 'SK00 1100 0000 0026 1234 5671'); insert into t values ('cudzi nesmie', false);
exception when insufficient_privilege then insert into t values ('cudzi nesmie', true); end $$;

select set_config('request.jwt.claim.sub', '7e57e000-0000-0000-0000-0000000000f1', false);
insert into t select 'spravca v testovacej verzii overi (IBAN s medzerami)', public.dev_over_ucet('t-dev', 'SK00 1100 0000 0026 1234 5671');
insert into t select 'stav je overeny', (select stav = 'overeny' and overene is not null from public.overenie_uctu where stranka = 't-dev');
insert into t select 'druhy raz nic nezmeni', not public.dev_over_ucet('t-dev', 'SK0011000000002612345671');
reset role;

-- ostrý štart: pokladňa vypnutá a stránka nie je testovacia → odmietne
update public.ledger_prepinac set zapnute = false where kluc = 'testovacia_pokladna';
update public.overenie_uctu set stav = 'caka', overene = null where stranka = 't-dev';
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57e000-0000-0000-0000-0000000000f1', false);
do $$ begin perform public.dev_over_ucet('t-dev', 'SK0011000000002612345671'); insert into t values ('ostra verzia odmietne', false);
exception when insufficient_privilege then insert into t values ('ostra verzia odmietne', true); end $$;
reset role;

select ok, c from t order by ok, c;

rollback;
