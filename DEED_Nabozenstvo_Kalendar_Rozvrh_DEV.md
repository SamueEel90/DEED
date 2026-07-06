# DEED Náboženstvo — Kalendár + Rozvrh omší (DEV špecifikácia)

*Podklad pre kódovanie. Modul Náboženstvo, režim farár. Nadväzuje na „Strom pridania + polia a akcie" a na rozhodnutia v1.1.*

---

## 1 · Účel a princíp

Farár nastaví **rozvrh omší raz**, systém z neho **automaticky generuje omše a ich zbierky** na celý mesiac dopredu. Farár ručne rieši len **výnimky** (sviatky, mimoriadne omše, zrušenia). Cieľ: minimum klikania — dedinský farár (2 omše/týždeň) aj mestský (3/deň) nastavia raz.

Kľúčové pravidlá (z rozhodnutí v1.1):
- Zbierky žijú v **Help/Charita engine**; v module sa zrkadlia. Feed omšových zbierok = **farský**.
- Settlement omšovej zbierky = **€ na farský účet** (farnosť je príjemca, zamknuté na €).
- Farnosť je **mimo karmy**, badge „overená".

---

## 2 · Dátový model

### 2.1 `RozvrhOmsi` (konfigurácia, 1× na farnosť)
| Pole | Typ | Popis |
|---|---|---|
| `farnostId` | FK | farnosť |
| `defaultTimes` | obj | `{ ranna: "06:30", vecerna: "18:00", nedelnaVelka: "10:30" }` |
| `weeklyPattern` | pole | pre každý deň v týždni zoznam omší (viď 2.2) |
| `generateCollectionPerMass` | bool | true = zbierka ku každej omši; false = jedna spoločná denná |
| `platnostOd` | date | odkedy vzor platí (kvôli budúcim sezónnym zmenám) |

### 2.2 `weeklyPattern[]`
```
{ dayOfWeek: 0–6, masses: [ { type: "ranna|vecerna|velka", time: "HH:MM" } ] }
```
Prázdny `masses` = v ten deň žiadna omša.

### 2.3 `MassInstance` (vygenerovaná konkrétna omša)
| Pole | Typ | Popis |
|---|---|---|
| `id` | PK | |
| `farnostId` | FK | |
| `date` | date | konkrétny dátum |
| `time` | HH:MM | |
| `type` | enum | ranna / vecerna / velka / mimoriadna |
| `source` | enum | `auto` (z rozvrhu) / `manual` (ručne pridaná) / `feast` (zo sviatku) |
| `overrideOf` | FK? | ak je to úprava auto-inštancie pre daný deň |
| `collectionId` | FK? | napojená omšová zbierka |
| `status` | enum | active / cancelled |

### 2.4 `LiturgicalFeast` (číselník sviatkov, predvyplnené)
`{ date, name, kind: "prikazany|neviazany" }` — zdroj: cirkevný kalendár. Prekrýva sa cez kalendár, predvypĺňa `MassInstance(source=feast)`.

