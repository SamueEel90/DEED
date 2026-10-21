# Výpis dohôd · chat Správa farnosti (7. – 8. 10. 2026)
Bez triedenia, či to ešte platí. Pri niektorých veciach je dátum len približný, lebo časti chatu sa už nedajú spätne prečítať. Tie som doplnila z pamäte projektu (CLAUDE.md, ODOVZDANIE, karty).

## 1 · Pravidlá a zásady
- Dizajnérka sa volá Soňa a hovorí o sebe v ženskom rode. Martin je CTO, tykáme si a píšeme stručne. Pred väčšou prácou sa najprv dohodneme (7. 10.).
- Správu farnosti musí vedieť ovládať starý aj mladý farár. Používateľ je technický antitalent, takže každý krok musí byť blbovzdorný (7. 10.).
- Po každej akcii musí prísť odozva tam, kde je prst, nie mimo obrazovky, napr. „Uložené ✓“ alebo „Skopírované ✓“ (7. 10.).
- „Späť“ je vždy presne o krok späť, nikdy nevyhodí do profilu farára ani na začiatok (8. 10.).
- Rozpísané sa nikdy nestratí, ani po uložení, ani po kroku späť (8. 10.).
- Každá platba je podržaním (Podrž a zaplať), nikdy na klik (pravidlo projektu).
- Mazanie, zapečatenie a zmena rýchlych súm sú tiež podržaním, aby sa vedelo, že to nebolo len skúšanie (8. 10.).
- Karty zbierok a skutkov nemajú tlačidlá, ťuká sa na celú kartu (pravidlo projektu).
- Všade sa používa ten istý textový editor (TextovePolia) a tá istá galéria (GaleriaEditor) s popisom fotky (pravidlo projektu).
- Farby sú vždy z kod/farby.css a písmo Plus Jakarta Sans (pravidlo projektu).
- Bez emoji, bez výkričníkov, slovenský formát čísel (pravidlo projektu).
- V animáciách len transform a opacity (pravidlo projektu).
- V texte pre ľudí nikdy „farník“, vždy „veriaci“ (Od veriacich, Prosby veriacich, Bohu známy veriaci), lebo „farník“ evokuje poddaného (8. 10.).
- Pri prvom príchode je modul prázdny: žiadne sumy, darcovia, QR ani štatistiky. Ukážkové čísla sú len v stave „beží“ cez prepínač Tweaks (7. 10.).
- Kóder nedostane naraz viac ako 1 – 3 body, nikdy veľký balík. Neposiela snímky, len krátku textovú správu: hotové · odchýlky · otázky (pravidlo projektu).
- Pred kreslením otvoriť obrazovku v kóde (DEED, vetva platby-modul) a prevziať skutočný vzhľad. Kreslí sa len rozdiel (13. 10.).
- Hotové moduly sa kopírujú 1 : 1 a menia sa len rozdiely sektora (7. 10.).
- Pri novom module sa najprv opýtať, či sme to už riešili. Ak áno a funguje, vložiť hotové a nevymýšľať (8. 10.).
- Každá nová vec v Správe musí mať svoje miesto na verejnej stránke (nástenke) a riadok v MAPA-NASTENKY.md. Bez toho nie je hotová (8. 10.).
- Pred prácou na Správe otvoriť aj verejnú stránku, nie pracovať len z pamäte (8. 10.).
- Hit targety na mobile najmenej 44 px (8. 10.).
- Starší a slabozrakí: šablónové oznamy (parte, jubileum) sa dajú na mobile zväčšiť na celú obrazovku (8. 10.).
- Ilustračné fotky z galérie sa označujú štítkom „ilustračné foto“ len pri skutkoch, žiadostiach a ponukách v Help, nie vo Viere. Dôvod: aby si nikto nemyslel, že mu na opatrovanie príde Brad Pitt (8. 10.).
- Pri parte a pohrebných veciach nikdy fotobanka (8. 10.).

## 2 · Rozhodnutia o vzhľade a tokoch

