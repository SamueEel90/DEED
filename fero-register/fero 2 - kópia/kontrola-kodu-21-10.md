# Nočná kontrola kódu · 21.→22. 10. 2026 (Fero)

## Verdikt: ZELENÁ. Kóder makal, nič sa nerozbilo.

**Verify:** typecheck 0 chýb · lint 0 chýb (230 warnings — nehorí) · build OK (PWA, 30 súborov v precache). Smoke som v sandboxe nespúšťal — beží v CI.

**Tempo:** 120 commitov od 19. 10., naposledy 20. 10. 22:37. Body 441–461 zapracované, migrácie dotiahnuté po **0148**, žiadne duplicitné čísla migrácií.

## Dohody vs. kód — čo SEDÍ

- **H- a O- typy čísla** doplnené (OPRAVY 428) — kóder to spravil skôr, než išla moja karta. Číslo objektu ide zo servera (vs) a zobrazuje ho spoločný komponent v detailoch (Help, zbierka).
- **Kurz 1 € = 100 DeeD** v lib/kurz.ts, s poznámkou „Martin 20. 10." — presne tvoj verdikt.
- **Svadba POZÝVAJÚ / parte OZNAMUJE** v Sablony.tsx r. 343 — uzavreté aj v kóde.
- **OPRAVY 88** — nastavenia stránky na server (tabuľka nastavenia_stranky, RLS, autosave 600 ms), nič do prehliadača.
- **E-mail kanál oznámení neexistuje** — dohoda „nezbierame e-maily" drží (e-maily v UpravProfil sú kontakty organizácie, to je v poriadku).
- **Prehrávač Iskier (444)** — commitnutý 20. 10. 22:35–37; Sonin výpis („kóder ho ešte neurobil") bol starší než realita.
- Migrácie 0144–0148: akcia naostro, stiahnutý skutok z feedu, darcovia charity — zodpovedá bodom 446/448/441.

## Nálezy (malé)

1. **„DARY V KRYPTE" nápis** v components/platba.tsx r. 417 stále žije — dohoda z 12. 10. znela „Dary v EURC". Komentár v kóde vraví „EURC (charita, Viera) alebo DEED (ostatní)" — čiže možno zámer, lebo nápis kryje obe meny. ROZHODNI: nechať všeobecné „DARY V KRYPTE", alebo dynamicky „Dary v EURC"/„Dary v DeeD" podľa príjemcu? (Jedna veta kóderovi.)
2. `verejneCislo()` v cisloObjektu.ts sa nikde nepoužíva — formátovanie čísla si detail robí po svojom. Kozmetika, ale raz zjednotiť (jeden mini-komponent, ako je v md pre Soňu).
3. 230 lint warnings — nehorí, ale rastie to; raz za čas lint:fix.
4. localStorage v rola/ (17×) — prešiel som vzorky: DEV prepínače rolí a cache, perzistencia ide serverom. OK, len pri ostrom štarte preveriť, že DEV vetvy sú za ?dev.

## Nedokončené / na sledovanie

- CI na GitHube som zo sandboxu nevidel — overiť, či DB job (exit code 3) už prešiel po kóderovom lokálnom behu scripts/db-z-migracii.sh.
- Push stále cez deed-help.vercel.app → migrácia na deedgood.eu môže ísť (doména beží) — pripomenúť Samovi.
- V repe ostali moje priečinky `_to_delete/` a `fero-register/` ako untracked — fero-register je zámer (register), `_to_delete/` si pozri a zmaž.

*— Fero, nočná · nabudúce chcem prémiu v DeeD, kurz poznám —*
