# DEED Reťaz tvorcu — Fronta a Overflow (DEV špecifikácia v2)

*Podklad pre kódovanie do testovacieho modulu. Nadväzuje na Creator doplnok v1.1 a QR Katalóg v2. Rozhodnuté Martin + Fero, 8. 7. 2026. **v2 nahrádza prvé znenie z dnešného dňa — paralelný split viacerých zbierok pre tvorcu ZRUŠENÝ.***

---

## 1 · Účel a KĽÚČOVÉ ROZHODNUTIE

Tvorca (youtuber/influencer/autor) smeruje % svojho honoráru na zbierku. Zbierka sa naplní — peniaze sa nesmú zastaviť.

**ROZHODNUTÉ (Martin, 8. 7.): tvorca podporuje VŽDY PRÁVE JEDNU aktívnu zbierku.** Viac zbierok naraz na jednom QR = chaos pre darcu — QR musí smerovať presne na aktuálnu zbierku s jasnou podstránkou. Paralelné delenie jedného daru medzi viac zbierok (split obrazovka v prototype „Rozdeliť platbu“) sa pre reťaz tvorcu RUŠÍ a prerába na FRONTU.

**FRONTA:** tvorca si zoradí zbierky do poradia. Aktívna je vždy prvá nenaplnená. V momente naplnenia cieľa sa QR/podstránka tvorcu AUTOMATICKY prehodí na ďalšiu zbierku vo fronte. Peniaze netečú nikdy do prázdna.

**% SI TVORCA VOLÍ SAMOSTATNE KU KAŽDEJ ZBIERKE** vo fronte (zbierka A: 20 %, zbierka B: 5 %...).

*Pozn.: split s viacerými príjemcami VÝNOSU jednej zbierky (pohreb: rodina 97 / kostol 3) sa NEruší — to je iný kontext (jedna zbierka, delenie jej výnosu), rieši Modul Náboženstvo.*

## 2 · Pravidlá percent a sliderov (Martin, 8. 7.)

- **Krok slidera = 5 %** (5, 10, 15…). Voľné percentá zdržujú — user naháňa okrúhle číslo.
- **Minimum = 5 %.**
- **0 % = ZÁKAZ generovania QR.** Nulou by tvorca zahmlieval: zbierka mu svieti na stránke, ale nedelí sa o nič. Pri 0 % tlačidlo „Vygenerovať QR“ disabled s vysvetlením.
- Súčet sa nerieši — aktívna je vždy len jedna zbierka, % je podiel z honoráru pre ňu.
- **NEMENNOSŤ — „vyber, zafixuj, vytvor, koniec“ (Martin, 8. 7.):** reťaz má dva stavy. **DRAFT** (pred zverejnením QR / prvým darom): tvorca edituje voľne — alebo zmaže CELÚ rozpracovanú reťaz a postaví nanovo. **PUBLIKOVANÁ** (od zdieľania QR / prvého daru): KOMPLETNE ZAMKNUTÁ — všetky položky, všetky %, poradie. Žiadne pridávanie, mazanie, preusporiadanie, žiadna zmena percent. Dôvod: live stream, peniaze sa sypú — a tvorca by potichu stiahol čakajúcu zbierku z 50 % na 20 % „nech mu ide do vrecka, možno si useri nevšimnú“. NIE. Fanúšik videl sľub — sľub je zamknutý. Fronta vyschla? Systémový fallback / community pool. Ďalšie video = nová reťaz.
- Badge = záznam faktu: „X % z honoráru išlo: [zbierka]“ — nikdy „partner“. Badge sa NIKDY neodstraňuje. Charita, ktorá nechce peniaze kontroverzného tvorcu: vráti VŠETKY prijaté z jeho reťaze + systém ho k nej už nepriradí (ForwardBlock). História ostáva.
- Pripojenie na verejnú zbierku NEVYŽADUJE súhlas príjemcu (verejná ponuka prijímať dary). Viac tvorcov na jednej zbierke = v poriadku, každý so svojím QR.

## 3 · Dátový model

### 3.1 `CreatorChain`
| Pole | Typ | Popis |
|---|---|---|
| `id` | PK | |
| `creatorId` | FK | tvorca |
| `chainStatus` | enum | `draft` (editovateľná/zmazateľná celá) / `published` (zamknutá navždy; od zdieľania QR alebo prvého daru) |
| `queue` | pole `ChainQueueItem` | zoradené; aktívna = prvá so `status=active` |
| `systemFallbackEnabled` | bool | default true |

### 3.2 `ChainQueueItem`
```
{ collectionId, position, percent (5–100, krok 5; editovateľné LEN v drafte reťaze),
  status: "waiting|active|filled|skipped|system-assigned", addedBy: "creator|system", activatedAt?, filledAt? }
```

