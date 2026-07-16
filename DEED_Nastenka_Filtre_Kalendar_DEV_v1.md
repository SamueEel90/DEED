# DEED — Nástenka: filtre + kalendár — DEV doplnok v1

**Pre:** Samuel · testovacia appka (deed-help.vercel.app)
**Dátum:** 16. 7. 2026 · Martin & Fero
**Vzťah k dokumentom:** doplnok k existujúcej Nástenke v prototype. Samostatný, dá sa implementovať hneď. Väčší podklad (mapa, tagovanie, párovanie) príde ako DEED_Pozvanky_Zaujmy_DEV v1.1.

---

## 0. Zhrnutie

Nástenka má dostať jednotný filtrovací riadok (Kde · Kedy · témy) a druhé zobrazenie — klasický kalendár. Obe zobrazenia čítajú TÚ ISTÚ tabuľku udalostí, žiadne nové dáta, len iné okná.

---

## 1. Filtrovací riadok (nahrádza terajšie chipy)

Jeden riadok, dva pripnuté chipy vľavo + posuvné tematické chipy:

```
[ Kde ▾ ] [ Kedy ▾ ] │ Všetko │ Šport │ Zdravie │ Učenie │ Umenie │ Eko →
```

### 1.1 Chip „Kde ▾" (pripnutý, neskroluje)

- Rozbalí: **Moja štvrť · Mesto · Okruh 5 km · 10 km · 25 km · 50 km**
- Default: **Mesto**
- Na chipe svieti aktuálna voľba („Trenčín", „5 km"), nie slovo „Kde".
- **JEDNO nastavenie okolia pre celú appku:** ten istý údaj, ktorý používa Domov (prepínač „5 km · Trenčín" hore). Zmena na nástenke = zmena všade (feed, nástenka, push oznamy). Jeden zdroj pravdy. Výnimka: Mapa — tam sa okruhom hýbe prstom priamo, mapa nastavenie nemení.

### 1.2 Chip „Kedy ▾" (pripnutý, neskroluje)

- Rozbalí: **Dnes · Víkend · Tento týždeň · Mesiac · 📅 Vyber deň** (otvorí kalendár, sekcia 2)
- Default: **Tento týždeň**
- Na chipe svieti aktuálna voľba („Víkend").
- **Pravidlo Víkend:** najbližšia sobota + nedeľa VRÁTANE dneška. V utorok = táto SO+NE; v sobotu = dnes + zajtra; v nedeľu = dnes.
- Dnes = kalendárny deň do polnoci. Tento týždeň = dnes až nedeľa. Mesiac = najbližších 30 dní.

### 1.3 Tematické chipy (posuvné)

- **Všetko · Šport · Zdravie · Učenie · Umenie · Eko** — presne 5 domén + Všetko, poradie PEVNÉ (nech si ruka zvykne).
- Jeden ťuk = jedna téma (single-select), Všetko = default.
- **Typ organizátora (Mesto/Komunita/Partner) z chipov VON.** User sa pýta „čo sa deje", nie „kto to robí" — organizátor je viditeľný v riadku udalosti a v detaile. (Ak niekedy filter typu, tak pod ikonou rozšíreného filtra, nie v hlavnej lište.)
- **Farebná bodka pri udalosti = farba témy = farba chipu.** Jeden farebný jazyk, číta sa samo.

### 1.4 Radenie zoznamu

- Podľa **času konania** (najbližšie hore), pri zhode podľa **vzdialenosti**.

---

## 2. Kalendár (druhé zobrazenie nástenky)

- **Vstup:** ikona kalendára/mriežky vpravo hore na Nástenke (prepínač zoznam ↔ kalendár) + voľba „Vyber deň" v chipe Kedy.
- **Zobrazenie:** mesačná mriežka. Deň s akciami má bodku + počet (napr. „•3"). Listovanie mesiacmi šípkami/swipe.
- **Ťuk na deň** = pod mriežkou sa vysype zoznam akcií toho dňa (rovnaké riadky/karty ako v zozname nástenky — existujúci komponent, nič nové sa nekreslí).
- **Filtre platia aj tu:** Kde + téma filtrujú aj kalendár (bodky aj zoznam dňa). Kedy je nahradené vybraným dňom.
- Kalendár číta tú istú tabuľku udalostí ako zoznam — žiadny vlastný sklad dát.
- Default zobrazenie nástenky ostáva ZOZNAM; kalendár je druhý pohľad na jedno ťuknutie.

---

## 3. Akceptačné kritériá

1. Chipy Kde a Kedy sú pripnuté (pri posúvaní tém sa nehýbu) a ukazujú aktuálnu voľbu.
2. Voľba Víkend v utorok vráti akcie najbližšej SO+NE; v sobotu vráti dnes + zajtra.
3. Zmena okolia na nástenke zmení okolie aj na Domove (a naopak) — jedno nastavenie.
4. Tematický chip filtruje zoznam, TOPOVANÉ pás aj kalendár súčasne.
5. Typ organizátora sa v chipoch nevyskytuje.
6. Farba bodky udalosti = farba tematického chipu.
7. Zoznam radí podľa času konania, pri zhode podľa vzdialenosti.
8. Kalendár: deň s akciami má bodku s počtom; ťuk na deň vysype zoznam toho dňa; filtre Kde/téma platia.
9. Prepnutie zoznam ↔ kalendár nestráca zvolené filtre.
10. Kalendár nečíta žiadnu vlastnú tabuľku — rovnaký zdroj dát ako zoznam (overiteľné v kóde).

---

## 4. Otvorené body (čakajú na Martina — NEmeniť bez povelu)

1. **Text v detaile akcie** „Účasť sa pripíše do tvojich aktivít a karmy" — karma smie prísť LEN z overenej QR dochádzky podľa karma pravidiel, nie z prihlásenia. Buď preformulovať („Účasť s QR vstupenkou sa ti zapíše do aktivít"), alebo potvrdiť mechaniku. Rozhodne Martin.
2. **Label „TOPOVANÉ · odporúčané"** — ak je topovanie platená služba, slovo „odporúčané" je zavádzajúce. Návrh: len „Topované" alebo „Partner". Rozhodne Martin.

---

*— koniec doplnku —*
