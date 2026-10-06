-- ============================================================
-- 0037 · Zadanie 2 — LEDGER: jedno účtovníctvo peňazí (podvojné pohyby)
-- ------------------------------------------------------------
-- Všetky peniaze žijú v tabuľke `pohyb`: každý riadok = debet jedného účtu a kredit
-- druhého, tá istá suma → súčet všetkých zostatkov je vždy 0. Zostatky, vyzbierané
-- a počty darov sa NIKDY nepíšu, len počítajú z pohybov (v_zostatok, v_vyzbierane).
-- Refund / vrátenie = opačný zápis, nikdy UPDATE ani DELETE (pohyb je nemenný).
-- Každý pohyb nesie doklad z rady dokladov (9 číslic + Luhn = 10, „D-…" na obrazovke,
-- Číslovanie v1.3); podiely jedného dokladu sú doklad/poradie a sedia na cent.
--
-- Systémové účty (ucet.typ 'system'):
--   procesor            — brána karta / SEPA / SMS: odtiaľ prichádzajú EUR (poplatok procesora ostáva tu)
--   platforma           — naša marža a dobrovoľný tip
--   testovacia_pokladna — štartovací kredit 1 240 DEED a Dobiť v testovacej verzii (pri ostrom štarte sa vypne)
--   viazane             — escrow (rezervované peniaze firmy, kým sa neuvoľnia alebo nevrátia)
--   nepriradene         — platby spred ledgera bez príjemcu (len prevod histórie, nové sa nedajú)
-- Systémové účty smú ísť do mínusu (procesor = peniaze, ktoré prišli zvonku); ostatné nie.
--
-- Farnosť (Martin 6. 10., k bodu 2.4): zbierky farnosti sú OKNÁ nad jedným objektom
-- (centrálna zbierka). Prelev uzavretého okna do centrálnej je len zobrazovacia agregácia
-- (filter pohybov podľa času/okna nad tým istým objektom), NIE nový pohyb. Peniaze tečú raz.
--
-- PRAVIDLO (Martin 6. 10.): čo sa kdekoľvek započítava (rebríček, počítadlá, karma), musí byť pohyb
-- v ledgeri. Sirotský riadok (suma bez pohybu) buď dostane otvárací pohyb z testovacej pokladne,
-- alebo sa zmaže — tretia možnosť nie je. Rebríček darcov = v_top_darcovia (len ledger).
--
-- Spúšťa sa po 0036. Platby ostávajú simulované — stavia sa štruktúra.
-- ============================================================
begin;

-- ---------- 0 · upratanie: stará tabuľka darov bez väzby (nepoužitá) ----------
drop table if exists public.dar;

-- ---------- 1 · systémové účty ----------
alter table public.ucet drop constraint if exists ucet_typ_check;
alter table public.ucet add constraint ucet_typ_check check (typ in ('pasivny','aktivny','charita','firma','system'));
alter table public.ucet add column if not exists system_kluc text unique;

insert into public.ucet (typ, stav_registracie, system_kluc) values
  ('system','system','procesor'),
  ('system','system','platforma'),
  ('system','system','testovacia_pokladna'),
  ('system','system','viazane'),
  ('system','system','nepriradene')
on conflict (system_kluc) do nothing;

create or replace function public.ucet_systemu(p_kluc text) returns uuid
  language sql stable security definer set search_path = public as $$
  select id from public.ucet where system_kluc = p_kluc
$$;

-- prepínač testovacej pokladne (ostrý štart = false → štartovací kredit ani Dobiť už nič nepripíšu)
create table if not exists public.ledger_prepinac (
  kluc     text primary key,
  zapnute  boolean not null
);
insert into public.ledger_prepinac values ('testovacia_pokladna', true) on conflict (kluc) do nothing;
alter table public.ledger_prepinac enable row level security;

-- ---------- 2 · rada dokladov (9 číslic + Luhn) ----------
create sequence if not exists public.doklad_seq start with 100000001 maxvalue 999999999 no cycle;

create or replace function public.luhn9(p text) returns int
  language plpgsql immutable as $$
declare s int := 0; d int; i int;
begin
  for i in 0..length(p) - 1 loop
    d := ascii(substr(p, length(p) - i, 1)) - 48;
    if i % 2 = 0 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
    s := s + d;
  end loop;
  return (10 - (s % 10)) % 10;
end $$;

create or replace function public.novy_doklad() returns text
  language plpgsql volatile security definer set search_path = public as $$
declare n text := nextval('public.doklad_seq')::text;
begin
  return n || public.luhn9(n);
end $$;

-- ---------- 3 · kanál ↔ mena (povolené kombinácie) ----------
create table if not exists public.kanal_mena (
  kanal text not null,
  mena  text not null,
  primary key (kanal, mena)
);
insert into public.kanal_mena values ('deed','DEED'), ('fiat','EUR'), ('sepa','EUR'), ('sms','EUR')
  on conflict do nothing;
alter table public.kanal_mena enable row level security;
drop policy if exists citaj on public.kanal_mena;
create policy citaj on public.kanal_mena for select to anon, authenticated using (true);

alter table public.platba drop constraint if exists platba_kanal_mena_fk;
alter table public.platba add constraint platba_kanal_mena_fk foreign key (kanal, mena) references public.kanal_mena (kanal, mena);

-- ---------- 4 · POHYB ----------
create table public.pohyb (
  id           bigint generated always as identity primary key,
  doklad       text not null,                                      -- rada dokladov (10 číslic)
  poradie      smallint not null default 0,                        -- podiel dokladu (0 = poplatok/tip, 1..N = podiely)
  typ          text not null check (typ in ('dar','dorovnanie','vratenie','poplatok','dobitie')),
  ucet_debet   uuid not null references public.ucet(id),           -- komu ubudne
  ucet_kredit  uuid not null references public.ucet(id),           -- komu pribudne
  suma         numeric(14,4) not null check (suma > 0),
  mena         text not null,
  kanal        text not null,
  platba_id    uuid references public.platba(id),
  escrow_id    uuid references public.escrow(id),
  case_id      uuid references public.prispevok(id),                -- objekt / zbierka (KAM)
  vs           text,                                               -- VS objektu alebo vratného dokladu
  pre_zbierku  boolean not null default false,                      -- počíta sa do vyzbieraného (nie podiel vlastníka QR, nie poplatok)
  storno_pre   bigint unique references public.pohyb(id),          -- opačný zápis k tomuto pohybu (refund)
  testovaci    boolean not null default false,
  cas          timestamptz not null default now(),
  foreign key (kanal, mena) references public.kanal_mena (kanal, mena),
  check (ucet_debet <> ucet_kredit),
  check (not pre_zbierku or case_id is not null)
);
comment on table public.pohyb is 'Ledger — jediný zdroj pravdy o peniazoch. Append-only, podvojný, súčet = 0.';
create index pohyb_debet_idx  on public.pohyb (ucet_debet, mena);
create index pohyb_kredit_idx on public.pohyb (ucet_kredit, mena);
create index pohyb_case_idx   on public.pohyb (case_id) where case_id is not null;
create index pohyb_platba_idx on public.pohyb (platba_id) where platba_id is not null;
create index pohyb_escrow_idx on public.pohyb (escrow_id) where escrow_id is not null;
create index pohyb_doklad_idx on public.pohyb (doklad);

