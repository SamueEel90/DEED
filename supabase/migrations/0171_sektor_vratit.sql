-- ============================================================
-- 0171 · Balík 48 bod 523 (Martin 23. 10.) · ukončený sektor sa dá do 15 minút vrátiť (Vrátiť späť)
-- ------------------------------------------------------------
-- Doteraz (0169/0170) sa ukončený sektor neotvoril vôbec (sektor_ukonceny). Teraz: do 15 minút od ukončenia áno,
-- potom nie. Pri vrátení sa jeho zbierka (ak už má dary) vráti na 'aktivna', dary idú znova.
-- Ostatné kontroly 0170 bez zmeny. Idempotentné.
-- ============================================================
begin;

create or replace function public.sektor_stranky_kontrola() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.upravene := now();
  if tg_op = 'UPDATE' then
    if new.stranka <> old.stranka or new.id <> old.id then raise exception 'sektor_nemenny' using errcode = '22023'; end if;
    if old.spusteny is not null and new.spusteny is null then new.spusteny := old.spusteny; end if;
    if old.ukonceny is not null and new.ukonceny is null and old.ukonceny < now() - interval '15 minutes' then
      raise exception 'sektor_ukonceny' using errcode = '22023';
    end if;
  end if;
  if coalesce(current_setting('role', true), '') in ('authenticated', 'anon') then
    if (tg_op = 'INSERT' or new.oblast is distinct from old.oblast) and not public.oblast_sektora_povolena(new.stranka, new.oblast) then
      raise exception 'oblast_mimo_stanov' using errcode = '42501';
    end if;
    if new.spusteny is not null and (tg_op = 'INSERT' or old.spusteny is null) and public.zadarmo_charita(new.stranka) then
      raise exception 'sektor_od_p1' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- ukončenie → zbierka ukončená (0169); vrátenie do 15 minút → zbierka znova aktívna
create or replace function public.sektor_stranky_ukonci_zbierku() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.ukonceny is not null and old.ukonceny is null then
    update public.zbierka set stav = 'ukoncena', upravene = now()
     where id = new.stranka || ':' || new.id and stav = 'aktivna';
  elsif new.ukonceny is null and old.ukonceny is not null then
    update public.zbierka set stav = 'aktivna', upravene = now()
     where id = new.stranka || ':' || new.id and stav = 'ukoncena';
  end if;
  return new;
end $$;

commit;
