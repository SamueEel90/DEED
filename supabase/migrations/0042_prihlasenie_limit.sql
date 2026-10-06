-- ============================================================
-- 0042 · Zadanie 3 · 3.5 — limit prihlásení počíta server, nie prehliadač
-- ------------------------------------------------------------
-- 5 zlých hesiel → účet sa 15 minút neprihlási (ani správnym heslom). Drží to Supabase Auth hook
-- „Password Verification Attempt" nad touto funkciou — platí aj po vymazaní localStorage,
-- na inom zariadení aj pri volaní API mimo appky. Appka len zobrazí hlášku zo servera.
-- SAMUEL: Dashboard → Authentication → Hooks → Password Verification Attempt →
--   Postgres function public.hook_password_verification_attempt (zapnúť).
-- ============================================================
begin;

create table if not exists public.prihlasenie_pokusy (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  zle          int not null default 0,
  zamknute_do  timestamptz
);
alter table public.prihlasenie_pokusy enable row level security;    -- bez politík: klient nevidí ani nepíše

create or replace function public.hook_password_verification_attempt(event jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := (event->>'user_id')::uuid; v_ok boolean := coalesce((event->>'valid')::boolean, false); r public.prihlasenie_pokusy;
begin
  select * into r from public.prihlasenie_pokusy where user_id = v_user for update;
  if found and r.zamknute_do > now() then
    return jsonb_build_object('decision', 'reject',
      'message', 'Priveľa pokusov. Skús to o ' || ceil(extract(epoch from (r.zamknute_do - now())) / 60)::int || ' minút.',
      'should_logout_user', false);
  end if;
  if v_ok then
    delete from public.prihlasenie_pokusy where user_id = v_user;
    return jsonb_build_object('decision', 'continue');
  end if;
  insert into public.prihlasenie_pokusy as p (user_id, zle) values (v_user, 1)
    on conflict (user_id) do update set zle = p.zle + 1, zamknute_do = null;
  update public.prihlasenie_pokusy set zle = 0, zamknute_do = now() + interval '15 minutes'
   where user_id = v_user and zle >= 5;
  return jsonb_build_object('decision', 'continue');      -- zlé heslo aj tak vráti „nesprávne údaje"
end $$;

revoke all on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin';
    execute 'grant all on table public.prihlasenie_pokusy to supabase_auth_admin';
  end if;
end $$;

commit;
