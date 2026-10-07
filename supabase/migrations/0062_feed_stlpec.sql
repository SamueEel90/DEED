-- ============================================================
-- 0062 · Zadanie 5 · 5.7 — jsonb disciplína: kam príspevok patrí = stĺpec s constraintom
-- ------------------------------------------------------------
-- Feedy sa doteraz delili kľúčmi v jsonb (data->>comp / akt / help). Stĺpec modul to nevyjadrí:
-- Aktivity aj Help majú riadky s modul good / help / charity / workshop (modul = téma, nie feed).
-- Preto nový povinný stĺpec feed: domov | charita | aktivity | help. Staré riadky sa doplnia
-- z kľúčov; kým appka posiela kľúče v data, trigger z nich feed dopočíta.
-- ============================================================
begin;

alter table public.prispevok add column if not exists feed text;
update public.prispevok set feed = case when data ? 'comp' then 'charita' when data ? 'akt' then 'aktivity'
                                        when data ? 'help' then 'help' else 'domov' end
 where feed is null;
alter table public.prispevok alter column feed set default 'domov';
alter table public.prispevok alter column feed set not null;
alter table public.prispevok drop constraint if exists prispevok_feed_check;
alter table public.prispevok add constraint prispevok_feed_check check (feed in ('domov', 'charita', 'aktivity', 'help'));
create index if not exists prispevok_feed_cas_idx on public.prispevok (feed, vytvorene desc);
grant select (feed) on public.prispevok to anon, authenticated;

-- prechodne: kľúč v data určí feed (appka ho dnes posiela pri Help)
create or replace function public.prispevok_feed_z_data() returns trigger
  language plpgsql set search_path = public, extensions as $$
begin
  if new.data ? 'comp' then new.feed := 'charita';
  elsif new.data ? 'akt' then new.feed := 'aktivity';
  elsif new.data ? 'help' then new.feed := 'help';
  end if;
  return new;
end $$;
drop trigger if exists prispevok_feed_z_data on public.prispevok;
create trigger prispevok_feed_z_data before insert or update of data on public.prispevok
  for each row execute function public.prispevok_feed_z_data();

-- verejný pohľad dostane stĺpec feed (na koniec, ostatné bez zmeny)
create or replace view public.prispevok_feed as
 SELECT p.id, p.cislo, p.autor_ucet_id, p.autor_nazov, p.autor_ini, p.autor_pfp, p.autor_karma, p.modul, p.typ, p.kat,
    p.titul, p.popis, p.emoji, p.media,
    round(p.lat::numeric, 2)::double precision AS lat,
    round(p.lng::numeric, 2)::double precision AS lng,
    p.mesto, p.stvrt, p.lok, p.narodne, p.typ_situacie, p.skore, p.overene, p.topovane, p.vyznam, p.ciel,
    p.pomocnici, p.lajky, p.data, p.vytvorene, p.aktualizovane, p.ukoncene,
    v.vyzbierane_eur AS vyzbierane,
    COALESCE(v.vyzbierane_deed, 0::numeric) AS vyzbierane_deed,
    COALESCE(v.pocet_darov, 0::bigint)::integer AS podpora_count,
    p.feed
   FROM prispevok p
     LEFT JOIN v_vyzbierane v ON v.case_id = p.id;

commit;
