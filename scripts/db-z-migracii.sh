#!/usr/bin/env bash
# ============================================================
# Zadanie 5 · 5.2 — postaví ČISTÚ databázu zo všetkých migrácií v poradí a pustí DB testy.
# Spadne na: kolízii čísel migrácií, prvej chybe v migrácii, neúspešnej kontrole v teste.
# Použitie: PGHOST/PGPORT/PGUSER (/PGPASSWORD) nastavené na prázdny Postgres 15+.
#   bash scripts/db-z-migracii.sh            (DB „deed_ci" sa vytvorí nanovo)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DB:-deed_ci}"
export LC_ALL=C
ERR=$(mktemp)

# 1) kolízia čísel: rovnaké číslo (aj s písmenom, napr. 0014c) smie mať len jeden súbor
dupl=$(ls supabase/migrations/*.sql | xargs -n1 basename | sed -E 's/^([0-9]{4}[a-z]?)_.*/\1/' | sort | uniq -d)
if [ -n "$dupl" ]; then echo "Kolízia čísel migrácií: $dupl"; exit 1; fi

# 2) čistá DB + minimálne prostredie Supabase
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/ci/supabase_stub.sql

# 3) všetky migrácie v poradí (poradie = názov súboru)
for f in $(ls supabase/migrations/*.sql | sort); do
  echo "→ $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f" >/dev/null 2>"$ERR" || { cat "$ERR"; echo "Migrácia zlyhala: $f"; exit 1; }
  grep -v NOTICE "$ERR" || true
done

# 4) DB testy (bežia v transakcii s ROLLBACK); každý riadok musí mať ok = t
for t in $(ls supabase/tests/*.sql 2>/dev/null | sort); do
  echo "→ test $(basename "$t")"
  out=$(psql -v ON_ERROR_STOP=1 -q -A -d "$DB" -f "$t")
  if echo "$out" | grep -Eq '^f\|'; then echo "$out" | grep -E '^f\|'; echo "Test zlyhal: $t"; exit 1; fi
done
echo "Čistá DB zo všetkých migrácií: OK"
