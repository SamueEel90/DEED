# VÝPIS DOHÔD · chat „Animácia v apke 2" → platobný modul, profil bežného usera, odovzdanie (Soňa, cca 27. 9. – 12. 10. 2026)
Bez triedenia, či to ešte platí. Začiatok chatu (animácia, prvé podklady z predošlého chatu) mám už len zo súborov, nie z rozhovoru, preto pri ňom dátumy chýbajú. Zdroje: kod/OPRAVY-platby-modul.md (body 1–88, kontroly 1–17), kod/karty/00–32, PRAVIDLA-APPKY.md, PLATBY-CELOK.md, PLATBY-STAV.md.

---

## 1 · Pravidlá a zásady

### Spolupráca, postup práce
- Martin je partner, tykáme si, odpovede krátke: čo som spravila, čo napísať kóderovi, čo potrebujem (28.–30. 9.).
- Postup: prečítať kód na GitHube → náhľad v prototype → Martin potvrdí → pravidlo / karta / bod v OPRAVY → balík → jedna veta pre kódera (30. 9.).
- „Ok / sedí / može byť" = zapísať a pokračovať, nepýtať sa znova (30. 9.).
- Nevymýšľať veci, o ktoré nežiadal; vlastný nápad navrhnúť jednou vetou (28. 9.).
- Kóder dostáva celé zadanie: súbor + riadok, presné texty, rozmery, stavy, čo sa nesmie, prototyp, kontrola na konci (28. 9.).
- Kóderovi naraz najviac 1–3 body, nie veľký balík (CLAUDE.md).
- Kóder neposiela snímky, len krátku textovú správu (CLAUDE.md).
- Každá karta má na začiatku kontrolu úplnosti a na konci vetu, ktorou ju kóder potvrdí (28. 9., karta CELOK bod 0).
- Snímky dávať hneď do náhľadu, telefón zväčšený, aby bol celý na jednej obrazovke (28. 9.).
- Po každej úprave prototyp overiť; keď Martin „nevidí", pozrieť jeho náhľad a povedať presne kde (29. 9.).
- Hovoriť pravdu, čo je v prototype, čo len v karte a čo ešte nie je (30. 9.).
- Nové chaty zakladať v tom istom projekte (New chat nad chatom), nie nový projekt, aby videli súbory (30. 9.).
- Starý chat ostáva ako záloha (30. 9.).
- GitHub: repo martinstofiktn-web/DEED, vetva platby-modul; ak nový chat repo nevidí, pripojiť cez Codebase / appku Claude Design Import (30. 9.).

### Texty a vzhľad (celá appka)
- Po slovensky, tykanie, bez emoji, bez výkričníkov, bez anglických slov v UI, slovenský formát čísel (1 240 €) (od začiatku).
- Firma v dorovnaní a profil firmy: vykanie, „vaša firma" (29. 9.).
- Plus Jakarta Sans, farby len z kod/farby.css, animácie len transform/opacity, prefers-reduced-motion (od začiatku).
- Písmo bez ligatúr, inak „fi" stratí bodku nad i (29. 9.).
- Čiarové ikony všade, žiadne šípky v krúžku, rovnaké tlačidlo „‹ Späť" všade (28. 9.).
- Ikony v Nastaveniach jednou farbou podľa sekcie + jemná linka okolo riadkov, nie „cirkus" farieb (29. 9.).
- V texte nikdy „farník", vždy „veriaci" (CLAUDE.md).
- Platba vždy podržaním (Podrž a zaplať), nikdy na klik; karty zbierok a skutkov bez tlačidiel, ťuk na celú kartu (CLAUDE.md).

### Názvy a značka
- Samotné „DEED" v UI nie (29. 9.).
- DEEDGOOD = plný názov (právne texty, kde je miesto) (29. 9.).
- DEED+ = skratka appky a firmy; plus nakreslený, vrch plusu zarovnaný s vrchom D, variant 2b, komponent `<DeedZnacka />` (29. 9.).
- DeeD = token, mena za skutky (29. 9.).
- Pri registrácii vysvetliť „DEED+ je skrátený názov DEEDGOOD" (29. 9.).
- Modul Good neexistuje, bol to Domov; nemazať, premenovať na Domov (29. 9.).
- Platné moduly: Domov, Charita, Help, Aktivity, Viera (29. 9.).

