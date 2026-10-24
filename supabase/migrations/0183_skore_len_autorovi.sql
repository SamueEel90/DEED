-- ============================================================
-- 0183 · Kontrola 24. 10. · N8 — AI skóre patrí len behu, ktorý spustil autor skutku
-- ------------------------------------------------------------
-- Doteraz: skore_z_behu (0039) vzalo ktorýkoľvek beh zo scoring_log podľa run_id. Klient mohol k svojmu skutku
-- pripnúť cudzí (lepší) beh — run_id sa dá odchytiť — a server k nemu dopísal skóre, overené a karmu.
-- Teraz: beh platí len keď scoring_log.user_id = autor príspevku (účet) a beh nie je starší ako 24 h.
-- Inak sa score_run_id zahodí (null) → skóre 0, neoverené, bez karmy — a /api/score (zapisSkoreDoPrispevku)
-- k nemu už nič nedopíše, lebo riadok ten run_id nemá. Anonymný / neoverený beh (user_id 'ip:…') sa nikdy nepripne.
-- Spúšťa sa po 0182. Idempotentné.
-- ============================================================
begin;

drop function if exists public.skore_z_behu(uuid);
create or replace function public.skore_z_behu(p_run uuid, p_autor uuid, out skore numeric, out overene boolean, out karma int)
  language sql stable security definer set search_path = public as $$
  select coalesce((l.dopocitane->>'skore')::numeric, 0),
         coalesce((l.dopocitane->>'pasmo')::int, 0) >= 1,
         case when (l.dopocitane->>'skore') is null then null
              else greatest(1, round((l.dopocitane->>'skore')::numeric * 10))::int end
    from public.scoring_log l
   where l.run_id = p_run and l.verdikt = 'ok'
     and p_autor is not null and l.user_id = p_autor::text          -- beh spustil autor skutku
     and l.ts > now() - interval '24 hours'
$$;
revoke all on function public.skore_z_behu(uuid, uuid) from public, anon, authenticated;

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
  -- INSERT: hodnoty len z behu AI autora (scoring_log), inak nula / neoverené a bez behu
  new.skore := 0; new.overene := false; new.karma := null;
  if new.score_run_id is not null then
    select * into r from public.skore_z_behu(new.score_run_id, new.autor_ucet_id);
    if found and r.skore is not null then
      new.skore := r.skore; new.overene := r.overene; new.karma := r.karma;
    else
      new.score_run_id := null;                                       -- cudzí / starý beh sa nepripne
    end if;
  end if;
  return new;
end $$;

commit;
