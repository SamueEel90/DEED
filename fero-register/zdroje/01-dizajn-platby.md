# DEED · Kompletný súhrn dohôd a rozhodnutí z tohto chatu
Vytvorené 21. 10. 2026. Nič nie je vyradené, je tu aj to, čo už neplatí.
Zdroj: tento chat + zápisy v projekte (CLAUDE.md, PLATBY-STAV.md, ODOVZDANIE.md, PLAN.md).
Upozornenie: najstaršie správy tohto chatu sa už nedajú zobraziť. Veci z obdobia 26.–30. 9. sú prevzaté zo zápisov, ktoré sme vtedy spravili.

---

## 1 · Dohodnuté pravidlá a zásady

### Spolupráca a pamäť
- Na začiatku každého chatu sa najprv prečíta PLATBY-STAV.md, ODOVZDANIE.md a PLAN.md. Nič sa nevysvetľuje odznova. (CLAUDE.md)
- Každé odsúhlasené rozhodnutie sa hneď zapíše do ODOVZDANIE.md s dátumom a odškrtne v PLAN.md. Čo nie je zapísané, nie je dohodnuté. (CLAUDE.md)
- Pri rozpore platí PLATBY-STAV.md. (30. 9.)
- Používateľ je Martin. Píše po slovensky, stručne, často posiela snímky živej appky. Tykáme si. (28. 9.)
- Byť oponent: zlú alebo zbytočne zložitú požiadavku pomenovať, uviesť dôvod a lepšiu alternatívu. Ak Martin trvá na svojom, urobiť to. (CLAUDE.md)
- Pred väčšou prácou sa najprv porozprávať, až potom tvoriť. (CLAUDE.md)
- Kód píšu kóderi v inom chate. Odo mňa chcú návrh a pokyny ako súbory na stiahnutie, nie text do chatu. (CLAUDE.md)
- Kóder si robil veci „po svojom“. Pri každej obrazovke preto treba uviesť, čo sa deje, čo sa NESMIE meniť, a priložiť snímku z prototypu. (28. 9.)
- Hotové a záväzné sú platobný modul, pravidelná podpora, dorovnanie firmy a oslava úrovne. Neprerábajú sa bez výslovnej požiadavky. (CLAUDE.md)
- Repo martinstofiktn-web/DEED (master) môže byť staršie ako appka. Pri rozpore platí CLAUDE.md a to, čo pošle Martin. (CLAUDE.md)
- Návrhy sa robia ako klikacie prototypy (.dc.html). Pri väčšej zmene vzniká nová verzia súboru a stará ostáva. (28. 9., 12. 10.)

### Princípy appky
- Na prvom mieste je funkčnosť. „Trochu parády“ patrí len tam, kde nesie význam. (CLAUDE.md)
- Ten istý proces je všade. Platba je na 7 miestach rovnaká. (CLAUDE.md, 26. 9.)
- Používateľ vždy vie, kde je a prečo kliká. Doplnkové funkcie sú jasne pomenované a vždy na rovnakom mieste. (CLAUDE.md)
- Appka má byť vkusná pre všetky vekové skupiny, moderná a nie načačkaná. (CLAUDE.md)
- Výkon: animuje sa len transform a opacity. Žiadny canvas, blur, backdrop-filter ani ťažké knižnice, ani v OBS overlayi. Polopriehľadné rgba je OK. (CLAUDE.md)
- Rešpektuje sa prefers-reduced-motion: bez pohybu, výsledok sa len zobrazí. (PLATBY-STAV, 4. 10.)
- Nepridávajú sa dáta na spracovanie ani ukladanie. (CLAUDE.md)
- Aura štýl (tmavé sklo, modro-fialové gradienty) je len experiment a nepoužíva sa. (CLAUDE.md)

