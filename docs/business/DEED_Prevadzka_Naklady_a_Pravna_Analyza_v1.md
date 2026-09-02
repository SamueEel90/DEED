# DEED — Produkčná prevádzka: právna analýza a model nákladov (v1)

**Dátum:** 22. 7. 2026
**Rozsah:** QR systém, platobný systém, databáza používateľov (GDPR), KYC, zbierky pre cirkvi a charity
**Metóda:** senior BA analýza — každé tvrdenie označené `[OVERENÉ]` (dohľadaný primárny/kvalitný zdroj), `[ODHAD]` (trhový odhad bez verejného cenníka), `[PRÁVNE STANOVISKO]` (vyžaduje potvrdenie advokátom, výklad nie je jednoznačný).

---

## 0. Exekutívne zhrnutie

1. **DEED s.r.o. nikdy nemôže byť vykonávateľom verejnej zbierky.** § 3 zákona 162/2014 obsahuje taxatívny zoznam právnických osôb (OZ, nadácia, n. o., neinvestičný fond, účelové zariadenie cirkvi, …). Obchodná spoločnosť tam nie je. DEED môže byť len **technický sprostredkovateľ** — presne ako Darujme.sk, ktoré preto prevádzkuje **Centrum pre filantropiu n. o.**, nie s.r.o. `[OVERENÉ]`
2. **Peniaze zo zbierky nesmú pretiecť cez DEED.** Musia ísť na *osobitný účet* registrovanej zbierky. To vylučuje escrow a interné peňaženky pre zbierkový tok. `[OVERENÉ]`
3. **Provízia DEED sa započítava do 25 % stropu nákladov zbierky.** `[OVERENÉ]`
4. **Existuje lacná stredná cesta pre platby:** *poskytovateľ platobných služieb v obmedzenom rozsahu* — registrácia v NBS namiesto plnej licencie, ak priemerný objem platobných operácií za 12 mesiacov nepresiahne **3 000 000 €/mesiac**. `[OVERENÉ]`
5. **Najlacnejší a právne najčistejší platobný kanál je váš vlastný QR** (PAY by square → priamy prevod na osobitný účet). Poplatok 0 %. Cena za to je manuálne párovanie platieb alebo licencovaný AISP partner.
6. **DAC7 je skrytá povinnosť Help modulu** (ponuka/dopyt služieb = „osobné služby"): ročné hlásenie Finančnej správe do 31. 1., pokuta do 10 000 € opakovane. `[OVERENÉ]`
7. **DPO a DPIA sú pri DEED povinné, nie voliteľné** — náboženstvo a zdravie sú osobitné kategórie podľa čl. 9 GDPR a spracúvate ich vo veľkom rozsahu ako hlavnú činnosť. `[OVERENÉ]`
8. **Realistický TCO:** ~44–96 tis. € jednorazovo + ~4,1–8,3 tis. €/mes v prvom roku (scenár A). ~70 % mesačných nákladov sú ľudia, nie infraštruktúra. Infraštruktúra sama je do ~250 €/mes.

---

## 1. Verejné zbierky — zákon č. 162/2014 Z. z.

### 1.1 Kto smie vykonávať zbierku (§ 3) `[OVERENÉ]`
Taxatívny zoznam právnických osôb:
- občianske združenie
- nezisková organizácia poskytujúca všeobecne prospešné služby
- neinvestičný fond
- nadácia
- Slovenský Červený kríž
- **účelové zariadenie cirkvi a náboženskej spoločnosti**
- organizácia s medzinárodným prvkom
- záujmové združenie právnických osôb
- združenie obcí

> **Dopad na DEED:** produkt „vytvor zbierku" nesmie byť dostupný fyzickým osobám ani s.r.o. Registračný tok musí vynútiť právnu formu + IČO + doklad o zápise zbierky do registra. Toto je **blokujúca zmena** oproti súčasnej mock implementácii (`personalizacia` → moje zbierky).

### 1.2 Spôsoby vykonávania zbierky (§ 7) `[OVERENÉ]`
a) zasielaním príspevkov **na osobitný účet**
b) darcovskými SMS / volaním na skrátené číslo
c) stacionárne pokladničky
d) prenosné pokladničky
e) predaj predmetov so započítaným príspevkom
f) predaj vstupeniek na podujatia

Online platba kartou nie je samostatná kategória — právne sa uchopí ako písm. a), teda **cieľový účet musí byť osobitný účet zbierky**. Písmená c)–f) vyžadujú predchádzajúci písomný súhlas vlastníka/správcu priestoru.

> **Dopad na DEED:** QR kód smie viesť buď priamo na prevod na osobitný účet (PAY by square), alebo cez platobnú bránu, ktorá zúčtuje **na osobitný účet príjemcu**, nie do peňaženky DEED.

