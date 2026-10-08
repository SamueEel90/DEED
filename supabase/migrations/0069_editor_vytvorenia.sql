-- ============================================================
-- 0069 · KARTA 57 F · OPRAVY 172 — štatistika Editora oznámení
-- Každé uloženie z editora (hotovo, doplnené), vlastné parte nahraté v Pohrebe, tlač (A4/A5) a stiahnutý
-- obrázok = jeden riadok v editor_vytvorenia. Cieľ: ktoré šablóny a typy sa používajú, kde je záujem.
-- Prehľad len pre DEED (service_role) — appka do tabuľky len zapisuje cez editor_zapis(), nikdy nečíta.
-- Čas a autor = server (now(), moj_ucet()), klient ich nevie podvrhnúť.
-- ============================================================

create table if not exists public.editor_vytvorenia (
  id             bigint generated always as identity primary key,
  cas            timestamptz not null default now(),
  udalost        text not null check (udalost in ('hotovo', 'doplnene', 'vlastne', 'tlac', 'obrazok')),
  typ            text not null check (typ in ('parte', 'svadba', 'jubileum', 'blahozelanie')),
  sablona        text,
  rezim          text check (rezim in ('rychly', 'plny')),
  qr             boolean not null default false,
  qr_umiestnenie text check (qr_umiestnenie in ('vnutri', 'pas')),
  vlastne        boolean not null default false,
  qr_miesto      text check (qr_miesto in ('pod', 'rohy')),
  papier         text check (papier in ('A4', 'A5')),
  kto            text not null check (kto in ('veriaci', 'overovatel', 'farar')),
  stranka_typ    text,
  stranka        text,
  pri_zbierke    boolean not null default false,
  autor_ucet     uuid,
  -- OPRAVY 173: QR len pri parte
  constraint editor_vytvorenia_qr_len_parte check (typ = 'parte' or (not qr and qr_umiestnenie is null and qr_miesto is null))
);
create index if not exists editor_vytvorenia_cas_idx on public.editor_vytvorenia (cas);
create index if not exists editor_vytvorenia_typ_idx on public.editor_vytvorenia (typ, sablona);

alter table public.editor_vytvorenia enable row level security;
-- žiadne politiky: anon ani authenticated nečítajú ani nepíšu priamo
revoke all on table public.editor_vytvorenia from anon, authenticated;

create or replace function public.editor_zapis(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_typ text := p->>'typ';
  v_qr  boolean := coalesce((p->>'qr')::boolean, false) and (p->>'typ') = 'parte';
begin
  if auth.uid() is null then raise exception 'neprihlaseny'; end if;
  insert into public.editor_vytvorenia
    (udalost, typ, sablona, rezim, qr, qr_umiestnenie, vlastne, qr_miesto, papier, kto, stranka_typ, stranka, pri_zbierke, autor_ucet)
  values (
    p->>'udalost', v_typ, left(p->>'sablona', 60), p->>'rezim', v_qr,
    case when v_qr then p->>'qr_umiestnenie' end,
    coalesce((p->>'vlastne')::boolean, false),
    case when v_qr then p->>'qr_miesto' end,
    p->>'papier', p->>'kto', left(p->>'stranka_typ', 30), left(p->>'stranka', 120),
    coalesce((p->>'pri_zbierke')::boolean, false), public.moj_ucet()
  );
end;
$$;
revoke all on function public.editor_zapis(jsonb) from public;
grant execute on function public.editor_zapis(jsonb) to authenticated, service_role;

-- prehľad pre DEED: podľa mesiaca, sektora (typ stránky), typu a šablóny
create or replace view public.v_editor_vytvorenia_mesiac as
  select date_trunc('month', cas) as mesiac, coalesce(stranka_typ, '—') as sektor, typ, coalesce(sablona, '—') as sablona,
         count(*) filter (where udalost in ('hotovo', 'vlastne')) as vytvorene,
         count(*) filter (where udalost = 'doplnene') as doplnene,
         count(*) filter (where udalost = 'tlac') as tlac,
         count(*) filter (where udalost = 'obrazok') as obrazky,
         count(*) filter (where qr) as s_qr,
         count(*) filter (where pri_zbierke) as pri_zbierke
  from public.editor_vytvorenia
  group by 1, 2, 3, 4;
revoke all on table public.v_editor_vytvorenia_mesiac from anon, authenticated;
