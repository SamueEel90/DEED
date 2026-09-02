# DEED — Právna a nákladová analýza: zhrnutie, register predpisov a zadanie na ďalšiu analýzu

**Verzia:** 1.0
**Dátum:** 22. 7. 2026
**Určené pre:** majiteľa projektu, právneho poradcu, ďalšiu AI analýzu
**Nadväzuje na:** [DEED_Prevadzka_Naklady_a_Pravna_Analyza_v1.md](DEED_Prevadzka_Naklady_a_Pravna_Analyza_v1.md) (podrobný TCO model a rozpočet)

> **Upozornenie:** Tento dokument je analytický podklad, nie právne stanovisko. Číslovanie paragrafov zákona č. 162/2014 Z. z. sa medzi použitými zdrojmi líšilo — pred akýmkoľvek použitím ho over proti konsolidovanému zneniu na Slov-Lex. Ceny sú platné k júlu 2026 a menia sa.

---

## ČASŤ A — Zadanie: otázky a ich preformulovaná verzia

### A.1 Otázka 1 — náklady na produkčnú prevádzku

**Pôvodne:** *„Ak by sme sa bavili o reálnom produkčnom použití tejto aplikácie — celý QR kódový systém, platobný systém, databáza používateľov zabezpečená podľa GDPR a KYC overenie — koľko by táto aplikácia stála na údržbu?"*

**Preformulované na analýzu:**
> Vypracuj model celkových nákladov na vlastníctvo (TCO) pre produkčné nasadenie platformy DEED na slovenskom trhu, členený na (a) jednorazové náklady pred spustením, (b) fixné mesačné náklady, (c) variabilné náklady viazané na objem transakcií. Model rozpracuj v troch scenároch podľa počtu používateľov (5 000 / 50 000 / 200 000+). Pre každú položku uveď zdroj ceny a odlíš overený cenník od odhadu. Uveď bod zlomu — pri akom mesačnom finančnom obrate platforma pokryje svoje fixné náklady pri danej výške provízie.

**Pre majiteľa:** *Koľko nás bude stáť spustiť a rok prevádzkovať DEED naostro, a pri akom obrate sa to zaplatí?*

---

### A.2 Otázka 2 — hĺbkové právne overenie

**Pôvodne:** *„Prever všetko do hĺbky ako senior biznis analytik a naštuduj aj všetky právne povinnosti o cirkvi, zbierkach, charitách."*

**Preformulované na analýzu:**
> Vykonaj hĺbkovú regulačnú analýzu platformy DEED podľa práva Slovenskej republiky a EÚ v rozsahu: verejné zbierky, právne postavenie cirkví a náboženských spoločností, neziskový sektor a asignácia podielu zaplatenej dane, platobné služby a licenčné režimy, AML/KYC, ochrana osobných údajov vrátane osobitných kategórií, oznamovacia povinnosť prevádzkovateľa digitálnej platformy, daňový režim na strane príjemcov prostriedkov, kybernetická bezpečnosť. Pre každú oblasť uveď: konkrétny predpis a ustanovenie, kto je adresátom povinnosti, čo z toho vyplýva pre architektúru produktu, výšku sankcie a mieru istoty výkladu.

**Pre majiteľa:** *Čo všetko musíme podľa zákona splniť, kým pustíme peniaze cez appku — a čo z toho musíme zmeniť v produkte?*

---

### A.3 Otázka 3 — evidencia transakcií a koncept peňaženky

**Pôvodne:** *„QR kód systém — nie je potrebné mať všetky tie transakcie a prenosy evidované? A ako by celý DEED systém vyzeral pre používateľa od odoslania peňazí do peňaženky až po ich vybratie — a musel by mať každý nejakú peňaženku?"*

**Preformulované na analýzu:**
> Navrhni architektúru evidencie finančných tokov v platforme DEED a rozlíš dve samostatné vrstvy: (1) evidenčnú vrstvu (interný ledger, zdroje pravdy, retenčné lehoty podľa jednotlivých predpisov, párovanie bankových prevodov iniciovaných QR kódom) a (2) vrstvu úschovy prostriedkov (kto právne drží peniaze a aký licenčný režim to spúšťa). Pre obe vrstvy popíš kompletný používateľský tok od zaplatenia po výplatu, samostatne pre darcu a pre príjemcu. Vyhodnoť, či musí mať každý používateľ peňaženku so zostatkom, a navrhni alternatívu, ktorá zachová používateľský zážitok peňaženky bez licenčnej povinnosti.

