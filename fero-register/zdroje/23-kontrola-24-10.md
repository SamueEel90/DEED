# Zdroj 23 · Kontrola kódu 24. 10. (audit 7ab9744 → 3f9a6c6)

# Kontrola kódu DEED · 24. 10. 2026

Rozsah: rozdiel od commitu `7ab9744` (6. 10.) po `3f9a6c6` (24. 10.), vetva `platby-modul`.
659 commitov, 711 súborov, +54 163 / −4 725 riadkov. Spustené lokálne: typecheck, lint, build.
Migrácie sa na DB nespúšťali — stavia ich CI na GitHube (posledný beh #387, zelený).

---

## 1. Verdikt

Kód sa **zlepšil v disciplíne** (logika na serveri, 93 DB testov, CI s čistou DB), ale
**zhoršil v objeme a výkone** (balík +49 %, localStorage +24 kľúčov, 0 frontend testov).
Z 12 rizík z kontroly 6. 10. (N1–N12) sú opravené 2. Tempo vývoja (37 commitov/deň,
120 migrácií za 18 dní) predbieha opravy bezpečnostných dier známych od 6. 10.

## 2. Čísla

| | 6. 10. | 24. 10. | Smer |
|---|---|---|---|
| Migrácie | 64 | 184 | — |
| DB testy (súbory) | 7 | 93 | ✅ |
| CI | typecheck + lint + build + smoke + DB | to isté, zelené | ✅ |
| Frontend `src/` riadky | 61 654 | 89 493 (+45 %) | ⚠ |
| Hlavný balík JS | 2,19 MB (gzip 645 kB) | 3,26 MB (gzip 962 kB) | ❌ |
| Chunk Profil | 380 kB | 801 kB | ❌ |
| Lint warningy | 199 | 256 | ⚠ |
| `any` | 74 | 80 | ⚠ |
| Súbory nad 1 000 riadkov | 3 | 5 (najväčší 2 640) | ⚠ |
| localStorage kľúče / súbory | 88 / 76 | 112 / 97 | ❌ |
| Frontend testy | 0 | 0 | ❌ |
| Typecheck / lint errory | 0 / 0 | 0 / 0 | ✅ |

## 3. Stav rizík z kontroly 6. 10. (N1–N12)

| # | Riziko | Stav 24. 10. |
|---|---|---|
| N1 | `dorovnanie_dar` sa dá zavolať bez platby, aj anonymne | ❌ otvorené, funkcia nezmenená od 0046 |
| N2 | zbierka + cudzí príjemca → pohyb sa započíta do zbierky | ❌ otvorené (`platba_zapis` v 0065 má rovnakú logiku) |
| N3 | anonymné účty bez limitu, každý 1 240 DEED | ❌ otvorené, `ucet_start_kredit` platí aj pre `pasivny` |
| N4 | klient si nastaví `email_overeny`, `stav_registracie`, `typ` | ❌ otvorené |
| N5 | Viera otvorená pre všetkých | ✅ 0115 |
| N6 | testovacie zadné dvierka | ◐ je prepínač `testovacia_pokladna`, chýba jeden test „ostrý štart" |
| N7 | `autor_nazov`, `autor_karma`, `topovane` zapisuje klient | ❌ otvorené |
| N8 | AI skóre nie je viazané na autora skutku | ❌ otvorené |
| N9 | peniaze v ledgeri vznikajú bez potvrdenia rúrou | ❌ otvorené, **rozšírené** (R1) |
| N10 | `v_vyzbierane` počíta celý ledger pri každom dotaze | ❌ otvorené |
| N11 | Top a mapa čítajú celú tabuľku | — Martin 24. 10.: placebo, neriešiť |
| N12 | prečíslované migrácie | ✅ CI stráži čísla |

Z pôvodných 18 bodov (6. 10.) sa držia body 7 (migrácie), 11 (XSS), 16 (data-URL);
zhoršili sa body 6 (úložiská) a 18 (údržba).

## 4. Nové riziká

**R1 · Anonymný dar bez platby nafúkne ľubovoľnú zbierku.**
Migrácie 0074b, 0084, 0091, 0093/0094, 0140 dali roli `anon` právo volať `zbierka_dar`,
`zbierka_dar_volba`, `zvoncek_dar`, `retaz_dar`, `zbierka_dar_skutok`. S kanálom `fiat`/`sepa`
vznikne hneď `settled` platba a pohyb procesor → zbierka, započítaný do `vyzbierane`. Žiadna
rúra platbu nepotvrdzuje (PSP neexistuje). Po ostrom štarte ktokoľvek bez prihlásenia zapíše do
hociktorej zbierky dar 10 000 € a počítadlá aj rebríček ho ukážu.

**R2 · Jeden prepínač `testovacia_pokladna` vypína 8 rôznych poistiek**
(0084, 0108, 0132, 0157 …). Každá nová funkcia si ho číta sama. Neexistuje test, ktorý ho
prepne na `false` a overí, že všetky poistky držia. Zabudnutá funkcia = testovacie správanie naostro.

**R3 · `stranka.testovacia = true` nie je pod prepínačom.**
`testovaci_spravca`, `konam_za_stranku`, `konam_za_firmu` pustia kohokoľvek na stránky označené
ako testovacie. Ostrý štart ich nevypne.

**R4 · PIN na citlivé akcie (0151) je len zámok obrazovky.**
Server pri platbe ani v Správe PIN nevyžaduje (`over_pin` volá iba `src/lib/zamok.ts`).
Kto má session token, PIN obíde.

**R5 · Ledger prestal byť nemenný.**
0135, 0156 a `zmaz_testovacie` (0157) vypínajú trigger `pohyb_nemenny` a mažú pohyby. Vzniká
vzor „keď treba, trigger vypneme". Výmaz testovacích peňazí je legitímny, ale má mať jednu
funkciu, nie `disable trigger` v migráciách.

**R6 · Rast klienta.**
Hlavný balík +49 % za 18 dní, chunk Profil +110 %. `App.tsx` staticky importuje 20+ feature
modulov, lazy je len 9. ROADMAP má kartu „balík pod 2 MB", ide to opačným smerom.

**R7 · `/api/push` POST bez autentifikácie.**
Nič nepoškodí (pošle len čakajúce), ale ktokoľvek ho môže volať v slučke a míňať kvótu.

**R8 · Repo prestáva byť čisté.**
V koreni `t24.py`, `t104.py`; `fero-register/` (42 súborov, 3 MB screenshoty v histórii);
dočasne commitnutý build `public/svetlo/assets/index-*.js` (3,5 MB). Git pack 160 MB.
`docs/ARCHITECTURE.md` uvádza 64 migrácií.

## 5. Čo sa zlepšilo

- 93 DB testov; CI postaví čistú DB zo všetkých 184 migrácií, všetko prechádza.
- Viera zamknutá na správcu stránky, príspevky veriacich cez serverové funkcie (0115).
- Súkromie: úmysly na omšu (0116), mená detí (0119), rozdelenie zbierky (0118), neverejné stránky (0162).
- Prihlásenie cez QR z mobilu (0149 + `api/qr-prihlasenie.ts`): tajomstvo ostáva na PC, mobil
  vidí zariadenie a mesto, platnosť 2 min, jednorazové. Navrhnuté správne.
- Odhlásenie zariadenia ruší session (0150); zmena PIN vyžaduje starý PIN (0151).
- Testovací príznak na peniazoch určuje server, nie appka (0157).
- XSS drží: každé `dangerouslySetInnerHTML` ide cez sanitizér.

---

## 6. Návrh riešenia R1 + N9 (peniaze až po potvrdení rúrou)

Princíp: **EUR vznikajú v ledgeri až po potvrdení rúrou, nikdy pri kliknutí.**

1. **Dva stavy platby:** `pending` (darca zadal) a `settled` (rúra potvrdila).
   `platba_zapis` pre kanál `fiat` / `sepa` / `sms` zapíše len riadok `platba` so stavom
   `pending` a **žiadny pohyb**. Pohyby vzniknú až v novej funkcii `platba_potvrd(platba_id)`,
   ktorú smie volať len `service_role`. Pre `deed` ostáva všetko ako dnes.
2. **Webhook rúry:** `api/platba-webhook.ts` prijme potvrdenie od procesora (karta) alebo
   spárovanie z výpisu podľa VS (SEPA), overí podpis, zavolá `platba_potvrd`. Kým rúra
   neexistuje, volá sa z admin obrazovky (`deed_admin`), nikdy z appky.
3. **`vyzbierane`, rebríčky, počítadlá** čítajú len pohyby → `pending` platbu nevidia.
   Darca ju vidí vo výpise ako „čaká na potvrdenie".
4. **Expirácia:** cron raz za hodinu prepne `pending` staršie ako 7 dní (SEPA) / 1 hodina
   (karta) na `failed`.
5. **Anonym:** `zbierka_dar` a spol. môže anon volať ďalej, vytvorí však len `pending`.
   Limit 10 pending platieb za hodinu na IP / zbierku.
6. **Testovacia verzia:** pri zapnutej `testovacia_pokladna` sa `platba_potvrd` zavolá hneď
   v tej istej transakcii s `testovaci = true`. Tester nič nepocíti, ostrý režim je bezpečný
   bez ďalšieho prepínača.
7. **Test:** „anon dá fiat 10 000 € → `vyzbierane` sa nezmení; `platba_potvrd` → zmení sa."

Rozsah: 1 migrácia (~150 riadkov), 1 DB test, 1 API súbor, v appke len texty stavu.

## 7. Čo viem opraviť ja

Len v DB migráciách, `supabase/tests` a `api/` — tam, kde je logika na jednom mieste a dá sa
overiť DB testom.

| Poradie | # | Oprava | Rozsah |
|---|---|---|---|
| 1 | R1 + N9 | pending platby podľa bodu 6 | 1 migrácia + test + api |
| 2 | N1 | `dorovnanie_dar` volá len `platba_potvrd`, idem = `platba.id`, revoke z anon/authenticated | 1 migrácia + test |
| 3 | N2 | zbierka zadaná → príjemca = `ucet_zbierky()`, `p_prijemca_ucet` sa ignoruje | 1 migrácia + test |
| 4 | N4 | strážny trigger na `email_overeny`, `stav_registracie`, `typ` (`v_rebricku` ostáva klientovi) | 1 migrácia + test |
| 5 | N3 | štartovací kredit a limity len pre `aktivny` s overeným telefónom alebo e-mailom | 1 migrácia + test |
| 6 | R2 + R3 | funkcia `ostry_start()` + test `ostry_start_test.sql`: prepne `testovacia_pokladna = false`, zruší `stranka.testovacia`, overí každú poistku | 1 migrácia + test |
| 7 | N7 | trigger: `autor_nazov` / `autor_karma` zo servera; `topovane` / `narodne` / `kriza` len `deed_admin` | 1 migrácia + test |
| 8 | N8 | `skore_z_behu` overí, že `user_id` behu = autor príspevku | 1 migrácia + test |
| 9 | N10 | tabuľka `zbierka_sucet` plnená triggerom z `pohyb`; `v_vyzbierane` číta z nej | 1 migrácia + test |
| 10 | R7 | `/api/push` POST s hlavičkou `x-cron-token` | 1 súbor + úprava cron |

Vypustené: N11 (Top, mapa) — podľa Martina 24. 10. placebo bez reálneho základu, neriešiť.

**Nerobím bez rozhodnutia Martina / Samuela:**
- R6 (balík) — čo má byť lazy v `App.tsx` je produktové rozhodnutie.
- localStorage → DB (bod 6) — 112 kľúčov, každý je produktové rozhodnutie.
- R4 (PIN na serveri) — treba určiť, ktoré akcie PIN vyžadujú a ako dlho platí.
- R8 (čistenie repa) — mažem len na pokyn.

**Pravidlá práce:**
- každá oprava = samostatný commit na novej vetve, nič sa nepushuje bez Martina;
- jedna zmena naraz, ďalšia až po Martinovom teste;
- pred odovzdaním typecheck, lint, build; DB testy overí CI (lokálne Postgres nespúšťam);
- pushnutá migrácia sa nemení, každá zmena = nová migrácia.
