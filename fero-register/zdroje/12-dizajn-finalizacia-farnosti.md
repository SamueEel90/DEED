# Výpis dohôd · chat „Finalizácia farnosti“ (Soňa · 17. 10. – 20. 10. 2026)

*Poznámka k úplnosti: chat bol dlhý a jeho staršie časti sa priebežne vyrezávali. Výpis som poskladala z toho, čo z chatu ostalo, a zo zápisov v projekte (kod/OPRAVY-platby-modul.md body 339–399, ODOVZDANIE.md sekcia 0, PRAVIDLA-APPKY.md, KATALOG-BLOKOV.md, SONA-AKO-NAVRHOVAT.md, balíky v kod/baliky-male/). Čo bolo v chate povedané, ale nikam sa nezapísalo, tu chýbať môže.*

**POZOR · kolízia čísel:** čísla **396–399** sú v OPRAVY použité dvakrát. Moje body pre farnosť (Moderné, zoznam prihlásených, NOVÉ v Od veriacich, 297 na PC; balík 30) a v charitnom chate body 396–417 (charita). Pri posielaní kóderovi vždy uviesť aj názov bodu, nielen číslo.

---

## 1 · Pravidlá a zásady

- Kóderovi naraz najviac 1–3 body, nikdy veľký balík (opakovane, platí stále).
- Jednorazová výnimka z 18. 10.: veľký balík kod/balik-18-10-celok (341–350 vo 4 fázach), kóder robil ~4 h bez otázok a otázky zapisoval do OTAZKY.md (18. 10.).
- Druhý spojený balík kod/baliky-male/balik-celok-372-394, Martin ho poslal naraz (19. 10.).
- Kóder neposiela snímky, len krátku správu: hotové · odchýlky · otázky (stále).
- Čo Soňa vie rozhodnúť sama, rozhodne a len oznámi. Sporné veci ide s Martinom bod po bode a stručne (18. 10.).
- Vety v UI sú len faktické, hovoria čo je, nie čo nie je (18. 10., bod 350, PRAVIDLÁ).
- Prázdne stavy („Zatiaľ žiadne dary“) ostávajú, nie sú to vety o tom, čo nie je (18. 10.).
- Po každej akcii odozva na mieste prsta. „Uložené ✓“ až po potvrdení servera, pri chybe „Nepodarilo sa · Skúsiť znova“ na tom istom tlačidle (18. 10.).
- Nikdy mŕtve tlačidlo, kým chýba údaj, tlačidlo povie čo chýba, napr. „Najprv napíšte poďakovanie“ (18. 10.).
- Všetko uložené ide na server a vidí to každý, aj iný účet a neprihlásený (18. 10.).
- Platí aj pri každom bode: PC, tablet aj mobil a tmavý režim (18. 10.).
- Doména je deedgood.eu, adresy idú z jednej konštanty, nikdy vercel.app (18. 10.).
- deed.sk nebude, doména je obsadená (18. 10.).
- E-mailové adresy majú tvar meno@deedgood.eu (18. 10.).
- Každá nová vec v Správe musí mať miesto na verejnej stránke a riadok v MAPA-NASTENKY.md (stále, CLAUDE.md).
- Používateľ je technický antitalent, každý krok blbovzdorný (stále).
- V texte pre ľudí nikdy „farník“, vždy „veriaci“ (stále).
- Každá platba aj každé „Podržte …“ ide podržaním. Krátky ťuk ukáže „Podržte tlačidlo“ (19. 10., bod 386).
- Karty zbierok a skutkov sú bez tlačidiel, ťuk na celú kartu. V Moje stránky je celá karta jeden cieľ (19. 10., bod 394).
- Mazanie podržaním hneď zavrie detail, vráti na zoznam a na mieste ukáže „… je zmazaný“ (18. 10., bod 359).
- Bezpečnosť: zapisuje len správca stránky. Súkromné údaje (úmysly, mená detí, rozdelenie zbierky) číta len autor a správca (19. 10., body 372, 373, 383, 379, 384).
- Martin sa pri sprísnení databázy nesmie zamknúť. Najprv skutočný účet, Samo ho nastaví ako správcu, Martin overí „funguje“, až potom sa sprísni (19. 10., podmienka 372).
- Admin prihlásenie (ukážka bez účtu) ostáva len na prezeranie a na server nezapisuje (19. 10.).
- Katalóg blokov: čo je vo Viere dohodnuté a otestované, sa v ďalších moduloch nevymýšľa, kopíruje sa a mení len pre aktéra (19. 10., KATALOG-BLOKOV.md).
- Pri novom module sa najprv pozerá do KATALOG-BLOKOV.md (19. 10., zapísané v CLAUDE.md).
- Soňa navrhuje podľa SONA-AKO-NAVRHOVAT.md: najprv les, potom stromy. 2–3 odvážne návrhy aj s tým, čo zahodila. Bez moralizovania. Svoje územie (vzhľad, editory, obrazovky) navrhuje bez pýtania (19.–20. 10.).
- Martin chce oponenta, nie potvrdzovača. Soňa smie povedať „Martin, toto je kokotina, lebo … lepšie je …“. Trestajú sa prázdne reči, nie nesúhlas, a vyhráva lepší nápad (19. 10.).
- Vážnu bezpečnostnú dieru Soňa povie jednou vetou, je to ochrana ľudí, nie moralizovanie (19. 10., návrh Sone, Martin nenamietal).
- Ľudia v Správe Viery majú len dve úrovne, Farár a Pomocník. Popis pri človeku si farár napíše sám (19. 10., bod 393, PRAVIDLÁ).
- Sumy pri darcoch: rozhoduje farár, predvolené Zobraziť. Pod najnižšou rýchlou sumou sa ukáže len meno. Zvončeková a pohrebná zbierka sumy nikdy (19. 10., bod 389, PRAVIDLÁ).
- Zbierku ukončuje farár, appka mu len dá upozornenie a sama nič neukončí (18. 10.).

