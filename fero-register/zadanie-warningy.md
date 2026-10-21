# Zadanie · Upratanie lint warningov + stopa k zamŕzaniu (370)

*Od Fera, 22. 10. 2026 · stav: lint = 0 chýb, 230 warningov · typecheck a build zelené*

## Prečo

Lint hlási ~120× „setState synchronously within an effect" (kaskádové rendery) a 98× „no-explicit-any", zvyšok drobnosti. Kaskádové rendery sú horúci kandidát na príčinu bodu 370 (appka na PC občas zamrzne). Any je dlžoba v typovaní.

## Mantinely (dôležitejšie než samotná práca)

- MENÍŠ LEN TO, ČO WARNING UKAZUJE. Žiadne vylepšenia popri tom, žiadne premenovávanie, žiadne upratovanie navyše (viď zamietnutie z 19. 10.).
- Správanie appky sa NESMIE zmeniť. Keď oprava warningu vyžaduje zmenu logiky, nechaj warning tak a zapíš do otázok.
- Po každej fáze `npm run verify` — push až keď je zelený.
- Hlásenie po fázach: hotové · odchýlky · otázky. Nečakaj s veľkým balíkom na koniec.

## Fáza 1 · Zamŕzanie (priorita)

1. Zisti, na ktorých obrazovkách sa PC zasekáva (370) — začni tam, kde je najviac „setState v efekte" warningov.
2. Oprav kaskádové setState na týchto obrazovkách: stav odvodený z props počítať pri renderi alebo cez useMemo; synchronizáciu robiť v handleri udalosti, nie v efekte; efekt nechať len tam, kde naozaj čaká na vonkajší svet (server, timer).
3. Do hlásenia napíš, či sa zamŕzanie po opravách ešte deje.

## Fáza 2 · Mechanika (bezpečné)

4. 5× nepoužité premenné — zmazať.
5. 4× exhaustive-deps — doplniť závislosti LEN ak to nezmení správanie; inak nechať a zapísať do otázok.

## Fáza 3 · Any (len bezpečné prípady)

6. Prejdi 98× `any` a doplň typ len tam, kde je jasný z použitia (návratové typy, parametre s jedným volajúcim, dáta zo známych tabuliek). Čo nie je jasné na prvý pohľad, preskoč — žiadne hádanie typov.
7. Cieľ nie je nula. Cieľ je: menej ako dnes a nič nerozbiť.

## Odovzdanie

- Číslo warningov pred/po per pravidlo (lint ich vypíše sám).
- Zoznam preskočených miest s dôvodom (jedna veta na miesto).
- Verify zelený, push, krátke hlásenie.

## Pravidlo navždy (zapísať do CONTRIBUTING.md)

Nový a upravovaný kód nepridáva žiadne nové lint warningy. Číslo smie len klesať.
