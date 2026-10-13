-- ============================================================
-- 0083 · OPRAVY 222 (Martin 13. 10.) — Spolufinancovanie 1 : 1 ako v charite (prototyp Spolufinancovanie, B).
-- B · Vložiť vlastné peniaze do vlastnej zbierky (len zbierka s vlastným účtom):
--   suma → prevod z hlavného účtu organizácie na účet zbierky s VS → Čaká → Potvrdené.
--   Kým platba nepríde, nie je to pohyb a darcovia nič nevidia. Potvrdenie = dar cez zbierka_dar (pohyb v ledgeri),
--   darca_stranka = vlastná stránka. Potvrdzuje server (párovanie výpisu); testovacia stránka aj jej správa (Simulovať).
--   Farnosť: len farár (som_farar). Iná organizácia: správa stránky.
-- zbierka_prispievatelia: + vlastne (vlastné peniaze, tmavozelený úsek) a pocet (koľko darov poslala organizácia — neráta sa medzi ľudí).
-- stranka_prispela: vlastné peniaze do vlastnej zbierky nie sú „Prispeli sme“.
-- ============================================================
begin;

create table if not exists public.zbierka_vklad (
  id         uuid primary key default gen_random_uuid(),
  zbierka    text not null references public.zbierka (id) on delete cascade,
  stranka    text not null references public.stranka (id) on delete cascade,
  suma       numeric(14,2) not null check (suma > 0),
  vs         text not null unique,
  z_uctu     text not null,
  na_ucet    text not null,
  stav       text not null default 'caka' check (stav in ('caka', 'potvrdene', 'zrusene')),
  vytvoril   uuid references public.ucet (id) on delete set null,
  vytvorene  timestamptz not null default now(),
  potvrdene  timestamptz,
  platba_id  uuid references public.platba (id) on delete set null
);
create index if not exists zbierka_vklad_zbierka_idx on public.zbierka_vklad (zbierka);
create unique index if not exists zbierka_vklad_jeden_caka on public.zbierka_vklad (zbierka) where stav = 'caka';
alter table public.zbierka_vklad enable row level security;
drop policy if exists vklad_citat on public.zbierka_vklad;
create policy vklad_citat on public.zbierka_vklad for select to authenticated using (public.spravujem_stranku(stranka));
grant select on table public.zbierka_vklad to authenticated;

