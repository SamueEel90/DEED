-- ============================================================
-- DEED · Odznak (shift-binding) + Reťaz dobra (chain QR)   [Fáza 5]
-- ------------------------------------------------------------
-- ODZNAK: statický fyzický QR patrí FIRME. „Komu ide pochvala/dar" je dynamický
--   server-stav: badge → aktuálne prihlásený zamestnanec (shift-binding). Pri null
--   → pobočka (default). Firma vidí AGREGÁT pochvál (počty), NIE sumy (k-anonymita).
-- REŤAZ: QR nesie skutok + % (ZAFIXOVANÉ pri vzniku) + cieľ. Split cez platba_split.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- krátky slug generátor (server-side)
create or replace function public.gen_slug() returns text
language sql volatile as $fn$
  select lower(substr(replace(replace(encode(gen_random_bytes(8),'base64'),'/',''),'+',''),1,10));
$fn$;

-- ---------- ODZNAK (patrí firme) ----------
create table public.odznak (
  id          uuid primary key default gen_random_uuid(),
  org_ucet_id uuid references public.ucet(id) on delete cascade,
  pobocka_id  bigint references public.pobocka(id) on delete set null,
  nazov       text,
  slug        text unique,
  vytvorene   timestamptz not null default now()
);

-- ---------- BADGE BIND (aktuálna zmena — kto je prihlásený) ----------
create table public.badge_bind (
  badge_id    uuid primary key references public.odznak(id) on delete cascade,
  employee_id uuid references public.ucet(id) on delete set null,  -- NULL = nikto na zmene
  shift_start timestamptz,
  shift_end   timestamptz,
  auto_unbind timestamptz                                          -- bind + X h (default koniec dňa)
);
create index on public.badge_bind (employee_id) where employee_id is not null;

-- ---------- POCHVALA (log — agregát počítadla, NIE sumy pre firmu) ----------
create table public.pochvala (
  id            bigint generated always as identity primary key,
  badge_id      uuid references public.odznak(id) on delete cascade,
  employee_id   uuid references public.ucet(id) on delete set null,  -- komu (NULL = pobočka)
  zakaznik_ucet uuid references public.ucet(id) on delete set null,
  suma          numeric(14,4),                                       -- ak dar; NULL = len pochvala
  cas           timestamptz not null default now()
);
create index on public.pochvala (badge_id);
create index on public.pochvala (employee_id);

-- ---------- REŤAZEC QR (Reťaz dobra) ----------
create table public.retazec_qr (
  chain_id    uuid primary key default gen_random_uuid(),
  case_id     uuid references public.prispevok(id) on delete set null,  -- skutok/honorár (zdroj)
  darca       uuid references public.ucet(id) on delete set null,
  postup_pct  numeric(5,2) not null,                                    -- % ZAFIXOVANÉ pri vzniku
  ciel_text   text,                                                     -- cieľová žiadosť (denormalizovaná)
  suma_zaklad numeric(14,4),
  mena        text not null default 'DEED' check (mena in ('DEED','EUR')),
  slug        text unique,
  vytvorene   timestamptz not null default now()
);

-- ============================================================
-- ODZNAK RPC — create / bind / unbind / scan / aggregate
-- ============================================================
create or replace function public.badge_create(p_org uuid, p_pobocka bigint default null, p_nazov text default null)
returns public.odznak
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_slug text; v_row public.odznak;
begin
  v_slug := public.gen_slug();
  insert into public.odznak (org_ucet_id, pobocka_id, nazov, slug)
    values (p_org, p_pobocka, p_nazov, v_slug) returning * into v_row;
  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','badge', v_row.id::text, v_slug, 'https://deed.good/badge/'||v_slug, 'b2b')
    on conflict (objekt_druh, objekt_ref) do nothing;
  return v_row;
end;
$fn$;
grant execute on function public.badge_create(uuid,bigint,text) to anon, authenticated;