**Pre majiteľa:** *Musíme evidovať každý pohyb? A musí mať každý používateľ peňaženku, alebo sa tomu dá vyhnúť?*

---

### A.4 Otázka 4 — legálnosť modulu Help

**Pôvodne:** *„Ani komponent Help, kde by som prispieval v podstate fyzickej osobe, nie je v tomto stave legálny podľa zákona?"*

**Preformulované na analýzu:**
> Posúď, za akých podmienok je peňažný príspevok fyzickej osobe sprostredkovaný online platformou v súlade so zákonom o verejných zbierkach. Rozlíš: dar konkrétnej osobe v uzavretom okruhu, verejnú výzvu neurčenému okruhu prispievateľov na individuálne určenú humanitárnu pomoc, nefinančnú pomoc, odplatné poskytnutie služby a odmenový crowdfunding. Pre každý prípad urč aplikovateľný predpis, či je vykonávateľom fyzická osoba alebo musí ísť o oprávnenú právnickú osobu, a aké povinnosti z toho plynú prevádzkovateľovi platformy. Navrhni produktové riešenie pre každú vetvu.

**Pre majiteľa:** *Smie človek cez DEED verejne žiadať o peniaze pre seba — a ak nie, ako to spravíme legálne?*

---

### A.5 Otázka 5 — krypto, zverejnený účet, peňaženka DEED

**Pôvodne:** *„Boli by transakcie cez DEED legálne za predpokladu, že by mal používateľ crypto peňaženku alebo len zverejnené číslo účtu? A tým pádom nefunguje ani koncept, že peniaze by išli na peňaženku DEED a potom charite alebo človeku, lebo to zákon zakazuje?"*

**Preformulované na analýzu:**
> Porovnaj tri modely finančného toku v platforme DEED z hľadiska regulácie: (a) sprostredkovanie prevodu v kryptoaktívach, (b) zverejnenie bankového účtu príjemcu a priamy prevod od darcu, (c) prietok prostriedkov cez účet prevádzkovateľa s následným prerozdelením. Pre každý model urč aplikovateľnú reguláciu, licenčnú povinnosť, kapitálovú požiadavku, sankcie a daňové dôsledky na strane príjemcu. Osobitne posúď, či je model (c) prípustný pri prostriedkoch pochádzajúcich z registrovanej verejnej zbierky.

**Pre majiteľa:** *Vyriešime to kryptom? Stačí zverejniť číslo účtu? A prečo nemôžeme mať vlastnú peňaženku, cez ktorú peniaze pretečú?*

---

## ČASŤ B — Zhrnutie zistení

### B.1 Desať záverov, ktoré menia produkt

| # | Zistenie | Dôsledok |
|---|---|---|
| 1 | **DEED s.r.o. nesmie byť vykonávateľom verejnej zbierky** — zoznam oprávnených právnických osôb je taxatívny a obchodná spoločnosť v ňom nie je | potrebný neinvestičný fond / n. o. alebo partnerská nadácia |
| 2 | **Príspevky zo zbierky musia ísť na osobitný účet zbierky**, nie cez účet platformy | vylučuje escrow a peňaženku DEED pre zbierkový tok |
| 3 | **Provízia platformy sa počíta do 25 % stropu nákladov zbierky** | cenotvorba musí byť pod týmto limitom vrátane poplatkov PSP |
| 4 | **Verejná výzva o peniaze pre jednotlivca v núdzi je zo zákona verejná zbierka** | modul Help potrebuje zastrešujúcu právnickú osobu alebo režim uzavretého okruhu |
| 5 | **Existuje registračný režim namiesto licencie** — poskytovateľ platobných služieb v obmedzenom rozsahu do priemeru 3 mil. €/mes | realistická cesta, ak niekedy budete držať prostriedky |
| 6 | **Výmena DEED bodov za eurá by znamenala režim inštitúcie elektronických peňazí (350 000 €)** | off-ramp odložiť, body ponechať nepeňažné |
| 7 | **Modul Help s odplatnými službami spúšťa oznamovaciu povinnosť DAC7** | ročné hlásenie Finančnej správe, sankcia do 10 000 € opakovane |
| 8 | **Náboženská viera a zdravotný stav sú osobitné kategórie údajov** | povinná zodpovedná osoba (DPO) aj posúdenie vplyvu (DPIA), nie voliteľne |
| 9 | **Split a reťaz tvorcu generujú príjemcom zdaniteľný príjem** | potrebné ročné súhrny a jasné odlíšenie daru od odmeny v UI |
| 10 | **Kryptoaktíva reguláciu nezjednodušujú** — od 1. 1. 2026 je v SR potrebné povolenie NBS, sankcie do 5 mil. € / 12,5 % obratu | krypto mimo produktu |

