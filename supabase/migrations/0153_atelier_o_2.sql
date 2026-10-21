-- ============================================================
-- 0153 · OPRAVY 469 · Ateliér stránky: Zverejniť „V noci o 2:00“ prepína server.
-- Koncept je v nastavenia_stranky.data → 'atelier' = {rozlozenie, usporiadanie, zmenene, naplanovane}.
-- atelier_prepni(): každý koncept s naplanovane <= now() zapíše do verejne (rozlozenie, usporiadanie),
--   starý vzhľad odloží do data → 'atelierSpat' (Vrátiť späť ešte 7 dní) a koncept zmaže. Volá ho len cron (service_role).
-- sledujuci_stranky(stránka): koľko ľudí stránku sleduje (farnosť alebo niektorý jej kostol) — len správca.
-- Cron „deed-atelier“ každých 10 minút (naplanovane je najbližšia 2:00 miestneho času, zapisuje ju appka).
-- Spúšťa sa po 0152.
-- ============================================================
begin;

create or replace function public.atelier_prepni() returns integer
  language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  -- v UPDATE sa pravé strany čítajú zo starého riadku → atelierSpat dostane doterajší vzhľad
  update public.nastavenia_stranky n set
    verejne = coalesce(n.verejne, '{}'::jsonb)
      || jsonb_build_object('rozlozenie', n.data->'atelier'->'rozlozenie', 'usporiadanie', n.data->'atelier'->'usporiadanie'),
    data = (n.data - 'atelier') || jsonb_build_object('atelierSpat', jsonb_build_object(
      'rozlozenie', coalesce(n.verejne->'rozlozenie', '"nastenka"'::jsonb), 'usporiadanie', n.verejne->'usporiadanie',
      'do', to_jsonb(now() + interval '7 days'))),
    upravene = now()
  where jsonb_typeof(n.data->'atelier') = 'object'
    and n.data->'atelier'->>'naplanovane' is not null
    and (n.data->'atelier'->>'naplanovane')::timestamptz <= now()
    and n.data->'atelier'->>'rozlozenie' in ('nastenka', 'kronika', 'moderne', 'konzervativny');
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.atelier_prepni() from public, anon, authenticated;
grant execute on function public.atelier_prepni() to service_role;

create or replace function public.sledujuci_stranky(p_stranka text) returns bigint
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  return (select count(*) from (
    select ucet_id from public.moje_farnosti where stranka = p_stranka
    union
    select ucet_id from public.moje_kostoly where stranka = p_stranka) x);
end $$;
revoke all on function public.sledujuci_stranky(text) from public, anon;
grant execute on function public.sledujuci_stranky(text) to authenticated, service_role;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('deed-atelier', '*/10 * * * *', 'select public.atelier_prepni();');
  end if;
end $$;

commit;
