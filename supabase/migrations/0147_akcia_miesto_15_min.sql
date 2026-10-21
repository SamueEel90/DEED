-- ============================================================
-- 0147 · OPRAVY 446 doplnok · miesto na akcii podržané 15 minút (Martin 20. 10.)
-- ------------------------------------------------------------
-- Kód QR charity sa overí v momente skenu (akcia_rezervuj, aj bez účtu). Keď platí, server vydá „pozvanie
-- na akciu“ platné 15 minút. Nový človek sa medzitým zaregistruje a hneď sa pripojí bez nového skenu
-- (akcia_pripoj_rez). Po 15 minútach: „Čas vypršal. Naskenujte QR charity znova.“
-- ============================================================
begin;

create table if not exists public.akcia_pozvanie (
  id        text primary key default encode(extensions.gen_random_bytes(16), 'hex'),
  event_id  uuid not null references public.event_secret(event_id) on delete cascade,
  plati_do  timestamptz not null default now() + interval '15 minutes',
  vytvorene timestamptz not null default now()
);
alter table public.akcia_pozvanie enable row level security;
revoke all on public.akcia_pozvanie from anon, authenticated;
create index if not exists akcia_pozvanie_cas_idx on public.akcia_pozvanie (vytvorene);

/** sken QR charity: overí kód teraz a podrží miesto 15 minút */
create or replace function public.akcia_rezervuj(p_token text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_event uuid := public.akcia_z_kodu(p_token); e public.event_secret; v_id text;
begin
  if v_event is null then return jsonb_build_object('plati', false); end if;
  select * into e from public.event_secret where event_id = v_event;
  if e.koniec is not null then return jsonb_build_object('plati', false, 'skoncila', true); end if;
  delete from public.akcia_pozvanie where vytvorene < now() - interval '1 day'; -- staré pozvania netreba
  insert into public.akcia_pozvanie (event_id) values (v_event) returning id into v_id;
  return jsonb_build_object('plati', true, 'rez', v_id, 'nazov', coalesce(nullif(trim(e.nazov), ''), 'Akcia charity'));
end $$;
revoke all on function public.akcia_rezervuj(text) from public;
grant execute on function public.akcia_rezervuj(text) to anon, authenticated, service_role;

create or replace function public.akcia_info_rez(p_rez text) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare z public.akcia_pozvanie; e public.event_secret;
begin
  select * into z from public.akcia_pozvanie where id = p_rez;
  if not found then return jsonb_build_object('plati', false); end if;
  select * into e from public.event_secret where event_id = z.event_id;
  return jsonb_build_object('plati', e.koniec is null and z.plati_do > now(), 'skoncila', e.koniec is not null, 'vyprsal', z.plati_do <= now(),
    'nazov', coalesce(nullif(trim(e.nazov), ''), 'Akcia charity'),
    'som', exists (select 1 from public.dochadzka d where d.event_id = z.event_id and d.user_id = public.moj_ucet()),
    'organizator', public.organizujem(z.event_id));
end $$;
revoke all on function public.akcia_info_rez(text) from public;
grant execute on function public.akcia_info_rez(text) to anon, authenticated, service_role;

create or replace function public.akcia_pripoj_rez(p_rez text, p_lat double precision default null, p_lng double precision default null) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); z public.akcia_pozvanie; e public.event_secret;
begin
  if v_ja is null then raise exception 'Najprv sa prihláste.' using errcode = '42501', detail = 'neprihlaseny'; end if;
  select * into z from public.akcia_pozvanie where id = p_rez;
  if not found then raise exception 'Kód už neplatí. Naskenujte QR charity znova.' using errcode = '22023', detail = 'kod_neplati'; end if;
  if z.plati_do <= now() then raise exception 'Čas vypršal. Naskenujte QR charity znova.' using errcode = '22023', detail = 'vyprsal'; end if;
  select * into e from public.event_secret where event_id = z.event_id;
  if e.koniec is not null then raise exception 'Akcia už skončila.' using errcode = '22023', detail = 'skoncila'; end if;
  if public.organizujem(z.event_id) then raise exception 'Túto akciu vediete vy.' using errcode = '22023', detail = 'organizator'; end if;
  if e.lat is not null and (p_lat is null or p_lng is null) then
    raise exception 'Zapnite polohu. Bez nej sa k akcii nepripojíte.' using errcode = '22023', detail = 'bez_polohy';
  end if;
  if e.lat is not null and public.vzdialenost_m(e.lat, e.lng, p_lat, p_lng) > e.polomer_m then
    insert into public.scan_log (event_id, user_id, device_id, counter, vysledok, gps) values (z.event_id, v_ja, 'ucet:' || v_ja::text, 0, 'out_of_radius', point(p_lng, p_lat));
    raise exception 'Ste príliš ďaleko od miesta akcie.' using errcode = '22023', detail = 'mimo';
  end if;
  insert into public.dochadzka (event_id, user_id, prichod, mod, splneny) values (z.event_id, v_ja, now(), e.mod, false)
    on conflict (event_id, user_id) do nothing;
  return jsonb_build_object('nazov', coalesce(nullif(trim(e.nazov), ''), 'Akcia charity'), 'nove', found);
end $$;
revoke all on function public.akcia_pripoj_rez(text, double precision, double precision) from public, anon;
grant execute on function public.akcia_pripoj_rez(text, double precision, double precision) to authenticated, service_role;

commit;
