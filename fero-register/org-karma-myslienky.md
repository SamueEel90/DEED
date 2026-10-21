# Org karma · myšlienky z debaty (Martin + Fero, 20.–21. 10. 2026)
*Toto nie je finálny návrh (ten je org-karma-charita.md v0.2) — toto je ZÁZNAM UVAŽOVANIA: prečo sme rozhodli, ako sme rozhodli, čo padlo cestou a čo sa zahodilo. Na stiahnutie a archív.*

## Východisko

Martin: pri charite a firme ma „serie mechanika karmy" — začo majú dostávať karmu a PREČO, čo bude činnosť navyše odmeňovaná; veľa neznámych. User karmu má (v1.2), organizácie nie.

## Poradie práce, ktoré sa osvedčilo

Martin zámerne rozdelil: najprv KRITÉRIÁ bez koeficientov („teraz iba kritériá, nie koeficienty"), potom ich ZORADIŤ podľa dôležitosti, až potom „hľadať kľúč k socializmu haha" — teda bodovú sústavu. Nie naopak. Keby sme začali číslami, pohádali by sme sa o váhach vecí, ktoré tam vôbec nepatria.

## Veľké myšlienky z debaty (s pôvodnými formuláciami)

**Tajnosť ako stratégia, nie hanblivosť.** Martin: „chcem, aby o systéme vedelo čo najmenej ľudí" — a potom to otočil na marketing: „treba sa učiť od najlepších a ich marketingu… mýty — čo je tajné, je lákavé: ako život po smrti, recept na colu." Z toho: váhy a konštanty = tajný config v DB (nie v gite, kóder ich nikdy nevidí), mení len Martin + Samo, kalibruje Vitkovič. Tajnosť zároveň bráni farmeniu — kto nepozná vzorec, nevie ho hrať.

**Málo pravidiel.** Martin: „presne tak — Pán Boh dal tiež iba 10 prikázaní." Kritérií má byť málo a majú byť pochopiteľné zo správania, nie zo zverejneného manuálu.

**Poctivosť nie je zásluha, je vstupenka.** Debata o tom, či dávať body za vyúčtovanie a doklady → NIE: poctivosť je koeficient na celok (×1,0 / ×0,7 / ×0,4 / zmrazené). Kto je poctivý, nemá bonus — kto nie je, má problém. Body sa dávajú len za aktivitu NAVYŠE.

**Lokálnosť = overiteľnosť, nie morálka.** Martin začal: dal by aj „na účel — keď OZ zbiera na rakety namiesto chleba — a dohľadateľnosť a lokálny dosah". Fero varoval pred moralizovaním účelu. Martin: „ale kdeže, už ideš moralizovať… rozdiel tam musí byť a mala by byť aj nejaká hrdosť… chceme byť prioritne lokálni a zvýšiť lojálnosť komunity." A dodal kľúč: „dosah a dohľadateľnosť ide ruka v ruke — ako ja overím niekoho v Nemecku alebo Bangladéši?" → Riešenie: ×1,4 za DOLOŽITEĽNÝ dopad v dosahu overenia. Účel a geografia sa morálne nehodnotia; hodnotí sa súlad s poslaním a doložiteľnosť. Vzdialená pomoc nie je trestaná — len nemá bonus, lebo sa nedá overiť.

**Nič karmotvorné za paywallom.** Martin to otestoval podpichnutím: „ale Ferko, ako k tomu príde malá charita, ktorá nemá QR dochádzku v balíku — nie je to diskriminácia?" → Zásada: dôkazový QR má aj ZADARMO (v obmedzenom počte); platí sa za objem a pohodlie, nikdy za MOŽNOSŤ dokázať dobro.

**Učenie receptom, nie účtenkou.** Martin o malej charite: „aj tak na ňu bude srať, lebo ona nevie, že aj toto pomôže." → Appka radí v momente činu („Ako rastie váš štít" v 3 vetách, podnet pri tvorbe akcie, fakt po akcii) — ale NIKDY nespája konkrétny čin s bodmi.

**Neviditeľnosť bodov.** Martin: „žiadny výsledok neukáže nikto a nikde nebude vidieť žiadne body… ty rob najlepšie ako vieš a body prídu." Štít sa mení ako udalosť (sláva), nie ako počítadlo. Žiadne „+50 za akciu", žiadne percentá.

