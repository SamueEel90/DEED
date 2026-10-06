-- ============================================================
-- 0039 · Zadanie 3 · 3.1 — AI skóre, „overené" a karmu skutku zapisuje LEN server
-- ------------------------------------------------------------
-- /api/score zapíše beh do scoring_log (service role). Klient pri vytvorení skutku
-- pošle len obsah + run_id behu. Skóre, overene a karmu doplní databáza z logu —
-- čo klient pošle v týchto stĺpcoch, sa ignoruje (insert aj update).
-- Po dobehnutí /api/score navyše sám prepíše prispevok s týmto run_id (ak už existuje).
-- Karma za skutok = max(1, round(skóre × 10)) — pravidlo žije len tu (placeholder do kalibrácie).
-- (0038 je rezervovaná pre prípadný doplnok ledgera.)
-- ============================================================
begin;

alter table public.prispevok add column if not exists score_run_id uuid unique;
alter table public.prispevok add column if not exists karma int;

-- je to zápis z appky (anon / authenticated)? server (service_role, postgres) sa nekontroluje
create or replace function public.zapis_klienta() returns boolean
  language sql stable as $$
  select coalesce(current_setting('role', true), '') in ('anon', 'authenticated')
$$;

create or replace function public.skore_z_behu(p_run uuid, out skore numeric, out overene boolean, out karma int)
  language sql stable security definer set search_path = public as $$
  select coalesce((l.dopocitane->>'skore')::numeric, 0),
         coalesce((l.dopocitane->>'pasmo')::int, 0) >= 1,
         case when (l.dopocitane->>'skore') is null then null
              else greatest(1, round((l.dopocitane->>'skore')::numeric * 10))::int end
    from public.scoring_log l
   where l.run_id = p_run and l.verdikt = 'ok'
$$;

create or replace function public.prispevok_pravda_servera() returns trigger
  language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public.zapis_klienta() then return new; end if;
  if tg_op = 'UPDATE' then
    -- klient tieto stĺpce nemení nikdy
    new.skore := old.skore; new.overene := old.overene; new.karma := old.karma; new.score_run_id := old.score_run_id;
    return new;
  end if;
  -- INSERT: hodnoty len z behu AI (scoring_log), inak nula / neoverené
  new.skore := 0; new.overene := false; new.karma := null;
  if new.score_run_id is not null then
    select * into r from public.skore_z_behu(new.score_run_id);
    if found and r.skore is not null then
      new.skore := r.skore; new.overene := r.overene; new.karma := r.karma;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists prispevok_pravda_servera on public.prispevok;
create trigger prispevok_pravda_servera
  before insert or update on public.prispevok
  for each row execute function public.prispevok_pravda_servera();

commit;
