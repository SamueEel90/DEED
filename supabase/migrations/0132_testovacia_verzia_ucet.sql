-- ============================================================
-- 0132 · OPRAVY 416 (charita) — v testovacej verzii overenie účtu neblokuje spustenie zbierky
-- ------------------------------------------------------------
-- Doteraz (0044, 0079) sa zbierka zapečatila len s účtom overeným pre stránku, výnimka len pre stránku s testovacia = true.
-- Charita založená v testovacej verzii (bod 402, bez Didit a bez overovacej platby) má testovacia = false → „Účet zbierky
-- nie je overený pre túto stránku“ a zbierka sa nedala spustiť.
-- Teraz kontrolu preskočí aj testovacia verzia celej appky (ledger_prepinac „testovacia_pokladna“ = true, ako 0108).
-- Pri ostrom štarte sa prepínač vypne a kontrola platí ako v 0044. Telo 1 : 1 ako 0079, pribudol jeden riadok.
-- ============================================================
begin;

create or replace function public.zbierka_overeny_ucet() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_iban text := public.norm_iban(new.nastavenie->>'ucet');
begin
  if new.zapecatena is null or new.stranka is null then return new; end if;
  if tg_op = 'UPDATE' and old.zapecatena is not null then return new; end if;     -- zámok rieši 0041
  if exists (select 1 from public.stranka where id = new.stranka and testovacia) then return new; end if;  -- OPRAVY 198
  if coalesce((select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna'), false) then return new; end if;  -- OPRAVY 416
  if v_iban = '' or not exists (select 1 from public.overenie_uctu
                                 where stranka = new.stranka and public.norm_iban(iban) = v_iban and stav = 'overeny') then
    raise exception 'Účet zbierky nie je overený pre túto stránku.' using errcode = '42501', detail = 'ucet_neovereny';
  end if;
  return new;
end $$;

commit;
