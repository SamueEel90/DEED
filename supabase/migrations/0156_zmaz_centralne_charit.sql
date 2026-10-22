-- ============================================================
-- 0156 · OPRAVY 481 (Martin 22. 10.) · centrálne a sektorové zbierky charít Pod korunami, Míľnik a Pevný bod preč
-- ------------------------------------------------------------
-- Zmaže zbierky typu hlavna / sektor (id „<stránka>:…“), dary k nim (platby a všetky pohyby ich dokladov aj so stornami)
-- a centrálnu v profile (profil_stranky.centralna). Ostatné zbierky (Ben …), skutky a oznamy ostávajú.
-- Poistky (vtedy NEZMAŽE NIČ a vypíše prečo): doklad týchto darov sa týka aj inej zbierky, zbierka je v reťazi,
-- alebo je zapečatená. Ledger je inak nemenný — ochrana sa vypne len na tento výmaz a hneď zapne (ako 0135).
-- Funkcia zmaz_centralne_481() ostáva len pre test (volá ju len postgres). Idempotentné, na čistej DB nič nerobí.
-- ============================================================
begin;

create or replace function public.zmaz_centralne_481() returns text
  language plpgsql security definer set search_path = public as $$
declare v_st text; v_zb int; v_pl int; v_po int; v_eur numeric; v_cen int;
begin
  create temporary table _st on commit drop as
    select id from public.stranka
     where typ = 'charita' and (nazov ilike '%pod korunami%' or nazov ilike '%míľnik%' or nazov ilike '%milnik%' or nazov ilike '%pevný bod%' or nazov ilike '%pevny bod%');
  create temporary table _zb on commit drop as
    select z.id from public.zbierka z join _st on _st.id = z.stranka where z.typ in ('hlavna', 'sektor') or z.id like z.stranka || ':%';
  create temporary table _pl on commit drop as select id from public.platba where zbierka in (select id from _zb);
  create temporary table _dok on commit drop as select distinct doklad from public.pohyb where platba_id in (select id from _pl);
  create temporary table _po on commit drop as select id from public.pohyb where doklad in (select doklad from _dok);
  insert into _po select s.id from public.pohyb s where s.storno_pre in (select id from _po) and s.id not in (select id from _po);

  select string_agg(id, ', ') into v_st from _st;
  select count(*) into v_zb from _zb; select count(*) into v_pl from _pl; select count(*) into v_po from _po;
  select coalesce(sum(suma), 0) into v_eur from public.platba where id in (select id from _pl);
  select count(*) into v_cen from public.profil_stranky where stranka in (select id from _st) and centralna is not null;

  -- poistky
  if exists (select 1 from public.pohyb po join public.platba pl on pl.id = po.platba_id
              where po.id in (select id from _po) and (pl.zbierka is null or pl.zbierka not in (select id from _zb))) then
    drop table _st, _zb, _pl, _dok, _po;
    return format('0156: NEZMAZANÉ — doklad darov sa týka aj inej zbierky (stránky %s), napíš Martinovi', v_st);
  end if;
  if exists (select 1 from public.retaz_polozka where zbierka in (select id from _zb))
     or exists (select 1 from public.retaz_platba where zbierka in (select id from _zb) or platba_id in (select id from _pl))
     or exists (select 1 from public.retaz_oznam where zbierka in (select id from _zb)) then
    drop table _st, _zb, _pl, _dok, _po;
    return '0156: NEZMAZANÉ — zbierka je v reťazi dobra, napíš Martinovi';
  end if;
  if exists (select 1 from public.zbierka where id in (select id from _zb) and zapecatena is not null) then
    drop table _st, _zb, _pl, _dok, _po;
    return '0156: NEZMAZANÉ — centrálna/sektor je zapečatená, napíš Martinovi';
  end if;

  alter table public.dorovnanie_zaznam disable trigger dorovnanie_zaznam_nemenny;
  delete from public.dorovnanie_zaznam where pohyb_id in (select id from _po);
  alter table public.dorovnanie_zaznam enable trigger dorovnanie_zaznam_nemenny;
  alter table public.pohyb disable trigger pohyb_nemenny;
  delete from public.pohyb where storno_pre in (select id from _po);
  delete from public.pohyb where id in (select id from _po);
  alter table public.pohyb enable trigger pohyb_nemenny;

  delete from public.zbierka_vklad where platba_id in (select id from _pl) or zbierka in (select id from _zb);
  delete from public.podpora where platba_id in (select id from _pl);
  delete from public.platba_split where platba_id in (select id from _pl);
  update public.platba set parent_id = null where parent_id in (select id from _pl);
  delete from public.platba where id in (select id from _pl);

  delete from public.zbierka_podiel where zbierka in (select id from _zb);
  delete from public.oznam_darcovi where zbierka in (select id from _zb);
  delete from public.stranka_pripnuta_zbierka where zbierka in (select id from _zb);
  delete from public.zbierka where id in (select id from _zb);
  update public.profil_stranky set centralna = null, centralna_cas = now() where stranka in (select id from _st) and centralna is not null;

  drop table _st, _zb, _pl, _dok, _po;
  return format('0156: stránky %s · zmazané zbierky %s, platby %s (%s €), pohyby %s, centrálna v profile %s',
                coalesce(v_st, '—'), v_zb, v_pl, v_eur, v_po, v_cen);
end $$;
revoke all on function public.zmaz_centralne_481() from public, anon, authenticated;

do $$ begin raise notice '%', public.zmaz_centralne_481(); end $$;

commit;
