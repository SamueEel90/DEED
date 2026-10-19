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
