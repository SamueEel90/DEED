-- ============================================================
-- 0175 · OPRAVY 537 (balík 51) — správa po ukončení súkromnej zbierky (pohrebná / svadobná / jubilejná a iné)
-- ------------------------------------------------------------
-- Deň po ukončení o 11:00 (Europe/Bratislava) dostane vlastník zbierky (príjemca, zbierka_podiel.druh = 'prijemca')
-- jedno upozornenie: „Zbierka je ukončená · Ďakujeme, že ste ju zverili DEED+.“ Ťuk otvorí správu v appke
-- (odkaz kon:<druh>:<zbierka>). Posiela len server (cron každých 10 min), len raz (tabuľka zbierka_sprava_ukoncenia).
-- Okno je 24 h od 11:00 nasledujúceho dňa: staršie ukončené zbierky (pred touto migráciou) správu nedostanú.
-- Ak sa zbierka do 15 min vráti späť (obnov_zbierku), koniec je null a nič sa nepošle.
-- ============================================================
begin;

create table if not exists public.zbierka_sprava_ukoncenia (
  zbierka  text primary key references public.zbierka(id) on delete cascade,
  ucet_id  uuid not null references public.ucet(id) on delete cascade,
  poslane  timestamptz not null default now()
);
alter table public.zbierka_sprava_ukoncenia enable row level security; -- bez politík: len server
revoke all on public.zbierka_sprava_ukoncenia from anon, authenticated;

-- kedy sa má správa poslať: deň po ukončení o 11:00 miestneho času
create or replace function public.sprava_ukoncenia_cas(p_koniec timestamptz) returns timestamptz
  language sql immutable set search_path = public as $$
  select (((p_koniec at time zone 'Europe/Bratislava')::date + 1) + time '11:00') at time zone 'Europe/Bratislava'
$$;

create or replace function public.sprava_po_ukonceni_tick() returns int
  language plpgsql volatile security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select z.id, z.nastavenie->'farnost'->>'druh' as druh, p.ucet as ucet
      from public.zbierka z
      join public.zbierka_podiel p on p.zbierka = z.id and p.druh = 'prijemca'
     where z.stav <> 'aktivna' and z.koniec is not null
       and coalesce(z.nastavenie->'farnost'->>'druh', '') in ('pohreb', 'svadba', 'ine')
       and p.ucet is not null
       and now() >= public.sprava_ukoncenia_cas(z.koniec)
       and now() <  public.sprava_ukoncenia_cas(z.koniec) + interval '24 hours'
       and not exists (select 1 from public.zbierka_sprava_ukoncenia s where s.zbierka = z.id)
  loop
    insert into public.zbierka_sprava_ukoncenia (zbierka, ucet_id) values (r.id, r.ucet) on conflict do nothing;
    if found then
      insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
      values (r.ucet, 'deed', 'srd', 'Zbierka je ukončená', 'Ďakujeme, že ste ju zverili DEED+.',
              'kon:' || r.druh || ':' || r.id,
              exists (select 1 from public.push_odber o where o.ucet_id = r.ucet));
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.sprava_po_ukonceni_tick() from public, anon, authenticated;
grant execute on function public.sprava_po_ukonceni_tick() to service_role;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('deed-sprava-ukoncenia', '*/10 * * * *', 'select public.sprava_po_ukonceni_tick();');
  end if;
end $$;

commit;
