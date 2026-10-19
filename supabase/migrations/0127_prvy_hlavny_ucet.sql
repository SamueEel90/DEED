-- ============================================================
-- 0127 · registrácia charity — prvý hlavný účet (IBAN) sa smie zapísať aj po KYB
-- ------------------------------------------------------------
-- Registrácia (CharitaB) ide: IČO → štatutár → stanovy (KYB „overená“) → profil s IBAN. Strážca z 0044
-- („hlavný účet po KYB klient nezmení“) bral aj prvý zápis IBAN ako zmenu, takže krok profilu vždy padol
-- s „Hlavný účet je overený — iný účet pridajte cez overenie 0,01 €.“
--   1. Prvý zápis (doteraz prázdny účet) je povolený. Zmena už zapísaného overeného účtu ostáva zakázaná.
--   2. Po prvom zápise sa hlavný účet prenesie na stránky organizácie ako pri KYB (prenes_hlavny_ucet z 0044).
--   3. prenes_hlavny_ucet: search_path aj so schémou extensions (gen_random_bytes je v Supabase tam) — telo bez zmeny.
-- ============================================================
begin;

create or replace function public.prenes_hlavny_ucet(p_org uuid) returns void
  language plpgsql security definer set search_path = public, extensions as $$
declare v_iban text;
begin
  if not exists (select 1 from public.kyb where org_ucet_id = p_org and vysledok = 'overena') then return; end if;
  select public.norm_iban(bankovy_ucet) into v_iban from public.organizacia where ucet_id = p_org;
  if coalesce(v_iban, '') = '' then return; end if;
  insert into public.overenie_uctu (stranka, iban, kod, stav, overene, zdroj)
    select s.id, v_iban, 'REG-' || encode(gen_random_bytes(6), 'hex'), 'overeny', now(), 'registracia'
      from public.stranka s where s.ucet_id = p_org
  on conflict (stranka, iban) do update set stav = 'overeny', overene = coalesce(public.overenie_uctu.overene, now()), zdroj = 'registracia';
end $$;

create or replace function public.organizacia_ucet_strazca() returns trigger
  language plpgsql as $$
begin
  if public.zapis_klienta()
     and coalesce(public.norm_iban(old.bankovy_ucet), '') <> ''
     and public.norm_iban(new.bankovy_ucet) is distinct from public.norm_iban(old.bankovy_ucet)
     and exists (select 1 from public.kyb where org_ucet_id = old.ucet_id and vysledok = 'overena') then
    raise exception 'Hlavný účet je overený — iný účet pridajte cez overenie 0,01 €.' using errcode = '42501', detail = 'hlavny_ucet_overeny';
  end if;
  return new;
end $$;

create or replace function public.organizacia_prvy_ucet() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.norm_iban(old.bankovy_ucet), '') = '' and coalesce(public.norm_iban(new.bankovy_ucet), '') <> '' then
    perform public.prenes_hlavny_ucet(new.ucet_id);
  end if;
  return null;
end $$;
revoke all on function public.organizacia_prvy_ucet() from public;
drop trigger if exists organizacia_prvy_ucet on public.organizacia;
create trigger organizacia_prvy_ucet after update of bankovy_ucet on public.organizacia
  for each row execute function public.organizacia_prvy_ucet();

commit;