### Vizuál
- Font je Plus Jakarta Sans, len rezy 400–800. Manrope ani iný webfont sa nepoužíva. (CLAUDE.md)
- Čísla v sumách a počítadlách majú tabular-nums. (CLAUDE.md)
- Veľkosti písma: micro 11 · caption 12,5 · body 14 · bodyL 15,5 · title 17 · h2 20 · h1 24. Základ je 16 px, riadkovanie 1,5. (CLAUDE.md)
- Farby sú zo src/index.css živej appky cez most farby.css. Nové sú len --gGrad, --goldGrad, --t2/--t3 a --scrim. (CLAUDE.md)
- Svetlý režim je teplý, béžový a krémový, nie sivomodrý. (CLAUDE.md)
- Zelená = hlavná akcia a „naživo“. Modrá #3D6B8E = token DEED a overenie. Zlatá = výhradne dorovnanie firmy. (CLAUDE.md)
- Ikony sú čiarové (Lucide), v UI nie sú emoji: 🏦 → Landmark, 💳 → CreditCard, 🤝 → budova. (28. 9.)
- Formát čísel je slovenský v celej appke: 1 430 €, 25,00 €, 3,00 €, „10 €“ (nie „10 EUR“). Na klávesnici je „,“. (28. 9.)
- Tmavý režim používa premenné farieb a tlačidlá s jemným obrysom. (26. 9.)
- Rozloženie: na mobile hárok zdola, na tablete hárok 640 px v strede, na PC okno 560 px v strede. Na PC sa suma píše z klávesnice, Enter = ďalej, Esc = zavrieť. (26. 9.)

### Tón a texty
- Dar je nevratný a ide človeku v núdzi, preto tón je dôstojný, nie oslavný. Žiadne konfety, výkričníky ani „Ďakujeme!!!“. (CLAUDE.md)
- Texty sú slovensky, bez angličtiny: „naživo“ (nie „live“), nie „Split QR“, „Dary v EURC“ (nie „DARY V KRYPTE“). (CLAUDE.md, 27. 9.)
- Používateľovi sa tyká. Firme (IČO) sa v postupe dorovnania vyká, lebo firma = viac ľudí. (CLAUDE.md, 27. 9.)
- IČO znamená firmu, organizáciu aj živnostníka. (CLAUDE.md)

### Svetlúšik
- Svetlúšik je maskot, nie logo: svedomie, podporovateľ pri skutkoch, cesta za svetlom. (CLAUDE.md)
- Kresba je jedna a všade rovnaká. Kým nie je vektor od ilustrátora, platí len sprite svetlusik-let.png (10 záberov z videa intra). Vlastné napodobeniny sa nerobia. (CLAUDE.md, 27. 9.)
- Tvar: dlhé horné krídla šikmo nahor, malé oválne dolné krídla, biele jadro, oranžová žiara. Máva iba hornými krídlami. (CLAUDE.md)
- Je to svetlúšik, nie motýľ, „tvoj prvý dobrý skutok“. (CLAUDE.md)
- Nehovorí v bublinách, neblokuje, nepoužíva výkričníky. (CLAUDE.md)
- Herný tón („Staň sa Legendou“) patrí k statusom a intru, nie k daru. (CLAUDE.md)
- Úrovne: Bronzový (štart) → Strieborný → Zlatý → Platinový → Legenda. Názvy sú slovensky. (27. 9.)
- V platbe sa objaví iba v týchto chvíľach: čaká s tebou, zanesie svetielko (za každé € jedno, najviac 40), ukáže karmu. (26. 9.)
- Karmu napojí vlastný algoritmus appky. Čísla v návrhoch sú len ukážka. (27. 9.)
- Video intro je zatiaľ len nápad. (CLAUDE.md)

---

## 2 · Rozhodnutia o vzhľade a tokoch

### Platba všeobecne
- Postup je všade rovnaký: Suma → Spôsob → Zhrnutie → podrž a zaplať → Hotovo. Rýchla suma len preskočí písanie sumy. (26. 9.)
- Kroky sú navrchu hárku a na predchádzajúci krok sa dá ťuknúť. (26. 9.)
- Podržanie trvá 0,9 s. Vibrácie sú len na Androide a sú doplnok, nie informácia. (26. 9.)
- Hárky sa otvárajú nad detailom. Po zavretí ostaneš na rovnakom mieste scrollu. (28. 9.)
- Karta stojí 1,4 % + 0,15 €. SEPA je bez poplatku a príde do 1 pracovného dňa. (CLAUDE.md)
- Pod 3 € je len SEPA. Karta je zašednutá a pri nej je vysvetlenie. (26. 9.)
- Pri veľkej sume (úhrada firmy) sa ako prvá ponúka SEPA. (27. 9.)
- Zhrnutie obsahuje Suma · (Poplatok) · (Dar pre DEED) · Spolu a suma Spolu je aj na tlačidle. (26. 9.)
- Dar pre DEED je dobrovoľný, predvolene vypnutý, nad riadkom Spolu a označený „ide platforme, nie príjemcovi“. (26. 9.)

