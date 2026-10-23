-- ============================================================
-- 0161 · OPRAVY 510 (balík 46) · Ateliér stránky v charite: Zverejniť vzhľad „V noci o 2:00“ prepína server.
-- Koncept charity je v nastavenia_stranky.data → 'atelierCharita' = {vzhlad, zmenene, naplanovane}.
-- atelier_prepni() (0153, cron každých 10 min) robí ďalej to isté pre farnosť a navyše:
--   koncept charity s naplanovane <= now() zapíše do profil_stranky.vzhlad (kronika · vyklad · pirat),
--   doterajší vzhľad odloží do data → 'atelierCharitaSpat' (Vrátiť späť ešte 7 dní) a koncept zmaže.
-- Spúšťa sa po 0160.
-- ============================================================
begin;

create or replace function public.atelier_prepni() returns integer
  language plpgsql security definer set search_path = public as $$
declare v_n integer; v_c integer;
begin
  -- farnosť (telo ako 0153)
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

  -- charita: najprv vzhľad naostro (starý sa odloží), potom koncept preč
  with k as (
    select n.stranka, n.data->'atelierCharita'->>'vzhlad' as vzhlad, p.vzhlad as stary
      from public.nastavenia_stranky n
      left join public.profil_stranky p on p.stranka = n.stranka
     where jsonb_typeof(n.data->'atelierCharita') = 'object'
       and n.data->'atelierCharita'->>'naplanovane' is not null
       and (n.data->'atelierCharita'->>'naplanovane')::timestamptz <= now()
       and n.data->'atelierCharita'->>'vzhlad' in ('kronika', 'vyklad', 'pirat')
  ), z as (
    insert into public.profil_stranky (stranka, vzhlad)
    select stranka, vzhlad from k
    on conflict (stranka) do update set vzhlad = excluded.vzhlad
    returning stranka
  )
  update public.nastavenia_stranky n set
    data = (n.data - 'atelierCharita') || jsonb_build_object('atelierCharitaSpat', jsonb_build_object(
      'vzhlad', coalesce(k.stary, 'kronika'), 'do', to_jsonb(now() + interval '7 days'))),
    upravene = now()
  from k where k.stranka = n.stranka and k.stranka in (select stranka from z);
  get diagnostics v_c = row_count;
  return v_n + v_c;
end $$;
revoke all on function public.atelier_prepni() from public, anon, authenticated;
grant execute on function public.atelier_prepni() to service_role;

commit;
