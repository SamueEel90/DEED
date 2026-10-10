-- ============================================================
-- 0079 · OPRAVY 198 — pohrebná zbierka na testovacej stránke sa dá zapečatiť bez overeného účtu
-- Doteraz trigger zbierka_overeny_ucet (0044) pustil zapečatenie len s účtom overeným pre stránku, aj na testovacej
-- stránke → „Účet zbierky nie je overený“ až po podržaní a zbierka sa nedala otestovať.
-- Teraz: stránka s testovacia = true kontrolu preskočí. Ostrá stránka bez zmeny (appka ukáže kartu „Overiť účet ›“ vopred).
-- Telo 1 : 1 ako 0044, pribudol len riadok pre testovaciu stránku.
-- ============================================================
begin;

create or replace function public.zbierka_overeny_ucet() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_iban text := public.norm_iban(new.nastavenie->>'ucet');
begin
  if new.zapecatena is null or new.stranka is null then return new; end if;
  if tg_op = 'UPDATE' and old.zapecatena is not null then return new; end if;     -- zámok rieši 0041
  if exists (select 1 from public.stranka where id = new.stranka and testovacia) then return new; end if;  -- OPRAVY 198
  if v_iban = '' or not exists (select 1 from public.overenie_uctu
                                 where stranka = new.stranka and public.norm_iban(iban) = v_iban and stav = 'overeny') then
    raise exception 'Účet zbierky nie je overený pre túto stránku.' using errcode = '42501', detail = 'ucet_neovereny';
  end if;
  return new;
end $$;

commit;