### 1.3 Registrácia, správny orgán, lehoty `[OVERENÉ]`
| Situácia | Orgán |
|---|---|
| zbierka v obvode jedného okresného úradu | okresný úrad |
| zbierka presahujúca obvod (teda každá celoštátna online zbierka) | **MV SR** |

- Zbierku možno začať **až po právoplatnosti** rozhodnutia o zápise do registra zbierok.
- Rozhodnutie spravidla do **15 dní**.
- **Predbežná správa** do 90 dní od ukončenia; **záverečná správa** do 24 mesiacov; obe sa zverejňujú.
- **Náklady zbierky max 25 % hrubého výnosu.**
- Sankcie: pokuta **100 – 1 000 €** (nízka finančne, ale vedie k výmazu z registra a reputačnej škode).
- Príspevky z DMS musia byť odvedené do 90 dní.

> **Dopad na DEED:** v produkte treba držať polia „číslo registrácie zbierky", „účel", „dátum začiatku/ukončenia", „osobitný účet", automatický výpočet nákladového pomeru a export podkladov pre predbežnú/záverečnú správu. Toto je predajný argument, nie príťaž — organizácie za to platia účtovníkom.

### 1.4 Výnimka pre cirkvi `[PRÁVNE STANOVISKO]`
§ 1 ods. 2: *„Tento zákon sa nevzťahuje na zhromažďovanie príspevkov a na iné zbierky uskutočňované podľa osobitných predpisov."* Medzi osobitné predpisy patrí aj zákon o slobode náboženskej viery — teda klasická **zbierka v kostole medzi veriacimi** nie je verejnou zbierkou a neregistruje sa.

**Otvorená otázka, ktorú musí posúdiť advokát:** ak farnosť vyzbiera peniaze cez **verejne dostupnú platformu tretej strany**, smerom k **vopred neurčenému okruhu darcov** (nie len k vlastným veriacim v priestore kostola), veľmi pravdepodobne už ide o verejnú zbierku so všetkými povinnosťami. Bezpečný produktový návrh:
- **Režim „vnútorná zbierka"** — viditeľná len prihláseným členom danej farnosti, bez indexovania, bez verejného feedu → argument výnimky.
- **Režim „verejná zbierka"** — vyžaduje číslo registrácie, inak sa nedá publikovať.

Toto rozdelenie treba zaviesť do modulu *Náboženstvo* skôr, než sa zapne reálny platobný tok.

---

## 2. Cirkvi a náboženské spoločnosti

- Na Slovensku je registrovaných **18 cirkví a náboženských spoločností**; registrácia novej vyžaduje čestné vyhlásenia **50 000 plnoletých členov** s trvalým pobytom v SR. Od roku 2007 nebola registrovaná žiadna nová; v roku 2026 verejný ochranca práv napadol túto podmienku na Ústavnom súde. `[OVERENÉ]`
- Financovanie zo štátneho rozpočtu podľa zákona **370/2019 Z. z.** (novelizovaný zákonom 344/2024 Z. z.). `[OVERENÉ]`
- Príjmy z cirkevných zbierok a cirkevných úkonov sú **oslobodené od dane z príjmov**. `[OVERENÉ]`
- **GDPR čl. 91:** cirkvi, ktoré mali vlastné komplexné pravidlá ochrany údajov, ich môžu ďalej uplatňovať a môžu mať vlastný dozorný orgán. **Toto sa však nevzťahuje na DEED** — vy ste samostatný prevádzkovateľ podľa všeobecného režimu. `[OVERENÉ]`

> **Dopad na DEED:** adresár 18 cirkví je stabilný číselník (nepribúdajú). Farnosti/zbory sú odvodené právnické osoby — pre platby a zbierky potrebujete ich vlastné IČO a účet, nie účet biskupstva.

---

## 3. Charity, neziskovky, asignácia 2 %

| Povinnosť | Detail | Zdroj |
|---|---|---|
| Registrácia do zoznamu prijímateľov 2 % | notárska zápisnica, **1. 9. – 15. 12.**, organizácia musí existovať aspoň od predchádzajúceho roka | `[OVERENÉ]` |
| Zverejnenie použitia | pri prijatí nad **3 320 €** — v Obchodnom vestníku | `[OVERENÉ]` |
| Osobitný účet | pri prijatí nad **33 000 €** — otvoriť do 30 dní a previesť prostriedky | `[OVERENÉ]` |
| Zoznam prijímateľov | zverejňuje Notárska komora do 15. 1. | `[OVERENÉ]` |

> **Dopad na DEED:** ak chcete robiť „asignačnú kampaň" (silný sezónny produkt jan–apr), stačí vám verejný register prijímateľov ako zdroj dát — peniaze cez vás vôbec netečú. Nulové regulačné riziko, vysoká hodnota. Odporúčam ako prvý monetizovateľný modul pre charity.

---

## 4. Platobný systém — kľúčové rozhodnutie celého projektu

