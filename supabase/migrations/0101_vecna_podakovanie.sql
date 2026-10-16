-- ============================================================
-- 0101 · OPRAVY 320 doplnok — poďakovanie darcom vecnej zbierky
-- ------------------------------------------------------------
-- vecna_podakuj(stránka, zbierka, text) — len správca stránky. Každý, kto sa do vecnej zbierky zapísal
--   (vecny_dar, 0100), dostane raz upozornenie do zvončeka (+ push, keď má zariadenie):
--   „Poďakovanie · {názov zbierky}“, text poďakovania, ťuk → stránka farnosti s detailom zbierky (odkaz vz:stránka:zbierka).
--   Najviac raz za zbierku (pripomienka_odoslana, zdroj „vzd:…“); druhé volanie = chyba uz_poslane.
-- Vráti počet príjemcov (bez toho, kto posiela).
-- ============================================================
begin;

create or replace function public.vecna_podakuj(p_stranka text, p_zbierka text, p_text text) returns int
  language plpgsql volatile security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); z jsonb; v_n int;
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  z := public.vecna_zbierka(p_stranka, p_zbierka);
  if z is null then raise exception 'zbierka_neexistuje' using errcode = 'P0002'; end if;
  insert into public.pripomienka_odoslana (zdroj) values ('vzd:' || p_stranka || ':' || p_zbierka) on conflict do nothing;
  if not found then raise exception 'uz_poslane' using errcode = '23505'; end if;
  insert into public.notifikacia (ucet_id, kat, ikona, titul, text, odkaz, push)
    select d.ucet_id, 'socialne', 'srd', left('Poďakovanie · ' || coalesce(nullif(trim(z->>'nazov'), ''), 'vecná zbierka'), 200),
           nullif(left(trim(coalesce(p_text, '')), 500), ''), 'vz:' || p_stranka || ':' || p_zbierka,
           exists (select 1 from public.push_odber p where p.ucet_id = d.ucet_id)
      from (select distinct v.ucet_id from public.vecny_dar v where v.stranka = p_stranka and v.zbierka = p_zbierka and v.ucet_id <> v_ja) d;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.vecna_podakuj(text, text, text) from public;
grant execute on function public.vecna_podakuj(text, text, text) to authenticated;

commit;
