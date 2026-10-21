# Výpis dohôd · chat Správa farnosti (Soňa, 7. 10. 2026)
Bez triedenia, či to ešte platí. Začiatok chatu sa už nedá spätne prečítať, tie časti sú doplnené z pamäte projektu (CLAUDE.md, ODOVZDANIE, OPRAVY, karty 56E – 56H). Dátum je pri všetkom 7. 10. 2026, ak nie je uvedené inak.

## 1 · Pravidlá a zásady
- Spolupráca: zo Správy charity si spolu urobíme hotové bloky, pomenujeme ich a potom ich Soňa vkladá ako hotové moduly. Upravujú sa len rozdiely sektora (Martin, deň pred 7. 10.).
- Hotové moduly sú zapísané v CLAUDE.md pod svojím názvom. Keď Martin povie názov, súbor sa skopíruje 1 : 1 a nič sa nevymýšľa.
- Nič, čo sme spolu neurobili, nesmie byť vyplnené, aby Martin nemal pocit, že je to hotové.
- Pamäť medzi chatmi je len v súboroch projektu. Preto sa zapisuje len to, čo spolu odsúhlasíme.
- Prvý príchod znamená, že farár sa práve zaregistroval a všetko je prázdne: žiadne čísla, omše, oznamy, ľudia, zbierky ani vymyslené mená („Farnosť Trenčín“, „Nina“).
- Nehotové sekcie majú štítok NEHOTOVÉ.
- Používateľ je technický antitalent (farár, ktorý neznáša počítače), každý krok musí byť blbovzdorný. Zapísané v CLAUDE.md.
- Po každej akcii musí prísť odozva tam, kde je prst, vždy povedať, čo ďalej, nič nestratiť a nenechať človeka hádať, či je hotovo.
- Hlášky a posun obrazu musia byť „chytrejšie“: keď je farár dole, nesmie sa niečo zmeniť hore bez toho, aby to videl.
- Mazanie, spúšťanie a zapečatenie sa robí podržaním, nie klikom.
- Mazanie musí naozaj zmazať údaje, ale nie skryť funkcie. Martin chcel vymazať len vymyslené dáta, nie tlačidlá.
- Správa musí fungovať pre všetky náboženstvá, preto sa slovo „farnosť“ nepíše napevno tam, kde to nie je nutné (napr. názov hlavnej zbierky).
- Liturgie v ponuke musia byť také, aby neurazili katolíka, pravoslávneho, gréckokatolíka ani evanjelika.
- Najprv sa robí PC, mobil a tablet až keď to Martin povie.
- Kóder dostane naraz najviac 1 – 3 body a odpovedá krátkou správou: hotové · odchýlky · otázky.
- Pred prácou na kóde skontrolovať kódera cez GitHub (SamueEel90/DEED, vetva platby-modul) a výsledok zapísať ako KONTROLU do kod/OPRAVY-platby-modul.md.
- Test hlúposti: Martin dal kalendár skúsiť 12-ročnej dcére. Čo ju mýlilo, sa prerába.
- Pred väčšou prácou krátko navrhnúť 3 – 5 bodov a po „ok“ robiť. Martin chce mať všetko urobené naraz správne, nie desaťkrát.

## 2 · Rozhodnutia o vzhľade a tokoch

