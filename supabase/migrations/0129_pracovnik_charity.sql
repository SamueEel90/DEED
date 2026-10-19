-- ============================================================
-- 0129 · OPRAVY 404 — Ľudia v Správe charity: Štatutár a pracovník s vybranými právami (Martin 19. 10.)
-- ------------------------------------------------------------
-- Len charita (stranka.typ = 'charita'). Viera ostáva Farár / Pomocník (0124, 0125) bez zmeny.
-- V zozname „ludia“ (nastavenia_stranky) má človek r = 'Štatutár' alebo 'Pracovník'. Pracovník má pole „prava“:
--   zbierky · doklady · obsah · ludia · penazenka_vidiet · penazenka_vyplaty · nastavenia · pridavat
--   1. uroven_stranky: r = 'Štatutár' = plné práva ('farar'), ako vlastník a štatutár organizácie.
--   2. smie_v_stranke(stránka, právo): plné práva = áno; prijatý pracovník = právo je v jeho poli „prava“;
--      človek bez poľa „prava“ (Pomocník vo Viere) = áno (jeho hranice drží trigger z 0124).
--   3. Zbierky: zápis do zbierky, Správa zbierky (zbierka_sprava) a vlastné peniaze len so správnym právom
--      (zbierky, resp. penazenka_vyplaty). Oznamy charity (oznam_charity) len s právom obsah.
--   4. Nastavenia charity: zoznam ľudí mení štatutár alebo pracovník s právom pridavat — ten však nesmie pridať,
--      zmeniť ani odobrať štatutára a nesmie meniť sám seba. Predplatné a štatutára v nastaveniach mení
--      právo nastavenia, účet (ucetFarnosti*) právo penazenka_vyplaty. Prijatie pozvánky (0125) ostáva povolené.
-- Doklady, peňaženka „vidieť“ a ľudia (darcovia, dobrovoľníci) zatiaľ strážia appka — nemajú vlastnú tabuľku.
-- Po zmene zoznamu platia práva hneď (kontrola pri každom volaní).
-- ============================================================
begin;

-- 1 · Štatutár zo zoznamu = plné práva (telo ako 0125, pribudol 'Štatutár')
create or replace function public.uroven_stranky(p_stranka text) returns text
  language sql volatile security definer set search_path = public as $$
  select case
    when public.moj_ucet() is null then null
    when exists (select 1 from public.stranka s
                  where s.id = p_stranka
                    and (s.ucet_id = public.moj_ucet()
                         or exists (select 1 from public.statutar t where t.org_ucet_id = s.ucet_id and t.osoba_ucet_id = public.moj_ucet()))) then 'farar'
    when exists (select 1 from public.stranka_farar f where f.stranka = p_stranka and f.ucet = public.moj_ucet()) then 'farar'
    else (
      select case when count(*) = 0 then null
                  when bool_or(c->>'r' = 'Dozorca' or c->>'r' = 'Štatutár' or c->>'r' in (select titul from public.cirkev)) then 'farar'
                  else 'pomocnik' end
        from public.nastavenia_stranky n,
             jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
             auth.users a
       where n.stranka = p_stranka
         and a.id = auth.uid()
         and coalesce(a.email, '') <> ''
         and lower(trim(c->>'k')) = lower(a.email)
         and (c->'caka' is null or c->'caka' = 'false'::jsonb))
  end
$$;

