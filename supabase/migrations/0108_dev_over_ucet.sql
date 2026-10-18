-- ============================================================
-- 0108 · OPRAVY 354 — „Simulovať prijatú platbu (DEV)“ zapíše overenie účtu na server
-- ------------------------------------------------------------
-- Doteraz DEV tlačidlo menilo stav len v pamäti appky a kontrola každých 5 s (nacitajOverenie) ho prepísala
-- späť na „čaká“ → karta Účet farnosti aj krok „Overiť účet“ ostávali neoverené.
-- dev_over_ucet(stránka, iban) — len správca stránky a len v testovacej verzii
-- (ledger_prepinac „testovacia_pokladna“ = true, ako testovacie_dobitie; pri ostrom štarte sa vypne)
-- alebo na testovacej stránke. Nastaví čakajúcu žiadosť na „overeny“ (majiteľ „TEST“). Vráti true, keď niečo zmenila.
-- ============================================================
begin;

create or replace function public.dev_over_ucet(p_stranka text, p_iban text) returns boolean
  language plpgsql volatile security definer set search_path = public as $$
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  if not (coalesce((select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna'), false)
          or exists (select 1 from public.stranka where id = p_stranka and testovacia)) then
    raise exception 'len_testovacia' using errcode = '42501';
  end if;
  update public.overenie_uctu set stav = 'overeny', overene = now(), majitel = coalesce(majitel, 'TEST')
   where stranka = p_stranka and public.norm_iban(iban) = public.norm_iban(p_iban) and stav = 'caka';
  return found;
end $$;
revoke all on function public.dev_over_ucet(text, text) from public;
grant execute on function public.dev_over_ucet(text, text) to authenticated;

commit;