-- nemenný: UPDATE / DELETE / TRUNCATE neexistuje
create or replace function public.pohyb_nemenny() returns trigger
  language plpgsql as $$
begin
  raise exception 'pohyb_je_nemenny' using errcode = '42501',
    hint = 'Oprava = opačný zápis (vratenie), nikdy úprava ani zmazanie.';
end $$;
create trigger pohyb_nemenny before update or delete on public.pohyb
  for each row execute function public.pohyb_nemenny();
create trigger pohyb_nemenny_truncate before truncate on public.pohyb
  for each statement execute function public.pohyb_nemenny();

-- zostatok účtu v mene (kredit − debet)
create or replace function public.zostatok(p_ucet uuid, p_mena text) returns numeric
  language sql stable security definer set search_path = public as $$
  select coalesce((select sum(suma) from public.pohyb where ucet_kredit = p_ucet and mena = p_mena), 0)
       - coalesce((select sum(suma) from public.pohyb where ucet_debet  = p_ucet and mena = p_mena), 0)
$$;

-- RLS: vidím len pohyby svojho účtu; zápis len cez security definer funkcie nižšie
alter table public.pohyb enable row level security;
drop policy if exists moje on public.pohyb;
create policy moje on public.pohyb for select to authenticated
  using (ucet_debet = public.moj_ucet() or ucet_kredit = public.moj_ucet());

-- ---------- 5 · prevod histórie (pred kontrolou zostatku) ----------
-- 5a · seed autori bez účtu → testovací účet (aby ich zbierka mala príjemcu)
create temp table seed_autor on commit drop as
  select distinct coalesce(nullif(trim(autor_nazov), ''), 'Seed ' || cislo::text) as meno,
         case when modul = 'charity' then 'charita' else 'aktivny' end as typ
    from public.prispevok
   where autor_ucet_id is null and coalesce(vyzbierane, 0) > 0;
alter table seed_autor add column ucet_id uuid;
update seed_autor set ucet_id = gen_random_uuid();
insert into public.ucet (id, typ, stav_registracie) select ucet_id, typ, 'testovaci' from seed_autor;
update public.prispevok p set autor_ucet_id = s.ucet_id
  from seed_autor s
 where p.autor_ucet_id is null and coalesce(p.vyzbierane, 0) > 0
   and s.meno = coalesce(nullif(trim(p.autor_nazov), ''), 'Seed ' || p.cislo::text)
   and s.typ = case when p.modul = 'charity' then 'charita' else 'aktivny' end;

-- 5b · štartovací kredit 1 240 DEED všetkým ľuďom (+ to, čo si dobili v starej peňaženke)
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, testovaci)
  select public.novy_doklad(), 1, 'dobitie', public.ucet_systemu('testovacia_pokladna'), u.id,
         1240 + greatest(coalesce((select pz.zostatok_deed from public.penazenka pz where pz.pouzivatel = u.auth_id), 1240) - 1240, 0),
         'DEED', 'deed', true
    from public.ucet u
   where u.typ in ('pasivny','aktivny') and u.stav_registracie <> 'testovaci';

-- 5c · existujúce platby → pohyby (príjemca: účet príjemcu, podiely splitu, autor prípadu; inak „nepriradené").
--      Darca s účtom je vždy debetom daru (aj pri EUR: najprv EUR prídu cez procesor na neho) → rebríček a výpis z ledgera.
update public.platba_split ps set prijemca = public.ucet_systemu('nepriradene') where ps.prijemca is null;
alter table public.platba add column if not exists doklad text unique;
update public.platba set doklad = public.novy_doklad() where doklad is null;
alter table public.platba add column if not exists idem_scope uuid;
update public.platba set idem_scope = coalesce(odosielatel, '00000000-0000-0000-0000-000000000000') where idem_scope is null;
alter table public.podpora add column if not exists platba_id uuid references public.platba(id) on delete set null;

create function pg_temp.zdroj(p public.platba) returns uuid language sql stable as $$
  select coalesce(p.odosielatel, case when p.kanal = 'deed' then public.ucet_systemu('nepriradene') else public.ucet_systemu('procesor') end)
$$;

-- príchod EUR cez procesor na účet darcu (podiely + marža; poplatok procesora ostáva procesoru)
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, cas)
  select p.doklad, 0, 'dobitie', public.ucet_systemu('procesor'), p.odosielatel, p.cista_suma + p.marza + p.tip, p.mena, p.kanal, p.id, p.case_id, p.cas
    from public.platba p
   where p.stav in ('credited','settled') and p.kanal <> 'deed' and p.odosielatel is not null and p.cista_suma + p.marza + p.tip > 0;
-- podiely splitu (z čistej sumy)
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, pre_zbierku, cas)
  select p.doklad, row_number() over (partition by p.id order by ps.id)::smallint, 'dar',
         pg_temp.zdroj(p), ps.prijemca, ps.suma, p.mena, p.kanal, p.id, p.case_id, ps.fixny and p.case_id is not null, p.cas
    from public.platba p join public.platba_split ps on ps.platba_id = p.id
   where p.stav in ('credited','settled') and ps.suma > 0 and ps.prijemca <> pg_temp.zdroj(p);
-- platby bez splitu
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, pre_zbierku, cas)
  select p.doklad, 1, 'dar', pg_temp.zdroj(p),
         coalesce(p.prijemca_ucet, pr.autor_ucet_id, public.ucet_systemu('nepriradene')),
         p.cista_suma, p.mena, p.kanal, p.id, p.case_id, p.case_id is not null, p.cas
    from public.platba p left join public.prispevok pr on pr.id = p.case_id
   where p.stav in ('credited','settled') and p.cista_suma > 0
     and not exists (select 1 from public.platba_split ps where ps.platba_id = p.id)
     and coalesce(p.prijemca_ucet, pr.autor_ucet_id, public.ucet_systemu('nepriradene')) <> pg_temp.zdroj(p);
-- marža a tip histórie
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, cas)
  select p.doklad, 0, 'poplatok', pg_temp.zdroj(p), public.ucet_systemu('platforma'), p.marza, p.mena, p.kanal, p.id, p.case_id, p.cas
    from public.platba p
   where p.stav in ('credited','settled') and p.marza > 0;
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, cas)
  select p.doklad, 99, 'dar', pg_temp.zdroj(p), public.ucet_systemu('platforma'), p.tip, p.mena, p.kanal, p.id, p.case_id, p.cas
    from public.platba p
   where p.stav in ('credited','settled') and p.tip > 0;

-- 5e · SIROTSKÉ RIADKY (Martin 6. 10.): čokoľvek so sumou bez pohybu buď dostane otvárací pohyb
--      z testovacej pokladne, alebo sa zmaže — tretia možnosť nie je. Riadky „Čo podporujem"
--      bez platby → testovacia platba + pohyby (pokladňa → darca → príjemca), označené testovacie.
-- riadky, ktoré kedysi vytvoril trigger z platby, sa najprv naviažu na svoju platbu (nie sú siroty)
update public.podpora po set platba_id = pl.id
  from public.platba pl
 where po.platba_id is null and po.cas = pl.cas and po.suma = round(pl.suma, 2)
   and po.ucet_id is not distinct from pl.odosielatel and po.prispevok_id is not distinct from pl.case_id;
