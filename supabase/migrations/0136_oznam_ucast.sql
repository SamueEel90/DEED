-- ============================================================
-- 0136 · OPRAVY 431 · prihlásenie ľudí k oznamu / výzve charity (oznam_charity)
-- ------------------------------------------------------------
-- Doteraz prihlásení žili v data.prihlaseni oznamu, ktoré smie písať len správca stránky —
-- človek sa teda prihlásiť nemohol. Teraz:
--   oznam_ucast              — jeden riadok = jeden človek „Zúčastním sa“ / „Prihlásiť sa“
--   oznam_ucast_prihlas(id)  — prihlási prihláseného človeka (kontrola: nezrušené, nie po dátume,
--                              pozvanie nie „bez“, limit pri záväznom); vráti počet
--   oznam_ucast_pocty(ids)   — počty pre karty a detail (verejné) + či som prihlásený ja
-- Mená vidí len správca stránky a človek sám seba (RLS). Počet = počet riadkov, nič sa nepočíta bokom.
-- Idempotentné.
-- ============================================================
begin;

create table if not exists public.oznam_ucast (
  id        uuid primary key default gen_random_uuid(),
  oznam     text not null references public.oznam_charity(id) on delete cascade,
  stranka   text not null,
  ucet_id   uuid not null references public.ucet(id) on delete cascade,
  meno      text not null,
  kedy      timestamptz not null default now(),
  unique (oznam, ucet_id)
);
create index if not exists oznam_ucast_oznam_idx on public.oznam_ucast (oznam);
alter table public.oznam_ucast enable row level security;
drop policy if exists ucast_citat on public.oznam_ucast;
create policy ucast_citat on public.oznam_ucast for select to authenticated
  using (ucet_id = public.moj_ucet() or public.spravujem_stranku(stranka));
revoke all on public.oznam_ucast from anon, authenticated;
grant select on public.oznam_ucast to authenticated;
-- zápis len cez funkciu (kontroly limitu a dátumu na serveri)

create or replace function public.oznam_ucast_prihlas(p_oznam text) returns int
  language plpgsql security definer set search_path = public as $$
declare v_ucet uuid := public.moj_ucet(); o public.oznam_charity; v_limit int; v_poc int; v_meno text;
begin
  if v_ucet is null then raise exception 'Prihláste sa, prosím.'; end if;
  select * into o from public.oznam_charity where id = p_oznam for update;
  if not found or o.zrusene is not null then raise exception 'Oznam už neplatí.'; end if;
  if coalesce(o.data->>'pozvanie', 'bez') = 'bez' then raise exception 'K tomuto oznamu sa neprihlasuje.'; end if;
  if o.druh <> 'oznam' and o.data->>'datum' is not null and (o.data->>'datum')::date < (now() at time zone 'Europe/Bratislava')::date then
    raise exception 'Oznam už skončil.'; end if;
  if exists (select 1 from public.oznam_ucast where oznam = p_oznam and ucet_id = v_ucet) then
    return (select count(*) from public.oznam_ucast where oznam = p_oznam); end if;
  v_limit := nullif(o.data->>'limit', '')::int;
  select count(*) into v_poc from public.oznam_ucast where oznam = p_oznam;
  if o.data->>'pozvanie' = 'zavazne' and v_limit is not null and v_poc >= v_limit then raise exception 'Prihlasovanie je už plné.'; end if;
  select nullif(trim(concat_ws(' ', p.meno, case when p.priezvisko <> '' then left(p.priezvisko, 1) || '.' end)), '')
    into v_meno from public.profil p where p.ucet_id = v_ucet;
  insert into public.oznam_ucast (oznam, stranka, ucet_id, meno) values (p_oznam, o.stranka, v_ucet, coalesce(v_meno, 'Bez mena'));
  return v_poc + 1;
end $$;
revoke all on function public.oznam_ucast_prihlas(text) from public, anon;
grant execute on function public.oznam_ucast_prihlas(text) to authenticated;

create or replace function public.oznam_ucast_pocty(p_ids text[]) returns table (oznam text, pocet int, moja boolean)
  language sql stable security definer set search_path = public as $$
  select i.id, (select count(*)::int from public.oznam_ucast u where u.oznam = i.id),
         exists (select 1 from public.oznam_ucast u where u.oznam = i.id and u.ucet_id = public.moj_ucet())
  from unnest(p_ids) as i(id)
$$;
revoke all on function public.oznam_ucast_pocty(text[]) from public;
grant execute on function public.oznam_ucast_pocty(text[]) to anon, authenticated;

commit;
