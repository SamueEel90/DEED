-- ============================================================
-- 0184 · Kontrola 24. 10. · N10 — vyzbierané na zbierku sa nepočíta z celého ledgera pri každom dotaze
-- ------------------------------------------------------------
-- Doteraz: v_vyzbierane (0037) pri každom čítaní zoskupila všetky pohyby pre_zbierku a ku každému hľadala storno
-- (exists). S rastom ledgera rastie čas každého zobrazenia zbierky, počítadla a vratenia.
-- Teraz: tabuľka zbierka_sucet (jeden riadok na prípad) — plní ju spúšťač na pohyb pri každom novom pohybe
-- pre_zbierku alebo storne takého pohybu, prepočtom LEN toho jedného prípadu (rovnaký výpočet 1 : 1 ako 0037),
-- a po výmaze testovacích pohybov (zmaz_testovacie, 0157). v_vyzbierane číta z tabuľky — rovnaké stĺpce,
-- rovnaké hodnoty. Pohyb je nemenný (0037), iný dôvod na zmenu súčtu nie je.
-- v_zbierka_vyzbierane (0096, súčty podľa platba.zbierka vrátane skončených omší a reťaze) sa nemení —
-- závisí od času (okno omše) a od retaz_platba, spúšťač na pohyb by ju neudržal správnu.
-- Spúšťa sa po 0183. Idempotentné.
-- ============================================================
begin;

create table if not exists public.zbierka_sucet (
  case_id          uuid primary key references public.prispevok(id) on delete cascade,
  vyzbierane_eur   numeric(14,2) not null default 0,
  vyzbierane_deed  numeric(14,4) not null default 0,
  pocet_darov      bigint not null default 0,
  prepocitane      timestamptz not null default now()
);
comment on table public.zbierka_sucet is 'Vyzbierané na prípad (zbierku) — súčet z ledgera udržiavaný spúšťačom na pohyb (0184). Nepíše sa ručne.';
alter table public.zbierka_sucet enable row level security;
drop policy if exists citanie on public.zbierka_sucet;
create policy citanie on public.zbierka_sucet for select to anon, authenticated using (true);
grant select on public.zbierka_sucet to anon, authenticated;

-- prepočet jedného prípadu — výpočet 1 : 1 z v_vyzbierane (0037)
create or replace function public.zbierka_sucet_prepocitaj(p_case uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if p_case is null then return; end if;
  insert into public.zbierka_sucet (case_id, vyzbierane_eur, vyzbierane_deed, pocet_darov, prepocitane)
  select p_case,
         round(coalesce(sum(x.s) filter (where x.mena = 'EUR'), 0), 2),
         round(coalesce(sum(x.s) filter (where x.mena = 'DEED'), 0), 4),
         count(distinct x.doklad) filter (where x.storno_pre is null and not x.stornovany),
         now()
    from (
      select p.mena, p.doklad, p.storno_pre,
             case when p.storno_pre is null then p.suma else -p.suma end as s,
             exists (select 1 from public.pohyb r where r.storno_pre = p.id) as stornovany
        from public.pohyb p
       where p.pre_zbierku and p.case_id = p_case
    ) x
  on conflict (case_id) do update
    set vyzbierane_eur = excluded.vyzbierane_eur, vyzbierane_deed = excluded.vyzbierane_deed,
        pocet_darov = excluded.pocet_darov, prepocitane = excluded.prepocitane;
  -- prípad bez pohybov pre_zbierku (po výmaze testovacích) = žiadny riadok, ako doteraz v pohľade
  delete from public.zbierka_sucet z where z.case_id = p_case
     and not exists (select 1 from public.pohyb p where p.pre_zbierku and p.case_id = p_case);
end $$;
revoke all on function public.zbierka_sucet_prepocitaj(uuid) from public, anon, authenticated;

create or replace function public.pohyb_zbierka_sucet() returns trigger
  language plpgsql security definer set search_path = public as $$
declare r public.pohyb := coalesce(new, old); v_storno_case uuid;
begin
  if r.pre_zbierku then perform public.zbierka_sucet_prepocitaj(r.case_id); end if;
  if r.storno_pre is not null then
    select p.case_id into v_storno_case from public.pohyb p where p.id = r.storno_pre and p.pre_zbierku;
    if v_storno_case is not null and v_storno_case is distinct from r.case_id then
      perform public.zbierka_sucet_prepocitaj(v_storno_case);
    end if;
  end if;
  return null;
end $$;
drop trigger if exists pohyb_zbierka_sucet on public.pohyb;
create trigger pohyb_zbierka_sucet after insert or delete on public.pohyb
  for each row execute function public.pohyb_zbierka_sucet();

-- prvé naplnenie z ledgera
insert into public.zbierka_sucet (case_id, vyzbierane_eur, vyzbierane_deed, pocet_darov)
  select x.case_id,
         round(coalesce(sum(x.s) filter (where x.mena = 'EUR'), 0), 2),
         round(coalesce(sum(x.s) filter (where x.mena = 'DEED'), 0), 4),
         count(distinct x.doklad) filter (where x.storno_pre is null and not x.stornovany)
    from (
      select p.case_id, p.mena, p.doklad, p.storno_pre,
             case when p.storno_pre is null then p.suma else -p.suma end as s,
             exists (select 1 from public.pohyb r where r.storno_pre = p.id) as stornovany
        from public.pohyb p
       where p.pre_zbierku
    ) x
   group by x.case_id
on conflict (case_id) do update
  set vyzbierane_eur = excluded.vyzbierane_eur, vyzbierane_deed = excluded.vyzbierane_deed,
      pocet_darov = excluded.pocet_darov, prepocitane = now();

-- pohľad ostáva (rovnaké meno aj stĺpce), číta z tabuľky
create or replace view public.v_vyzbierane as
  select z.case_id, z.vyzbierane_eur::numeric as vyzbierane_eur, z.vyzbierane_deed::numeric as vyzbierane_deed, z.pocet_darov
    from public.zbierka_sucet z;   -- typy stĺpcov 1 : 1 ako 0037 (create or replace view)
comment on view public.v_vyzbierane is 'Vyzbierané per mena z ledgera (nikdy jeden súčet EUR+DEED) — od 0184 z tabuľky zbierka_sucet, ktorú plní spúšťač na pohyb.';
grant select on public.v_vyzbierane to anon, authenticated;

commit;
