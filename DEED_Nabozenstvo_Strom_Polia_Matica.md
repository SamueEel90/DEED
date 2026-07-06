# Modul Náboženstvo — Strom pridania + polia a akcie (DEV MATICA)

*Dev-ready špecifikácia: každý uzol „+ Pridať" má priradené polia (čo vyplní tvorca) a akcie (čo dostane user). Podklad pre kódovanie.*

## Univerzálne pravidlá

- **Každý príspevok má vždy:** `Reakcia (srdiečko)` + `Zdieľať`.
- **NIKDE komentáre** — železné pravidlo celej platformy („u nás sa nekecá").
- **Reakcia v module Náboženstvo = srdiečko** (NIE palec hore — palec ostáva v Core; moduly sa nemiešajú). Význam kontextový: bežne „srdce", pri úmrtí/pohrebe/smútočnom = kondolencia, pri prosbe o modlitbu = „modlím sa".
- **Hlavička každej karty:** vydavateľ (napr. Farský úrad Trenčín) + ✓ overená (+ dátum ak udalosť).
- **Kto tvorí:** `F` = farár · `R→F` = dotknutý (registrovaný) podá → farár schváli · `U` = user (KYC) → auto-publish, farár môže zmazať.
- **Notifikácie:** user si volí po type (push / v appke / nič).

---

## Vstupné body pridávania („+")

- **„+" tlačidlo na ploche (feed)** = univerzálne, **kontextové podľa toho, kto je prihlásený**:
  - **user** → ponúkne len jeho možnosti: Oznam (smútočný · jubilejný · poďakovanie · prosba o modlitbu).
  - **farár** (prepnutý na kontext Farnosť) → ponúkne celý strom: Zbierka · Udalosť · Oznam · Dobrovoľníctvo.
- **Farár má navyše Môj DEED** (správcovský panel): kalendár · správa zbierok · to isté „+" full menu. Vždy má ako pridať — cez „+" na ploche aj cez Môj DEED.
- To isté tlačidlo, len ponuka sa mení podľa roly. User nikdy neuvidí farárove možnosti a naopak.

## User oznam — flow vytvorenia

1. Hlavička = **meno usera z registrácie/KYC** (nie farský úrad → jasné kto napísal, accountability).
2. Textové pole.
3. Foto/video (voliteľné).
4. **Ukážka (preview) → publikovať** (auto-publish, farár môže zmazať).

## 1 · ZBIERKA  (finančná / ľudská; polia podľa módu — viď záznam sekcia O)

| Uzol | Kto tvorí | Polia pri vytvorení | Akcie navyše (+ Like, Zdieľať) | Feed |
|---|---|---|---|---|
| všeobecná farská | F | popis · tagy · suma · foto/video · split (voliteľné) · dĺžka | **Prispieť** | farský (+ Charita) |
| na akciu | F | ako vyššie + väzba na udalosť | **Prispieť** | farský |
| pre iného — registrovaný | F | scan QR príjemcu · split (napr. 3/97) · text · foto | **Prispieť** | iba farský |
| pre iného — neregistrovaný | F | plný Help wizard (8 krokov: podmienky · opis · IBAN overenie · téma · suma · doklady/escrow · foto · kanál) | **Prispieť** | Help + farský |

*Ľudská pomoc = bez sumy → napojí Dobrovoľníctvo.*

## 2 · UDALOSŤ  (má dátum/čas → kalendár + pripomienka)

| Uzol | Kto tvorí | Polia pri vytvorení | Akcie navyše (+ Like, Zdieľať) | Feed |
|---|---|---|---|---|
| omša (z rozvrhu) | F | čas z rozvrhu · poznámka · *auto-generuje omšovú zbierku* | Prispieť (omšová zbierka) · Pripomeň/kalendár | farský |
| prikázaný sviatok | F | dátum (predvyplnený z cirk. kalendára) · časy omší · poznámka | Prispieť (ak zbierka) · Pripomeň/kalendár | farský |
| sviatok | F | dátum · časy · poznámka | Prispieť (ak zbierka) · Pripomeň/kalendár | farský |
| **púť** | F | názov · dátum · popis · foto · (voliteľná zbierka na dopravu) · kapacita | **Zúčastním sa (RSVP) + počet** · Prispieť (ak zbierka) · Pripomeň/kalendár | farský |
| akcia (koncert, ples, farský deň) | F | názov · dátum · popis · foto · (vstupné/zbierka) | **Zúčastním sa + počet** · Prispieť (ak zbierka) · Pripomeň/kalendár | farský |
| svadba | R→F / QR-merge | mená snúbencov (+ foto so súhlasom) · dátum · (zbierka: QR-merge split) · text | Prispieť (ak zbierka) | **iba farský** |
| pohreb | R→F (registrovaný, scan QR) | meno zosnulého (+ súhlas rodiny) · foto (voliteľné) · dátum · zbierka QR-merge split 3/97 · predĺžené okno ~týždeň · text | **Prispieť** (pohrebná zbierka) | **iba farský** |

## 3 · OZNAM  (dátum nemusí; default len Like + Zdieľať)

| Uzol | Kto tvorí | Polia pri vytvorení | Akcie navyše (+ Like, Zdieľať) | Feed |
|---|---|---|---|---|
| zmenové (omša nebude / zmena programu) | F | text · (platnosť od–do) | — | farský · *notif default ON* |
| úmrtie | R→F | meno zosnulého (+ súhlas) · foto (voliteľné) · odkaz na pohreb | **Prispieť** (→ pohrebná zbierka) | iba farský |
| ohlášky | F | mená snúbencov · dátum sobáša · (odkaz na svadbu) | — | farský |
| smútočný (spomienka) | U | text · meno (koho spomíname) · foto (voliteľné) | — | farský |
| jubilejný | U | text · meno jubilanta · dátum · foto (voliteľné) | — | farský |
| poďakovanie | U | text · (komu) | — | farský |
| prosba o modlitbu | U | text (za koho/čo) | — (Like = „modlím sa") | farský |

## 4 · DOBROVOĽNÍCTVO

| Uzol | Kto tvorí | Polia pri vytvorení | Akcie navyše (+ Like, Zdieľať) | Feed |
|---|---|---|---|---|
| brigáda | F (alebo člen → schváli) | názov · dátum · popis · koľko rúk treba · foto · **event QR** (proof-of-presence) | **Zúčastním sa (RSVP) + počet** · Pripomeň/kalendár · Prispieť (ak zbierka na materiál) | farský · *event QR → účastník karma za účasť* |

---

## Rozdeliť dar (Split QR — farársky variant)

Rovnaká mechanika ako influencer Split QR, len farárove labely. Použitie: pohreb, svadba, akákoľvek zbierka s viacerými príjemcami.

- **UI = jedna lišta (bežec).** Ľavý koniec „viac kostolu", pravý „viac rodine". Naživo ukazuje % oboch strán.
- **Labely vo farskom jazyku** (NIE „cico / ide ďalej / zvyšok"): pri pohrebe napr. **„Rodine (pozostalí)"** + **„Kostolu — dar na sviečky, výzdobu (dobrovoľné)"**.
- **Min 3 % na príjemcu.** Ak rodina nechce dať kostolu nič → kostol jednoducho nepridá (nie ťahanie na 0).
- **Pridať ďalšieho príjemcu** cez hľadanie (charita / žiadosť).
- **% sa po vytvorení zafixujú = záväzok.** Rozsah 3–100 %.
- **Kostolný podiel = dobrovoľný dar rodiny** (nie cut platformy) — default 0 alebo návrh 3 %, rodina rozhodne. Rieši S1/S2 (žiadny „cut zo smútku", žiadny garant).
- Výstup: **Vygenerovať split QR** → dar sa rozdelí podľa nastavenia; pravosť rieši komunitné **Overujem/Namietam** (reuse z Help/Core), nie záruka cirkvi.

---

*Poznámka pre vývoj: „Prispieť" sa zobrazí len ak má uzol napojenú zbierku. „Zúčastním sa/RSVP" a „Pripomeň/kalendár" len pri uzloch s dátumom (Udalosť, brigáda). Omša RSVP nemá (chodí sa bez prihlásenia), má len pripomienku. Fero, 6. 7. 2026.*
