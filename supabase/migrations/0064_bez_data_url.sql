-- ============================================================
-- 0064 · Zadanie 5 · 5.5 — fotky a plagáty do Storage, v DB len URL
-- ------------------------------------------------------------
-- profil_stranky, oznam_charity, zbierka: zápis, ktorý PRIDÁ data URL („data:…;base64,"), sa odmietne.
-- Appka obrázky pred zápisom nahrá do Storage (bucket prispevky, vzor 0020) a pošle URL.
-- Staré riadky s data URL ostávajú čitateľné a dajú sa upraviť (počet data URL nesmie rásť);
-- prevedú sa samé pri najbližšom uložení z appky.
-- ============================================================
begin;

create or replace function public.pocet_data_url(t text) returns int
  language sql immutable set search_path = public, extensions as $$
  select (length(coalesce(t, '')) - length(replace(coalesce(t, ''), ';base64,', ''))) / 8
$$;

create or replace function public.bez_data_url() returns trigger
  language plpgsql set search_path = public, extensions as $$
declare v_novy int := public.pocet_data_url(row_to_json(new)::text); v_stary int := 0;
begin
  if tg_op = 'UPDATE' then v_stary := public.pocet_data_url(row_to_json(old)::text); end if;
  if v_novy > v_stary then
    raise exception 'Fotky patria do úložiska, nie do databázy.' using errcode = '22023', detail = 'data_url';
  end if;
  return new;
end $$;

drop trigger if exists bez_data_url on public.profil_stranky;
create trigger bez_data_url before insert or update on public.profil_stranky for each row execute function public.bez_data_url();
drop trigger if exists bez_data_url on public.oznam_charity;
create trigger bez_data_url before insert or update on public.oznam_charity for each row execute function public.bez_data_url();
drop trigger if exists bez_data_url on public.zbierka;
create trigger bez_data_url before insert or update on public.zbierka for each row execute function public.bez_data_url();

commit;
