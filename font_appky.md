# Font aplikácie DEED

## Rodina

**Plus Jakarta Sans** — Google Fonts, zadarmo (SIL Open Font License).

Načítava sa v `index.html`:

    https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap

V CSS:

    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont,
                 'Segoe UI', Roboto, Arial, sans-serif;

## Dostupné rezy

Načítané sú **iba tieto**: 400, 500, 600, 700, 800.

Iný rez (300, 900) v appke neexistuje — prehliadač by ho dopočítal a v návrhu
by to vyzeralo inak než naživo.

| názov v kóde | váha | kde sa používa |
|---|---|---|
| `reg` | 400 | bežný text |
| `med` | 500 | medzistupeň |
| `semi` | 600 | popisky, drobné texty |
| `bold` | 700 | názvy, tlačidlá |
| `black` | 800 | sumy, nadpisy |

## Veľkosti

Základ je 16 px, riadkovanie 1,5. Zámerne pohodlné — appku majú čítať aj
staršie oči.

| štýl | veľkosť (px) | riadkovanie | váha |
|---|---|---|---|
| micro | 11 | 1,35 | 600 |
| caption | 12,5 | 1,4 | 600 |
| body | 14 | 1,5 | 400 |
| bodyL | 15,5 | 1,5 | 700 |
| title | 17 | 1,4 | 700 |
| h2 | 20 | 1,3 | 800 |
| h1 | 24 | 1,25 | 800 |

Okrem toho appka používa aj medzihodnoty (napr. 11,5 · 12 · 13,5 · 18) —
tabuľka je rámec, nie zákaz.

## Na čo si dať pozor

**Nepoužívať Manrope.** V prvom dodanom kóde bol natvrdo `'Manrope'`, ktorý
v appke načítaný nie je. Bolo to prepísané na Plus Jakarta Sans. Druhý webfont
len kvôli jednej obrazovke by sa sťahoval navyše a nesedel by so zvyškom appky.

**Čísla v počítadlách a sumách** majú `font-variant-numeric: tabular-nums` —
aby pri napočítavaní neposkakovali do strán.