### 3.3 `ForwardBlock`
```
{ recipientId, creatorId, reason, createdAt } // fallback preskočí, manuálny výber odmietne s hláškou
```

## 4 · Routing algoritmus

1. Dar príde cez QR tvorcu → smeruje na AKTÍVNU položku fronty; podiel reťaze = `dar × percent` aktívnej položky.
2. **Dorovnanie:** ak podiel presahuje zvyšok do cieľa → dorovnaj cieľ presne; zvyšné peniaze podielu tečú NASLEDUJÚCEJ položke (tá sa práve aktivuje). Jeden dar smie zavrieť aj dve zbierky.
3. Naplnenie: `status=filled`, položka sa zamyká (história), ďalšia `waiting` → `active`, **QR/podstránka tvorcu sa automaticky prehodí** na novú aktívnu.
4. Fronta prázdna → fallback: systém doparuje otvorenú overenú zbierku (a) rovnaká kategória ako posledná aktívna, (b) geo najbližšia, (c) najdlhšie otvorená; zapíše `system-assigned` s % poslednej aktívnej. Rešpektuje ForwardBlock. Ak nič → community pool.
5. **Atomicita:** dorovnanie server-side transakčne — race dvoch darov nesmie pretiecť cieľ.
6. Zbierka pozastavená námietkou → `skipped`, prúd ide ďalšej, log.

## 5 · UI (testovací modul)

### 5.1 Tvorca — „Moja reťaz“
- DRAFT režim: fronta editovateľná (drag, slidery krok 5 / min 5 / 0 nemožná, „+ pridať“ cez PICKER (5.2), skratka „rovnaké % pre všetky“), tlačidlo „Zmazať celú reťaz“ + „Zverejniť“ s upozornením: „Po zverejnení sa reťaz už NEDÁ meniť.“
- PUBLIKOVANÁ: read-only — aktívna zvýraznená (pin + „TERAZ PODPORUJEŠ“), čakajúce so zámkami, naplnené so ✓ a dátumom. Jediné tlačidlo: „Vytvoriť novú reťaz“ (pre ďalšie video/stream).
- Prepínač „systémové doparovanie“ — nastaviteľný len v drafte.

### 5.2 Picker príjemcov (bez odchodu z procesu)
Bottom-sheet s kartami: **Obľúbené** (⭐ na kartách zbierok; primárny zdroj) · **Nedávne** · **Odporúčané** (kategória + geo ako fallback) · **Vyhľadávanie** · **Sken QR** (kamera — zbierka z plagátu).

### 5.3 Verejná podstránka tvorcu (po skene QR)
- VŽDY PRÁVE JEDNA aktívna zbierka: názov, progress bar, „tvorca dáva X % z honoráru“.
- História pod ňou: „✓ naplnené: Zbierka A (3 000 €, marec)…“ — nemenný záznam.
- V momente naplnenia sa stránka živo prehodí na ďalšiu („Cieľ naplnený! Teraz podporujeme: B“).

## 6 · Akceptačné kritériá

1. QR tvorcu vedie VŽDY na presne jednu aktívnu zbierku s jasnou podstránkou — nikdy zoznam viacerých.
2. Naplnenie cieľa prepne QR/podstránku automaticky a okamžite na ďalšiu vo fronte; dar, ktorý cieľ presiahne, sa dorovná a zvyšok tečie ďalšej (server-side atomicky).
3. Slider: krok 5 %, min 5 %; pri 0 % sa QR nedá vygenerovať (disabled + vysvetlenie).
4. Po zverejnení (QR zdieľaný / prvý dar) sa NEDÁ zmeniť NIČ — položky, %, poradie; v drafte sa dá meniť všetko alebo zmazať celá reťaz. História sa nedá meniť ani mazať nikdy.
5. Prázdna fronta → systém doparuje podľa pravidiel a označí `system-assigned`; ForwardBlock páry sa nikdy nespárujú.
6. Darca na podstránke vždy vidí, komu presne jeho dar ide — aj tesne po prepnutí.

## 7 · Súvislosti

- Rovnaká fronta neskôr pre farské kampane (strecha → kúrenie) a dopĺňa Help „Reťaz prebytku“ z darcovskej strany.
- QR Katalóg v2, sekcia 2 (Tvorcovia) → riadok „Honorár s reťazou + FRONTA“ odkazuje sem.
- Prototypová obrazovka „Rozdeliť platbu (influencer)“ so slidermi 70/20/10 sa PRERÁBA podľa tejto špecifikácie (bug: záporný zvyšok −50 % tým zaniká — súčty sa už neriešia).

*— Fero, 8. 7. 2026 · v2 · odovzdať kóderovi testovacieho modulu —*
