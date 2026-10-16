-- ============================================================
-- 0099 · OPRAVY 330 — príspevok od veriaceho, ktorý čaká na schválenie, nie je nikde verejne prístupný
-- ------------------------------------------------------------
-- Doteraz: všetky príspevky od veriacich = jedno pole v naboz_stav (oblasť „odfarnikov“), ktoré číta každý
--   (aj anon). Čakajúci a zamietnutý text tam ležal celý, len appka ho ostatným nezobrazila.
-- Teraz:
-- 1. Tabuľka odfarnikov_caka (stránka, id príspevku, autor, data, stav caka | zamietnute | zverejnene).
--    Číta ju len autor (moj_ucet) a správca stránky (spravujem_stranku). Priamy zápis z klienta žiadny.
-- 2. Spúšťač PRED zápisom do naboz_stav „odfarnikov“: každý prvok so stavom caka / zamietnute sa z poľa
--    vyberie a uloží do odfarnikov_caka (autor = kto zapisuje). Verejné pole nikdy neobsahuje neschválený text.
--    Nový prvok bez stavu od niekoho, kto nie je správca, v kategórii „Po schválení“ (farniksmie) = čakajúci.
--    Starý klient s neaktuálnou kópiou (čaká, hoci už je zverejnený) nič nepokazí: ostane verejná verzia.
-- 3. rozhodni_od_veriacich(stránka, ids, zverejniť) — len správca: zverejniť = prvok do verejného poľa
--    (s „rozhodnute“), riadok ostane so stavom zverejnene bez textu; zamietnuť = stav zamietnute (text vidí
--    len autor a farár).
-- 4. zmaz_cakajuci(stránka, id) — autor alebo správca zmaže svoj čakajúci / zamietnutý príspevok.
-- 5. Upozornenie „Čaká na vaše schválenie ›“ ide teraz z odfarnikov_caka (z poľa sa čakajúce vyberú skôr,
--    než ich vidí spúšťač z 0097). Zverejnenie po schválení nepošle „Nový príspevok od veriacich“ znova.
-- 6. Doterajšie čakajúce a zamietnuté z verejných polí sa presunú (autor z poľa „autor“, ak je to účet).
-- ============================================================
begin;

create table if not exists public.odfarnikov_caka (
  stranka    text not null,
  id         text not null,
  autor      uuid references public.ucet(id) on delete set null,
  data       jsonb not null default '{}'::jsonb,
  stav       text not null default 'caka',
  vytvorene  timestamptz not null default now(),
  rozhodnute timestamptz,
  primary key (stranka, id),
  constraint odfarnikov_caka_stav_ok check (stav in ('caka', 'zamietnute', 'zverejnene'))
);
alter table public.odfarnikov_caka enable row level security;
drop policy if exists odfarnikov_caka_citat on public.odfarnikov_caka;
create policy odfarnikov_caka_citat on public.odfarnikov_caka for select to authenticated
  using (autor = public.moj_ucet() or public.spravujem_stranku(stranka));
revoke all on public.odfarnikov_caka from anon;
revoke insert, update, delete on public.odfarnikov_caka from authenticated;
grant select on public.odfarnikov_caka to authenticated;

-- stupeň kategórie podľa nastavenia farára (rovnako ako appka: true = povolene, false = zakazane, inak predvolené)
create or replace function public.odf_stupen(p_stranka text, p_k text) returns text
  language sql stable security definer set search_path = public as $$
  select case
    when p_k = 'umysel' then 'povolene'
    when jsonb_typeof(v) = 'boolean' then case when v::text = 'true' then 'povolene' else 'zakazane' end
    when jsonb_typeof(v) = 'string' and v #>> '{}' in ('povolene', 'schvalenie', 'zakazane') then v #>> '{}'
    when p_k in ('modlitba', 'oznam', 'udalost', 'fotky') then 'schvalenie'
    else 'povolene' end
  from (select (select s.data -> p_k from public.naboz_stav s where s.oblast = 'farniksmie' and s.id = p_stranka) as v) q
$$;

