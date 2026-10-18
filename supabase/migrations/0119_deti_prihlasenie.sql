-- ============================================================
-- 0119 · OPRAVY 383 — mená prihlásených detí nie sú verejné
-- ------------------------------------------------------------
-- Doteraz prihlásenie na stretnutie detí a mládeže (tábor, stretko …) ležalo vo verejnom poli „reakcie“ v naboz_stav
-- (kľúč účtu + meno), ktoré si prečíta ktokoľvek.
-- Teraz (ako úmysly v 0116):
--   1. Tabuľka deti_prihlasenie (stránka, ref = id stretnutia, účet, meno). Číta ten, kto prihlásil, a správca stránky.
--      Priamy zápis žiadny.
--   2. deti_prihlas(stránka, ref, chce, meno) — prihlásiť / odhlásiť (len prihlásený; pri záväznom s limitom kontrola miest).
--   3. deti_pocty(stránka) — verejne len počty prihlásených pri každom stretnutí.
--   4. reakcia_f (0115) pri stretnutí detí odmietne zápis — mená sa do verejného poľa už nedostanú.
--   5. Doterajšie prihlásenia detí sa z verejného poľa presunú.
-- ============================================================
begin;

create table if not exists public.deti_prihlasenie (
  stranka  text not null,
  ref      text not null,
  ucet     uuid not null references public.ucet(id) on delete cascade,
  meno     text,
  cas      timestamptz not null default now(),
  primary key (stranka, ref, ucet)
);
alter table public.deti_prihlasenie enable row level security;
drop policy if exists deti_prihlasenie_citat on public.deti_prihlasenie;
create policy deti_prihlasenie_citat on public.deti_prihlasenie for select to authenticated
  using (ucet = public.moj_ucet() or public.spravujem_stranku(stranka));
revoke all on public.deti_prihlasenie from anon;
revoke insert, update, delete on public.deti_prihlasenie from authenticated;
grant select on public.deti_prihlasenie to authenticated;

-- stretnutie detí a mládeže tejto stránky (oblasť „deti“)
create or replace function public.deti_stretnutie(p_stranka text, p_ref text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select x from public.naboz_stav s, jsonb_array_elements(case when jsonb_typeof(s.data) = 'array' then s.data else '[]'::jsonb end) x
   where s.oblast = 'deti' and s.id = p_stranka and x->>'id' = p_ref limit 1
$$;

create or replace function public.deti_prihlas(p_stranka text, p_ref text, p_chce boolean, p_meno text default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); s jsonb; v_lim int; v_n int;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  s := public.deti_stretnutie(p_stranka, p_ref);
  if s is null then raise exception 'stretnutie_neexistuje' using errcode = 'P0002'; end if;
  if not p_chce then delete from public.deti_prihlasenie where stranka = p_stranka and ref = p_ref and ucet = v_ja; return; end if;
  if coalesce((s->>'pz')::int, 0) = 0 then raise exception 'bez_prihlasenia' using errcode = '22023'; end if;
  perform 1 from public.naboz_stav where oblast = 'deti' and id = p_stranka for update; -- poradie pri poslednom mieste
  v_lim := nullif(s->>'limit', '')::int;
  select count(*) into v_n from public.deti_prihlasenie where stranka = p_stranka and ref = p_ref and ucet <> v_ja;
  if coalesce((s->>'pz')::int, 0) = 2 and coalesce(v_lim, 0) > 0 and v_n >= v_lim then raise exception 'plne' using errcode = '23514'; end if;
  insert into public.deti_prihlasenie (stranka, ref, ucet, meno) values (p_stranka, p_ref, v_ja, left(nullif(trim(coalesce(p_meno, '')), ''), 80))
  on conflict (stranka, ref, ucet) do update set meno = coalesce(excluded.meno, deti_prihlasenie.meno);
end $$;

create or replace function public.deti_pocty(p_stranka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(ref, n), '{}'::jsonb) from (select ref, count(*) n from public.deti_prihlasenie where stranka = p_stranka group by ref) q
$$;

-- reakcie (0115): pri stretnutí detí nie — tam len deti_prihlas
create or replace function public.reakcia_f(p_stranka text, p_ref text, p_pole text, p_chce boolean, p_meno text default null) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja text := public.moj_ucet()::text; v_m jsonb; r jsonb; v_l jsonb;
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
  update public.naboz_stav set data = v_m || jsonb_build_object(p_ref, r), upravene = now() where oblast = 'reakcie' and id = p_stranka;
end $$;

-- presun doterajších prihlásení detí z verejného poľa
insert into public.deti_prihlasenie (stranka, ref, ucet, meno)
select s.id, k.key, public.odf_ucet(u #>> '{}'), left(k.value->'mena'->>(u #>> '{}'), 80)
  from public.naboz_stav s, jsonb_each(case when jsonb_typeof(s.data) = 'object' then s.data else '{}'::jsonb end) k,
       jsonb_array_elements(case when jsonb_typeof(k.value->'ucast') = 'array' then k.value->'ucast' else '[]'::jsonb end) u
 where s.oblast = 'reakcie' and public.deti_stretnutie(s.id, k.key) is not null and public.odf_ucet(u #>> '{}') is not null
on conflict do nothing;
update public.naboz_stav s set data = (select coalesce(jsonb_object_agg(k.key, k.value), '{}'::jsonb) from jsonb_each(s.data) k where public.deti_stretnutie(s.id, k.key) is null), upravene = now()
 where s.oblast = 'reakcie' and jsonb_typeof(s.data) = 'object'
   and exists (select 1 from jsonb_each(s.data) k where public.deti_stretnutie(s.id, k.key) is not null);

revoke all on function public.deti_stretnutie(text, text) from public, anon, authenticated;
revoke all on function public.deti_prihlas(text, text, boolean, text), public.deti_pocty(text) from public;
grant execute on function public.deti_prihlas(text, text, boolean, text) to authenticated;
grant execute on function public.deti_pocty(text) to anon, authenticated;

commit;
