-- ============================================================
-- 0179 · Kontrola 24. 10. · N4 — človek si sám nenastaví „overený" účet
-- ------------------------------------------------------------
-- Doteraz: stĺpcové práva (0056) a politika upravit (0055) dovolili na vlastnom účte prepísať email_overeny,
-- stav_registracie aj typ. Strážený bol len telefon_overeny (0040). Tým sa obišla podmienka „overený účet"
-- (zaloz_stranku) a dalo sa prepnúť na typ firma / stav 'testovaci' (konam_za_firmu = ktokoľvek).
-- Teraz (len zápisy z appky — anon / authenticated; server a seed bez zmeny):
--   · email_overeny = pravda z Supabase Auth (auth.users.email_confirmed_at pre auth_id), nikdy z klienta
--   · typ smie byť len 'pasivny' alebo 'aktivny' (organizáciu zakladá zaloz_organizaciu / zaloz_stranku)
--   · stav_registracie nesmie byť serverový stav ('testovaci', 'system', 'stranka'); ostatné kroky
--     registrácie ('anonym' → 'udaje' → 'telefon' → … → 'hotovo') ostávajú appke
--   · auth_id sa po založení nemení; system_kluc nikdy
-- „Z appky" = current_user anon / authenticated (priamy zápis cez PostgREST); serverové funkcie (security definer)
-- bežia ako postgres a strážca ich nebrzdí. Spúšťa sa po 0178. Idempotentné.
-- ============================================================
begin;

-- e-mail potvrdený v Auth? (číta auth.users, preto security definer; strážca sám musí bežať ako volajúci)
create or replace function public.email_potvrdeny(p_auth uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select u.email_confirmed_at is not null from auth.users u where u.id = p_auth), false)
$$;
revoke all on function public.email_potvrdeny(uuid) from public;
grant execute on function public.email_potvrdeny(uuid) to anon, authenticated, service_role;

-- strážca beží ako volajúci (NIE security definer), aby current_user prezradil, či píše appka alebo server
create or replace function public.ucet_strazca_identity() returns trigger
  language plpgsql set search_path = public as $$
begin
  -- zápis priamo z appky = current_user je anon / authenticated; serverové funkcie (security definer, vlastník postgres)
  -- ako zaloz_organizaciu, zaloz_stranku, zaisti_ucet sem nespadajú
  if current_user not in ('anon', 'authenticated') then return new; end if;
  -- e-mail overený = potvrdený v Supabase Auth (klient to nenastaví)
  new.email_overeny := public.email_potvrdeny(new.auth_id);
  if new.typ not in ('pasivny', 'aktivny') then
    if tg_op = 'UPDATE' and new.typ = old.typ then null;           -- nemení (účet organizácie upravuje správca — iné stĺpce)
    else raise exception 'Typ účtu nastavuje server.' using errcode = '42501', detail = 'typ_uctu'; end if;
  end if;
  if new.stav_registracie in ('testovaci', 'system', 'stranka') and (tg_op = 'INSERT' or new.stav_registracie is distinct from old.stav_registracie) then
    raise exception 'Tento stav účtu nastavuje server.' using errcode = '42501', detail = 'stav_uctu';
  end if;
  if tg_op = 'UPDATE' and new.auth_id is distinct from old.auth_id and old.auth_id is not null then
    raise exception 'Prihlásenie účtu sa nemení.' using errcode = '42501', detail = 'auth_id';
  end if;
  if new.system_kluc is not null then
    raise exception 'Systémový účet.' using errcode = '42501', detail = 'system_kluc';
  end if;
  return new;
end $$;
revoke all on function public.ucet_strazca_identity() from public;
drop trigger if exists ucet_strazca_identity on public.ucet;
create trigger ucet_strazca_identity before insert or update on public.ucet
  for each row execute function public.ucet_strazca_identity();

commit;