-- kľúč autora z poľa „autor“ → účet (len ak je to existujúci účet)
create or replace function public.odf_ucet(p text) returns uuid
  language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  if p is null or p !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  v := p::uuid;
  return case when exists (select 1 from public.ucet u where u.id = v) then v end;
end $$;

create or replace function public.odf_oddel_cakajuce() returns trigger
  language plpgsql security definer set search_path = public as $$
declare e jsonb; o jsonb; r public.odfarnikov_caka; v_ja uuid := public.moj_ucet(); v_spravca boolean;
  v_old jsonb := case when tg_op = 'UPDATE' and jsonb_typeof(old.data) = 'array' then old.data else '[]'::jsonb end;
  v_out jsonb := '[]'::jsonb; v_autor uuid;
begin
  if jsonb_typeof(new.data) <> 'array' then return new; end if;
  v_spravca := v_ja is not null and public.spravujem_stranku(new.id);
  for e in select x from jsonb_array_elements(new.data) x loop
    if coalesce(e->>'id', '') = '' then v_out := v_out || jsonb_build_array(e); continue; end if;
    o := (select x from jsonb_array_elements(v_old) x where x->>'id' = e->>'id' limit 1);
    select * into r from public.odfarnikov_caka c where c.stranka = new.id and c.id = e->>'id';
    if e->>'stav' in ('caka', 'zamietnute') then
      if o is not null and o->>'stav' is null then
        v_out := v_out || jsonb_build_array(o); -- neaktuálna kópia: príspevok už je zverejnený
      elsif r.id is null then
        if e->>'stav' = 'caka' then
          v_autor := coalesce(v_ja, public.odf_ucet(e->>'autor'));
          insert into public.odfarnikov_caka (stranka, id, autor, data, stav) values (new.id, e->>'id', v_autor, e, 'caka');
        elsif v_ja is null then -- presun doterajších zamietnutých (migrácia)
          insert into public.odfarnikov_caka (stranka, id, autor, data, stav, rozhodnute)
          values (new.id, e->>'id', public.odf_ucet(e->>'autor'), e, 'zamietnute', now());
        end if;
      elsif r.stav = 'caka' and e->>'stav' = 'caka' and r.autor is not distinct from v_ja then
        update public.odfarnikov_caka set data = e where stranka = new.id and id = r.id; -- autor upravil
      elsif r.stav = 'caka' and e->>'stav' = 'zamietnute' and v_spravca then
        update public.odfarnikov_caka set stav = 'zamietnute', rozhodnute = now() where stranka = new.id and id = r.id; -- starší klient farára
      end if;
      continue; -- do verejného poľa nikdy
    end if;
    -- prvok bez stavu
    if o is null and r.id is not null and r.stav <> 'zverejnene' then
      if v_spravca then -- farár zverejnil (starší klient)
        update public.odfarnikov_caka set stav = 'zverejnene', data = '{}'::jsonb, rozhodnute = now() where stranka = new.id and id = r.id;
        v_out := v_out || jsonb_build_array(e);
      end if;
      continue; -- nikto iný čakajúci príspevok nezverejní
    end if;
    if o is null and r.id is null and not v_spravca and v_ja is not null and coalesce(e->>'osobne', '') <> 'true'
       and public.odf_stupen(new.id, e->>'k') = 'schvalenie' then
      insert into public.odfarnikov_caka (stranka, id, autor, data, stav) values (new.id, e->>'id', v_ja, e || '{"stav":"caka"}'::jsonb, 'caka');
      continue;
    end if;
    v_out := v_out || jsonb_build_array(e);
  end loop;
  new.data := v_out;
  return new;
end $$;
drop trigger if exists odf_oddel_cakajuce on public.naboz_stav;
create trigger odf_oddel_cakajuce before insert or update of data on public.naboz_stav
  for each row when (new.oblast = 'odfarnikov') execute function public.odf_oddel_cakajuce();

-- farár rozhodne: zverejniť (do verejného poľa) alebo zamietnuť
create or replace function public.rozhodni_od_veriacich(p_stranka text, p_ids text[], p_zverejnit boolean) returns int
  language plpgsql security definer set search_path = public as $$
