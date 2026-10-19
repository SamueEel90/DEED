-- DEED2 · migrácie 0115–0125 v poradí (odkazy 27, 28, 29). Spusti celé naraz v Supabase → SQL Editor.

-- >>> 0115_naboz_len_spravca.sql
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

-- >>> 0116_umysly_oddelene.sql
-- ============================================================
-- 0116 · OPRAVY 373 — úmysel na omšu nie je verejný: číta ho len autor a farár (správca stránky)
-- ------------------------------------------------------------
-- Doteraz úmysel ležal vo verejnom poli „odfarnikov“ v naboz_stav (čítal ho ktokoľvek, aj meno, za koho).
-- Teraz (ako čakajúce v 0099):
--   1. Tabuľka odfarnikov_umysly (stránka, id, autor, data). Číta autor a správca; priamy zápis len správca (úprava),
--      autor svoj úmysel zmaže cez umysel_zmaz.
--   2. Spúšťač PRED zápisom do naboz_stav „odfarnikov“: každý prvok k = 'umysel' sa z poľa vyberie a uloží do tabuľky
--      (nový aj úprava). Kto nie je správca, nezmení polia farára (zápis na omšu, odslúžené, správa) ani autora.
--   3. Upozornenie „Nový úmysel na omšu ›“ pre správcov ide z tabuľky (z poľa sa úmysel vyberie skôr).
--   4. Doterajšie úmysly z verejných polí sa presunú.
-- ============================================================
begin;

create table if not exists public.odfarnikov_umysly (
  stranka    text not null,
  id         text not null,
  autor      uuid references public.ucet(id) on delete set null,
  data       jsonb not null default '{}'::jsonb,
  vytvorene  timestamptz not null default now(),
  upravene   timestamptz not null default now(),
  primary key (stranka, id)
);
alter table public.odfarnikov_umysly enable row level security;
drop policy if exists odfarnikov_umysly_citat on public.odfarnikov_umysly;
create policy odfarnikov_umysly_citat on public.odfarnikov_umysly for select to authenticated
  using (autor = public.moj_ucet() or public.spravujem_stranku(stranka));
drop policy if exists odfarnikov_umysly_uprava on public.odfarnikov_umysly;
create policy odfarnikov_umysly_uprava on public.odfarnikov_umysly for update to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));
revoke all on public.odfarnikov_umysly from anon;
revoke insert, delete on public.odfarnikov_umysly from authenticated;
grant select, update on public.odfarnikov_umysly to authenticated;

create or replace function public.odf_oddel_umysly() returns trigger
  language plpgsql security definer set search_path = public as $$
declare e jsonb; r public.odfarnikov_umysly; v_ja uuid := public.moj_ucet(); v_spravca boolean; v_out jsonb := '[]'::jsonb; v_data jsonb; k text;
begin
  if jsonb_typeof(new.data) <> 'array' then return new; end if;
  v_spravca := v_ja is not null and public.spravujem_stranku(new.id);
  for e in select x from jsonb_array_elements(new.data) x loop
    if e->>'k' is distinct from 'umysel' or coalesce(e->>'id', '') = '' then v_out := v_out || jsonb_build_array(e); continue; end if;
    select * into r from public.odfarnikov_umysly u where u.stranka = new.id and u.id = e->>'id' for update;
    if r.id is null then
      insert into public.odfarnikov_umysly (stranka, id, autor, data)
      values (new.id, e->>'id', case when coalesce(e->>'osobne', '') = 'true' then null else coalesce(public.odf_ucet(e->>'autor'), case when v_spravca then null else v_ja end) end, e);
    elsif v_spravca then
      update public.odfarnikov_umysly set data = e, upravene = now() where stranka = new.id and id = r.id;
    elsif v_ja is not null and r.autor = v_ja then
      v_data := e;
      foreach k in array public.odf_serverove() loop v_data := v_data - k; if r.data ? k then v_data := v_data || jsonb_build_object(k, r.data->k); end if; end loop;
      update public.odfarnikov_umysly set data = v_data, upravene = now() where stranka = new.id and id = r.id;
    end if;
    -- do verejného poľa nikdy
  end loop;
  new.data := v_out;
  return new;
end $$;
drop trigger if exists odf_oddel_umysly on public.naboz_stav;
create trigger odf_oddel_umysly before insert or update of data on public.naboz_stav
  for each row when (new.oblast = 'odfarnikov') execute function public.odf_oddel_umysly();

