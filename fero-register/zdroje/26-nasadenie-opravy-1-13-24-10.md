# Zdroj 26 · Nasadenie opráv 1–13 + Odkazy 67 + čistý stôl (24. 10. večer, Samuel)

**Kto:** Samuel (spúšťal SQL, Vercel) + Claude na Samuelovom PC (overovanie DB, merge). **Kde:** DEED2 (`rhezwyrdrfljouxoevye`), GitHub `master` + `platby-modul`, Vercel `deed-help`.

## Odchýlka od postupu (rozhodol Samuel)
Opravy **2–13 nasadené naraz**, nie po jednej s Martinovým testom medzi nimi. Martin ich pretestuje dodatočne podľa `opravy_2-13_odovzdanie.md`. Oprava 1 išla ešte samostatne.

## Čo je v DB (DEED2) — overené dotazmi
- **0171–0175** (Odkazy 67): kontroly z odkazu sedia (8 funkcií, 4 triggery, `stranka_program.pozvana_mesiacov`, cron `deed-sprava-ukoncenia */10`).
- **Čistý stôl** (`cisty_stol.sql`): reťaze ukončené, Sodo (`farnost:hlavna`) ukončená, dorovnania ukončené + skryté → kontrola **0 | 0 | 0**.
- **0176** (oprava 1): 6 funkcií, 4 stĺpce na `platba`, cron `deed-platba-pending 23 * * * *`.
- **0177–0188** (opravy 2–13): spustené z verzie **`fa30e32`** (vetva `ci-kontrola-vsetko`, CI zelené) — teda s Martinovými CI opravami v **0177** (dorovnanie_dar podľa idem) a **0180** (`clovek_overeny`). 13 nových funkcií, 5 triggerov, cron `deed-zbierky-po-termine 41 * * * *`, `deed-push-kop` s hlavičkou `x-cron-token`, `deed-dorovnanie-automat` odhlásený.
- **Testovacia pokladňa ostáva zapnutá. `ostry_start()` NEVOLANÉ.**
- DEED2 má **0001–0188**. Ďalšia migrácia od **0189**.

## Diagnostika Bena (krok 0 čistého stola)
Martinova reťaz `rt-1792358296012-jnet` mala v rade jedinú položku `farnost:hlavna` (= Sodo), **Ben (`zb-mvfna3uh`) v nej nebol vôbec** → `retaz_podporuju('zb-mvfna3uh')` = `[]`. Nie je to nezhoda id, Ben jednoducho nebol pridaný. Reťaz je aj tak ukončená čistým stolom.

## zmaz_testovacie — zásah mimo plánu (povolil Samuel)
Prvé volanie vrátilo `NEZMAZANÉ — po výmaze by 1 účtov skončilo v mínuse`. Príčina: pasívny účet `23df6ff3-5aa2-4d55-8da0-5510fd21a637` (podpis „Martin Konaľ“) dostal testovacie dobitie 1 240 DeeD (s príznakom) a z neho poslal 6 darov **bez príznaku** (pred 0157), spolu 1 150 DeeD:
- 10. 10.: 3 × 100 → „Zbierka na pizzu pre ghoulov“ (`zb-mv2rsuc6`), 50 → „pomozte presvedcit sister imperator…“ (`zb-mv2sj5w3`)
- 15. 10.: 300 + 500 → „Večerná omša 18:00“ (`farnost:farnost-zv-0-2026-10-15-1800`)

Riešenie: týchto 6 **platieb** dostalo `testovaci = true` (pohyby sa nemenili) → poistka 0157 prešla (v mínuse 0) → výmaz kódom `E67C53`: **187 pohybov, 87 platieb (976 €), podpora 87, rozdelenia 77, escrow 2**. V ledgeri ostalo 36 pohybov, žiadny účet v mínuse.

## GitHub
- PR **#63** (oprava 1) zlúčený do `master`.
- PR **#64–#75** (opravy 2–13) zlúčené do `master` v poradí → `84be64a`. Obsah = `fa30e32` + to, čo `master` mal navyše (CI opravy opravy 1, 0176 s `ip_klienta` fixom, drobnosti v testoch / `personalizaciaStore.ts`). Overené diffom.
- PR **#76** (`ci-kontrola-vsetko`) zatvoril Martin, nezlúčený — jeho obsah prišiel cez #64–#75.
- `master` zlúčený do `platby-modul` → **Martin, pred ďalšou prácou `git pull` na `platby-modul`.**

## Vercel (`deed-help`)
- `PLATBA_WEBHOOK_SECRET` — production, preview, development.
- `PUSH_CRON_TOKEN` — doplnené. **Vault `push_cron_token` pri poslednej kontrole CHÝBAL** — kým ho Samuel nedoplní (rovnaká hodnota), `/api/push` vracia 401 a push čaká v DB.
- `SUPABASE_SERVICE_ROLE_KEY` len production (webhook na preview nepôjde).

## Čo ostáva
- Martin: test opravy 1 (`oprava1_odovzdanie.md`) a opráv 2–13 (`opravy_2-13_odovzdanie.md`). Pri chybe → nová migrácia od 0189, pushnuté sa nemenia.
- Rozhodnutia z `martin_dalsie_kroky.md` (zlyhané dary — mazať po X dňoch?, „Ukončiť reťaz“, „Cez charitu“, R4/R6/R8, localStorage → DB) bez zmeny.
