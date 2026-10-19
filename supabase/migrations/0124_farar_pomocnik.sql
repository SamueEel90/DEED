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
