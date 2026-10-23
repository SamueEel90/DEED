# AKTÉR: Charita / OZ — základ, ktorý musí sedieť

*Vedie Fero. Zhrnutie podstatných dohôd zo všetkých chatov + stráženie, čo ešte nežije v appke. Aktualizuje sa pri každom výpise a hlásení. Stav k 23. 10. 2026.*

## A · DOHODNUTÝ ZÁKLAD (toto musí platiť)

**Registrácia:** z osobného účtu → Organizácia; IČO z registra (nemeniteľné), štatutár z registra alebo pozvánka, stanovy povinné, IBAN + overenie 0,01 €, sektory zo stanov (AI overí, schválené sa pridajú do profilu). Hlavný účet z registrácie, zmena len novým overením.

**Programy:** Zadarmo · P1 · P2 · P3 (P4 individuálne, mimo MVP). Limity súbežných zbierok: Zadarmo 1 · P1 centrálna+3 · P2 centrálna+10. Sektorové od P1. P3 zadarmo 2 mesiace pre pozvaných. Ročná platba −15 %. Pravidelná podpora od P1.

**Zbierky — 4 typy („+ Nová zbierka" ako vo Viere):**
- *Centrálna* (od P1): jedna, nikdy na feed, bez účelu, doklady dobrovoľné, NEzapečatená; účet nemenný; spúšťa sa PODRŽANÍM (karta Spustiť hore, kým nebeží — 23. 10.); BEZ samoukladania — „Uložiť podržaním"/„Zrušiť úpravy" (23. 10.).
- *Sektorové* (od P1): len zo schválených sektorov zo stanov, každá vlastný transparentný účet; sektor s darmi sa nemaže, len zavrie.
- *Bežná* (feed): po spustení ZAPEČATENÁ (cieľ, účel, účet, lehota, pôvodný text a fotky); text len dopĺňať s dátumom, fotky len pridať (8+1 video); preklep pred 1. darom = „Zrušiť a opraviť" (rovnaké Z-číslo), po 1. dare = nová; feed ekonomika 30 dní +15/15/15 za 5/15/40 €; záverečné doloženie POVINNÉ; stavy DOLOŽTE DO → PO LEHOTE → ČAKÁ NA OVERENIE → OVERENÉ DEED+.
- *Vecná/materiálna* (od P1).

**Skutky:** zadarmo vo všetkých programoch; na stránku vždy, do feedu podľa AI; bez Overujem/Namietam; organizátora poveruje charita; skutok môže zbierať na zbierku (platobný modul: vlastná centrálna / zbierka inej charity / bez).

**Peniaze:** DEED peniaze nedrží — hneď príjemcovi; poplatky platí darca a vidí vopred; dorovnanie z pozície charity: potvrdenie SEPA príjmu (48 h tichý súhlas len cez DEED), právo veta, jediná vie pozastaviť; sumy a počty darcov charity verejné (pod 2 € bez sumy).

**Obsah a profil:** oznam sledujúcim (odklad 5 min) vs. verejný záujem od P1 (max 3, ďalší 20 €); výzva na súrnu pomoc aj v Zadarmo (10 dní); pravidlá obsahu (dôstojnosť, zákazy); vzhľady Kronika/Výklad/Moderné + Ateliér; stránka NEVEREJNÁ do Zverejniť (511), zverejnenie spúšťa skúšobnú dobu; Príbeh zbierky (zápisy, nikdy neprepíše pôvodný text); „ZA ZBIERKU ZODPOVEDÁ" vždy charita.

**Karma:** org karma = body × poctivosť × X, len vlastnou aktivitou; štít = obrázok; za podvod strata štítu/pozastavenie.

## B · NEŽIJE V APPKE — STRÁŽIŤ (stav 23. 10., podľa Paľovej inventúry)

| Čo | Stav | Vážnosť |
|---|---|---|
| **Sektorové zbierky na serveri** | len pamäť prehliadača, žiadna tabuľka — po obnovení miznú | **KRITICKÉ — migrácia pre Sama, samostatný balík (Paľo navrhol)** |
| Zoznam charít (adresár) | bez servera | vysoká |
| Z-čísla | mock, kým nepridelí server | vysoká (viaže sa na doklady a QR) |
| Faktúry DEED+ (predĺženie, topovanie, oznamy 20 €) | len ukážka | stredná — pred ostrou |
| Dorovnanie z pozície charity (karta 49 obrazovky) | čiastočne (SpravaDorovnania existuje) — overiť proti karte | stredná |
| Org karma — kalibrácia vzorcov | návrh v0.2, kalibrácia neskôr (Vitkovič) | Fáza 2, vedome |
| Nemocnica, P4 na mieru | — | Fáza 2, vedome |
| Štartovací promo kód charity | dohodnutý, v kóde neoverené | overiť |

## C · OTVORENÉ ROZHODNUTIA (čakajú na Martina)

- Tretí režim registrácie charity — nenavrhnutý.
- Kvóta Iskier charity mesačne (P1/P4) — nedotiahnuté.
- EURC + pravidelná podpora: per zbierka vs. per charita.
- Fiškálny sponzor — parkovaný, Martin ho považuje za dôležitý.
- Zlatá UDALOSŤ vs. zlatá dorovnania vo feede (posledný kus farebnej mapy).

*Upozornenia z tohto súboru dávam Martinovi vždy, keď sa charita posúva — nie až keď horí.*

## D · DOPLNENÉ 23. 10. z rešerše a handoverov (zdroje/15 + 16 + jún v3.1/Handover)

**Ďalšie dohodnuté podstatné:**
- **Účel zbierky rozhoduje, nie príjemca:** Charita nefinancuje propagáciu presvedčení (politika, evanjelizácia); príjemcom pomoci ktokoľvek. Cirkevná charita na bezdomovcov áno, na rozvoj náboženstva nie.
- **Beneficient:** vzťah a súhlas rieši charita so svojím klientom; pri odoslaní odklikne „beneficient súhlasí" a RUČÍ (GDPR poistka). Hraničné situácie (smrť/vyliečenie/prebytok): rozhoduje charita transparentne, v medziach zákona 162/2014 — u Dagmar.
- **Dokladovanie (engine):** lehota podľa účelu pri vytvorení, nemenná (materiálna 30 · operácia 60 od zákroku · stavba mesačne · krízová 60 od vyplatenia…); pásma podľa VYZBIERANEJ sumy (150/500/1500/5000); centrálna+sektorové spúšťa 3 000 €, nie čas; po lehote výzva 3 dni → tabuľa faktov → 3 strikes = pozastavenie; predĺženie LEHOTY zadarmo so zdôvodnením; po doložení správa všetkým darcom s poďakovaním.
- **Sekcie = číselník zo 14. 9.** (zdroje/16): 6 existujúcich + Záchrana, Ľudia v núdzi, Humanitárna, Naše okolie, Nadácie a fondy; zaradenie podľa stanov, zbierka podľa účelu zbierky.
- **Dobrovoľníctvo:** symetrické hodnotenie 6 hviezd (5 prednastavené, ≤3 povinný dôvod), agregované a slepé; záujem = prepínač v profile; organizovať smie až platený program.
- **Feed:** hyperlokálny multiplikátor ×1,4 za doložiteľný dopad; koeficient zaplnenia okruhu (rozširovanie štvrť→mesto→kraj). Topovanie 7 dní mesto 5/kraj 15/krajina 40 € — NEMÝLIŤ s predĺžením zbierky (tiež 5/15/40).
- **Badge dôvery** (embed na web charity, klik → DEED profil) — náhrada kupovaných pečatí, akvizícia.
- **Platby:** 3 % ALL-IN veta; SEPA tip 3 € dobrovoľný bez predvolenia; mikrodary ≤0,50 € v DeeD bez poplatku; opakovaný dar je ~31 % online príjmu charít — preto pravidelná podpora.
- **Pre Challenge/tvorcu:** každá žiadosť musí mať strojovo čitateľný stav (číslo + cieľ + suma + splnené) — napojiteľný bod.

**B-doplnky — NEŽIJE, strážiť:**

| Čo | Stav | Vážnosť |
|---|---|---|
| **Sekcie v registrácii: v kóde natvrdo 4** („Sociálne, Deti, Zdravie, Seniori" — CharitaB) vs. číselník zo 14. 9. | zabudnuté | **vysoká — číselník sekcií ako config (ako cirkvi)** |
| Beneficient „súhlasí" checkbox + ručenie | Martin 23. 10.: existuje LEN pri dorovnávaní od firmy; pri tvorbe bežnej zbierky chýba | vysoká |
| Dokladovací engine (lehoty podľa účelu, pásma, 3 000 € trigger, 3 strikes, správa darcom) | len texty, logika nie | vysoká — jadro odlíšenia |
| Dobrovoľnícke hodnotenie 6★ + prepínač záujmu | nie je | stredná |
| Badge dôvery embed | položka „embed od P1" existuje — overiť obsah | stredná |
| Vecné dary — plný tok (zberné miesto, QR, potvrdenie) | vecná zbierka od P1 je typ; tok Fáza 2–3 | vedome |
| VTO, dve čísla pre firmu | → akteri/firma.md | — |

**C-doplnky — otvorené:** advokácia a právna pomoc (vlastná vypínateľná sekcia vs. von) · vekové obmedzenia z jún v3.1 (Kids do 15, 15–18 obmedzené) — platí ešte? · oceňovanie vecných darov · DEED Match len cez DPIA/„cez charitu".

*Partneri: zoznam 61 organizácií na oslovenie (xlsx u Martina, hárok so stavom oslovenia) — biznis pipeline, do repa nejde.*
