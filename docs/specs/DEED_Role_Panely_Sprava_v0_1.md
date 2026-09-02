# DEED — Rolové panely a správa (Charita · Tvorca · B2B)

**v0.1 · 18. 7. 2026 · Martin & Fero · špecifikácia pre kódovanie (Samo)**
**Súvisí s:** Profi vizitka B2B · B2B Master v2.0 · modul Náboženstvo (vzor farár) · Core v4
**Princíp:** čísla a ceny = placeholdery (Vitkovič / jednotný cenník). Mechanizmus je podstata.

---

## 0 · Architektonický vzor (záväzný)

Vzor = farár v module Náboženstvo:

1. **Jeden účet, rola pripnutá na účet.** Rola sa získava pri registrácii (tvorca = checkbox; charita = KYB; firma = IČO + B2B verifikácia). Žiadne oddelené admin portály.
2. **Základ pre každého = plné userove funkcie.** Každá rola má automaticky všetko čo bežný user: Môj feed, Moje zbierky (osobné), Čo podporujem, Obľúbené, Koho sledujem, Nástenka podľa záujmov, Peňaženka, vlastné skutky. Rolové panely sa PRIDÁVAJÚ navrch, nikdy nenahrádzajú.
3. **Umiestnenie: sekcia „Môj DEED firemný" v module Charita.** Všetky tri rolové pohľady žijú v jednej sekcii — hore **3 prepínače pozícií: Charita · Tvorca · B2B**, ktoré prepínajú celý obsah sekcie (panel + správa). Spolu s tier prepínačom (0.1b) = kompletná simulácia rolí aj tierov na jednom mieste, bez rôznych registrácií. Sekcia „SPRÁVA …" viditeľná len držiteľovi roly (+ delegovaní správcovia); v DEV režime prepínateľná.
4. **Jeden skelet UI:** rolové „Môj DEED" panely = rovnaký komponentový skelet ako userov pravý panel (zoznamy kariet + progres + akcia „Spravovať"). Nekódujú sa 3 nové obrazovky — jedna s rolovým data-feedom.
5. **Kúpiteľné vs. zaslúžené (tvrdé pravidlo):** platený tier kupuje PRIESTOR a NÁSTROJE. Nikdy nekupuje karmu, badge, level, poradie vo feede podľa dôvery. Zaslúžená os beží naplno aj na Tier 0.
6. **Tier 0 nie je atrapa:** každá rola môže zadarmo KONAŤ (zbierka / reťaz / príspevok) a budovať zaslúženú os.
7. **Povinnosti sa netierujú.** Čo je povinnosť (napr. dokladovanie zbierky), je v základe a nedá sa „odomknúť" platbou. Platené tiery pridávajú kapacitu a nástroje, nikdy povinnosti.

### 0.1 Testovací prepínač rolí (DEV-only)

- Prepínač rolí = **3 tlačidlá hore v sekcii „Môj DEED firemný": Charita · Tvorca · B2B** (prepínajú pozíciu) + samostatný prepínač farára v module Náboženstvo. Testovacia barlička, kým nemáme živé subjekty.
- Feature flag `dev_role_switcher`. V produkcii sa NEZOBRAZUJE — rola sa číta z overeného účtu. Pred launchom odstrániť/vypnúť.
- Rovnaký prepínač doplniť pre všetky 4 role: farár · charita · tvorca · firma.

### 0.1b Testovací prepínač TIEROV (DEV-only)

- Tam, kde rola má tiery, doplniť vedľa rolového prepínača aj **tier prepínač**: tlačidlá T0 / T1 / T2 (u B2B: Free / STARTER / BUSINESS). Tester simuluje tier bez novej registrácie a bez platby.
- Feature flag `dev_tier_switcher`. Prepnutie tieru okamžite prerenderuje panely aj správu (odomknuté akcie vs. paywall modaly) — presne to, čo vidí platiaci subjekt.
- Tier sa v DEV režime drží per účet v lokálnom stave/configu; v produkcii sa číta z fakturácie. Prepínač pred launchom odstrániť spolu s `dev_role_switcher`.
- Pozn.: paywall modaly (bod 4.3) musia byť v DEV režime preklikateľné — tester musí vidieť aj samotný modal, aj stav po „zakúpení".