### Typy zbierok
- Pri Help/Good/Aktivity sú rýchle dlaždice 10 / 50 / 100 DEED: drobná podpora namiesto lajkov, klik a hneď odíde. (CLAUDE.md)
- Pri Charite/Viere je namiesto tokenu DEED EURC. Rýchle sumy sú v eurách (napr. 10 / 25 / 50 €) a charita si ich volí v nastaveniach zbierky. (CLAUDE.md)
- Farba rýchlych súm v eurách jemne silnie so sumou. Je to zámer. (CLAUDE.md)
- Zbierka s cieľom má ukazovateľ, percentá a hlášky „chýba“, „polovica“ a „plná“. (26. 9.)
- Zbierka bez cieľa nemá ukazovateľ ani percentá. Má „Vyzbierané“ + sumu, „dnes +X €“ a stĺpčeky za 14 dní (dnes sýto zelený, nová zbierka len jej dni). (28. 9.)
- Pri zbierke bez cieľa je políčko POSLEDNÝ DAR, jedna hláška a počet ľudí. Ak dnes nikto nedaroval, zobrazí sa „Posledný dar prišiel včera.“ a nikdy čas v minútach. (28. 9.)

### Detail zbierky
- Poradie: galéria → nadpis → text → karta zbierky → zdieľanie a reakcia → rýchle sumy → vlastná suma → pravidelná podpora → obľúbené + Podporiť DEED → firma (len IČO) → karta Dorovnáva → reťaz dobra → zoznam darcov. (28. 9.)
- Galéria je nad nadpisom, 16 : 9, cez celú šírku, s natívnym scroll-snap bez knižníc. Ťuk otvorí celú obrazovku a otočenie telefónu zobrazí fotky aj video na šírku. (28. 9.)
- Hlavné médium galérie volí autor zbierky, predvolene je prvé video. Bez videa sa nič prázdne nezobrazuje. (28. 9.)
- Text sa zobrazí na 3 riadky a zelené „… viac“ je na konci 3. riadku. Rozbalený text má „menej“ vpravo a po zbalení sa vráti na začiatok. „… viac“ sa ukáže len pri dlhšom texte. (28. 9.)
- Zdieľať · QR je jedno tlačidlo pri reakcii. Otvorí hárok s náhľadom, „Poslať priateľom“, „Kopírovať odkaz“, DEED QR (tvar „D“, zelený rám) a Stiahnuť / Plagát A4. (28. 9.)
- „Skenovať“ nepatrí k zbierke. Presunie sa na globálne miesto appky. (28. 9.)
- Pri aktívnom dorovnaní sa reťaz dobra nezobrazuje, ani jej prázdny obal. (27. 9.)

### Darcovia a neregistrovaný
- Registrovaný si volí, ako sa ukáže (meno, iniciála, prezývka, mesto, anonym), a zvlášť, či sa ukáže suma. (CLAUDE.md)
- Nič sa nedopĺňa: v zozname je „Martin Konaľ, Trenčín · 20 €“, nie „daroval“. (27. 9.)
- Suma do 2 € sa v zozname nezobrazí nikdy. Nezobrazí sa ani riadok firmy pod takým darom. (CLAUDE.md, 27. 9.)
- Neregistrovaný má len SEPA a kartu a vždy je „Anonymný darca“, bez DEED/EURC a bez voľby mena. (CLAUDE.md)
- Neregistrovaný môže mať pravidelnú podporu v EUR, ale musí vyplniť platobné údaje + e-mail. (CLAUDE.md)
- Dar sa pripíše len po plnej registrácii, nie „stačí e-mail“. (CLAUDE.md)
- Ponuka registrácie neblokuje platbu, zobrazí sa až po dare a je vždy len jedna: „Chceš, aby sa ti tento dar pripísal?“ + text + „Zaregistrovať sa“. (26. 9.)
- Sumarizačný súbor pre neregistrovaného a animácie pre iný chat: PRE-INY-CHAT-animacie-a-neregistrovany.md. (4. 10.)