### Správa farnosti · celok
- Správa farnosti je pre PC, tablet aj mobil a zariadenie sa prepína v Tweaks (8. 10.).
- Štýl je rovnaký ako v Správe charity a pri userovi: karta, čísla, dlaždice, Verejný profil, Nastavenia, Nástroje a štatistiky, Pripnuté, Treba vybaviť (8. 10.).
- Peňaženka je v Nastaveniach, nie ako dlaždica, lebo ju farár využije minimálne (8. 10.).
- Uvoľnená dlaždica dostala najprv „Od veriacich“, neskôr sa Od veriacich presunulo do Ľudí (8. 10.).
- Ľudia obsahujú Správcov (pridáva farár) a Dobrovoľníkov, ktorí majú svoje miesto aj na verejnej stránke (8. 10.).
- Štatistiky sú v Nástrojoch a štatistikách, všetky pokope (8. 10.).
- Profil sa upravuje ťukom na logo hore. Dlaždica Profil zmizne a uvoľnené miesto dostanú Filiálky (8. 10.).
- Na mobile sú pri omšiach len týždeň, bez mesiaca a rozvrhu. Na tablete ostávajú omše, ako sú (8. 10.).
- Pole „Pridať kostol“ ostáva otvorené, vyrieši sa s Filiálkami (8. 10.).
- Rozdiel medzi záložkami a menu sme vysvetlili: menu je spodná lišta appky, záložky sú sekcie v rámci Správy (8. 10.).
- Upraviť profil na mobile bol rozbitý a je opravený (8. 10.).
- V Zbierkach je tlačidlo „+ Pridať zbierku“ aj hore nad hlavnou zbierkou, nielen dole (8. 10.).

### Oznamy (farár)
- Oznamy sú správa v skupinách: Krátky oznam, Udalosť, Oznámenie atď. Formulár sa otvorí až po „+ Pridať oznam“, nie hneď (8. 10.).
- Na PC je tlačidlo „Pridať“, na mobile a tablete zelené + dole a „Pridať oznam“ hore (8. 10.).
- Po výbere typu oznamu sa ponuka schová, hore je „‹ Zmeniť · PÍŠETE …“, náhľad je prilepený hore a formulár sa posúva pod ním (8. 10.).
- Náhľad zodpovedá typu, ktorý práve píšem. Krátky oznam má svoj náhľad, nie náhľad udalosti (8. 10.).
- „Pozvať ľudí“ je prevzaté 1 : 1 z charity (NovyOznam.tsx): Bez prihlásenia · Nezáväzne / Zúčastním sa · Záväzne / Prihlásiť sa, s nepovinným limitom „Koľko ľudí najviac“ (8. 10.).
- Rovnaké „Pozvať ľudí“ má aj Udalosť (8. 10.).
- Zverejnený oznam sa dá upraviť a Uložiť zmeny musí fungovať, aby sa nemusel písať znovu (8. 10.).
- Slabo viditeľné tlačidlo sa prefarbilo na zelené (8. 10.).
- Farár má v type oznamu aj „Iné“. Veriaci smie len to, čo mu farár povolí (8. 10.).
- Pri oznamoch aj od veriacich sa dá Označiť viac a zmazať naraz podržaním, lebo po troch mesiacoch je to po jednom zdĺhavé (8. 10.).
- Príhovor farára (Iskra) a Online omše sú v Oznamoch, dlhé video je hneď pod krátkym (8. 10.).
- Obe okná, Príhovor aj Online omše, sa dajú zbaliť na jeden riadok so zhrnutím (8. 10.).
- Videá majú byť predvolene zbalené, aj po obnovení stránky (8. 10.).

