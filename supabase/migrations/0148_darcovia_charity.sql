-- ============================================================
-- 0148 · OPRAVY 452 · Správa charity → Ľudia → Darcovia
-- ------------------------------------------------------------
-- stranka_darcovia(stránka) — všetky dary na zbierky stránky z ledgera (platba + pohyb), len pre správcu
-- s právom „ludia“. Každý dar nesie kľúč darcu: md5(stránka:účet) — rovnaký účet = rovnaký kľúč, ale účet
-- sa z neho nedá zistiť a medzi stránkami sa nedá spárovať. Kľúč má len dar s menom; anonymný dar (bez účtu
-- alebo darca zvolil bez mena) kľúč nemá, takže sa nikdy nepripočíta k menovanému riadku.
-- Dorovnanie firmy (dorovnanie_dar) je dar s menom firmy ako každý iný.
-- ============================================================
begin;

create or replace function public.stranka_darcovia(p_stranka text, p_limit int default 2000) returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  if not (public.spravujem_stranku(p_stranka) and public.smie_v_stranke(p_stranka, 'ludia')) then
    raise exception 'Darcov vidí len správca stránky.' using errcode = '42501', detail = 'nie_spravca';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', d.id, 'cas', d.cas, 'mena', d.mena, 'suma', d.suma, 'meno', d.meno,
                                        'darca', d.darca, 'zbierka', d.zbierka, 'nazov', d.nazov) order by d.cas desc)
      from (
        select pl.id::text as id, pl.vytvorene as cas, pl.mena, pl.zbierka, z.nazov,
               nullif(trim(pl.odosielatel_text), '') as meno,
               case when pl.odosielatel is not null and nullif(trim(pl.odosielatel_text), '') is not null
                    then md5(p_stranka || ':' || pl.odosielatel::text) end as darca,
               sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma
          from public.zbierka z
          join public.platba pl on pl.zbierka = z.id
          join public.pohyb po on po.platba_id = pl.id
         where z.stranka = p_stranka
           and po.typ in ('dar', 'sluzba', 'vratenie')
           and po.ucet_kredit <> public.ucet_systemu('platforma')
           and public.retaz_bez_tvorcu(pl.id, po.ucet_kredit, po.ucet_debet)
         group by pl.id, z.nazov
        having sum(case when po.storno_pre is null then po.suma else -po.suma end) > 0
         order by pl.vytvorene desc
         limit greatest(coalesce(p_limit, 2000), 1)
      ) d), '[]'::jsonb);
end $$;
revoke all on function public.stranka_darcovia(text, int) from public, anon;
grant execute on function public.stranka_darcovia(text, int) to authenticated, service_role;

commit;
