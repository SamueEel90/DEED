# localStorage — inventúra (Zadanie 3 · 3.5, 6. 10. 2026)

Pravidlo: localStorage smie držať len **pohodlie UI**. Pravdu o svete (peniaze, overenia, stavy, väzby, karma) zapisuje server.
Stĺpec „DB" hovorí, či už existuje serverová verzia (localStorage je potom len záloha pre demo bez databázy).

## A · Pohodlie UI — ostáva

| Kľúč | Čo drží |
|---|---|
| `deed.intro.v1`, `deed.viac.videne`, `deed.stit.od` | čo už človek videl |
| `deed.motiv`, `deed.taby.v2`, `deed.profil.dlazdice`, `deed.me.sekcie.v1` | vzhľad, lišta modulov, rozloženie |
| `deed.nastavenia.appky`, `deed.platba.potvrditTuknutim`, `deed.dar.predvolba`, `deed.dar.mesto`, `deed.okruh.poloha` | predvoľby |
| `deed.zbierka.kryptoOtvorene`, `deed.otvorSpravuCharity`, `deed.otvorProfil`, `deed.reg.krok` | navigácia, rozpísaný krok |
| `deed.oznamy.precitane` | prečítané oznámenia |
| `deed.dev.*`, `deed.skore.admintoken` | DEV prepínače, admin token kalibrácie |
| `deed.session`, `deed.device.v1`, `deed.zariadenie.od`, `deed.ja.lokalneId`, `deed.ja.cisloUctu`, `deed.ja.meno` | relácia, id zariadenia, cache údajov zo servera |

## B · Obchodný stav — so serverovou verziou (localStorage len demo bez DB)

| Kľúč | Server |
|---|---|
| `deed.wallet.zostatok` | ledger `v_zostatok`, Dobiť = `testovacie_dobitie` (0037) |
| `deed.me.podpory.v1`, `deed.me.oblubene.v1`, `deed.me.zbierky.v1`, `deed.me.zaujmy.v1`, `deed.me.sledovani.v1` | `podpora` / `oblubene` / `zbierka_moja` / personalizácia |
| `deed.spravy.v1`, `deed.nahlasenia.v1`, `deed.nab.rsvp` | `sprava`, `nahlasenie`, `rsvp` (0019) |
| `deed.prihlasenie.pokusy` | **zrušené** — limit počíta server (Auth hook, 0042) |
| `deed.dorovnania.*` | **zrušené** — dorovnania žijú len v DB (0046, `dorovnania_nacitaj` / `dorovnanie_krok`) |
| `deed.zamestnanci` | **zrušené** — väzba zamestnanec ↔ firma v DB (0045, `firma_zamestnanec`) |

## C · Obchodný stav — LEN v localStorage (treba presunúť do DB)

| Kľúč | Čo je to | Kam / kedy |
|---|---|---|
| `deed.mojaFirma` | oznamy firmy zamestnancovi (vybavené), návrhy akcií | Fáza 4 · karta 6 |
| `deed.podpory`, `deed.rola.nazov.b2b` | čo firma podporila (sumy) | Fáza 4 · karta 1 — z ledgera (pohyby z účtu firmy) |
| `deed.pravidelne` | pravidelné dary | Fáza 4 · karta 2 — `opakovana_platba` (0016) |
| `deed.moje.skutky` | moje skutky vrátane karmy | Fáza 4 · karta 3 — `prispevok` (skóre/karma už server, 0039) |
| `deed.akcia` | dochádzka na akcii | Fáza 4 · karta 4 — `dochadzka` / TOTP (0015) |
| `deed.retaz.moja`, `deed.vyzvy` | reťaz dobra, výzvy | QR split (0018) / tabuľka výziev |
| `deed.mojeStranky`, `deed.reg.org` | registrované organizácie a stránky | Fáza 4 · karta 5 — `stranka` + `zaloz_stranku` (0035) |
| `deed.rola.segmenty.charita*`, `deed.rola.videa.charita`, `deed.stity.vyvesene`, `deed.foto.entita.*` | obsah stránky organizácie | `profil_stranky` |
| `deed.oznamy.darcom`, `deed.podpora.spravy` | správy darcom, správy podpore | `sprava` |
| `deed.zablokovani`, `deed.priatelia`, `deed.kontakt`, `deed.profil.osobny`, `deed.zariadenia`, `deed.pripomienky.v1` | osobné údaje a väzby, zoznam zariadení | tabuľky profilu a zabezpečenia |
| `deed.aktivity.posts.v1`, `.votes.v1`, `.likes.v1`, `.deltas.v1`, `.follows.v1` | obsah a hlasy v Aktivitách | `prispevok` + hlasovanie |
