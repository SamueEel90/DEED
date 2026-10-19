-- ============================================================
-- 0115 · OPRAVY 372 — stav farnosti (naboz_stav) a oznamy farnosti (naboz_prispevok) zapisuje len správca stránky
-- ------------------------------------------------------------
-- 0022 nechala „TEST-ONLY“ politiky: zapisovať a mazať mohol ktorýkoľvek prihlásený účet, pre každú farnosť.
-- Teraz:
--   1. naboz_stav: insert / update / delete len spravujem_stranku(id). Čítanie ostáva verejné (stránka farnosti).
--   2. naboz_prispevok: insert / update / delete len spravujem_stranku(farnost_id). Čítanie verejné.
--   3. Veriaci (nie správca) mení stav farnosti len cez serverové funkcie, každá zmení len to, čo smie:
--        odf_uloz(stránka, príspevok)            — pridať / upraviť svoj príspevok od veriacich (autor = ja)
--        odf_zmaz(stránka, id)                   — zmazať svoj príspevok (správca hocijaký)
--        odf_reaguj(stránka, id, pole, chce, meno) — Zúčastním sa · Modlím sa · Sústrasť · Blahoželám pri príspevku
--        odf_nahlas(stránka, id, dôvod)          — nahlásiť príspevok (raz za účet)
--        reakcia_f(stránka, ref, pole, chce, meno) — reakcie pri tom, čo pridal farár (oblasť „reakcie“)
--      Kľúč účtu v reakciách je vždy moj_ucet() — nikto nepridá ani neodoberie cudzí.
-- Čakajúce príspevky rieši ďalej spúšťač z 0099 (funkcie zapisujú pod účtom volajúceho).
-- ============================================================
begin;

-- 1 · naboz_stav
drop policy if exists naboz_stav_write_auth on public.naboz_stav;
drop policy if exists naboz_stav_zapis_spravca on public.naboz_stav;
drop policy if exists naboz_stav_uprava_spravca on public.naboz_stav;
drop policy if exists naboz_stav_mazanie_spravca on public.naboz_stav;
create policy naboz_stav_zapis_spravca on public.naboz_stav for insert to authenticated with check (public.spravujem_stranku(id));
create policy naboz_stav_uprava_spravca on public.naboz_stav for update to authenticated using (public.spravujem_stranku(id)) with check (public.spravujem_stranku(id));
create policy naboz_stav_mazanie_spravca on public.naboz_stav for delete to authenticated using (public.spravujem_stranku(id));

-- 2 · naboz_prispevok
drop policy if exists naboz_write_auth on public.naboz_prispevok;
drop policy if exists naboz_prispevok_zapis_spravca on public.naboz_prispevok;
drop policy if exists naboz_prispevok_uprava_spravca on public.naboz_prispevok;
drop policy if exists naboz_prispevok_mazanie_spravca on public.naboz_prispevok;
create policy naboz_prispevok_zapis_spravca on public.naboz_prispevok for insert to authenticated with check (public.spravujem_stranku(farnost_id));
create policy naboz_prispevok_uprava_spravca on public.naboz_prispevok for update to authenticated using (public.spravujem_stranku(farnost_id)) with check (public.spravujem_stranku(farnost_id));
create policy naboz_prispevok_mazanie_spravca on public.naboz_prispevok for delete to authenticated using (public.spravujem_stranku(farnost_id));