create temp table sirota on commit drop as
  select po.id, po.ucet_id, nullif(trim(po.darca_nazov), '') as darca, po.prispevok_id, nullif(trim(po.prijemca), '') as prijemca,
         round(po.suma, 2) as suma, po.kanal, po.cas, po.vyzbierane, po.ciel,
         null::uuid as darca_ucet, null::uuid as prijemca_ucet, gen_random_uuid() as platba_id
    from public.podpora po
   where po.platba_id is null and po.suma > 0;
delete from public.podpora po where po.platba_id is null and not (po.suma > 0);   -- nulové riadky nemajú čo prevádzať
-- darca: jeho účet, inak testovací účet podľa mena v riadku („Anonym" / bez mena = anonymný dar bez darcu)
create temp table sirota_darca on commit drop as
  select meno, gen_random_uuid() as id from (select distinct darca as meno from sirota
   where ucet_id is null and darca is not null and darca <> 'Anonym') x;
insert into public.ucet (id, typ, stav_registracie) select id, 'aktivny', 'testovaci' from sirota_darca;
update sirota s set darca_ucet = coalesce(s.ucet_id, (select d.id from sirota_darca d where d.meno = s.darca));
-- príjemca: autor prípadu (bez účtu → testovací účet), inak testovací účet podľa mena príjemcu
create temp table sirota_autor on commit drop as
  select x.prispevok_id, gen_random_uuid() as id, x.typ from (
    select distinct pr.id as prispevok_id, case when pr.modul = 'charity' then 'charita' else 'aktivny' end as typ
      from sirota s join public.prispevok pr on pr.id = s.prispevok_id where pr.autor_ucet_id is null) x;
insert into public.ucet (id, typ, stav_registracie) select id, typ, 'testovaci' from sirota_autor;
update public.prispevok pr set autor_ucet_id = a.id from sirota_autor a where a.prispevok_id = pr.id;
create temp table sirota_prijemca on commit drop as
  select meno, gen_random_uuid() as id from (select distinct coalesce(prijemca, 'Neznámy príjemca') as meno from sirota where prispevok_id is null) x;
insert into public.ucet (id, typ, stav_registracie) select id, 'charita', 'testovaci' from sirota_prijemca;
update sirota s set prijemca_ucet = coalesce(
  (select pr.autor_ucet_id from public.prispevok pr where pr.id = s.prispevok_id),
  (select r.id from sirota_prijemca r where r.meno = coalesce(s.prijemca, 'Neznámy príjemca')));

alter table public.platba disable trigger trg_platba_do_podpory;    -- riadok podpory už existuje, len sa naviaže
insert into public.platba (id, case_id, odosielatel, odosielatel_text, prijemca_ucet, prijemca_text, suma, mena, kanal,
                           poplatok, marza, cista_suma, stav, idem_kluc, idem_scope, meta, credited_at, settled_at, cas, doklad)
  select s.platba_id, s.prispevok_id, s.darca_ucet, s.darca, s.prijemca_ucet, s.prijemca, s.suma,
         case when s.kanal = 'deed' then 'DEED' else 'EUR' end, s.kanal, 0, 0, s.suma, 'settled',
         'sirota:' || s.id, coalesce(s.darca_ucet, '00000000-0000-0000-0000-000000000000'),
         jsonb_build_object('testovaci', true, 'vyzbierane', s.vyzbierane, 'ciel', s.ciel), s.cas, s.cas, s.cas, public.novy_doklad()
    from sirota s;
alter table public.platba enable trigger trg_platba_do_podpory;
-- pokladňa → darca (aby mal z čoho dať) …
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, testovaci, cas)
  select pl.doklad, 0, 'dobitie', public.ucet_systemu('testovacia_pokladna'), s.darca_ucet, s.suma, pl.mena, pl.kanal, pl.id, s.prispevok_id, true, s.cas
    from sirota s join public.platba pl on pl.id = s.platba_id where s.darca_ucet is not null;
-- … darca (alebo pri anonymnom dare priamo pokladňa) → príjemca
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, pre_zbierku, testovaci, cas)
  select pl.doklad, 1, 'dar', coalesce(s.darca_ucet, public.ucet_systemu('testovacia_pokladna')), s.prijemca_ucet, s.suma, pl.mena, pl.kanal,
         pl.id, s.prispevok_id, s.prispevok_id is not null, true, s.cas
    from sirota s join public.platba pl on pl.id = s.platba_id
   where s.prijemca_ucet <> coalesce(s.darca_ucet, public.ucet_systemu('testovacia_pokladna'));
update public.podpora po set platba_id = s.platba_id from sirota s where s.id = po.id;

-- 5d · seed vyzbierané → otváracie dary z testovacej pokladne (rozdelené na pôvodný počet darov,
--      zvyšok centov prvému; odpočíta sa to, čo už prišlo cez platby)
insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, case_id, pre_zbierku, testovaci, cas)
  select public.novy_doklad(), 1, 'dar', public.ucet_systemu('testovacia_pokladna'), x.autor_ucet_id,
         case when g.i = 1 then x.zvysok - (x.n - 1) * trunc(x.zvysok / x.n, 2) else trunc(x.zvysok / x.n, 2) end,
         'EUR', 'sepa', x.id, true, true, x.vytvorene
    from (
      select p.id, p.autor_ucet_id, p.vytvorene,
             least(greatest(p.podpora_count, 1), greatest(floor(o.zvysok)::int, 1)) as n,
             o.zvysok
        from public.prispevok p
        cross join lateral (select round(p.vyzbierane - coalesce((
                 select sum(pl.suma) from public.platba pl
                  where pl.case_id = p.id and pl.mena = 'EUR' and pl.stav in ('credited','settled')), 0), 2) as zvysok) o
       where coalesce(p.vyzbierane, 0) > 0 and o.zvysok > 0 and p.autor_ucet_id is not null
    ) x
    cross join lateral generate_series(1, x.n) as g(i);

-- ---------- 6 · kontrola: zostatok nepadne pod 0 (okrem systémových účtov) ----------
create or replace function public.pohyb_kryty() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_typ text;
begin
  select typ into v_typ from public.ucet where id = new.ucet_debet for update;   -- zámok účtu proti súbehu
  if v_typ <> 'system' and public.zostatok(new.ucet_debet, new.mena) < 0 then
    raise exception 'Na účte nie je dosť prostriedkov.' using errcode = '23514', detail = 'zostatok_pod_nulou';
  end if;
  return null;
end $$;
create trigger pohyb_kryty after insert on public.pohyb
  for each row execute function public.pohyb_kryty();

-- ---------- 7 · stará peňaženka preč ----------
drop function if exists public.penazenka_dobit(numeric);
drop table if exists public.penazenka;

