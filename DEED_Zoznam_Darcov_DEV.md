# DEED Zoznam darcov pri zbierke — DEV špecifikácia v1

*Podklad pre kódovanie. Rozhodnutia Martin 14. 7. 2026. Napísal Fero. Všetky čísla = ŠTARTOVACIE, žijú v configu.*

---

## 0 · ŽELEZNÉ PRAVIDLÁ

1. **Zoznam je len zobrazenie daru. Nič iné.** Číta hotové dáta z párovacieho enginu, nič nepočíta a nikam inam nezapisuje.
2. **Default = anonymita.** Zobrazenie identity je vždy opt-in darcu. Neregistrovaný nemá čo nastavovať.
3. Zoznam, ticker v hlavnom feede ("Ján H. práve poslal 10 € → Žofia K.") a počítadlo "X ľudí pomohlo" ťahajú z JEDNÉHO zdroja dát — nesmú si protirečiť.

## 1 · Umiestnenie

Pod **platobným modulom** každej zbierky (Help žiadosť, kampaň, charita) — pod blokom DROBNÁ PODPORA / VLASTNÁ SUMA. Kompakt: posledných ~5 riadkov + "Zobraziť všetkých (38)" (číslo = počítadlo pomohlo).

## 2 · Verzie zobrazenia (registrovaný darca si vyberá pri platbe)

| # | Zobrazenie | Príklad |
|---|---|---|
| 1 | Celé meno + mesto | Martin Štofik · Trenčín |
| 2 | Meno + iniciála + mesto | Martin Š. · Trenčín |
| 3 | Prezývka + mesto | Čavo787 · Trenčín |
| 4 | Anonym | Anonym |

- **Mesto je nastavenie v profile** (zobrazovať/nezobrazovať) — platí pre verzie 1–3 aj 4.
- **Default = verzia 4.** Voľba jedným klikom v platobnom kroku; posledná voľba sa pamätá ako predvoľba.
- **Neregistrovaný (pasívny) darca = vždy "Anonymný darca"**, bez mesta, bez sumy, bez vypisovania čohokoľvek. Chce viac → registrácia (akvizičný háčik, nič mu nevnucujeme).

## 3 · Suma

- **Prah v configu, štart 5 €** (Martin rozhodne 5 vs 10 pri ladení — bez kódu).
- Pod prahom: vždy len **"daroval"** — suma sa nezobrazí NIKDY, ani keď darca chce (žiadne dvojeurové výkriky).
- Nad prahom: suma sa zobrazí **len ak darca zapol samostatný prepínač** "zobraziť sumu".
- Drobná podpora DEED (10/50/100 DEED ≈ centy) je vždy pod prahom.
- Neregistrovaný: suma nikdy (nemá kde voliť).

## 4 · Správanie zoznamu

- **Poradie: chronologické**, najnovší hore. Žiadne triedenie podľa výšky — nerobíme rebríček peňaženiek.
- Live update (rovnaký mechanizmus ako "rastie live" pri počítadle).
- Riadok: `[identita] daroval [suma?] · relatívny čas`.
- Plní sa z párovacieho enginu po PRIPÍSANÍ platby (všetky 4 kanály: PSP / AIS / SMS / on-chain). SMS a QR bez účtu = anonymný darca.
- Krízový flag zbierky na zoznam nemá vplyv.

## 5 · Súkromie (Dagmar)

- Voľba verzie sa ukladá **per dar**. Meno/prezývka sa NEZAPEKÁ do riadku — renderuje sa cez userId z aktuálneho profilu.
- Darca môže svoj dar **kedykoľvek spätne prepnúť na Anonym** (jednosmerne — k väčšej anonymite áno, opačne nie).
- Vymazanie účtu → všetky jeho riadky automaticky spadnú na "Anonymný darca". Nič sa nemaže zo súm a počítadiel.
- Do DPIA pre Dagmar: kombinácia mesto + suma + čas pri malých obciach (rieši sa tým, že mesto aj suma sú opt-in).

## 6 · Config

`prahSumy` (5) · `pocetRiadkovKompakt` (5) · `tickerZivotnostSek` · zmena = nová configVersion, platí len dopredu.

## 7 · Akceptačné kritériá

1. Neregistrovaný dar → "Anonymný darca daroval", bez mesta, bez sumy — vždy.
2. Registrovaný default → verzia 4; voľba pri platbe funguje jedným klikom a pamätá sa.
3. Dar 4 € s prahom 5 € → "daroval" bez sumy aj pri zapnutom prepínači; zmena prahu v configu to zmení bez kódu.
4. Zápis do zoznamu nezmení žiadne iné dáta v DB (len vlastný riadok zobrazenia).
5. Vymazanie účtu → riadky darcu spadnú na Anonym; súčty a počítadlo "X ľudí pomohlo" sa nezmenia.
6. Spätné prepnutie dar → Anonym funguje; Anonym → meno nejde.
7. Zoznam, ticker aj počítadlo ukazujú konzistentné čísla (jeden zdroj).

## 8 · Čo v tom NIE JE (vedome)

Rebríčky darcov · odkazy/komentáre pri dare (samostatná téma, potom) · zobrazovanie darov v skutkovom feede nad rámec existujúceho tickera.

*— Fero, 14. 7. 2026 · v1 · pre Sama, k platobnému modulu —*
