-- ============================================================
-- 0187 · Kontrola 24. 10. · oprava 12 — zbierka s termínom skončí po termíne sama (Martin 24. 10.)
-- ------------------------------------------------------------
-- Pravidlo: zbierka s termínom ukončí server; zbierka bez termínu beží, kým ju charita neukončí.
-- Termín zbierky charity sa odvodzuje z toho, čo appka ukladá pri založení (nastavenie): krátkodobá = 30 dní,
-- dlhodobá = 3 / 6 / 12 mesiacov od zapečatenia (spustenia). Centrálna a sektorové zbierky, omše, zbierky farnosti
-- (modul nabozenstvo — ukončuje farár, OPRAVY 348) a zbierky bez uloženého typu sa nedotýkajú.
-- Po ukončení: stav 'ukoncena' (0068 zapíše koniec, začne lehota na dokladovanie), v zbierka_sprava dôvod
-- „Termín zbierky uplynul“, správcom upozornenie (ako pri naplnení cieľa, 0168), reťaze dobra s touto zbierkou v rade
-- sa posunú ďalej (retaz_posun). Beží raz za hodinu (cron). Spúšťa sa po 0186. Idempotentné.
-- ============================================================
begin;

-- plánovaný termín zbierky zo zapečatenia + typu; null = bez termínu
create or replace function public.zbierka_termin(z public.zbierka) returns timestamptz
  language sql stable as $$
  select case
    when z.zapecatena is null or z.stranka is null then null
    when coalesce(z.typ, '') in ('hlavna', 'sektor') or z.id like '%-zv-%' or z.modul = 'nabozenstvo' then null
    when z.nastavenie->>'typ' = 'kratka' then z.zapecatena + interval '30 days'
    when z.nastavenie->>'typ' = 'dlha' and (z.nastavenie->>'mesiace') ~ '^(3|6|12)$' then z.zapecatena + make_interval(months => (z.nastavenie->>'mesiace')::int)
    else null end
$$;
revoke all on function public.zbierka_termin(public.zbierka) from public, anon, authenticated;

create or replace function public.zbierky_po_termine() returns int
  language plpgsql volatile security definer set search_path = public as $$
declare v_z public.zbierka; v_u uuid; v_r text; n int := 0;
begin
  for v_z in select z.* from public.zbierka z
              where z.stav = 'aktivna' and public.zbierka_termin(z) is not null and public.zbierka_termin(z) < now()
              for update skip locked loop
    update public.zbierka set stav = 'ukoncena' where id = v_z.id;
    update public.zbierka_sprava
       set data = data || jsonb_build_object('stav', 'ukoncena', 'ukoncena', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                                             'dovodUkoncenia', 'Termín zbierky uplynul', 'autoUzavreta', true)
     where zbierka = v_z.id and coalesce(data->>'stav', 'aktivna') = 'aktivna';
    for v_u in select public.spravcovia_na_oznam(v_z.stranka) loop
      insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
      values (v_u, 'penazenka', 'eur',
              left('Zbierka ' || v_z.nazov || ' skončila — uplynul jej termín', 200),
              'Dary sa zastavili a beží lehota na dokladovanie. Darcom poďakujte v Správe zbierky.',
              null, exists (select 1 from public.push_odber p where p.ucet_id = v_u));
    end loop;
    -- reťaze dobra, ktoré mali túto zbierku v rade, idú ďalej
    for v_r in select distinct p.retaz from public.retaz_polozka p join public.retaz r on r.id = p.retaz
                where p.zbierka = v_z.id and p.stav in ('bezi', 'caka') and r.ukoncena is null loop
      perform public.retaz_posun(v_r, true);
    end loop;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.zbierky_po_termine() from public, anon, authenticated;
grant execute on function public.zbierky_po_termine() to service_role;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('deed-zbierky-po-termine', '41 * * * *', 'select public.zbierky_po_termine();');
  end if;
end $$;

commit;