-- štartovací kredit pri vzniku účtu človeka (len kým je testovacia pokladňa zapnutá)
create or replace function public.ucet_start_kredit() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.typ in ('pasivny','aktivny')
     and (select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna') then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, testovaci)
      values (public.novy_doklad(), 1, 'dobitie', public.ucet_systemu('testovacia_pokladna'), new.id, 1240, 'DEED', 'deed', true);
  end if;
  return null;
end $$;
drop trigger if exists ucet_start_kredit on public.ucet;
create trigger ucet_start_kredit after insert on public.ucet
  for each row when (new.stav_registracie is distinct from 'testovaci') execute function public.ucet_start_kredit();

-- Dobiť (testovacia verzia): pohyb typu dobitie z testovacej pokladne na môj účet
create or replace function public.testovacie_dobitie(p_deed numeric) returns numeric
  language plpgsql security definer set search_path = public as $$
declare v_ja uuid := public.moj_ucet();
begin
  if v_ja is null then raise exception 'neprihlaseny' using errcode = '28000'; end if;
  if p_deed is null or p_deed <= 0 or p_deed > 100000 then raise exception 'neplatna_suma' using errcode = '22023'; end if;
  if not (select zapnute from public.ledger_prepinac where kluc = 'testovacia_pokladna') then
    raise exception 'Dobitie v testovacej verzii je vypnuté.' using errcode = '42501', detail = 'pokladna_vypnuta';
  end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, testovaci)
    values (public.novy_doklad(), 1, 'dobitie', public.ucet_systemu('testovacia_pokladna'), v_ja, round(p_deed, 4), 'DEED', 'deed', true);
  return public.zostatok(v_ja, 'DEED');
end $$;
revoke all on function public.testovacie_dobitie(numeric) from public;
grant execute on function public.testovacie_dobitie(numeric) to authenticated;

-- ---------- 8 · pohľady: zostatok, vyzbierané, výpis ----------
drop view if exists public.v_zostatok;
create view public.v_zostatok as
  select u.id as ucet_id,
         round(public.zostatok(u.id, 'DEED'), 4) as zostatok_deed,
         round(public.zostatok(u.id, 'EUR'), 2)  as zostatok_eur
    from public.ucet u
   where u.id = public.moj_ucet();                       -- vidím len svoj zostatok
grant select on public.v_zostatok to anon, authenticated;

-- vyzbierané PER MENA, len podiely patriace zbierke; refund (storno) odpočíta
create or replace view public.v_vyzbierane as
  select x.case_id,
         round(coalesce(sum(x.s) filter (where x.mena = 'EUR'), 0), 2)  as vyzbierane_eur,
         round(coalesce(sum(x.s) filter (where x.mena = 'DEED'), 0), 4) as vyzbierane_deed,
         count(distinct x.doklad) filter (where x.storno_pre is null and not x.stornovany) as pocet_darov
    from (
      select p.case_id, p.mena, p.doklad, p.storno_pre,
             case when p.storno_pre is null then p.suma else -p.suma end as s,
             exists (select 1 from public.pohyb r where r.storno_pre = p.id) as stornovany
        from public.pohyb p
       where p.pre_zbierku
    ) x
   group by x.case_id;
comment on view public.v_vyzbierane is 'Vyzbierané per mena z ledgera (nikdy jeden súčet EUR+DEED). Okná farnosti = filter nad tým istým objektom, nie nový pohyb.';
grant select on public.v_vyzbierane to anon, authenticated;

drop view if exists public.v_vypis;
create view public.v_vypis as
  select p.platba_id, p.ucet_debet as ucet_id, 'dal'::text as smer, p.case_id,
         coalesce(pl.prijemca_text, uk.system_kluc) as protistrana,
         p.suma, p.mena, p.kanal, pl.poplatok, pl.tip, pl.cista_suma, coalesce(pl.stav, 'settled') as stav,
         coalesce(pl.ext_vs, pl.ext_hash, pl.ext_sms_kod, p.vs) as externy_id, pl.batch_id, p.cas,
         p.typ, p.doklad, p.poradie
    from public.pohyb p
    left join public.platba pl on pl.id = p.platba_id
    left join public.ucet uk on uk.id = p.ucet_kredit
   where p.ucet_debet = public.moj_ucet()               -- môj výpis
  union all
  select p.platba_id, p.ucet_kredit, 'dostal'::text, p.case_id,
         coalesce(pl.odosielatel_text, ud.system_kluc),
         p.suma, p.mena, p.kanal, pl.poplatok, pl.tip, pl.cista_suma, coalesce(pl.stav, 'settled'),
         coalesce(pl.ext_vs, pl.ext_hash, pl.ext_sms_kod, p.vs), pl.batch_id, p.cas,
         p.typ, p.doklad, p.poradie
    from public.pohyb p
    left join public.platba pl on pl.id = p.platba_id
    left join public.ucet ud on ud.id = p.ucet_debet
   where p.ucet_kredit = public.moj_ucet();
grant select on public.v_vypis to authenticated;

-- rebríček darcov LEN z ledgera: dary z účtu človeka (mínus vrátené), meno = posledný snapshot z jeho platby
create or replace view public.v_top_darcovia as
  with d as (
    select p.ucet_debet as ucet_id, p.mena, p.suma
      from public.pohyb p
      join public.ucet u on u.id = p.ucet_debet and u.typ in ('pasivny','aktivny')
      join public.ucet k on k.id = p.ucet_kredit and k.typ <> 'system'
     where p.typ = 'dar' and p.storno_pre is null
    union all
    select r.ucet_kredit, r.mena, -r.suma
      from public.pohyb r join public.pohyb o on o.id = r.storno_pre
      join public.ucet k on k.id = o.ucet_kredit and k.typ <> 'system'
     where o.typ = 'dar'
  )
  select d.ucet_id,
         round(coalesce(sum(d.suma) filter (where d.mena = 'DEED'), 0), 4) as deed,
         round(coalesce(sum(d.suma) filter (where d.mena = 'EUR'), 0), 2)  as eur,
         (select pl.odosielatel_text from public.platba pl
           where pl.odosielatel = d.ucet_id and pl.odosielatel_text is not null order by pl.cas desc limit 1) as meno
    from d group by d.ucet_id;
grant select on public.v_top_darcovia to anon, authenticated;

-- ---------- 9 · počítadlá na prípadoch sa už nepíšu → pohľad pre feed ----------
-- prispevok_feed = prispevok + vyzbierané (EUR) a počet darov z ledgera
alter table public.prispevok drop column if exists vyzbierane;
alter table public.prispevok drop column if exists podpora_count;
create or replace view public.prispevok_feed as
  select p.*,
         v.vyzbierane_eur as vyzbierane,
         coalesce(v.vyzbierane_deed, 0) as vyzbierane_deed,
         coalesce(v.pocet_darov, 0)::int as podpora_count
    from public.prispevok p
    left join public.v_vyzbierane v on v.case_id = p.id;
grant select on public.prispevok_feed to anon, authenticated;

-- moje zbierky (0021): vyzbierané z ledgera, nie zapísané číslo
alter table public.zbierka drop column if exists vyzbierane;
create or replace view public.zbierka_moja with (security_invoker = true) as
  select z.*, v.vyzbierane_eur as vyzbierane, coalesce(v.vyzbierane_deed, 0) as vyzbierane_deed
    from public.zbierka z
    left join public.v_vyzbierane v on v.case_id::text = z.id;
grant select on public.zbierka_moja to authenticated;