## 2 · Rozhodnutia o vzhľade a tokoch

### Správa farára · celok
- Celá Správa farára je navrhnutá pred kódovaním, Martin: „vyzerá výborne“ (18. 10.).
- Prehľad, Zbierky, Omše a kalendár a Kostoly a miesta ostávajú ako sú (18. 10.).
- Sekcie Od veriacich, Ľudia, Nástroje a štatistiky a Nastavenia sú dlaždice ako pri charite. Ťuk otvorí detail s ‹ Späť na {sekcia} (18. 10., bod 344).
- Darcovia sa presúvajú z Nástrojov do Ľudí (18. 10., 344).
- Na mobile sa „Nástroje a výkazy“ premenujú na „Nástroje a štatistiky“ (18. 10., 344).
- Karta profilu je zlatá. Hotový profil: logo, celý názov a „Upraviť profil ›“. Nedokončený: percentá, pás a Dokončiť profil (18. 10., 347).
- Verejný profil je tyrkysový (18. 10., 347).
- Nastavenia sú modré, rovnako vysoké ako Verejný profil, s podnadpisom „účet, predplatné, vzhľad“. Na mobile je modré koliesko (18. 10., 347).
- Martin chcel tri ladiace pozadia, aby sa Upraviť profil, Verejný profil a Nastavenia odlíšili od zvyšku menu (18. 10.).
- Treba vybaviť je červené, „nech bije do očí“, čip aj karta (18. 10., 347).
- Prvé kroky pri prvom príchode sú očíslované. Hotové majú zelené ✓ a ťuk vedie presne na miesto (18. 10., 348).
- Prvé kroky sú 4: profil · účet · hlavná zbierka · omše. Pri 4 z 4 karta zmizne (18. 10., 355).
- Zbierka končí: 3 dni pred koncom úloha s tlačidlami Predĺžiť o 14 dní a Ukončiť › (18. 10., 348).
- Na mobile sa lišta Pripnuté zruší, na PC ostáva (18. 10., 348).
- Testovací pás „TESTOVACIE · Pozrieť profil · Profil: Vyplnený · Prázdny“ v Správe farnosti preč (18. 10., 367).

