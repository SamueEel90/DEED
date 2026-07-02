-- ============================================================
-- DEED · QR Split — produkčný QR systém (autor + osobný QR)   [Fáza 6]
-- ------------------------------------------------------------
-- Zovšeobecnenie „Reťaz dobra" (0017 retazec_qr, jeden príjemca) na plnohodnotný
-- QR SPLIT: vlastník (autor/influencer) + N organizácií, každý s % ZAFIXOVANÝM
-- pri vzniku. Každý QR odkazuje na ZDROJOVÝ príspevok (case_id) — landing je živý
-- view (nie kópia riadku). Platba cez QR sa rozdelí existujúcim platba_create(p_split)
-- → platba_split (Σ=1.0). Agregácia po jednotlivom QR = koľko išlo organizáciám.
--   • zdroj='autor'  → kanonický QR príspevku (pomer autora, vzniká pri tvorbe)
--   • zdroj='osobny' → vlastný QR inej osoby k tomu istému príspevku (jej pomer)
--
-- POZN. RLS: TEST-ONLY (using true) — ako 0013–0017. Zápis ide cez SECURITY DEFINER
--   RPC. Owner-only RLS (owner_ucet_id = auth.uid()) = ďalší krok (Auth, Fáza 5).
-- Identifikátory ASCII; hodnoty s diakritikou OK.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- qr_kod pozná nový druh 'split'
alter table public.qr_kod drop constraint if exists qr_kod_objekt_druh_check;
alter table public.qr_kod add constraint qr_kod_objekt_druh_check
  check (objekt_druh in ('case','handle','org','branch','chain','badge','event','split'));

-- ---------- QR SPLIT (hlavička jedného QR kódu) ----------
create table public.qr_split (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid references public.prispevok(id) on delete set null,   -- zdrojový príspevok (landing)
  owner_ucet_id uuid references public.ucet(id) on delete set null,        -- čí QR
  owner_text    text,                                                      -- denorm. meno (demo/seed)
  owner_podiel  numeric(6,5) not null check (owner_podiel >= 0.03 and owner_podiel <= 1),  -- % vlastníkovi (zafixované)
  zdroj         text not null default 'osobny' check (zdroj in ('autor','osobny')),
  mena          text not null default 'DEED' check (mena in ('DEED','EUR')),
  slug          text unique,
  aktivny       boolean not null default true,
  vytvorene     timestamptz not null default now()
);
comment on table public.qr_split is 'QR Split — vlastník + N organizácií, % zafixované pri vzniku; QR odkazuje na case_id (živý landing).';
create index on public.qr_split (owner_ucet_id);
create index on public.qr_split (case_id);

-- ---------- QR SPLIT CIEĽ (organizácie/žiadosti daného QR) ----------
create table public.qr_split_ciel (
  id            bigint generated always as identity primary key,
  qr_split_id   uuid not null references public.qr_split(id) on delete cascade,
  prijemca_ucet uuid references public.ucet(id) on delete set null,
  prijemca_text text,                                                      -- denorm. názov org/žiadosti
  podiel        numeric(6,5) not null check (podiel >= 0.03 and podiel <= 1),
  fixny         boolean not null default true
);
create index on public.qr_split_ciel (qr_split_id);

-- platba: atribúcia ku konkrétnemu QR (čistá agregácia namiesto len meta)
alter table public.platba add column if not exists qr_split_id uuid references public.qr_split(id) on delete set null;
create index if not exists platba_qr_split_idx on public.platba (qr_split_id) where qr_split_id is not null;