### Hlášky po dare
- Zobrazí sa jedna pravdivá veta z reálnych dát, prvá, ktorá platí. Poradie: prvý dar → plná → polovica → okrúhla hranica → prvý dnes → každý 10. dnes → odkaz príjemcu → zostatok alebo súčet. (26. 9.)
- Okrúhle hranice sú 100, 250, 500, 1 000, 1 500, 2 000, 3 000, 5 000 a 10 000 €. (30. 9.)
- Odkaz príjemcu (hláška 7) sa zobrazí len vtedy, keď ho príjemca naozaj napísal. (26. 9.)
- Do sumy pre hlášku sa počíta aj dorovnanie firmy. (30. 9.)
- Neregistrovaný dostane tie isté fakty neosobne, bez mena a karmy. (26. 9.)
- Skloňovanie: 1 človek pomohol · 2–4 ľudia pomohli · 5+ ľudí pomohlo. (30. 9.)

### Obrazovka po dare
- Je to plná tmavá vrstva bez blur, s čiarovou ikonou namiesto 🤝 a sivými textami s dobrým kontrastom. (27. 9.)
- Postup: „Tvoj dar 10 €“ → „Pekáreň Dobrota pridala 10 €“ → 20 € → „odchádza príjemcovi“ → hláška → „ťukni kdekoľvek“. (27. 9.)
- Vzor s 20 € od firmy a hláškou „Si prvý…“ je úspešný a zachová sa. (27. 9.)
- **Karma sa po dare nezobrazuje, zatiaľ vôbec.** Výška karmy bude vidieť inde, nie po každej platbe. (12. 10.)

### Pravidelná podpora
- Zatiaľ je len pri Charite a Viere. Neskôr možno pribudnú kluby a iné organizácie, tam aj v DEED/EURC. (26. 9.)
- Dorovnanie firmy sa na pravidelnú podporu nevzťahuje. (26. 9.)
- Nastavenie: mena pred sumami, sumy 5 / 10 / 20 / 50 € s „€“, frekvencia „týždenne / mesačne / ročne“ a „Prvá platba dnes, potom každého 27.“. (27. 9.)
- V nastavení je jeden nadpis pre zobrazenie, nie dva. Pri sume do 2 € sa prepínač „Zobraziť sumu“ skryje. (27. 9.)
- Zhrnutie obsahuje spôsob, poplatok, ďalšiu platbu, „Spolu pri každej platbe“ a opakovanú voľbu zobrazenia. „Dokladovanie“ je neutrálne. (27. 9.)
- Tlačidlo je „Potvrdiť pravidelný dar“ (nie „záväzok“) a potvrdzuje sa podržaním. Hlavné tlačidlo je hore. (27. 9.)
- Hotovo obsahuje Svetlúšika, hlášku a „10 € každý mesiac · prvá platba dnes · ďalšia 27. 10.“. Hotovo je hlavné tlačidlo, bez výkričníka. (27. 9.)
- Zrušenie: registrovaný cez Profil → Pravidelné dary (nie „Peňaženka“), neregistrovaný cez odkaz v e-maile. (27. 9.)
- Neúspešná platba: správa v appke + e-mail, 2. pokus o 2 dni, 3. o ďalšie 3 dni, potom pozastavenie + posledná správa. (27. 9.)
- Hláška: „Si prvý, kto túto zbierku podporuje pravidelne.“ alebo „S tebou túto zbierku pravidelne podporuje N ľudí.“ Neregistrovaný dostane neosobné znenie. (27. 9.)
- **Voľba „Táto zbierka / Celá organizácia (centrálna zbierka)“ je zrušená.** Podpora ide vždy na zbierku, z ktorej ju spúšťaš. Centrálne a sektorové zbierky majú na stránkach vlastný detail. (12. 10.)
- **Z hlavičky je odstránené „pre <zbierka> ·“.** Ostáva len „Zrušiteľná kedykoľvek“. (12. 10.)