-- 2 · právo pracovníka
create or replace function public.smie_v_stranke(p_stranka text, p_pravo text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select case
    when public.moj_ucet() is null then false
    when public.plne_prava(p_stranka) then true
    else coalesce((
      select bool_or(case when jsonb_typeof(c->'prava') = 'array' then c->'prava' ? p_pravo else true end)
        from public.nastavenia_stranky n,
             jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
             auth.users a
       where n.stranka = p_stranka
         and a.id = auth.uid()
         and coalesce(a.email, '') <> ''
         and lower(trim(c->>'k')) = lower(a.email)
         and (c->'caka' is null or c->'caka' = 'false'::jsonb)), false)
  end
$$;
revoke all on function public.smie_v_stranke(text, text) from public, anon;
grant execute on function public.smie_v_stranke(text, text) to authenticated, service_role;

-- 3 · zbierky, správa zbierky, vlastné peniaze, oznamy
create or replace function public.smiem_spravovat_zbierku(p_zbierka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.moj_ucet() is not null and coalesce(
    (select z.ucet_id = public.moj_ucet()
            or (z.stranka is not null and public.spravujem_stranku(z.stranka) and public.smie_v_stranke(z.stranka, 'zbierky'))
       from public.zbierka z where z.id = p_zbierka),
    true)  -- zbierka mimo DB (ukážka) = testovací režim
$$;

create or replace function public.smie_vlastne_peniaze(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select case when (select typ from public.stranka where id = p_stranka) = 'farnost' then public.som_farar(p_stranka)
              else public.spravujem_stranku(p_stranka) and public.smie_v_stranke(p_stranka, 'penazenka_vyplaty') end
$$;

-- zbierka: pracovník bez práva „zbierky“ nezaloží, nezmení ani nezmaže zbierku stránky (čítanie sa nemení)
drop policy if exists pracovnik_zbierky_ins on public.zbierka;
create policy pracovnik_zbierky_ins on public.zbierka as restrictive for insert to authenticated
  with check (stranka is null or public.smie_v_stranke(stranka, 'zbierky'));
drop policy if exists pracovnik_zbierky_upd on public.zbierka;
create policy pracovnik_zbierky_upd on public.zbierka as restrictive for update to authenticated
  using (stranka is null or public.smie_v_stranke(stranka, 'zbierky'))
  with check (stranka is null or public.smie_v_stranke(stranka, 'zbierky'));
drop policy if exists pracovnik_zbierky_del on public.zbierka;
create policy pracovnik_zbierky_del on public.zbierka as restrictive for delete to authenticated
  using (stranka is null or public.smie_v_stranke(stranka, 'zbierky'));

-- oznamy charity: len s právom „obsah“
drop policy if exists pracovnik_obsah_ins on public.oznam_charity;
create policy pracovnik_obsah_ins on public.oznam_charity as restrictive for insert to authenticated
  with check (public.smie_v_stranke(stranka, 'obsah'));
drop policy if exists pracovnik_obsah_upd on public.oznam_charity;
create policy pracovnik_obsah_upd on public.oznam_charity as restrictive for update to authenticated
  using (public.smie_v_stranke(stranka, 'obsah')) with check (public.smie_v_stranke(stranka, 'obsah'));
drop policy if exists pracovnik_obsah_del on public.oznam_charity;
create policy pracovnik_obsah_del on public.oznam_charity as restrictive for delete to authenticated
  using (public.smie_v_stranke(stranka, 'obsah'));

-- 4 · nastavenia charity
-- zmena zoznamu, ktorá sa týka štatutára alebo človeka samého (pridaný, zmenený alebo odobratý riadok)
create or replace function public.ludia_zmena_citliva(p_stary jsonb, p_novy jsonb, p_mail text) returns boolean
  language sql immutable set search_path = public as $$
  with o as (select x from jsonb_array_elements(case when jsonb_typeof(p_stary) = 'array' then p_stary else '[]'::jsonb end) x),
       n as (select x from jsonb_array_elements(case when jsonb_typeof(p_novy) = 'array' then p_novy else '[]'::jsonb end) x),
       rozdiel as ((select x from o except all select x from n) union all (select x from n except all select x from o))
  select exists (select 1 from rozdiel
                  where x->>'r' = 'Štatutár' or lower(trim(coalesce(x->>'k', ''))) = coalesce(p_mail, ''))
$$;
revoke all on function public.ludia_zmena_citliva(jsonb, jsonb, text) from public, anon;

create or replace function public.nastavenia_len_farar() returns trigger
  language plpgsql security definer set search_path = public as $$
declare k text; v_charita boolean; v_mail text; v_pravo text;
begin
  if public.moj_ucet() is null then return new; end if; -- server, migrácie
  if public.plne_prava(new.stranka) then return new; end if;
  v_charita := (select typ from public.stranka where id = new.stranka) = 'charita';
  foreach k in array array['ludia', 'duch', 'ucetFarnosti', 'ucetFarnostiNovy', 'predplatne', 'statutar'] loop
    if not ((tg_op = 'INSERT' and new.data ? k) or (tg_op = 'UPDATE' and new.data->k is distinct from old.data->k)) then continue; end if;
    if k = 'ludia' and current_setting('deed.pozvanka', true) = new.stranka then continue; end if; -- prijatie pozvánky (0125)
    if not v_charita then
      if k = 'statutar' then continue; end if; -- Viera: ako doteraz (0124)
      raise exception 'len_farar' using errcode = '42501', detail = k;
    end if;
    -- charita: podľa práv pracovníka
    v_pravo := case k when 'ludia' then 'pridavat' when 'predplatne' then 'nastavenia' when 'statutar' then 'nastavenia'
                      when 'duch' then 'nastavenia' else 'penazenka_vyplaty' end;
    if not public.smie_v_stranke(new.stranka, v_pravo) then
      raise exception 'nemate_povolene' using errcode = '42501', detail = k;
    end if;
    if k = 'ludia' then
      select lower(email) into v_mail from auth.users where id = auth.uid();
      if public.ludia_zmena_citliva(case when tg_op = 'UPDATE' then old.data->'ludia' else '[]'::jsonb end, new.data->'ludia', v_mail) then
        raise exception 'len_statutar' using errcode = '42501', detail = k;
      end if;
    end if;
  end loop;
  return new;
end $$;
revoke all on function public.nastavenia_len_farar() from public;

commit;
