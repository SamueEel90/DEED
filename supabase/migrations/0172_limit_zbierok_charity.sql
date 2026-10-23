-- ============================================================
-- 0172 · Balík 48 bod 518 (Martin 23. 10.) · limit zbierok charity = súčet všetkých druhov
-- ------------------------------------------------------------
-- Charita si vyberie, aké zbierky chce; limit je ich súčet naraz: centrálna + sektorové + bežné (pre niekoho).
--   Zadarmo 1 (0165, sektory od P1 — 0169) · P1 4 · P2 11 · P3 a vyšší bez limitu (na mieru).
-- Kontrola pri: založení aktívnej zbierky stránky, prvom spustení centrálnej, spustení sektora.
-- Chyba 42501 'limit_zbierok'. Len zápisy z appky (authenticated/anon); server, seed a testy obídu. Len stranka.typ = 'charita'.
-- Existujúce zbierky sa nemenia. Zadarmo ostáva na 0165 (tam je aj „bez pravidelnej“). Idempotentné.
-- ============================================================
begin;

create or replace function public.limit_zbierok_charity(p_stranka text) returns int
  language sql stable security definer set search_path = public as $$
  select case public.program_stranky(p_stranka) when 0 then 1 when 1 then 4 when 2 then 11 else null end
$$;
revoke all on function public.limit_zbierok_charity(text) from public, anon, authenticated;

-- bežiace zbierky charity: aktívne bežné + spustená centrálna + spustené neukončené sektory (bez p_okrem)
create or replace function public.beziace_zbierky_charity(p_stranka text, p_okrem text default null) returns int
  language sql stable security definer set search_path = public as $$
  select (select count(*) from public.zbierka z where z.stranka = p_stranka and z.stav = 'aktivna'
            and coalesce(z.typ, '') not in ('hlavna', 'sektor') and z.id is distinct from p_okrem)::int
       + (select count(*) from public.profil_stranky p where p.stranka = p_stranka and p.centralna->>'spustena' is not null
            and p_okrem is distinct from 'centralna')::int
       + (select count(*) from public.sektor_stranky s where s.stranka = p_stranka and s.spusteny is not null and s.ukonceny is null
            and s.id is distinct from p_okrem)::int
$$;
revoke all on function public.beziace_zbierky_charity(text, text) from public, anon, authenticated;

create or replace function public.skontroluj_limit_charity(p_stranka text, p_okrem text) returns void
  language plpgsql stable security definer set search_path = public as $$
declare v_limit int;
begin
  if coalesce(current_setting('role', true), '') not in ('authenticated', 'anon') then return; end if;
  if not exists (select 1 from public.stranka s where s.id = p_stranka and s.typ = 'charita') then return; end if;
  if public.program_stranky(p_stranka) = 0 then return; end if; -- Zadarmo: 0165
  v_limit := public.limit_zbierok_charity(p_stranka);
  if v_limit is not null and public.beziace_zbierky_charity(p_stranka, p_okrem) >= v_limit then
    raise exception 'limit_zbierok' using errcode = '42501';
  end if;
end $$;
revoke all on function public.skontroluj_limit_charity(text, text) from public, anon, authenticated;

create or replace function public.limit_zbierka() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.stranka is null or coalesce(new.typ, '') in ('hlavna', 'sektor') or new.stav <> 'aktivna' then return new; end if;
  perform public.skontroluj_limit_charity(new.stranka, new.id);
  return new;
end $$;
drop trigger if exists limit_zbierka on public.zbierka;
create trigger limit_zbierka before insert on public.zbierka for each row execute function public.limit_zbierka();

create or replace function public.limit_centralna() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.centralna->>'spustena' is null then return new; end if;
  if tg_op = 'UPDATE' and old.centralna->>'spustena' is not null then return new; end if;
  perform public.skontroluj_limit_charity(new.stranka, 'centralna');
  return new;
end $$;
drop trigger if exists limit_centralna on public.profil_stranky;
create trigger limit_centralna before insert or update of centralna on public.profil_stranky for each row execute function public.limit_centralna();

create or replace function public.limit_sektor() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.spusteny is null or new.ukonceny is not null then return new; end if;
  if tg_op = 'UPDATE' and old.spusteny is not null and old.ukonceny is null then return new; end if;
  perform public.skontroluj_limit_charity(new.stranka, new.id);
  return new;
end $$;
drop trigger if exists limit_sektor on public.sektor_stranky;
create trigger limit_sektor before insert or update of spusteny, ukonceny on public.sektor_stranky for each row execute function public.limit_sektor();

commit;