### Dorovnanie firmy
- Ukáže sa len tomu, pre koho naozaj platí, a vidí ho len user s IČO. (CLAUDE.md)
- Firma sa vždy podpisuje menom firmy, nikdy anonymne ani osobným menom. (27. 9.)
- Všetko pri dorovnaní je zlaté, aj voľby vo formulári. Na zlatom podklade je biely text. (27. 9.)
- Strop na jeden dar je 300 €. Firma zadá pole (predvolene a najviac 300 €) a strop sa ukazuje vo formulári, v zhrnutí aj darcovi. (27. 9.)
- Výpočet: min(dar × pomer, min(300, strop), zostatok). (30. 9.)
- Pomery sa píšu „+50 % · 1 : 1 · 2 : 1 · 5 : 1“ a vždy s príkladom („z 20 € bude 30 €“). (27. 9.)
- Formulár obsahuje rozpočet s „pokryje približne N darov“. Platí do dátumu a/alebo kým sa minie, skončí to, čo nastane skôr. Zvyšok ostane zbierke alebo sa vráti firme. Komu: každému alebo len zamestnancom. (27. 9.)
- „Zapečatiť“ je zámerné slovo: podmienky sú nemenné. (27. 9.)
- Na kontrole je jedno meniace sa tlačidlo a nad ním 2 kroky, ① Úhrada a ② Pečať. Text „Kedy sa dorovnanie spustí“ (nie „nabehne“). (27. 9.)
- Úhrada nie je dar: nemá poďakovanie darcu ani hash. Po úhrade sa vráti na krok 2 s „✓ Uhradené 5 000 € · 27. 9.“. (27. 9.)
- „Podržte a zapečaťte“ vtlačí zlatú pečať. (27. 9.)
- Pri karte dorovnanie beží hneď. Pri SEPA čaká na potvrdenie charity, inak sa spustí automaticky do 48 h, a firme príde upozornenie v appke + e-mail. (27. 9.)
- Darca vidí len kartu „Dorovnáva“ (bez štítku navyše): zlatý ukazovateľ čerpania, „Dorovnáva do …“, „najviac 300 € k jednému daru“, šípku rozbaliť/zbaliť a „Otvoriť stránku firmy ›“. (27. 9.)
- Pri dare je riadok „daruješ 20 € → k príjemcovi ide 40 €“, pri strope „400 € → 700 €“. (27. 9.)
- V zozname je firma pod darom ako jeho pár: „+ 20 € Pekáreň Dobrota“. Úhrada rozpočtu v zozname nie je. (27. 9.)
- Firemné hlášky sú vážne pri peniazoch a s vkusným humorom pri míľnikoch: zapečatené, spustené, prvé, polovica, vyčerpané, koniec, poďakovanie. (27. 9.)

### Podporiť DEED
- Hárok riadi príznak recipient === 'deed'. Vypína riadok „Dar pre nás“ a voľbu zobrazenia v zozname, odstraňuje „Marža DEED“ a mení „Dar charite“ na „Podpora DEED“. (28. 9.)
- Rýchle sumy 50 / 100 / 300 DEED a 0,50 / 1 / 3 € (SEPA) znamenajú klik a hneď poďakovanie. (28. 9.)
- Pri vlastnej sume je postup suma → zhrnutie → podrž → poďakovanie. (28. 9.)
- Poďakovanie: „Ďakujeme, Martin. Vďaka tebe ostáva DEED zadarmo pre všetkých.“, bez výkričníka a bez „dar je na ceste“, so Svetlúšikom a zbaleným dokladom. (28. 9.)
- Neregistrovaný platí len v €, poďakovanie je neosobné a nasleduje jedna ponuka registrácie. (28. 9.)