### Modul Hlavná zbierka (prototypy/Sprava hlavnej zbierky farnosti.dc.html)
- Hore je obyčajný textový riadok na názov s predvyplneným „Hlavná zbierka …“, ktorý si farár doplní alebo celý zmení. Riadok nie je zelený ani zväčšený a nemá text pre darcov.
- Pod tlačidlom ‹ Späť je nadpis „Hlavná zbierka“ ako orientácia pre farára, nie vo vnútri okna.
- „Podporiť farnosť“ je preč a namiesto neho je názov zbierky.
- Texty „stále“, „mesačne“ a modré prvky sú preč.
- Polia (napr. kúrenie, svetlo) sú prázdne. Čo farár doplní, ide do náhľadu, inak to ostane prázdne. Žiadne mŕtve okná.
- Galéria je GaleriaEditor: fotku pretiahnuť alebo „Pridať“ z vlastného počítača, nie z ukážkových fotiek.
- Náhľad ukazuje, ako modul skutočne uvidia ľudia na profile farnosti, nie charitu.
- Kým zbierka nebeží, štatistiky sú prázdne: dary v eurách, dary v EURC, pravidelná podpora, cez mikro tlačidlá (rýchle sumy), cez vlastnú sumu.
- Split a Reťaz dobra sú v štatistikách hlavnej zbierky preč.
- Ukončenie je OK. Horné tlačidlo je premenované na „Späť“ a musí fungovať.
- Spustenie: karta „Spustiť hlavnú zbierku“ s kontrolou Názov · Text · Titulná fotka. Čo chýba, je červené „chýba · doplniť ›“ a ťuk farára prenesie na to pole. Kým niečo chýba, tlačidlo nie je.
- Potom „Podržte a spustite“ (1,5 s). Na tom istom mieste sa ukáže zelená karta „Hlavná zbierka beží“, Ďalší krok (QR plagát), Stiahnuť QR plagát a „Hotovo · späť do Správy“.
- Tlačidlá dávajú odozvu na sebe („Skopírované ✓“).
- Zmazať (podržaním) naozaj zmaže a vráti do Správy s hláškou „Hlavná zbierka je zmazaná. Novú pridáte ťuknutím nižšie.“ a tlačidlom Rozumiem.
- V Správe je karta „HLAVNÁ ZBIERKA · BEŽÍ“ a Ďalší krok.
- Ukladá sa (deed-hlavna-zbierka).
- Celé toto je jeden blok s názvom „modul Hlavná zbierka“ (= centrálna). Martin ho schválil na PC a potom chcel aj mobil a tablet.
- Po zapečatení môže farár na zbierke urobiť len dve veci: zmeniť mikro dary (ak sa na začiatku prepísal) a ukončiť zbierku.
- QR farnosti, ktorý farnosť dostala po registrácii, je hlavný a vedie na hlavnú zbierku. Keď ho fara nalepí na kostol, človek sa dostane na hlavnú zbierku. Vidno ho v profile alebo v Nástrojoch (OPRAVY 162).

### Správa farnosti · prvý príchod (prototypy/Sprava farnosti - prvy prichod.dc.html)
- Kostra je ako v charite: ľavé menu, Verejný profil, Nastavenia a sekcie Prehľad, Zbierky, Omše a kalendár, Oznamy, Ľudia, Peňaženka, Nástroje, Upraviť profil.
- Vľavo je meno farnosti a „Farnosť“, bez fotky, bez prepínača viacerých farností a bez boxu o programe.
- Hore je ‹ Späť, názov sekcie a dátum.
- K nadpisu sekcie patrí aj „Správa farnosti“ (kóder ho nenašiel, doplniť vedľa Prehľadu).
- Upraviť profil je hore pri profile, z ľavého menu je vymazaný.
- Prehľad: Čísla (Dnes / 7 dní / 30 dní / Rok, rámčeky Vyzbierané · hlavná, Na najbližšiu omšu, Posledná omšová, Sledujúci, všetko na 0), lišta Pripnuté (Treba vybaviť s počtom, Upraviť pripnuté, najviac 6) a Treba vybaviť (Dokončiť profil, Pridať hlavnú zbierku).
- Graf darov z charity sa zatiaľ nedal, lebo bez darov by bol prázdny.
- Tlačidlo hore sa mení podľa sekcie: „+ Pridať zbierku“ v Zbierkach, „+ Pridať oznam“ v Oznamoch. V Omšiach sa pridáva len ťukom na deň.
- Kým hlavná zbierka nebeží, „+ Pridať zbierku“ ukáže žltú kartu „Najprv treba spustiť hlavnú zbierku“ s tlačidlom Pridať hlavnú zbierku.
- „+ Pridať“ v Prehľade otvorí zoznam a každá položka niečo robí.
- Po „+ Pridať zbierku“ sú dve vetvy: zbierka farnosti, napojená na hlavnú zbierku, a zbierka pre veriacich (pohrebná, svadobná…), ktorá funguje rovnako ako pohrebná a je naviazaná na oznámenie na stránke (parte, svadobné oznámenie).
- V Ďalších zbierkach je zmenšenina fotky a stav: Aktívna (nie „beží“, lebo nevedel, kam beží) · Neaktívna (nejaký problém) · Zrušená.
- Po ťuknutí na zbierku sa otvorí ako pri hlavnej: štatistika hore a ukončenie.