-- pomocné: pole príspevkov od veriacich (zamknuté na zápis) a zápis späť
create or replace function public.odf_pole(p_stranka text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v jsonb;
begin
  insert into public.naboz_stav (oblast, id, data) values ('odfarnikov', p_stranka, '[]'::jsonb) on conflict (oblast, id) do nothing;
  select data into v from public.naboz_stav where oblast = 'odfarnikov' and id = p_stranka for update;
  return case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end;
end $$;
create or replace function public.odf_zapis(p_stranka text, p_pole jsonb) returns void
  language sql volatile security definer set search_path = public as $$
  update public.naboz_stav set data = p_pole, upravene = now() where oblast = 'odfarnikov' and id = p_stranka
$$;

-- polia, ktoré veriaci sám nenastaví (reakcie, nahlásenia, zápis farára)
create or replace function public.odf_serverove() returns text[] language sql immutable as $$
  select array['zapis','odsluzene','sprava','ponechane','upravil','rozhodnute','nahl','nahlasili','nahlInfo','sus','modl','sustrast','ucast','blaho','mena','osobne','autor']
$$;

create or replace function public.odf_uloz(p_stranka text, p_polozka jsonb) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_pole jsonb; o jsonb; v_id text := p_polozka->>'id'; v_nova jsonb; k text;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if coalesce(v_id, '') = '' or jsonb_typeof(p_polozka) <> 'object' then raise exception 'zla_polozka' using errcode = '22023'; end if;
  if not exists (select 1 from public.stranka where id = p_stranka) then raise exception 'stranka_neexistuje' using errcode = 'P0002'; end if;
  if public.odf_stupen(p_stranka, p_polozka->>'k') = 'zakazane' then raise exception 'zakazane' using errcode = '42501'; end if;
  v_pole := public.odf_pole(p_stranka);
  o := (select x from jsonb_array_elements(v_pole) x where x->>'id' = v_id limit 1);
  if o is not null and o->>'autor' is distinct from v_ja::text and not public.spravujem_stranku(p_stranka) then
    raise exception 'cudzi_prispevok' using errcode = '42501';
  end if;
  v_nova := p_polozka;
  foreach k in array public.odf_serverove() loop v_nova := v_nova - k; end loop;
  -- serverové polia zostávajú z pôvodnej položky; autor je vždy ten, kto ju pridal
  if o is not null then
    foreach k in array public.odf_serverove() loop if o ? k then v_nova := v_nova || jsonb_build_object(k, o->k); end if; end loop;
  else
    v_nova := v_nova || jsonb_build_object('autor', v_ja::text);
  end if;
  perform public.odf_zapis(p_stranka,
    case when o is null then jsonb_build_array(v_nova) || v_pole
         else (select jsonb_agg(case when x->>'id' = v_id then v_nova else x end) from jsonb_array_elements(v_pole) x) end);
end $$;

create or replace function public.odf_zmaz(p_stranka text, p_id text) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_pole jsonb; o jsonb;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  v_pole := public.odf_pole(p_stranka);
  o := (select x from jsonb_array_elements(v_pole) x where x->>'id' = p_id limit 1);
  if o is null then return; end if;
  if o->>'autor' is distinct from v_ja::text and not public.spravujem_stranku(p_stranka) then raise exception 'cudzi_prispevok' using errcode = '42501'; end if;
  perform public.odf_zapis(p_stranka, coalesce((select jsonb_agg(x) from jsonb_array_elements(v_pole) x where x->>'id' is distinct from p_id), '[]'::jsonb));
end $$;

create or replace function public.odf_reaguj(p_stranka text, p_id text, p_pole text, p_chce boolean, p_meno text default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja text := public.moj_ucet()::text; v_pole jsonb; o jsonb; v_l jsonb; v_lim int;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_pole not in ('ucast', 'modl', 'sustrast', 'blaho') then raise exception 'zle_pole' using errcode = '22023'; end if;
  v_pole := public.odf_pole(p_stranka);
  o := (select x from jsonb_array_elements(v_pole) x where x->>'id' = p_id limit 1);
  if o is null then raise exception 'prispevok_neexistuje' using errcode = 'P0002'; end if;
  v_l := coalesce((select jsonb_agg(x) from jsonb_array_elements(case when jsonb_typeof(o->p_pole) = 'array' then o->p_pole else '[]'::jsonb end) x where x #>> '{}' <> v_ja), '[]'::jsonb);
  if p_chce then
    v_lim := nullif(o->>'limit', '')::int;
    if p_pole = 'ucast' and coalesce((o->>'pozv')::int, 0) = 2 and coalesce(v_lim, 0) > 0 and jsonb_array_length(v_l) >= v_lim then
      raise exception 'plne' using errcode = '23514';
    end if;
    v_l := v_l || to_jsonb(v_ja);
  end if;
  o := o || jsonb_build_object(p_pole, v_l);
  if p_chce and nullif(trim(coalesce(p_meno, '')), '') is not null then
    o := o || jsonb_build_object('mena', coalesce(case when jsonb_typeof(o->'mena') = 'object' then o->'mena' end, '{}'::jsonb) || jsonb_build_object(v_ja, left(trim(p_meno), 80)));
  end if;
  perform public.odf_zapis(p_stranka, (select jsonb_agg(case when x->>'id' = p_id then o else x end) from jsonb_array_elements(v_pole) x));
end $$;

create or replace function public.odf_nahlas(p_stranka text, p_id text, p_dovod text default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja text := public.moj_ucet()::text; v_pole jsonb; o jsonb; v_d text := left(nullif(trim(coalesce(p_dovod, '')), ''), 200);
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  v_pole := public.odf_pole(p_stranka);
  o := (select x from jsonb_array_elements(v_pole) x where x->>'id' = p_id limit 1);
  if o is null then raise exception 'prispevok_neexistuje' using errcode = 'P0002'; end if;
  if coalesce(o->'nahlasili', '[]'::jsonb) ? v_ja then return; end if;
  o := o || jsonb_build_object('nahlasili', coalesce(case when jsonb_typeof(o->'nahlasili') = 'array' then o->'nahlasili' end, '[]'::jsonb) || to_jsonb(v_ja),
                               'nahlInfo', coalesce(case when jsonb_typeof(o->'nahlInfo') = 'array' then o->'nahlInfo' end, '[]'::jsonb)
                                 || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('cas', (extract(epoch from now()) * 1000)::bigint, 'dovod', v_d))));
  perform public.odf_zapis(p_stranka, (select jsonb_agg(case when x->>'id' = p_id then o else x end) from jsonb_array_elements(v_pole) x));
end $$;

create or replace function public.reakcia_f(p_stranka text, p_ref text, p_pole text, p_chce boolean, p_meno text default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja text := public.moj_ucet()::text; v_m jsonb; r jsonb; v_l jsonb;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_pole not in ('ucast', 'sustrast', 'blaho', 'spomin') then raise exception 'zle_pole' using errcode = '22023'; end if;
  if coalesce(p_ref, '') = '' or not exists (select 1 from public.stranka where id = p_stranka) then raise exception 'stranka_neexistuje' using errcode = 'P0002'; end if;
  insert into public.naboz_stav (oblast, id, data) values ('reakcie', p_stranka, '{}'::jsonb) on conflict (oblast, id) do nothing;
  select data into v_m from public.naboz_stav where oblast = 'reakcie' and id = p_stranka for update;
  if jsonb_typeof(v_m) <> 'object' then v_m := '{}'::jsonb; end if;
  r := coalesce(case when jsonb_typeof(v_m->p_ref) = 'object' then v_m->p_ref end, '{}'::jsonb);
  v_l := coalesce((select jsonb_agg(x) from jsonb_array_elements(case when jsonb_typeof(r->p_pole) = 'array' then r->p_pole else '[]'::jsonb end) x where x #>> '{}' <> v_ja), '[]'::jsonb);
  if p_chce then v_l := v_l || to_jsonb(v_ja); end if;
  r := r || jsonb_build_object(p_pole, v_l);
  if p_chce and nullif(trim(coalesce(p_meno, '')), '') is not null then
    r := r || jsonb_build_object('mena', coalesce(case when jsonb_typeof(r->'mena') = 'object' then r->'mena' end, '{}'::jsonb) || jsonb_build_object(v_ja, left(trim(p_meno), 80)));
  end if;
  update public.naboz_stav set data = v_m || jsonb_build_object(p_ref, r), upravene = now() where oblast = 'reakcie' and id = p_stranka;
end $$;

revoke all on function public.odf_pole(text), public.odf_zapis(text, jsonb), public.odf_serverove() from public, anon, authenticated;
revoke all on function public.odf_uloz(text, jsonb), public.odf_zmaz(text, text), public.odf_reaguj(text, text, text, boolean, text),
  public.odf_nahlas(text, text, text), public.reakcia_f(text, text, text, boolean, text) from public, anon;
grant execute on function public.odf_uloz(text, jsonb), public.odf_zmaz(text, text), public.odf_reaguj(text, text, text, boolean, text),
  public.odf_nahlas(text, text, text), public.reakcia_f(text, text, text, boolean, text) to authenticated;

commit;
