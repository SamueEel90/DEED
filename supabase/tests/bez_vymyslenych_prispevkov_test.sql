-- OPRAVY 426 · 0135: vo feedoch nie je vymyslený príspevok, ledger nemá pohyb k neexistujúcemu príspevku a ostal nemenný
begin;
\pset tuples_only on
create temp table t(c text, ok boolean);
insert into t select 'žiadny príspevok bez skutočného autora', not exists (select 1 from public.prispevok p where p.autor_ucet_id is null
  or exists (select 1 from public.ucet u where u.id = p.autor_ucet_id and u.auth_id is null and u.stav_registracie = 'testovaci'));
insert into t select 'žiadna platba k zmazanému príspevku', not exists (select 1 from public.platba pl where pl.case_id is not null and not exists (select 1 from public.prispevok p where p.id = pl.case_id));
insert into t select 'žiadny pohyb k zmazanému príspevku', not exists (select 1 from public.pohyb po where po.case_id is not null and not exists (select 1 from public.prispevok p where p.id = po.case_id));
insert into t select 'ledger je zase nemenný', exists (select 1 from pg_trigger where tgname = 'pohyb_nemenny' and tgenabled <> 'D');
select ok, c from t;
rollback;