### 2.5 Napojenie na `Collection`
Omšová zbierka = štandardná `Collection` (Help/Charita engine): `owner=farnosť`, `settlement=EUR`, `feed=farský`, `window: open = deň omše, close = 23:59 toho dňa` (per rozhodnutie „o polnoci zavrie, zajtra nová"). Ak `generateCollectionPerMass=false` → jedna denná `Collection` pre všetky omše dňa.

---

## 3 · Rozvrh omší — nastavenie (setup UI)

### 3.1 Predvolené časy (nastav raz)
Tri rozbaľovačky: `ranná` [6:00 / 6:30 / 7:00], `večerná` [17:30 / 18:00], `nedeľná veľká` [9:00 / 10:30]. Uložené v `defaultTimes`. Časy sa vyplnia do každej novej omše daného typu.

### 3.2 Týždenný vzor (nastav raz, opakuje sa)
Farár definuje, ktoré **dni** majú ktoré omše (napr. streda + piatok večerná; nedeľa ranná + veľká). Uložené v `weeklyPattern`. Rýchly štart: tlačidlo **„predvyplniť bežný rozvrh"** naplní typický vzor, ktorý si upraví.

### 3.3 Generovanie
Pri uložení rozvrhu systém vygeneruje `MassInstance(source=auto)` na **rolujúce obdobie** (napr. nasledujúce 2–3 mesiace) podľa `weeklyPattern` + `defaultTimes`. Nové obdobie sa dogeneruje priebežne (cron). Sviatky z `LiturgicalFeast` sa prekryjú (`source=feast`).

---

## 4 · Kalendár — mesačný pohľad (výstup + editácia)

### 4.1 Zobrazenie
Mesačná mriežka (po–ne). Každý deň zobrazuje `MassInstance` toho dňa ako **časové chipy** (napr. „18:00"). Sviatok = zvýraznený štítok „sviatok". Deň „dnes" zvýraznený. Popri omšiach sa v dni zobrazujú aj iné `Udalosti` (svadba/pohreb/púť/brigáda) — farby podľa kategórie (omša/sviatok = zelená, svadba/pohreb = coral, púť/akcia/brigáda = fialová).

### 4.2 Deň detail + zaškrtávacie políčka
Rozklik dňa → panel so **zaškrtávacími poľami** pre štandardné omše toho dňa (ranná / večerná / veľká), **predškrtnuté podľa vzoru**, čas editovateľný (`input time`).
- **Odškrtnutie** = zruší `MassInstance` pre daný deň (override, `status=cancelled`) — vzor ostáva nedotknutý pre ostatné týždne.
- **Zaškrtnutie** navyše = vytvorí `MassInstance(source=manual/override)` pre daný deň.
- **Zmena času** = override času len pre daný deň.
- Sviatok: predškrtnutý z `LiturgicalFeast`, farár doladí časy.

### 4.3 Pridanie mimoriadnej / inej udalosti
V dennom paneli tlačidlá: **„+ mimoriadna omša"** (vytvorí `MassInstance(source=manual)`), **„+ iná udalosť"** → typový výber (Sviatok · Púť · Akcia · Svadba · Pohreb · Brigáda · Oznam) = vstup do stromu pridania (viď matica).

---

## 5 · Zbierky napojené na omše

- `generateCollectionPerMass=true`: každá `MassInstance` dostane vlastnú `Collection` (window = deň, close 23:59).
- `false`: jedna denná `Collection` „dnešné omše".
- **Granularita = nastaviteľná** (rozhodnutie odložené cirkevníkom — mechanika hotová ako toggle).
- Zbierka sa v kalendári/dni indikuje štítkom (napr. „auto · omšová zbierka").

### 5.1 Evidencia vs. zúčtovanie (rieši réžiu mikro-zbieriek)
- **Evidencia = per zbierka:** každá `Collection` má **vlastný záznam a sumár** (napr. „večerná 15.7 = €12", „nedeľná = €40"). Granularita a prehľad ostávajú.
- **Zúčtovanie = DÁVKOVO spoločne:** transakcie sa poolujú a settlujú spolu — **jeden payout na farnosť, jedna konverzia** (ak je v hre DEED→€).
- **Kľúčové ekonomicky (poplatky, ktoré PLATÍME):** transakčný poplatok PSP/karty/off-rampu je fixný (~€0,25 + % **na transakciu**). Na €0,50 dare by zožral skoro celý dar a platforma by na ňom **prerobila**. Batch = poplatok sa platí **raz z dávky**, nie z každej €0,50 → mikro dary sú vôbec ekonomicky možné len takto.
- Parameter: **okno dávky** (denne / týždenne, nastaviteľné).
- Platí **všeobecne pre všetky zbierky**, nielen omšové.
- **Dôsledok:** granularita per-omša prestáva byť drahá (evidencia je lacná, settlement je batchovaný) → toggle `generateCollectionPerMass` môže ostať zapnutý bez fee proliferácie. Rieši red team D4.
- **Zrušená omša s mikro-oferou:** ofera sa **prevalí na najbližšiu** omšovú zbierku, žiadny refund (mikro sumy). Projektová zbierka (napr. strecha) je samostatná, s omšou sa neruší. Rieši red team D2 zdravým rozumom.

---

## 6 · Sviatky (cirkevný kalendár)

`LiturgicalFeast` je predplnený číselník. Na dané dátumy systém predvyplní deň ako sviatok + navrhne omše (predškrtnuté políčka). Farár len potvrdí/upraví časy. Rieši „manuálne opravím len keď sú sviatky".

---

## 7 · Roly a prístup

- Rozvrh a kalendár edituje len **farár** (režim organizácie, prihlásený pod svojím KYC účtom, farnosť napojená cez KYB). Môže delegovať (kaplán/rada) — osobné účty + roly, nie zdieľané heslo.
- Bežný user rozvrh nevidí ako editovateľný — vidí len výsledný program vo feede/karte farnosti.

---

## 8 · Feed a viditeľnosť

- Omše, sviatky, program → **farský feed**.
- Omšová zbierka → engine Help/Charita, viditeľná vo farskom feede (mirror).
- Žiadne komentáre (železné pravidlo platformy). Akcie na karte: Srdiečko (reakcia) · Zdieľať · Prispieť (omšová zbierka) · Pripomeň/kalendár. Omša nemá RSVP.

---

## 9 · Otvorené body / budúce

- **Sezónne časy** (leto/zima, advent roráty) → cez `platnostOd` viacero verzií vzoru. Neimplementovať v prvej verzii, len počítať s poľom.
- **Granularita zbierky** (per-omša vs. denná) → default zapnuté per-omša, finálne rozhodnutie cirkevníci.
- Rozsah predgenerovania (koľko mesiacov dopredu) — ladiť podľa výkonu.

---

## 10 · Akceptačné kritériá

1. Farár nastaví predvolené časy + týždenný vzor → kalendár sa naplní omšami na celý mesiac bez ďalšieho klikania.
2. Odškrtnutie omše v jednom dni nezruší vzor pre ostatné týždne.
3. Sviatok z cirkevného kalendára je predvyplnený a upraviteľný.
4. Pri `generateCollectionPerMass=true` má každá omša vlastnú zbierku so správnym window (close 23:59), settlement €, feed farský.
5. Mimoriadna omša / iná udalosť sa pridá cez denný panel a objaví sa v kalendári aj feede.
6. Nikde nie sú komentáre; omša nemá RSVP; má pripomienku.

---

*Pripravil Fero pre Martina, 6. 7. 2026. Nadväzuje na maticu stromu pridania a záznam rozhodnutí v1.1.*