### B.2 Odporúčaný cieľový model

- **Zbierky a dary:** priamy prevod na osobitný účet zbierky alebo na overený účet príjemcu. QR kód podľa štandardu PAY by square ako primárny kanál. Platforma nedrží žiadne prostriedky.
- **Help — odplatné služby a split:** platobná brána s okamžitým prevodom na účet príjemcu, provízia ako poplatok platformy, licenciu drží poskytovateľ platobnej brány.
- **„Peňaženka":** len ako používateľské rozhranie nad zostatkom vedeným u licencovaného partnera. Zostatok nikdy nie je na účte DEED.
- **DEED body:** nepeňažné, nevymeniteľné za eurá ani za tovar tretích strán.
- **Kryptoaktíva:** mimo rozsahu produktu.

### B.3 Ekonomika v skratke

| | Scenár A (≤5 000 používateľov) | Scenár B (50 000) |
|---|---|---|
| Jednorazovo pred spustením | 39 000 – 101 000 € | — |
| Fixné mesačné náklady | 4 600 – 9 100 € | 20 000 – 30 500 € |
| Z toho infraštruktúra | 205 – 330 € | 1 000 – 2 000 € |
| Z toho ľudia | 3 000 – 6 000 € | 12 000 – 18 000 € |
| Potrebný mesačný obrat na pokrytie fixov pri provízii 5 % | ~183 000 € | ~1 000 000 € |

**Záver pre biznis model:** provízia z darov sama platformu neuživí. Predvídateľný príjem má priniesť SaaS poplatok pre organizácie (farnosť, charita) za správu, adresár, kalendár a automatizované výkazníctvo.

---

## ČASŤ C — Register právnych predpisov

### C.1 Slovenské zákony