-- zamestnanec sa prihlási na zmenu (naskenuje odznak „toto som ja")
create or replace function public.badge_bind(p_badge uuid, p_employee uuid, p_hodiny int default 12)
returns public.badge_bind
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_row public.badge_bind;
begin
  insert into public.badge_bind (badge_id, employee_id, shift_start, shift_end, auto_unbind)
    values (p_badge, p_employee, now(), null, now() + make_interval(hours => greatest(coalesce(p_hodiny,12),1)))
    on conflict (badge_id) do update
      set employee_id = excluded.employee_id, shift_start = excluded.shift_start,
          shift_end = null, auto_unbind = excluded.auto_unbind
    returning * into v_row;
  return v_row;
end;
$fn$;
grant execute on function public.badge_bind(uuid,uuid,int) to anon, authenticated;

-- zamestnanec sa odhlási (koniec zmeny)
create or replace function public.badge_unbind(p_badge uuid)
returns void
language plpgsql security definer set search_path = public, extensions as $fn$
begin
  update public.badge_bind set employee_id = null, shift_end = now() where badge_id = p_badge;
end;
$fn$;
grant execute on function public.badge_unbind(uuid) to anon, authenticated;

-- zákazník naskenuje odznak → pochvala/dar aktuálne prihlásenému (NULL → pobočka)
create or replace function public.badge_scan(p_badge uuid, p_zakaznik uuid default null, p_suma numeric default 0)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_emp uuid; v_org uuid; v_pob bigint; v_prijemca text;
begin
  -- aktuálny zamestnanec (ak je a binding nevypršal)
  select employee_id into v_emp from public.badge_bind
    where badge_id = p_badge and employee_id is not null and (auto_unbind is null or auto_unbind > now());
  select org_ucet_id, pobocka_id into v_org, v_pob from public.odznak where id = p_badge;

  if v_emp is not null then
    v_prijemca := 'employee';
    insert into public.pochvala (badge_id, employee_id, zakaznik_ucet, suma)
      values (p_badge, v_emp, p_zakaznik, nullif(p_suma,0));
    if coalesce(p_suma,0) > 0 then
      perform public.platba_create('badge:'||p_badge::text||':'||gen_random_uuid()::text,
        p_suma, 'DEED','deed', null, p_zakaznik, null, v_emp, null, false, 0,
        jsonb_build_object('badge', p_badge));
    end if;
  else
    v_prijemca := 'pobocka';   -- NULL na zmene → pobočka (default — dar sa nestratí)
    insert into public.pochvala (badge_id, employee_id, zakaznik_ucet, suma)
      values (p_badge, null, p_zakaznik, nullif(p_suma,0));
    if coalesce(p_suma,0) > 0 and v_org is not null then
      perform public.platba_create('badge:'||p_badge::text||':'||gen_random_uuid()::text,
        p_suma, 'DEED','deed', null, p_zakaznik, null, v_org, 'Pobočka', false, 0,
        jsonb_build_object('badge', p_badge, 'pobocka', v_pob));
    end if;
  end if;
  return jsonb_build_object('prijemca', v_prijemca, 'employee', v_emp);
end;
$fn$;
grant execute on function public.badge_scan(uuid,uuid,numeric) to anon, authenticated;

-- agregát pochvál pre firmu: POČTY na zamestnanca (NIE sumy — transparentnosť/k-anonymita)
create or replace function public.badge_aggregate(p_org uuid)
returns table(employee_id uuid, pochval bigint)
language sql security definer set search_path = public, extensions as $fn$
  select p.employee_id, count(*) as pochval
    from public.pochvala p
    join public.odznak o on o.id = p.badge_id
   where o.org_ucet_id = p_org and p.employee_id is not null
   group by p.employee_id
   order by pochval desc;
$fn$;
grant execute on function public.badge_aggregate(uuid) to anon, authenticated;

-- auto-unbind: vyčisti zmeny, ktoré vypršali (cron) — bezpečnostná poistka
create or replace function public.badge_auto_unbind() returns int
language plpgsql security definer set search_path = public, extensions as $fn$
declare n int;
begin
  update public.badge_bind set employee_id = null, shift_end = now()
    where employee_id is not null and auto_unbind is not null and auto_unbind <= now();
  get diagnostics n = row_count;
  return n;
end;
$fn$;
grant execute on function public.badge_auto_unbind() to anon, authenticated;

-- ============================================================
-- REŤAZ RPC — chain_create (% sa zafixuje pri vzniku)
-- ============================================================
create or replace function public.chain_create(
  p_case uuid, p_darca uuid, p_pct numeric, p_ciel text,
  p_suma_zaklad numeric default null, p_mena text default 'DEED'
) returns public.retazec_qr
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_slug text; v_row public.retazec_qr;
begin
  v_slug := public.gen_slug();
  insert into public.retazec_qr (case_id, darca, postup_pct, ciel_text, suma_zaklad, mena, slug)
    values (p_case, p_darca, p_pct, p_ciel, p_suma_zaklad, coalesce(p_mena,'DEED'), v_slug)
    returning * into v_row;
  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','chain', v_row.chain_id::text, v_slug, 'https://deed.good/chain/'||v_slug, 'retaz')
    on conflict (objekt_druh, objekt_ref) do nothing;
  return v_row;
end;
$fn$;
grant execute on function public.chain_create(uuid,uuid,numeric,text,numeric,text) to anon, authenticated;

-- pg_cron: auto-unbind odznakov denne o 04:00
select cron.schedule('deed-badge-unbind', '0 4 * * *', $$select public.badge_auto_unbind();$$);

-- ---------- RLS (TEST-ONLY) ----------
do $$
declare t text;
begin
  foreach t in array array['odznak','badge_bind','pochvala','retazec_qr'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists test_all_access on public.%I', t);
    execute format(
      'create policy test_all_access on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