### Charita/Viera: Dary v krypte a DEED+ (verzia v3)
- **„EURC z peňaženky“ pri vlastnej sume je nahradené tlačidlom „Podporiť DEED+“** s podtitulom len „dar na chod platformy“. (12. 10.)
- Spodné „Podporiť DEED“ sa pri Charite/Viere skrýva, aby nebolo dvakrát. (12. 10.)
- Klik na DEED+ otvorí hárok Podporiť DEED: rýchle sumy 0,50 / 1 / 3 € (SEPA, klik a hneď odíde), vlastná suma v € a poďakovanie. (12. 10.)
- **Pod pravidelnou podporou je rozbaľovací modul „DARY V KRYPTE“.** Je predvolene zbalený a otvára sa šípkou. (12. 10.)
- Rýchle sumy v EURC sa riadia nastavením zbierky: Mikro 0,10 · 0,50 · 1 / Drobné 1 · 3 · 5 / Stredné 5 · 10 · 20. Pod každou sumou je „= x €“. Klik a dar hneď odíde. Pod nimi je „Vlastná suma v EURC“. (12. 10.)
- Dlaždice EURC sú modré, od svetlej po sýtejšiu: rgba #3D6B8E .07 / .15 / .26, okraj .22 / .36 / .55. (12. 10.)
- Modul vidí len registrovaný a len vtedy, keď má zbierka EURC zapnuté. (12. 10.)
- Martin potvrdil, že 10 / 25 / 50 € nie je mikro dar. (12. 10.)

### Animácie
- Obrazovka po dare, pečať a podrž a zaplať pozri vyššie. Platí len transform/opacity a reduced-motion. (26.–27. 9.)
- Oslava novej úrovne má gradáciu dĺžky: Strieborný cca 6 s … Legenda cca 15 s. (27. 9.)
- **Iskra (cudzí dar letí do živého pásu):** štítok „+5 € · Lucia B.“ + zbierka alebo „pre <autor>“ vyletí od tlačidla Darovať. Nesú ho dvaja Svetlúšikovia (sprite, 34 px), ktorí mávajú a jemne sa hojdajú (±5°, −4 px, 640 ms). (2.–4. 10.)
- Dráha letu je od right:70 / bottom:230 do stredu živého pásu pod filtrami (−110 px, −392 px), nie vyššie. (4. 10.)
- Let trvá 3,4 s: 0–12 % objavenie, do 75 % let, potom zmenšenie a zmiznutie. Pri dopade zablikajú iskry (8 bodiek, 650 ms). (4. 10.)
- Pás potom 5 s ukazuje dar (crossfade 220 ms) a vráti sa na „DNES V ISKRÁCH · suma · N. dar“. (4. 10.)
- Naraz letí najviac jeden dar, ďalšie čakajú. Keď ich čaká viac ako 3, zhrnú sa do „+12 darov za minútu“. (4. 10.)
- Pri reduced-motion sa let nezobrazí, dar sa len ukáže v páse. (4. 10.)
- Meno sa ukáže len so súhlasom darcu, inak „anonymne“. Dar do 2 € je bez sumy. (4. 10.)
- Štítok je krémový, nie zlatý, lebo zlatá patrí dorovnaniu. (4. 10.)

---

## 3 · Prototypy a súbory, ktoré vznikli