-- ============================================================
-- RPC — qr_split_create (% sa zafixuje pri vzniku, auto-qr_kod)
-- ============================================================
create or replace function public.qr_split_create(
  p_case uuid, p_owner uuid, p_owner_text text, p_owner_podiel numeric,
  p_ciele jsonb, p_zdroj text default 'osobny', p_mena text default 'DEED'
) returns public.qr_split
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_slug text; v_row public.qr_split; v_sum numeric := 0; e jsonb;
begin
  -- validácia pomeru: každý podiel ≥ 3 %, Σ (owner + ciele) = 1.0
  if coalesce(p_owner_podiel,0) < 0.03 then
    raise exception 'owner_podiel musí byť ≥ 0.03 (dostal %)', p_owner_podiel;
  end if;
  select coalesce(sum((x->>'podiel')::numeric), 0) into v_sum
    from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) x;
  if exists (select 1 from jsonb_array_elements(coalesce(p_ciele,'[]'::jsonb)) x
             where (x->>'podiel')::numeric < 0.03) then
    raise exception 'každý podiel organizácie musí byť ≥ 0.03';
  end if;
  if abs((coalesce(p_owner_podiel,0) + v_sum) - 1.0) > 0.0005 then
    raise exception 'Σ podielov musí byť 1.0 (owner % + ciele % = %)', p_owner_podiel, v_sum, p_owner_podiel + v_sum;
  end if;

  v_slug := public.gen_slug();
  insert into public.qr_split (case_id, owner_ucet_id, owner_text, owner_podiel, zdroj, mena, slug)
    values (p_case, p_owner, p_owner_text, p_owner_podiel,
            coalesce(p_zdroj,'osobny'), coalesce(p_mena,'DEED'), v_slug)
    returning * into v_row;

  for e in select * from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) loop
    insert into public.qr_split_ciel (qr_split_id, prijemca_ucet, prijemca_text, podiel, fixny)
      values (v_row.id, nullif(e->>'prijemca_ucet','')::uuid, e->>'prijemca_text',
              (e->>'podiel')::numeric, coalesce((e->>'fixny')::boolean, true));
  end loop;

  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','split', v_row.id::text, v_slug, 'https://deed.good/split/'||v_slug, 'qr')
    on conflict (objekt_druh, objekt_ref) do nothing;

  return v_row;
end;
$fn$;
grant execute on function public.qr_split_create(uuid,uuid,text,numeric,jsonb,text,text) to anon, authenticated;