-- landing QR splitu číta vyzbierané z ledgera
create or replace function public.qr_split_get(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public, extensions as $fn$
  select jsonb_build_object(
    'id', q.id, 'slug', q.slug, 'zdroj', q.zdroj, 'mena', q.mena,
    'owner_ucet_id', q.owner_ucet_id, 'owner_text', q.owner_text, 'owner_podiel', q.owner_podiel,
    'case_id', q.case_id,
    'prispevok', (select jsonb_build_object(
        'id', p.id, 'titul', p.titul, 'autor_nazov', p.autor_nazov, 'autor_ini', p.autor_ini,
        'autor_pfp', p.autor_pfp, 'emoji', p.emoji, 'lok', p.lok, 'popis', p.popis,
        'vyzbierane', p.vyzbierane, 'ciel', p.ciel, 'modul', p.modul, 'typ', p.typ,
        'fotky', p.media->'fotky')
      from public.prispevok_feed p where p.id = q.case_id),
    'ciele', (select coalesce(jsonb_agg(jsonb_build_object(
        'prijemca_ucet', c.prijemca_ucet, 'prijemca_text', c.prijemca_text,
        'podiel', c.podiel, 'fixny', c.fixny) order by c.id), '[]'::jsonb)
      from public.qr_split_ciel c where c.qr_split_id = q.id),
    'totals', (select jsonb_build_object(
        'org_total', coalesce(t.org_total,0), 'owner_total', coalesce(t.owner_total,0),
        'spolu', coalesce(t.spolu,0), 'pocet', coalesce(t.pocet,0))
      from public.v_qr_split_totals t where t.qr_split_id = q.id)
  )
  from public.qr_split q where q.id = p_id;
$fn$;

-- ---------- 10 · split bez strát ----------
alter table public.platba_split alter column prijemca set not null;
alter table public.platba_split add column if not exists case_id uuid references public.prispevok(id);
alter table public.qr_split_ciel add column if not exists case_id uuid references public.prispevok(id);

-- ---------- 11 · idempotencia per odosielateľ ----------
alter table public.platba alter column idem_scope set not null;
alter table public.platba drop constraint if exists platba_idem_kluc_key;
alter table public.platba add constraint platba_idem_uniq unique (idem_scope, idem_kluc);

-- projekcia „Čo podporujem" pozná svoju platbu (refund ju vie stiahnuť); bez platby riadok nevznikne
create or replace function public.platba_do_podpory() returns trigger
language plpgsql set search_path = public as $fn$
begin
  insert into public.podpora (ucet_id, prispevok_id, prijemca, suma, kanal, darca_nazov, vyzbierane, ciel, cas, platba_id)
  values (NEW.odosielatel, NEW.case_id, NEW.prijemca_text, round(NEW.suma, 2),
          case when NEW.kanal = 'sepa' then 'fiat' else NEW.kanal end,
          NEW.odosielatel_text,
          nullif(NEW.meta->>'vyzbierane','')::numeric, nullif(NEW.meta->>'ciel','')::numeric,
          NEW.cas, NEW.id);
  return NEW;
end;
$fn$;

-- ---------- 12 · platba_create — jediná cesta pre dar ----------
drop function if exists public.platba_create(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb);
create function public.platba_create(
  p_idem_kluc        text,
  p_suma             numeric,
  p_mena             text,
  p_kanal            text,
  p_case_id          uuid    default null,
  p_odosielatel      uuid    default null,
  p_odosielatel_text text    default null,
  p_prijemca_ucet    uuid    default null,
  p_prijemca_text    text    default null,
  p_obe_registrovane boolean default false,
  p_tip              numeric default 0,
  p_meta             jsonb   default '{}'::jsonb,
  p_split            jsonb   default null         -- [{prijemca_ucet | case_id, prijemca_text?, podiel, fixny?}]
) returns public.platba
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  v_scope uuid := coalesce(p_odosielatel, '00000000-0000-0000-0000-000000000000');
  v_ex public.platba; v_row public.platba;
  v_presnost int := case when p_mena = 'EUR' then 2 else 4 end;
  v_suma numeric(14,4); v_tip numeric(14,4) := round(greatest(coalesce(p_tip, 0), 0), case when p_mena = 'EUR' then 2 else 4 end);
  v_marza numeric(14,4) := 0; v_poplatok numeric(14,4) := 0; v_cista numeric(14,4);
  v_mikro boolean; v_stav text := 'pending'; v_vs text; v_hash text; v_sms text;
  v_credited timestamptz; v_settled timestamptz;
  v_zdroj uuid; v_doklad text; v_prijemca uuid; v_sum_podiel numeric := 0; v_sum_suma numeric := 0;
  v_podiely jsonb := '[]'::jsonb; e jsonb; i int := 0; v_n int; v_suma_podielu numeric; v_ucet uuid; v_case uuid;
  v_prijem numeric(14,4) := 0;
begin
  if p_suma is null or p_suma <= 0 then raise exception 'Suma musí byť kladná.' using errcode = '22023', detail = 'suma_neplatna'; end if;
  if not exists (select 1 from public.kanal_mena where kanal = p_kanal and mena = p_mena) then
    raise exception 'Mena % sa nedá poslať kanálom %.', p_mena, p_kanal using errcode = '22023', detail = 'kanal_mena';
  end if;
  v_suma := round(p_suma, v_presnost);

  -- 2.5 idempotencia per odosielateľ: rovnaký kľúč = tá istá platba; iná suma = chyba
  select * into v_ex from public.platba where idem_scope = v_scope and idem_kluc = p_idem_kluc;
  if found then
    if v_ex.suma <> v_suma or v_ex.mena <> p_mena or v_ex.kanal <> p_kanal or v_ex.case_id is distinct from p_case_id then
      raise exception 'Platba s týmto kľúčom už existuje s inými údajmi.' using errcode = '23505', detail = 'idem_konflikt';
    end if;
    return v_ex;
  end if;

  -- poplatky (placeholder krivka; reálna degresia = tokenomika)
  if p_kanal = 'deed' then
    if v_suma <= 0.5 and p_obe_registrovane then v_marza := 0; else v_marza := round(v_suma * 0.03, v_presnost); end if;
    v_poplatok := v_marza;
  elsif p_kanal = 'sepa' then
    v_marza := 0; v_poplatok := 0;
  elsif p_kanal = 'fiat' then
    v_marza := round(v_suma * 0.015, v_presnost);
    v_poplatok := round(v_suma * 0.014 + 0.15, v_presnost) + v_marza;
  elsif p_kanal = 'sms' then
    v_marza := round(v_suma * 0.05, v_presnost);
    v_poplatok := round(v_suma * 0.10, v_presnost) + v_marza;
  end if;
  v_cista := v_suma - v_poplatok;
  -- 2.4.3 čistá suma > 0
  if v_cista <= 0 then
    raise exception 'Po poplatku by príjemcovi nezostalo nič. Zvoľte vyššiu sumu alebo inú platbu.' using errcode = '22023', detail = 'cista_suma_nula';
  end if;

  -- zdroj peňazí: DEED z účtu darcu, EUR prichádzajú cez procesor
  if p_kanal = 'deed' then
    if p_odosielatel is null then
      raise exception 'Platba v DeeD potrebuje účet darcu.' using errcode = '22023', detail = 'deed_bez_uctu';
    end if;
    v_zdroj := p_odosielatel;
    perform 1 from public.ucet where id = v_zdroj for update;
    if public.zostatok(v_zdroj, 'DEED') < v_suma + v_tip then
      raise exception 'Na účte nie je dosť DeeD.' using errcode = '23514', detail = 'nedostatok_deed';
    end if;
  elsif p_odosielatel is not null then
    -- EUR od darcu s účtom: prídu cez procesor na jeho účet a od neho idú ďalej (rebríček a výpis čítajú ledger)
    v_zdroj := p_odosielatel;
    v_prijem := v_suma + v_tip - (v_poplatok - v_marza);
  else
    v_zdroj := public.ucet_systemu('procesor');      -- anonymný EUR dar: bez darcu
  end if;

  -- 2.3 podiely: povinný príjemca, z čistej sumy, na cent, zvyšok prvému
  if p_split is not null and jsonb_typeof(p_split) = 'array' and jsonb_array_length(p_split) > 0 then
    v_n := jsonb_array_length(p_split);
    for e in select * from jsonb_array_elements(p_split) loop
      v_case := nullif(e->>'case_id', '')::uuid;
      v_ucet := coalesce(nullif(e->>'prijemca_ucet', '')::uuid, (select autor_ucet_id from public.prispevok where id = v_case));
      if v_ucet is null then
        raise exception 'Podiel % nemá príjemcu s účtom.', coalesce(e->>'prijemca_text', '?') using errcode = '23502', detail = 'split_bez_prijemcu';
      end if;
      if coalesce((e->>'podiel')::numeric, 0) <= 0 then
        raise exception 'Podiel musí byť kladný.' using errcode = '22023', detail = 'split_podiel';
      end if;
      v_sum_podiel := v_sum_podiel + (e->>'podiel')::numeric;
      v_suma_podielu := trunc(v_cista * (e->>'podiel')::numeric, v_presnost);
      v_sum_suma := v_sum_suma + v_suma_podielu;
      v_podiely := v_podiely || jsonb_build_array(jsonb_build_object(
        'ucet', v_ucet, 'case', v_case, 'text', e->>'prijemca_text', 'podiel', (e->>'podiel')::numeric,
        'suma', v_suma_podielu, 'fixny', coalesce((e->>'fixny')::boolean, false)));
    end loop;
    if abs(v_sum_podiel - 1.0) > 0.0005 then
      raise exception 'Súčet podielov musí byť 100 %%.' using errcode = '22023', detail = 'split_sucet';
    end if;
    -- zvyšok (centy z orezania) prvému podielu
    v_podiely := jsonb_set(v_podiely, '{0,suma}', to_jsonb(((v_podiely->0->>'suma')::numeric + (v_cista - v_sum_suma))));
  else
    v_prijemca := coalesce(p_prijemca_ucet, (select autor_ucet_id from public.prispevok where id = p_case_id));
    if v_prijemca is null then
      raise exception 'Platba nemá príjemcu s účtom.' using errcode = '23502', detail = 'bez_prijemcu';
    end if;
    v_podiely := jsonb_build_array(jsonb_build_object('ucet', v_prijemca, 'case', p_case_id, 'text', p_prijemca_text,
      'podiel', 1, 'suma', v_cista, 'fixny', true));
  end if;

  -- dar sám sebe z vlastného účtu nič nepresunie (len by zaplatil poplatok) → odmietnuť
  if exists (select 1 from jsonb_array_elements(v_podiely) x where (x->>'ucet')::uuid = v_zdroj) then
    raise exception 'Z vlastného účtu sa na vlastný účet darovať nedá.' using errcode = '22023', detail = 'vlastny_ucet';
  end if;

  -- stav + externý identifikátor (simulované rúry)
  v_mikro := (p_kanal = 'deed' and v_suma <= 1);
  if v_mikro then
    v_stav := 'credited'; v_credited := now();
  elsif p_kanal = 'deed' then
    v_stav := 'settled'; v_credited := now(); v_settled := now();
    v_hash := '0x' || encode(gen_random_bytes(8), 'hex');
  elsif p_kanal in ('fiat','sepa') then
    v_stav := 'settled'; v_credited := now(); v_settled := now();
    v_vs := lpad(nextval('public.vs_seq')::text, 10, '0');
  elsif p_kanal = 'sms' then
    v_stav := 'settled'; v_credited := now(); v_settled := now();
    v_sms := upper(encode(gen_random_bytes(3), 'hex'));
  end if;
  v_doklad := public.novy_doklad();

  insert into public.platba (
    case_id, odosielatel, odosielatel_text, prijemca_ucet, prijemca_text,
    suma, mena, kanal, ext_vs, ext_hash, ext_sms_kod,
    poplatok, marza, cista_suma, tip, stav, idem_kluc, idem_scope, meta, credited_at, settled_at, doklad
  ) values (
    p_case_id, p_odosielatel, p_odosielatel_text, v_prijemca, p_prijemca_text,
    v_suma, p_mena, p_kanal, v_vs, v_hash, v_sms,
    v_poplatok, v_marza, v_cista, v_tip, v_stav, p_idem_kluc, v_scope, coalesce(p_meta,'{}'::jsonb), v_credited, v_settled, v_doklad
  )
  on conflict (idem_scope, idem_kluc) do nothing
  returning * into v_row;
  if v_row.id is null then   -- súbeh: iný request medzitým vložil
    select * into v_row from public.platba where idem_scope = v_scope and idem_kluc = p_idem_kluc;
    if v_row.suma <> v_suma then
      raise exception 'Platba s týmto kľúčom už existuje s inými údajmi.' using errcode = '23505', detail = 'idem_konflikt';
    end if;
    return v_row;
  end if;

  -- pohyby: príchod EUR na účet darcu, podiely, marža, tip
  if v_prijem > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (v_doklad, 0, 'dobitie', public.ucet_systemu('procesor'), v_zdroj, v_prijem, p_mena, p_kanal, v_row.id, p_case_id);
  end if;
  for e in select * from jsonb_array_elements(v_podiely) loop
    i := i + 1;
    if (e->>'suma')::numeric > 0 then
      if p_split is not null and jsonb_typeof(p_split) = 'array' and jsonb_array_length(p_split) > 0 then
        insert into public.platba_split (platba_id, prijemca, prijemca_text, podiel, suma, fixny, case_id)
          values (v_row.id, (e->>'ucet')::uuid, e->>'text', (e->>'podiel')::numeric, (e->>'suma')::numeric,
                  (e->>'fixny')::boolean, nullif(e->>'case','')::uuid);
      end if;
      insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, pre_zbierku)
        values (v_doklad, i, 'dar', v_zdroj, (e->>'ucet')::uuid, (e->>'suma')::numeric, p_mena, p_kanal, v_row.id,
                coalesce(nullif(e->>'case','')::uuid, p_case_id),
                (e->>'fixny')::boolean and coalesce(nullif(e->>'case','')::uuid, p_case_id) is not null);
    end if;
  end loop;
  if v_marza > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (v_doklad, 0, 'poplatok', v_zdroj, public.ucet_systemu('platforma'), v_marza, p_mena, p_kanal, v_row.id, p_case_id);
  end if;
  if v_tip > 0 then
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id)
      values (v_doklad, i + 1, 'dar', v_zdroj, public.ucet_systemu('platforma'), v_tip, p_mena, p_kanal, v_row.id, p_case_id);
  end if;

  return v_row;