| Predpis | Relevantné ustanovenia a obsah | Kde sa dotýka DEED |
|---|---|---|
| **Zákon č. 162/2014 Z. z.** o verejných zbierkach | definícia zbierky vrátane *individuálne určenej humanitárnej pomoci*; výnimka pre zbierky podľa osobitných predpisov; taxatívny zoznam oprávnených právnických osôb; správny orgán (okresný úrad / MV SR), rozhodnutie do 15 dní; spôsoby vykonávania (osobitný účet, DMS, stacionárne a prenosné pokladničky, predaj predmetov, vstupenky); osobitný účet, DMS do 90 dní; **náklady max 25 % hrubého výnosu**; predbežná správa do 90 dní, záverečná do 24 mesiacov; pokuty **100 – 1 000 €** | Charita, Náboženstvo, Help, Moje zbierky |
| **Zákon č. 308/1991 Zb.** o slobode náboženskej viery a postavení cirkví a náboženských spoločností | registrácia cirkvi, podmienka **50 000 plnoletých členov** (od novely 2016); cirkevné zbierky ako osobitný predpis → výnimka z režimu verejných zbierok | modul Náboženstvo, adresár 18 registrovaných cirkví |
| **Zákon č. 370/2019 Z. z.** o finančnej podpore činnosti cirkví a náboženských spoločností (v znení zákona č. 344/2024 Z. z.) | štátny príspevok na činnosť registrovaných cirkví | kontext financovania farností |
| **Zákon č. 492/2009 Z. z.** o platobných službách | § 1 ods. 3 písm. k) výnimka **obmedzenej siete** + oznamovacia povinnosť voči NBS pri prekročení **1 000 000 €** za 12 mesiacov; § 2 ods. 1 písm. a)–g) druhy platobných služieb; § 64 základné imanie **20 000 / 50 000 / 125 000 €**; poskytovateľ platobných služieb **v obmedzenom rozsahu** — registrácia pri priemere do **3 000 000 €/mes**; inštitúcia elektronických peňazí **350 000 €** | peňaženka, escrow, split, reťaz, DEED body, off-ramp |
| **Zákon č. 297/2008 Z. z.** o ochrane pred legalizáciou príjmov z trestnej činnosti (AML) | povinná osoba, identifikácia a overenie klienta, program vlastnej činnosti, hlásenie neobvyklých obchodných operácií, uchovávanie dokladov | aktivuje sa až pri držaní prostriedkov |
| **Zákon č. 442/2012 Z. z.** o medzinárodnej pomoci a spolupráci pri správe daní, v znení **zákona č. 250/2022 Z. z.** (DAC7) | oznamovacia povinnosť prevádzkovateľa digitálnej platformy; relevantné činnosti vrátane **osobných služieb**; vylúčený predajca pod 30 transakcií a zároveň pod 2 000 €; lehota **31. 1.**; pokuta **do 10 000 €** opakovane | modul Help — ponuka a dopyt služieb |
| **Zákon č. 595/2003 Z. z.** o dani z príjmov | § 3 ods. 2 písm. a) dar nie je predmetom dane — **okrem darov v súvislosti s výkonom činnosti podľa § 5 a § 6**; paušálne výdavky **60 %, max 20 000 €**; § 8 ods. 1 písm. t) príjem z predaja kryptoaktív; § 50 asignácia podielu zaplatenej dane | Skutok, Split, Reťaz tvorcu, Help, krypto |
| **Zákon č. 18/2018 Z. z.** o ochrane osobných údajov | vnútroštátna úprava dopĺňajúca GDPR, dozorný orgán | celá databáza používateľov |
| **Zákon č. 431/2002 Z. z.** o účtovníctve | uchovávanie účtovných dokladov a závierok **10 rokov** | evidenčný ledger, archivácia |
| **Zákon č. 69/2018 Z. z.** o kybernetickej bezpečnosti, novela **č. 366/2024 Z. z.** (transpozícia NIS2), vyhláška NBÚ **č. 227/2025 Z. z.** | účinnosť novely 1. 1. 2025; prahová hodnota veľkosti subjektu (stredný podnik); vyhláška o bezpečnostných opatreniach účinná od 1. 9. 2025 | pri raste platformy |
| **Zákon č. 40/1964 Zb.** Občiansky zákonník | darovacia zmluva (§ 628 a nasl.) — právny základ daru mimo režimu verejnej zbierky | dar v uzavretom okruhu, priame dary |
| **Zákon č. 147/1997 Z. z.** o neinvestičných fondoch | jedna z právnych foriem oprávnených vykonávať verejnú zbierku; forma prevádzkovateľa ĽudiaĽuďom | odporúčaná zastrešujúca entita |
| **Zákon č. 213/1997 Z. z.** o neziskových organizáciách poskytujúcich všeobecne prospešné služby | oprávnená právnická osoba; forma prevádzkovateľa Darujme.sk | alternatívna zastrešujúca entita |
| **Zákon č. 34/2002 Z. z.** o nadáciách | oprávnená právnická osoba, výročná správa, audit | partnerský model |
| **Zákon č. 83/1990 Zb.** o združovaní občanov | občianske združenie ako oprávnená právnická osoba | partnerský model |
| **Zákon č. 455/1991 Zb.** živnostenský zákon | oprávnenie na sústavné poskytovanie služieb za odplatu | poskytovatelia v module Help |
| **Zákon č. 102/2014 Z. z.** o ochrane spotrebiteľa pri predaji na diaľku | predzmluvné informácie, odstúpenie do 14 dní | odplatné služby v Help |
| **Zákon č. 747/2004 Z. z.** o dohľade nad finančným trhom | § 41 a § 42 — poplatky za úkony a konania NBS (výška podľa opatrenia o poplatkoch) | licenčné konanie |

### C.2 Predpisy Európskej únie

