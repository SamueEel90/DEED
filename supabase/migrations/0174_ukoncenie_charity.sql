-- ============================================================
-- 0174 · Martin 24. 10. · ukončená zbierka charity je ukončená aj na serveri (1 : 1 ako farnosť)
-- ------------------------------------------------------------
-- 1) obnov_zbierku(id) — „Vrátiť späť“ po ručnom ukončení (ukonci_zbierku, 0104): do 15 minút od zbierka.koniec (0068)
--    smie správca zbierku znova otvoriť; potom 'vratit_neskoro'. Pri charite platí limit zbierok (0172).
-- 2) Centrálna charity: keď centrálna z profilu zmizne (zmazaná / ukončená), jej zbierka na serveri („<stránka>:hlavna“)
--    sa ukončí — dary sa zastavia. Keď sa centrálna znova spustí (nová alebo Vrátiť späť), zbierka sa otvorí;
--    sumy novej centrálnej appka ráta od jej spustenia. Farnosť bez zmeny (jej hlavná zbierka má vlastný tok).
-- 3) Nová verzia oblast_sektora_povolena (0170): charita bez podskupín zo stanov (napr. tester) smie aj hlavnú sekciu
--    číselníka (Zdravie a pacienti, Zvieratá…), nielen podskupinu.
-- Idempotentné.
-- ============================================================
begin;

create or replace function public.obnov_zbierku(p_id text) returns text
  language plpgsql volatile security definer set search_path = public as $$
declare v_ucet uuid := public.moj_ucet(); v_z public.zbierka%rowtype;
begin
  if v_ucet is null then raise exception 'Prihláste sa.' using errcode = '42501'; end if;
  select * into v_z from public.zbierka where id = p_id for update;
  if not found then raise exception 'Zbierka neexistuje.' using errcode = 'P0002'; end if;
  if not (v_z.ucet_id = v_ucet or (v_z.stranka is not null and public.spravujem_stranku(v_z.stranka))) then
    raise exception 'Túto zbierku nespravujete.' using errcode = '42501';
  end if;
  if v_z.stav = 'ukoncena' then
    if v_z.koniec is null or v_z.koniec < now() - interval '15 minutes' then
      raise exception 'vratit_neskoro' using errcode = '22023';
    end if;
    if v_z.stranka is not null then perform public.skontroluj_limit_charity(v_z.stranka, v_z.id); end if;
    update public.zbierka set stav = 'aktivna' where id = p_id;
  end if;
  return (select stav from public.zbierka where id = p_id);
end $$;
revoke all on function public.obnov_zbierku(text) from public, anon;
grant execute on function public.obnov_zbierku(text) to authenticated;

create or replace function public.centralna_charity_stav() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_bola boolean; v_je boolean;
begin
  if not exists (select 1 from public.stranka s where s.id = new.stranka and s.typ = 'charita') then return new; end if;
  v_bola := tg_op = 'UPDATE' and old.centralna->>'spustena' is not null;
  v_je := new.centralna->>'spustena' is not null;
  if v_bola and not v_je then
    update public.zbierka set stav = 'ukoncena', upravene = now() where id = new.stranka || ':hlavna' and stav = 'aktivna';
  elsif v_je and not v_bola then
    update public.zbierka set stav = 'aktivna', upravene = now() where id = new.stranka || ':hlavna' and stav <> 'aktivna';
  end if;
  return new;
end $$;
drop trigger if exists centralna_charity_stav on public.profil_stranky;
create trigger centralna_charity_stav after insert or update of centralna on public.profil_stranky for each row execute function public.centralna_charity_stav();

create or replace function public.oblast_sektora_povolena(p_stranka text, p_oblast text) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.segmenty g join public.stranka s on s.ucet_id = g.org_ucet_id
                  where s.id = p_stranka and g.pod_segment is not null)
      then exists (select 1 from public.segmenty g join public.stranka s on s.ucet_id = g.org_ucet_id
                    where s.id = p_stranka and lower(g.pod_segment) = lower(trim(p_oblast)))
    else exists (select 1 from public.cis_segmenty c where c.aktivny
                  and (lower(c.pod_segment) = lower(trim(p_oblast)) or lower(c.sektor) = lower(trim(p_oblast))))
  end
$$;
revoke all on function public.oblast_sektora_povolena(text, text) from public, anon, authenticated;

commit;