end;
$fn$;
grant execute on function public.platba_create(text,numeric,text,text,uuid,uuid,text,uuid,text,boolean,numeric,jsonb,jsonb) to anon, authenticated;

-- ---------- 13 · QR split: cieľ musí mať účet (priamo alebo cez prípad) ----------
create or replace function public.qr_split_create(p_case uuid, p_owner uuid, p_owner_text text, p_owner_podiel numeric, p_ciele jsonb, p_zdroj text default 'osobny', p_mena text default 'DEED')
  returns public.qr_split language plpgsql security definer set search_path = public, extensions as $$
declare v_slug text; v_row public.qr_split; v_sum numeric := 0; e jsonb; v_owner uuid; v_ucet uuid; v_case uuid;
begin
  v_owner := coalesce(p_owner, public.moj_ucet());
  if v_owner is null then raise exception 'qr_bez_uctu' using errcode = '28000'; end if;
  if auth.uid() is not null and v_owner is distinct from public.moj_ucet() then
    raise exception 'cudzi_ucet' using errcode = '42501';
  end if;
  if coalesce(p_owner_podiel,0) < 0.03 then
    raise exception 'owner_podiel musí byť ≥ 0.03 (dostal %)', p_owner_podiel;
  end if;
  select coalesce(sum((x->>'podiel')::numeric), 0) into v_sum
    from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) x;
  if exists (select 1 from jsonb_array_elements(coalesce(p_ciele,'[]'::jsonb)) x
             where (x->>'podiel')::numeric < 0.03) then
    raise exception 'každý podiel organizácie musí byť ≥ 0.03';
  end if;
  if abs((coalesce(p_owner_podiel,0) + v_sum) - 1.0) > 0.0005 then
    raise exception 'Σ podielov musí byť 1.0 (owner % + ciele % = %)', p_owner_podiel, v_sum, p_owner_podiel + v_sum;
  end if;
  -- 2.3: každý cieľ má príjemcu s účtom — inak by jeho podiel zmizol
  for e in select * from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) loop
    v_case := nullif(e->>'case_id','')::uuid;
    v_ucet := coalesce(nullif(e->>'prijemca_ucet','')::uuid, (select autor_ucet_id from public.prispevok where id = v_case));
    if v_ucet is null then
      raise exception 'Príjemca % nemá účet v DEED.', coalesce(e->>'prijemca_text', '?') using errcode = '23502', detail = 'ciel_bez_uctu';
    end if;
  end loop;

  v_slug := public.gen_slug();
  insert into public.qr_split (case_id, owner_ucet_id, owner_text, owner_podiel, zdroj, mena, slug)
    values (p_case, v_owner, p_owner_text, p_owner_podiel, coalesce(p_zdroj,'osobny'), coalesce(p_mena,'DEED'), v_slug)
    returning * into v_row;

  for e in select * from jsonb_array_elements(coalesce(p_ciele, '[]'::jsonb)) loop
    v_case := nullif(e->>'case_id','')::uuid;
    insert into public.qr_split_ciel (qr_split_id, prijemca_ucet, prijemca_text, podiel, fixny, case_id)
      values (v_row.id, coalesce(nullif(e->>'prijemca_ucet','')::uuid, (select autor_ucet_id from public.prispevok where id = v_case)),
              e->>'prijemca_text', (e->>'podiel')::numeric, coalesce((e->>'fixny')::boolean, true), v_case);
  end loop;

  insert into public.qr_kod (typ, objekt_druh, objekt_ref, slug, url, modul)
    values ('static','split', v_row.id::text, v_slug, 'https://deed.good/split/'||v_slug, 'qr')
    on conflict (objekt_druh, objekt_ref) do nothing;
  return v_row;