-- kto smie: farnosť len farár, iná organizácia jej správa
create or replace function public.smie_vlastne_peniaze(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select case when (select typ from public.stranka where id = p_stranka) = 'farnost' then public.som_farar(p_stranka) else public.spravujem_stranku(p_stranka) end
$$;

create or replace function public.zbierka_vklad_vlastny(p_zbierka text, p_suma numeric) returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_ja uuid := public.moj_ucet(); v_z public.zbierka; v_s public.stranka; v_hl text; v_na text; v_v public.zbierka_vklad;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_suma is null or p_suma <= 0 then raise exception 'Suma musí byť kladná.' using errcode = '22023', detail = 'suma_neplatna'; end if;
  select * into v_z from public.zbierka where id = p_zbierka;
  if not found or v_z.stranka is null then raise exception 'Zbierka neexistuje.' using errcode = 'P0002', detail = 'zbierka_neexistuje'; end if;
  select * into v_s from public.stranka where id = v_z.stranka;
  if not public.smie_vlastne_peniaze(v_s.id) then
    raise exception 'Vlastné peniaze vloží len %.', case when v_s.typ = 'farnost' then 'farár' else 'správa organizácie' end using errcode = '42501', detail = 'nesmie';
  end if;
  if v_z.stav <> 'aktivna' then raise exception 'Zbierka už neberie dary.' using errcode = '22023', detail = 'zbierka_ukoncena'; end if;
  if exists (select 1 from public.zbierka_podiel where zbierka = p_zbierka and druh = 'prijemca') then
    raise exception 'Do zbierky rodiny sa vlastné peniaze nevkladajú.' using errcode = '22023', detail = 'zbierka_rodiny';
  end if;
  select public.norm_iban(bankovy_ucet) into v_hl from public.organizacia where ucet_id = v_s.ucet_id;
  v_na := public.norm_iban(v_z.nastavenie->>'ucet');
  if coalesce(v_na, '') = '' or v_na = coalesce(v_hl, '') then
    raise exception 'Zbierka nemá vlastný účet, peniaze by ostali na hlavnom účte.' using errcode = '22023', detail = 'bez_vlastneho_uctu';
  end if;
  if coalesce(v_hl, '') = '' then raise exception 'Organizácia nemá hlavný účet.' using errcode = '22023', detail = 'bez_hlavneho_uctu'; end if;
  select * into v_v from public.zbierka_vklad where zbierka = p_zbierka and stav = 'caka';
  if found then
    raise exception 'Jeden prevod už čaká (% €, VS %).', v_v.suma, v_v.vs using errcode = '23505', detail = 'uz_caka';
  end if;
  insert into public.zbierka_vklad (zbierka, stranka, suma, vs, z_uctu, na_ucet, vytvoril)
    values (p_zbierka, v_s.id, round(p_suma, 2), lpad(nextval('public.vs_seq')::text, 10, '0'), v_hl, v_na, v_ja)
    returning * into v_v;
  return to_jsonb(v_v);
end $$;

create or replace function public.zbierka_vklad_potvrd(p_vklad uuid) returns jsonb
  language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_ja uuid := public.moj_ucet(); v_v public.zbierka_vklad; v_s public.stranka; v_r jsonb;
begin
  select * into v_v from public.zbierka_vklad where id = p_vklad for update;
  if not found then raise exception 'Prevod neexistuje.' using errcode = 'P0002', detail = 'vklad_neexistuje'; end if;
  select * into v_s from public.stranka where id = v_v.stranka;
  -- ostro potvrdzuje len server (párovanie výpisu podľa VS); testovacia stránka si to odsimuluje sama
  if v_ja is not null and not (v_s.testovacia and public.smie_vlastne_peniaze(v_s.id)) then
    raise exception 'Prevod potvrdí server, keď platba príde na účet zbierky.' using errcode = '42501', detail = 'len_server';
  end if;
  if v_v.stav <> 'caka' then return to_jsonb(v_v); end if;
  v_r := public.zbierka_dar(v_v.zbierka, 'vklad-' || v_v.id::text, v_v.suma, 'EUR', 'sepa', v_s.nazov, null, null, null);
  update public.platba set darca_stranka = v_v.stranka, meta = meta || jsonb_build_object('vlastne', true, 'vklad', v_v.id)
   where id = (v_r->>'platba_id')::uuid;
  update public.zbierka_vklad set stav = 'potvrdene', potvrdene = now(), platba_id = (v_r->>'platba_id')::uuid where id = v_v.id returning * into v_v;
  return to_jsonb(v_v);
end $$;

create or replace function public.zbierka_prispievatelia(p_zbierka text) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('stranka', t.stranka, 'meno', t.meno, 'vlastne', t.vlastne, 'pocet', t.pocet,
           'suma', case when t.rodina then null else t.suma end) order by t.vlastne desc, t.suma desc), '[]'::jsonb)
    from (select pl.darca_stranka as stranka, s.nazov as meno, sum(pl.suma) as suma, count(*) as pocet,
                 pl.darca_stranka = z.stranka as vlastne,
                 coalesce(z.nastavenie->'farnost'->>'druh', '') in ('pohreb', 'svadba', 'ine') as rodina
            from public.platba pl join public.stranka s on s.id = pl.darca_stranka join public.zbierka z on z.id = pl.zbierka
           where pl.zbierka = p_zbierka and pl.darca_stranka is not null and pl.mena = 'EUR' and pl.stav not in ('failed', 'refunded') and exists (select 1 from public.pohyb po where po.platba_id = pl.id)
           group by pl.darca_stranka, s.nazov, z.stranka, z.nastavenie) t;
$$;

create or replace function public.stranka_prispela(p_stranka text, p_limit int default 50) returns jsonb
  language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'cas' desc), '[]'::jsonb) from (
    select jsonb_build_object('platba', pl.id, 'zbierka', pl.zbierka, 'nazov', z.nazov, 'kto', coalesce(s.nazov, z.nazov),
             'suma', pl.suma, 'mena', pl.mena, 'kanal', pl.kanal, 'cas', pl.cas, 'vs', pl.verejne_cislo,
             'rodina', coalesce(z.nastavenie->'farnost'->>'druh', '') in ('pohreb', 'svadba', 'ine')) as x
      from public.platba pl join public.zbierka z on z.id = pl.zbierka left join public.stranka s on s.id = z.stranka
     where pl.darca_stranka = p_stranka and z.stranka is distinct from p_stranka and pl.stav not in ('failed', 'refunded') and exists (select 1 from public.pohyb po where po.platba_id = pl.id)
     order by pl.cas desc limit greatest(1, least(p_limit, 200))) t;
$$;

revoke all on function public.smie_vlastne_peniaze(text), public.zbierka_vklad_vlastny(text, numeric), public.zbierka_vklad_potvrd(uuid) from public;
grant execute on function public.smie_vlastne_peniaze(text), public.zbierka_vklad_vlastny(text, numeric), public.zbierka_vklad_potvrd(uuid) to authenticated, service_role;

commit;
