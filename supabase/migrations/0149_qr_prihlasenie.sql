-- ============================================================
-- 0149 · OPRAVY 466 · prihlásenie na PC cez QR z mobilu
-- ------------------------------------------------------------
-- qr_prihlasenie: jednorazový QR pre počítač, kde sa človek ešte neprihlásil.
--   · zakladá ho LEN server (api/qr-prihlasenie, service role): token (v QR), hash tajomstva (drží ho len to PC),
--     zariadenie, IP a mesto podľa IP (hlavičky Vercelu), platnosť 2 minúty
--   · mobil (prihlásený účet s e-mailom) vidí zariadenie a mesto (qr_prihlasenie_info) a potvrdí podržaním
--     (qr_prihlasenie_potvrd) alebo zruší (qr_prihlasenie_zrus)
--   · PC sa pýta servera s tajomstvom; po potvrdení server stav prepne na „pouzite“ (len raz) a vytvorí mu reláciu
-- Tabuľka nemá žiadne právo pre anon / authenticated — číta a píše len server a tieto funkcie.
-- Bezpečnosť: mobil vždy ukáže zariadenie a mesto; bez toho by ktokoľvek mohol poslať svoj QR a prevziať účet.
-- ============================================================
begin;

create table if not exists public.qr_prihlasenie (
  token          text primary key check (length(token) between 20 and 80),
  tajomstvo_hash text not null,
  stav           text not null default 'caka' check (stav in ('caka', 'potvrdene', 'pouzite', 'zrusene')),
  zariadenie     text not null check (length(zariadenie) between 1 and 80),
  ip             text,
  mesto          text,
  ucet           uuid references public.ucet (id) on delete cascade,
  vytvorene      timestamptz not null default now(),
  plati_do       timestamptz not null default now() + interval '2 minutes',
  potvrdene      timestamptz
);
create index if not exists qr_prihlasenie_ip_idx on public.qr_prihlasenie (ip, vytvorene);
alter table public.qr_prihlasenie enable row level security;
revoke all on table public.qr_prihlasenie from anon, authenticated;

/** prihlásený účet s e-mailom (anonymná relácia nestačí) */
create or replace function public.qr_prihlasenie_ja() returns uuid
  language plpgsql volatile security definer set search_path = public as $$
declare v uuid := public.moj_ucet();
begin
  if v is null or coalesce((select nullif(trim(u.email), '') from auth.users u where u.id = auth.uid()), '') = '' then
    raise exception 'Najprv sa prihláste v mobile.' using errcode = '42501', detail = 'neprihlaseny';
  end if;
  return v;
end $$;
revoke all on function public.qr_prihlasenie_ja() from public, anon, authenticated;

create or replace function public.qr_prihlasenie_info(p_token text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare r public.qr_prihlasenie;
begin
  perform public.qr_prihlasenie_ja();
  select * into r from public.qr_prihlasenie where token = p_token;
  if r.token is null or r.stav <> 'caka' or r.plati_do < now() then
    return jsonb_build_object('plati', false, 'pouzite', coalesce(r.stav in ('potvrdene', 'pouzite'), false));
  end if;
  return jsonb_build_object('plati', true, 'zariadenie', r.zariadenie, 'mesto', r.mesto, 'ip', r.ip, 'vytvorene', r.vytvorene, 'plati_do', r.plati_do);
end $$;
revoke all on function public.qr_prihlasenie_info(text) from public, anon;
grant execute on function public.qr_prihlasenie_info(text) to authenticated, service_role;

create or replace function public.qr_prihlasenie_potvrd(p_token text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare v uuid := public.qr_prihlasenie_ja();
begin
  update public.qr_prihlasenie set stav = 'potvrdene', ucet = v, potvrdene = now()
   where token = p_token and stav = 'caka' and plati_do >= now();
  if not found then raise exception 'QR už neplatí. Na počítači sa ukáže nový, naskenujte ho znova.' using errcode = '22023', detail = 'neplati'; end if;
  return true;
end $$;
revoke all on function public.qr_prihlasenie_potvrd(text) from public, anon;
grant execute on function public.qr_prihlasenie_potvrd(text) to authenticated, service_role;

create or replace function public.qr_prihlasenie_zrus(p_token text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.qr_prihlasenie_ja();
  update public.qr_prihlasenie set stav = 'zrusene' where token = p_token and stav = 'caka';
  return found;
end $$;
revoke all on function public.qr_prihlasenie_zrus(text) from public, anon;
grant execute on function public.qr_prihlasenie_zrus(text) to authenticated, service_role;

/** server (api/qr-prihlasenie): potvrdený QR použije raz — vráti účet a e-mail, inak nič */
create or replace function public.qr_prihlasenie_pouzi(p_token text, p_tajomstvo_hash text) returns jsonb
  language plpgsql volatile security definer set search_path = public as $$
declare r public.qr_prihlasenie; v_email text;
begin
  select * into r from public.qr_prihlasenie where token = p_token and tajomstvo_hash = p_tajomstvo_hash;
  if r.token is null then return jsonb_build_object('stav', 'nenajdene'); end if;
  if r.stav = 'zrusene' then return jsonb_build_object('stav', 'zrusene'); end if;
  if r.stav = 'pouzite' then return jsonb_build_object('stav', 'pouzite'); end if;
  if r.stav = 'caka' then return jsonb_build_object('stav', case when r.plati_do < now() then 'vyprsal' else 'caka' end); end if;
  -- potvrdené: po potvrdení má PC ešte 2 minúty na vyzdvihnutie
  if r.potvrdene < now() - interval '2 minutes' then return jsonb_build_object('stav', 'vyprsal'); end if;
  update public.qr_prihlasenie set stav = 'pouzite' where token = p_token and stav = 'potvrdene';
  if not found then return jsonb_build_object('stav', 'pouzite'); end if;
  select u.email into v_email from public.ucet c join auth.users u on u.id = c.auth_id where c.id = r.ucet;
  return jsonb_build_object('stav', 'potvrdene', 'email', v_email, 'mesto', r.mesto);
end $$;
revoke all on function public.qr_prihlasenie_pouzi(text, text) from public, anon, authenticated;
grant execute on function public.qr_prihlasenie_pouzi(text, text) to service_role;

commit;