### Karma a štíty
- Karma je súkromná, vidí ju len vlastník; verejný je len štít (29. 9.).
- Nikdy neporovnávať ľudí medzi sebou (29. 9.).
- Nepoužívať vetu „karma sa nedá kúpiť"; okrajovo vysvetliť, že rastie zo skutkov (28. 9.).
- Žiadne percentá ani L-úrovne (L7) pri karme (29. 9.).
- Hlavná karma je jedna nad všetkým; štíty oblastí sa do nej započítavajú (29. 9.).
- Pravidlá karmy rovnaké pre každého na planéte aj pre malú a veľkú firmu; malá firma môže predbehnúť veľkú (29. 9.).
- Zmena pravidiel len ak vzorce zlyhali (nedosiahnuteľné / príliš ľahké levely) a každý user dostane správu (29. 9.).
- Reklamovať výšku karmy nejde; vopred sa ospravedlňujeme, ak sa to niekomu zdá nespravodlivé (29. 9.).
- „Hľadali sme spravodlivosť. Či sa nám to podarilo, ukáže čas." (29. 9.).
- Štíty sú obrázky, medzinárodné, nemenia sa; názvy Bronzový · Strieborný · Zlatý · Platinový · Legenda (29. 9.).
- Hlavný štít Bronzový má každý od registrácie (29. 9.).
- Štít je vyznamenanie a lichotka pre usera, nie porovnanie s inými (29. 9.).
- Veta pod štítom sa strieda raz za deň (STIT_VETY), napr. pri dlhšie Zlatom „Ale tá Platina má iný lesk." (29. 9.).
- Štíty oblastí v osobnom profile: ART, HEALTH, LEARN, SPORT, EKO, HELP (30. 9.).
- CARE patrí do profilu charity, TEAM a PARTNER do profilu firmy B2B; z osobného profilu vymazať (30. 9.).
- Zamknutý štít oblasti = stlmený náhľad, nie prerušovaný obrys (29. 9.).
- Bronzový v oblasti sa odomkne skutkom alebo darom nad PRAH_BRONZ_OBLAST (20 €) s textom „stačí trocha snahy a Bronzový je tvoj" (29. 9.).
- Získané štíty sa vyvesujú, max 5, a zobrazujú sa pri každom verejnom profile, hlavný väčší, ťuk zväčší (29. 9.).
- Záujmy Komunita a Pomoc sa počítajú do štítu HELP (30. 9.).

