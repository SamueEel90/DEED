-- ============================================================
-- 0044 · Zadanie 3 · 3.6 (časť 2) — IBAN zbierky smie prísť LEN z overenia účtu
-- ------------------------------------------------------------
-- overenie_uctu.zdroj: 'platba' (0,01 € s kódom), 'registracia' (hlavný účet organizácie z registrácie,
-- zapíše ho server pri KYB „overená"), 'testovaci' (testovacie stránky z 0035, pri ostrom štarte preč).
-- Pri zapečatení zbierky stránky musí byť účet v nastavení (nastavenie.ucet) pre túto stránku overený —
-- inak sa zbierka nespustí. Voľný text v jsonb už účet neurčuje.
-- Hlavný účet po KYB klient nezmení (organizacia.bankovy_ucet) — iný účet len cez overenie 0,01 €.
-- ============================================================
begin;

alter table public.overenie_uctu add column if not exists zdroj text not null default 'platba';
alter table public.overenie_uctu drop constraint if exists overenie_uctu_zdroj_check;
alter table public.overenie_uctu add constraint overenie_uctu_zdroj_check check (zdroj in ('platba', 'registracia', 'testovaci'));

create or replace function public.norm_iban(p text) returns text
  language sql immutable as $$ select upper(regexp_replace(coalesce(p, ''), '\s', '', 'g')) $$;

-- hlavný účet organizácie → overený účet každej jej stránky (len po KYB „overená")
create or replace function public.prenes_hlavny_ucet(p_org uuid) returns void
  language plpgsql security definer set search_path = public as $$
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

create or replace function public.kyb_prenes_ucet() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.vysledok = 'overena' then perform public.prenes_hlavny_ucet(new.org_ucet_id); end if;
  return null;
end $$;
drop trigger if exists kyb_prenes_ucet on public.kyb;
create trigger kyb_prenes_ucet after insert or update of vysledok on public.kyb
  for each row execute function public.kyb_prenes_ucet();

create or replace function public.stranka_prenes_ucet() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  perform public.prenes_hlavny_ucet(new.ucet_id);
  return null;
end $$;
drop trigger if exists stranka_prenes_ucet on public.stranka;
create trigger stranka_prenes_ucet after insert on public.stranka
  for each row execute function public.stranka_prenes_ucet();

-- hlavný účet po KYB klient nezmení
create or replace function public.organizacia_ucet_strazca() returns trigger
  language plpgsql as $$
begin
  if public.zapis_klienta()
     and public.norm_iban(new.bankovy_ucet) is distinct from public.norm_iban(old.bankovy_ucet)
     and exists (select 1 from public.kyb where org_ucet_id = old.ucet_id and vysledok = 'overena') then
    raise exception 'Hlavný účet je overený — iný účet pridajte cez overenie 0,01 €.' using errcode = '42501', detail = 'hlavny_ucet_overeny';
  end if;
  return new;
end $$;
drop trigger if exists organizacia_ucet_strazca on public.organizacia;
create trigger organizacia_ucet_strazca before update on public.organizacia
  for each row execute function public.organizacia_ucet_strazca();

-- testovacie stránky: testovací overený hlavný účet (ten istý, ktorý ukazuje appka)
insert into public.overenie_uctu (stranka, iban, kod, stav, overene, zdroj)
  select s.id, public.norm_iban('SK31 0900 0000 0051 2233 4417'), 'TEST-' || s.id, 'overeny', now(), 'testovaci'
    from public.stranka s where s.testovacia
on conflict (stranka, iban) do nothing;

-- pri zapečatení zbierky stránky musí byť účet overený pre túto stránku
create or replace function public.zbierka_overeny_ucet() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_iban text := public.norm_iban(new.nastavenie->>'ucet');
begin
  if new.zapecatena is null or new.stranka is null then return new; end if;
  if tg_op = 'UPDATE' and old.zapecatena is not null then return new; end if;     -- zámok rieši 0041
  if v_iban = '' or not exists (select 1 from public.overenie_uctu
                                 where stranka = new.stranka and public.norm_iban(iban) = v_iban and stav = 'overeny') then
    raise exception 'Účet zbierky nie je overený pre túto stránku.' using errcode = '42501', detail = 'ucet_neovereny';
  end if;
  return new;
end $$;
drop trigger if exists zbierka_overeny_ucet on public.zbierka;
create trigger zbierka_overeny_ucet before insert or update on public.zbierka
  for each row execute function public.zbierka_overeny_ucet();

commit;
