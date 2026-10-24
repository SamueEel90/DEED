-- ============================================================
-- 0182 · Kontrola 24. 10. · N7 — meno autora, odznak a prednosť vo feede neurčuje klient
-- ------------------------------------------------------------
-- Doteraz: appka pri založení príspevku sama zapísala autor_nazov, autor_ini, autor_karma (odznak „Legend"),
-- topovane, narodne, typ_situacie 'kriza' a vyznam. Trigger 0039 strážil len skóre a karmu skutku. Dalo sa
-- vydávať za niekoho iného a posúvať sa vo feede.
-- Teraz (len priame zápisy z appky — anon / authenticated; serverové funkcie bez zmeny):
--   · autor_nazov = meno účtu zo servera (osoba: profil + voľba zobrazenia ako profil_osoby 0143; organizácia:
--     názov jej stránky / organizácie); autor_ini = jeho iniciála. Bez mena (neregistrovaný, zobrazenie „anonym“)
--     sa príspevok nezaloží — Martin 24. 10.: kto chce do feedu zbierku či skutok, nemôže byť anonymný; anonymne sa dá len darovať.
--   · autor_karma, topovane, vyznam = len server (klient: null / false)
--   · typ_situacie = 'normal' (krízový režim zapína server)
--   · narodne smie klient nastaviť len pre príspevok bez polohy (online) — ako to robí appka pri Aktivitách
--   · pri úprave sa tieto stĺpce nemenia (ostanú staré)
-- Spúšťa sa po 0181. Idempotentné.
-- ============================================================
begin;

-- meno účtu na zobrazenie (pravidlo 1 : 1 ako profil_osoby, 0143)
create or replace function public.meno_uctu(p_ucet uuid) returns text
  language sql stable security definer set search_path = public as $$
  select case
    when u.typ in ('charita', 'firma') then
      coalesce((select s.nazov from public.stranka s where s.ucet_id = u.id order by s.vytvorene limit 1),
               (select o.nazov from public.organizacia o where o.ucet_id = u.id))
    else
      case coalesce(z.rezim, 'anonym')
        when 'cele' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(p.priezvisko, '')), '')
        when 'mesto' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(p.priezvisko, '')), '')
        when 'iniciala' then nullif(trim(coalesce(p.meno, '') || ' ' || coalesce(left(p.priezvisko, 1) || '.', '')), '')
        when 'nick' then nullif(trim(z.nick), '')
        else null end
    end
    from public.ucet u
    left join public.profil p on p.ucet_id = u.id
    left join public.zobrazenie z on z.ucet_id = u.id
   where u.id = p_ucet
$$;
revoke all on function public.meno_uctu(uuid) from public;
grant execute on function public.meno_uctu(uuid) to anon, authenticated, service_role;

-- strážca beží ako volajúci (NIE security definer): current_user prezradí priamy zápis z appky
create or replace function public.prispevok_autor_servera() returns trigger
  language plpgsql set search_path = public as $$
declare v_meno text;
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'UPDATE' then
    new.autor_nazov := old.autor_nazov; new.autor_ini := old.autor_ini; new.autor_karma := old.autor_karma;
    new.topovane := old.topovane; new.vyznam := old.vyznam; new.typ_situacie := old.typ_situacie;
    new.narodne := old.narodne;
    return new;
  end if;
  v_meno := public.meno_uctu(new.autor_ucet_id);
  if v_meno is null then
    raise exception 'Príspevok nemôže byť anonymný — nastavte si v profile zobrazenie mena. Anonymne sa dá len darovať.'
      using errcode = '42501', detail = 'anonymny_autor';
  end if;
  new.autor_nazov := v_meno;
  new.autor_ini := upper(left(coalesce(v_meno, ''), 1));
  new.autor_karma := null;
  new.topovane := false;
  new.vyznam := null;
  new.typ_situacie := 'normal';
  if new.lat is not null or new.lng is not null then new.narodne := false; end if;
  return new;
end $$;
revoke all on function public.prispevok_autor_servera() from public;
drop trigger if exists prispevok_autor_servera on public.prispevok;
drop trigger if exists prispevok_zz_autor_servera on public.prispevok;
-- spúšťače bežia podľa mena: „zz" = až po prispevok_autor_zo_session (0055, dopĺňa autor_ucet_id zo session)
create trigger prispevok_zz_autor_servera before insert or update on public.prispevok
  for each row execute function public.prispevok_autor_servera();

commit;