### 0.2 Tierová mriežka (mapovanie na existujúce cenníky — žiadny nový cenník)

| Rola | Tier 0 (0 €) | Tier 1 | Tier 2 | Top |
|---|---|---|---|---|
| Charita | vizitka + 1 zbierka | rád Basic vizitky | rád Standard vizitky | na mieru — MIMO ZÁBERU |
| Tvorca | profil + reťaze | rád Basic (podstránka + terminál) | rád Standard (akcie + QR) | — |
| B2B | Štandard verifikácia + Free vizitka | = STARTER (B2B Master §6) | = BUSINESS | ENTERPRISE — MIMO ZÁBERU |

---

## 1 · CHARITA

### 1.1 Registrácia a rola
- KYB (Didit) + IBAN cez VoP. Rola `charity_admin` pripnutá na účet štatutára; možnosť delegovať správcov (ako farárova „delegovaná rada").

### 1.2 „MÔJ DEED" panel charity (pravý panel, navrch userovho základu)

| Blok | Obsah | Zdroj dát | Tier |
|---|---|---|---|
| Moje zbierky (org) | aktívne + ukončené, progres €/%, stav dokladovania, CTA Spravovať | zbierky entity | 0 |
| Dnes prišlo | live tok darov (rastie live), noví darcovia, súčet dňa | transakcie entity | 0 |
| Moji dobrovoľníci | prihlásení na najbližšie akcie, počty, dochádzka po akcii | eventy entity + QR | 2 |
| Badge & karma | aktuálny badge dôvery, level, progres na ďalší (zaslúžená os) | karma engine | 0 |
| Sledujúci | počet + trend | follow engine | 0 |
| Moja nástenka | vlastné udalosti (zverejnené/koncepty) | event engine | 0 (čítanie), tvorba podľa tieru |

### 1.3 SPRÁVA CHARITY (podstránka správcu — viditeľná len role)

| Položka | Popis | Tier |
|---|---|---|
| Upraviť profil | foto, popis, video, kontakt, web, IBAN (VoP) | 0 |
| Zbierky — vytvoriť/spravovať | limit súbežných zbierok podľa tieru: T0 = 1 · T1 = viac (placeholder) · T2 = ešte viac/neobmedzené (placeholder) | 0+ |
| **Správa zbierky vrátane DOKLADOVANIA** | pozri 1.4 — POVINNÁ ZÁKLADNÁ funkcia, NIKDY netierovaná | **0 (povinné)** |
| Zoznam darcov + poďakovanie | zoznam per zbierka (4 režimy zobrazenia darcu — rozhoduje darca), hromadné poďakovanie | 0 |
| Kalendár & udalosti | dobrovoľnícke akcie, brigády, termíny | tvorba: 1+ |
| QR nástroje | T0: statický QR na tlač (plagát, pokladnička — sken → dar) · T2: event QR + rotujúca TOTP dochádzka dobrovoľníkov | 0 / 2 |
| Dobrovoľníci — správa | prihlášky, dochádzka (QR), symetrické hodnotenie 6★ (default 5★, ≤3 = povinný dôvod) | 2 |
| Spolupráca s firmami | strana charity pre VTO / sponzoring (viditeľnosť pre B2B) | 2 |
| Badge embed | HTML embed badge na vlastný web (klik → DEED profil; backlink) | 0 |
| Viditeľnosť súm | čo vidia návštevníci profilu (per zbierka) | 0 |
| Reporty / exporty | prehľad pre výročnú správu, export dát | 2 |

### 1.4 Dokladovanie zbierky (POVINNÉ, netierované)

- Každá zbierka má záložku **Dokladovanie**: nahratie dokladov použitia financií (bloček, faktúra, foto, krátky popis, suma, dátum).
- Priebežne počas zbierky aj po ukončení. Ukončená zbierka bez dokladovania po lehote X dní (placeholder) → stav „čaká na doklady" viditeľný na profile → vplyv na badge dôvery (zaslúžená os), NIE blokácia platieb usera.
- Verejný pohľad: darca vidí pri zbierke stav dokladovania (napr. „doložené 82 % použitia"). Transparentnosť per prípad = podstata platformy, preto NIKDY nie je platená featúra.
- Nedokladovanie opakovane → eskalácia per anti-fraud pravidlá (mimo záber tohto doc).

---

## 2 · TVORCA

### 2.1 Registrácia a rola
- Rola `creator` = **checkbox pri registrácii** („Som tvorca obsahu / organizujem školenia, workshopy, akcie"). Nie stav, do ktorého sa dorastá; dá sa doplniť aj neskôr v nastaveniach.
- Platí pre: obsahových tvorcov (video, hudba, text…) AJ organizátorov (školiteľ, kouč, workshopista). Nie bežný user.
- KYC až pri výplatnom hrdle (existujúce pravidlo).

### 2.2 Reťaz — KDE VZNIKÁ (dôležité pre kód)
- Reťaz sa **NEVYTVÁRA v správe tvorcu**. Vzniká PRI ZBIERKE: tvorca otvorí zbierku, ktorú chce podporiť → akcia „Vytvoriť reťaz" → nastaví % (fixné po zverejnení) a poradie vo fronte.
- V „Môj DEED" tvorca reťaze VIDÍ (prehľad + vplyv), nespravuje ich obsah tam.
- Entry point v UI: detail zbierky (pre rolu creator) + zoznam „Moja reťaz" v paneli linkuje späť na detaily zbierok.

### 2.3 „MÔJ DEED" panel tvorcu

| Blok | Obsah | Tier |
|---|---|---|
| Moja reťaz | aktívna zbierka vo fronte (progres, moje fixné %) + ďalšie v poradí; klik → detail zbierky | 0 |
| Môj vplyv | kumulatív: objem mobilizovaný cez moju rúru, počet uzavretých prípadov, mostová váha | 0 |
| Podporovatelia | zoznam príspevkov cez môj terminál (podstránka) | 1 |
| Moje akcie | workshopy/školenia: najbližšie, prihlásení / kapacita | 2 |
| Karma & tituly | zaslúžená os | 0 |
| Moje oznamy | posledné zverejnené + koncepty | 1 |

### 2.4 SPRÁVA TVORCU (podstránka)

| Položka | Popis | Tier |
|---|---|---|
| Upraviť podstránku | bio, portfólio, odkazy | 0 (základ) / 1 (plná podstránka) |
| Terminál (Transak) | priame príspevky tvorcovi; DEED = prostredie, nie strana transakcie; zap/vyp | 1 |
| Oznamy | publikovanie oznamov komunite | 1 |
| Akcie | vytvoriť workshop/školenie: kapacita, vstupný QR, prihlášky | 2 |
| Overená smena | check-in/out inštitúcie, live počítadlo (verejný link) — per DEED_Tvorcovia v0.1 §3 | 2 |
| Štatistiky | návštevy podstránky, konverzia klik→dar | 1 základ / 2 plné |

- **Layout podstránky (záväzné poradie):** skutky a reťaze HORE · oznamy STRED · terminál (kasička) DOLE.
- Otvorené (Dagmar): status tvorcu pri termináli (živnostník vs. f. o.) — zatiaľ NEblokovať v kóde, len feature flag `terminal_requires_business_id`.

---

## 3 · B2B FIRMA

### 3.1 Registrácia a rola
- IČO + B2B zmluva. Verifikácia per Registrations v1: Štandard (firemný e-mail + IČO + tel = modrá fajka, zadarmo) · Premium (micro-deposit/KYC konateľa + rotujúci QR = zlatá fajka, balíček). Premium povinné pre kampane, sponzoring, Bonusový systém (existujúce pravidlo).
- Rola `company_admin` + delegovaní správcovia; počet správcov podľa tieru (BUSINESS+ viac správcov).

### 3.2 „MÔJ DEED" panel firmy

| Blok | Obsah | Tier |
|---|---|---|
| Firemná karma & badge | level, progres, rebríček odvetvia v meste (súťažná vrstva) | 0 |
| Naši ľudia | AGREGÁTY: zapojení (opt-in), hodiny, skutky, segmenty — k-anonymita, žiadny detail osôb | 1 (základ) / 2 (plný) |
| Sponzorujeme | podporené prípady/charity: progres, každé euro dohľadateľné (D++ stopa) | 0 |
| Stav účtu | Founding Member badge, trial Premium odpočet | 0 |
| Firemná nástenka | naše akcie (zverejnené/koncepty) | tvorba: 2 |

### 3.3 SPRÁVA FIRMY (podstránka)

| Položka | Popis | Tier |
|---|---|---|
| Profil firmy | vizitka podľa tieru (Free → Premium vizitka per Profi vizitka doc) | 0+ |
| Sponzoring | vybrať overený prípad/charitu, príspevok pod menom firmy, logo pri kampani (D++) | 0 (prispieť) / vyšší (kampane per Premium verifikácia) |
| Zamestnanci | pripojenie QR/invite kód — VŽDY opt-in; tri stavy súkromia usera voči firme (Core v3 §15) | 1 |
| Firemná akcia | vytvoriť akciu (event engine) | 2 |
| VTO | QR proof-of-presence dochádzka, audit-grade hodiny | 2 |
| ESG dashboard + export | agregované S1+S3, k-anonymita, PDF + dáta pre audítora | 2 |
| Odmeňovací program | režim A (gaming DEED, default) / B (reálny token) — per Gaming DEED Benefit v0.1 | 1+ |

- **Tier 0 firma:** modrá fajka + Free vizitka + PRISPIEVANIE a budovanie badge/karmy od prvého dňa. Zaslúžená os zadarmo; platí sa priestor a nástroje.
- Tiery = existujúci cenník B2B Master §6 (STARTER / BUSINESS / ENTERPRISE). Tento dokument NEVYTVÁRA nový cenník.

---

## 4 · Spoločné implementačné poznámky

1. **Role model:** účet môže mať viac rolí naraz (user + creator; štatutár = user + charity_admin). UI: rolové panely sa stackujú pod userov základ; správa rolí oddelené sekcie.
2. **Viditeľnosť:** sekcia SPRÁVA renderovaná len pri role (+ delegácia). Verejný profil roly (vizitka) je iná obrazovka než správa.
3. **Tier gating:** gate na úrovni AKCIE (tlačidlo vytvoriť 2. zbierku → paywall modal s vysvetlením), NIE skrývanie celých sekcií — user má vidieť, čo existuje. Výnimka: DEV prepínač (0.1).
4. **Dokladovanie (1.4) je mimo tier gatingu úplne** — žiadny paywall komponent sa ho nesmie dotknúť.
5. **Zaslúžená os** (karma, badge, levely) číta výlučne aktivitu, nikdy tier. Test: zmena tieru nesmie zmeniť karmu/badge ani o bod.
6. Placeholder čísla (limity zbierok, lehoty dokladovania, ceny) = config, nie hardcode.

---

## 5 · Mimo záber tohto dokumentu

Top tiery na mieru (Charita top, B2B ENTERPRISE detail) · presné ceny (Vitkovič) · mechanika reťaze (Core FŠ v2 §9) · Overená smena detail (DEED_Tvorcovia v0.1) · anti-fraud eskalácie · daňové otázky terminálu (Dagmar).

*— Fero · v0.1 · 18. 7. 2026 —*