### Modul Upraviť profil (prototypy/Upravit profil.dc.html)
- Je prevzatý z charity 1 : 1, prázdny a vkladá sa cez dc-import.
- Pri profile je lišta s percentami, ako ďaleko je profil hotový. Priebežne sa mení pri vypĺňaní.
- Nie každá farnosť má logo, preto je voľba „Nemám logo“. Potom sa vložia iniciály do kruhu alebo štvorca s 2 – 3 farebnými rámikmi na výber, v rovnakých farbách ako rám titulnej fotky.
- Voľba „mám logo / nemám logo“ má byť výrazne odlíšená, lebo inak zaniká.
- Na titulnej fotke je vymazané miesto pre štít.
- Názov sa dá zmeniť, lebo nie je isté, či sa farnosti budú ťahať z registra.
- Vzhľad stránky je Kronika / Nástenka / Moderné (Moderné namiesto Pirát).
- Náhľad profilu má byť skutočná stránka farnosti (Nástenka) len s tým, čo farár vyplnil. Prázdne časti sa nezobrazia a hore je „‹ Späť na úpravu“.
- Profil sa nesmie stratiť. Martin mal profil hotový a potom ho nemal, čo bola chyba.

### Modul ZbierkyZakladny (prototypy/Nova zbierka farnosti.dc.html)
- Zbierka farnosti nemá Krátkodobú/Dlhodobú, nemá Dokladovanie a nemá pravidelnú podporu.
- Má 5 krokov: Obsah · Fotky a video · Suma a účet · Platby · Kontrola.
- Pri kliknutí na zbierku nesmie byť „Nina“ ani iné ukážkové dáta.
- Náhľad hore „Na stránke“ je neutrálny a ukazuje farnosť (meno a iniciály z profilu), nie charitu.
- Transparentný účet je vymazaný. Peniaze idú na účet hlavnej zbierky.
- Po zapečatení sa dajú meniť len mikro dary a ukončenie (rovnako ako pri hlavnej).
- Martin to pomenoval „modul ZbierkyZakladny“.

### Modul Zbierka s overovateľom (pohrebná, svadobná, iná)
- Pohreb · Svadba · Iné, 5 krokov: Sken · Oznámenie · Rozdelenie · Kód · Hotovo.
- Krok 1: QR nie je statický. Spustí sa generátor QR s platnosťou 15 s (odpočet „ešte N s“, pás sa zmenšuje, potom nový QR). Človek ho naskenuje v appke DEED na mobile, tablete alebo PC.
- Krok 2: parte už môže byť na stránke farnosti, keď farár povolí veriacim pridávať oznamy. Farár môže mať viac parte naraz, preto sa zbierka nepriradí automaticky, ale výberom („Pripojiť zbierku k tomuto parte ›“).
- Krok 2 má tri cesty: Parte už je na stránke · Nahrať vlastné · Vytvoriť zo šablóny.
- Krok 3 Rozdelenie: podiel overovateľa 0 – 3 % (max 100 €). Zvyšok rozhoduje príjemca: Nechať si celý alebo Podeliť sa.
- Podeliť sa znamená výber zo zoznamu registrovaných v DEED (osoba alebo organizácia), najviac 2. Príjemca sa môže vzdať všetkého. Žiadne upozornenia navyše, len vybrať zo zoznamu a je to vybavené.
- Krok 4 je potvrdenie príjemcu a „Podržte a zapečaťte“. Krok 5 je AKTÍVNA, uloží sa do Ďalších zbierok a ukáže sa zelená hláška.
- Martin pomenoval celé toto „zbierka s overovateľom“. Overovateľov bude viac, princíp je rovnaký.
- Martin bol so splitom spokojný a dal zbierku uložiť.

