-- ============================================================
-- 0070 · KARTA 57 F — účty DEED (interný tím) a prehľad štatistiky Editora oznámení v appke
-- deed_admin = zoznam účtov tímu DEED. Zapisuje ho len service_role (Samuel / dashboard), appka ho nevidí.
-- som_deed_admin() = či prihlásený účet patrí tímu (appka podľa toho ukáže interné obrazovky).
-- editor_prehlad() = súhrn editor_vytvorenia podľa mesiaca, sektora, typu a šablóny; iný účet dostane chybu nie_admin.
-- ============================================================

create table if not exists public.deed_admin (
  ucet      uuid primary key references public.ucet (id) on delete cascade,
  pridane   timestamptz not null default now(),
  poznamka  text
);
alter table public.deed_admin enable row level security;
-- žiadne politiky: anon ani authenticated tabuľku nečítajú ani nepíšu
revoke all on table public.deed_admin from anon, authenticated;

create or replace function public.som_deed_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.deed_admin a where a.ucet = public.moj_ucet());
$$;
revoke all on function public.som_deed_admin() from public;
grant execute on function public.som_deed_admin() to authenticated, service_role;

-- p_od / p_do = mesiace vrátane (null = bez hranice)
create or replace function public.editor_prehlad(p_od date default null, p_do date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.som_deed_admin() then raise exception 'nie_admin'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'mesiac', to_char(m.mesiac, 'YYYY-MM'), 'sektor', m.sektor, 'typ', m.typ, 'sablona', m.sablona,
           'vytvorene', m.vytvorene, 'doplnene', m.doplnene, 'tlac', m.tlac, 'obrazky', m.obrazky,
           's_qr', m.s_qr, 'pri_zbierke', m.pri_zbierke)
         order by m.mesiac desc, m.vytvorene desc), '[]'::jsonb)
    into v
    from public.v_editor_vytvorenia_mesiac m
   where (p_od is null or m.mesiac >= date_trunc('month', p_od))
     and (p_do is null or m.mesiac <= date_trunc('month', p_do));
  return v;
end;
$$;
revoke all on function public.editor_prehlad(date, date) from public;
grant execute on function public.editor_prehlad(date, date) to authenticated, service_role;
