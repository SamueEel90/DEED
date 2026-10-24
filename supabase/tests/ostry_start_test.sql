-- ============================================================
-- Test 0181 — ostrý štart: po ostry_start() drží každá testovacia poistka. Beží v transakcii s ROLLBACK, každý riadok ok = t.
-- ============================================================
begin;
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000181d01'), ('7e57c000-0000-0000-0000-000000181c01');
insert into public.ucet (id, auth_id, typ, stav_registracie) values
 ('7e57c100-0000-0000-0000-000000181d01','7e57c000-0000-0000-0000-000000181d01','aktivny','hotovo'),   -- tester
 ('7e57c100-0000-0000-0000-000000181c01','7e57c000-0000-0000-0000-000000181c01','charita','hotovo');   -- charita (vlastník stránky)
insert into public.ucet (id, typ, stav_registracie) values ('7e57c100-0000-0000-0000-000000181f01','firma','testovaci');   -- testovacia firma
update public.ucet set telefon_overeny = true where id = '7e57c100-0000-0000-0000-000000181d01';
insert into public.stranka (id, ucet_id, typ, nazov, testovacia) values ('t181-a','7e57c100-0000-0000-0000-000000181c01','charita','Charita 181',true);
insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel) values
 ('t181-z1','Strecha','charity','zbierka','aktivna','t181-a','7e57c100-0000-0000-0000-000000181c01', now(), 100000);
\pset tuples_only on
create temp table t(c text, ok boolean);
grant all on t to public;

-- pred ostrým štartom: tester sa na testovacej stránke stane správcom, za testovaciu firmu koná ktokoľvek
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000181d01', false);
insert into t select 'pred: tester je testovaci spravca', public.testovaci_spravca('t181-a');
insert into t select 'pred: ktokolvek kona za testovaciu firmu', public.konam_za_firmu('7e57c100-0000-0000-0000-000000181f01');
do $$ begin perform public.ostry_start(); insert into t values ('appka ostry_start nespusti', false);
exception when others then insert into t values ('appka ostry_start nespusti', true); end $$;
reset role;

-- ---- OSTRÝ ŠTART ----
create temp table r as select public.ostry_start() j;
insert into t select 'sprava: stranky z testovacich >= 1', (select (j->>'stranky_z_testovacich')::int >= 1 from r);
insert into t select 'sprava: firmy z testovacich >= 1', (select (j->>'firmy_z_testovacich')::int >= 1 from r);
insert into t select 'sprava: testovacie vazby zrusene', (select (j->>'zrusene_testovacie_vazby')::int >= 1 from r);
insert into t select 'sprava: ziadna otvorena zapisova politika', (select jsonb_array_length(j->'otvorene_zapisove_politiky') = 0 from r);
insert into t select 'je_testovaci = false', not public.je_testovaci();
insert into t select 'prepinace vypnute', not exists (select 1 from public.ledger_prepinac where kluc = 'testovacia_pokladna' and zapnute)
  and not exists (select 1 from public.server_prepinac where kluc in ('otp_mock','kyc_mock','kyb_mock') and zapnute);
insert into t select 'ziadna testovacia stranka', not exists (select 1 from public.stranka where testovacia);
insert into t select 'ziadna testovacia firma', not exists (select 1 from public.ucet where typ = 'firma' and stav_registracie = 'testovaci');
insert into t select 'druhe spustenie nic nerozbije', (select public.ostry_start() is not null);

-- ---- poistky po ostrom štarte ----
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000181d01', false);
insert into t select 'tester uz nie je spravca stranky', not public.spravujem_stranku('t181-a');
do $$ begin perform public.testovaci_spravca('t181-a'); insert into t values ('testovaci_spravca odmietne', false);
exception when others then insert into t values ('testovaci_spravca odmietne', sqlerrm like '%nie_spravca%'); end $$;
insert into t select 'za byvalu testovaciu firmu nekona ktokolvek', not public.konam_za_firmu('7e57c100-0000-0000-0000-000000181f01');
insert into t select 'otp: kod sa nevracia', (public.otp_posli('+421901234567')->>'demo') = 'false' and public.otp_posli('+421901234567') ? 'kod' = false;
do $$ begin perform public.kyc_spusti(); insert into t values ('kyc bez vendora = chyba', false);
exception when others then insert into t values ('kyc bez vendora = chyba', sqlerrm like '%vendor%'); end $$;
do $$ begin perform public.testovacie_dobitie(10); insert into t values ('dobitie vypnute', false);
exception when others then insert into t values ('dobitie vypnute', sqlerrm like '%vypnut%'); end $$;
do $$ begin perform public.zbierka_dar_volba('t181-z1', 'o181-t', 5, 'EUR', 'fiat', null, 't181-a', 'Strecha', null, true);
  insert into t values ('testovacia platba odmietnuta', false);
exception when others then insert into t values ('testovacia platba odmietnuta', sqlerrm like '%vypnut%'); end $$;
do $$ begin perform public.dev_over_ucet('t181-a', 'SK3109000000005122334417'); insert into t values ('dev overenie uctu odmietnute', false);
exception when others then insert into t values ('dev overenie uctu odmietnute', true); end $$;
select public.dorovnania_testovacie('charita', 't181-a', '{"strecha":"t181-z1"}');
-- ostrý dar kartou čaká na rúru (0176)
select public.zbierka_dar_volba('t181-z1', 'o181-1', 5, 'EUR', 'fiat', null, 't181-a', 'Strecha', null, false);
reset role;
insert into t select 'testovacie dorovnania sa nevytvoria', not exists (select 1 from public.dorovnanie where stranka = 't181-a');
insert into t select 'ostry dar kartou je pending bez pohybov', (select stav = 'pending' from public.platba where idem_kluc = 'o181-1')
  and not exists (select 1 from public.pohyb po join public.platba pl on pl.id = po.platba_id where pl.idem_kluc = 'o181-1');
insert into t select 'ostry dar nie je testovaci', (select not testovaci from public.platba where idem_kluc = 'o181-1');
-- zbierka bez overeného účtu sa nezapečatí (0132 už nepustí)
do $$ begin
  insert into public.zbierka (id, nazov, modul, typ, stav, stranka, ucet_id, zapecatena, ciel, nastavenie)
    values ('t181-z2','Bez uctu','charity','zbierka','aktivna','t181-a','7e57c100-0000-0000-0000-000000181c01', now(), 1000, '{"ucet":"SK3109000000005122334417"}');
  insert into t values ('zbierka bez overeneho uctu sa nezapecati', false);
exception when others then insert into t values ('zbierka bez overeneho uctu sa nezapecati', sqlerrm like '%overen%'); end $$;
-- nový účet bez overenia nedostane kredit (0180)
insert into auth.users (id) values ('7e57c000-0000-0000-0000-000000181e01');
set role authenticated;
select set_config('request.jwt.claim.sub', '7e57c000-0000-0000-0000-000000181e01', false);
select public.zaisti_ucet() is not null;
insert into t select 'anonymny ucet bez kreditu', (select zostatok_deed from public.v_zostatok) = 0;
reset role;

select ok, c from t order by ok, c;
rollback;