### Súkromné zbierky (prototypy/Sukromne zbierky.dc.html, OPRAVY 164)
- Info patrí do profilu používateľa, nie do profilu farnosti.
- Overovateľov bude viac: fara, matrika, obecný úrad, reštaurácie, hotely, eventové firmy a ďalší, ktorých overíme.
- Treba zdôrazniť dary namiesto kvetov a vencov, pri oslavách namiesto nechcených darov, bez nosenia hotovosti. Platba ide hneď na účet príjemcu.
- Je tam možnosť vzdať sa zbierky alebo sa podeliť s inou osobou alebo organizáciou. Podmienkou je registrácia v aplikácii.
- Rozdelené logicky: s pohrebmi len tí, čo sú spojení s pohrebmi, s oslavami tí, čo s oslavami. Len fara môže všetko (oslavu, svadbu aj úmrtie).
- Bod 6: zbierka s oznamom je viditeľná na stránke overovateľa a pri úmrtí sa dá preposlať aj na stránku farnosti, ak je farnosť v systéme.

### Šablóny oznámení (prototypy/Sablony oznameni.dc.html)
- Aspoň 8 parte, 8 svadobných a jubilejné. Tlačidlá: Šablóny parte · Svadobné · Jubilejné.
- K šablónam sa dostane aj veriaci, keď farár povolí pridávanie oznamov. Šablóny sú roztriedené podľa účelu.
- Sú s fotkou aj bez, pre muža aj ženu, plus samostatný plagát, ktorý si človek vyrobil. Prispôsobujú sa štýlu verejného profilu.
- Polia: meno a priezvisko zosnulého, dátum narodenia a úmrtia (2 polia, vek sa vypočíta), rodená, kým bol/a, rozlúčka kedy/kde, posledná veta, citát, oznamuje.
- Dátumy nesmú pustiť nezmysly: rok úmrtia 2050 ani narodenie po úmrtí. Rozsah 1900 – dnes, vek nad 120 je chyba.
- Text je z pohľadu pozostalého. „Kým bol“ nesmie dávať nelogické kombinácie (syn, dedo…), preto voľby a predvyplnené slogany a citáty.
- Martin chcel jednu celú šablónu s ozdobami (kučierkami), ktoré ľudia majú radi, nie len kruh. Moje návrhy vyzerali, „ako keby niekto zomrel“ fádne.
- Vznikla šablóna Ornament: krémový papier, ozdobná lišta hore a dole, kurzíva s pätkami a meno písaným písmom (Great Vibes). Šablóna Pás bola vyhodená.
- Tvorba parte cez Martinov softvér bude len u používateľa (veriaceho), nie u farára. Postup dodá Martin (OPRAVY 163).

