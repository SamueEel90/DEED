-- ============================================================
-- 0036 · Zadanie 1 · Blok 1 (identita) — odosielateľ platby = MOJ účet
--
-- platba_create / qr_split_pay sú security definer a volá ich klient (anon, authenticated).
-- Parameter p_odosielatel (uuid účtu) doteraz nikto neoveroval → klient mohol zapísať
-- platbu (a cez trigger aj podporu, rebríček…) na cudzí účet.
-- Odteraz: keď platbu zakladá klient, odosielateľ je buď NULL (anonymný dar), alebo
-- presne moj_ucet(). Server (cron, service_role, postgres) sa nekontroluje.
--
-- p_odosielatel_text / platba.odosielatel_text → podpora.darca_nazov je LEN zobrazovací
-- snapshot mena (0035 · bod 3); väzba ide výhradne cez odosielatel → podpora.ucet_id.
-- ============================================================
begin;

create or replace function public.platba_odosielatel_strazca() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.odosielatel is not null
     and coalesce(current_setting('role', true), '') in ('anon', 'authenticated')
     and new.odosielatel is distinct from public.moj_ucet() then
    raise exception 'cudzi_odosielatel' using errcode = '42501',
      hint = 'Platbu možno zapísať len na vlastný účet (moj_ucet) alebo anonymne.';
  end if;
  return new;
end $$;

drop trigger if exists platba_odosielatel_strazca on public.platba;
create trigger platba_odosielatel_strazca
  before insert or update of odosielatel on public.platba
  for each row execute function public.platba_odosielatel_strazca();

comment on column public.platba.odosielatel_text is
  'Len zobrazovací snapshot mena darcu (0036). Identita = odosielatel (ucet.id), overený voči moj_ucet().';

commit;
