-- ============================================================
-- 0130 · OPRAVY 405 (charita) — Ľudia → Darcovia a sumy: Poďakovať darcom aj pre charitu
-- ------------------------------------------------------------
-- farnost_podakuj (0106) ostáva rovnaká pre farnosť. Pri inej stránke (charita) je titulok
-- „Poďakovanie od {názov stránky}“ namiesto „Poďakovanie od farnosti“ a pri jednej zbierke „Poďakovanie · {zbierka}“.
-- Komu: vsetci · id zbierky stránky. Darcovia = prihlásení s platbou credited / settled (ako 0106).
-- ============================================================
begin;

create or replace function public.farnost_podakuj(p_stranka text, p_komu text, p_text text) returns int
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_titul text; v_n int; v_typ text; v_nazov text;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if nullif(trim(coalesce(p_text, '')), '') is null then raise exception 'prazdne' using errcode = '22023'; end if;
  select s.typ, s.nazov into v_typ, v_nazov from public.stranka s where s.id = p_stranka;
  if p_komu = 'vsetci' then
    v_titul := case when coalesce(v_typ, 'farnost') = 'farnost' then 'Poďakovanie od farnosti'
                    else 'Poďakovanie od ' || coalesce(nullif(trim(v_nazov), ''), 'organizácie') end;
  elsif p_komu = 'hlavna' then v_titul := 'Poďakovanie · Hlavná zbierka';
  else
    select 'Poďakovanie · ' || coalesce(nullif(trim(z.nazov), ''), 'zbierka') into v_titul
      from public.zbierka z where z.id = p_komu and z.stranka = p_stranka
       and coalesce(z.nastavenie->'farnost'->>'druh', 'farnost') = 'farnost';
    if v_titul is null then raise exception 'zbierka_neexistuje' using errcode = 'P0002'; end if;
  end if;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    select d.ucet_id, 'socialne', 'srd', left(v_titul, 200), left(trim(p_text), 1500), 'str:' || p_stranka || ':-',
           exists (select 1 from public.push_odber p where p.ucet_id = d.ucet_id)
      from (select distinct pl.odosielatel as ucet_id
              from public.platba pl join public.zbierka z on z.id = pl.zbierka
             where z.stranka = p_stranka
               and pl.stav in ('credited', 'settled') and pl.odosielatel is not null and pl.odosielatel <> v_ja
               and coalesce(z.nastavenie->'farnost'->>'druh', 'farnost') = 'farnost'
               and case p_komu
                     when 'vsetci' then true
                     when 'hlavna' then z.id = p_stranka || ':hlavna' or z.id like p_stranka || ':%-zv-%'
                     else z.id = p_komu end) d;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.farnost_podakuj(text, text, text) from public;
grant execute on function public.farnost_podakuj(text, text, text) to authenticated;

commit;
