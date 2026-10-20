-- ============================================================
-- 0134 · OPRAVY 428 — verejné číslo objektu (= VS) pri vzniku každého objektu s protihodnotou
-- ------------------------------------------------------------
-- Tá istá rada ako zbierka (0049) a doklady: public.novy_doklad() — 9 číslic zo sekvencie + Luhn, nikdy sa nerecykluje.
-- Prideľuje LEN server v tej istej transakcii, v ktorej objekt vzniká (klient si číslo nevymyslí), raz pridelené sa nemení.
--   prispevok (skutok S · žiadosť H · ponuka O)      — každý, not null + unique
--   stranka (stránka subjektu C)                      — každá, not null + unique
--   skutok_stranky (skutok charity S, 0133)           — každý, not null + unique
--   iskra (I)                                         — len Iskra so zbierkou (check)
--   oznam_subjektu kategória „inzerat“ (práca O)      — len pracovná ponuka, oznamy číslo nedostávajú (check)
-- Existujúce objekty dostanú číslo hneď tu.
-- ============================================================
begin;

-- raz pridelené číslo sa nemení (ani serverom)
create or replace function public.cislo_objektu_pevne() returns trigger
  language plpgsql as $$
begin
  if old.vs is not null and new.vs is distinct from old.vs then
    raise exception 'Číslo objektu sa nedá zmeniť.' using errcode = '42501', detail = 'vs_pevne';
  end if;
  return new;
end $$;

-- pri vzniku: číslo pridelí server (z appky vždy, inak keď chýba); TG_ARGV[0] = podmienka, či objekt číslo dostáva
create or replace function public.cislo_objektu_server() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_ma boolean := true;
begin
  if tg_argv[0] = 'iskra' then v_ma := (to_jsonb(new) ->> 'zbierka') is not null;
  elsif tg_argv[0] = 'inzerat' then v_ma := (to_jsonb(new) ->> 'kategoria') = 'inzerat';
  end if;
  if not v_ma then new.vs := null;
  elsif public.zapis_klienta() or new.vs is null then new.vs := public.novy_doklad();
  end if;
  return new;
end $$;

do $$
declare t text; a text;
begin
  foreach t in array array['prispevok', 'stranka', 'skutok_stranky', 'iskra', 'oznam_subjektu'] loop
    a := case t when 'iskra' then 'iskra' when 'oznam_subjektu' then 'inzerat' else 'vsetko' end;
    execute format('alter table public.%I add column if not exists vs text', t);
    execute format('drop trigger if exists %I on public.%I', t || '_vs_server', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.cislo_objektu_server(%L)', t || '_vs_server', t, a);
    execute format('drop trigger if exists %I on public.%I', t || '_vs_pevne', t);
    execute format('create trigger %I before update of vs on public.%I for each row execute function public.cislo_objektu_pevne()', t || '_vs_pevne', t);
    execute format('create unique index if not exists %I on public.%I (vs)', t || '_vs_key', t);
  end loop;
end $$;

-- existujúce objekty
update public.prispevok set vs = public.novy_doklad() where vs is null;
update public.stranka set vs = public.novy_doklad() where vs is null;
update public.skutok_stranky set vs = public.novy_doklad() where vs is null;
update public.iskra set vs = public.novy_doklad() where vs is null and zbierka is not null;
update public.oznam_subjektu set vs = public.novy_doklad() where vs is null and kategoria = 'inzerat';

-- objekt bez čísla nesmie vzniknúť
alter table public.prispevok alter column vs set not null;
alter table public.stranka alter column vs set not null;
alter table public.skutok_stranky alter column vs set not null;
alter table public.iskra drop constraint if exists iskra_vs_so_zbierkou;
alter table public.iskra add constraint iskra_vs_so_zbierkou check (zbierka is null or vs is not null);
alter table public.oznam_subjektu drop constraint if exists oznam_subjektu_vs_inzerat;
alter table public.oznam_subjektu add constraint oznam_subjektu_vs_inzerat check (kategoria <> 'inzerat' or vs is not null);

-- verejný pohľad feedu dostane číslo (na koniec, ostatné bez zmeny)
grant select (vs) on public.prispevok to anon, authenticated;
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
    p.feed,
    p.vs
   FROM prispevok p
     LEFT JOIN v_vyzbierane v ON v.case_id = p.id;

commit;