end $$;

-- platba cez QR: vlastník (nepočíta sa do zbierky) + ciele (do zbierky svojho prípadu)
create or replace function public.qr_split_pay(
  p_slug text, p_idem text, p_suma numeric, p_mena text, p_kanal text,
  p_odosielatel uuid default null, p_odosielatel_text text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_qr public.qr_split; v_split jsonb; v_pl public.platba;
begin
  select * into v_qr from public.qr_split where slug = p_slug and aktivny;
  if not found then raise exception 'QR split % neexistuje', p_slug; end if;
  if v_qr.owner_ucet_id is null then
    raise exception 'Vlastník QR nemá účet v DEED.' using errcode = '23502', detail = 'split_bez_prijemcu';
  end if;

  v_split := jsonb_build_array(jsonb_build_object(
    'prijemca_ucet', v_qr.owner_ucet_id, 'prijemca_text', v_qr.owner_text,
    'podiel', v_qr.owner_podiel, 'fixny', false));
  select v_split || coalesce(jsonb_agg(jsonb_build_object(
           'prijemca_ucet', c.prijemca_ucet, 'case_id', coalesce(c.case_id, v_qr.case_id), 'prijemca_text', c.prijemca_text,
           'podiel', c.podiel, 'fixny', true) order by c.id), '[]'::jsonb)
    into v_split
    from public.qr_split_ciel c where c.qr_split_id = v_qr.id;

  v_pl := public.platba_create(
    p_idem, p_suma, coalesce(p_mena, v_qr.mena), p_kanal,
    v_qr.case_id, p_odosielatel, p_odosielatel_text,
    null, v_qr.owner_text, false, 0,
    jsonb_build_object('qr_split_id', v_qr.id, 'slug', p_slug),
    v_split);

  update public.platba set qr_split_id = v_qr.id where id = v_pl.id and qr_split_id is null;
  return jsonb_build_object('platba_id', v_pl.id, 'qr_split_id', v_qr.id, 'stav', v_pl.stav, 'suma', v_pl.suma);
end;
$fn$;

-- ---------- 14 · escrow krytý peniazmi ----------
alter table public.escrow drop column if exists zostatok;
create or replace view public.v_escrow as
  select e.*,
         coalesce((select sum(p.suma) from public.pohyb p where p.escrow_id = e.id and p.ucet_kredit = public.ucet_systemu('viazane')), 0)
       - coalesce((select sum(p.suma) from public.pohyb p where p.escrow_id = e.id and p.ucet_debet  = public.ucet_systemu('viazane')), 0)
         as zostatok
    from public.escrow e;
grant select on public.v_escrow to anon, authenticated;

create or replace function public.escrow_zostatok(p_escrow uuid) returns numeric
  language sql stable security definer set search_path = public as $$
  select coalesce((select sum(suma) from public.pohyb where escrow_id = p_escrow and ucet_kredit = public.ucet_systemu('viazane')), 0)
       - coalesce((select sum(suma) from public.pohyb where escrow_id = p_escrow and ucet_debet  = public.ucet_systemu('viazane')), 0)
$$;

drop function if exists public.escrow_create(uuid,text,numeric,text,uuid,jsonb);
create function public.escrow_create(
  p_case uuid, p_typ text, p_vklad numeric, p_mena text,
  p_sponzor uuid default null, p_pravidlo jsonb default '{}'::jsonb
) returns public.v_escrow
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_row public.escrow; v_doklad text := public.novy_doklad(); v_kanal text; v_out public.v_escrow;
begin
  if p_sponzor is null then raise exception 'Escrow potrebuje účet firmy.' using errcode = '23502', detail = 'escrow_bez_sponzora'; end if;
  if coalesce(current_setting('role', true), '') in ('anon','authenticated') and p_sponzor is distinct from public.moj_ucet() then
    raise exception 'cudzi_ucet' using errcode = '42501';
  end if;
  if p_vklad is null or p_vklad <= 0 then raise exception 'neplatna_suma' using errcode = '22023'; end if;
  v_kanal := case when p_mena = 'DEED' then 'deed' else 'sepa' end;
  insert into public.escrow (case_id, typ, vklad, mena, sponzor, pravidlo, stav)
    values (p_case, p_typ, round(p_vklad, 2), p_mena, p_sponzor, coalesce(p_pravidlo,'{}'::jsonb), 'aktivny')
    returning * into v_row;
  if p_mena = 'EUR' then
    -- firma uhradila prevodom: EUR prišli cez procesor na jej účet …
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id)
      values (v_doklad, 1, 'dobitie', public.ucet_systemu('procesor'), p_sponzor, v_row.vklad, p_mena, v_kanal, v_row.id, p_case);
  end if;
  -- … a idú na viazaný účet (rezervácia; do zbierky sa ešte nepočíta)
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id)
    values (v_doklad, 2, 'dorovnanie', p_sponzor, public.ucet_systemu('viazane'), v_row.vklad, p_mena, v_kanal, v_row.id, p_case);
  select * into v_out from public.v_escrow where id = v_row.id;
  return v_out;
