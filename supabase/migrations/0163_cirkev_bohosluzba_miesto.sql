-- ============================================================
-- 0163 · Balík 47 bod 3 (Svetlúšik · Prvé kroky farára) · číselník cirkví: výrazy pre sprievodcu, nie napevno katolícke.
-- Nové stĺpce v public.cirkev (0078/0091):
--   jednotka   — 1. pád (farnosť · cirkevný zbor · zbor · cirkevná obec · náboženská obec · spoločenstvo)
--   vasa       — „Vaša farnosť“ · „Váš cirkevný zbor“ · „Vaše spoločenstvo“ (rod podľa jednotky)
--   bohosluzba / bohosluzby — svätá omša / sväté omše · svätá liturgia · bohoslužba
--   miesto / miesto_a       — kostol / kostol · chrám · synagóga / synagógu · miesto stretnutí
-- Hodnoty podľa tabuľky v balíku 47. Zbory bez kostola (modlitebňa) zatiaľ nie sú odlíšené — kostol, kým Soňa nepovie.
-- Spúšťa sa po 0162.
-- ============================================================
begin;

alter table public.cirkev add column if not exists jednotka text;
alter table public.cirkev add column if not exists vasa text;
alter table public.cirkev add column if not exists bohosluzba text;
alter table public.cirkev add column if not exists bohosluzby text;
alter table public.cirkev add column if not exists miesto text;
alter table public.cirkev add column if not exists miesto_a text;

update public.cirkev c set jednotka = v.jednotka, vasa = v.vasa, bohosluzba = v.b1, bohosluzby = v.b2, miesto = v.m1, miesto_a = v.m4
  from (values
    ('RKC',  'farnosť',          'Vaša farnosť',          'svätá omša',     'sväté omše',     'kostol',          'kostol'),
    ('GKC',  'farnosť',          'Vaša farnosť',          'svätá liturgia', 'sväté liturgie', 'chrám',           'chrám'),
    ('PC',   'cirkevná obec',    'Vaša cirkevná obec',    'svätá liturgia', 'sväté liturgie', 'chrám',           'chrám'),
    ('ECAV', 'cirkevný zbor',    'Váš cirkevný zbor',     'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('RKCr', 'cirkevný zbor',    'Váš cirkevný zbor',     'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('ECM',  'zbor',             'Váš zbor',              'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('BJB',  'zbor',             'Váš zbor',              'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('CB',   'zbor',             'Váš zbor',              'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('ACS',  'zbor',             'Váš zbor',              'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('KZ',   'zbor',             'Váš zbor',              'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('CASD', 'zbor',             'Váš zbor',              'bohoslužba',     'bohoslužby',     'kostol',          'kostol'),
    ('ÚZŽNO','náboženská obec',  'Vaša náboženská obec',  'bohoslužba',     'bohoslužby',     'synagóga',        'synagógu'),
    ('SKC',  'spoločenstvo',     'Vaše spoločenstvo',     'svätá omša',     'sväté omše',     'kostol',          'kostol')
  ) as v(kod, jednotka, vasa, b1, b2, m1, m4)
 where c.kod = v.kod;

-- ostatné a neznáme: spoločenstvo · bohoslužba · miesto stretnutí
update public.cirkev set jednotka = 'spoločenstvo', vasa = 'Vaše spoločenstvo', bohosluzba = 'bohoslužba', bohosluzby = 'bohoslužby',
       miesto = 'miesto stretnutí', miesto_a = 'miesto stretnutí'
 where jednotka is null;

commit;