declare r public.odfarnikov_caka; v_n int := 0; v_ms bigint := (extract(epoch from now()) * 1000)::bigint; v_pole jsonb; v_zbytok jsonb;
begin
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  for r in select * from public.odfarnikov_caka c where c.stranka = p_stranka and c.id = any(p_ids) and c.stav = 'caka' for update loop
    if p_zverejnit then
      select s.data into v_pole from public.naboz_stav s where s.oblast = 'odfarnikov' and s.id = p_stranka for update;
      select coalesce(jsonb_agg(x), '[]'::jsonb) into v_zbytok
        from jsonb_array_elements(case when jsonb_typeof(v_pole) = 'array' then v_pole else '[]'::jsonb end) x where x->>'id' is distinct from r.id;
      -- stav najprv, aby spúšťač prvok bez stavu pustil
      update public.odfarnikov_caka set stav = 'zverejnene', data = '{}'::jsonb, rozhodnute = now() where stranka = p_stranka and id = r.id;
      insert into public.naboz_stav (oblast, id, data, upravene)
        values ('odfarnikov', p_stranka, jsonb_build_array((r.data - 'stav') || jsonb_build_object('rozhodnute', v_ms)) || v_zbytok, now())
        on conflict (oblast, id) do update set data = excluded.data, upravene = now();
    else
      update public.odfarnikov_caka set stav = 'zamietnute', rozhodnute = now() where stranka = p_stranka and id = r.id;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- autor (alebo správca) zmaže čakajúci / zamietnutý príspevok
create or replace function public.zmaz_cakajuci(p_stranka text, p_id text) returns boolean
  language plpgsql security definer set search_path = public as $$
begin
  delete from public.odfarnikov_caka c where c.stranka = p_stranka and c.id = p_id and c.stav <> 'zverejnene'
    and (c.autor = public.moj_ucet() or public.spravujem_stranku(p_stranka));
  return found;
end $$;
revoke all on function public.rozhodni_od_veriacich(text, text[], boolean), public.zmaz_cakajuci(text, text), public.odf_stupen(text, text), public.odf_ucet(text) from public;
grant execute on function public.rozhodni_od_veriacich(text, text[], boolean), public.zmaz_cakajuci(text, text) to authenticated;

-- upozornenie správcom: nový čakajúci príspevok (z odfarnikov_caka, nie z verejného poľa)
create or replace function public.upoz_caka() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_druh text; v_text text; u uuid; v_ja uuid := public.moj_ucet();
begin
  if new.stav <> 'caka' or v_ja is null then return new; end if;
  if coalesce((select s.data->>'upozornit' from public.naboz_stav s where s.oblast = 'odfnast' and s.id = new.stranka), 'true') = 'false' then return new; end if;
  insert into public.pripomienka_odoslana (zdroj) values ('odv:' || new.stranka || ':' || new.id) on conflict do nothing;
  if not found then return new; end if;
  v_druh := case new.data->>'k' when 'parte' then 'Parte' when 'svadba' then 'Svadobné oznámenie' when 'ine' then 'Oznámenie' when 'oznam' then 'Oznam'
    when 'udalost' then 'Udalosť' when 'fotky' then 'Fotky z akcie' when 'modlitba' then 'Prosba o modlitbu' else 'Príspevok' end;
  v_text := v_druh || ': ' || coalesce(nullif(trim(new.data->>'t'), ''), 'bez názvu') || coalesce(' · ' || nullif(trim(new.data->>'kto'), ''), '');
  for u in select distinct x.ucet_id from public.spravcovia_stranky(new.stranka) x where x.ucet_id is distinct from v_ja loop
    insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    values (u, 'socialne', 'otaz', 'Čaká na vaše schválenie ›', left(v_text, 500), 'odv:' || new.stranka || ':' || new.id,
            exists (select 1 from public.push_odber p where p.ucet_id = u));
  end loop;
  return new;
exception when others then
  raise warning 'upoz_caka: %', sqlerrm;
  return new;
end $$;
drop trigger if exists upoz_caka on public.odfarnikov_caka;
create trigger upoz_caka after insert on public.odfarnikov_caka for each row execute function public.upoz_caka();