### Omše a kalendár (karta 56F)
- Logika omší je Ranná · Večerná · Veľká.
- Pôvodné preklikávanie časov po 15 minútach (napr. z 18:00 na 6:00) je zlé. Rozmýšľať treba ako farár.
- Kým farnosť nemá filiálky, upravuje sa len vlastný kostol, bez otázky „farský?“.
- „00:00 a prepíše si“ je zlé. Rozvrh má 3 prepisovateľné časy pri každom type, bez pridávania a mazania.
- Keď je vo štvrtok omša o 6:00, rieši sa to týždenným vzorom: pri každom dni sa ťukom vyberú časy.
- Mätúce boli opakujúce sa čísla hore aj v strede a to, že pri dlhom zozname nevidno, čo sa deje dole. Preto: hore časy, vedľa nich „Ulož“, potom sa kliká a vidno výsledok.
- Dni, kde je zmena (napr. zrušená omša), sú jemne červené.
- Týždeň je vpravo na voľnom mieste.
- Prepínanie týždňov a mesiacov šípkami, „Späť na tento týždeň / mesiac“.
- Najbežnejšie liturgie v rozbaľovacej ponuke v jednom riadku (nie veľa tlačidiel): Bohoslužby, Modlitby, Obrady a Vaše vlastné, plus možnosť napísať vlastné a zapamätať si ho.
- Vlastnú položku omylom zapísanú do zlého dňa musí ísť zmazať červeným krížikom.
- Pri pohrebe, svadbe a krste je väčšie pole na meno, na celú šírku.
- Klikací čas sa nahrádza prepisovateľným. Mazanie je červený krížik, nie zaškrtávacie políčko.
- Čas sa opravuje sám: ľudia píšu čiarku alebo bodku, teda „15,00“, „15.00“, „1500“ aj „15“ sa zmení na 15:00.
- Nastavené omše sa samé ukazujú v Prehľade, nemusia sa pridávať ručne.
- Celý kalendár v Prehľade zaberal veľa miesta. Namiesto neho je týždenný prehľad na boku, ktorý sa dá zväčšiť.
- V Prehľade je len pripnutá lišta. Malý druhý kalendár pod Omšami je vymazaný, lebo to bol už štvrtý formát kalendára.
- Horné „+ Pridať“ v Omšiach je preč, lebo hádzalo vždy na dnešok. Pridáva sa ťukom na políčko dňa a vpravo sa ukáže, čo pridať.
- Tlačidlo pripnutia je bledomodré, aby farebne ladilo s prehľadom.
- „Čo uvidia ľudia na stránke“ si nastaví farár (zaškrtávanie). Predvolene sú vypnuté sobáše, krsty a úmysly.
- Export kalendára je pekný plagát A4 na nástenku kostola, aby farár nemusel nič prerábať do Excelu.
- Keď farár zruší alebo posunie omšu, systém sa opýta „Poslať oznam veriacim?“ priamo pod omšou (Áno, poslať / Nie, neposielať). Nič sa nepošle samo.
- Kalendár sa kóderovi posiela prázdny, bez omší.

### Oznamy
- Krátky oznam je krátka správa (len text). Udalosť je s fotkou a dňom z kalendára. Oznámenie je parte, svadba alebo jubileum.
- Zbierky a oznamy nemajú nič spoločné. V charite to bolo zle zapísané a musí sa to opraviť aj tam (OPRAVY 166). Výzva je výnimka.
- „Zmena omše“ v + Pridať vedie do kalendára. Udalosť je preč z miest, kde sa duplikovala.
- Plagát ohlášok vpravo v Oznamoch nedával zmysel („prečo ho tlačiť tu“), preto je tlač len v Omšiach.
- Plagát na nástenku má hore OZNAMY a pod nimi omše.
- Po pridaní fotky musí byť vidieť náhľad (náhľad je prilepený).
- Treba vidieť, ako bude oznam vyzerať v grafike verejného profilu. Preto je „Ako to vidia ľudia ›“ a „Pozrieť celú verejnú stránku ›“ (náhľad Nástenky).
- Svadobné oznámenie môže byť plagát. Vlastný plagát sa ukazuje celý, bez orezu, aj na výšku. Fotky sú 16 : 9.
- Oznámenie zo šablóny v Oznamoch má presne ten istý formulár parte ako v Zbierke s overovateľom, len iný vstup. Dátumy a vek sú len pri parte (OPRAVY 169).
- Fotka sa pri pretiahnutí na „+ Pridať“ pridávala 2×. Je opravené v GaleriaEditor (OPRAVY 168).