end;
$fn$;
grant execute on function public.escrow_create(uuid,text,numeric,text,uuid,jsonb) to authenticated;

-- uvoľnenie = presun z viazaného účtu príjemcovi (NIE nový dar → zbierka ho počíta raz)
drop function if exists public.escrow_uvolni(uuid,numeric,uuid,text);
create function public.escrow_uvolni(
  p_escrow uuid, p_suma numeric,
  p_prijemca_ucet uuid default null, p_prijemca_text text default null
) returns public.v_escrow
language plpgsql security definer set search_path = public, extensions as $fn$
declare e public.escrow; v numeric(14,4); v_prijemca uuid; v_out public.v_escrow;
begin
  select * into e from public.escrow where id = p_escrow for update;
  if not found then raise exception 'escrow_neexistuje' using errcode = 'P0002'; end if;
  if coalesce(current_setting('role', true), '') in ('anon','authenticated') and e.sponzor is distinct from public.moj_ucet() then
    raise exception 'cudzi_ucet' using errcode = '42501';
  end if;
  if e.stav not in ('aktivny','uvolneny') then raise exception 'Escrow je uzavretý.' using errcode = '22023', detail = 'escrow_uzavrety'; end if;
  v := least(round(coalesce(p_suma, 0), 2), public.escrow_zostatok(p_escrow));   -- strop: nikdy viac než je viazané
  if v <= 0 then raise exception 'Escrow je vyčerpaný.' using errcode = '22023', detail = 'escrow_prazdny'; end if;
  v_prijemca := coalesce(p_prijemca_ucet, (select autor_ucet_id from public.prispevok where id = e.case_id));
  if v_prijemca is null then raise exception 'Uvoľnenie nemá príjemcu s účtom.' using errcode = '23502', detail = 'bez_prijemcu'; end if;
  insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id, pre_zbierku)
    values (public.novy_doklad(), 1, 'dorovnanie', public.ucet_systemu('viazane'), v_prijemca, v, e.mena,
            case when e.mena = 'DEED' then 'deed' else 'sepa' end, e.id, e.case_id, e.case_id is not null);
  update public.escrow set stav = case when public.escrow_zostatok(p_escrow) <= 0 then 'vycerpany' else 'uvolneny' end where id = p_escrow;
  select * into v_out from public.v_escrow where id = p_escrow;
  return v_out;
end;
$fn$;
grant execute on function public.escrow_uvolni(uuid,numeric,uuid,text) to authenticated;

-- vrátenie zvyšku firme = pohyb typu vratenie s vlastným (vratným) dokladom a jeho VS
create or replace function public.escrow_vrat(p_escrow uuid) returns public.v_escrow
language plpgsql security definer set search_path = public, extensions as $fn$
declare e public.escrow; v numeric(14,4); v_doklad text; v_out public.v_escrow;
begin
  select * into e from public.escrow where id = p_escrow for update;
  if not found then raise exception 'escrow_neexistuje' using errcode = 'P0002'; end if;
  if coalesce(current_setting('role', true), '') in ('anon','authenticated') and e.sponzor is distinct from public.moj_ucet() then
    raise exception 'cudzi_ucet' using errcode = '42501';
  end if;
  v := public.escrow_zostatok(p_escrow);
  if v > 0 then
    v_doklad := public.novy_doklad();
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, escrow_id, case_id, vs)
      values (v_doklad, 1, 'vratenie', public.ucet_systemu('viazane'), e.sponzor, v, e.mena,
              case when e.mena = 'DEED' then 'deed' else 'sepa' end, e.id, e.case_id, v_doklad);
  end if;
  update public.escrow set stav = 'vrateny' where id = p_escrow;
  select * into v_out from public.v_escrow where id = p_escrow;
  return v_out;
end;
$fn$;
grant execute on function public.escrow_vrat(uuid) to authenticated;

-- ---------- 15 · refund = opačný zápis (len server) ----------
create or replace function public.platba_refund(p_platba uuid) returns public.platba
language plpgsql security definer set search_path = public, extensions as $fn$
declare pl public.platba; v_doklad text; r public.pohyb;
begin
  select * into pl from public.platba where id = p_platba for update;
  if not found then raise exception 'platba_neexistuje' using errcode = 'P0002'; end if;
  if pl.stav = 'refunded' then return pl; end if;               -- idempotentné
  v_doklad := public.novy_doklad();                             -- vratný doklad
  for r in select * from public.pohyb where platba_id = p_platba and storno_pre is null order by id loop
    insert into public.pohyb (doklad, poradie, typ, ucet_debet, ucet_kredit, suma, mena, kanal, platba_id, case_id, vs, pre_zbierku, storno_pre, testovaci)
      values (v_doklad, r.poradie, 'vratenie', r.ucet_kredit, r.ucet_debet, r.suma, r.mena, r.kanal, r.platba_id, r.case_id, v_doklad,
              r.pre_zbierku, r.id, r.testovaci);
  end loop;
  update public.platba set stav = 'refunded' where id = p_platba returning * into pl;
  delete from public.podpora where platba_id = p_platba;       -- projekcia „Čo podporujem" (nie peniaze)
  return pl;
end;
$fn$;
revoke all on function public.platba_refund(uuid) from public, anon, authenticated;

-- ---------- 16 · pravidelné platby: zlyhanie jednej nezastaví ostatné ----------
create or replace function public.recurring_tick() returns int
language plpgsql security definer set search_path = public, extensions as $fn$
declare r public.opakovana_platba; n int := 0; v_kanal text; v_int interval;
begin
  for r in select * from public.opakovana_platba
            where stav = 'aktivny' and dalsia_platba is not null and dalsia_platba <= now() loop
    v_kanal := case when r.mena = 'DEED' then 'deed' else 'sepa' end;
    begin
      perform public.platba_create(
        'rec:' || r.id::text || ':' || extract(epoch from r.dalsia_platba)::bigint::text,
        r.suma, r.mena, v_kanal, r.case_id, r.darca, null,
        case when r.rozsah <> 'request' then r.charita_ucet else null end,
        null, false, 0, jsonb_build_object('recurring', r.id, 'rozsah', r.rozsah));
      n := n + 1;
    exception when others then
      insert into public.notifikacia (ucet_id, kat, titul, text)
        values (r.darca, 'penazenka', 'Pravidelná podpora neprešla', 'Tento raz sa platba nezapísala: ' || sqlerrm);
    end;
    v_int := case r.perioda when 'tyzdenne' then interval '7 days' when 'rocne' then interval '1 year' else interval '1 month' end;
    update public.opakovana_platba set dalsia_platba = dalsia_platba + v_int where id = r.id;
  end loop;
  return n;
end;
$fn$;

commit;
