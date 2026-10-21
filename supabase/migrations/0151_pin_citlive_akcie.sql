-- ============================================================
-- 0151 · OPRAVY 466 doplnok 3 · PIN na citlivé akcie v mobile (Peňaženka, platba nad hranicu, Správa)
-- ------------------------------------------------------------
-- PIN je už v ucet.pin_hash (bcrypt, 0056) a over_pin ho overuje (5 zlých pokusov = 15 minút čakania).
-- Nové: mam_pin() · zmen_pin(nový, starý):
--   · keď PIN už je, treba zadať starý (zlodej s odomknutým telefónom ho nezmení)
--   · prvý PIN (účet ho ešte nemá) len do 10 minút po prihlásení heslom — inak by si ho nastavil zlodej
--   · zabudnutý PIN: odhlásiť sa a prihlásiť heslom — do 10 minút po prihlásení heslom ide nový PIN bez starého
--     (čas prihlásenia z tokenu: claim amr[].timestamp)
-- ============================================================
begin;

create or replace function public.mam_pin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select pin_hash is not null from public.ucet where id = public.moj_ucet()), false)
$$;
revoke all on function public.mam_pin() from public, anon;
grant execute on function public.mam_pin() to authenticated, service_role;

/** kedy sa prihlásil heslom (alebo odkazom) — z tokenu; bez údaja null */
create or replace function public.prihlaseny_od() returns timestamptz
  language sql stable as $$
  select to_timestamp(max((a->>'timestamp')::bigint))
    from jsonb_array_elements(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'amr', '[]'::jsonb)) a
   where a->>'method' in ('password', 'otp', 'magiclink', 'email')
$$;

create or replace function public.zmen_pin(p_novy text, p_stary text default null) returns boolean
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.ja_prihlaseny(); v_hash text; v_od timestamptz := public.prihlaseny_od();
begin
  if p_novy is null or p_novy !~ '^\d{4,6}$' then
    raise exception 'PIN má 4 až 6 číslic.' using errcode = '22023', detail = 'pin_dlzka';
  end if;
  select pin_hash into v_hash from public.ucet where id = v_ja;
  if v_hash is null and not (v_od is not null and v_od > now() - interval '10 minutes') then
    raise exception 'PIN si nastavíte do 10 minút po prihlásení heslom.' using errcode = '42501', detail = 'treba_prihlasenie';
  end if;
  if v_hash is not null and not (v_od is not null and v_od > now() - interval '10 minutes') then
    if p_stary is null then raise exception 'Zadajte súčasný PIN.' using errcode = '22023', detail = 'treba_stary'; end if;
    if not public.over_pin(p_stary) then raise exception 'Súčasný PIN nesedí.' using errcode = '22023', detail = 'zly_stary'; end if;
  end if;
  update public.ucet set pin_hash = crypt(p_novy, gen_salt('bf', 10)), aktualizovane = now() where id = v_ja;
  return true;
end $$;
revoke all on function public.zmen_pin(text, text) from public, anon;
grant execute on function public.zmen_pin(text, text) to authenticated, service_role;

commit;
