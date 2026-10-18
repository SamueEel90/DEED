-- ============================================================
-- 0109 · OPRAVY 352 — pravidelná podpora sa ukladá na server (kto, suma, od kedy, zrušenie)
-- ------------------------------------------------------------
-- Doteraz hárok Pravidelná podpora volal recurring_create s id zbierky v case_id (čaká uuid príspevku) → server ho
-- odmietol a pravidelná podpora ostala len v prehliadači. Nová tabuľka pravidelna_podpora:
--   pravidelna_zapni(zbierka, suma, mena, perioda) — prihlásený darca zapne pravidelnú podporu zbierky (stránka sa
--     zistí z id: „stránka:hlavna“ / „stránka:…“ alebo zo zbierka.stranka pri „zb-…“). Vráti id.
--   pravidelna_zrus(id) — darca ju zruší (zrusene = teraz). Vráti true, keď niečo zmenila.
-- Samotné strhávanie platieb rieši platobný modul (táto tabuľka je evidencia, nie platba).
-- statistiky_farnosti (0107) — nová verzia: pravidelna = počet ľudí so zapnutou pravidelnou podporou hlavnej zbierky.
-- ============================================================
begin;

create table if not exists public.pravidelna_podpora (
  id       uuid primary key default gen_random_uuid(),
  ucet_id  uuid not null references public.ucet(id) on delete cascade,     -- kto
  stranka  text not null references public.stranka(id) on delete cascade,
  zbierka  text not null,                                                  -- id zbierky v ledgeri (stránka:hlavna, zb-…)
  suma     numeric(14,2) not null check (suma > 0),
  mena     text not null check (mena in ('EUR', 'EURC')),
  perioda  text not null check (perioda in ('tyzdenne', 'mesacne', 'rocne')),
  od       timestamptz not null default now(),                             -- od kedy
  zrusene  timestamptz                                                      -- zrušenie (null = beží)
);
create index if not exists pravidelna_podpora_stranka_idx on public.pravidelna_podpora (stranka, zbierka) where zrusene is null;
create index if not exists pravidelna_podpora_ucet_idx on public.pravidelna_podpora (ucet_id);
alter table public.pravidelna_podpora enable row level security;
drop policy if exists darca_citat on public.pravidelna_podpora;
create policy darca_citat on public.pravidelna_podpora for select to authenticated using (ucet_id = public.moj_ucet());
revoke all on table public.pravidelna_podpora from anon, authenticated;
grant select on table public.pravidelna_podpora to authenticated;

create or replace function public.pravidelna_zapni(p_zbierka text, p_suma numeric, p_mena text, p_perioda text) returns uuid
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_stranka text; v_id uuid;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_suma is null or p_suma <= 0 or p_suma > 100000 then raise exception 'neplatna_suma' using errcode = '22023'; end if;
  v_stranka := case when position(':' in coalesce(p_zbierka, '')) > 0 then split_part(p_zbierka, ':', 1)
                    else (select z.stranka from public.zbierka z where z.id = p_zbierka) end;
  if v_stranka is null or not exists (select 1 from public.stranka where id = v_stranka) then
    raise exception 'zbierka_neexistuje' using errcode = 'P0002';
  end if;
  insert into public.pravidelna_podpora (ucet_id, stranka, zbierka, suma, mena, perioda)
    values (v_ja, v_stranka, p_zbierka, round(p_suma, 2), p_mena, p_perioda) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.pravidelna_zapni(text, numeric, text, text) from public;
grant execute on function public.pravidelna_zapni(text, numeric, text, text) to authenticated;

create or replace function public.pravidelna_zrus(p_id uuid) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  update public.pravidelna_podpora set zrusene = now() where id = p_id and ucet_id = v_ja and zrusene is null;
  return found;
end $$;
revoke all on function public.pravidelna_zrus(uuid) from public;
grant execute on function public.pravidelna_zrus(uuid) to authenticated;

-- statistiky_farnosti: telo 1 : 1 ako 0107, zmenený len riadok „pravidelna“
create or replace function public.statistiky_farnosti(p_stranka text, p_od timestamptz, p_do timestamptz default null) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare v_do timestamptz := coalesce(p_do, 'infinity'::timestamptz); v jsonb;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  with dary as (
    select coalesce(pl.odosielatel::text, pl.id::text) as kto, pl.cas
      from public.platba pl join public.zbierka z on z.id = pl.zbierka
     where z.stranka = p_stranka and pl.stav in ('credited', 'settled')
       and coalesce(z.nastavenie->'farnost'->>'druh', 'farnost') = 'farnost'
       and not exists (select 1 from public.zbierka_podiel o where o.zbierka = z.id and o.druh = 'overovatel')
  ), prvy as (select kto, min(cas) as cas from dary group by kto),
  podiel as (
    select po.mena, sum(case when po.storno_pre is null then po.suma else -po.suma end) as suma
      from public.pohyb po
      join public.platba pl on pl.id = po.platba_id
      join public.zbierka z on z.id = pl.zbierka and z.stranka = p_stranka
      join public.zbierka_podiel zp on zp.zbierka = z.id and zp.druh = 'overovatel' and zp.stranka = p_stranka
     where (po.ucet_kredit = zp.ucet or po.ucet_debet = zp.ucet) and po.typ in ('dar', 'sluzba', 'vratenie')
       and po.cas >= p_od and po.cas < v_do
     group by po.mena
  )
  select jsonb_build_object(
    'darcovia_spolu', (select count(*) from prvy),
    'novi_darcovia', (select count(*) from prvy where cas >= p_od and cas < v_do),
    'sledujuci', (select count(*) from public.moje_farnosti m where m.stranka = p_stranka),
    'sledujuci_novi_30', (select count(*) from public.moje_farnosti m where m.stranka = p_stranka and m.pridane >= now() - interval '30 days'),
    'pravidelna', (select count(distinct r.ucet_id) from public.pravidelna_podpora r where r.stranka = p_stranka and r.zbierka = p_stranka || ':hlavna' and r.zrusene is null),
    'podiel_rodiny', coalesce((select jsonb_object_agg(mena, round(suma, 2)) from podiel), '{}'::jsonb)
  ) into v;
  return v;
end $$;

commit;
