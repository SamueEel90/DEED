-- ============================================================
-- 0135 · OPRAVY 426 (Martin 20. 10.: „vymaž, nech nás nestrašia v budúcnosti“)
-- ------------------------------------------------------------
-- Vymyslené (seed) príspevky z 0004 / 0005 / 0009 / 0010 vo všetkých feedoch (Domov, Charita, Aktivity, Help)
-- preč z databázy AJ s ich ukážkovými peniazmi. Vymyslený = bez autora, alebo autor je testovací účet bez prihlásenia
-- (0037 im takto doplnil autora: ucet.stav_registracie = 'testovaci' a auth_id null). Príspevky skutočných ľudí ostávajú.
-- Peniaze: platby k týmto príspevkom a všetky pohyby ich dokladov (vrátane storien) sa zmažú celé — doklad sa nedelí.
-- Ledger je inak nemenný (pohyb_nemenny); tu sa ochrana vypne len na tento jednorazový výmaz a hneď zapne.
-- ============================================================
begin;

create temporary table _p on commit drop as
  select p.id from public.prispevok p
   where p.autor_ucet_id is null
      or exists (select 1 from public.ucet u where u.id = p.autor_ucet_id and u.auth_id is null and u.stav_registracie = 'testovaci');

create temporary table _pl on commit drop as
  select pl.id from public.platba pl where pl.case_id in (select id from _p);

-- doklady, ktorých sa vymyslené príspevky týkajú → všetky ich pohyby (aj storná)
create temporary table _dok on commit drop as
  select distinct doklad from public.pohyb where case_id in (select id from _p) or platba_id in (select id from _pl);
create temporary table _po on commit drop as
  select id from public.pohyb where doklad in (select doklad from _dok);
insert into _po select s.id from public.pohyb s where s.storno_pre in (select id from _po) and s.id not in (select id from _po);
-- platby týchto dokladov (napr. dar rozdelený cez reťaz)
insert into _pl select distinct platba_id from public.pohyb where id in (select id from _po) and platba_id is not null and platba_id not in (select id from _pl);

alter table public.dorovnanie_zaznam disable trigger dorovnanie_zaznam_nemenny;
delete from public.dorovnanie_zaznam where pohyb_id in (select id from _po);
alter table public.dorovnanie_zaznam enable trigger dorovnanie_zaznam_nemenny;

alter table public.pohyb disable trigger pohyb_nemenny;
delete from public.pohyb where storno_pre in (select id from _po);
delete from public.pohyb where id in (select id from _po);
alter table public.pohyb enable trigger pohyb_nemenny;

delete from public.retaz_platba where platba_id in (select id from _pl);
delete from public.zbierka_vklad where platba_id in (select id from _pl);
delete from public.podpora where prispevok_id in (select id from _p) or platba_id in (select id from _pl);
delete from public.platba_split where platba_id in (select id from _pl) or case_id in (select id from _p);
update public.platba set parent_id = null where parent_id in (select id from _pl);
delete from public.platba where id in (select id from _pl);

-- ostatné odkazy na príspevok (QR, split, reťazec, escrow, opakovaná platba)
delete from public.qr_split_ciel where case_id in (select id from _p);
delete from public.qr_split where case_id in (select id from _p);
delete from public.retazec_qr where case_id in (select id from _p);
delete from public.opakovana_platba where case_id in (select id from _p);
delete from public.escrow where case_id in (select id from _p);

delete from public.prispevok where id in (select id from _p);

commit;