-- autor (alebo správca) zmaže úmysel
create or replace function public.umysel_zmaz(p_stranka text, p_id text) returns boolean
  language plpgsql security definer set search_path = public as $$
begin
  delete from public.odfarnikov_umysly u where u.stranka = p_stranka and u.id = p_id
    and (u.autor = public.moj_ucet() or public.spravujem_stranku(p_stranka));
  return found;
end $$;
revoke all on function public.umysel_zmaz(text, text), public.odf_oddel_umysly() from public, anon;
grant execute on function public.umysel_zmaz(text, text) to authenticated;

-- upozornenie správcom pri novom úmysle (nie pri zapísanom farárom osobne)
create or replace function public.upoz_umysel() returns trigger
  language plpgsql security definer set search_path = public as $$
declare u uuid; v_zdroj text := 'odv:' || new.stranka || ':' || new.id;
begin
  if coalesce(new.data->>'osobne', '') = 'true' then return new; end if;
  if coalesce((select s.data->>'upozornit' from public.naboz_stav s where s.oblast = 'odfnast' and s.id = new.stranka), 'true') = 'false' then return new; end if;
  insert into public.pripomienka_odoslana (zdroj) values (v_zdroj) on conflict do nothing;
  if not found then return new; end if;
  for u in select distinct x.ucet_id from public.spravcovia_stranky(new.stranka) x where x.ucet_id is distinct from new.autor loop
    insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    values (u, 'socialne', 'srd', 'Nový úmysel na omšu ›', left('Úmysel: ' || coalesce(nullif(trim(new.data->>'t'), ''), 'bez názvu') || coalesce(' · ' || nullif(trim(new.data->>'kto'), ''), ''), 500),
            v_zdroj, exists (select 1 from public.push_odber p where p.ucet_id = u));
  end loop;
  return new;
exception when others then
  raise warning 'upoz_umysel: %', sqlerrm;
  return new;
end $$;
drop trigger if exists upoz_umysel on public.odfarnikov_umysly;
create trigger upoz_umysel after insert on public.odfarnikov_umysly for each row execute function public.upoz_umysel();

-- presun doterajších (bez upozornení: zdroje sa zapíšu vopred)
insert into public.pripomienka_odoslana (zdroj)
  select 'odv:' || s.id || ':' || (x->>'id') from public.naboz_stav s, jsonb_array_elements(s.data) x
   where s.oblast = 'odfarnikov' and jsonb_typeof(s.data) = 'array' and x->>'k' = 'umysel' and coalesce(x->>'id', '') <> ''
  on conflict do nothing;
update public.naboz_stav set data = data where oblast = 'odfarnikov' and jsonb_typeof(data) = 'array'
  and exists (select 1 from jsonb_array_elements(data) x where x->>'k' = 'umysel');

commit;

-- >>> 0117_umysel_sprava.sql
-- ============================================================
-- 0117 · OPRAVY 375 — správa farára veriacemu pri úmysle naozaj príde
-- ------------------------------------------------------------
-- Doteraz „Poslať správu“ zapísalo text len k úmyslu, veriaci nedostal nič.
-- umysel_sprava(stránka, id, text) — len správca: uloží správu k úmyslu (sprava: { text, cas }) a autorovi
-- pošle upozornenie do zvončeka (+ push): „Správa od farnosti · {názov}“, text správy, odkaz um:<stránka>:<id>
-- (ťuk otvorí jeho úmysel). Úmysel zapísaný osobne (bez autora) upozornenie nedostane.
-- ============================================================
begin;

