-- ============================================================
-- 0090 · OPRAVY 264 — ukončenie zbierky správcom stránky sa uloží na server
-- ------------------------------------------------------------
-- Politika owner_all (0035) pustí UPDATE len s with check „ucet_id = môj účet“. Správca farnosti,
-- ktorý zbierku nezakladal (iný účet, iné zariadenie), ju v appke „zmazal“, ale riadok v DB ostal
-- aktívny → po načítaní sa zbierka vrátila na stránku aj do Správy.
-- Ukončenie ide cez túto funkciu: smie zakladateľ zbierky alebo správca jej stránky.
-- Mení sa len stav (aktivna → ukoncena); čas ukončenia dá trigger 0068, zámok 0041 stav dovoľuje.
-- Nič iné v zbierke funkcia nemení, peniaze a dary ostávajú.
-- ============================================================
begin;

create or replace function public.ukonci_zbierku(p_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ucet uuid := public.moj_ucet();
  v_z    public.zbierka%rowtype;
begin
  if v_ucet is null then
    raise exception 'Prihláste sa.' using errcode = '42501';
  end if;
  select * into v_z from public.zbierka where id = p_id for update;
  if not found then
    raise exception 'Zbierka neexistuje.' using errcode = 'P0002';
  end if;
  if not (v_z.ucet_id = v_ucet or (v_z.stranka is not null and public.spravujem_stranku(v_z.stranka))) then
    raise exception 'Túto zbierku nespravujete.' using errcode = '42501';
  end if;
  if v_z.stav = 'aktivna' then
    update public.zbierka set stav = 'ukoncena' where id = p_id;
  end if;
  return (select stav from public.zbierka where id = p_id);
end;
$$;

revoke all on function public.ukonci_zbierku(text) from public, anon;
grant execute on function public.ukonci_zbierku(text) to authenticated;

commit;
