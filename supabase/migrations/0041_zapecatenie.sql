-- ============================================================
-- 0041 · Zadanie 3 · 3.6 — zapečatená zbierka sa nedá zmeniť ani priamym UPDATE
-- ------------------------------------------------------------
-- Po zapečatení (zbierka.zapecatena) sa už nemení: názov, cieľ, stránka, modul, typ, čas zapečatenia
-- ani parametre v nastavení (suma, účet, dĺžka, účel, lehota, typ, pravidelná podpora …).
-- Meniť sa smie len to, čo karta 48 dovoľuje: text pre darcov (popis, popis2), galéria (media)
-- a rýchle sumy (sada, eurc, sadaE) — plus životný cyklus (stav, doklady, poďakovanie).
-- Platí pre každého (aj server) — zámok je v databáze, nie v appke. Zmazať zapečatenú zbierku nejde.
-- ============================================================
begin;

create or replace function public.zbierka_pecat() returns trigger
  language plpgsql as $$
declare v_volne text[] := array['popis', 'popis2', 'media', 'sada', 'eurc', 'sadaE'];
begin
  if old.zapecatena is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    raise exception 'Zapečatenú zbierku nemožno zmazať.' using errcode = '42501', detail = 'zapecatene';
  end if;
  if new.zapecatena is distinct from old.zapecatena
     or new.nazov is distinct from old.nazov
     or new.ciel is distinct from old.ciel
     or new.stranka is distinct from old.stranka
     or new.modul is distinct from old.modul
     or new.typ is distinct from old.typ
     or (coalesce(new.nastavenie, '{}'::jsonb) - v_volne) is distinct from (coalesce(old.nastavenie, '{}'::jsonb) - v_volne) then
    raise exception 'Zbierka je zapečatená — tento údaj sa už nedá zmeniť.' using errcode = '42501', detail = 'zapecatene';
  end if;
  return new;
end $$;

drop trigger if exists zbierka_pecat on public.zbierka;
create trigger zbierka_pecat before update or delete on public.zbierka
  for each row execute function public.zbierka_pecat();

commit;
