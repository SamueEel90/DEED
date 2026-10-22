-- ============================================================
-- 0158 · Prístupové kódy testovacej verzie (Martin 22. 10.)
-- ------------------------------------------------------------
-- Kód vydáva len tím DEED (deed_admin). Dva druhy: test (po teste sa stránka zmaže celá) a pilot (po teste ostane
-- vzhľad stránky, profil, texty, fotky, nástenka a príspevky; zbierky, peniaze a reťaze sa zmažú).
-- Z kódu sa druh nedá vyčítať (oba vyzerajú rovnako, napr. K7M2-QX9P), pozná ho len server.
-- Kód platí na jednu registráciu a natrvalo sa pripne k stránke. Stránka bez kódu = test.
-- Kým výmaz neprebehol, tím DEED môže stránke prepnúť druh (oprava omylu).
-- Kódy platia len do ostrého štartu: prepínač „pristupove_kody“ vypne výmaz (samostatný krok, neskôr).
-- Štítok (PILOT / TESTOVACIA) vidí len správca stránky v Správe, verejný profil nič.
-- ============================================================
begin;

insert into public.ledger_prepinac values ('pristupove_kody', true) on conflict (kluc) do nothing;

create table if not exists public.pristupovy_kod (
  kod        text primary key check (kod ~ '^[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  druh       text not null check (druh in ('test', 'pilot')),
  komu       text check (length(komu) <= 120),
  vytvoril   uuid references public.ucet (id) on delete set null,
  vytvoreny  timestamptz not null default now(),
  stranka    text unique references public.stranka (id) on delete set null,
  pouzity    timestamptz
);
alter table public.pristupovy_kod enable row level security;
revoke all on table public.pristupovy_kod from anon, authenticated;

create table if not exists public.stranka_rezim (
  stranka  text primary key references public.stranka (id) on delete cascade,
  rezim    text not null default 'test' check (rezim in ('test', 'pilot')),
  od       timestamptz not null default now()
);
alter table public.stranka_rezim enable row level security;
revoke all on table public.stranka_rezim from anon, authenticated;

-- kým bežia kódy, každá nová stránka je testovacia (kým jej nepripneme kód)
create or replace function public.stranka_rezim_novej() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select zapnute from public.ledger_prepinac where kluc = 'pristupove_kody'), false) then
    insert into public.stranka_rezim (stranka, rezim) values (new.id, 'test') on conflict (stranka) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists stranka_rezim_novej on public.stranka;
create trigger stranka_rezim_novej after insert on public.stranka for each row execute function public.stranka_rezim_novej();

-- existujúce stránky: všetky testovacie
insert into public.stranka_rezim (stranka, rezim)
  select s.id, 'test' from public.stranka s
   where coalesce((select zapnute from public.ledger_prepinac where kluc = 'pristupove_kody'), false)
  on conflict (stranka) do nothing;

-- ---------- tím DEED ----------
create or replace function public.kod_vytvor(p_druh text, p_komu text default null) returns text
  language plpgsql security definer set search_path = public as $$
declare v_abc text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; v_b bytea; v_k text; i int;
begin
  if not public.som_deed_admin() then raise exception 'nie_admin' using errcode = '42501'; end if;
  if p_druh not in ('test', 'pilot') then raise exception 'zly_druh' using errcode = '22023'; end if;
  if not coalesce((select zapnute from public.ledger_prepinac where kluc = 'pristupove_kody'), false) then
    raise exception 'kody_vypnute' using errcode = '42501';
  end if;
  loop
    v_b := decode(replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_k := '';
    for i in 0..7 loop
      v_k := v_k || substr(v_abc, 1 + get_byte(v_b, i) % length(v_abc), 1);
      if i = 3 then v_k := v_k || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.pristupovy_kod where kod = v_k);
  end loop;
  insert into public.pristupovy_kod (kod, druh, komu, vytvoril)
    values (v_k, p_druh, nullif(left(trim(coalesce(p_komu, '')), 120), ''), public.moj_ucet());
  return v_k;
end $$;