### 4.1 Testovacia otázka
> **Dotkne sa peňazí niekedy účet DEED?**
> - **NIE** → DEED je technický poskytovateľ, žiadna licencia NBS, žiadne AML bremeno. Toto chcete.
> - **ÁNO** (peňaženka, escrow, split, hromadné výplaty z vlastného účtu) → poskytujete platobnú službu a potrebujete povolenie alebo registráciu NBS.

Vaša špecifikácia (escrow 3 stavy, split bežec 5 %, reťaz tvorcu, DEED → € off-ramp) je dnes napísaná v režime **ÁNO**. To je najdrahšia možná konfigurácia.

### 4.2 Štyri regulačné režimy `[OVERENÉ]`

| Režim | Kapitál / podmienka | Kedy dáva zmysel |
|---|---|---|
| **0. Bez licencie** — peniaze idú priamo z darcu na účet príjemcu (PAY by square QR alebo PSP s priamym zúčtovaním) | žiadny | **Odporúčané pre v1** |
| **1. Poskytovateľ platobných služieb v obmedzenom rozsahu** — registrácia v NBS | priemer platobných operácií za 12 mes. **≤ 3 000 000 €/mesiac**; sídlo v SR, zápis v OR, bezúhonnosť vedúcich osôb, obozretné podnikanie | keď skutočne potrebujete držať prostriedky, ale ste malí |
| **2. Platobná inštitúcia** — povolenie NBS | základné imanie **20 000 €** (poukazovanie peňazí, § 2/1/f), **50 000 €** (platobná iniciácia, § 2/1/g), **125 000 €** (služby § 2/1/a–e) | zrelý produkt s vlastnou peňaženkou |
| **3. Inštitúcia elektronických peňazí** | **350 000 €** | ak DEED body budú vymeniteľné za € (off-ramp) → toto vás čaká |

Poplatok za konanie NBS sa riadi opatrením o poplatkoch podľa § 41–42 zákona o dohľade; NBS ho na stránke neuvádza číselne. `[ODHAD: rádovo jednotky tisíc €]`

> **Odporúčanie:** **DEED → € off-ramp odložiť.** Je to jediná funkcia, ktorá tlačí projekt do kategórie 350 000 € základného imania. DEED body ponechať ako nepeňažné uznanie (štíty, badge, poradie) — to je aj konzistentné s vaším vlastným pravidlom „badge = štít + text, nikdy percentá".

### 4.3 Overené transakčné náklady `[OVERENÉ, cenníky júl 2026]`

**Stripe (SK):**
| Položka | Cena |
|---|---|
| Karta EHP — štandardná | **1,5 % + 0,25 €** |
| Karta EHP — prémiová/firemná | 1,9 % + 0,25 € |
| Karta UK | 2,5 % + 0,25 € |
| Karta mimo EHP | 3,25 % + 0,25 € (+2 % pri konverzii meny) |
| SEPA inkaso | **0,35 €** |
| Predplatné / Billing | +0,7 % z objemu |
| Spor (chargeback) | 20 € |

**Stripe Connect (výplaty tretím stranám — charity, farnosti, tvorcovia):**
| Položka | Cena |
|---|---|
| Mesačne aktívny pripojený účet | **2 €** |
| Výplata | **0,25 % + 0,10 €** |
| Onboarding, KYC/KYB, risk monitoring, dashboard | v cene |

**Stripe Identity (KYC):** **1,25 €** za overenie dokladu + selfie; 0,40 € za overenie ID čísla v registri; prvých 50 zdarma; nad 2 000 overení/mes individuálna cena.

**Alternatívy KYC:** Veriff od ~0,80 $ bez minimálneho záväzku; Sumsub ~1,35 $/overenie + ~149 $/mes minimum; Onfido ~2–3 $; enterprise kontrakty (Jumio, Onfido) bežne 50 000–200 000 $/rok. `[OVERENÉ — trhový prehľad]`

### 4.4 Konkurenčný benchmark provízií `[OVERENÉ]`
| Platforma | Provízia | Prevádzkovateľ |
|---|---|---|
| **Darujme.sk** | **3,9 %** (do 100 tis. €/rok), **2,9 %** (100–500 tis.), **1,9 %** (nad 500 tis.) | Centrum pre filantropiu **n. o.** |
| **Donio.sk** | 0 % provízia (model dobrovoľného prepitného od darcu) | Donio SK s.r.o. |

> Darujme posiela dary **priamo na účet prijímateľa**, spravidla do 30 dní; darovacia zmluva vzniká medzi darcom a prijímateľom, nie s platformou. To je presne architektúra režimu 0 — a je to model, ktorý odporúčam skopírovať.

### 4.5 Jednotková ekonomika — prečo malé dary bolia

Fixných 0,25 € je pri mikro-daroch zabijak:

| Výška daru | Poplatok Stripe | Efektívna sadzba |
|---|---|---|
| 3 € | 0,295 € | **9,8 %** |
| 5 € | 0,325 € | **6,5 %** |
| 10 € | 0,40 € | 4,0 % |
| 20 € | 0,55 € | 2,8 % |
| 50 € | 1,00 € | 2,0 % |
| 100 € | 1,75 € | 1,75 % |