### Príhovor farára (Iskra) a Online omše
- Farár má Iskru len vo svojej sekcii: krátky príhovor alebo prianie do 45 s, na stránke hore v krúžku (8. 10.).
- „Nahrať“ evokovalo nahrávanie videa, preto sú dve tlačidlá: Natočiť teraz · Vybrať z telefónu, s náhľadom a prehrávačom na celú obrazovku (8. 10.).
- Online omše sa zapínajú prepínačom a majú odkaz (YouTube, Facebook) (8. 10.).
- Omše na vysielanie sa berú z rozpisu omší na tento týždeň (dni a časy), nie z pevných tlačidiel (8. 10.).
- Pri vybranej omši sa volí „Každý týždeň“ alebo „Len tento deň“ a × ju zruší. Čas sa mení v Omšiach (8. 10.).
- Na stránke sa pri dni v Svätých omšiach ukáže červené „▶ aj online 9:00“ (8. 10.).
- Počas vysielania je hore červené NAŽIVO a sledujúcim príde upozornenie 10 minút vopred (8. 10.).

### Úmysly na omšu
- Úmysly sú hore, lebo sú povinnosť a nesmú sa strácať dole (8. 10.).
- Ťuk na úmysel ho rozbalí. Nový úmysel: Zapísať na omšu alebo Iná omša, potom je ZAPÍSANÝ ✓ a veriacemu príde potvrdenie bez telefonovania (8. 10.).
- Namiesto troch okien je jedno okno s týždenným kalendárom farára, ktorý sa dá rolovať a prepínať týždne (8. 10.).
- Kalendár berie omše, ktoré má farár nastavené v rozpise (8. 10.).
- Veriaci si môže objednať omšu aj na ďalší týždeň (8. 10.).
- „Odslúžené“ úmysel ukončí a zmizne zo zoznamu (8. 10.).
- „+ Zapísať úmysel“ slúži, keď veriaci prišiel osobne alebo telefonoval (8. 10.).
- Úmysly na verejnú stránku nejdú, idú len farárovi (8. 10.).
- Neskôr: pod objednávkou omše môže byť platobný modul s príspevkom farárovi. Keď je na deň viac žiadostí, appka upozorní: „informujte sa u vášho farára“. Nie je to nutné (8. 10.).
- Do kalendára farára sa od veriaceho nič priamo nezapisuje, farár potvrdzuje sám (8. 10.).

### Od veriacich (veriaci pridáva cez zelené +)
- Na verejnej stránke je zelené tlačidlo +, cez ktoré sa veriaci dostane k tomu, čo mu farár povolí (8. 10.).
- Nastavenia povolení pre veriacich sú zbalené a nezavadzajú, hore sú oznamy podľa kategórií (8. 10.).
- Veriaci môže pridať udalosť s rovnakými voľbami účasti ako farár (8. 10.).
- Fotky z akcie majú editor (GaleriaEditor). Akcie komunity sú v jednej galérii na stránke (Kronika), nie pri pohreboch (8. 10.).
- Členenie Radosť / Smutok je preč a ostáva menu (8. 10.).
- Pri fotkách z akcie a pri udalosti je pred zverejnením náhľad, aj ukážka minulej akcie s pozvaním na novú (8. 10.).
- Prosba o modlitbu: veriaci len píše. Pri prosbe je jeden spoločný symbol modliaceho sa a namiesto like tlačidlo „Modlím sa s tebou“ (8. 10.).
- Prosba s menom alebo bez musí byť na stránke viditeľne odlišná a dá sa zmeniť aj po zverejnení (8. 10.).
- Uložiť zmenu pri prosbe musí fungovať (8. 10.).
- Zverejnená prosba má mať štábnu kultúru, teda slušnú úpravu (8. 10.).
- „Upraviť moje“ vidí iba autor (8. 10.).
- Pod parte je tlačidlo „Úprimnú sústrasť“. Rodine príde raz za deň súhrn, kto im prial, aby im nepípal telefón. Na stránke vidno, koľko ich prialo (8. 10.).
- Nahlásiť nevhodné môže byť, ale decentne schované (8. 10.).
- Veci s časom môžu po čase zmiznúť (8. 10.).
- Filter oznamov na stránke môže byť (8. 10.).
- Poriadok na stránke sa doladí, keď uvidíme, ako sa čo zobrazuje (8. 10.).
- Farár si tieto voľby aj tak môže vypnúť (8. 10.).
- Kde farár vidí, čo pridal veriaci: v Správe oznamov v skupinách, nie ako hneď zobrazený nový formulár (8. 10.).

