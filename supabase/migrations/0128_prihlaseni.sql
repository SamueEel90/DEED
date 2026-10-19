-- ============================================================
-- 0128 · OPRAVY 397 (Viera) — zoznam prihlásených (brigády, udalosti, oznamy s Pozvať ľudí)
-- ------------------------------------------------------------
-- 1. reakcia_f: pri prihlásení (ucast) zapíše aj čas „kedy“ (ms) — farár v Správe vidí meno · ako · kedy.
--    Telo ako 0119, pribudol len zápis/zmazanie času v „kedy“.
-- 2. napis_prihlasenym(stránka, príspevok, text): správa farára všetkým prihláseným do Oznámení (ako Poďakovať darcom, 0106).
--    Smie len správca stránky. Vráti počet adresátov.
-- ============================================================
begin;

create or replace function public.reakcia_f(p_stranka text, p_ref text, p_pole text, p_chce boolean, p_meno text default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja text := public.moj_ucet()::text; v_m jsonb; r jsonb; v_l jsonb; v_k jsonb;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_pole not in ('ucast', 'sustrast', 'blaho', 'spomin') then raise exception 'zle_pole' using errcode = '22023'; end if;
  if coalesce(p_ref, '') = '' or not exists (select 1 from public.stranka where id = p_stranka) then raise exception 'stranka_neexistuje' using errcode = 'P0002'; end if;
  if public.deti_stretnutie(p_stranka, p_ref) is not null then raise exception 'deti' using errcode = '42501'; end if;
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
  if p_pole = 'ucast' then -- OPRAVY 397: kedy sa prihlásil
    v_k := coalesce(case when jsonb_typeof(r->'kedy') = 'object' then r->'kedy' end, '{}'::jsonb) - v_ja;
    if p_chce then v_k := v_k || jsonb_build_object(v_ja, (extract(epoch from now()) * 1000)::bigint); end if;
    r := r || jsonb_build_object('kedy', v_k);
  end if;
  update public.naboz_stav set data = v_m || jsonb_build_object(p_ref, r), upravene = now() where oblast = 'reakcie' and id = p_stranka;
end $$;

create or replace function public.napis_prihlasenym(p_stranka text, p_ref text, p_text text) returns int
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_l jsonb; v_titul text; v_n int;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if nullif(trim(coalesce(p_text, '')), '') is null then raise exception 'prazdne' using errcode = '22023'; end if;
  select data->p_ref->'ucast' into v_l from public.naboz_stav where oblast = 'reakcie' and id = p_stranka;
  select coalesce(nullif(trim(nazov), ''), 'Farnosť') || ' · správa pre prihlásených' into v_titul from public.stranka where id = p_stranka;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    select u.id, 'socialne', 'lud', left(coalesce(v_titul, 'Správa pre prihlásených'), 200), left(trim(p_text), 1500), 'str:' || p_stranka || ':-',
           exists (select 1 from public.push_odber p where p.ucet_id = u.id)
      from public.ucet u
     where u.id <> v_ja
       and u.id::text in (select x #>> '{}' from jsonb_array_elements(case when jsonb_typeof(v_l) = 'array' then v_l else '[]'::jsonb end) x);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.napis_prihlasenym(text, text, text) from public, anon;
grant execute on function public.napis_prihlasenym(text, text, text) to authenticated;

commit;