**Dôsledky pre produkt:**
1. **QR na priamy bankový prevod (PAY by square) je pri malých sumách 5–10× lacnejší než karta.** Váš QR systém nie je „feature navyše" — je to vaša nákladová výhoda.
2. Pravidelné mesačné dary posielať cez **SEPA inkaso (0,35 € fixne)**, nie kartou.
3. Mikro-dary agregovať (jedna platba = viac skutkov), inak vám poplatky zjedia 5 % split.
4. Ak si beriete 5 % a Stripe si berie 3–6 %, príjemca dostane pri 5 € dare ~89 %. Pri 25 % strope nákladov zbierky ste stále v norme, ale komunikačne je to citlivé — zverejňujte rozpad.

**Cena za lacný QR kanál:** peniaze prídu na účet príjemcu bez notifikácie DEED. Buď párovanie cez variabilný symbol manuálne (príjemca potvrdí), alebo cez **licencovaného AISP** (Tink, Salt Edge, GoCardless a pod.) — vlastná AIS licencia by opäť znamenala 50 000 € základného imania. `[ODHAD: AISP partner 200–800 €/mes]`

---

## 5. AML / KYC

- Zákon **297/2008 Z. z.** — povinnosti: identifikácia a overenie klienta, monitorovanie neobvyklých obchodných operácií, **program vlastnej činnosti**, určená osoba, hlásenia FSJ, školenia, uchovávanie dokladov. `[OVERENÉ]`
- **Ak DEED nedrží prostriedky, povinnou osobou je PSP (Stripe), nie vy.** Vaše KYC bremeno je potom zmluvné, nie zákonné.
- Ak prejdete do režimu 1–3 (peňaženka, escrow, off-ramp), stávate sa povinnou osobou so všetkým, čo k tomu patrí — vrátane AML zodpovednej osoby a auditovateľného programu. `[ODHAD: 1 000–3 000 €/mes]`

**Praktické odporúčanie:** KYC/KYB vyžadovať len od **príjemcov** peňazí (charita, farnosť, tvorca so splitom), nikdy od bežných darcov. Pri 500 príjemcoch to je jednorazovo ~625 € (Stripe Identity) — zanedbateľné. Pri KYC všetkých používateľov by ste pri 50 000 registráciách zaplatili ~62 500 € úplne zbytočne.

---

## 6. DAC7 — najviac prehliadaná povinnosť

Smernica EÚ 2021/514 implementovaná zákonom **250/2022 Z. z.** (novela zákona 442/2012 Z. z.), účinná od 1. 1. 2023. `[OVERENÉ]`

| Prvok | Obsah |
|---|---|
| Kto hlási | **prevádzkovateľ platformy**, ktorý sprístupňuje platformu predávajúcim na základe zmluvy (FO sú z definície vylúčené) |
| Relevantné činnosti | **osobné služby**, predaj tovaru, prenájom nehnuteľností, prenájom dopravných prostriedkov |
| Podmienka | prevádzkovateľ pozná alebo môže primerane určiť výšku protihodnoty |
| Vylúčený predajca | menej než **30 transakcií** a zároveň menej než **2 000 €** za rok |
| Lehota | do **31. 1.** za predchádzajúci kalendárny rok |
| Sankcia v SR | do **10 000 €**, ukladateľná opakovane |

> **Dopad na DEED:** modul **Help (dopyt/ponuka)** je učebnicová „osobná služba". Ak cez vás tečie platba za pomoc/službu, ste oznamujúci prevádzkovateľ. Potrebujete: zber DIČ/rodných údajov predajcov pri onboardingu, verifikáciu, ročný XML export pre Finančnú správu.
> **Dary a zbierky** by mali byť mimo rozsah (nejde o protihodnotu), ale toto je hranica, kde sa DEED miešaním „skutok/ponuka/dar" v jednom feede vystavuje riziku preklasifikovania. `[PRÁVNE STANOVISKO]`

---

## 7. Dane na strane používateľa (vec dôvery, nie len compliance)

`[OVERENÉ]`
- **Čistý dar fyzickej osobe nie je predmetom dane** — § 3 ods. 2 písm. a) zákona o dani z príjmov.
- **Výnimka:** dary poskytnuté **v súvislosti s výkonom činnosti** podľa § 5 (závislá činnosť) alebo § 6 (podnikanie, iná samostatná zárobková činnosť) **sú zdaniteľné**.
- **Odmenový crowdfunding** (príspevok za protihodnotu, vytvorenie diela) = zdaniteľný príjem; FO si môže uplatniť paušálne výdavky **60 %, max 20 000 €/rok**.
- Podnikateľ / s.r.o.: všetky príspevky sú štandardný zdaniteľný výnos.
- Nezisková organizácia: dary nie sú zdaniteľným príjmom, ak sú použité v súlade so stanovami.