create or replace function public.kod_zoznam() returns jsonb
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.som_deed_admin() then raise exception 'nie_admin' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('kod', k.kod, 'druh', k.druh, 'komu', k.komu, 'vytvoreny', k.vytvoreny,
             'pouzity', k.pouzity, 'stranka', k.stranka, 'nazov', s.nazov, 'typ', s.typ, 'rezim', r.rezim)
             order by k.vytvoreny desc)
      from public.pristupovy_kod k left join public.stranka s on s.id = k.stranka left join public.stranka_rezim r on r.stranka = k.stranka), '[]'::jsonb);
end $$;

-- oprava omylu: prepnúť druh stránky (kým výmaz neprebehol)
create or replace function public.stranka_rezim_nastav(p_stranka text, p_rezim text) returns text
  language plpgsql security definer set search_path = public as $$
begin
  if not public.som_deed_admin() then raise exception 'nie_admin' using errcode = '42501'; end if;
  if p_rezim not in ('test', 'pilot') then raise exception 'zly_druh' using errcode = '22023'; end if;
  if not exists (select 1 from public.stranka_rezim where stranka = p_stranka) then
    raise exception 'Stránka nie je v testovacom režime.' using errcode = 'P0002', detail = 'bez_rezimu';
  end if;
  update public.stranka_rezim set rezim = p_rezim, od = now() where stranka = p_stranka;
  return p_rezim;
end $$;

-- ---------- registrácia ----------
-- pred založením: platí kód? (druh sa neprezradí)
create or replace function public.kod_over(p_kod text) returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select zapnute from public.ledger_prepinac where kluc = 'pristupove_kody'), false)
     and exists (select 1 from public.pristupovy_kod where kod = upper(trim(p_kod)) and pouzity is null)
$$;

-- po založení: pripne kód k stránke (len správca tej stránky)
create or replace function public.kod_uplatni(p_stranka text, p_kod text) returns text
  language plpgsql security definer set search_path = public as $$
declare v_k public.pristupovy_kod;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if not coalesce((select zapnute from public.ledger_prepinac where kluc = 'pristupove_kody'), false) then
    raise exception 'kody_vypnute' using errcode = '42501';
  end if;
  select * into v_k from public.pristupovy_kod where kod = upper(trim(p_kod)) for update;
  if not found then raise exception 'Kód neplatí.' using errcode = 'P0002', detail = 'kod_neplatny'; end if;
  if v_k.pouzity is not null then
    if v_k.stranka = p_stranka then return (select rezim from public.stranka_rezim where stranka = p_stranka); end if;
    raise exception 'Kód už bol použitý.' using errcode = '23505', detail = 'kod_pouzity';
  end if;
  if exists (select 1 from public.pristupovy_kod where stranka = p_stranka) then
    raise exception 'Stránka už má kód.' using errcode = '23505', detail = 'stranka_ma_kod';
  end if;
  update public.pristupovy_kod set stranka = p_stranka, pouzity = now() where kod = v_k.kod;
  insert into public.stranka_rezim (stranka, rezim) values (p_stranka, v_k.druh)
    on conflict (stranka) do update set rezim = excluded.rezim, od = now();
  return v_k.druh;
end $$;

-- štítok v Správe: len správca stránky alebo tím DEED; null = mimo testovacieho režimu
create or replace function public.stranka_rezim_moj(p_stranka text) returns text
  language sql stable security definer set search_path = public as $$
  select r.rezim from public.stranka_rezim r
   where r.stranka = p_stranka and (public.spravujem_stranku(p_stranka) or public.som_deed_admin())
     and coalesce((select zapnute from public.ledger_prepinac where kluc = 'pristupove_kody'), false)
$$;

revoke all on function public.kod_vytvor(text, text), public.kod_zoznam(), public.stranka_rezim_nastav(text, text),
  public.kod_over(text), public.kod_uplatni(text, text), public.stranka_rezim_moj(text) from public, anon;
grant execute on function public.kod_vytvor(text, text), public.kod_zoznam(), public.stranka_rezim_nastav(text, text),
  public.kod_over(text), public.kod_uplatni(text, text), public.stranka_rezim_moj(text) to authenticated;

commit;