-- 0097: zverejnenie po schválení (prvok s „rozhodnute“) nie je nový príspevok — správcovia ho už dostali ako čakajúci
create or replace function public.upoz_od_veriacich() returns trigger
  language plpgsql security definer set search_path = public as $$
declare e jsonb; o jsonb; v_old jsonb := case when tg_op = 'UPDATE' then old.data end; v_ja uuid := public.moj_ucet();
  v_titul text; v_ikona text; v_zdroj text; v_druh text; v_text text; v_nahl int; v_nahl_o int; u uuid;
begin
  if coalesce((select s.data->>'upozornit' from public.naboz_stav s where s.oblast = 'odfnast' and s.id = new.id), 'true') = 'false' then return new; end if;
  for e in select x from jsonb_array_elements(case when jsonb_typeof(new.data) = 'array' then new.data else '[]'::jsonb end) x loop
    if coalesce(e->>'id', '') = '' then continue; end if;
    o := (select x from jsonb_array_elements(case when jsonb_typeof(v_old) = 'array' then v_old else '[]'::jsonb end) x where x->>'id' = e->>'id' limit 1);
    v_nahl := case when jsonb_typeof(e->'nahlasili') = 'array' then jsonb_array_length(e->'nahlasili') when e->>'nahl' ~ '^\d{1,6}$' then (e->>'nahl')::int else 0 end;
    v_titul := null;
    if o is null then
      if coalesce(e->>'osobne', '') = 'true' then continue; end if;
      if e ? 'rozhodnute' then continue; end if; -- OPRAVY 330: zverejnený po schválení
      if e->>'k' = 'umysel' then v_titul := 'Nový úmysel na omšu ›'; v_ikona := 'srd';
      elsif e->>'stav' is null then v_titul := 'Nový príspevok od veriacich ›'; v_ikona := 'lud';
      end if;
      v_zdroj := 'odv:' || new.id || ':' || (e->>'id');
    else
      v_nahl_o := case when jsonb_typeof(o->'nahlasili') = 'array' then jsonb_array_length(o->'nahlasili') when o->>'nahl' ~ '^\d{1,6}$' then (o->>'nahl')::int else 0 end;
      if v_nahl > v_nahl_o then v_titul := 'Nahlásený príspevok ›'; v_ikona := 'namiet'; v_zdroj := 'odv:' || new.id || ':' || (e->>'id') || ':n' || v_nahl; end if;
    end if;
    if v_titul is null then continue; end if;
    insert into public.pripomienka_odoslana (zdroj) values (v_zdroj) on conflict do nothing;
    if not found then continue; end if;
    v_druh := case e->>'k' when 'parte' then 'Parte' when 'svadba' then 'Svadobné oznámenie' when 'ine' then 'Oznámenie' when 'oznam' then 'Oznam'
      when 'udalost' then 'Udalosť' when 'umysel' then 'Úmysel' when 'fotky' then 'Fotky z akcie' when 'modlitba' then 'Prosba o modlitbu' else 'Príspevok' end;
    v_text := v_druh || ': ' || coalesce(nullif(trim(e->>'t'), ''), 'bez názvu') || coalesce(' · ' || nullif(trim(e->>'kto'), ''), '');
    for u in select distinct x.ucet_id from public.spravcovia_stranky(new.id) x where x.ucet_id is distinct from v_ja loop
      insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
      values (u, 'socialne', v_ikona, v_titul, left(v_text, 500), 'odv:' || new.id || ':' || (e->>'id'),
              exists (select 1 from public.push_odber p where p.ucet_id = u));
    end loop;
  end loop;
  return new;
exception when others then
  raise warning 'upoz_od_veriacich: %', sqlerrm;
  return new;
end $$;

-- 6. doterajšie čakajúce a zamietnuté von z verejných polí (spúšťač ich presunie; bez prihlásenia autor z poľa „autor“)
update public.naboz_stav set data = data where oblast = 'odfarnikov' and jsonb_typeof(data) = 'array'
  and exists (select 1 from jsonb_array_elements(data) x where x->>'stav' in ('caka', 'zamietnute'));

commit;