| Predpis | Relevantný obsah | Kde sa dotýka DEED |
|---|---|---|
| **Nariadenie (EÚ) 2016/679 — GDPR** | čl. 9 osobitné kategórie (náboženská viera, zdravie); čl. 28 sprostredkovatelia; čl. 30 záznamy; čl. 33 ohlásenie porušenia do 72 h; čl. 35 DPIA; čl. 37 povinná zodpovedná osoba; čl. 83 pokuty do 20 mil. € / 4 %; čl. 91 osobitné pravidlá cirkví | celá databáza, moduly Náboženstvo a Help |
| **Smernica (EÚ) 2021/514 — DAC7** | oznamovacia povinnosť prevádzkovateľov digitálnych platforiem | Help |
| **Smernica (EÚ) 2015/2366 — PSD2** | základ zákona č. 492/2009; výnimka obchodného zástupcu a obmedzenej siete | platobná architektúra |
| **Smernica (EÚ) 2018/843 — AMLD5** | základ zákona č. 297/2008 | AML pri držaní prostriedkov |
| **Nariadenie (EÚ) 2023/1114 — MiCA** | povolenie poskytovateľa služieb kryptoaktív (CASP); v SR koniec prechodného obdobia **30. 12. 2025**, od 1. 1. 2026 len s povolením NBS; konanie 5 + 25 + 40 pracovných dní; sankcie do **700 000 €** (FO) a **5 000 000 € alebo 12,5 % obratu** (PO) | akýkoľvek krypto tok |
| **Nariadenie (EÚ) 2023/1113** — prevody finančných prostriedkov a kryptoaktív | *travel rule* — údaje o odosielateľovi a prijímateľovi pri prevodoch kryptoaktív | krypto tok |
| **Nariadenie (EÚ) 2022/2065 — DSA** | povinnosti online platforiem, notice-and-action, kontaktný bod; časť povinností sa nevzťahuje na mikro a malé podniky | UGC feed, moderovanie |
| **Smernica (EÚ) 2022/2555 — NIS2** | transponovaná zákonom č. 366/2024 Z. z. | pri prekročení prahu stredného podniku |
| **Usmernenia EBA/GL/2022/02** | oznamovanie výnimky obmedzenej siete | DEED body, ak by boli použiteľné na nákup |

### C.3 Štandardy a neregulačné rámce

| Rámec | Obsah |
|---|---|
| **PAY by square** | štandard platobného QR kódu Slovenskej bankovej asociácie, vytvorený 2013, voľne použiteľný, podporovaný všetkými veľkými slovenskými a českými bankami; kód obsahuje IBAN, sumu a symbol, žiadne citlivé údaje. Podmienky použitia zverejnené SBA. |
| **Akceptačné politiky poskytovateľov platobných služieb** | nezávislé od zákona; dary jednotlivcom a crowdfunding bývajú podmienené schválením alebo zastrešením neziskovou organizáciou — nutné overiť pred integráciou |

---

## ČASŤ D — Overené trhové ceny (júl 2026)

| Položka | Cena | Zdroj |
|---|---|---|
| Supabase Pro | 25 $/mes (100 000 MAU, 8 GB DB, 100 GB storage, 250 GB egress) | cenník |
| Supabase Team | 599 $/mes (vrátane SOC 2 a ISO 27001) | cenník |
| Supabase prekročenia | 0,00325 $/MAU, 0,125 $/GB DB, 0,09 $/GB egress, 0,0213 $/GB storage; PITR 100 $/mes | cenník |
| Vercel Pro | 20 $/používateľ/mes; 1 TB prenosu, potom 0,15 $/GB; WAF v cene | cenník |
| Stripe SK — karta EHP | **1,5 % + 0,25 €** (prémiová 1,9 %, UK 2,5 %, mimo EHP 3,25 % + 2 % konverzia) | cenník |
| Stripe SK — SEPA inkaso | 0,35 € | cenník |
| Stripe — spor (chargeback) | 20 € | cenník |
| Stripe Connect | **2 € za mesačne aktívny účet**; výplata **0,25 % + 0,10 €**; KYC/KYB a onboarding v cene | cenník |
| Stripe Identity | **1,25 €** za overenie dokladu, 0,40 € za overenie ID čísla, prvých 50 zdarma | cenník |
| Veriff / Sumsub / Onfido | ~0,80 $ bez minima / ~1,35 $ + ~149 $ mesačné minimum / ~2–3 $ | trhový prehľad |
| **Darujme.sk** (benchmark) | 3,9 % do 100 tis. €/rok, 2,9 % do 500 tis., 1,9 % nad 500 tis.; prevádzkovateľ Centrum pre filantropiu **n. o.** | podmienky portálu |
| **Donio.sk** (benchmark) | bez provízie; výplata pri dosiahnutí min. 200 €, inak vrátenie darcom | portál |
| **ĽudiaĽuďom.sk** (benchmark) | výplata približne každé 2 týždne priamo príjemcovi; prevádzkovateľ ĽUDIA ĽUĎOM, **n. f.** | portál |

