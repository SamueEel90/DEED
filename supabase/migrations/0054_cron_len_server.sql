-- ============================================================
-- 0054 · Zadanie 4 · 4.2 — cron funkcie zvonka nevolateľné
-- ------------------------------------------------------------
-- platba_batch_close, recurring_tick, badge_auto_unbind, dorovnania_obnov spúšťa len interný
-- scheduler (pg_cron beží ako vlastník) alebo service_role. anon/authenticated ich nezavolajú.
-- recurring_tick: zámok proti súbežnému behu (advisory lock), dobehne VŠETKY zameškané obdobia
-- (každé obdobie = vlastný idempotentný kľúč) a pred platbou overí, že zbierka ešte beží.
-- ============================================================
begin;

create or replace function public.recurring_tick() returns int
language plpgsql security definer set search_path = public, extensions as $fn$
declare r public.opakovana_platba; n int := 0; v_kanal text; v_int interval; v_kolo int;
begin
  -- jeden beh naraz; druhý súbežný sa hneď vráti (nič nespraví dvakrát)
  if not pg_try_advisory_xact_lock(hashtext('deed.recurring_tick')) then return 0; end if;
  for r in select * from public.opakovana_platba
            where stav = 'aktivny' and dalsia_platba is not null and dalsia_platba <= now()
            order by dalsia_platba
            for update skip locked loop
    v_kanal := case when r.mena = 'DEED' then 'deed' else 'sepa' end;
    v_int := case r.perioda when 'tyzdenne' then interval '7 days' when 'rocne' then interval '1 year' else interval '1 month' end;
    -- zbierka už nebeží → podpora sa zastaví, nič sa nestrhne
    if r.viazane_na_zbierku and r.case_id is not null
       and coalesce((select p.ukoncene from public.prispevok p where p.id = r.case_id), true) then
      update public.opakovana_platba set stav = 'ukonceny' where id = r.id;
      insert into public.notifikacia (ucet_id, kat, titul, text)
        values (r.darca, 'penazenka', 'Zbierka skončila', 'Tvoja pravidelná podpora sa zastavila — vyber si inú zbierku.');
      continue;
    end if;
    -- dobehni všetky zameškané obdobia (poistka 60 kôl)
    v_kolo := 0;
    while r.dalsia_platba <= now() and v_kolo < 60 loop
      v_kolo := v_kolo + 1;
      begin
        perform public.platba_zapis(
          'rec:' || r.id::text || ':' || extract(epoch from r.dalsia_platba)::bigint::text,
          r.suma, r.mena, v_kanal, r.case_id, r.darca, null,
          case when r.rozsah <> 'request' then r.charita_ucet else null end,
          null, false, 0, jsonb_build_object('recurring', r.id, 'rozsah', r.rozsah, 'obdobie', r.dalsia_platba));
        n := n + 1;
      exception when others then
        insert into public.notifikacia (ucet_id, kat, titul, text)
          values (r.darca, 'penazenka', 'Pravidelná podpora neprešla', 'Tento raz sa platba nezapísala: ' || sqlerrm);
      end;
      r.dalsia_platba := r.dalsia_platba + v_int;
    end loop;
    update public.opakovana_platba set dalsia_platba = r.dalsia_platba where id = r.id;
  end loop;
  return n;
end $fn$;

revoke all on function public.platba_batch_close(timestamptz), public.recurring_tick(), public.badge_auto_unbind(), public.dorovnania_obnov()
  from public, anon, authenticated;
grant execute on function public.platba_batch_close(timestamptz), public.recurring_tick(), public.badge_auto_unbind(), public.dorovnania_obnov()
  to service_role;

commit;
