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