---

## ČASŤ E — Otvorené otázky pre právneho poradcu

1. Je zbierka farnosti vykonaná prostredníctvom verejne dostupnej platformy tretej strany verejnou zbierkou podľa zákona č. 162/2014 Z. z., alebo spadá pod výnimku pre zbierky uskutočňované podľa osobitných predpisov?
2. Môže jedna „dáždniková" registrácia verejnej zbierky pokryť viacero individuálne určených prijímateľov, alebo MV SR vyžaduje samostatnú registráciu na každý prípad?
3. Kde presne leží hranica „vopred neurčeného okruhu prispievateľov" pri komunitnej viditeľnosti v aplikácii — postačuje obmedzenie na členov farnosti alebo pozvaných používateľov?
4. Sú dary a zbierky vyňaté z rozsahu DAC7, ak tá istá platforma súbežne sprostredkúva odplatné služby?
5. Je „split bežec 5 %" a „reťaz tvorcu" platobnou službou podľa zákona č. 492/2009 Z. z., alebo sa uplatní výnimka obchodného zástupcu podľa § 1 ods. 3?
6. Vyžadovala by výmena DEED bodov za eurá povolenie inštitúcie elektronických peňazí, a pri akej konštrukcii bodov sa uplatní výnimka obmedzenej siete s oznamovacou povinnosťou voči NBS?
7. Je zobrazenie cudzej verejnej krypto adresy bez akejkoľvek úschovy a bez prevodu v mene klienta mimo rozsahu nariadenia MiCA?
8. Kedy DEED prekročí prah povinnej osoby podľa zákona č. 69/2018 Z. z. v znení zákona č. 366/2024 Z. z. a aké povinnosti z DSA naň dopadnú po prekročení prahu malého podniku?
9. Aké sú konkrétne poplatky NBS podľa § 41 a § 42 zákona č. 747/2004 Z. z. za registráciu poskytovateľa platobných služieb v obmedzenom rozsahu?
10. Aká právna forma zastrešujúcej entity je pre DEED výhodnejšia — neinvestičný fond alebo nezisková organizácia — vzhľadom na zbierky, asignáciu 2 % a vzťah k s.r.o.?

---

## ČASŤ F — Odporúčaný postup

**Fáza 1 (0–3 mesiace) — právne základy, bez peňazí v systéme**
Právne stanovisko k otázkam z časti E. Rozdelenie „vnútorná verzus verejná zbierka" v module Náboženstvo. Kontrola právnej formy a registračného čísla zbierky pri jej tvorbe. DPIA, zodpovedná osoba, záznamy o spracovateľských činnostiach, zmluvy so sprostredkovateľmi. Dokončenie RLS.

**Fáza 2 (3–6 mesiacov) — platby bez licencie**
Platobná brána s priamym zúčtovaním na účet príjemcu. QR podľa PAY by square ako primárny kanál pre malé sumy. Overovanie vlastníctva účtu. KYC len pre príjemcov. Odložiť escrow vo vlastnej réžii a výmenu bodov za eurá.

**Fáza 3 (6–12 mesiacov) — výkazníctvo a dôvera**
Automatický export predbežnej a záverečnej správy zbierky, kontrola 25 % stropu. Pipeline pre DAC7. Ročné daňové súhrny pre príjemcov. Prvý penetračný test.

