-- ============================================================
-- 0162 · OPRAVY 511 (balík 47) · Stránka neverejná, kým ju správca nezverejní.
-- 1. stranka.zverejnena (kedy bola stránka zverejnená). Stránka založená v appke = null (neverejná), existujúce = verejné od vytvorenia.
-- 2. stranka_viditelna(stránka): verejná, alebo ju spravujem. Neverejnú stránku a jej obsah vidí len jej správa:
--    riadok stránky, verejný profil, verejné nastavenia (omše, rozloženie), zbierky, príbehy, oznamy, skutky, pripnuté zbierky,
--    výzvy, Iskry a príspevok skutku na Domov. Nie je vo vyhľadávaní, na mape ani v zozname.
-- 3. stranka_pripravuje(stránka): QR a odkaz neverejnej stránky ukážu „Stránka sa pripravuje“ (vracia len áno/nie).
-- 4. Žiadne dary: platba ani vecný dar na zbierku neverejnej stránky neprejde (stranka_neverejna).
--    Sledujúcim nechodia upozornenia — neverejnú stránku nemôže nikto sledovať (nevidí ju).
-- 5. stranka_zverejni(stránka): len plné práva (farár, štatutár, vlastník), raz navždy (späť do prípravy sa nedá).
--    Farnosť: zverejnením sa začne skúšobná doba (nastavenia „predplatne“.start), keď je zapnutý prepínač „skusobna_doba“.
--    Prepínač je teraz zapnutý (na schválenie vzhľadu), v testovacej verzii sa vypne, zapne sa pri ostrom štarte.
-- Spúšťa sa po 0161.
-- ============================================================
begin;

alter table public.stranka add column if not exists zverejnena timestamptz;
update public.stranka set zverejnena = coalesce(vytvorene, now()) where zverejnena is null;
-- stránka, ktorú založí človek v appke, je neverejná; server (seed, správa DEED) zakladá verejnú
alter table public.stranka alter column zverejnena set default now();
create or replace function public.stranka_nova_neverejna() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- požiadavka z appky (rola authenticated, aj cez RPC so security definer); server, seed a testy bežia ako postgres/service_role
  if current_setting('role', true) in ('authenticated', 'anon') then new.zverejnena := null; end if;
  return new;
end $$;
revoke all on function public.stranka_nova_neverejna() from public;
drop trigger if exists stranka_nova_neverejna on public.stranka;
create trigger stranka_nova_neverejna before insert on public.stranka for each row execute function public.stranka_nova_neverejna();
-- zverejnenie mení len stranka_zverejni (raz navždy); appka ho nezapíše ani nezmaže
create or replace function public.stranka_zverejnena_strazca() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.zverejnena is distinct from old.zverejnena and current_setting('role', true) in ('authenticated', 'anon') and current_setting('deed.zverejni', true) is distinct from '1' then
    new.zverejnena := old.zverejnena;
  end if;
  return new;
end $$;
revoke all on function public.stranka_zverejnena_strazca() from public;
drop trigger if exists stranka_zverejnena_strazca on public.stranka;
create trigger stranka_zverejnena_strazca before update on public.stranka for each row execute function public.stranka_zverejnena_strazca();

insert into public.ledger_prepinac values ('skusobna_doba', true) on conflict (kluc) do nothing;