> **Dopad na DEED:** funkcie *Split bežec 5 %*, *Reťaz tvorcu* a *Ponuka* generujú používateľom **zdaniteľný príjem**, pretože sú viazané na výkon činnosti. Musíte:
> 1. jasne odlíšiť „dar bez protihodnoty" od „odmeny za činnosť" už v UI (máte na to `TypBadge` — Skutok / Žiadosť / Ponuka / Charita),
> 2. poskytovať **ročný súhrn prijatých súm** na stiahnutie,
> 3. mať v podmienkach vetu, že daňovú povinnosť nesie príjemca.
> Bez toho vytvárate tichú daňovú pascu pre tvorcov — a to je reputačné riziko väčšie než pokuta.

---

## 8. GDPR

### 8.1 Prečo je DEED v prísnejšom režime `[OVERENÉ]`
Spracúvate **osobitné kategórie osobných údajov** podľa čl. 9: náboženská viera (modul Náboženstvo, adresár cirkví, RSVP na omše) a údaje o zdraví (Help — žiadosti o pomoc). K tomu geolokáciu a finančné toky.

Z toho plynie:
| Povinnosť | Základ |
|---|---|
| **Výslovný súhlas** (nie len oprávnený záujem) | čl. 9 ods. 2 písm. a) |
| **DPIA** — posúdenie vplyvu | čl. 35 — rozsiahle spracúvanie osobitných kategórií |
| **DPO / zodpovedná osoba — povinne** | čl. 37 ods. 1 písm. c) — hlavnou činnosťou je rozsiahle spracúvanie osobitných kategórií |
| Záznamy o spracovateľských činnostiach | čl. 30 |
| Zmluvy so sprostredkovateľmi (Supabase, Stripe, Vercel, KYC) | čl. 28 |
| Ohlásenie porušenia do 72 h | čl. 33 |
| Pokuty | do 20 mil. € / 4 % celosvetového obratu |

### 8.2 Technické minimum, ktoré z toho vyplýva pre kód
- Supabase projekt **v EU regióne** (Frankfurt), nie US.
- RLS na všetkých tabuľkách s osobnými údajmi — vlna 6 vášho plánu, dnes nedokončená.
- Šifrovanie citlivých polí (náboženská príslušnosť, zdravotný kontext) na úrovni stĺpca.
- Politika retencie + tvrdý delete účtu (právo na výmaz), nie len `deleted = true`.
- Audit log prístupov k údajom čl. 9.
- Anonymizované analytics (bez third-party trackerov na stránkach s náboženským obsahom — profilovanie podľa vierovyznania je najtvrdšia možná kategória).

---

## 9. Ďalšie regulácie na radare

| Predpis | Stav pre DEED | Poznámka |
|---|---|---|
| **NIS2 / zákon 366/2024 Z. z.** (novela 69/2018), účinný 1. 1. 2025, vyhláška NBÚ 227/2025 | v štarte **mimo** | prah = stredný podnik (50+ zamestnancov alebo >10 mil. € obrat). Pri raste online trhovisko / sociálna sieť spadá medzi dôležité subjekty. `[ODHAD výkladu]` |
| **DSA** (nariadenie 2022/2065) | čiastočne | notice-and-action, kontaktný bod, transparentnosť moderovania; mikro a malé podniky sú z časti povinností vyňaté `[PRÁVNE STANOVISKO]` |
| **Zákon o ochrane spotrebiteľa pri zmluvách na diaľku** | áno pre Help modul | odstúpenie do 14 dní, predzmluvné informácie |
| **Účtovníctvo a archivácia** | áno | 10 rokov pri daňových dokladoch |

---

## 10. Model nákladov (TCO)

### 10.1 Jednorazové náklady pred spustením

| Položka | Suma | Poznámka |
|---|---|---|
| Právne: VOP, GDPR balík, DPIA, zmluvy s PSP, posúdenie licenčnej otázky NBS | 6 000 – 15 000 € | `[ODHAD]` — komoditné ponuky (DPIA za 139 €, AML smernica za 169 €) sú pre e-shop, nie pre platformu s čl. 9 dátami a platbami |
| Založenie/prevzatie **neziskovej entity** pre zbierkovú vetvu (n. o. alebo nadácia) | 1 000 – 3 000 € | nevyhnutné, ak chcete robiť vlastné zbierky, nie len sprostredkovanie |
| Penetračný test + bezpečnostný audit pred launchom | 4 000 – 15 000 € | `[ODHAD]` — slovenskí dodávatelia ceny nezverejňujú |
| Integrácia PSP + Connect + KYC + DAC7 reporting (dev práca, 2–4 mesiace) | 20 000 – 50 000 € | `[ODHAD]` |
| Dokončenie RLS a produkčného zabezpečenia DB (vlna 6) | 8 000 – 15 000 € | `[ODHAD]` — dnes nedokončené |
| Onboarding a due diligence u PSP | 0 – 3 000 € | |
| **Spolu (režim 0 — bez licencie)** | **~39 000 – 101 000 €** | |
| *Príplatok za režim 1 (registrácia NBS, obmedzený rozsah)* | *+15 000 – 40 000 €* | právne + compliance setup `[ODHAD]` |
| *Príplatok za režim 3 (EMI, off-ramp)* | *+350 000 € imanie + 80 000 – 200 000 € setup* | `[ODHAD]` |

