-- ============================================================
-- 0078 · KARTA 61 §0 — slová podľa cirkvi (číselník, nie kód)
-- Rozšírenie 0076: jeden riadok na cirkev (18 registrovaných v SR, kódy ako farnost_adresar.cirkev).
-- V appke je jedna rola „duchovný“, mení sa len slovo: titul (Farár / Kazateľ / Otec duchovný / Rabín / Duchovný správca),
-- titul v 2. páde, jednotka v 2. páde (farnosti / cirkevného zboru / zboru / cirkevnej obce / náboženskej obce / spoločenstva),
-- návrh oslovenia a či má cirkev Dozorcu (evanjelické a protestantské zbory).
-- Číta každý, zápis len cez migráciu.
-- ============================================================
begin;

create table if not exists public.cirkev (
  kod          text primary key,
  nazov        text not null,
  kategoria    smallint not null,          -- 0 katolícke a východné · 1 evanjelické a protestantské · 2 ostatné kresťanské · 3 nekresťanské
  titul        text not null,
  titul_2p     text not null,
  jednotka_2p  text not null,
  oslovenie    text,
  dozorca      boolean not null default false
);
alter table public.cirkev enable row level security;
drop policy if exists cirkev_citat on public.cirkev;
create policy cirkev_citat on public.cirkev for select to anon, authenticated using (true);
revoke all on table public.cirkev from anon, authenticated;
grant select on table public.cirkev to anon, authenticated;

insert into public.cirkev (kod, nazov, kategoria, titul, titul_2p, jednotka_2p, oslovenie, dozorca) values
  ('RKC',   'Rímskokatolícka cirkev v SR',                            0, 'Farár',            'farára',             'farnosti',           'pán farár',     false),
  ('GKC',   'Gréckokatolícka cirkev na Slovensku',                    0, 'Farár',            'farára',             'farnosti',           'otec',          false),
  ('PC',    'Pravoslávna cirkev na Slovensku',                        0, 'Otec duchovný',    'otca duchovného',    'cirkevnej obce',     'otec',          false),
  ('ECAV',  'Evanjelická cirkev augsburského vyznania na Slovensku',  1, 'Farár',            'farára',             'cirkevného zboru',   'brat farár',    true),
  ('RKCr',  'Reformovaná kresťanská cirkev na Slovensku',             1, 'Farár',            'farára',             'cirkevného zboru',   'brat farár',    true),
  ('ECM',   'Evanjelická cirkev metodistická, Slovenská oblasť',      1, 'Kazateľ',          'kazateľa',           'zboru',              'brat kazateľ',  true),
  ('BJB',   'Bratská jednota baptistov v SR',                         1, 'Kazateľ',          'kazateľa',           'zboru',              'brat kazateľ',  true),
  ('CB',    'Cirkev bratská v SR',                                    1, 'Kazateľ',          'kazateľa',           'zboru',              'brat kazateľ',  true),
  ('ACS',   'Apoštolská cirkev na Slovensku',                         1, 'Kazateľ',          'kazateľa',           'zboru',              'brat kazateľ',  true),
  ('KZ',    'Kresťanské zbory na Slovensku',                          1, 'Kazateľ',          'kazateľa',           'zboru',              'brat',          true),
  ('CASD',  'Cirkev adventistov siedmeho dňa',                        2, 'Kazateľ',          'kazateľa',           'zboru',              'brat kazateľ',  false),
  ('CČSH',  'Cirkev československá husitská na Slovensku',            2, 'Duchovný správca', 'duchovného správcu', 'spoločenstva',       null,            false),
  ('LDS',   'Cirkev Ježiša Krista Svätých neskorších dní v SR',       2, 'Duchovný správca', 'duchovného správcu', 'spoločenstva',       null,            false),
  ('JS',    'Náboženská spoločnosť Jehovovi svedkovia v SR',          2, 'Duchovný správca', 'duchovného správcu', 'spoločenstva',       null,            false),
  ('NAC',   'Novoapoštolská cirkev v SR',                             2, 'Duchovný správca', 'duchovného správcu', 'spoločenstva',       null,            false),
  ('SKC',   'Starokatolícka cirkev na Slovensku',                     2, 'Duchovný správca', 'duchovného správcu', 'spoločenstva',       null,            false),
  ('ÚZŽNO', 'Ústredný zväz židovských náboženských obcí v SR',        3, 'Rabín',            'rabína',             'náboženskej obce',   'pán rabín',     false),
  ('BS',    'Bahájske spoločenstvo v SR',                             3, 'Duchovný správca', 'duchovného správcu', 'spoločenstva',       null,            false)
on conflict (kod) do update set nazov = excluded.nazov, kategoria = excluded.kategoria, titul = excluded.titul, titul_2p = excluded.titul_2p,
  jednotka_2p = excluded.jednotka_2p, oslovenie = excluded.oslovenie, dozorca = excluded.dozorca;

-- cirkev farnosti musí byť v číselníku (check z 0076 ostáva, pribúda cudzí kľúč)
alter table public.farnost_adresar drop constraint if exists farnost_adresar_cirkev_fk;
alter table public.farnost_adresar add constraint farnost_adresar_cirkev_fk foreign key (cirkev) references public.cirkev (kod);

commit;