**Karma meria skutky, nie identitu.** Martinov test čierneho humoru („dáme tam ešte niečo rasové, nejaké zrážky… haha") → odbité jednou vetou: do kľúča nejde nič o tom, KTO organizácia je — len čo ROBÍ. Platí to isté, čo pri userovi.

**Peniaze v karme — Martinova korekcia Fera.** Fero najprv navrhol „štít nikdy zo súm". Martin: „už sme to riešili pri karme usera — aj peňažný dar má hodnotu… my chceme, aby firmy prispievali… výška príspevkov musí byť zohľadnená… len vyššie sumy už nemajú takú hodnotu." → Peniaze karmu DÁVAJÚ cez degresívnu krivku Dary_Model v0.2 (ako user: prvé stovky vážia najviac) + STROP PODIELU: peňažná karma max ~polovica celkovej. Prakticky: „peniaze vynesú na Silver, Gold a vyššie treba odrobiť."

## Faktor X — ako vznikol

Martin: „do kritérií treba dať faktor X… niečo také, čo by ani tvojho najchytrejšieho brata nenapadlo, že to môže mať súvis s výpočtom." Potom sám nadiktoval suroviny: „platí to per krajina — otvorenie appky na daný trh… čas registrácie v dňoch + počet darcov za rok… koľko userov doniesli + počet vytvorených akcií, zbierok, skutkov, výziev za rok… ďakujeme za ich rozhodnosť… treba to dať do nejakého vzorca."

→ X = P × R × A: **P** pionier (deň otvorenia trhu ×1,30 navždy, po roku ×1,00 — vďaka za rozhodnosť) · **R** rast (noví privedení first-touch cez jej zbierku/QR/?s= — vďaka za projekty, čo lákajú ľudí) · **A** aktivita (živé projekty s min. účasťou — mŕtve výtvory sa nerátajú — vďaka za stavanie). Realisticky ×1,1–1,5.

A existuje aj **faktor Y** — vtip z konca debaty, ktorý si pamätáš sám. Na tvoje želanie nezapísané.

## Kto prideľuje (rozhodnuté bez váhania)

Server, deterministicky, z udalostí, ktoré v DB už vznikajú (doklady, QR dochádzka, pohyby, výstrahy, zdroje darov). AI hodnotí LEN obsah skutkov (existujúce /api/score). Človek vstupuje LEN pri nahláseniach a mimoriadnom uznaní. Nikto nič neklik á ručne — karma je dôsledok, nie agenda.

## Skutok organizácie a feed (dotiahnuté 21. 10.)

Martinova otázka: „ak charita zverejní skutok, kto a kedy vyhodnotí, či ostane len na stránke alebo ide do feedu? charita má pred zverejnením 3 možnosti." → AI hodnotí hneď pri zverejnení (podľa závažnosti, nie dĺžky), na stránke je skutok VŽDY, do feedu ho púšťa feed engine automaticky — žiadna povinnosť DEED. A Martinov dôležitý dodatok: „ešte tam treba koeficient zaplnenia feedu v oblasti — keď je prázdny, nech sa zapĺňa; keď je plný, tak podľa kvality." → prázdny okruh berie všetko živé, plný dvíha latku; chudobný okruh sa rozširuje štvrť → mesto → kraj.

## Zahodené cestou

- Body za počet zbierok, sledujúcich, vek organizácie — meria sa výstup a správanie, nie veľkosť a senior ita.
- Lineárne body zo súm — vždy degresia.
- Morálne hodnotenie účelu („rakety vs chlieb") — nahradené súladom s poslaním + doložiteľnosťou.
- Viditeľné body/percentá/výpisy — všetko preč, štít je udalosť.
- Zverejnenie vzorca — tajný config; verejná je len filozofia (skutky > peniaze, poctivosť podmienkou).
- Karmotvorné funkcie len v platených balíkoch — zakázané.

## Čo ešte visí

Kalibrácia čísel (Vitkovič, na dátach) · strop podielu peňazí presne (štart ~50 %) · karta „org karma engine" pre kódera ide až po Martinovom finálnom odsúhlasení — váhy kóder nikdy neuvidí.

*— spísal Fero z debaty 20.–21. 10., na Martinovu žiadosť o záchranu myšlienok z chatu —*