### Aktuálne
- **Platba - dorovnanie firmy v3.dc.html:** najnovší hlavný prototyp s modulom Dary v krypte, DEED+, hárkom Podporiť DEED a bez karmy po dare. (12. 10.)
- **Platba - dorovnanie firmy v2.dc.html:** predchádzajúci hlavný prototyp detailu a platby, nezmenený. (28. 9.)
- **Platba - pravidelna podpora.dc.html:** pravidelná podpora bez voľby centrálnej zbierky. Späť vedie na v3. (27. 9., upravené 12. 10.)
- **Platba - zaklad.dc.html:** základ, z ktorého vznikla v2. (26. 9.)
- **Platba - tablet a PC.dc.html:** tablet a PC. (26. 9.)
- **Platba - tmava obrazovka po dare.dc.html:** obrazovka po dare, dnes vs. návrh. Platí návrh. (27. 9.)
- **Nova uroven - oslava.dc.html:** oslava úrovne, bez kódu. Odznaky sú v odznaky/*.jpg. (27. 9.)
- **Iskra - dar letí do pásu.dc.html:** animácia cudzieho daru. Kód je v kod/iskra/DarLet.tsx. (4. 10.)
- **Ciarove ikony.dc.html + kod/ikony.tsx:** emoji nahradené čiarovými ikonami. (28. 9.)
- **DEED Vychytavky v2.dc.html:** 6 nápadov (počítadlo, svetlo na konci pruhu, cesta daru, nová úroveň, potiahni a obnov, prvý dar), bez kódu. (27. 9.)
- **Pocitadlo do streamu.dc.html + kod/Overlay.tsx:** OBS overlay, odložené. (27. 9.)

### Balíky a dokumenty
- **kod/platby/:** POKYNY.md, farby.css, hlasky.ts, PodrzTlacidlo.tsx, Svetlusik.tsx, PoDare.tsx, ikony.tsx. Odovzdané kóderom 27. 9.
- **odovzdanie-platby/:** balík na stiahnutie pre kódera. (27. 9.)
- **DEED-balik/:** súhrnný balík s ODOVZDANIE.md. (28. 9.)
- **PLATBY-STAV.md:** záväzný súhrn platieb. (30. 9.)
- **ODOVZDANIE.md, PLAN.md:** pamäť projektu. (28. 9. a priebežne)
- **uploads/animacia-dar-iskra.md:** zadanie animácie Iskry pre iný chat. (2. 10.)
- **PRE-INY-CHAT-animacie-a-neregistrovany.md:** súhrn animácií a pravidiel pre neregistrovaného. (4. 10.)
- **KOMPLETNY-SUHRN-CHATU.md:** tento súbor. (21. 10.)

### Assety
- svetlusik-let.png (sprite 10 záberov), svetlusik.png, dom.jpg, chrbtica.jpg.

### Staršie, len história
- Platba - smery, Platba - modul DEED, Platba - modul DEED v2 Svetlusik, Platba - PC nahlady, Platba - dorovnanie firmy (v1), DEED Vychytavky (v1, Aura).

---

## 4 · Rozrobené a nedokončené
- **Riadok „Doklady o použití: budú doložené“ v pravidelnej podpore:** Martin 12. 10. napísal „tu vetu preč“. Odstránil som však „pre <zbierka> ·“ z hlavičky, takže riadok „Doklady o použití“ tam možno ešte je. Treba overiť a dokončiť.
- Prototyp v3 ukazuje v module Dary v krypte len sadu Mikro (0,10 / 0,50 / 1). Prepínanie Mikro / Drobné / Stredné podľa nastavenia zbierky v ňom nie je.
- Dary v krypte: nie je potvrdené, či má byť modul predvolene zbalený.
- Treba skontrolovať v3 v tmavom režime (nové modré dlaždice a hárok DEED+).
- Upozornenia na zmeny so Svetlúšikom: Martin hovorí, že sme ich riešili, ale v projekte nie sú. Treba nájsť starý chat alebo navrhnúť od nuly.
- Iskra: originálny prototyp „Iskra centralna mobil.dc.html“ v projekte nie je. Animácia je na zjednodušenej obrazovke a treba ju napojiť na originál.
- Pokyny pre kódera k v3 (DEED+, Dary v krypte, karma skrytá) ešte nie sú v kod/platby/.
- PLATBY-STAV.md ešte neobsahuje zmeny z 12. 10. Sú len v ODOVZDANIE.md.
- Doladiť detaily platobného modulu podľa snímok živej appky.
- Pole „odkaz príjemcu“ v nastaveniach zbierky (pre hlášku 7).
- Nastavenia zbierky pre charitu: rýchle sumy, sada EURC, hlavné médium, cieľ áno/nie, EURC áno/nie.
- Záväzný dokument pre kódera: snímka + čo sa deje + čo sa nesmie meniť ku každej obrazovke.
- Navrhnúť globálne miesto pre „Skenovať“ QR.
- Rozhodnúť, či má DEED verejný zoznam podporovateľov (dnes nie).
- Kód pre Nova uroven - oslava a DEED Vychytavky v2.
- Zadanie pre ilustrátora: Svetlúšik ako vektor v pózach.
- Profil charity a podstránka charity/partnera nie sú robené. Pred návrhom sa treba spýtať.
- Pole pre odchodné firmy (logo áno/nie) nie je rozhodnuté.
- Nejasnosti na potvrdenie:
  - hláška 1 „musel“ alebo „musí“
  - 10 / 50 / 100 DEED vs. 50 / 100 / 300 DEED
  - pevná hranica len-SEPA < 3 €
  - či charita schvaľuje dorovnanie
  - logo firmy
- Odložené:
  - pravidelná podpora pre kluby (aj DEED/EURC)
  - OBS overlay
  - poradie „Si 1. Strieborný v Trenčíne…“: najširšie územie v top 10, miesto z profilu, počíta sa raz
  - merch podľa úrovne
- Overenie „len našim zamestnancom“ rieši kód.

---

## 5 · Zamietnuté nápady a prečo
- **Aura štýl:** len experiment, nesedí s teplým štýlom appky.
- **Blur a backdrop-filter:** spomaľujú zariadenia. Obrazovka po dare má plnú tmavú vrstvu.
- **Emoji v UI (🤝 🏦 💳 motýľ):** nahradené čiarovými ikonami a Svetlúšikom zo spritu.
- **Vlastné napodobeniny Svetlúšika a motýľ:** kresba musí byť jedna, z videa intra.
- **Knižnice na galériu (Swiper a pod.):** ťažké, stačí natívny scroll-snap.
- **QR ako samostatný riadok „QR tejto zbierky“:** duplicitné, presunuté do hárku Zdieľať · QR.
- **Reťaz dobra pri aktívnom dorovnaní:** zbierka je už niečia, nikto sa nepripája.
- **„daroval(a)“ v zozname:** nič sa nedopĺňa ani nehádá.
- **„stačí e-mail“ na pripísanie daru:** pripísanie len plnou registráciou.
- **„Potvrdiť záväzok“ a „Zrušiť v Peňaženke“:** „záväzok“ znie ťažko a pri karte/SEPA nie je peňaženka.
- **Zelené upozornenie pri centrálnej zbierke:** pôsobilo ako výhoda, dalo sa neutrálne. Neskôr bola celá voľba zrušená.
- **Voľba „Táto zbierka / Celá organizácia“ v pravidelnej podpore:** centrálne a sektorové zbierky majú vlastný detail. (12. 10.)
- **Dve tlačidlá Uhradiť / Zapečatiť pod sebou:** mätúce, nahradené jedným meniacim sa tlačidlom.
- **Poďakovanie darcu po úhrade firmy:** úhrada nie je dar.
- **Štítok firmy nad kartou Dorovnáva:** hovoril to isté dvakrát a sumy nesedeli.
- **Pomery „dvojnásobný / päťnásobný“:** mätúce, nahradené zápisom „2 : 1“ s príkladom.
- **Interný žargón („nabehne“, „cez našu rúru“) a testovacie poznámky:** nepatria do UI.
- **„Dar pre nás“ a zoznam darcov pri Podporiť DEED:** pýtali by sme dvakrát a platforma nemá zoznam darcov.
- **Odznak „BRONZE“ a úrovne bez Bronzového a Platinového:** úrovne sú slovensky a v plnom rade.
- **Druhý rad rýchlych tlačidiel 10 / 25 / 50 EURC:** duplicita s eurovými sumami. (12. 10.)
- **Môj prepínač „Platím: € kartou / SEPA · EURC“ nad rýchlymi sumami:** Martin zvolil modul Dary v krypte. (12. 10.)
- **Môj rad „Drobná podpora v EURC 1 / 2 / 5“:** nahradený modulom Dary v krypte so sadami podľa nastavenia zbierky. (12. 10.)
- **„EURC z peňaženky“ pri vlastnej sume:** nahradené „Podporiť DEED+“. (12. 10.)
- **Podtitul DEED+ „chod platformy, nie príjemcovi“:** skrátený na „dar na chod platformy“. (12. 10.)
- **Karta Karma po každom dare:** karma bude vidieť inde, nie po platbe. (12. 10.)
- **Zlatý štítok pri Iskre:** zlatá patrí výhradne dorovnaniu. Zlatá varianta ostala v Úpravách, ak by ju Martin chcel. (4. 10.)
- **Lietanie viacerých darov naraz pri Iskre:** cirkus a záťaž. Naraz letí jeden, pri rade sa dary zhrnú. (4. 10.)
- **Let štítku Iskry vyššie k filtrom:** pristáva v páse pod filtrami. (4. 10.)
