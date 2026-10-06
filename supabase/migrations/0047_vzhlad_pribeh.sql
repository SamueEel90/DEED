-- ============================================================
-- 0047 · Karta 50 (vzhľad stránky) + Karta 55 (príbeh zbierky) — serverová časť (Samuel, 6. 10. 2026)
-- ------------------------------------------------------------
-- 1. profil_stranky.vzhlad: Kronika · Výklad · Pirát (null = predvolený). Zapisuje len správca stránky
--    (existujúca politika spravca_all z 0035). Verejnosť ho číta cez profil_stranky_verejny.
--    Program Zadarmo (stranka_program.tier 0) má vzhľad z configu appky — server uložený výber
--    verejnosti nevydá (null). Výnimka: farnosť (jeden platený program) a testovacie stránky.
-- 2. pribeh_zbierky: koncept (vidia len správcovia) + zverejneny (verejnosť cez pribeh_zbierky_verejny).
--    Príbeh týždňa = najviac jeden na stránku (trigger vypne ostatné + čiastočný unikátny index).
--    Zverejniť citát bez súhlasu osoby nejde (check).
--    Stĺpec stranka (nie „org") → stranka(id), RLS cez spravujem_stranku — podľa Martinovej poznámky k 0035.
-- Spúšťa sa po 0046.
-- ============================================================
begin;

-- ---------- 1 · vzhľad stránky ----------
alter table public.profil_stranky add column if not exists vzhlad text;
alter table public.profil_stranky drop constraint if exists profil_stranky_vzhlad_check;
alter table public.profil_stranky add constraint profil_stranky_vzhlad_check
  check (vzhlad is null or vzhlad in ('kronika', 'vyklad', 'pirat'));

-- verejný pohľad: pôvodné stĺpce (0032) + vzhľad; riadok aj vtedy, keď je vybraný len vzhľad
create or replace view public.profil_stranky_verejny as
  select p.stranka, p.ulozeny, p.ulozeny_cas, p.centralna,
         case when s.testovacia or s.typ = 'farnost' or coalesce(sp.tier, 0) > 0 then p.vzhlad end as vzhlad
    from public.profil_stranky p
    left join public.stranka s on s.id = p.stranka
    left join public.stranka_program sp on sp.stranka = p.stranka
   where p.ulozeny is not null or p.centralna is not null or p.vzhlad is not null;
grant select on public.profil_stranky_verejny to anon, authenticated;

-- ---------- 2 · príbeh zbierky ----------
create table if not exists public.pribeh_zbierky (
  zbierka     text primary key,                                   -- id zbierky (aj testovacie „z-…")
  stranka     text not null references public.stranka(id) on update cascade,
  koncept     jsonb,                                              -- null = žiadne neuverejnené zmeny
  zverejneny  jsonb,                                              -- to vidí verejnosť
  tyzdna      boolean not null default false,                     -- Príbeh týždňa
  upravene    timestamptz not null default now(),
  upravil     uuid default public.moj_ucet() references public.ucet(id) on delete set null,
  -- citát sa nesmie zverejniť bez súhlasu osoby
  constraint pribeh_citat_suhlas check (
    zverejneny is null
    or coalesce(nullif(trim(zverejneny->'citat'->>'text'), ''), '') = ''
    or coalesce((zverejneny->'citat'->>'suhlas')::boolean, false)
  )
);
create index if not exists pribeh_zbierky_stranka_idx on public.pribeh_zbierky (stranka);
create unique index if not exists pribeh_tyzdna_jeden on public.pribeh_zbierky (stranka) where tyzdna;

-- zapnutie Príbehu týždňa vypne ostatné príbehy tej istej stránky (v tej istej transakcii)
create or replace function public.pribeh_tyzdna_jeden() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.upravene := now();
  if new.tyzdna and (tg_op = 'INSERT' or not old.tyzdna) then
    update public.pribeh_zbierky set tyzdna = false
     where stranka = new.stranka and zbierka <> new.zbierka and tyzdna;
  end if;
  return new;
end $$;
drop trigger if exists pribeh_tyzdna_jeden on public.pribeh_zbierky;
create trigger pribeh_tyzdna_jeden before insert or update on public.pribeh_zbierky
  for each row execute function public.pribeh_tyzdna_jeden();

alter table public.pribeh_zbierky enable row level security;
drop policy if exists spravca_citat on public.pribeh_zbierky;
create policy spravca_citat on public.pribeh_zbierky for select to authenticated
  using (public.spravujem_stranku(stranka));
drop policy if exists spravca_pisat on public.pribeh_zbierky;
create policy spravca_pisat on public.pribeh_zbierky for insert to authenticated
  with check (public.spravujem_stranku(stranka));
drop policy if exists spravca_upravit on public.pribeh_zbierky;
create policy spravca_upravit on public.pribeh_zbierky for update to authenticated
  using (public.spravujem_stranku(stranka)) with check (public.spravujem_stranku(stranka));
-- mazanie nie (príbeh sa len prepíše alebo zruší zverejnenie)

-- verejnosť: len zverejnený obsah (koncept nikdy)
create or replace view public.pribeh_zbierky_verejny as
  select zbierka, stranka, zverejneny, tyzdna, upravene
    from public.pribeh_zbierky
   where zverejneny is not null;
grant select on public.pribeh_zbierky_verejny to anon, authenticated;

commit;