## 3 · Prototypy a súbory z tohto chatu
- prototypy/Sprava farnosti - prvy prichod.dc.html je hlavný pracovný súbor: Prehľad, Zbierky, Omše a kalendár, Oznamy, Upraviť profil, náhľad verejnej stránky.
- prototypy/Sprava hlavnej zbierky farnosti.dc.html je modul Hlavná zbierka (PC, tablet, mobil).
- prototypy/Upravit profil.dc.html je modul Upraviť profil (z charity, s percentami, „Nemám logo“ a iniciálami).
- prototypy/Nova zbierka farnosti.dc.html je modul ZbierkyZakladny.
- prototypy/Sablony oznameni.dc.html sú šablóny parte, svadby a jubilea vrátane Ornamentu.
- prototypy/Sukromne zbierky.dc.html je info o súkromných zbierkach v profile používateľa.
- prototypy/Galeria editor.dc.html je GaleriaEditor (oprava dropu 2×).
- prototypy/Sprava farnosti v2.dc.html je stará verzia, ponechaná bez zmien.
- kod/karty/56E-doplnky-po-56D.md, 56F-kalendar-farnosti.md a 56H-doplnky-po-56G.md (a 56G) sú karty pre kódera.
- kod/OPRAVY-platby-modul.md obsahuje body 162 – 169 a KONTROLY 23 – 25.
- Balíky pre kódera: pre-kodera-7-10-b, -c, -d, -e.
- PRE-NOVY-CHAT-sprava-farnosti.md je zadanie pre nový chat.
- ODOVZDANIE.md, sekcia 0, je aktualizovaná.
- CLAUDE.md obsahuje moduly (Hlavná zbierka, Zbierka s overovateľom, ZbierkyZakladny, Upraviť profil, Správa farnosti · prvý príchod) a pravidlo o technickom antitalente.
- github.md obsahuje poslednú synchronizáciu (kontroly 23 – 25).

## 4 · Rozrobené a nedokončené
- Oznamy: „Čo smie veriaci pridať sám“ (zoznam druhov s prepínačmi) a „Od veriacich“ (povoliť, poplatok Zadarmo/1/2/5 €, mazanie).
- Náhľad verejnej stránky podľa vybraného vzhľadu (Kronika / Nástenka / Moderné), zatiaľ je len Nástenka.
- Verejná stránka farnosti (56C): pásik Dnes · Zajtra, záložka Omše. Kalendár na nej zatiaľ nie je.
- Ľudia, Peňaženka a Nástroje sú zatiaľ NEHOTOVÉ.
- Mobil a tablet celej Správy farnosti ešte nie sú doladené (kóder má mobil len zoradený pod seba).
- „+ Pridať kostol“ (filiálky) zatiaľ ukazuje „pripravujeme“.
- Správa spustenej zbierky farnosti (verzia bez dokladov a dorovnania).
- Záložky stránky v náhľade ZbierkyZakladny sú ešte z charity.
- Úlohy v Treba vybaviť (Dokončiť profil, Pridať hlavnú zbierku) som pridala sama a čakajú na súhlas.
- Graf darov v Prehľade zatiaľ nie je.
- Kóder: karta 56H a opravy 168 a 169 čakajú na kontrolu (KONTROLA 26). V úprave dňa má byť × pri omšiach vľavo, nie vpravo.
- V Oznamoch u kódera ešte ostalo „Vytlačiť ohlášky“, treba zmazať.
- Tvorba parte cez Martinov softvér u veriaceho príde neskôr (postup dodá Martin).
- Opraviť v charite: oznam nesmie byť spojený so zbierkou, okrem výzvy (166).
- Zmena programu, Smútočné oznámenie a Dobrovoľníctvo v + Pridať zatiaľ vedú len do Oznamov alebo Omší.