### Pohrebná zbierka (modul Zbierka s overovateľom)
- Typy: Pohreb · Svadba · Iné. 5 krokov: Sken · Oznámenie · Rozdelenie · Kód · Hotovo (7. 10.).
- Krok 1 Sken: živý QR na 15 s, overovateľ overuje osobne. Ťuk na QR ho zväčší na celú obrazovku s bielym pozadím, odpočítavaním a × Zavrieť (8. 10.).
- Krok 2 Oznámenie: Parte už je na stránke (výber ťukom, nič samo) · Nahrať vlastné · Vytvoriť zo šablóny (7. 10.).
- U farára je to rýchlo: Muž/Žena → vzhľad (8 našich šablón s vlastnými pevnými textami) → údaje. Farár nič textové nevyberá (7. 10.).
- Texty šablón sa ťahajú z nášho nastavenia (úvod, Kým bol, citát, záver), každá šablóna má vlastné (7. 10.).
- Fotky v šablónach sa nahradili symbolmi (7. 10.).
- Parte dizajn systém (uploads/parte.html, 8 návrhov) je v module, ale u farára je skrytý. Ostáva pre veriaceho, ktorý si parte robí sám (7. 10.).
- Editor oznámení (v4) sa na mobile a tablete otvára na celú obrazovku. ‹ Späť je krok späť v editore a koncept sa nestratí (8. 10.).
- Pri tvorbe parte je ovládanie pod šablónou: šablóna ostáva hore, ovládanie sa posúva pod ňou a horná ponuka sa po výbere Muž/Žena schová (8. 10.).
- Hore v editore je stále „QR kód zbierky na parte: Áno · Nie“ a dá sa meniť kedykoľvek, aj späť (8. 10.).
- QR na parte je vľavo dole 4 × 4 cm. Keď sa nezmestí, pridá sa biely pás dole a parte sa zmenší, rovnako na A5 aj A4 (8. 10.).
- Obrázok QR je prototypy/qr-deed.png a musí mať správny formát (8. 10.).
- Pred zapečatením sa nedá tlačiť ani stiahnuť obrázok, pri tlačidle je veta „pôjde po zapečatení“ (8. 10.).
- Po „Hotovo · uložiť“ sa vráti na výber a nové parte je prvé a vybraté, nič sa nestratí (8. 10.).
- Nahrať vlastné parte otvorí modul QR na parte: S QR / Bez QR, pod parte alebo 4 rohy, náhľad celého hárku A5/A4, QR 3 × 3 cm (8. 10.).
- Pri vlastnom parte bez miesta na QR ponúkneme „Bez QR“ alebo „Vytvoriť nové zo šablóny“ (8. 10.).
- Krok 3 Rozdelenie: podiel overovateľa 0 – 3 %, najviac 100 €. Príjemca si nechá celé alebo sa podelí s najviac dvomi registrovanými v DEED (krok 5 %, min 5 %) (7. 10.).
- Krok 4 Kód: potvrdenie príjemcu, potom „Podržte a zapečaťte“ (7. 10.).
- Krok 5 Hotovo: „Zapečatené ✓ parte s QR sme poslali príjemcovi“ a „Vytlačiť tu na fare“ (8. 10.).
- Po zapečatení príde rodine vygenerované PNG/PDF na tlač (A5/A4, S QR / Bez QR) (8. 10.).
- Rodine príde jej zbierka do Správy (Moja zbierka): štatistika, darcovia, doplnenie termínu a miesta pohrebu čipmi, ukončenie podržaním (8. 10.).
- Keď rodina doplní čas a miesto, darcom príde upozornenie. Pozostalí nemusia nikomu písať ani volať (8. 10.).
- Rodina všetko vybaví sama, bez farára. Overovateľ len overil pravosť (8. 10.).
- Po zapečatení farár nevidí sumy ani darcov. V Ďalších zbierkach má fialovú kartu „ZBIERKA RODINY“ (#6E4E7A) a ťuk na ňu ukáže len vysvetlenie (8. 10.).
- Na stránke fary je čisté parte a pod ním platobný modul vo fialovom ráme „Zbierka rodiny · Peniaze idú: rodine“, bez bloku overovateľa (8. 10.).
- Mimo fary je navyše „Zbierku overil · Farnosť ›“ s odkazom na overovateľa (8. 10.).
- Na stránke sú mená darcov bez súm. Bar ukazuje naživo, koľko ľudí pomohlo, suma je rozmazaná (8. 10.).
- Darca vidí vyzbieranú sumu až po svojom dare (8. 10.).
- Verejne sa podiel overovateľa neukazuje, percentá sú len vtedy, keď sa rodina podelila, napr. s hospicom alebo charitou (8. 10.).
- Overovateľov bude viac (fara, pohrebníctvo, iní), princíp je rovnaký (7. 10.).
- „Prispieť rodine“ prečnievalo a je opravené (8. 10.).

### Šablónové oznámenia (svadba, jubileum, iné)
- Pri svadobnom oznámení, jubileu a ďalších sa QR na zbierku nedáva, len pri parte (8. 10.).
- Pri všetkých šablónach platí: uložiť pred tlačou a po uložení sa nič nestratí, rovnako ako pri parte (8. 10.).
- Po uložení oznámenia nemá byť dvojité posúvanie ani úzky pás, náhľad je hore a posun len jeden (8. 10.).
- Na stránke sa oznámenie ukazuje ako grafika šablóny, nie ako riadky textu (8. 10.).
- Pri svadbe má byť v parte formulári „OZNAMUJE“, kóder má „POZÝVAJÚ“, ostáva to otvorené (8. 10.).
- Pred odoslaním je na mobile náhľad na celú obrazovku s × Zavrieť (8. 10.).
- Parte a oznam sa dá vytlačiť na nástenku kostola (8. 10.).
- Kóderovi: zaznamenávať všetky vytvorenia (parte, svadby, jubileá), aká šablóna sa vybrala, či pohrebné s QR alebo bez a na akej podstránke (fara, pohrebníctvo, iný overovateľ), aby sme vedeli, čo obnovovať a pridávať (8. 10.).

### Hlavná zbierka (modul)
- Martin modul schválil na PC 7. 10.: ‹ Späť · nadpis · názov · Nastavenie · Štatistiky · Ukončenie (7. 10.).
- Spustenie má kontrolu Názov · Text · Titulná fotka. Kým niečo chýba, tlačidlo nie je, potom „Podržte a spustite“ (7. 10.).
- Po spustení je zelená karta „Hlavná zbierka beží“, Ďalší krok (QR plagát) a Hotovo (7. 10.).
- Fotka je povinná, ale farára treba upozorniť, že si môže vybrať fotku z galérie (8. 10.).
- Pri fotke z galérie na fare sa súhlas nepotvrdzuje a štítok „ilustračné“ nie je, to je len v Help (8. 10.).
- Zmena rýchlych súm pri bežiacej zbierke sa potvrdzuje podržaním, a to pri všetkých zbierkach, aj v centrálnych a sektorových (8. 10.).
- Ukončené a zrušené zbierky idú do Archívu ako jeden zbalený riadok s dátumom a časom ukončenia a dajú sa rozbaliť ako dôkaz (8. 10.).

### Zvončeková zbierka
- Je pre babky, ktoré nechodia do kostola ani s mincami, ani s kartou (8. 10.).
- Ku každej omši v kalendári sa sama vytvorí samostatná zbierka. Ide na ten istý účet ako hlavná (8. 10.).
- Zbierka sa prepína na ďalšiu omšu v polovici času medzi omšami, najskôr hodinu po začiatku omše. V nedeľu je interval kratší (8. 10.).
- Je napojená na kalendár, nie na nástenku (8. 10.).
- Na stránke sú darcovia, ale bez súm jednotlivých darcov (8. 10.).
- Jednotliví darcovia sa do hlavnej zbierky nepripisujú. V darcoch hlavnej pribudne jeden riadok za omšu, napr. „Ranná omša 7:00 · 120 €“ (8. 10.).
- Text poďakovania v tom riadku si nastaví farár, napr. „Bohu vďaka“ (8. 10.).
- Po každej omši sa darcovia predchádzajúcej vymažú (8. 10.).
- Keď je 0 €, do hlavnej sa nič nepridá (8. 10.).
- Peniaze na účte nedržíme, idú svojou cestou. Zobrazenie na hlavnej je len zobrazenie (8. 10.).
- Podmienkou je spustená hlavná zbierka a vyplnený kalendár, farárovi sa to pripomína (8. 10.).
- Stačí názov. Štatistiky sú v Nástrojoch, pokope s ostatnými (8. 10.).
- Je tam prepínač Zapnúť/Vypnúť, aby na začiatku nevisela na stránke so sumou 1,20 € (8. 10.).
- Text do ohlášok je zamietnutý, osvetu nechávame na farárovi (8. 10.).
- Na nástenke je karta „ZVONČEKOVÁ ZBIERKA ›“ (predtým „Na najbližšiu omšu“) s jednou omšou, nie tromi časmi (8. 10.).
- Po omši ostane na stránke tá istá omša, už minulá, kým sa neprepne na ďalšiu (8. 10.).
- Ťuk na zbierku ukáže počet darcov, sumu a mená. Sumy jednotlivých darcov sa neukazujú, aby sa nikto nehanbil za 30 či 50 centov (8. 10.).
- Pravidlo, že dary pod 2 € sa nezobrazujú, už máme. Aj tak sa sumy darcov neukazujú vôbec (8. 10.).

### Galéria ilustračných fotiek (fotobanka)
- Zdroj je Pexels/Pixabay cez API. Fotka sa stiahne do nášho Storage, bez hotlinku, so zdrojom a licenciou (8. 10.).
- Fotobanka bude v celej appke: zbierky, oznamy, akcie, profily stránok. Pri parte a pohreboch nikdy (8. 10.).
- Na bežných miestach je vedľa „Nahrať fotku“ tlačidlo „Vybrať z galérie“: hľadanie podľa témy, mriežka, ťuk = vybraté (8. 10.).
- Pri žiadosti a skutku v Help sa galéria pri vytváraní neponúka. Ponúkne sa až po uzavretom AI hodnotení, lebo fotka je dôkaz (8. 10.).
- Fotka z galérie má príznak ilustracna = true a server ju pri AI hodnotení ignoruje (8. 10.).
- Na výber je viac fotiek, nie jedna (8. 10.).
- Fotky z galérie sa dajú použiť aj pri zbierkach v Help (8. 10.).
- Pre kódera je to karta do ROADMAP, Fáza 4, nie súrne. Fáza 4 znamená neskoršiu etapu vývoja (8. 10.).

## 3 · Prototypy a súbory z tohto chatu
- prototypy/Sprava farnosti - prvy prichod.dc.html je logika celej Správy farnosti (7. – 8. 10.).
- prototypy/Sprava farnosti - PC tablet mobil.dc.html je obal s prepínačom zariadenia (8. 10.).
- prototypy/Farnik pridava.dc.html je „+ Pridať“ od veriacich: udalosť, fotky z akcie, prosba, sústrasť, nahlásiť, filter (8. 10.).
- prototypy/Editor oznameni.html je editor v4 z druhého chatu s našimi doplnkami (8. 10.).
- prototypy/QR na parte.dc.html slúži na vlastné parte s QR (8. 10.).
- prototypy/Pohrebna zbierka - kto co vidi.dc.html ukazuje rodinu, stránku fary a stránku mimo fary (8. 10.).
- prototypy/Sablony oznameni (modul) obsahuje 8 našich šablón s pevnými textami (7. 10.).
- prototypy/Zvoncekova zbierka.dc.html je modul zvončekovej zbierky (8. 10.).
- prototypy/zvoncek.js počíta okná omší pre zvonček (8. 10.).
- prototypy/Farnost v3 - nastenka.dc.html je verejná stránka, kde som upravila kartu zvončeka a slovo „veriacich“ (8. 10.).
- prototypy/Upravit profil.dc.html je modul profilu, prevzatý z charity 1 : 1 (7. 10.).
- prototypy/Sprava hlavnej zbierky farnosti.dc.html je modul Hlavná zbierka (7. 10.).
- prototypy/Nova zbierka farnosti.dc.html je modul ZbierkyZakladny (7. 10.).
- Galéria ilustračných fotiek je návrh tlačidla „Vybrať z galérie“ a mriežky (8. 10.).
- prototypy/qr-deed.png je obrázok QR pre parte (8. 10.).
- kod/karty/57-sprava-farnosti-8-10.md je karta pre kódera s doplnkami (8. 10.).
- kod/karty/58-zvoncekova-zbierka.md je karta zvončekovej zbierky (8. 10.).
- kod/OPRAVY-platby-modul.md obsahuje opravy 168 – 175 (8. 10.).
- pre-kodera-karta-57/ je balík pre kódera (8. 10.).
- MAPA-NASTENKY.md určuje, čo zo Správy ide kam na stránku (8. 10.).
- PRE-NOVY-CHAT-nastenka.md je zadanie na prepojenie Správy s nástenkou (8. 10.).
- PRE-NOVY-CHAT-tvorca.md je zadanie na Správu tvorcu (8. 10.).
- PRE-NOVY-CHAT-sprava-farnosti.md je staršie zadanie pre tento chat (7. 10.).
- ODOVZDANIE.md, sekcia 0, je aktualizovaná (8. 10.).
- CLAUDE.md má doplnené čítanie MAPA-NASTENKY a pravidlo, že pred Správou sa otvára aj stránka (8. 10.).

## 4 · Rozrobené a nedokončené
- Náhľad verejnej stránky v Správe nie je podľa nástenky, treba ho prestavať (zadanie PRE-NOVY-CHAT-nastenka.md) (8. 10.).
- Veci od farára a od veriacich treba napojiť na bloky nástenky podľa MAPA-NASTENKY.md (8. 10.).
- Na nástenku treba doplniť Úprimnú sústrasť, fialovú zbierku rodiny, filter, „▶ aj online“, Iskru v krúžku a riadok zvončeka v darcoch hlavnej (8. 10.).
- Karta 59 pre kódera (prepojenie s nástenkou) ešte nie je napísaná (8. 10.).
- Filiálky: dlaždica je, obsah nie (8. 10.).
- „Pridať kostol“ pri omšiach na tablete sa vyrieši s Filiálkami (8. 10.).
- Správa tvorcu sa urobí v novom chate. Martin pošle snímky verejnej stránky tvorcu (8. 10.).
- Po Správe tvorcu sa vrátime k charite, kde chýbajú veci (8. 10.).
- Videá v Oznamoch majú byť predvolene zbalené (8. 10.).
- Pri svadbe je v kóde „POZÝVAJÚ“ namiesto „OZNAMUJE“ (8. 10.).
- Staršie udalosti majú čas a miesto v jednom texte a na stránke vyzerajú menej úhľadne (správa kódera).
- Do obrázka parte sa nevloží písmo z Googlu, treba písma pribaliť do appky (správa kódera).
- Tlač a sťahovanie v náhľade v Claude nefungujú, v appke budú (správa kódera).
- Rozdiely sektora pri Upraviť profil ešte nie sú odsúhlasené (7. 10.).
- V ZbierkyZakladny sú otvorené záložky stránky a krok 3 Suma a účet (7. 10.).
- Objednávanie omše s platbou a upozornenie na viac žiadostí je nápad na neskôr (8. 10.).
- Tvorba parte cez Martinov softvér u veriaceho príde neskôr (7. 10.).
- Kóder má na kontrolu kartu 56H a kartu 57 (8. 10.).

## 5 · Zamietnuté nápady a prečo
- Moja prvá verzia šablón parte, kde boli rôzne len pozadia a rovnaký citát: zamietnutá, lebo všetky vyzerali rovnako. Predchádzajúce návrhy boli rozmanitejšie (7. 10.).
- Farár si vyberá texty: zamietnuté. U farára musí byť parte rýchlo, aby tam veriaci nešpekuloval, pekné si spraví sám (7. 10.).
- Parte dizajn systém (8 návrhov) u farára: zamietnutý, je skrytý a ostáva pre veriaceho (7. 10.).
- Fotky v šablónach: nahradené symbolmi (7. 10.).
- Rodina chodí kvôli doplneniu termínu za farárom: zamietnuté, lebo farár je nervózny a nikdy nie je na fare. Rodina všetko vybaví sama (8. 10.).
- Po uložení parte „odoslané a nič“: zamietnuté, má byť „uložiť, späť na zbierku a pripojiť z vytvorených“ (8. 10.).
- Tlač pred zapečatením: zamietnutá, tlač je až po zapečatení (8. 10.).
- „QR neskôr“: zamietnuté, po dokončení sa už nikto nepýtal, takže je to isté ako „nie“. Prepínač Áno/Nie je stále hore (8. 10.).
- Moja druhá otázka pri QR na parte: zrušená na Martinovu žiadosť (8. 10.).
- Pridávanie riadku s QR bez zmenšenia parte na A5: zamietnuté, lebo sa nedá vytlačiť. Parte sa musí zmenšiť (8. 10.).
- Percento overovateľa verejne: zamietnuté, percentá sú len pri delení s ďalším príjemcom (8. 10.).
- Peňaženka ako dlaždica farára: zamietnutá, ide do Nastavení (8. 10.).
- Mesiac a rozvrh omší na mobile: zamietnuté, len týždeň (8. 10.).
- Dlaždica Profil: zamietnutá, profil sa otvára cez logo (8. 10.).
- Radosť / Smutok v ponuke veriaceho: zamietnuté, ostáva menu (8. 10.).
- Tri okná pri úmysloch: zamietnuté, ostáva jedno okno s kalendárom (8. 10.).
- Pevné tlačidlá online omší („Nedeľa 9:00“): zamietnuté, nevedelo sa, ktorá nedeľa sa počíta. Teraz sa omše berú z rozpisu (8. 10.).
- „Ilustračné foto“ a súhlas pri fotke z galérie na fare: zamietnuté, platí len v Help (8. 10.).
- Fotobanka pri parte: zamietnutá, cudzia fotka sa k pohrebu nehodí (8. 10.).
- Zvonček s babkou chodiacou do kostola s mincami: nepochopila som to. Zvonček je pre tých, čo do kostola nechodia (8. 10.).
- Zvončeková zbierka ako plná kópia hlavnej: zamietnutá, stačí názov. Prvý pokus o „informačnú stránku“ bol tiež zle (8. 10.).
- Moje vysvetlenie poďakovania pri zvončeku: zamietnuté, poďakovanie si napíše farár sám (8. 10.).
- Text do ohlášok pre zvonček: zamietnutý, osvetu robí farár (8. 10.).
- Sumy jednotlivých darcov pri zvončeku: zamietnuté, nikto sa nemá hanbiť (8. 10.).
- Karta zvončeka na nástenke s tromi časmi a názvom „Na najbližšiu omšu“: zamietnutá, je tam jedna omša a názov Zvončeková zbierka (8. 10.).
- Slovo „farník“: zamietnuté, vždy „veriaci“ (8. 10.).
- Dvojité pridanie fotky pri „+ Pridať“ (oprava 168): kóder chybu nemal, bola len v prototype (8. 10.).
- Práca na Správe len z pamäte, bez otvorenia nástenky: uznaná ako moja chyba, preto vznikla MAPA-NASTENKY.md (8. 10.).