### Oznamy
- Nastavenie upozornení je hore pod výberom druhu oznamu, zbalená zlatá karta s Nastaviť a Hotovo · zbaliť (18. 10., 341).
- Zmena omše posiela upozornenie vždy a nedá sa vypnúť (18. 10., 341).
- „Na stránke“ sa zoskupuje podľa blokov verejnej stránky v poradí z Usporiadať stránku, s názvom tak, ako ho farár premenoval, a s Premenovať › (18. 10., 341).
- Skrytý blok dostane zlatý pás „Tento blok je na stránke skrytý“ s Ukázať na stránke › (18. 10., 341).
- V Správe oznamov funguje Pozrieť / Zbaliť a pri nahlásenom príspevku „V poriadku · ponechať“ (18. 10., 339).
- Nahlásenie má nepovinné pole „Prečo“ (18. 10., odchýlka kódera k 339, prijatá).

### Oznámenia usera (zvonček)
- Ťuk na oznámenie ho označí ako prečítané a otvorí (18. 10., 342).
- Pri každom oznámení je ×, potom „Oznámenie je odstránené · Vrátiť“ na 5 s (18. 10., 342).
- „Označiť všetko ako prečítané“ a „Odstrániť prečítané · N“ (18. 10., 342).
- Stav sa ukladá k účtu, nie len do telefónu (18. 10., 342).

### Účet farnosti
- Farár sa o overení účtu dozvie vopred, pri prvom príchode, nie až pri zapečatení (18. 10., 340).
- Overený účet je v Nastaveniach → Účet farnosti. Zmeniť účet tam spustí overenie 0,01 €, Hlavná zbierka sem len odkazuje (18. 10., 343).
- V testovacej verzii sa zbierky spustia aj bez overenia (18. 10., odchýlka 340, prijatá).
- Keď je účet overený, karta z Prehľadu zmizne (18. 10.).
- Simulovaná platba (DEV) musí zapísať overenie na server (18. 10., 354).

### Štatistiky, Sledujúci, Ročný výpis
- Štatistiky farnosti sú kópia charity bez štítu, sektorov, dokladov a dorovnania (18. 10., 345).
- Obdobia Dnes · 7 dní · 30 dní · Rok (18. 10., 345).
- Rámce: Vyzbierané · Počet darov · Priemerný dar · Noví darcovia · Pravidelná podpora · Darcovia spolu · Sledujúci · Príspevky od veriacich (18. 10., 345).
- Pravidelná podpora sa volá rovnako ako v platobnom module, farár ju pozná ako user a premenovanie by ho zmiatlo (18. 10.).
- Pravidelná podpora ukazuje len počet ľudí, bez mien a súm (18. 10.).
- Sledujúci ukazujú len počty a nových za mesiac, nikdy mená, aby farár nikoho nenaháňal (18. 10., 346).
- Ročný výpis PDF s výberom roka (18. 10., 346).

### QR a tlač
- Tri druhy QR: QR farnosti je trvalý a otvorí stránku a Hlavnú · QR zvončeka je trvalý a otvorí aktuálnu omšu · QR zbierky platí na dobu zbierky, potom ukáže „Zbierka skončila · ďakujeme“ (18. 10., Martin s kóderom a Ferom).
- QR nástroje majú formáty Nálepky 5 × 5 (15 ks na A4) · 10 × 10 (2 ks na A4) · Plagát A4 · Plagát A5 (18. 10., 347).
- Farba QR: Čierny na bielom · Biely na tmavom (18. 10., 347).
- QR sa sťahuje ako PDF, vektor, bez PNG, aby ho farár v programe na úpravu obrázkov nepokazil (18. 10.).
- QR je v ráme DEED s logom, rám a QR sú jeden celok (18. 10.).
- Plagát A4/A5 je jeden plagát pre všetky QR. Ťuk otvorí okno s náhľadom, veľkosťou, textom do 140 znakov, fotkou áno/nie a Stiahnuť PDF (18. 10., 347).
- Plagát si podklad ťahá sám zo zbierky (názov, titulná fotka, text) a z profilu (18. 10.).
- Plagát bol doteraz len pri vecnej zbierke, teraz je pri každej (18. 10.).
- V Správe každej zbierky pribudla záložka QR s Tlačiť › a Plagát › (18. 10., 347, 358).
- Tlač QR na dvere kostola nie je povinná, preto nie je v Prvých krokoch (18. 10., 355).
- QR na zbierku, ktorá skončila alebo neexistuje, ukáže hlášku a stránku farnosti, nikdy feed bez hlášky (19. 10., 395).