### 10.2 Mesačná prevádzka — scenár A: produkčné MVP, ≤ 5 000 používateľov

| Položka | €/mes | Zdroj |
|---|---|---|
| Supabase Pro (100k MAU, 8 GB DB, 100 GB storage, 250 GB egress) | 23 | `[OVERENÉ]` $25 |
| Supabase compute add-on (small/medium pre produkciu) | 14 – 55 | `[OVERENÉ]` |
| Supabase PITR (bod obnovy — pri finančných dátach povinné de facto) | 92 | `[OVERENÉ]` $100 |
| Vercel Pro (2 členovia) | 37 | `[OVERENÉ]` $20/user |
| Monitoring, e-mail, SMS, doména, zálohy mimo Supabase | 40 – 120 | `[ODHAD]` |
| **Infraštruktúra spolu** | **~205 – 330** | |
| KYC (Stripe Identity, ~50 nových príjemcov/mes) | 60 | `[OVERENÉ]` 1,25 €/ks |
| Stripe Connect — 200 aktívnych príjemcov | 400 | `[OVERENÉ]` 2 €/účet |
| Externý DPO + priebežné právne poradenstvo | 400 – 1 200 | `[ODHAD]` — komoditné 19–29 €/mes nestačia pre čl. 9 + platby |
| Účtovníctvo, DAC7 podklady | 150 – 300 | `[ODHAD]` |
| Ľudia (1 vývojár na 0,5 úväzku + podpora 0,5) | 3 000 – 6 000 | `[ODHAD]` SK trh |
| Amortizácia ročného pentestu | 350 – 800 | `[ODHAD]` |
| **SPOLU** | **~4 565 – 9 090 €/mes** | |

*(Transakčné poplatky nie sú v tabuľke — sú variabilné, viď 10.4.)*

### 10.3 Mesačná prevádzka — scenár B: 50 000 používateľov

| Položka | €/mes |
|---|---|
| Supabase Team (SOC 2 + ISO 27001 v cene) + compute + PITR + prekročenia | 700 – 1 100 |
| Vercel Pro (4 členovia) + prekročenie transferu | 120 – 400 |
| Monitoring, logy, CDN, mapy, e-mail/SMS | 200 – 500 |
| KYC (~300 overení/mes) | 375 |
| Stripe Connect (2 000 aktívnych príjemcov) | 4 000 |
| DPO + AML/compliance (part-time) + právo | 1 500 – 3 500 |
| Účtovníctvo, audit, DAC7 | 400 – 800 |
| Tím: 2 vývojári, 1 podpora, 0,5 DevOps | 12 000 – 18 000 |
| Pentest, bug bounty, poistenie kyber rizík | 900 – 1 800 |
| **SPOLU** | **~20 200 – 30 500 €/mes** |

Pozor: pri 2 000 aktívnych príjemcoch je **Stripe Connect (4 000 €) drahší než celá infraštruktúra**. Pri raste sa oplatí vyjednať individuálnu sadzbu alebo prejsť na priame prevody cez QR pre neaktívnych príjemcov.

### 10.4 Variabilné náklady podľa obratu

Modelový mesiac, priemerný dar 15 €, mix 60 % karta / 30 % QR prevod / 10 % SEPA inkaso:

| Mesačný obrat | Karta (1,5 % + 0,25 €) | QR prevod | SEPA inkaso | Výplaty (0,25 % + 0,10 €) | **Spolu** | % z obratu |
|---|---|---|---|---|---|---|
| 10 000 € | 190 € | 0 € | 23 € | 45 € | **258 €** | 2,6 % |
| 50 000 € | 950 € | 0 € | 117 € | 190 € | **1 257 €** | 2,5 % |
| 250 000 € | 4 750 € | 0 € | 583 € | 830 € | **6 163 €** | 2,5 % |
| 1 000 000 € | 19 000 € | 0 € | 2 333 € | 3 100 € | **24 433 €** | 2,4 % |

Ak by ste všetko hnali cez kartu, sadzba stúpne na ~3,2 %. Ak by ste posunuli QR podiel na 60 %, klesne na ~1,4 %. **Rozdiel medzi zlým a dobrým platobným mixom je pri obrate 1 mil. € približne 18 000 € mesačne.**

### 10.5 Bod zlomu

Pri provízii **5 %** a nákladoch ~2,5 % na platby vám ostáva ~2,5 % hrubej marže na pokrytie fixných nákladov.

