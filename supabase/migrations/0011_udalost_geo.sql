-- DEED · Fáza H — geo pre udalosti (nástenka) → reálne body na mape + počty v okruhu
-- Existujúce udalosti (0004) nemali súradnice. Priraďujeme reálne polohy v Trenčíne
-- podľa miesta konania; online udalosti ostávajú bez geo (nepatria na mapu).
-- Idempotentné: re-run nastaví tie isté hodnoty (UPDATE podľa miesta).

update public.udalost u set lat = v.lat, lng = v.lng
from (values
  ('Mierové námestie',            48.8945, 18.0445),
  ('Mierové námestie a okolie',   48.8951, 18.0456),
  ('Mestský park',               48.8930, 18.0490),
  ('Breh Váhu, Sihoť',           48.9002, 18.0381),
  ('Komunitné centrum',          48.8940, 18.0462),
  ('Mestský úrad',               48.8939, 18.0411),
  ('Ateliér, centrum',           48.8948, 18.0438),
  ('Materské centrum, centrum',  48.8946, 18.0452),
  ('Nemocnica, detské oddelenie',48.8862, 18.0533),
  ('KC Juh',                     48.8770, 18.0300),
  ('Komunitná záhrada, Juh',     48.8760, 18.0312),
  ('KC Sihoť',                   48.9010, 18.0390),
  ('KC Aktivity',                48.8935, 18.0470),
  ('Music Club, Trenčín',        48.8951, 18.0440)
) as v(miesto, lat, lng)
where u.miesto = v.miesto;