### Zbierky
- Poďakovať darcom: komu, text, Poslať. Ide do Oznámení darcov (18. 10., 349).
- Ak server poďakovanie nevie, chyba je len na tlačidle, bez druhého červeného riadku (18. 10., 351).
- Darcovia sú mená bez súm, bez mena „Bohu známy veriaci“ (18. 10., 349).
- Pravidelná podpora sa musí ukladať na server (18. 10., 352).
- Pravidelné dary darcu sú v Profile, zrušiť sa dajú podržaním (18. 10., 352, kóder doplnil obrazovku).
- Poradie zbierok na stránke: Hlavná → Zvončeková → bežiace → ukončené (18. 10., 356).
- Vecná zbierka ukazuje „Darcovia · 0“ aj pri nule (18. 10., 357).
- Pri vecnej je jeden človek jeden riadok, so súčtom hodnôt a menom z posledného zápisu (18.–19. 10., 362).
- „Ukazovať hodnotu darov“ pri vecnej sa dá meniť aj po spustení, v Správe → Nastavenie (18. 10., 363).
- Potvrdenie príjemcu pri zbierke s overovateľom je bez kódu. Farár pošle, príjemcovi sa na obrazovke ukáže rozdelenie a podržaním potvrdí. Platí 5 minút (18. 10., 364).
- Zvonček príjemcu musí naozaj doručiť upozornenie (18. 10., 365).
- Zvončeková zbierka je bez míľnikov (19. 10., 388).

### Od veriacich
- Číslo ukazuje len to, čo čaká: Čaká na schválenie + Nahlásené + nové od poslednej návštevy (18. 10., 366).
- Nové príspevky majú štítok NOVÉ a kartu „Nové od vašej poslednej návštevy“ (19. 10., 398).
- Starý modul Viera „Veriaci môžu pridávať oznamy“ sa zmaže, nie skryje (19. 10., 381).

### Kalendár
- Do minulých dní sa nedá pridávať a minulé omše sú len na čítanie (19. 10., 368).
- Na verejnej stránke sa iné udalosti odlíšia: pohreb, sobáš a krst zlatý čip, udalosť zelený čip, omša obyčajný text (19. 10., 369).
- Pohreb pridaný omylom do minulosti (15. 10.) viedol k bodu 368 (19. 10.).

### Kronika, Nástenka, Moderné
- Oslavy a Spomíname sa vyrovnajú, 4 v rade, rovnaká výška a veľký ovál, Martin zvolil A (18. 10., 360).
- Bod 360 platí aj na Nástenke (19. 10., 371) aj v Moderné (19. 10., 396 farnosť).
- Videné oznamy, Od veriacich a Príď a zaži s nami sa na PC zbalia do jedného riadku, kóder najprv nájde príčinu (19. 10., 399 farnosť, 297).

### Brigády a udalosti
- Pri brigádach, udalostiach a oznamoch s prihlásením farár vidí menný zoznam prihlásených (19. 10., 397 farnosť).
- Na stránke sa mená ukazujú v tvare „Mária K.“, pri sebe „Vy ✓“ (19. 10., 397 farnosť).

### Registrácia a prihlásenie
- Registrácia: e-mail + heslo (jedno pole s okom, bez zopakovania) → 6 číslic z e-mailu → Overiť (19. 10., 378).
- Potvrdzovací odkaz v e-maile nie (19. 10., 378).
- Chyby sú vždy po slovensky, nikdy surová anglická hláška (19. 10., 377).
- Potvrdzovací e-mail ide po slovensky, z vlastného odosielateľa, Site URL je deedgood.eu (19. 10., doplnok 377, úloha pre Sama).
- Obrazovka Potvrď nové zariadenie je atrapa, kým nefunguje naozaj, neukazuje sa (18. 10., 361).
- Vymyslené „1248. člen“ preč (19. 10., v charitnom chate 409).

### Hosť (Fero)
- QR vedie rovno na cieľ každému, aj hosťovi. Registrácia až po dare (19. 10., 385).
- Aj prihlásenému sa /z/{id} otvorí priamo a adresa ostane, aby sa dala zdieľať (19. 10., doplnok 385).
- Hosť má v appke jednu vetu „Prezeráte ako hosť“ (19. 10., 390).
- Otvorené vrstvy sú dialógy a kliky pod nimi neprechádzajú (19. 10., 387).