| Scenár | Fixné náklady/mes | Potrebný mesačný obrat na pokrytie |
|---|---|---|
| A (min) | 4 565 € | **~183 000 €/mes** (2,2 mil. €/rok) |
| A (max) | 9 090 € | ~364 000 €/mes |
| B (stred) | 25 000 € | **~1 000 000 €/mes** (12 mil. €/rok) |

> Toto je najdôležitejšie číslo v celej analýze. Pre porovnanie: Darujme.sk má sadzobník nastavený tak, že organizácie nad 500 000 € **ročne** platia 1,9 %. Slovenský online darcovský trh je malý. **Provízia z darov sama osebe DEED neuživí.** Reálne cesty k udržateľnosti:
> 1. **SaaS poplatok pre organizácie** (farnosť/charita platí 15–50 €/mes za správu, adresár, kalendár, výkazníctvo pre MV SR) — predvídateľný príjem, nezávislý od obratu, bez regulačného rizika.
> 2. **Help / B2B modul** s províziou zo služieb (vyššie marže než dary, ale prináša DAC7).
> 3. Dary sú akvizičný kanál, nie zdroj marže.

---

## 11. Odporúčaná cestovná mapa

**Fáza 1 (0–3 mes.) — právne základy, bez peňazí v systéme**
- Právne stanovisko k trom otázkam: cirkevná zbierka cez platformu, DAC7 vs. dary, klasifikácia splitu podľa 492/2009.
- Rozdelenie „vnútorná vs. verejná zbierka" v module Náboženstvo.
- Zavedenie kontroly právnej formy + registračného čísla zbierky do tvorby zbierky.
- DPIA, DPO, záznamy čl. 30, DPA so všetkými sprostredkovateľmi.
- Dokončenie RLS (vlna 6).

**Fáza 2 (3–6 mes.) — platby v režime 0**
- Stripe Connect s priamym zúčtovaním na účet príjemcu (peniaze sa nedotknú DEED).
- PAY by square QR ako primárny kanál pre malé dary.
- KYC len pre príjemcov, cez Stripe Identity.
- Vypnúť/odložiť: escrow v réžii DEED, DEED → € off-ramp.

**Fáza 3 (6–12 mes.) — výkazníctvo a dôvera**
- Automatický export predbežnej/záverečnej správy pre MV SR, kontrola 25 % stropu.
- DAC7 pipeline pre Help modul.
- Ročné daňové súhrny pre tvorcov.
- Prvý pentest, ISO 27001 zvážiť až pri B2B predaji.

**Fáza 4 (12+ mes.) — až keď obrat presiahne ~500 000 €/mes**
- Posúdiť registráciu poskytovateľa platobných služieb v obmedzenom rozsahu (limit 3 mil. €/mes).
- Až potom uvažovať o vlastnej peňaženke.

---

## 12. Zoznam otvorených otázok pre advokáta

1. Je zbierka farnosti vykonaná cez verejnú platformu DEED verejnou zbierkou podľa 162/2014, alebo spadá pod výnimku § 1 ods. 2?
2. Sú dary a zbierky vyňaté z rozsahu DAC7, ak tá istá platforma zároveň sprostredkúva platené služby (Help)?
3. Je „split bežec 5 %" a „reťaz tvorcu" platobnou službou podľa 492/2009, alebo sa naň vzťahuje výnimka obchodného zástupcu (§ 1 ods. 3)?
4. Vyžaduje DEED → € off-ramp licenciu inštitúcie elektronických peňazí?
5. Kedy DEED prekročí prah NIS2 a s akými povinnosťami?
6. Aké povinnosti z DSA dopadajú na DEED pri súčasnej veľkosti a po prekročení prahu malého podniku?

---

## Zdroje