create or replace function public.stranka_viditelna(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select p_stranka is null
      or coalesce((select s.zverejnena is not null from public.stranka s where s.id = p_stranka), true)
      or public.spravujem_stranku(p_stranka)
$$;
grant execute on function public.stranka_viditelna(text) to anon, authenticated;

create or replace function public.stranka_pripravuje(p_stranka text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.stranka s where s.id = p_stranka and s.zverejnena is null)
$$;
grant execute on function public.stranka_pripravuje(text) to anon, authenticated;

-- ---------- riadky a obsah neverejnej stránky vidí len jej správa ----------
drop policy if exists verejne_citat on public.stranka;
create policy verejne_citat on public.stranka for select to anon, authenticated
  using (zverejnena is not null or public.spravujem_stranku(id));

drop policy if exists verejne_citat on public.oznam_charity;
create policy verejne_citat on public.oznam_charity for select to anon, authenticated
  using ((zrusene is null and public.stranka_viditelna(stranka)) or public.spravujem_stranku(stranka));
drop policy if exists verejne_citat on public.oznam_subjektu;
create policy verejne_citat on public.oznam_subjektu for select to anon, authenticated using (public.stranka_viditelna(stranka));
drop policy if exists skutok_stranky_citat on public.skutok_stranky;
create policy skutok_stranky_citat on public.skutok_stranky for select to anon, authenticated
  using ((stiahnuty is null and public.stranka_viditelna(stranka)) or public.spravujem_stranku(stranka));
drop policy if exists pripnute_citat on public.stranka_pripnuta_zbierka;
create policy pripnute_citat on public.stranka_pripnuta_zbierka for select to anon, authenticated using (public.stranka_viditelna(stranka));
drop policy if exists citaj on public.vyzva;
create policy citaj on public.vyzva for select to anon, authenticated using (public.stranka_viditelna(stranka));
drop policy if exists verejne_citat on public.iskra;
create policy verejne_citat on public.iskra for select to anon, authenticated
  using ((zmazane is null and public.stranka_viditelna(stranka)) or autor_ucet = public.moj_ucet());

create or replace view public.profil_stranky_verejny as
SELECT p.stranka,
    p.ulozeny,
    p.ulozeny_cas,
    (p.centralna - 'ucet'::text) AS centralna,
        CASE
            WHEN (s.testovacia OR (s.typ = 'farnost'::text) OR (COALESCE((sp.tier)::integer, 0) > 0)) THEN p.vzhlad
            ELSE NULL::text
        END AS vzhlad
   FROM ((profil_stranky p
     LEFT JOIN stranka s ON ((s.id = p.stranka)))
     LEFT JOIN stranka_program sp ON ((sp.stranka = p.stranka)))
  WHERE (((p.ulozeny IS NOT NULL) OR (p.centralna IS NOT NULL) OR (p.vzhlad IS NOT NULL))) AND public.stranka_viditelna(p.stranka);

create or replace view public.nastavenia_stranky_verejne as
SELECT stranka,
    verejne
   FROM nastavenia_stranky
  WHERE ((verejne <> '{}'::jsonb)) AND public.stranka_viditelna(stranka);

create or replace view public.pribeh_zbierky_verejny as
SELECT zbierka,
    stranka,
    zverejneny,
    tyzdna,
    upravene
   FROM pribeh_zbierky
  WHERE ((zverejneny IS NOT NULL)) AND public.stranka_viditelna(stranka);

create or replace view public.zbierka_verejna as
SELECT id,
    stranka,
    vs,
    stav,
    zapecatena,
    vytvorene,
    ((((((nastavenie - 'iban'::text) - 'ucet'::text) - 'rozdelenie'::text) - 'overenie_prijemcu'::text) #- '{farnost,prijemca,ucet}'::text[]) #- '{farnost,podiel}'::text[]) AS nastavenie
   FROM zbierka z
  WHERE (((stranka IS NOT NULL) AND (zapecatena IS NOT NULL))) AND public.stranka_viditelna(stranka);

create or replace view public.v_zbierky_na_pripnutie with (security_invoker = false) as
SELECT z.id,
    z.nazov,
    s.id AS stranka,
    s.nazov AS kto,
    'charita'::text AS zdroj,
    z.ciel,
    z.vytvorene,
    COALESCE(( SELECT sum(v.vyzbierane) AS sum
           FROM v_zbierka_vyzbierane v
          WHERE ((v.zbierka = z.id) AND (v.mena = 'EUR'::text))), (0)::numeric) AS vyzbierane,
    COALESCE(( SELECT sum(v.darov) AS sum
           FROM v_zbierka_vyzbierane v
          WHERE (v.zbierka = z.id)), (0)::numeric) AS darov
   FROM (zbierka z
     JOIN stranka s ON ((s.id = z.stranka)))
  WHERE (((z.zapecatena IS NOT NULL) AND (z.stav = 'aktivna'::text) AND (s.typ <> 'farnost'::text) AND (COALESCE(z.typ, ''::text) <> ALL (ARRAY['hlavna'::text, 'sektor'::text])))) AND s.zverejnena IS NOT NULL;

create or replace view public.prispevok_feed as
SELECT p.id,
    p.cislo,
    p.autor_ucet_id,
    p.autor_nazov,
    p.autor_ini,
    p.autor_pfp,
    p.autor_karma,
    p.modul,
    p.typ,
    p.kat,
    p.titul,
    p.popis,
    p.emoji,
    p.media,
    (round((p.lat)::numeric, 2))::double precision AS lat,
    (round((p.lng)::numeric, 2))::double precision AS lng,
    p.mesto,
    p.stvrt,
    p.lok,
    p.narodne,
    p.typ_situacie,
    p.skore,
    p.overene,
    p.topovane,
    p.vyznam,
    p.ciel,
    p.pomocnici,
    p.lajky,
    p.data,
    p.vytvorene,
    p.aktualizovane,
    p.ukoncene,
    v.vyzbierane_eur AS vyzbierane,
    COALESCE(v.vyzbierane_deed, (0)::numeric) AS vyzbierane_deed,
    (COALESCE(v.pocet_darov, (0)::bigint))::integer AS podpora_count,
    p.feed,
    p.vs,
    ( SELECT s.stranka
           FROM skutok_stranky s
          WHERE (((s.data ->> 'prispevokId'::text) = (p.id)::text) AND (s.stiahnuty IS NULL))
          ORDER BY s.vytvorene
         LIMIT 1) AS stranka
   FROM (prispevok p
     LEFT JOIN v_vyzbierane v ON ((v.case_id = p.id)))
  WHERE NOT EXISTS (SELECT 1 FROM skutok_stranky s2 JOIN stranka st ON st.id = s2.stranka
                     WHERE (s2.data ->> 'prispevokId') = (p.id)::text AND s2.stiahnuty IS NULL
                       AND st.zverejnena IS NULL AND NOT public.spravujem_stranku(st.id));

-- ---------- žiadne dary na neverejnú stránku ----------
create or replace function public.dar_len_verejnej() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_s text;
begin
  -- platba dostane zbierku až updatom (zbierka_dar), preto aj pri zmene zbierky
  if tg_op = 'UPDATE' and new.zbierka is not distinct from old.zbierka then return new; end if;
  v_s := coalesce(to_jsonb(new)->>'stranka', (select z.stranka from public.zbierka z where z.id = new.zbierka)); -- vecny_dar má stranka, platba len zbierku
  if v_s is not null and exists (select 1 from public.stranka s where s.id = v_s and s.zverejnena is null) then
    raise exception 'Stránka sa ešte pripravuje, dary prijíma až po zverejnení.' using errcode = '22023', detail = 'stranka_neverejna';
  end if;
  return new;
end $$;
revoke all on function public.dar_len_verejnej() from public;
drop trigger if exists platba_len_verejnej on public.platba;
create trigger platba_len_verejnej before insert or update of zbierka on public.platba for each row execute function public.dar_len_verejnej();
drop trigger if exists vecny_dar_len_verejnej on public.vecny_dar;
create trigger vecny_dar_len_verejnej before insert on public.vecny_dar for each row execute function public.dar_len_verejnej();

-- ---------- Zverejniť stránku ----------
create or replace function public.stranka_zverejni(p_stranka text) returns timestamptz
  language plpgsql volatile security definer set search_path = public as $$
declare v_s public.stranka; v_ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  if public.moj_ucet() is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  select * into v_s from public.stranka where id = p_stranka for update;
  if not found then raise exception 'stranka_neexistuje' using errcode = 'P0002'; end if;
  if not coalesce(public.plne_prava(p_stranka), false) then raise exception 'nemate_povolene' using errcode = '42501'; end if;
  if v_s.zverejnena is not null then return v_s.zverejnena; end if; -- raz navždy
  perform set_config('deed.zverejni', '1', true);
  update public.stranka set zverejnena = now() where id = p_stranka;
  perform set_config('deed.zverejni', '', true);
  -- farnosť: skúšobná doba od zverejnenia (keď je prepínač zapnutý a začiatok ešte nie je)
  if v_s.typ = 'farnost' and coalesce((select zapnute from public.ledger_prepinac where kluc = 'skusobna_doba'), false) then
    insert into public.nastavenia_stranky (stranka, data) values (p_stranka, jsonb_build_object('predplatne', jsonb_build_object('start', v_ms)))
    on conflict (stranka) do update set
      data = jsonb_set(public.nastavenia_stranky.data, '{predplatne}', coalesce(public.nastavenia_stranky.data->'predplatne', '{}'::jsonb) || jsonb_build_object('start', v_ms))
      where (public.nastavenia_stranky.data->'predplatne'->>'start') is null;
  end if;
  return now();
end $$;
revoke all on function public.stranka_zverejni(text) from public, anon;
grant execute on function public.stranka_zverejni(text) to authenticated;

commit;