### Profil, súkromie, ochrana
- Navrhnutý profil je profil bežného usera po registrácii; Moje stránky sa ukážu až s rolou (30. 9.).
- Ochrana osoby: skóre nikdy nepoužijeme proti tebe; potvrdenie o tebe vyzerá rovnako pre každého (nad priemerom / v norme komunity), aj do budúcnosti („o 10–20 rokov") (29. 9.).
- Verejný profil musí mať ten, kto vo feede vytvorí žiadosť alebo ponuku pomoci/služby; kto si ju vyberie alebo len pridá skutok / daruje, môže byť anonymný (29. 9.).
- V profile sa verejnosť nevysvetľuje ani nezamyká, kontroluje sa pri vytváraní príspevku (29. 9.).
- Meno je zamknuté podľa registrácie, zmena cez podporu (29. 9.).
- Ako sa ukážeš pri dare: celé meno / meno a iniciála / prezývka / anonymne + prepínač fotka pri dare (29. 9.).
- „Moje okolie" premenované na „Miesto, kde sa zdržiavam": ulica, číslo nepovinné, mesto/obec (29. 9.).
- Anonymný user môže mať priateľov, tí vidia len meno podľa jeho voľby (29. 9.).
- Karmu, peňaženku ani sumy darov priatelia nevidia nikdy (29. 9.).
- Dary po zrušení účtu ostávajú zapísané; ak user chce vymazať všetko, dary sa zmenia na anonymné (29. 9.).
- Údaje nepredávame iným firmám na komerčné účely; skutky priradené k firme len bez mena pre ESG/CSGR v zákonnej podobe (29. 9.).
- Zablokovanie neblokuje dary a platby (29. 9.).
- Prístupnosť: čítačka obrazovky, Podrž a zaplať dvojitým ťuknutím, nič len farbou alebo zvukom, zväčšené písmo z telefónu, titulky, kontrast 4,5 : 1, plochy 44 px (29. 9.).

### Firma a zamestnanec
- Odmena vyžaduje identitu, identita je voľba usera pri každom skutku; kto neukáže, nestráca nič (29. 9.).
- Firemné akcie, školenia (BOZP), smeny a odmeny sú vždy s menom (29. 9.).
- Voľba Neukázať / Anonymne / S menom len pre skutky mimo firmy (29. 9.).
- Firma nikdy nevidí voľby zamestnancov, len výsledky; rozpad podľa oblastí až od 5 zapojených (29. 9.).
- Denník „len pre mňa" firma nevidí nikdy (29. 9.).
- Pozvánka od šéfa vyzerá rovnako ako od kolegu (29. 9.).
- „Stále pracuješ v…?" raz ročne a po 3 mesiacoch bez firemnej akcie (29. 9.).
- Zamestnanec patrí len k jednej firme, môže sa odhlásiť a pripojiť k inej (29. 9.).
- Zamestnanec z dorovnania nemá nič; odmeny rieši firma, nie user (29. 9.).
- „Čo tým získaš: záleží na tvojej firme" + oznámenie, keď firma pridá benefit (29. 9.).
- Zamestnávateľ je v profile, nie v Nastaveniach; nikto zvonku ho nevidí (29. 9.).
- Pracovný QR (user + firma, 15 s) na firemné veci; osobný QR sa s firmou nikdy nespája (29. 9.).
- Osoba s IČO (konáš ako firma) vs. profil firmy: texty prispôsobiť firme (29. 9.).
- Odmeňovanie mimopracovných skutkov a daňový limit posúdi Dagmar (pracovné právo) (29. 9.).

### Platobný modul (podrobne v PLATBY-CELOK a PLATBY-STAV časť 17)
- Platobný modul je v appke len jeden (`ZbierkaModul`), nový sa nikdy nerobí; miesto sa nastaví (charita, deed, tvorca, sukromna, skutok, podporitDeed) (28. 9., 30. 9.).
- Skupiny: A DEED+ (Help, Aktivity), B eurá (Charita, Viera), C Podporiť DEED+ (28. 9.).
- Karta od 3 €, SEPA od 1 €, poplatky platí darca, vidí ich pred zaplatením (28. 9.).
- DeeD je krypto, dá sa aj 0,10 € (28. 9.).
- Rýchle sumy Podporiť DEED+: 1 / 3 / 5 € (SEPA) a 50 / 100 / 300 DeeD (28. 9.).
- Rýchle sumy pre zbierku v DeeD: 10 / 50 / 100 (PLATBY-STAV).
- Do 2 € sa suma v zozname darcov nezobrazí (28. 9.).
- Neregistrovaný musí vyplniť kartu (číslo, MM/RR, CVC) alebo SEPA (IBAN, meno), inak platba neodíde (28. 9.).
- Neregistrovaný v zhrnutí: „V zozname darcov sa zobrazíš ako · Anonymný darca" (28. 9.).
- Okienko „Čo získaš registráciou" strieda 1 z 20 výhod Martina + „Pozrieť všetkých 20 výhod" (28. 9.).
- Veta: „Darovať môžeš aj bez registrácie. Všetky výhody appky však využiješ až s ňou, bez nej to technicky nejde." (28. 9.).
- Po dare neregistrovaného „Tvoj dar čaká na meno" s karmou z daru, bez výčitiek (28. 9.).
- Pripísanie daru: hneď registráciou s ID daru alebo neskôr kódom DAR-XXXX-XXXX z dokladu, bez lehoty (28. 9.).
- Nepárovať dar podľa karty / IBAN (28. 9.).
- Pravidelnú podporu majú len charita a Viera (farnosti), tvorca nie (28. 9.).
- Pravidelná podpora: hore názov zbierky, z ktorej sa otvorila (12. 10.).
- Charity majú centrálnu zbierku samostatne na stránke; v module zbierky sa sektor / centrálna nevyberá (12. 10.).
- Dary v krypte patria pod vlastnú sumu, dajú sa rozbaliť a schovať (28. 9.).
- Mikrodar v krypte ide priamo zbierke, klik a dar letí so svetielkom, nie cez peňaženku (28. 9.).
- Dary v krypte: modrý rám, aby bolo vidno, že sú klikateľné; bez modrých rýchlych dlaždíc a bez štítku „Najčastejšie" (12. 10.).
- Vlastná suma a Podporiť DEED vedľa seba v rovnakom tlačidle, bez malého loga (12. 10.).
- Podporiť DEED vedľa Obľúbené zmazať (12. 10.).
- Zapojiť firmu do dorovnania len pre usera s IČO; bežný user ho nevidí (12. 10.).
- Pod modulom vždy „Zbaliť a späť", hneď pod Reťazou dobra (12. 10.).
- Reťaz dobra len pre registrovaného (12. 10.).
- Pri aktívnom dorovnaní firmy sa Reťaz dobra neukazuje (28. 9.).
- Dorovnanie firmy aj pri tvorcovi, ale len na časť, ktorá ide zbierke (28. 9.).
- Na strop zbierky sa nehráme: keď je cieľ 1 400 a príde 1 425, dar sa jednoducho pripíše (28. 9.).

### Detail zbierky
- Pod textom pole „Za zbierku zodpovedá" (logo, názov, štít, rozklik, odkaz na stránku) (28. 9.).
- Späť z charity vráti presne na to isté miesto zbierky, aj po prekliku na iné zbierky; zaplatené dary sa pri návrate preskočia (28. 9.).
- Na vlastnej stránke charity sa pole skryje, inde sa zobrazuje (28. 9.).
- Súkromná zbierka: „Zbierku overil" namiesto „Za zbierku zodpovedá" (28. 9.).
- Text zbierky 3 riadky + „… viac" (28. 9.).
- Darcov 10–15, ďalší na rozklik, všetci (28. 9.).
- Pri zbierke cez tvorcu len jeho darcovia (28. 9.).
- Logo / foto tvorcu sa ťahá z profilu, upraviť v nástrojoch inde (28. 9.).

### Zbierka cez tvorcu, rad zbierok, QR
- Tvorca musí na zbierku poslať aspoň 5 %, posuvník zaokrúhľuje po 5 %, môže dať aj 100 % (28. 9.).
- Zbierky sa nesčítavajú, idú v rade; ďalšia ožije až po naplnení / ukončení prvej (28. 9.).
- Zbierka v rade „je akoby nebola", platný QR dostane až keď ožije (28. 9.).
- Dary na ceste pri naplnení sa pripíšu pôvodnej zbierke (28. 9.).
- Zbierka bez cieľa beží do ukončenia charitou / userom alebo do termínu (28. 9.).
- Po naplnení všetkých zbierok QR prepne na tvorcu a darca vidí, že 100 % ide tvorcovi (28. 9.).
- Po zapečatení tvorca nemôže meniť nič, môže si urobiť novú (28. 9.).
- Všetky QR vzniknú pri zapečatení (28. 9.).
- Centrálny QR je len v systéme pre kontrolu a dôkazy, nikde sa nezobrazuje; v OBS a na stránke len aktuálny QR (28. 9.).
- Jednu zbierku môže splitnúť viac tvorcov, každý vidí svoje príspevky (28. 9.).
- Správa „si v poradí" s odkazom na prvú živú zbierku ako reklama pre obe strany (28. 9.).
- Tvorca pošle do systému odkaz, kde vysiela s naším QR (28. 9.).
- Odkaz na obsah (live / záznam) pridáva tvorca a môže ho meniť (28. 9.).
- Celková zbierka oddelená, menší jednoriadkový bar, „zdochnutá" zelená; percentá pri tvorcovej časti preč (28. 9.).
- Marek je hviezda YouTube, karta tvorcu musí vyzerať prémiovo (28. 9.).
- Štíty namiesto textu statusu, bez fajok, bez počtu sledovateľov (28. 9.).

### Overovateľ, súkromná zbierka
- Zbierky cez charitu overuje charita; cez Help AI a náš človek; súkromné (pohreb…) overovateľ (pohrebníctvo, farnosť) (28. 9.).
- Overená súkromná zbierka nejde do verejného feedu, ostáva na stránke overovateľa (28. 9.).
- Overovateľ si berie jednu odmenu: % zo zbierky, 0–3 %, max 100 € / zbierka, zvyšok ide zbierke; dohodne sa so žiadateľom (28. 9.).
- Tvorca s odmenou overovateľa nemá nič spoločné (28. 9.).
- Overovateľovu odmenu zatiaľ nezobrazovať ani sumu (28. 9.).
- Súkromná: parte / smútočné oznámenie, overovateľ nič neručí, rodina použije podľa uváženia (28. 9.).
- Súkromná: bez dorovnania firmy, bez tempa darov, rýchle dary v eurách ako v schválenom module (28. 9.).
- Štýl modulu sa drží stále rovnaký, len sa pripájajú alebo odpájajú položky (28. 9.).

### Tempo darov a míľniky
- Zbierka bez cieľa má míľniky namiesto stĺpcov (28. 9.).
- Tempo darov: počet darov za 5 min, stupne Priemerná · Silná · Veľmi silná · Extrémna · Top; diely zľava, potvrdené ostávajú, aktuálny pulzuje, ďalšie čakajú (28. 9.).
- Diely zúžené na polovicu (28. 9.).
- Tempo vždy pri tvorcovi, inde sa zobrazí samo od stupňa Silná a skryje po 15 min na Priemernej (28. 9.).
- Bonus za Extrémnu / Top a z čoho počítať priemer zatiaľ nenastavené (28. 9.).

### Skutky
- Skutky overuje na vstupe AI, potom len komunita cez Overujem / Namietam (29. 9.).
- AI pridelí karmu podľa podkladov; skutok dostane priestor vo feede štvrte, overenie komunitou posúva vyššie a zväčšuje okno vo feede (29. 9.).
- Neslubujeme celé mesto; zo začiatku pôjdu aj slabšie skutky, pri plnom feede sa do neho nemusíš dostať (29. 9.).
- Malý skutok bez dôkazu (taška susede) ide len do Môj denník; s dôkazmi (pitný režim, fotky) do feedu (29. 9.).
- Môj denník = osobný rozvoj, napr. „dnes som začal jazdiť na bicykli 5 km" (29. 9.).
- Namietka = niekto spochybňuje skutok ako podvod („v Komárne nehorelo") (29. 9.).
- „Doplniť foto" pýta AI pri schvaľovaní; user si skutok nemoderuje, vždy ide cez AI (29. 9.).
- Zamietnuté skutky ostávajú v zozname (29. 9.).
- Ukážkové inšpiratívne skutky pri prázdnom profile + tlačidlo v Nastaveniach, ktoré ich vymaže (29. 9.).
- Motivácia v prázdnom stave: veľké veci začínajú malými skutkami, nemusíš byť bohatý (29. 9.).
- Skutky po rokoch zbalené, rozdelené po kalendárnych rokoch; názov + foto, ťuk zväčší / zbalí (29. 9.).
- Text skutku: AI učeše, opraví chyby, upraví do štandardu appky; user najprv spokojný s textom, až potom foto, doklady, miesto (29. 9.).
- Pred zverejnením kompletný náhľad, zverejní sa až po potvrdení (29. 9.).
- AI sa pýta doplňujúce otázky (verdikt doplniť), zamietnutie bez návodu, čo opraviť (29. 9.).
- Textové pole musí prevziať text z Wordu so zachovaním formátu, všade rovnaký komponent (29. 9.).
- Fotky / video: vyhlásenie o povolení na zverejnenie; DEED+ môže nezverejniť fotky ohrozujúce dôstojnosť a nahradiť ich kreslenou verziou (29. 9.).
- Ak má povolenie od osôb a AI uzná za vhodné, môže sa zverejniť, aby hodnotné skutky boli virálne (29. 9.).
- Komunitný skutok: organizátor cez QR skenuje účastníkov, uzavrie skupinu, beží čas a GPS, ukončí akciu (29. 9.).
- Na pridanie účastníkov 30 min po začatí (meškajúci) (29. 9.).
- Odstrániť účastníka môže len organizátor (kto nič nerobil, nedostane bonus) (29. 9.).
- Bez appky sa nedá zúčastniť; karma rovnako pre všetkých účastníkov (29. 9.).
- Spontánna pomoc: najprv pomáhať, potom sa pridať (29. 9.).
- Organizátor musí mať zapnuté GPS, odporúčame foto a video so zapnutým GPS (29. 9.).
- Reťaz dobra platí pre sólo aj komunitný skutok; nastaviť sa dá len pri pridaní, výška delenia sa po zapečatení nemení (29. 9.).
- Reťaz pri skutku funguje ako zbierka tvorcu: autor sa môže vzdať odmeny alebo si časť nechať (29. 9.).
- Skutok ako dar: najprv sám / komunita, potom výber zbierok (lupa, číslo alebo názov), 100 % zbierke, výraznejšie miesto vo feede (29. 9.).
- Viac zbierok v rade, prvá je hlavná; nikto nevidí, že ich je viac; systém prehodí sám a upozorní (29. 9.).
- Ohlásený skutok: čo sa chystám urobiť a prečo; komunita môže namietať, peniaze nedržíme (29. 9.).
- Online prenosy až v module Challenge (2. fáza, nie MVP) (29. 9.).
- Vygenerovaný QR na zdieľanie skutku (29. 9.).
- Rovnaká cesta Pridať skutok je aj v Domove cez + na hlavnej obrazovke (29. 9.).

### Cesta daru
- Najdlhšia reťaz daru: mapa kam dar putoval, bez mien a súm (29. 9.).
- Mapa SK, Európa, svet (29. 9.).
- Bez časového limitu, reťaz môže rásť mesiace aj roky; je to len zaujímavosť, bez odmien (29. 9.).
- Cesta daru patrí do Štatistík (29. 9.).

### Jazyk a preklad
- Jazykové mutácie: svetové aj lokálne jazyky krajín, kde budeme; menšinové nie (29. 9.).
- Pri nastavení jazyka pevné tlačidlo English, ktoré sa neprekladá, + „Jazyk · Language" + lišta Späť na… (29. 9.).
- Zatiaľ len EN verzia profilu, ďalšie jazyky neskôr (29. 9.).
- Prekladá sa všetko vrátane akcií a textov od ľudí; neprekladajú sa mená ľudí, názvy firiem, značky a štíty; pri preklade „Zobraziť originál" (30. 9.).

### Testovanie
- DEV prepínače (rola Charita / Tvorca / B2B, tier ZADARMO–T4, držiteľ) sa nikdy nemažú ani neskrývajú bez dohody (30. 9.).
- Na nasadenej verzii zapnuté cez VITE_TEST=1 alebo ?dev (30. 9.).

---

## 2 · Rozhodnutia o vzhľade a tokoch

### Platobný modul (karty 00–17, PLATBY-CELOK)
- Karta 00 základné prvky (tlačidlá, polia, farby) ako prvá, aby kóder mal na čom testovať (28. 9.).
- Karta 01 kostra: jeden komponent, nastavenie podľa miesta, pevné poradie položiek (28. 9.).
- Karta 02 hlavička, galéria (posúvanie prstom, video prvé, celá obrazovka) a text (28. 9.).
- Karta 03 pole charity a cesta Späť (28. 9.).
- Karta 04 karta stavu, karta 05 tempo, karta 06 rýchle sumy / vlastná / krypto (28. 9.).
- Karty 07–17: platobné okno, neregistrovaný, po dare, darcovia, dorovnanie, pravidelná podpora, tvorca, reťaz a QR, tablet a PC, úvod (28. 9.).
- Tablet: obsah vycentrovaný, nie nalepený na spodok (28. 9.).
- PC: vľavo obsah, vpravo modul (28. 9.).
- Úvod s animáciou Svetlúšika: zjaví sa na Pomôžeš, skáče po obláčikoch na Daruješ a Zdieľaš, zatočí sa od radosti; Prehrať znova na 1. obrazovke (28. 9.).
- Úvod 3. obrazovka: pri Legende text zmizne, Legenda sa zväčší, „Staň sa legendou." + „Tvoja karma rastie len z tvojich skutkov." (28. 9.).
- Úvod: „Pomôžeš · Daruješ · Zdieľaš", „Zbierky overuje charita, overovatelia, komunita a náš tím. Peniaze idú priamo žiadateľovi…" (28. 9.).

### Profil (karta 18 a ďalšie)
- Hlavička: ☰, Môj profil, nastavenia; titulka, avatar so zlatým kruhom podľa štítu (29. 9.).
- „L7" a „★ Gold" zmazané (29. 9.).
- Fotky sa menia len v Upraviť profil, ťuk na avatar zväčší (29. 9.).
- Meno 12 px pod titulkou, nie nalepené (29. 9.).
- Karta štítu so žiarou, ťuk na štít zväčší (29. 9.).
- Dlaždice: Nastavenia hore, Peňaženka, Moje skutky, Moje záujmy, Štatistiky, Priatelia, Karma a úrovne; Štíty vedľa Štatistík (29. 9.).
- Moje roly zmazané (duplikát prepínača v charite) (29. 9.).
- Dlaždice sa dajú presúvať, skryť, rozbaliť na profile, Obnoviť pôvodné; presúvanie musí trafiť presne (29. 9.).
- Moje záujmy ako veľká karta / dlaždica, nie podradný riadok (29. 9.).
- 10 oblastí záujmov v páru: Komunita–Hudba, Šport–Zdravie, Príroda–Zvieratá, Umenie–Učenie, Pomoc–Viera (29. 9.).
- Záujmy profilujú stránky usera, rovnaký číselník ako pri registrácii (29. 9.).
- Rozpracovaný skutok, Prvé kroky, Poďakovania pre teba na profile (29. 9.).
- Moje stránky nad štítom (Svetlo pomoci o.z., Pekáreň Dobrota, tvorca) (29. 9.).
- Konáš ako + v strede hornej lišty Prezentácia a Ja · osobne; appkové menu nemeniť (29. 9.).

### Upraviť profil, QR, Peňaženka
- Upraviť profil: fotky, meno zamknuté, ako sa ukážeš pri dare, miesto, o mne, súkromie, Ochrana osoby, Uložiť zašednuté (29. 9.).
- Môj QR: záložky Na akciu · Overiť ma · Pozvánka (29. 9.).
- QR na akciu / overenie obnova 15 s, ako identifikačná karta s fotkou a štítom; pozvánka statická (29. 9.).
- Ťuk na fotku a štít v QR zväčší (29. 9.).
- Ťuk na QR = celá obrazovka, biele pozadie, bezpečne načítateľné (29. 9.).
- Na vstup na akciu foto a štít netreba, na prvú návštevu (napr. u dôchodcu, objednanie cez tretiu osobu) ukázať všetko (29. 9.).
- QR musí fungovať offline (29. 9.).
- Hlasové overenie pri dverách zvažované s opatrnosťou proti zneužitiu („ok to by mohlo byť") (29. 9.).
- Peňaženka: hore eurá (karty, SEPA účet, Apple / Google Pay), pod tým krypto (DeeD | EURC, prepojené Coinbase / Revolut) (29. 9.).
- Ďalšie podrobnosti dodá poskytovateľ (29. 9.).
- Dole Ďalšie pohyby a Výpisy v PDF po mesiacoch (29. 9.).

### Nastavenia (karta 20, 24)
- Sekcie premiešané, Pomoc / Časté otázky / Podmienky ostávajú v Nastaveniach (29. 9.).
- Hranica platby nad 50 € s potvrdením (29. 9.).
- Tichý režim áno, okrem SOS (29. 9.).
- Prihlásené zariadenia, max 5, nové zariadenie 24 h obmedzené (29. 9.).
- E-mail / heslo: overenie aj SMS, tvárou, bezpečnostným kľúčom, cez podporu, lebo doména e-mailu môže zaniknúť (29. 9.).
- Zablokovaní ľudia so zoznamom a vysvetlením (29. 9.).
- Predvolený okruh: Moje miesto / Kde práve som (poloha telefónu, prepočet od 5 km) (29. 9.).
- Súhlasy: povinné, povolenia telefónu, nepovinné; detaily Podmienok a Spracovania údajov (29. 9.).
- Stiahnuť moje údaje, Zrušiť účet so slovom ZRUŠIŤ (29. 9.).
- Veľkosť písma v appke + rešpektovanie systémového zväčšenia (29. 9.).

### Zamestnávateľ
- Nájdi svoju firmu → Požiadať o pozvanie; firma ti poslala pozvánku (29. 9.).
- Benefity, firemné hodiny VTO (Moje firemné hodiny: zostáva, prihlásené, história, kam môžeš ísť, súkromné miesta, PDF) (29. 9.).
- Firemné akcie, školenia a smeny, moje odmeny od firmy, navrhnúť firemnú akciu, oznámenia od firmy, viac firiem (29. 9.).

### Štatistiky, Priatelia, Oznámenia
- Štatistiky: séria dní len informácia (radosť), ročné súhrny tu (29. 9.).
- Graf mesiacov s číslom nad stĺpcom (29. 9.).
- Priatelia: záložky Priatelia / Sledujem / Podporujem, Kam idú tvoji priatelia + Pridať sa (dobrovoľníctvo, reštaurácia, kultúra) (29. 9.).
- Čo o mne vidia priatelia (prepínače), menu ⋯, 4 cesty Pridať priateľa (kontakty, hľadať, pozvánka, skenovať QR) (29. 9.).
- Oznámenia: filtre, oznam + správa, tlačidlo Späť (29. 9.).
- Oznamy (kategória) sa k nim ešte vrátime (29. 9.).

### Karma (karta 26)
- Sekcia karma = tvoje úspechy + vysvetlenie celej karmy a oblastí (29. 9.).
- Ťuk na oblasť (napr. ART) zobrazí celú sadu štítov: získané a čo čaká (29. 9.).

### Reťaz dobra (12. 10.)
- Pri otvorení na zbierke je v rade len táto zbierka, nič iné vopred (12. 10.).
- Dá sa odísť bez delenia: × hore a „Nechcem sa deliť · zavrieť", návrat na hlavný modul (12. 10.).
- Vysvetlenie pred nastavením: reťaz sa nastavuje len teraz, všetky tvoje dary sa rozdelia (29. 9.).

---

## 3 · Prototypy (prototypy/)
- Platba - dorovnanie firmy v2.dc.html (hlavný platobný modul).
- Platba - pravidelna podpora.dc.html.
- Platba - tablet a PC.dc.html a Platba - tablet a PC v2.dc.html.
- Platba - tmava obrazovka po dare.dc.html.
- Zbierka cez tvorcu.dc.html.
- Zbierka sukromna s overovatelom.dc.html.
- Retaz dobra.dc.html.
- Uvitanie.dc.html.
- Moj profil.dc.html (profil, Upraviť, QR, Peňaženka, Moje záujmy, dlaždice).
- Nastavenia.dc.html (všetky podstránky, Zamestnávateľ, Jazyk).
- Moje skutky.dc.html (Pridať skutok, komunitný, skutok ako dar).
- Oznamy.dc.html.
- Karma.dc.html (Tweaks rola, hlavný štít).
- Statistiky.dc.html.
- Cesta daru.html.
- Priatelia.dc.html.
- Profil PC - Moje stranky.dc.html.
- Znacka DEED plus.dc.html.
- Nova uroven - oslava.dc.html, Ciarove ikony.dc.html, DEED Vychytavky v2.dc.html (pomocné).
- prototypy/odznaky/*.png (orezané štíty s priehľadným pozadím).

Kód a dokumenty: kod/Uvitanie.tsx + uvitanie.css, kod/karty/00–32, kod/OPRAVY-platby-modul.md, kod/PLATBY-CELOK.md, kod/PLATBY-STAV.md, kod/B2B-poznamky.md, kod/POKYNY.md, PRAVIDLA-APPKY.md, ODOVZDANIE.md, SPOLUPRACA.md, PRE-NOVY-CHAT.md, odovzdanie-celok/.

---

## 4 · Rozrobené a nedokončené
- U kódera: body 78 a 79b (preklad spoločných komponentov a obsahu do EN) (30. 9.).
- Bod 80 (štít HELP, vymazať CARE / TEAM / PARTNER), asset HELP pošle Martin kóderovi (30. 9.).
- Body 81, 81b, 82 (vrátiť DEV prepínač rolí a tierov, aj na účte bez stránok) (30. 9.).
- Bod 83 a karta 32 (profil charity používa existujúci ZbierkaModul) (30. 9.).
- Body 86–88 (Reťaz dobra cesta von, prvá v rade aktuálna zbierka, 5 úprav modulu) (12. 10.).
- Profil charity (Svetlo pomoci o.z.): verejná stránka a správa, karta 33 (30. 9.).
- Správa stránok charita / firma / tvorca z Moje stránky (30. 9.).
- Nové ukážkové dáta: staré mock skutky s emoji a „Gold" zmazať v novom chate (29. 9.).
- Profil firmy B2B: firemný panel, Odmeniť, VTO zo strany firmy, ESG, cenník (kod/B2B-poznamky.md) (29. 9.).
- Detail skutku (Silver textom, Split QR, reťaz na detaile, Namietam červené) – bod 26, nový návrh (29. 9.).
- Finálny kurz DeeD (v kóde 1 € = 20) (29. 9.).
- Čo presne robí Poslať v peňaženke (29. 9.).
- Bonus za tempo Extrémna / Top a z čoho počítať priemer (28. 9.).
- Viac firiem pri dorovnaní, alternatívy A a B (28. 9.).
- Pole „odkaz príjemcu" v nastavení zbierky (28. 9.).
- Zaradenie žiadosti, prepitného, klubu do skupín modulu (28. 9.).
- Limity počtu fotiek a dĺžky videa, nahrávanie médií pri zakladaní zbierky (30. 9.).
- Dorovnanie: charita neschvaľuje, len potvrdzuje príjem SEPA – čaká na potvrdenie Martina (30. 9.).
- Kto vidí dlaždicu Zamestnávateľ podľa stavu (29. 9.).
- Riadok „roky v DEED" a veta pri štíte vo verejnom profile čakajú na Martina (29. 9.).
- Najdlhšia reťaz aj v Domove? (29. 9.).
- Oznamy (kategória) – vrátime sa (29. 9.).
- Právne: Dagmar (odmeny za mimopracovné skutky, VTO), texty súhlasov a doby uchovávania potvrdí právnik (29. 9.).
- Snímky obrazoviek pre karty sa automaticky nepodarili, posielal ich Martin (28. 9.).
- V Retaz dobra.dc.html je pri načítaní jedno hlásenie v konzole bez popisu, nepreverené (12. 10.).

---

## 5 · Zamietnuté nápady a prečo
- Modelovať všetky situácie modulu tu naraz – zamietnuté, Martin by mohol niečo zabudnúť; radšej základné rozdelenie a karty po tlačidlách (28. 9.).
- 7-dňová lehota na pripísanie daru – zamietnuté, technicky neistá; nahradené kódom z dokladu bez lehoty (28. 9.).
- Párovanie daru podľa karty / IBAN – zamietnuté, spracúvanie platobných údajov navyše (28. 9.).
- Výčitka po dare „čo si stratil" – zamietnuté, kazí dobrý pocit; namiesto toho „Tvoj dar čaká na meno" (28. 9.).
- Veta „Darovať môžeš aj bez účtu" – zamietnuté, „účet" mätie (bankový); „bez registrácie" (28. 9.).
- Sčítavanie zbierok pri splite tvorcu – zamietnuté, zbierky idú v rade (28. 9.).
- Záporný zvyšok a varovanie pri splite – zamietnuté, vzniká len pri sčítavaní (28. 9.).
- Miešanie overovateľa s tvorcom – zamietnuté, tvorca nesplituje odmenu overovateľa (28. 9.).
- Rekord dňa, Svetlúšikovia ako rastúci bar – zamietnuté, míľniky sú lepšie (28. 9.).
- Stĺpce 14 dní pri zbierke bez cieľa – zamietnuté, nahradené míľnikmi a tempom (28. 9.).
- „Sila signálu" ako ukazovateľ tempa – zamietnuté, nahradené dielmi zľava (28. 9.).
- Tempo darov pri súkromnej zbierke – zamietnuté (28. 9.).
- Dorovnanie firmy pri súkromnej zbierke – zamietnuté (28. 9.).
- Vymyslený obsah pri súkromnej zbierke (účel, ručenie overovateľa) – zamietnuté, parte a rodina rozhoduje (28. 9.).
- Lišta s percentami pri tvorcovi – zamietnutá, jednoriadkový bar celej zbierky (28. 9.).
- Textový popis statusu, fajky, počet sledovateľov pri tvorcovi – zamietnuté, len štít (28. 9.).
- Zverejnený popis karmy / ako ju získal – zamietnuté, karma je súkromná (28. 9.).
- Pravidelná podpora pri tvorcovi – zamietnutá (28. 9.).
- Mikrodar v krypte cez peňaženku – zamietnutý, ide priamo zbierke (28. 9.).
- Štítok „Najčastejšie" pri krypte a modré rýchle dlaždice – zamietnuté, dary sa menia (12. 10.).
- Výber sektor / centrálna v pravidelnej podpore – zamietnutý, charity majú centrálnu samostatne (12. 10.).
- Šípky v krúžku pri Späť – zrušené, všade rovnaké Späť (28. 9.).
- Rôzne farby ikon v Nastaveniach – zamietnuté, „cirkusové" (29. 9.).
- „Moje roly" v profile – zamietnuté, duplikát (29. 9.).
- Vymazanie modulu Good – zamietnuté, je to Domov, len premenovať (29. 9.).
- Vlastná veta pod štítom „Ďalší stupeň príde ako prekvapenie" – zamietnutá, štít sa radšej zväčší (29. 9.).
- „Tento štít nemá hocikto" – zamietnuté, štít nie je porovnanie s inými, je to vyznamenanie (29. 9.).
- Veta „karma sa nedá kúpiť" a „štít sa nedá kúpiť" – zamietnuté (28.–29. 9.).
- „L7" a „Gold" v texte – zamietnuté (29. 9.).
- Záujmy ako 7 dlhých pruhov / podradný riadok – zamietnuté, hlavná karta (29. 9.).
- Rozloženie záujmov s Prírodou a Zvieratami bez páru – zamietnuté ako nelogické (zviera na ceste je o 3 min 3 km ďalej) (29. 9.).
- Zväčšené písmo len pre dôchodcov – zamietnuté, používa ho aj Martin (29. 9.).
- Odmeny od firmy v Zamestnávateľovi riešené userom – zamietnuté, rieši firma (29. 9.).
- Zamestnávateľ ako „Práca" – zamietnuté, ostáva názov Zamestnávateľ (29. 9.).
- Druhý profil pre firmu – zamietnutý, jeden účet, pracovný QR je druhý kód (29. 9.).
- Overujem / Namietam pri vlastnom skutku – vyhodené (29. 9.).
- „Ak ťa susedia overia, budeš v celom meste" – zamietnuté, nesľubujeme (29. 9.).
- Preklad len UI a obsah cez tlačidlo Translate – zamietnuté, prekladá sa všetko okrem mien (30. 9.).
- Menšinové jazyky – zamietnuté (29. 9.).
- Časový limit pri ceste daru (30 dní, týždňový rebríček) – zamietnutý (29. 9.).
- Tvrdý zoznam „čo ma nahnevalo" s citátmi a „Nič nestavaj, kým nepotvrdí" v SPOLUPRACA – zamietnuté, nový chat bol prísny; prepísané priateľsky (30. 9.).
- Nový platobný modul pre profil charity (nový chat) – zamietnutý, len ZbierkaModul (30. 9.).
- Chalenge s online prenosom v MVP – zamietnuté, 2. fáza (29. 9.).