- [Zákon č. 162/2014 Z. z. o verejných zbierkach — Slov-Lex](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2014/162/)
- [Zákon 162/2014 — úplné znenie, Zákony pre ľudí](https://www.zakonypreludi.sk/zz/2014-162)
- [Zákon 162/2014 — Zákony.Judikáty.info](https://zakony.judikaty.info/predpis/zakon-162/2014)
- [Zákon o verejných zbierkach — Slovak Business Agency](https://www.sbagency.sk/zakon-o-verejnych-zbierkach)
- [Nový zákon o verejných zbierkach — epravo.sk](https://www.epravo.sk/top/clanky/novy-zakon-o-verejnych-zbierkach-2232.html)
- [Registrácia cirkví — Ministerstvo kultúry SR](https://www.culture.gov.sk/posobnost-ministerstva/cirkvi-a-nabozenske-spolocnosti/registracia-cirvii/)
- [Zákon 370/2019 Z. z. o finančnej podpore činnosti cirkví](https://www.zakonypreludi.sk/zz/2019-370)
- [Ombudsman napadol podmienku 50 000 členov — STVR, máj 2026](https://spravy.stvr.sk/2026/05/ombudsman-r-dobrovodsky-napadol-podmienky-registracie-cirkvi-limit-50-tisic-veriacich-oznacil-za-prakticky-nesplnitelny/)
- [Zákon č. 492/2009 Z. z. o platobných službách — Slov-Lex](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2009/492/)
- [NBS — Príručka pre prípravu žiadosti o udelenie povolenia (PDF)](https://nbs.sk/_img/documents/dnf_platobne_sluzby/pr%C3%ADru%C4%8Dka%20na%20pr%C3%ADpravu%20%C5%BEiadosti%20o%20povolenie.pdf)
- [NBS — Postup pred podaním žiadosti](https://nbs.sk/dohlad-nad-financnym-trhom/dohlad/platobne-sluzby-a-elektronicke-peniaze1/platobne-institucie-a-aisp1/postup-podania-ziadosti-pi/pred-podanim-ziadosti/)
- [NBS — Subjekty poskytujúce služby na základe výnimky zo zákona](https://nbs.sk/en/financial-market-supervision1/supervision/payment-services-and-electronic-money/entities-providing-services-based-on-an-exception-from-the-act/)
- [Platobné služby, e-peniaze, FinTech — legalfirm.sk](https://www.legalfirm.sk/sk/trc/sluzby/informacie/sluzba/financie/platobne-sluzby-elektronicke-peniaze-fintech-a-financne-inovacie)
- [Zákon 297/2008 AML — povinnosti podnikateľov, Podnikajte.sk](https://www.podnikajte.sk/zakonne-povinnosti-podnikatela/povinnosti-aml-zakon-15-3-2018)
- [MV SR — zmeny AML zákona (PDF)](https://www.minv.sk/swift_data/source/policia/fsj_biro/usmernenia/Zmeny%20AML%20zakona%20c%20297_2008%20Z%20z%20ucinne%20od%2001112020.pdf)
- [Finančná správa — FAQ k DAC7/DPI (PDF)](https://www.financnasprava.sk/_img/pfsedit/Dokumenty_PFS/Infoservis/AVI/2024/2024.07.29_FAQs_DAC7_DPI.pdf)
- [DAC7: povinnosti prevádzkovateľov digitálnych platforiem — Accace](https://accace.sk/dac7-povinnosti-prevadzkovatelov-digitalnych-platforiem/)
- [Európska smernica DAC7 — KPMG Slovensko](https://www.danovky.sk/sk/europska-smernica-dac7-v-slovenskej-legislative)
- [Príjem získaný darovaním — Finančná správa](https://podpora.financnasprava.sk/062304-Pr%C3%ADjem-z%C3%ADskan%C3%BD-darovan%C3%ADm)
- [Fundraising, dane a účtovníctvo — Donio](https://donio.sk/dane)
- [Prijatý dar u podnikateľa — Podnikajte.sk](https://www.podnikajte.sk/dan-z-prijmov/prijaty-dar-u-podnikatela)
- [Registrácia do zoznamu prijímateľov 2 % — finlex.sk](https://www.finlex.sk/registracia-do-zoznamu-prijimatelov-2-z-dane-v-roku-2026/)
- [2 % z dane — itretisektor.sk](https://www.itretisektor.sk/ekonomika/2-z-dane)
- [DPIA — kedy ste povinní ho vypracovať, epi.sk](https://www.epi.sk/clanok-z-titulky/gdpr--kedy-ste-povinni-vypracovat-dpia--posudenie-vplyvu-na-ochranu-osobnych-udajov-tt.htm)
- [Zodpovedná osoba podľa GDPR — GDPR-PASS.sk](https://www.gdpr-pass.sk/zodpovedna-osoba-podla-gdpr/)
- [Zákon 366/2024 Z. z. (NIS2) — epi.sk](https://www.epi.sk/zz/2024-366)
- [NIS2 a zákon o kybernetickej bezpečnosti — PwC Slovensko](https://www.pwc.com/sk/sk/risk-assurance-slovensko/kyberneticka-bezpecnost/smernica-nis2.html)
- [DARUJME.sk — Pravidlá a podmienky](https://darujme.sk/pravidla-a-podmienky/)
- [DARUJME.sk — Časté otázky](https://darujme.sk/caste-otazky/)
- [Supabase — Pricing](https://supabase.com/pricing)
- [Vercel — Pricing](https://vercel.com/pricing)
- [Stripe — Ceny pre Slovensko](https://stripe.com/sk/pricing)
- [Stripe Connect — Pricing](https://stripe.com/en-sk/connect/pricing)
- [Stripe Identity — Pricing](https://stripe.com/en-sk/identity)
- [Porovnanie KYC dodávateľov 2026 — Tech Insider](https://tech-insider.org/igt-sumsub-vs-onfido-vs-jumio-vs-veriff-for-igaming-kyc-202-en-d169/)
- [Cenník GDPR/AML služieb 2026 — WebPomoc.sk](https://www.webpomoc.sk/cennik/)