-- ============================================================
-- RPC — qr_split_pay: platba cez QR sa rozdelí podľa zafixovaného pomeru
-- (owner = fixny false, organizácie = fixny true → agregácia org_total)
-- ============================================================
create or replace function public.qr_split_pay(
  p_slug text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_odosielatel uuid default null, p_odosielatel_text text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_qr public.qr_split; v_split jsonb; v_pl public.platba;
begin
  select * into v_qr from public.qr_split where slug = p_slug and aktivny;
  if not found then raise exception 'QR split % neexistuje', p_slug; end if;

  -- owner podiel (fixny=false) + organizácie (fixny=true)
  v_split := jsonb_build_array(jsonb_build_object(
    'prijemca_ucet', v_qr.owner_ucet_id, 'prijemca_text', v_qr.owner_text,
    'podiel', v_qr.owner_podiel, 'fixny', false));
  select v_split || coalesce(jsonb_agg(jsonb_build_object(
           'prijemca_ucet', c.prijemca_ucet, 'prijemca_text', c.prijemca_text,
           'podiel', c.podiel, 'fixny', true)), '[]'::jsonb)
    into v_split
    from public.qr_split_ciel c where c.qr_split_id = v_qr.id;

  v_pl := public.platba_create(
    p_idem, p_suma, coalesce(p_mena, v_qr.mena), p_kanal,
    v_qr.case_id, p_odosielatel, p_odosielatel_text,
    null, v_qr.owner_text, false, 0,
    jsonb_build_object('qr_split_id', v_qr.id, 'slug', p_slug),
    v_split);

  update public.platba set qr_split_id = v_qr.id where id = v_pl.id;

  return jsonb_build_object('platba_id', v_pl.id, 'qr_split_id', v_qr.id, 'stav', v_pl.stav, 'suma', v_pl.suma);
end;
$fn$;
grant execute on function public.qr_split_pay(text,text,numeric,text,text,uuid,text) to anon, authenticated;

-- ============================================================
-- POHĽAD — súčty po jednotlivom QR (koľko išlo organizáciám)
-- ============================================================
create or replace view public.v_qr_split_totals
with (security_invoker = true) as
  select p.qr_split_id,
         count(distinct p.id)                                      as pocet,
         coalesce(sum(ps.suma) filter (where ps.fixny), 0)         as org_total,
         coalesce(sum(ps.suma) filter (where not ps.fixny), 0)     as owner_total,
         coalesce(sum(ps.suma), 0)                                 as spolu
    from public.platba p
    left join public.platba_split ps on ps.platba_id = p.id
   where p.qr_split_id is not null
   group by p.qr_split_id;
grant select on public.v_qr_split_totals to anon, authenticated;

-- ============================================================
-- RPC — qr_split_get (landing: príspevok + pomer + ciele + súčty)
-- ============================================================
create or replace function public.qr_split_get(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public, extensions as $fn$
  select jsonb_build_object(
    'id', q.id, 'slug', q.slug, 'zdroj', q.zdroj, 'mena', q.mena,
    'owner_ucet_id', q.owner_ucet_id, 'owner_text', q.owner_text, 'owner_podiel', q.owner_podiel,
    'case_id', q.case_id,
    'prispevok', (select jsonb_build_object(
        'id', p.id, 'titul', p.titul, 'autor_nazov', p.autor_nazov, 'autor_ini', p.autor_ini,
        'autor_pfp', p.autor_pfp, 'emoji', p.emoji, 'lok', p.lok, 'popis', p.popis,
        'vyzbierane', p.vyzbierane, 'ciel', p.ciel, 'modul', p.modul, 'typ', p.typ,
        'fotky', p.media->'fotky')
      from public.prispevok p where p.id = q.case_id),
    'ciele', (select coalesce(jsonb_agg(jsonb_build_object(
        'prijemca_ucet', c.prijemca_ucet, 'prijemca_text', c.prijemca_text,
        'podiel', c.podiel, 'fixny', c.fixny) order by c.id), '[]'::jsonb)
      from public.qr_split_ciel c where c.qr_split_id = q.id),
    'totals', (select jsonb_build_object(
        'org_total', coalesce(t.org_total,0), 'owner_total', coalesce(t.owner_total,0),
        'spolu', coalesce(t.spolu,0), 'pocet', coalesce(t.pocet,0))
      from public.v_qr_split_totals t where t.qr_split_id = q.id)
  )
  from public.qr_split q where q.id = p_id;
$fn$;
grant execute on function public.qr_split_get(uuid) to anon, authenticated;

-- ============================================================
-- RPC — qr_split_list (správca QR: moje QR + pomer + koľko organizáciám)
-- ============================================================
create or replace function public.qr_split_list(p_owner uuid)
returns jsonb
language sql stable security definer set search_path = public, extensions as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'slug', q.slug, 'zdroj', q.zdroj, 'mena', q.mena,
      'owner_podiel', q.owner_podiel, 'case_id', q.case_id, 'vytvorene', q.vytvorene,
      'titul', (select coalesce(p.titul, p.autor_nazov, 'Príspevok') from public.prispevok p where p.id = q.case_id),
      'emoji', (select p.emoji from public.prispevok p where p.id = q.case_id),
      'org_odoslane', (select coalesce(t.org_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'owner_odoslane', (select coalesce(t.owner_total,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'pocet', (select coalesce(t.pocet,0) from public.v_qr_split_totals t where t.qr_split_id = q.id),
      'ciele', (select coalesce(jsonb_agg(jsonb_build_object('prijemca_text', c.prijemca_text, 'podiel', c.podiel) order by c.id), '[]'::jsonb)
                from public.qr_split_ciel c where c.qr_split_id = q.id)
    ) order by q.vytvorene desc), '[]'::jsonb)
  from public.qr_split q where q.owner_ucet_id = p_owner;
$fn$;
grant execute on function public.qr_split_list(uuid) to anon, authenticated;

-- ---------- RLS (TEST-ONLY — ako 0013–0017) ----------
do $$
declare t text;
begin
  foreach t in array array['qr_split','qr_split_ciel'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists test_all_access on public.%I', t);
    execute format(
      'create policy test_all_access on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
