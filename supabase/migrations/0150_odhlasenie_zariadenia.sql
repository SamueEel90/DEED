-- ============================================================
-- 0150 · OPRAVY 466 doplnok · „Odhlásiť“ v Prihlásených zariadeniach naozaj odhlási (Martin 21. 10.)
-- ------------------------------------------------------------
-- zariadenie_uctu.relacia = id prihlásenia (auth.sessions.id, claim session_id), zapisuje ho samo zariadenie.
-- zariadenie_odhlas(device): len vlastné zariadenie, nie to, z ktorého sa odhlasuje; zmaže riadok aj prihlásenie
--   (auth.sessions → jeho obnovovacie tokeny); zariadenie sa odhlási najneskôr pri ďalšej kontrole (appka sa pýta
--   každú minútu a pri návrate do okna), inak keď mu vyprší prístupový token.
-- zariadenie_odhlas_ostatne(): všetky okrem tohto.
-- ============================================================
begin;

alter table public.zariadenie_uctu add column if not exists relacia uuid;

create or replace function public.moja_relacia() returns uuid
  language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'session_id', '')::uuid
$$;

create or replace function public.zariadenie_odhlas(p_device text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare v uuid := public.moj_ucet(); r public.zariadenie_uctu;
begin
  if v is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  select * into r from public.zariadenie_uctu where ucet_id = v and device_id = p_device;
  if r.device_id is null then return false; end if;
  if r.relacia is not null and r.relacia = public.moja_relacia() then
    raise exception 'Toto zariadenie odhlásite tlačidlom Odhlásiť sa.' using errcode = '22023', detail = 'toto';
  end if;
  delete from public.zariadenie_uctu where ucet_id = v and device_id = p_device;
  -- bez práva na auth.sessions to nespadne: zariadenie sa odhlási samo, keď zistí, že jeho riadok zmizol
  if r.relacia is not null and to_regclass('auth.sessions') is not null then
    begin execute 'delete from auth.sessions where id = $1 and user_id = $2' using r.relacia, auth.uid();
    exception when insufficient_privilege then null; end;
  end if;
  return true;
end $$;
revoke all on function public.zariadenie_odhlas(text) from public, anon;
grant execute on function public.zariadenie_odhlas(text) to authenticated, service_role;

create or replace function public.zariadenie_odhlas_ostatne() returns int
  language plpgsql volatile security definer set search_path = public as $$
declare v uuid := public.moj_ucet(); ja uuid := public.moja_relacia(); n int;
begin
  if v is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  delete from public.zariadenie_uctu where ucet_id = v and relacia is distinct from ja;
  get diagnostics n = row_count;
  if to_regclass('auth.sessions') is not null then
    begin execute 'delete from auth.sessions where user_id = $1 and id is distinct from $2' using auth.uid(), ja;
    exception when insufficient_privilege then null; end;
  end if;
  return n;
end $$;
revoke all on function public.zariadenie_odhlas_ostatne() from public, anon;
grant execute on function public.zariadenie_odhlas_ostatne() to authenticated, service_role;

commit;