### Ľudia v Správe
- Farár má všetko. Pomocník má celú Správu okrem Účtu, Predplatného, Ľudí a Zmazania stránky (19. 10., 393).
- Pomocník vidí Vzhľad stránky a Údaje farnosti (19. 10., odpoveď k 393).
- Bývalý „Správca stránky“ sa prevedie na Farára, nikomu sa práva potichu neberú (19. 10.).
- Práva pomocníka dáva server automaticky po pridaní v Ľuďoch, nie Samo ručne (19. 10., 380).
- Pozvánka do Správy: Prijať · Odmietnuť a stav pri človeku. Pri QR pozvánke farár hneď vidí, kto ju prijal, a môže ho odobrať (19. 10., 392 + doplnok).

## 3 · Prototypy a súbory, ktoré som vyrobila

- **prototypy/Sprava farara - navrh menu.dc.html:** celá Správa farára (PC + mobil). Prepínač PC · Mobil je vpravo dole, Tweaks: tema, stav Prvý príchod / Beží, profil Hotový / Nedokončený, Oznamy ukážka. Obsahuje Oznamy podľa blokov, dlaždice, Štatistiky, Sledujúcich, Ročný výpis, farebné vstupy, Treba vybaviť, Prvé kroky, QR nástroje, plagát A4/A5, záložku QR v zbierke a Poďakovať darcom (18. 10.).
- **prototypy/Oznamenia usera - precitane a odstranit.dc.html:** zvonček usera, prečítané a odstrániť (18. 10.).
- **KATALOG-BLOKOV.md:** asi 40 funkčných blokov z Viery v skupinách A–F, s prototypmi, kódom, stĺpcom „meniť pre aktéra“ a stavom (19. 10.).
- **SONA-AKO-NAVRHOVAT.md:** od Martina cez Fera, uložené do projektu, doplnok o oponentovi (19.–20. 10.).
- Balíky pre kódera v kod/baliky-male/: balik-19-menu (344–346), balik-20-qr (347), balik-21-prehlad (348–350), balik-22-vecer (351–363), balik-23-356-363 (356–365), balik-25-kontrola (372–379), balik-26 (380–384), balik-27-host (385–394), balik-28 (393), balik-29 (389, odpovede 392/393, 395), balik-30 (396–399 farnosť), balik-celok-372-394 (18.–19. 10.).
- **kod/balik-18-10-celok/** s PRE-KODERA.md a OTAZKY.md, 341–350 vo 4 fázach (18. 10.).
- Zápisy v ODOVZDANIE.md (sekcia 0 a 0a), PRAVIDLA-APPKY.md, MAPA-NASTENKY.md (QR a plagát) a CLAUDE.md (poradie čítania) (18.–19. 10.).

## 4 · Rozrobené a nedokončené

- Kóder: balík 372–395 (registrácia 377/378 → QR 385 → zamknutie DB 372/373/383 až po Martinovom „funguje“) (19. 10.).
- Kóder: balík 30, body 396–399 farnosť (Moderné, zoznam prihlásených, NOVÉ, 297 na PC) (19. 10.).
- Samo: Site URL a Redirect na deedgood.eu, vypnúť Confirm email na test, slovenský e-mail a odosielateľ, nové migrácie (0109, 0115, 0125 …), Martinov skutočný účet ako správca Farnosti Trenčín, SQL z Odkazy_pre_Samuela_26 (19. 10.).
- Samo bol 3 dni preč, Vercel na deedgood.eu čakal na neho (18.–19. 10.).
- Push upozornenia idú zatiaľ cez deed-help.vercel.app, na deedgood.eu ich prepne nová migrácia až po zmene domény (18. 10., 353).
- Názvy úložísk deed.skutky a deed.skore ostávajú, premenovanie by zmazalo dáta (18. 10.).
- Test Martin a manželka: pohrebná zbierka bez kódu (364), zvonček (365), dar hosťa 5 € (391) (19. 10.).
- Pri skenovaní QR manželkiným účtom ju hodilo na začiatok registrácie, pravdepodobne kvôli doméne. Rieši 385 (18. 10.).
- Overenie účtu farnosti viackrát neprešlo a hláška ostávala. Rieši 354 (18. 10.).
- Poďakovanie darcom hádzalo červenú chybu, lebo server funkciu nemal. Rieši 351 (18. 10.).
- Pravidelná podpora ukazovala „—“, server ju neukladal. Rieši 352, čaká na migráciu 0109 (18. 10.).
- Neprihlásený darca (len SEPA inkaso) sa do počtu pravidelnej podpory nezaráta, stačí tak (18. 10.).
- Appka na PC občas zamrzne, kóder hľadá príčinu (19. 10., 370).
- Mŕtve tlačidlá pre neprihláseného veriaceho (374), správa veriacemu pri úmysle nikam nejde (375), „pripravujeme“ v Peňaženke skryť (376) (19. 10.).
- Prijatie pozvánky do Správy cez appku zatiaľ nefunguje (19. 10., 392).
- Moje stránky ukazujú zo skutočných stránok zatiaľ len farnosti, ostatné typy bežia na testovacích dátach (19. 10.).
- Reakcie a nahlásenie pri odmietnutí serverom nemajú hlášku pri tlačidle (19. 10., 382).
- Ďalší chat: Charita „svojím spôsobom nanovo“, najprv les a 2–3 odvážne návrhy celku (19. 10.).
- Vyriešiť kolíziu čísel 396–399 medzi farnosťou a charitou (21. 10.).

## 5 · Zamietnuté nápady a prečo

- **Mená sledujúcich farárovi:** nie, farár nesmie nikoho naháňať („prečo ešte nie si registrovaný“) (18. 10.).
- **Premenovať „Pravidelnú podporu“ na „si nastavili mesačný dar“:** nie, farár pozná názov z platobného modulu a nevedel by, čo k čomu (18. 10.).
- **Vety typu „nikdy sa nemení, netreba nič tlačiť znova“:** zbytočné, len fakty (18. 10., 350).
- **Tlač QR ako povinný prvý krok:** nie, farár by si myslel, že je to povinné, a nemusí to robiť vôbec (18. 10., 355).
- **„QR na tlač · pripravujeme“ ako riadok:** nahradené QR nástrojmi (18. 10., 347).
- **Stiahnutie QR ako PNG:** nie, len PDF vektor, aby sa pri úprave obrázka nepokazil (18. 10.).
- **QR bez rámu a loga:** nie, QR v ráme DEED ako jeden celok (18. 10.).
- **Doména deed.sk:** je obsadená, platí deedgood.eu (18. 10.).
- **Kód (6 číslic) pri potvrdení príjemcu zbierky:** zbytočný, príjemca je prihlásený a kód v zvončeku nenájde. Stačí podržať na jeho obrazovke (18. 10., 364).
- **Kód poslaný SMS alebo e-mailom pri pečatení:** nie, potvrdenie sa ukáže priamo na obrazovke príjemcu (18. 10.).
- **Potvrdzovací odkaz v e-maile pri registrácii:** nie, otvára iný prehliadač, vyprší a vedie na zlú adresu. Namiesto neho 6 číslic (19. 10., 378).
- **Pole „Zopakovať heslo“:** nie, jedno pole s okom (19. 10., 378).
- **Rozlišovať kaplán / koordinátor / mníška / dobrovoľník podľa sekcií:** nie, každá farnosť je iná, stačí Farár a Pomocník (19. 10., 393).
- **Lišta Pripnuté na mobile:** zbytočná vedľa mriežky 3 × 3, preč (18. 10.).
- **Testovací pás v Správe farnosti:** Martin ho nepoužíva, preč (18. 10., 367).
- **Starý modul Viera „Veriaci môžu pridávať oznamy“ skryť:** nie skryť, zmazať (19. 10., 381).
- **Sumy pri darcoch natrvalo skryté (Sonin návrh „len mená“, voľba C):** zamietnuté. Martin: ľudia dávajú viac, keď to iní vidia (zvonček, papierová bankovka), a malý dar sa chráni minimálnym limitom (19. 10., 389).
- **Voľba darcu „Ukázať sumu · Bez sumy“ ako hlavné riešenie (Sonin návrh A):** nahradil ju Martinov limit, pod najnižšou rýchlou sumou len meno (19. 10.).
- **Overenie účtu „Zmeniť cez podporu“:** zmazané, jediná cesta je Zmeniť účet s 0,01 € (18. 10., 343).
- **Ponechať v Peňaženke „pripravujeme“ (placebo):** nie, kým funkcia nie je, riadky sú skryté (19. 10., 376).