create or replace function public.umysel_sprava(p_stranka text, p_id text, p_text text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare r public.odfarnikov_umysly; v_text text := left(nullif(trim(coalesce(p_text, '')), ''), 500); v_nazov text;
begin
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if v_text is null then raise exception 'prazdna_sprava' using errcode = '22023'; end if;
  select * into r from public.odfarnikov_umysly where stranka = p_stranka and id = p_id for update;
  if not found then raise exception 'umysel_neexistuje' using errcode = 'P0002'; end if;
  update public.odfarnikov_umysly
     set data = data || jsonb_build_object('sprava', jsonb_build_object('text', v_text, 'cas', (extract(epoch from now()) * 1000)::bigint)), upravene = now()
   where stranka = p_stranka and id = p_id;
  if r.autor is null then return false; end if;
  select nazov into v_nazov from public.stranka where id = p_stranka;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
  values (r.autor, 'socialne', 'srd', left('Správa od farnosti · ' || coalesce(v_nazov, 'farnosť'), 200), v_text, 'um:' || p_stranka || ':' || p_id,
          exists (select 1 from public.push_odber p where p.ucet_id = r.autor));
  return true;
end $$;
revoke all on function public.umysel_sprava(text, text, text) from public, anon;
grant execute on function public.umysel_sprava(text, text, text) to authenticated;

commit;

-- >>> 0118_podiel_neverejny.sql
-- ============================================================
-- 0118 · OPRAVY 379 — rozdelenie zbierky (zbierka_podiel) nie je celé verejné
-- ------------------------------------------------------------
-- 0065 dala verejne_citat (using true): aj neprihlásený prečítal podiel overovateľa (farnosti), čo appka verejne neukazuje.
-- Teraz verejne len to, čo darca vidí: keď sa rodina podelila (riadok „podelene“), príjemca a podelené stránky s %.
-- Podiel overovateľa a rozdelenie bez podelenia číta len správca stránky zbierky a príjemca.
-- Serverové funkcie (security definer: zapečatenie, Moja zbierka, ukončenie, ledger) sa nemenia.
-- ============================================================
begin;

create or replace function public.zbierka_ma_podelene(p_zbierka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.zbierka_podiel p where p.zbierka = p_zbierka and p.druh = 'podelene')
$$;
-- správca stránky zbierky alebo jej príjemca
create or replace function public.zbierka_vidim_rozdelenie(p_zbierka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select public.moj_ucet() is not null and (
    exists (select 1 from public.zbierka z where z.id = p_zbierka and z.stranka is not null and public.spravujem_stranku(z.stranka))
    or exists (select 1 from public.zbierka_podiel p where p.zbierka = p_zbierka and p.druh = 'prijemca' and p.ucet = public.moj_ucet()))
$$;
revoke all on function public.zbierka_ma_podelene(text), public.zbierka_vidim_rozdelenie(text) from public;
grant execute on function public.zbierka_ma_podelene(text) to anon, authenticated;
grant execute on function public.zbierka_vidim_rozdelenie(text) to authenticated;

drop policy if exists verejne_citat on public.zbierka_podiel;
drop policy if exists podiel_citat_verejne on public.zbierka_podiel;
drop policy if exists podiel_citat_spravca on public.zbierka_podiel;
create policy podiel_citat_verejne on public.zbierka_podiel for select to anon, authenticated
  using (druh <> 'overovatel' and public.zbierka_ma_podelene(zbierka));
create policy podiel_citat_spravca on public.zbierka_podiel for select to authenticated
  using (ucet = public.moj_ucet() or public.zbierka_vidim_rozdelenie(zbierka));

commit;

-- >>> 0119_deti_prihlasenie.sql
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

-- >>> 0120_ludia_spravcovia.sql
-- ============================================================
-- 0120 · OPRAVY 380 — ľudia zo Správy → Ľudia s rolou, ktorá smie spravovať, sú správcovia stránky
-- ------------------------------------------------------------
-- Po 0115 zapisuje stav farnosti len spravujem_stranku (vlastník stránky alebo štatutár organizácie).
-- Kaplán a ďalší, ktorých farár pridal v Správa → Ľudia (nastavenia_stranky, kľúč „ludia“: { k: e-mail, r: rola }),
-- nemali práva. Teraz spravujem_stranku navyše pustí účet, ktorého e-mail je v zozname „ludia“ s rolou,
-- ktorá smie spravovať: všetky okrem Kostolník / pomocník, Koordinátor detí a mládeže, Účtovník.
-- Kontrola je pri každom volaní — keď farár človeka odoberie (alebo mu zmení rolu), práva hneď stratí.
-- Ručné priradenie (statutar) netreba.
-- ============================================================
begin;

create or replace function public.spravujem_stranku(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select public.moj_ucet() is not null and (
    exists (
      select 1 from public.stranka s
      where s.id = p_stranka
        and (s.ucet_id = public.moj_ucet()
             or exists (select 1 from public.statutar t where t.org_ucet_id = s.ucet_id and t.osoba_ucet_id = public.moj_ucet())))
    or exists (
      select 1
        from public.nastavenia_stranky n,
             jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
             auth.users a
       where n.stranka = p_stranka
         and a.id = auth.uid()
         and coalesce(a.email, '') <> ''
         and lower(trim(c->>'k')) = lower(a.email)
         and coalesce(c->>'r', '') not in ('Kostolník / pomocník', 'Koordinátor detí a mládeže', 'Účtovník')))
$$;

commit;

-- >>> 0121_zbierka_verejna_bez_rozdelenia.sql
-- ============================================================
-- 0121 · OPRAVY 384 — verejný pohľad zbierky (zbierka_verejna) bez rozdelenia a podielu farnosti
-- ------------------------------------------------------------
-- 0069b vracala celé nastavenie zbierky okrem účtu a IBAN: aj „rozdelenie“ (príjemca s účtom, podiel overovateľa),
-- „overenie_prijemcu“ a farnost.podiel — to si prečítal aj neprihlásený.
-- Teraz verejne len to, čo vidí darca (ako 0118): bez rozdelenia, bez podielu farnosti, bez overenia príjemcu.
-- Ak sa rodina podelila (farnost.podelit = komu a koľko %), to ostáva — darca to vidí pred darom.
-- Správca a príjemca čítajú celé rozdelenie z tabuliek ako doteraz.
-- ============================================================
begin;

create or replace view public.zbierka_verejna as
  select z.id, z.stranka, z.vs, z.stav, z.zapecatena, z.vytvorene,
         (z.nastavenie - 'iban' - 'ucet' - 'rozdelenie' - 'overenie_prijemcu') #- '{farnost,prijemca,ucet}' #- '{farnost,podiel}' as nastavenie
    from public.zbierka z
   where z.stranka is not null
     and z.zapecatena is not null;
grant select on public.zbierka_verejna to anon, authenticated;

commit;

-- >>> 0122_selfadd_zmazany.sql
-- ============================================================
-- 0122 · OPRAVY 381 — starý vypínač „Veriaci môžu pridávať oznamy“ (oblasť „selfadd“) je preč
-- ------------------------------------------------------------
-- Pridávanie veriacich riadi len „Čo môžu veriaci pridávať“ (oblasť „farniksmie“, Správa → Od veriacich).
-- Farnosti, ktoré mali starý vypínač vypnutý, dostanú všetky kategórie Zakázané (nič sa im neotvorí),
-- potom sa uložené nastavenie „selfadd“ zmaže.
-- ============================================================
begin;

insert into public.naboz_stav (oblast, id, data)
select 'farniksmie', s.id, '{"parte":"zakazane","svadba":"zakazane","ine":"zakazane","oznam":"zakazane","udalost":"zakazane","umysel":"zakazane","fotky":"zakazane","modlitba":"zakazane"}'::jsonb
  from public.naboz_stav s
 where s.oblast = 'selfadd' and coalesce(s.data->>'on', 'true') = 'false'
on conflict (oblast, id) do update set data = excluded.data, upravene = now();

delete from public.naboz_stav where oblast = 'selfadd';

commit;

-- >>> 0123_koordinator_deti.sql
-- ============================================================
-- 0123 · OPRAVY 380 (doplnok) — koordinátor detí a mládeže spravuje sekciu Deti a mládež
-- ------------------------------------------------------------
-- Koordinátor zo Správa → Ľudia (rola „Koordinátor detí a mládeže“) deti pozná, preto:
--   1. spravujem_deti(stránka) = správca stránky (0120) alebo koordinátor detí tejto stránky (e-mail v zozname „ludia“).
--   2. naboz_stav: koordinátor zapisuje len oblasť „deti“ (stretnutia, fotky, texty). Ostatné ostáva len správcovi.
--   3. deti_prihlasenie (0119): mená prihlásených detí vidí aj koordinátor.
-- Kontrola je pri každom volaní — po odobratí alebo zmene roly práva hneď stratí.
-- ============================================================
begin;

create or replace function public.spravujem_deti(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select public.spravujem_stranku(p_stranka) or (public.moj_ucet() is not null and exists (
    select 1
      from public.nastavenia_stranky n,
           jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
           auth.users a
     where n.stranka = p_stranka
       and a.id = auth.uid()
       and coalesce(a.email, '') <> ''
       and lower(trim(c->>'k')) = lower(a.email)
       and c->>'r' = 'Koordinátor detí a mládeže'))
$$;
revoke all on function public.spravujem_deti(text) from public, anon;
grant execute on function public.spravujem_deti(text) to authenticated;

drop policy if exists naboz_stav_zapis_spravca on public.naboz_stav;
drop policy if exists naboz_stav_uprava_spravca on public.naboz_stav;
drop policy if exists naboz_stav_mazanie_spravca on public.naboz_stav;
create policy naboz_stav_zapis_spravca on public.naboz_stav for insert to authenticated
  with check (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end);
create policy naboz_stav_uprava_spravca on public.naboz_stav for update to authenticated
  using (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end)
  with check (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end);
create policy naboz_stav_mazanie_spravca on public.naboz_stav for delete to authenticated
  using (case when oblast = 'deti' then public.spravujem_deti(id) else public.spravujem_stranku(id) end);

drop policy if exists deti_prihlasenie_citat on public.deti_prihlasenie;
create policy deti_prihlasenie_citat on public.deti_prihlasenie for select to authenticated
  using (ucet = public.moj_ucet() or public.spravujem_deti(stranka));

commit;

-- >>> 0124_farar_pomocnik.sql
-- ============================================================
-- 0124 · OPRAVY 393 — Ľudia v Správe: dve úrovne, Farár a Pomocník (Martin 19. 10.)
-- ------------------------------------------------------------
-- Namiesto rolí podľa sekcií (kaplán, kostolník, koordinátor detí, účtovník …, 0120 a 0123):
--   · Farár (všetko): vlastník stránky, štatutár, farár farnosti (stranka_farar, 0082), človek v Ľuďoch s rolou duchovného
--     (titul z číselníka cirkev: Farár, Kazateľ, Otec duchovný …) alebo Dozorca.
--   · Pomocník: každý iný človek v Ľuďoch (Správa → Ľudia, kľúč „ludia“, podľa e-mailu). Celá Správa okrem Nastavení:
--     nemení účet farnosti, predplatné ani ľudí (a farára). Názov pri človeku (kaplán, sestra Mária …) je len popis „p“.
--   1. uroven_stranky(stránka) → 'farar' | 'pomocnik' | null. spravujem_stranku = úroveň nie je null, plne_prava = 'farar'.
--      (som_farar z 0081 sa nemení: farár farnosti pre „Prispieť za farnosť“ a vlastné peniaze.)
--   2. spravujem_deti (0123) = spravujem_stranku (koordinátor je teraz pomocník).
--   3. Trigger na nastavenia_stranky: kľúče ludia, duch, ucetFarnosti, ucetFarnostiNovy, predplatne mení len farár.
--   4. moje_stranky vráti aj stránky, kde je človek v Ľuďoch, s úrovňou (appka ich ukáže v Moje stránky).
--   5. Doterajšie roly → Pomocník, pôvodný názov roly ostane ako popis.
-- Po odobratí z Ľudí práva hneď zmiznú (kontrola pri každom volaní).
-- ============================================================
begin;

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
                  when bool_or(c->>'r' = 'Dozorca' or c->>'r' in (select titul from public.cirkev)) then 'farar'
                  else 'pomocnik' end
        from public.nastavenia_stranky n,
             jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
             auth.users a
       where n.stranka = p_stranka
         and a.id = auth.uid()
         and coalesce(a.email, '') <> ''
         and lower(trim(c->>'k')) = lower(a.email))
  end
$$;
revoke all on function public.uroven_stranky(text) from public, anon;
grant execute on function public.uroven_stranky(text) to authenticated;

create or replace function public.spravujem_stranku(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select public.uroven_stranky(p_stranka) is not null
$$;

create or replace function public.plne_prava(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select public.uroven_stranky(p_stranka) = 'farar'
$$;
revoke all on function public.plne_prava(text) from public, anon;
grant execute on function public.plne_prava(text) to authenticated;

create or replace function public.spravujem_deti(p_stranka text) returns boolean
  language sql volatile security definer set search_path = public as $$
  select public.spravujem_stranku(p_stranka)
$$;

-- 3 · Nastavenia, ktoré mení len farár
create or replace function public.nastavenia_len_farar() returns trigger
  language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if public.moj_ucet() is null then return new; end if; -- server, migrácie
  if public.plne_prava(new.stranka) then return new; end if;
  foreach k in array array['ludia', 'duch', 'ucetFarnosti', 'ucetFarnostiNovy', 'predplatne'] loop
    if (tg_op = 'INSERT' and new.data ? k) or (tg_op = 'UPDATE' and new.data->k is distinct from old.data->k) then
      raise exception 'len_farar' using errcode = '42501', detail = k;
    end if;
  end loop;
  return new;
end $$;
revoke all on function public.nastavenia_len_farar() from public;
drop trigger if exists nastavenia_zamok_farara on public.nastavenia_stranky;
create trigger nastavenia_zamok_farara before insert or update on public.nastavenia_stranky
  for each row execute function public.nastavenia_len_farar();

-- 4 · Moje stránky aj z Ľudí, s úrovňou
create or replace function public.moje_stranky() returns jsonb
  language sql volatile security definer set search_path = public as $$
  with kandidati as (
    select s.id from public.stranka s
     where s.ucet_id = public.moj_ucet()
        or exists (select 1 from public.statutar t where t.org_ucet_id = s.ucet_id and t.osoba_ucet_id = public.moj_ucet())
    union
    select f.stranka from public.stranka_farar f where f.ucet = public.moj_ucet()
    union
    select n.stranka
      from public.nastavenia_stranky n,
           jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
           auth.users a
     where a.id = auth.uid() and coalesce(a.email, '') <> '' and lower(trim(c->>'k')) = lower(a.email)
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nazov', s.nazov, 'typ', s.typ, 'uroven', u.uroven) order by s.nazov), '[]'::jsonb)
    from public.stranka s
    join kandidati k on k.id = s.id
    cross join lateral (select public.uroven_stranky(s.id) as uroven) u
   where public.moj_ucet() is not null and u.uroven is not null
$$;

-- 5 · doterajšie roly → Pomocník (názov roly ostane ako popis)
update public.nastavenia_stranky n
   set data = jsonb_set(n.data, '{ludia}', (
     select coalesce(jsonb_agg(
              case when c->>'r' = 'Dozorca' or c->>'r' = 'Pomocník' or c->>'r' in (select titul from public.cirkev) then c
                   else c || jsonb_build_object('r', 'Pomocník', 'p', coalesce(nullif(trim(c->>'p'), ''), c->>'r')) end), '[]'::jsonb)
       from jsonb_array_elements(n.data->'ludia') c))
 where jsonb_typeof(n.data->'ludia') = 'array'
   and exists (select 1 from jsonb_array_elements(n.data->'ludia') c
                where not (c->>'r' = 'Dozorca' or c->>'r' = 'Pomocník' or c->>'r' in (select titul from public.cirkev)));

commit;

-- >>> 0125_pozvanka_do_spravy.sql
-- ============================================================
-- 0125 · OPRAVY 392 — pozvánka do Správy: práva až po Prijať
-- ------------------------------------------------------------
-- Doteraz (0120, 0124) mal človek práva hneď, keď ho farár pridal e-mailom; prijatie v appke nebolo, QR pozvánka práva nedala.
-- Teraz:
--   1. uroven_stranky počíta len prijatých (v zozname „ludia“ caka = false alebo chýba). Pozvaný (caka true / „odkaz“),
--      odmietnutý („odmietol“) aj starý stav „potvrdit“ práva nemajú.
--   2. Nový pozvaný e-mailom dostane upozornenie do zvončeka „{farnosť} vás pozýva do Správy · {popis · rola}“,
--      odkaz poz:<stránka>:<id> → v appke Prijať · Odmietnuť. (Rovnako tí, čo už čakajú — raz pri tejto migrácii.)
--   3. pozvanka(stránka, id) — čo appka ukáže pozvanému (e-mailom: len ak je to jeho e-mail; QR: kým platí).
--   4. pozvanka_odpoved(stránka, id, prijat) — Prijať (caka = false, prijal = čas; pri QR sa zapíše e-mail účtu) alebo
--      Odmietnuť (caka = „odmietol“). Zoznam ľudí inak mení len farár (0124), túto jednu zmenu smie pozvaný.
-- ============================================================
begin;

-- 1 · práva len prijatým
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
                  when bool_or(c->>'r' = 'Dozorca' or c->>'r' in (select titul from public.cirkev)) then 'farar'
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

-- moje_stranky (0124) — kandidáti len z prijatých pozvánok (úroveň to aj tak overí)
create or replace function public.moje_stranky() returns jsonb
  language sql volatile security definer set search_path = public as $$
  with kandidati as (
    select s.id from public.stranka s
     where s.ucet_id = public.moj_ucet()
        or exists (select 1 from public.statutar t where t.org_ucet_id = s.ucet_id and t.osoba_ucet_id = public.moj_ucet())
    union
    select f.stranka from public.stranka_farar f where f.ucet = public.moj_ucet()
    union
    select n.stranka
      from public.nastavenia_stranky n,
           jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) c,
           auth.users a
     where a.id = auth.uid() and coalesce(a.email, '') <> '' and lower(trim(c->>'k')) = lower(a.email)
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nazov', s.nazov, 'typ', s.typ, 'uroven', u.uroven) order by s.nazov), '[]'::jsonb)
    from public.stranka s
    join kandidati k on k.id = s.id
    cross join lateral (select public.uroven_stranky(s.id) as uroven) u
   where public.moj_ucet() is not null and u.uroven is not null
$$;

-- 0124 zámok: zmenu „ludia“ z pozvanka_odpoved pustí (príznak platí len v tej transakcii)
create or replace function public.nastavenia_len_farar() returns trigger
  language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if public.moj_ucet() is null then return new; end if; -- server, migrácie
  if public.plne_prava(new.stranka) then return new; end if;
  foreach k in array array['ludia', 'duch', 'ucetFarnosti', 'ucetFarnostiNovy', 'predplatne'] loop
    if k = 'ludia' and current_setting('deed.pozvanka', true) = new.stranka then continue; end if;
    if (tg_op = 'INSERT' and new.data ? k) or (tg_op = 'UPDATE' and new.data->k is distinct from old.data->k) then
      raise exception 'len_farar' using errcode = '42501', detail = k;
    end if;
  end loop;
  return new;
end $$;

-- 2 · upozornenie pozvanému
create or replace function public.pozvanka_upozorni(p_stranka text, c jsonb) returns void
  language plpgsql volatile security definer set search_path = public as $$
declare v_ucet uuid; v_nazov text;
begin
  select u.id into v_ucet from auth.users a join public.ucet u on u.auth_id = a.id
   where coalesce(a.email, '') <> '' and lower(a.email) = lower(trim(c->>'k')) limit 1;
  if v_ucet is null then return; end if;
  select nazov into v_nazov from public.stranka where id = p_stranka;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
  values (v_ucet, 'socialne', 'lud',
          left(coalesce(v_nazov, 'Farnosť') || ' vás pozýva do Správy · ' || coalesce(nullif(trim(c->>'p'), '') || ' · ', '') || coalesce(c->>'r', 'Pomocník'), 200),
          'Ťuknite a pozvánku prijmite alebo odmietnite. Kým ju neprijmete, Správu nevidíte.',
          'poz:' || p_stranka || ':' || (c->>'id'),
          exists (select 1 from public.push_odber p where p.ucet_id = v_ucet));
end $$;
revoke all on function public.pozvanka_upozorni(text, jsonb) from public, anon, authenticated;

create or replace function public.nastavenia_pozvanky() returns trigger
  language plpgsql security definer set search_path = public as $$
declare c jsonb;
begin
  if jsonb_typeof(new.data->'ludia') <> 'array' then return new; end if;
  for c in select x from jsonb_array_elements(new.data->'ludia') x
            where x->'caka' = 'true'::jsonb and coalesce(x->>'k', '') like '%@%'
  loop
    if tg_op = 'UPDATE' and jsonb_typeof(old.data->'ludia') = 'array' and exists (
         select 1 from jsonb_array_elements(old.data->'ludia') o
          where o->>'id' = c->>'id' and o->'caka' = 'true'::jsonb and lower(trim(o->>'k')) = lower(trim(c->>'k'))) then
      continue; -- už pozvaný skôr
    end if;
    perform public.pozvanka_upozorni(new.stranka, c);
  end loop;
  return new;
end $$;
revoke all on function public.nastavenia_pozvanky() from public;
drop trigger if exists nastavenia_pozvanky on public.nastavenia_stranky;
create trigger nastavenia_pozvanky after insert or update on public.nastavenia_stranky
  for each row execute function public.nastavenia_pozvanky();

-- 3 · čo vidí pozvaný
create or replace function public.pozvanka(p_stranka text, p_id text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare c jsonb; v_mail text; v_nazov text; v_stav text;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select lower(email) into v_mail from auth.users where id = auth.uid();
  select x into c from public.nastavenia_stranky n, jsonb_array_elements(case when jsonb_typeof(n.data->'ludia') = 'array' then n.data->'ludia' else '[]'::jsonb end) x
   where n.stranka = p_stranka and x->>'id' = p_id limit 1;
  if c is null then raise exception 'pozvanka_neexistuje' using errcode = 'P0002'; end if;
  if c->'caka' = '"odkaz"'::jsonb then
    v_stav := case when (c->>'dos') ~ '^\d+$' and (c->>'dos')::bigint < (extract(epoch from now()) * 1000)::bigint then 'vyprsala' else 'caka' end;
  elsif lower(trim(coalesce(c->>'k', ''))) <> coalesce(v_mail, '') then
    raise exception 'pozvanka_neexistuje' using errcode = 'P0002'; -- cudziu pozvánku neukážeme
  elsif c->'caka' = 'true'::jsonb then v_stav := 'caka';
  elsif c->'caka' = '"odmietol"'::jsonb then v_stav := 'odmietol';
  elsif c->'caka' is null or c->'caka' = 'false'::jsonb then v_stav := 'prijal';
  else v_stav := 'caka';
  end if;
  select nazov into v_nazov from public.stranka where id = p_stranka;
  return jsonb_build_object('stranka', p_stranka, 'nazov', v_nazov, 'r', c->>'r', 'p', c->>'p', 'stav', v_stav);
end $$;
revoke all on function public.pozvanka(text, text) from public, anon;
grant execute on function public.pozvanka(text, text) to authenticated;

-- 4 · Prijať / Odmietnuť
create or replace function public.pozvanka_odpoved(p_stranka text, p_id text, p_prijat boolean) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare v_mail text; v_l jsonb; c jsonb; v_nove jsonb; v_teraz bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select lower(email) into v_mail from auth.users where id = auth.uid();
  if coalesce(v_mail, '') = '' then raise exception 'bez_emailu' using errcode = '22023'; end if;
  select data->'ludia' into v_l from public.nastavenia_stranky where stranka = p_stranka for update;
  select x into c from jsonb_array_elements(case when jsonb_typeof(v_l) = 'array' then v_l else '[]'::jsonb end) x where x->>'id' = p_id limit 1;
  if c is null then raise exception 'pozvanka_neexistuje' using errcode = 'P0002'; end if;
  if c->'caka' = '"odkaz"'::jsonb then
    if (c->>'dos') ~ '^\d+$' and (c->>'dos')::bigint < v_teraz then raise exception 'vyprsala' using errcode = '22023'; end if;
    v_nove := c || jsonb_build_object('k', v_mail);
  elsif c->'caka' = 'true'::jsonb and lower(trim(coalesce(c->>'k', ''))) = v_mail then
    v_nove := c;
  else
    raise exception 'pozvanka_neplati' using errcode = '22023';
  end if;
  v_nove := v_nove || case when p_prijat then jsonb_build_object('caka', false, 'prijal', v_teraz) else jsonb_build_object('caka', 'odmietol') end;
  perform set_config('deed.pozvanka', p_stranka, true);
  update public.nastavenia_stranky
     set data = jsonb_set(data, '{ludia}', (select jsonb_agg(case when x->>'id' = p_id then v_nove else x end) from jsonb_array_elements(v_l) x))
   where stranka = p_stranka;
  perform set_config('deed.pozvanka', '', true);
  return case when p_prijat then 'prijal' else 'odmietol' end;
end $$;
revoke all on function public.pozvanka_odpoved(text, text, boolean) from public, anon;
grant execute on function public.pozvanka_odpoved(text, text, boolean) to authenticated;

-- tí, čo už čakajú na prijatie (pozvaní e-mailom pred touto migráciou), dostanú upozornenie raz teraz
select public.pozvanka_upozorni(n.stranka, c)
  from public.nastavenia_stranky n, jsonb_array_elements(n.data->'ludia') c
 where jsonb_typeof(n.data->'ludia') = 'array' and c->'caka' = 'true'::jsonb and coalesce(c->>'k', '') like '%@%';

commit;

insert into supabase_migrations.schema_migrations(version, name) select to_char(now() + (n || ' second')::interval, 'YYYYMMDDHH24MISS'), m from unnest(array['0114_notifikacie_bez_ukazky','0115_naboz_len_spravca','0116_umysly_oddelene','0117_umysel_sprava','0118_podiel_neverejny','0119_deti_prihlasenie','0120_ludia_spravcovia','0121_zbierka_verejna_bez_rozdelenia','0122_selfadd_zmazany','0123_koordinator_deti','0124_farar_pomocnik','0125_pozvanka_do_spravy']) with ordinality as x(m, n);
