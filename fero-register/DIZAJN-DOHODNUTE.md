# DIZAJN-DOHODNUTE · čo platí v DEED
*Zostavil Fero z 13 výpisov dizajnérskych chatov (27. 9. – 21. 10. 2026) + overenia proti kódu a živej appke (deedgood.eu). Verzia 1.0, 21. 10. 2026.*
*Pravidlo čítania: pri rozpore platí novšie rozhodnutie Martina > kód > tento dokument > staré výpisy. Zdrojové výpisy sú v register/zdroje/, nezrovnalosti v REGISTER.md.*

---

## 1 · Značka a slovník

- **DEEDGOOD** = plný názov (oficiálne a právne texty). **DEED+** = skratka appky a firmy; + zarovnaný s vrchom D (komponent `<DeedZnacka />`, variant 2b). **DeeD** = token. Samotné „DEED" v UI NIKDY.
- Moduly appky: Domov, Charita, Help, Aktivity, Viera. („Good" neexistuje — je to Domov.)
- Doména **deedgood.eu**, z jednej konštanty, nikdy vercel.app. deed.sk nebude. E-maily meno@deedgood.eu.
- Po slovensky, tykanie userovi, vykanie firme. Bez emoji, bez výkričníkov, bez angličtiny v UI. Slovenský formát čísel (1 240 €).
- Nikdy „farník" → vždy „veriaci". Nikdy „feed" v UI. „Darovať", nie „podporiť". „Otvorene" namiesto „darcom" pri dobrovoľnom dokladovaní.
- Vo Viere „Bohu známy darca" (len cez faru); všade inde „Anonymný darca".
- Nikdy „ID" → „číslo zbierky/žiadosti…". Nikdy „odmena: karma". Zákaz viet „karma/štít sa nedá kúpiť". Vety v UI len faktické — čo JE, nie čo nie je.

## 2 · Železné pravidlá UI

- **Platba vždy podržaním** (mikro dar 0,9 s, ostatné 1,5 s), nikdy klik. Krátky ťuk → „Podržte tlačidlo". Platí aj pre zverejnenie, zapečatenie, mazanie, ukončenie, topovanie.
- Karty zbierok a skutkov **bez tlačidiel** — ťuk na celú kartu.
- Odozva tam, kde je prst. „Uložené ✓" až po potvrdení servera; chyba vždy na tlačidle („Nepodarilo sa · Skúsiť znova"). Nikdy mŕtve tlačidlo — povie, čo chýba.
- ‹ Späť vždy presne o krok, píše kam vedie; rozpísané sa nikdy nestratí.
- Jeden editor (**TextovePolia**: B · I · • · Diktovať) a jedna galéria (**GaleriaEditor** s popisom) VŠADE, bez výnimiek.
- Písmo Plus Jakarta Sans (bez ligatúr), farby len z kod/farby.css; animácie len transform+opacity, prefers-reduced-motion. Výnimka: vlastná verejná stránka smie mať vlastné písmo nadpisov; ovládanie, feedy a Správa vždy Jakarta.
- Hit targety ≥44 px, text ≥16 px, kontrast 4,5:1, nič len farbou/zvukom. Dizajn pre babku aj tínedžerku — technický antitalent je norma.
- Prázdny blok sa nezobrazí; prázdne stavy („Zatiaľ žiadne dary") ostávajú. Žiadne vymyslené dáta — darcov si appka nevymýšľa nikde. Placebo „pripravujeme" sa skrýva; atrapa sa neukazuje, kým nefunguje.
- „Teraz nerobíme" = NEŠAHAŤ (nie skryť, nie zmazať).
- Pravdu píše server: všetko uložené vidí každý účet; stav oznámení/nastavení k účtu, nie do telefónu/prehliadača.
- Prototyp je záväzný 1:1 aj vizuálne. Návrh počíta s amatérskymi fotkami a dlhými textami.
- **KATALOG-BLOKOV.md**: hotové bloky sa kopírujú 1:1, mení sa len rozdiel aktéra. Nikdy druhá verzia tej istej mechaniky.

## 3 · Peniaze a platobný modul

- Jeden modul `ZbierkaModul` pre celú appku, miesto sa nastavuje. Schválený 12. 10.: poradie € → EURC → DeeD; Podporiť DEED⁺ vlastné okno.
- Karta od 3 €, SEPA od 1 €, DeeD aj 0,10 €. Poplatky platí darca a vidí ich VOPRED; z daru sa nikdy nič nestrháva. DEED peniaze nedrží — idú príjemcovi hneď; cieľ zbierky je informačný, dar nad cieľ sa pripíše.
- Rýchle sumy €: max **45** (user má do 50 € bez PIN — nesmie sa pomýliť; nad 45 podržanie + potvrdenie nad 50 €). EURC väčšie: 20/35/45.
- Sumy darcov: predvolene VIDNO (rozhoduje správca; „ľudia dávajú viac, keď to iní vidia"); pod najnižšou rýchlou sumou len meno; pod 2 € nikdy. Zvonček, pohreb a súkromné zbierky: sumy NIKDY.
- Hosť: dar bez registrácie max 100 €; QR vedie rovno na cieľ (bod 385), lákačka na registráciu až PO dare; „Tvoj dar čaká na meno" + kód DAR-XXXX-XXXX bez lehoty; nikdy nepárovať podľa karty/IBAN. Pravidelná podpora len pre registrovaných (len charita a Viera, tvorca nie; sumu určuje darca).
- Dorovnanie: zlatá farba = výhradne dorovnanie/peniaze firiem (v zlatom nikdy zelená). Cez DEED auto po 48 h; mimo DEED charita potvrdzuje (Odmietnuť do 24 h s dôvodom len pre DEED, Neprišli po 24 h). Firma nikdy nedorovnáva vlastnú zbierku. Obmedzenie dorovnania podľa odvetví aj IČO — firma o ňom nevie. Vrátenie zvyšku = vlastný doklad D-, VS = číslo dokladu.
- Reťaz dobra: len registrovaný; pri aktívnom dorovnaní sa neukazuje; dá sa odísť bez delenia; nastavuje sa raz. Tvorca/user min 5 % (krok 5 %), charita 100 %.
- Zbierky tvorcu v rade — nesčítavajú sa; QR až keď zbierka ožije; po naplnení QR prepne na tvorcu; tvorca 10 % DEED, zvyšok jeho.
- Feed ekonomika: krátkodobá 30 dní + predĺženia 15/15/15 za 5/15/40 € (max 75); dlhodobá 30+30, doloženie = 24 h hore (max 3/deň, 3/týždeň, 1×/mes); netýka sa centrálnych, sektorových, dlhodobých a len-na-stránke. Záverečné doloženie POVINNÉ, priebežné dobrovoľné. Topovanie podržaním; na predĺženie/topovanie faktúra.
- Stavy skončenej zbierky: DOLOŽTE DO → PO LEHOTE → ČAKÁ NA OVERENIE → OVERENÉ DEED+.
- Doklady: AI kaskáda lacno (kontroly bez AI → najlacnejší model → silnejší → človek → vrátiť); kontrola kolujúcich dokladov; citlivé údaje oddelene od verejnej galérie; lehota 48 h na overenie.
- Hotovosť do appky nevstupuje. Účet z registrácie; zmena len novým overením (0,01 €).

## 4 · Číslovanie

- Verejné číslo (= VS): 9 číslic + Luhn, prideľuje server PRI VZNIKU objektu, nikdy sa nemení ani nerecykluje. Prefixy zobrazovacie: Z S I U P C D + doplniť H (žiadosť) a O (ponuka). Skutok→zbierka: číslo ostáva, mení sa prefix.
- Zobrazenie: **v hlavičke detailu medzi ‹ Späť a ×** (bod 428), kopírovateľné. Feed karta bez čísla. Oznamy a efemérne veci čísla nedostávajú.
- Rada dokladov D- s typom pohybu (dar/dorovnanie/vrátenie); vrátenie sa nepočíta do vyzbieraného.

## 5 · Feed a farby

- Farba karty = DRUH/AKCIA, nie oblasť: zbierka charity červená · žiadosť oranžová · skutok zelený (zelená výhradne skutky) · ponuka modrá · práca bledomodrá (PracaKarta) · výsledok teal · oznam neutrál. Sýta červená rezervovaná pre MIMORIADNE (katastrofy) — vždy prvá vo feede. SOS jednotlivca do feedu nejde (priamy kanál).
- **Iskry nejdú do feedu** — vlastný modul; fialová je ich farba a smie sa použiť aj inde. **Pohrebná/súkromná zbierka nejde do feedu** — len stránky; pohreb = farba piety (bordová #722535 + zlatá #C9A24A), nikdy fialová (stará), žiadne „páči sa", Kondolovať.
- Karta feedu = návrh **1b** (bod 426): tvorca nad nadpisom, štít len obrázok, bez fajky, čipy „Komu to pomáha" v pozadí (viazané na záujmy), pás 4 px, „ešte N dní", bez % pod 10 %, text 2 riadky. Jednotný znak druhu 2a (štítok na fotke + farebný okraj).
- Zbierka predáva príbeh, nie obrázok: Príbeh + „Ako to zatiaľ ide" + Priebeh; Príbeh týždňa automaticky (zbierka s najnovším zápisom, štítok „Nové v príbehu").
- Skutok charity: na stránku vždy, do feedu podľa AI (závažnosť pri zverejnení + plnosť feedu) — DEED nič nesľubuje. Skutok zadarmo vo všetkých programoch; bez Overujem/Namietam (tie len pri useroch). Výzva na súrnu pomoc → hlavný feed mesta.
- OTVORENÉ (čaká na Martina): zlatá pre UDALOSŤ vs zlatá dorovnania; sektorové farby vs farby druhov (bod 139). → jedno rozhodnutie o farebnej mape.

## 6 · Karma a štíty

- Karma súkromná; verejný len štít. Štíty Bronzový/Strieborný/Zlatý/Platinový/Legenda — obrázky, nikdy text, nemenia sa. **Bronz v hmle** od registrácie, odhalí ho prvá dokončená akcia. Hlavný štít jeden; oblasti usera ART/HEALTH/LEARN/SPORT/EKO/HELP (CARE→charita; TEAM, PARTNER→firma); max 5 vyvesených.
- Nikdy neporovnávať ľudí; štít = vyznamenanie. Žiadne L-úrovne, percentá, výpisy bodov; učenie receptom, nie účtenkou.
- Charita: karma len vlastnou aktivitou (org-karma-charita.md v0.2 — body × poctivosť × X, peniaze degresívne so stropom podielu). Viera: žiadne štíty, žiadna karma, nič nedokladá. Malý spolok: bez štítu a karmy, len „Overená organizácia". Za podvod: strata štítu, hodnotenia, pozastavenie.
- Pravidlá rovnaké pre všetkých; zmena len pri zlyhaní vzorcov + správa každému.

## 7 · Sektory

- **Postup:** jedna kostra Správy z charity; typy (karta 36): Charita/OZ, Spolok, Klub, Umenie, Škola, Farnosť, Nemocnica (fáza 2), Obec, Firma, Tvorca. Uberajú sa funkcie, menia nástroje. Vzhľady: Nástenka/Kronika/Moderné/Klasika (Viera 4), charita Kronika/Výklad/Pirát/Míľnik — prepínanie v Nastaveniach (nie na profile); Zadarmo jeden vzhľad bez výberu, výber od P1; bežiaca stránka mení vzhľad cez náhľad → o 2:00/Teraz + 7 dní späť (v2 čaká na súhlas).
- **Charita:** Zadarmo·P1·P2·P3 (P4 individuálne, mimo MVP); P3 zadarmo pre pozvaných 2 mesiace od registrácie; na moduloch ako Viera (zamknutý „od P…"); žiadna zbierka nevznikne sama; centrálna nikdy na feed, bez účelu, doloženie dobrovoľné; 5 zbierok mimo centrálnej; oznamy: sledujúcim (odklad 5 min) vs verejný záujem (od P1, max 3, ďalší 20 €); výzva na súrnu pomoc aj v Zadarmo (10 dní).
- **Viera:** cena 35 € + 10 € druhé miesto + 5 € ďalšie; trial 2 mes od zverejnenia; po vypršaní vizitka+omše, nič sa nemaže; platca ≠ vlastník (Stakčín, grace 1 mes); registrácia len s overeným IBAN; číselník 18 cirkví = config (tituly, dozorca len evanjelici); Ľudia: Farár + Pomocník; uzavretá (nič do feedov); zvonček per omša (Karta 58), QR trvalý; pohrebná zbierka cez overovateľa 0–3 % max 100 €, uzávierka vsadiek 3 h pred pohrebom, rozety (prah 30 €, tiery 30/50/100/200, cena ≤5 € z daru); bloky slovesá (Príď, Vypočuj si, Modli sa, Spomíname, Teš sa, Pomôž); Spomíname tichý pás; konzervatívne, bez žartov.
- **Spolok (10 €):** jedna pobočka, jedno mesto (IČO); zjednodušená Správa charity, nič nové; členské nikdy verejne; zoznam členov neverejný; väčší spolok = OZ cenník charity.
- **Tvorca / B2B:** tvorca samostatný cenník, blog/platená sekcia/školenia s QR; B2B podľa b2b-plan.md (19. 10.) — tvár firmy v regióne, sponzoring cez B2B; charakter návrhu si Martin premyslí.
- Ročná platba: charita −15 %, Viera 2 mesiace zadarmo — ROZDIELNE je zámer (Martin 21. 10.); Viera: po vyčerpaní 2 mesiacov zadarmo v prvom roku je ďalšia zľava až o rok.

## 8 · Spolupráca (procesy)

- Kóderovi 1–3 body s dokumentom a balíkom; odpoveď „hotové · odchýlky · otázky", bez snímok. Pri bodoch vždy číslo + NÁZOV (kolízia 396–399!).
- Soňa: najprv les, 2–3 odvážne návrhy + čo zahodila, bez moralizovania, vlastné územie bez pýtania, oponent nie potvrdzovač (SONA-AKO-NAVRHOVAT.md). Bezpečnostnú dieru povie jednou vetou.
- Pred kreslením otvoriť skutočný kód (repo SamueEel90/DEED, vetva platby-modul). Každá vec v Správe má miesto na nástenke + riadok v MAPA-NASTENKY.md.
- Priebežné výpisy: keď sa chatu stráca kontext, Soňa spraví výpis MD → Martin ho pošle Ferovi do registra → porovnanie so všetkým; na konci chatu kompletný odovzdávací MD (SPOLUPRACA.md bod 13).
- Testuje sa naostro na deedgood.eu (local netreba); Martin sa pri sprísňovaní DB nesmie zamknúť (najprv účet, potom zámok).
- DEV prepínače sa nemažú bez dohody (?dev / VITE_TEST=1); admin ukážka len na čítanie.

## 9 · Rozhodnuté 21. 10. + čo ostáva otvorené

**Martin rozhodol 21. 10.:**

1. Farby feedu: návrh zatiaľ platí (udalosti jantár, zlatá peniazom) — nie je to zákon, doladí sa podľa reálu.
2. Vzhľad v2 (2a/2b): **NESCHVÁLENÉ** — Martinovi sa zatiaľ nepáči. Kóderovi sa NEPOSIELA, Soňa prepracuje.
3. Doklady: „Odoslať na overenie" PODRŽANÍM — zásada: všetko dôležité sa drží, userov nemiasť „raz držia a raz nie".
4. Svadba: uzavreté, platí kód — svadba „POZÝVAJÚ", parte „OZNAMUJE" (Sablony.tsx r. 343).
5. Ročná zľava: ostáva rozdielne. Viera: ak si vyčerpali 2 mesiace zadarmo v prvom roku, ďalšia zľava až o rok.
6. Kurz DeeD: **1 € = 100 DeeD** — v kóde správne (lib/kurz.ts, Martin 20. 10.); údaj „1 € = 20" zo starého výpisu je blud.
7. Kolízia čísel 396–399: dať do poriadku — úloha pre Soňu (prečíslovať farnostné body na voľné čísla a opraviť odkazy v balíkoch).

**Ostáva otvorené (menšie, bez tlaku):** bonus tempa Extrémna/Top · viac firiem pri dorovnaní (A/B) · kvóta Iskier P1/P4 · EURC+pravidelná per zbierka vs per charita · tretí režim registrácie charity · Míľnik („Ako to overujeme" kam) · pole „Ako to dopadlo" pri dokladoch.

**Parkované (nestratiť, ale najprv prvé veci):** fiškálny sponzor · požičovňa+kalkulačka · DEED Match · nemocnica (fáza 2) · Challenge s prenosom (fáza 2).

## 10 · Pasce — prekonané veci, ktoré sa NESMÚ oživiť

- Týždenný model zvončeka (okno po–ne, „spoločný dar farníkov") → platí per omša (Karta 58).
- „Podporiť farnosť ›" → názov zbierky (nie každá cirkev má farnosť).
- Fialová pohrebná zbierka (#6E4E7A) → farba piety; starý prototyp „Pohrebna zbierka - kto co vidi" ju ešte má.
- E-mail kanál oznámení → e-maily sa nezbierajú, len appka+push.
- „Reťaz dobra pri Viere nie" → pri pohrebnom module Reťaz JE.
- Bronz automaticky od registrácie → bronz v hmle.
- 3 vzhľady → 4 (Klasika existuje). „Pirát" pri farnosti → „Moderné".
- Tipy „za 10 € kúpime…"/„Mesačne to znamená" → preč, pri Viere len dar.
- „DARY V KRYPTE" nápis → „Dary v EURC" (kód ešte nesleduje — karta kóderovi).
- Obľúbené → Sledovať. Talent → Iskra. „Transparentný účet" → „Správa účtov". „Dlhodobá" → „Centrálna zbierka spoločnosti".
- Repo martinstofiktn-web/DEED → SamueEel90/DEED.
- Verejné číslo v pätke detailu → v hlavičke.
- Reťaz dobra zelená šrafovaná v module → od 22. 10. FIALOVÁ šrafovaná; zelená šrafovaná patrí skutku zbierajúcemu na zbierku.
- Sektorové zbierky „od AKCIA/P2" → od P1 (22. 10.).
- Paušálne „5 zbierok mimo centrálnej" → limity P1 centrálna+3, P2 centrálna+10 (22. 10.).
- SektoroveZbierky.tsx a CentralnaZbierka.tsx ako vzor → staré generácie; jediný vzor SpravaCentralnej.tsx (KARTA 48).
- Prototyp „Retaz dobra.dc.html" (tvorca × majiteľ zbierky) → NEPLATÍ; jediný vzor reťaze „Retaz dobra - kto a s kym" + RetazDobra.tsx (23. 10.).

## 9b · Rozhodnuté 22. 10. (zdroj 14 — mení staršie body vyššie)

- **Zapečatenie zbierky po spustení (detail):** zapečatené je všetko z tvorby vrátane pôvodného textu, fotiek, videa a hlavnej fotky. Text sa len dopĺňa (1–2 vety s dátumom, doplnenie sa tiež zapečatí), fotky len pridať (max 8 + 1 video). Preklep pred prvým darom: „Zrušiť a opraviť" — kópia s rovnakým Z-číslom a QR (meniť sa dá aj účel, účet nie); po prvom dare: ukončiť a založiť novú. Centrálna a sektorové sa NEzapečatia (text a fotky voľne, ako hlavná vo Viere).
- **Reťaz dobra v module = FIALOVÁ šrafovaná** (#6B4E9A/#A68BD0); zelená šrafovaná = skutok zbierajúci na zbierku. Poradie v pruhu aj riadkoch: organizácia → firmy → reťaze → skutky → ľudia; paleta 8 odtieňov per subjekt natrvalo, pri nerozlíšiteľnosti farba z loga; 3 najväčší + „Zobraziť všetky ›".
- **Sektorové zbierky od P1**; limity súbežných: P1 = centrálna + 3, P2 = centrálna + 10, Zadarmo 1. Sektory = schválené oblasti zo stanov (AI overí), vlastný transparentný účet; s darmi sa sektor nemaže, len zavrie. Tok „+ Nová zbierka": Centrálna · Sektorová · Bežná · Vecná.
- Reťaz = zapečatená verzia zbierky u tvorcu s vlastným QR; na nej sa reťaz nereťazí. Dorovnanie: (A) hlavnej zbierky — tlačidlo Reťaz dobra zmizne, skoršie reťaze ostávajú; (B) verzie u tvorcu — reťaz neblokuje.
- „Dorovnáva", nikdy „prispela" (tá len pri pevnej sume); „ZA ZBIERKU ZODPOVEDÁ" vždy charita/user, aj na stránke tvorcu a firmy.
- Naživo/Od začiatku: len dary a skutky, nikdy návštevy; žiadna verejná nula. Z-číslo na mobile skrátené (4 číslice, ťuk rozbalí). Jedna karta so sumou (s míľnikmi).
- Strážca nečinnosti a auto-odhlásenie v testovacej verzii VYPNUTÉ (489); nové bezpečnostné prvky len so súhlasom Martina.
- Vzor kódu centrálnej: SpravaCentralnej.tsx (KARTA 48).
- **Reťaz robí ktokoľvek registrovaný, kto dostáva dary** (23. 10.) — nie len tvorca; vzor „Retaz dobra - kto a s kym" + RetazDobra.tsx. Stránka darcu po QR reťaze: „Za zbierku zodpovedá" + charita, bez Reťaze dobra, firma „dorovnáva"; QR aj /r/ jedna adresa, na PC odkaz v popise/chate. OBS počítadlo (features/overlay) sa pri tvorcovi POUŽÍVA, nevymýšľa.
- **Farby sektorov** (23. 10.): centrálna zelená · 1. petrolejová #2F7C82 · 2. modrá #3F6FA8 · 3. terakota #B5653A · ďalšie svetlejšie; fialová (reťaz) a zlatá (firmy) pri sektoroch NIKDY. Ľudia v pruhu = prechod tmavozelená → svetlozelená (498 zrušený).

*— koniec v1.0 + dodatok 22. 10. · dopĺňa sa cez REGISTER.md pri každom novom výpise —*