**Fáza 4 (nad 12 mesiacov)**
Posúdiť registráciu poskytovateľa platobných služieb v obmedzenom rozsahu až pri obrate blížiacom sa k 3 mil. €/mes.

---

## Zdroje

**Právne predpisy a orgány**
- [Zákon č. 162/2014 Z. z. o verejných zbierkach — Slov-Lex](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2014/162/)
- [Zákon č. 162/2014 Z. z. — Zákony pre ľudí](https://www.zakonypreludi.sk/zz/2014-162)
- [Zákon č. 162/2014 Z. z. — Zákony.Judikáty.info](https://zakony.judikaty.info/predpis/zakon-162/2014)
- [Zákon č. 492/2009 Z. z. o platobných službách — Slov-Lex](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2009/492/)
- [Zákon č. 370/2019 Z. z. o finančnej podpore činnosti cirkví](https://www.zakonypreludi.sk/zz/2019-370)
- [Zákon č. 366/2024 Z. z. (NIS2) — epi.sk](https://www.epi.sk/zz/2024-366)
- [NBS — subjekty poskytujúce služby na základe výnimky zo zákona (obmedzená sieť)](https://nbs.sk/en/financial-market-supervision1/supervision/payment-services-and-electronic-money/entities-providing-services-based-on-an-exception-from-the-act/)
- [NBS — postup pred podaním žiadosti o povolenie](https://nbs.sk/dohlad-nad-financnym-trhom/dohlad/platobne-sluzby-a-elektronicke-peniaze1/platobne-institucie-a-aisp1/postup-podania-ziadosti-pi/pred-podanim-ziadosti/)
- [NBS — príručka na prípravu žiadosti o povolenie (PDF)](https://nbs.sk/_img/documents/dnf_platobne_sluzby/pr%C3%ADru%C4%8Dka%20na%20pr%C3%ADpravu%20%C5%BEiadosti%20o%20povolenie.pdf)
- [MV SR — povolenie verejných zbierok](https://www.minv.sk/?povolenie-verejnych-zbierok-ouke=)
- [Ministerstvo kultúry SR — registrácia cirkví a náboženských spoločností](https://www.culture.gov.sk/posobnost-ministerstva/cirkvi-a-nabozenske-spolocnosti/registracia-cirvii/)
- [Ministerstvo kultúry SR — financovanie cirkví](https://www.culture.gov.sk/posobnost-ministerstva/cirkvi-a-nabozenske-spolocnosti/financovanie/)

**Výklady a odborné zdroje**
- [Podmienky pre komunitnú zbierku — itretisektor.sk](https://www.itretisektor.sk/clanky/podmienky-pre-komunitnu-zbierku)
- [Chcete si založiť vlastnú zbierku? Pravidlá a zákonné povinnosti — STVR](https://spravy.stvr.sk/2025/03/chcete-si-zalozit-vlastnu-zbierku-na-dobru-vec-toto-su-pravidla-a-zakonne-povinnosti/)
- [Nový zákon o verejných zbierkach — epravo.sk](https://www.epravo.sk/top/clanky/novy-zakon-o-verejnych-zbierkach-2232.html)
- [Zákon o verejných zbierkach — Slovak Business Agency](https://www.sbagency.sk/zakon-o-verejnych-zbierkach)
- [Ombudsman napadol podmienku 50 000 členov na Ústavnom súde — STVR, máj 2026](https://spravy.stvr.sk/2026/05/ombudsman-r-dobrovodsky-napadol-podmienky-registracie-cirkvi-limit-50-tisic-veriacich-oznacil-za-prakticky-nesplnitelny/)
- [Platobné služby, elektronické peniaze, FinTech — legalfirm.sk](https://www.legalfirm.sk/sk/trc/sluzby/informacie/sluzba/financie/platobne-sluzby-elektronicke-peniaze-fintech-a-financne-inovacie)
- [Povinnosti podľa AML zákona — Podnikajte.sk](https://www.podnikajte.sk/zakonne-povinnosti-podnikatela/povinnosti-aml-zakon-15-3-2018)
- [Finančná správa — FAQ k DAC7/DPI (PDF)](https://www.financnasprava.sk/_img/pfsedit/Dokumenty_PFS/Infoservis/AVI/2024/2024.07.29_FAQs_DAC7_DPI.pdf)
- [DAC7 — povinnosti prevádzkovateľov digitálnych platforiem, Accace](https://accace.sk/dac7-povinnosti-prevadzkovatelov-digitalnych-platforiem/)
- [Smernica DAC7 v slovenskej legislatíve — KPMG](https://www.danovky.sk/sk/europska-smernica-dac7-v-slovenskej-legislative)
- [Príjem získaný darovaním — Finančná správa](https://podpora.financnasprava.sk/062304-Pr%C3%ADjem-z%C3%ADskan%C3%BD-darovan%C3%ADm)
- [Príjmy z predaja kryptoaktív u nepodnikateľa — Finančná správa](https://podpora.financnasprava.sk/293880-Pr%C3%ADjmy-z-predaja-kryproakt%C3%ADv--u-nepodnikate%C4%BEa-)
- [Fundraising, dane a účtovníctvo — Donio](https://donio.sk/dane)
- [Crowdfunding na Slovensku — ficek.sk](https://ficek.sk/crowdfunding-na-slovensku-108)
- [Legislatívna regulácia crowdfundingu — epravo.sk](https://www.epravo.sk/top/clanky/legislativna-regulacia-crowdfundingu-5578.html)
- [Koniec prechodného obdobia MiCA — KPMG](https://www.danovky.sk/sk/koniec-prechodneho-obdobia-podnikanie-s-kryptoaktivami-uz-len-s-licenciou-nbs)
- [Udeľovanie povolení poskytovateľom služieb kryptoaktív — ULC](https://www.ulclegal.com/buletin/udelovanie-povoleni-poskytovatelom-sluzieb-kryptoaktiv/)
- [MiCA a povinnosti v roku 2026 — TPA Group](https://www.tpa-group.sk/news/europske-nariadenie-mica-a-aktualne-povinnosti-v-roku-2026/)
- [DPIA — kedy ste povinní ho vypracovať, epi.sk](https://www.epi.sk/clanok-z-titulky/gdpr--kedy-ste-povinni-vypracovat-dpia--posudenie-vplyvu-na-ochranu-osobnych-udajov-tt.htm)
- [Zodpovedná osoba podľa GDPR — GDPR-PASS.sk](https://www.gdpr-pass.sk/zodpovedna-osoba-podla-gdpr/)
- [NIS2 a zákon o kybernetickej bezpečnosti — PwC Slovensko](https://www.pwc.com/sk/sk/risk-assurance-slovensko/kyberneticka-bezpecnost/smernica-nis2.html)
- [Registrácia do zoznamu prijímateľov 2 % — finlex.sk](https://www.finlex.sk/registracia-do-zoznamu-prijimatelov-2-z-dane-v-roku-2026/)
- [2 % z dane — itretisektor.sk](https://www.itretisektor.sk/ekonomika/2-z-dane)

**Trh a ceny**
- [Podmienky použitia a špecifikácia štandardu PAY by square — SBA (PDF)](https://www.sbaonline.sk/wp-content/uploads/2020/03/podmienky-pouzitia-pay-by-square.pdf)
- [PAY by square — bysquare.com](https://bysquare.com/en/pay-by-square/)
- [DARUJME.sk — pravidlá a podmienky](https://darujme.sk/pravidla-a-podmienky/)
- [DARUJME.sk — časté otázky](https://darujme.sk/caste-otazky/)
- [ĽudiaĽuďom.sk](https://www.ludialudom.sk/)
- [Supabase — pricing](https://supabase.com/pricing)
- [Vercel — pricing](https://vercel.com/pricing)
- [Stripe — ceny pre Slovensko](https://stripe.com/sk/pricing)
- [Stripe Connect — pricing](https://stripe.com/en-sk/connect/pricing)
- [Stripe Identity — pricing](https://stripe.com/en-sk/identity)
- [Porovnanie KYC dodávateľov 2026 — Tech Insider](https://tech-insider.org/igt-sumsub-vs-onfido-vs-jumio-vs-veriff-for-igaming-kyc-202-en-d169/)
- [Cenník GDPR a AML služieb 2026 — WebPomoc.sk](https://www.webpomoc.sk/cennik/)
