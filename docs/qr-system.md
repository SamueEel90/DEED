# QR systém (§10) — opis

Univerzálny QR kód má 4 typy (`QR_TYPY` v `src/lib/qr.ts`) + jeho vizuál a 3 výstupy
(skenovať / kopírovať / zdieľať) rieši `QrModal` (`src/components/qr.tsx`).

| typ | tag | rotácia | popis |
|-----|-----|---------|-------|
| `identita` | Identity Card | 30 s | overenie identity člena — rotujúci kód |
| `platba` | Platobný QR | statický | pošli DEED / prepitné |
| `akcia` | Akčný QR | 15 s | overenie účasti (proof-of-presence, TOTP) |
| `skutok` | QR skutku | statický | odkaz na skutok / reťaz dobra |
| `rozdelenie` | **Split QR** | statický | **rozdelenie platby — % pre viacerých príjemcov (influencer)** |

## Split QR (influencer) — prepojenie QR × Reťaz dobra

Reťaz dobra (§9) posiela vopred určenú **časť** (%) toho, čo niekto dostane za skutok,
ďalej na **jednu** žiadosť (`RetazDobraSheet`, badge `D+R {pct}%`). **Split QR** to
zovšeobecňuje na **viacero** príjemcov: keď skutok / charitu / event robí **influencer**,
nastaví v QR, **aká časť platby ide komu** — jemu samému a vybraným charitám/žiadostiam.

- Komponent: `SplitQrSheet` (`src/components/splitqr.tsx`).
  - Krok 1 — *nastav*: influencer si nechá **zvyšok**; k jednotlivým charitám/žiadostiam
    (z `useRetazZiadosti`) nastaví ich % posuvníkom. Súčet je vždy 100 % (influencer = `100 − Σ`).
  - Krok 2 — *hotovo*: `QrModal typ="rozdelenie" split={[…]}` — QR s badge **SPLIT** a
    rozpisom „ROZDELENIE PLATBY" (kto → koľko %).
- **% sa pri vzniku zafixujú** (záväzok, ako v Reťazi dobra).
- Beží nad `platba_split` (Σ = 1.0, Payment Engine — Fáza 4). Dnes **namockované**
  (žiadny DB zápis nie je nutný); skén ukáže príjemcov a ich podiely.
- Vstupné body: **Domov → detail skutku** („Influencer: rozdeliť platbu") a
  **Charita → detail zbierky** („🎬 Influencer: rozdeliť platbu (Split QR)").