## 5 · Zamietnuté nápady a prečo
- Kopírovať Správu charity ako text vo Worde a hneď mať hotovo: tak to nefunguje, preto pomenované hotové moduly.
- Vyplnené ukážkové dáta v Správe farnosti: zamietnuté, Martin potom mal pocit, že je to hotové.
- Zelený a zväčšený riadok názvu s textom pre darcov: zamietnutý, má to byť obyčajný riadok.
- „Podporiť farnosť“ v hlavnej zbierke: zamietnuté, nemá dôvod a nie každé náboženstvo má farnosť.
- Mŕtve okná s textom (kúrenie, svetlo): zamietnuté, je prázdne, kým farár nedoplní.
- Ukážkové fotky namiesto vlastného počítača pri „Pridať“: zamietnuté.
- Celá galéria zmazaná namiesto fotiek: zamietnuté, galéria musí ostať.
- Náhľad z charity namiesto farnosti: zamietnutý.
- Split a Reťaz dobra v štatistikách hlavnej zbierky: zamietnuté.
- „Farnosť Trenčín“ vymyslená z profilu: zamietnutá.
- Prázdne riadky v texte, keď text je prázdny: zamietnuté.
- Jednoduchá karta ako náhľad profilu: zamietnutá, má to byť skutočná stránka.
- Pirát ako vzhľad: nahradený Moderným.
- Skrytie funkcií pri mazaní: zamietnuté, mazali sa len vymyslené dáta.
- Pridať zbierku, ktorá posiela na web: zamietnuté.
- Spustenie bez informácie, čo sa stalo: zamietnuté, farár musí vedieť, čo ďalej.
- Zmena hore, keď je farár dole: zamietnutá, odozva má byť tam, kde je prst.
- QR namiesto tlačidla bez vysvetlenia: zamietnuté, tlačidlo podržať a jasný ďalší krok.
- Krátkodobá/Dlhodobá a Dokladovanie pri zbierke farnosti: zamietnuté.
- Pravidelná podpora pri ZbierkyZakladny: zamietnutá.
- Transparentný účet pri zbierke farnosti: zamietnutý, peniaze idú na účet hlavnej zbierky.
- „Zapečatí sa“ pri všetkých poliach: zamietnuté, po zapečatení sa dajú meniť len mikro dary a ukončenie.
- „Beží“ ako stav zbierky: zamietnuté, je Aktívna / Neaktívna / Zrušená.
- Svadobná zbierka s údajmi z pohrebnej: chyba, nová zbierka musí začať čistá.
- Statický QR v kroku 1: zamietnutý, je živý 15 s.
- Automatické priradenie parte k zbierke: zamietnuté, farár vyberá.
- Upozornenia navyše pri podelení sa: zamietnuté, len výber zo zoznamu.
- Súkromné zbierky v profile farnosti: zamietnuté, patria do profilu používateľa.
- Všetci overovatelia na všetky typy: zamietnuté, pohrebné k pohrebom, oslavy k oslavám, len fara všetko.
- Šablóny, ktoré vyzerajú, „ako keby niekto zomrel“ (fádne), a len kruh: zamietnuté, prišiel Ornament.
- „Kým bol“ s nelogickými kombináciami (syn, dedo): zamietnuté, sú predvyplnené voľby.
- Rozhádzané dátumy a nezmyselné roky: zamietnuté, sú 2 polia a kontrola.
- Tvorba parte cez Martinov softvér u farára: zamietnutá, bude len u veriaceho.
- Preklikávanie časov po 15 min a pridávanie či mazanie riadkov v rozvrhu: zamietnuté, sú 3 prepisovateľné časy.
- „Ranná / večerná / veľká“ v pôvodnej podobe kódera: nahradené novým rozvrhom.
- Veľa tlačidiel liturgií: zamietnuté, je jeden riadok s rozbaľovacou ponukou.
- Zaškrtávacie políčko na mazanie: zamietnuté, je červený krížik.
- Dvojbodka v čase povinne: zamietnutá, opravuje sa sama.
- Veľký kalendár v Prehľade a malý kalendár pod Omšami: zamietnuté, štvrtý formát. Ostáva len pripnutá lišta.
- „+ Pridať“ v Omšiach, ktoré hádzalo na dnešok: zamietnuté, pridáva sa ťukom na deň.
- Oznam o zmene omše poslaný automaticky: zamietnutý, systém sa najprv opýta.
- Zbierka v ozname: zamietnutá (aj v charite), okrem výzvy.
- Plagát ohlášok vpravo v Oznamoch: zamietnutý, tlač je len v Omšiach.
- Udalosť na dvoch miestach v + Pridať: zamietnutá, je na jednom mieste.
- Kratší formulár parte v Oznamoch: zamietnutý, je ten istý ako v zbierke.
