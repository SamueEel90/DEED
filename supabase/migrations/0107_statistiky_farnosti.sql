-- ============================================================
-- 0107 · OPRAVY 345 / 346 (odpovede 18. 10.) — presné počty do Štatistík, Sledujúcich a Ročného výpisu farnosti
-- ------------------------------------------------------------
-- statistiky_farnosti(stránka, od, do) — len správca stránky. Vráti jsonb:
--   darcovia_spolu      — rôzni darcovia od začiatku (prihlásený = 1 bez ohľadu na počet darov, bez účtu = každý dar)
--   novi_darcovia       — darcovia, ktorých prvý dar farnosti padol do obdobia [od, do)
--   sledujuci           — koľko účtov má farnosť medzi Mojimi farnosťami (moje_farnosti, 0076)
--   sledujuci_novi_30   — z toho pridaní za posledných 30 dní
--   pravidelna          — null: pravidelná podpora hlavnej zbierky sa na serveri zatiaľ neukladá s odkazom na zbierku
--   podiel_rodiny       — podiel farnosti (overovateľ) zo zbierok rodiny v období, po mene {"EUR": …, "DEED": …}, storno odpočítané
-- Dary farnosti = platby (credited / settled) na zbierky stránky: hlavná, zvončeková a zbierky farnosti
-- (zbierky rodiny nie — tie majú overovateľa v zbierka_podiel; z nich sa ráta len podiel farnosti).
-- Len čítanie, tabuľky sa nemenia.
-- ============================================================
begin;

create or replace function public.statistiky_farnosti(p_stranka text, p_od timestamptz, p_do timestamptz default null) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare v_do timestamptz := coalesce(p_do, 'infinity'::timestamptz); v jsonb;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  with dary as (
    select coalesce(pl.odosielatel::text, pl.id::text) as kto, pl.cas
      from public.platba pl join public.zbierka z on z.id = pl.zbierka
     where z.stranka = p_stranka and pl.stav in ('credited', 'settled')
       and coalesce(z.nastavenie->'farnost'->>'druh', 'farnost') = 'farnost'
       and not exists (select 1 from public.zbierka_podiel o where o.zbierka = z.id and o.druh = 'overovatel')
  ), prvy as (select kto, min(cas) as cas from dary group by kto),
  podiel as (
    select po.mena, sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma
      from public.pohyb po
      join public.platba pl on pl.id = po.platba_id
      join public.zbierka z on z.id = pl.zbierka and z.stranka = p_stranka
      join public.zbierka_podiel zp on zp.zbierka = z.id and zp.druh = 'overovatel' and zp.stranka = p_stranka
     where (po.ucet_kredit = zp.ucet or po.ucet_debet = zp.ucet) and po.typ in ('dar', 'sluzba', 'vratenie')
       and po.cas >= p_od and po.cas < v_do
     group by po.mena
  )
  select jsonb_build_object(
    'darcovia_spolu', (select count(*) from prvy),
    'novi_darcovia', (select count(*) from prvy where cas >= p_od and cas < v_do),
    'sledujuci', (select count(*) from public.moje_farnosti m where m.stranka = p_stranka),
    'sledujuci_novi_30', (select count(*) from public.moje_farnosti m where m.stranka = p_stranka and m.pridane >= now() - interval '30 days'),
    'pravidelna', null,
    'podiel_rodiny', coalesce((select jsonb_object_agg(mena, round(suma, 2)) from podiel), '{}'::jsonb)
  ) into v;
  return v;
end $$;
revoke all on function public.statistiky_farnosti(text, timestamptz, timestamptz) from public;
grant execute on function public.statistiky_farnosti(text, timestamptz, timestamptz) to authenticated;

commit;
