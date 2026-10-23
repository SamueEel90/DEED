# Zdroj 21 · QR systém v1.1 (máj 2026 + kontrola jún) — extrakt z docx

QR kód systém DEEDproject
Máj 2026  |  Interný dokument
1. Prehľad QR kód systému
DEEDproject využíva QR kódy na troch odlišných miestach: pri registrácii a verifikácii identity užívateľa, pri platbách medzi užívateľmi a pri verifikácii účasti na organizovaných akciách. Každé použitie má vlastnú logiku a bezpečnostné požiadavky.
2. DEED Identity Card — QR preukaz dôveryhodnosti
Dynamický digitálny preukaz ktorý slúži ako vizuálne overenie členstva a dôveryhodnosti užívateľa v komunite DEED Good.
2.1 Čo zobrazuje Identity Card
Profilová fotka a meno užívateľa
Karma úroveň a karma skóre (Začiatočník → Aktívny → Silver → Gold → Platinum → Legend)
Počet overených dobrých skutkov
Dátum členstva (od kedy je členom)
Animovaný pulzujúci zelený kruh — vizuálny signál že karta je aktívna
Dynamický QR kód — mení sa každých 30 sekúnd
2.2 Hlasová funkcia
Pri otvorení Identity Card appka povie hlasom: "Každý dobrý skutok má reálnu hodnotu." — v lokálnom jazyku užívateľa. Starší ľudia alebo ľudia so slabším zrakom nepotrebujú čítať displej — zvuk potvrdí autenticitu.
2.3 Ochrana pred falšovaním
2.4 Praktické použitie
Príklad: 15-ročný Tomáš chce pomôcť babke. Otvorí DEED Identity Card → babka vidí animovanú kartu s fotkou, Gold karma, 47 skutkov, člen od 2026 → počuje hlasový pozdrav → naskenuje QR → na svojom telefóne vidí overený profil → dôveruje mu.
2.5 Dostupnosť
Online: QR sa mení každých 30 sekúnd — screenshot neplatný
Offline: statický QR s 24-hodinovou platnosťou — pre oblasti bez signálu
3. Platobný QR kód — platby medzi užívateľmi
Každý užívateľ má vlastný unikátny platobný QR kód ktorý umožňuje posielanie DEED tokenov bez zadávania adresy alebo mena.
3.1 Tri spôsoby platby
3.2 Technológia
ERC-4337 (Account Abstraction) — žiadne seed frázy, žiadne kopírovanie adries
Gasless transakcie — Paymaster platí gas fees za užívateľa
Platba len medzi overenými užívateľmi (KYC)
Denný limit prevodov nastaviteľný v admin paneli
3.3 Poďakovanie po DEED SOS
Po vyriešení núdzovej situácie môže zachránený poďakovať pomocníkovi poslaním DEED tokenov — cez profil, QR alebo DEED link. Tento dar zvyšuje karmu obom stranám.
4. Rotujúci QR kód — verifikácia účasti na akciách
Univerzálna platformová funkcia pre všetky moduly kde prebieha organizovaná účasť: DEED Learn, Health & Body, Art, Challenge, Gov, Eco. Chráni pred zdieľaním QR cez screenshot a pred predčasným odchodom účastníkov.
4.1 Problém ktorý rieši
4.2 Ako funguje
Organizátor zobrazí QR kód na obrazovke/plátne na mieste akcie
Účastník naskenuje živý QR priamo z obrazovky na mieste
Server overí či token nie je starší ako 15 sekúnd
Screenshot zaslaný kamarátovi je neplatný — kód medzitým vypršal
Zdieľanie cez telefón, tablet alebo PC je znemožnené rovnakým mechanizmom
4.3 Vstupný a odhlasovací QR
Kľúčové: Odhlasovací QR neexistuje pred dosiahnutím stanoveného % účasti. Účastník nemôže predčasne odísť a zároveň dostať certifikát alebo odmenu.
4.4 Technológia
TOTP (Time-based One-Time Password) — rovnaká technológia ako Google Authenticator a bankovníctvo
Token obsahuje: ID akcie + timestamp + kryptografický hash
Server overuje platnosť každého skenovania v reálnom čase
Refresh interval: prednastavený alebo nastaviteľný podľa balíčka
4.5 Balíčky a dostupnosť funkcií
4.6 Prečo prednastavené hodnoty v Business balíčku
Business balíček má prednastavené hodnoty (napr. refresh 15 sekúnd, odhlásenie po 80% účasti) z dvoch dôvodov:
Jednoduchosť — malé firmy a organizátori nepotrebujú nastavovať technické parametre
Ochrana pred chybou — prednastavené hodnoty sú overené a bezpečné
Enterprise balíček umožňuje plnú konfiguráciu pre náročnejšie požiadavky
4.7 Moduly kde sa rotujúci QR používa
5. Zhrnutie — tri typy QR kódov
6. Doplnenia z kontroly (jún 2026)
Závery z prechodu QR systému logikou reálneho použitia (Martin & Fero). Rozhodnutia platia; poznámky označené oranžovou riešia programátori.
6.1 Rotujúci akčný QR — smer skenu
•  Organizátor ZDIEĽA rotujúci QR (plátno/telefón), účastník ho SKENUJE svojou appkou. Dôkaz = „bol som fyzicky tu, v tento deň a čas, cez svoj overený účet“.
•  Server validuje každý sken podľa jeho vlastného časového okna (nie poradie) — pri rade ľudí každý skenuje vo svojom momente, kód stále rotuje.
•  Čas okna 10–15 s je kompromis (poctivý user vs podvodník). 5 s je kontraproduktívne — trestá poctivých (starší, slabý signál).
6.2 Výstupný QR — podľa typu akcie
•  Workshop / kurz (dôkaz absolvovania): vstup + výstup + % účasti. Pod prahom čiastočná/žiadna odmena, plná pri dokončení — „nie sme policajti“.
•  Verejná akcia / festival (počítanie účasti): LEN vstupný sken. Žiadny výstup — nikto sa neodhlasuje.
•  Typ akcie sa určí pri jej vytvorení (výstup povinný / voliteľný / žiadny).
6.3 DEED za účasť — od koho
•  Za účasť na workshope NEJDE DEED od nás. My vydáme len DÔKAZ ÚČASTI (dochádzka/certifikát). Odmenu (ak je) dáva organizátor / zamestnávateľ.
•  Dôsledok: relay/podvod nečerpá náš pool — riziko (falošná dochádzka) nesie organizátor, nie platforma.
6.4 Identity Card — vzájomná identifikácia cez akciu
•  Prípad: objednám službu (napr. opatrovníčku pre mamu). Tok: žiadosť → poskytovateľ sa prihlási → pošlem pozvánku → prijatie → SYSTÉM VYTVORÍ AKCIU medzi oboma stranami.
•  Pri skene Identity Card systém neukáže len „overený člen Jana“, ale „Jana priradená k tvojej akcii #123“ — rozdiel medzi „je to člen“ a „je to TÁ pravá“.
•  Obojsmerné — chráni obe strany (objednávateľ vidí správnu osobu; poskytovateľ ide na správnu adresu z akcie).
6.5 Anti-fraud — úmerný hodnote (MVP)
•  MVP obrana: krátke časové okno + pravidlo „1 QR sken = 1 device“ (zabráni zdieľaniu jedného telefónu a multiúčtom).
•  Relay útok (živý kód odfotený a poslaný preč) sa NErieši preventívne — je prácny, málo výhodný (žiadny náš DEED), okrajový.
•  GPS účastníka = záložná druhá vrstva proti relay; pridá sa AŽ pri reálnom výskyte podvodov alebo pri vysokej hodnote (drahý certifikát) / na žiadosť organizátora. Princíp: obrana úmerná hodnote.
6.6 Poznámky pre programátorov (na doriešenie)
•  Akčný QR — OFFLINE režim. Eco/outdoor akcie (les, bez signálu) potrebujú proof-of-presence aj offline. Návrh: appka uloží podpísaný token (kód + čas + GPS) a odošle pri signáli (spätná validácia).
•  Identity Card — overenie mimo signálu. Treba ošetriť offline validáciu preukazu (nadväzuje na existujúci 24h offline token).
Pozn.: SOS scenár (poďakovanie/identifikácia pri núdzi) = fáza 2/3, rieši sa v module SOS, nie tu.
DEEDproject DEED Good  |  QR kód systém  |  Máj 2026  |  Interný dokument
DEED  Good
QR kód systém — špecifikácia
Mechanizmus | Ako funguje | Výsledok
Rotujúci QR | QR kód sa mení každých 30 sekúnd | Screenshot je neplatný po 30 sekundách
TOTP token | Rovnaká technológia ako Google Authenticator | Nedá sa sfalšovať bez prístupu na server
Offline token | 24-hodinový kryptografický token pre offline použitie | Funguje aj bez internetu
Kryptografický podpis | Každý token je podpísaný serverom | Nedá sa vytvoriť falošný token
Spôsob | Ako funguje | Kedy použiť
Platba cez profil | Nájdeš užívateľa v appke → klepneš Poslať DEED | Obaja online, poznáš meno
Platba cez QR kód | Naskenuje QR → automaticky sa vyplní príjemca | Osobné stretnutie, nevieš meno v appke
Platba cez DEED link | Pošleš link deed.good/@martin → klepne → platobná obrazovka | Zdieľanie cez správy, sociálne siete
Príklad: Povinná firemná akcia. Pracovník nechce prísť — pošle screenshot QR kódu kamarátovi doma. Kamarát sa prihlási namiesto neho. Rotujúci QR toto znemožňuje — kód vyprší za 15 sekúnd.
QR typ | Kedy sa zobrazí | Čo robí
Vstupný QR | Na začiatku akcie | Zaregistruje príchod účastníka, spustí odpočet % účasti
Priebežný QR (60%) | Po dosiahnutí 60% trvania | Voliteľná kontrola priebežnej účasti
Odhlasovací QR | Po dosiahnutí nastaveného % účasti | Potvrdí dokončenie, vydá certifikát / DEED odmenu
Funkcia | Základný | Business (Stredný) | Enterprise
Statický QR kód | ✅ Áno | ✅ Áno | ✅ Áno
Rotujúci QR (15s refresh) | ❌ Nie | ✅ Prednastavené hodnoty | ✅ Plne nastaviteľný
Odhlasovací QR po % účasti | ❌ Nie | ✅ Prednastavené % | ✅ Plne nastaviteľný %
Priebežný kontrolný QR | ❌ Nie | ❌ Nie | ✅ Áno
Viacero vstupných bodov | ❌ Nie | ❌ Nie | ✅ Áno
Vlastný refresh interval | ❌ Nie | ❌ Nie | ✅ Áno
Export dochádzky | ❌ Nie | ✅ PDF | ✅ PDF + API
Modul | Príklady použitia
DEED Learn | Workshopy, kurzy, vzdelávacie akcie, školenia
DEED Health & Body | Firemné wellness akcie, skupinové cvičenie, zdravotné workshopy
DEED Art | Výstavy, art workshopy, umelecké akcie
DEED Challenge | Organizované výzvy s fyzickou účasťou na mieste
DEED Gov | Verejné podujatia, komunitné akcie, inštitucionálne stretnutia
DEED Eco | Organizované čistenie prírody, hromadná výsadba stromov
Typ QR | Účel | Refresh | Kde sa používa
Identity Card QR | Overenie identity a dôveryhodnosti člena | 30 sekúnd | Všade kde člen potrebuje preukázať identitu
Platobný QR | Posielanie DEED tokenov medzi užívateľmi | Statický (unikátny per užívateľ) | Platby, poďakovania, sprepitné
Akčný QR (rotujúci) | Verifikácia účasti na organizovaných akciách | 15 sekúnd (nastaviteľné) | Learn, Health, Art, Challenge, Gov, Eco
Technológia TOTP zaručuje že žiadny screenshot ani zdieľanie QR kódu nemôže nahradiť fyzickú prítomnosť na mieste akcie alebo reálne členstvo v komunite.