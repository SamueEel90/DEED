-- ============================================================
-- 0087 · KARTA 63 — Upozornenia z farnosti
-- ------------------------------------------------------------
-- 1. bloky — o čom chce sledujúci vedieť (prepínače podľa blokov stránky). Kódy:
--    oz Oznamy farnosti · om Zmeny a zrušenia omší · pr Príď a zaži · po Pomôž · de Deti a mládež
--    te Teš sa s nami · sp Spomíname · mo Modli sa s nami · ve Od veriacich · zb Zbierky
--    Predvolené: oz, om, sp (pri kostole oz, om — kostol nemá Spomíname).
--    moje_farnosti.bloky (domovská aj sledovaná farnosť) a moje_kostoly.bloky (sledovaný kostol).
--    Mení sa len cez nastav_bloky() (tabuľky nemajú grant update).
-- 2. sledujuci_blokov(stranka) — správca vidí pri zverejnení „Pošle sa N ľuďom, ktorí sledujú …“:
--    počty po (miesto, blok); miesto null = farnosť (domovská aj sledovaná).
-- Doručenie (zvonček v appke a push, najviac 1 súhrn denne, zrušená omša a parte hneď) robí server neskôr.
-- E-maily z farnosti veriacim sa neposielajú (Martin 13. 10.).
-- ============================================================
begin;

create or replace function public.bloky_ok(p text[]) returns boolean language sql immutable as $$
  select coalesce(p <@ array['oz','om','pr','po','de','te','sp','mo','ve','zb']::text[], false)
$$;

alter table public.moje_farnosti add column if not exists bloky text[] not null default array['oz','om','sp']::text[];
alter table public.moje_kostoly  add column if not exists bloky text[] not null default array['oz','om']::text[];
alter table public.moje_farnosti drop constraint if exists moje_farnosti_bloky_ok;
alter table public.moje_farnosti add constraint moje_farnosti_bloky_ok check (public.bloky_ok(bloky));
alter table public.moje_kostoly drop constraint if exists moje_kostoly_bloky_ok;
alter table public.moje_kostoly add constraint moje_kostoly_bloky_ok check (public.bloky_ok(bloky));

-- nastaví bloky pri farnosti (p_miesto null) alebo pri sledovanom kostole; vráti false, keď to nesleduje
create or replace function public.nastav_bloky(p_stranka text, p_miesto text, p_bloky text[]) returns boolean
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet(); v_b text[] := coalesce(p_bloky, array[]::text[]);
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if not public.bloky_ok(v_b) then raise exception 'zly_blok' using errcode = '22023'; end if;
  if p_miesto is null then
    update public.moje_farnosti set bloky = v_b where ucet_id = v_ja and stranka = p_stranka;
  else
    update public.moje_kostoly set bloky = v_b where ucet_id = v_ja and stranka = p_stranka and miesto = p_miesto;
  end if;
  return found;
end $$;
revoke all on function public.nastav_bloky(text, text, text[]) from public;
grant execute on function public.nastav_bloky(text, text, text[]) to authenticated, service_role;

-- počty sledujúcich po blokoch (len správca stránky); miesto null = farnosť
create or replace function public.sledujuci_blokov(p_stranka text) returns table (miesto text, blok text, pocet bigint)
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.spravujem_stranku(p_stranka) then raise exception 'nie_spravca' using errcode = '42501'; end if;
  return query
    select null::text, b, count(*)::bigint from public.moje_farnosti f, unnest(f.bloky) b where f.stranka = p_stranka group by b
    union all
    select k.miesto, b, count(*)::bigint from public.moje_kostoly k, unnest(k.bloky) b where k.stranka = p_stranka group by k.miesto, b;
end $$;
revoke all on function public.sledujuci_blokov(text) from public;
grant execute on function public.sledujuci_blokov(text) to authenticated, service_role;

commit;
