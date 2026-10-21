# Kompletné zhrnutie chatu „Nový CTO a pokyny“ · Správa charity PC
Chat trval od 29. 9. 2026 do 30. 9. 2026 (doplnené 21. 10. 2026). Časť prvého dňa už nemám v pamäti v plnom znení. Body odtiaľ sú zapísané podľa toho, čo z nich vyplynulo neskôr, a pri neistom dátume je „(29. 9.?)“. Nič nie je triedené podľa toho, či ešte platí.

## 1. Dohodnuté pravidlá a zásady
- Na začiatku chatu si prečítam SPOLUPRACA → ODOVZDANIE (sekcia 0) → PRAVIDLA-APPKY → PLAN → github.md a napíšem stav v 3–5 riadkoch (CLAUDE.md).
- Kým Martin nepotvrdí, nič nestavám (CLAUDE.md).
- Pri novej obrazovke si vypýtam snímky živej appky (mobil aj PC) (CLAUDE.md).
- Píšem krátko, po slovensky, tykám a nevymýšľam nežiadané veci (CLAUDE.md).
- Text píšem po troškách, Martina nezavalím a beriem jednu vec naraz (29. 9.? a opakovane 30. 9.).
- Nemám byť len vykonávateľ, ale spolutvorca a CTO, ktorý dáva návrhy a vylepšenia, aby to fungovalo aj dobre vyzeralo (30. 9.).
- Keď Martin navrhne zlú vec, mám dať lepší návrh, nie ju slepo vykonať (30. 9.).
- Robím dizajn, nie suchý kód: výsledok má byť pekný a príťažlivý (30. 9.).
- Nevymýšľam, napojím sa na GitHub a vytiahnem existujúce funkcie, lebo prepojenia v kóde fungujú a sú otestované (29. 9.?).
- Existujúce funkcie postupne prechádzame a prispôsobujeme novému dizajnu (29. 9.?).
- Zmeny robíme stále na jednej obrazovke, aby Martin vedel, kde sa práve robí (30. 9.).
- Stránky a náhľady, ktoré teraz nepotrebujeme, sa zmažú, súvisiace dlaždice môžu ostať (30. 9.).
- Textové polia majú v celom systéme jeden štandard prevzatý z kódu (formát poľa, nie vizuál) a nikdy nesmú byť iné (30. 9.).
- Bežné veci (viac fotiek, editor, video, diktovanie) si mám načítať z kódu a Martin ich nemá opakovať (30. 9.).
- Prepínanie pohľadov charita/B2B/user je len pomôcka pre Martina ako tvorcu, aby sa nemusel odhlasovať, a nie je to funkcia pre charitu ani do budúcna (30. 9.).
- Prihlásená charita vidí len charitu, tvorca tvorcu a B2B len B2B (30. 9.).
- Hlavný názov appky je **DEEDGOOD**, nie DEED+ (30. 9.).
- Toto je **profil charity po registrácii**, ktorý dostane každý registrovaný ako charita (30. 9.).
- B2B, spolok, športový klub atď. budú mať vlastné profily s vlastnými nástrojmi (30. 9.).
- Kóder napojí profil podľa typu z registrácie, nie podľa tieru (30. 9.).
- Tento návrh je produkt, ktorý predávame charite, a zbierka má dobre vyzerať aj vo feede (30. 9.).

## 2. Rozhodnutia o obchodnom modeli a tieroch
- Charita môže vytvárať 3 druhy zbierok, ktoré sa odomykajú podľa tieru (30. 9.).
- Systém musí vedieť, aké funkcie má charita zadarmo a čo pribúda v ďalších tieroch (30. 9.).
- Charita nevidí všetky funkcie systému, len svoje a najbližšie 2 tiery navyše, aby ju to nemiatlo (30. 9.).
- Tiery sa nevolajú názvami balíčkov, ale **P1, P2, P3, P4** (alebo Bal. 1–4) (30. 9.).
- V P1 idú peniaze na jeden účet charity, čo je voči userovi zavádzajúce, a tento rozpor treba opraviť (30. 9.).
- V P2 má každá sektorová zbierka samostatný účet, takže dokladovanie a účel darov sú prehľadnejšie (30. 9.).
- Prvých 50 pozvaných charít a OZ dostane na istý čas P3 zadarmo (30. 9.).
- P3 zadarmo potrvá 1 alebo 3 mesiace, čo sa ešte rozhodne (30. 9.).
- Ostatné charity sa zaregistrujú zadarmo a predplatné si kúpia, keď uvidia možnosti (30. 9.).
- Neskôr pribudne tretí režim (30. 9.).
- Ak charita po skúšobnej dobe nezaplatí, jej zbierky dobehnú a centrálna a sektorové zmiznú z verejného profilu (30. 9.).
- Po neplatení dobehnú len zbierky pre ľudí cez charitu (30. 9.).
- Cenník: `uploads/Cennik urovne_charita_spolky.xlsx`, ktorý ešte nie je kompletný (29. 9.?).

## 3. Rozhodnutia o funkciách prevzatých z profilu usera
- Z profilu usera sa prevezme **peňaženka** (29. 9.?).
- Charita si vyberie, či bude prijímať aj **EURC** (29. 9.?).
- Prevezme sa funkcia **zamestnávateľa**, lebo charita má vlastných zamestnancov (29. 9.?).
- Prevezme sa celý **QR kód**, charita v ňom bude väčšinou ako organizátor (29. 9.?).
- Charite nič nepredávame naslepo: funkcie sa pridávajú, testujú v systéme podľa cenníka a logicky umiestňujú (29. 9.?).
- Help je doplnený, ostatné doplníme spolu (s predchádzajúcim chatom, 30. 9.).

## 4. Rozhodnutia o vzhľade a tokoch: pult
- Hlavnú správu robí charita na PC, preto začíname PC verziou veliteľského pultu (30. 9.).
- Veliteľský pult a živé dlaždice sú tá istá správcovská stránka (30. 9.).
- Popri pulte priebežne pridávam funkcie do živých dlaždíc a uvidíme, ako sa to vyvinie (30. 9.).
- Mobil zatiaľ neriešime, neskôr na ňom bude rýchly oznam, akcia a prehľad, kde a ako pribúdajú peniaze (30. 9.).
- Všetky nástroje z PC budú aj na mobile, len nie na prvom mieste (30. 9.).
- Pole verejného profilu na pulte je sťahovacie: raz sa vyplní a potom sa ukazuje len riadok (30. 9.).
- Na úvodnej obrazovke novej charity je profil otvorený, nie zbalený (30. 9.).
- Úvodná obrazovka ukáže prvé kroky: doplniť profil a vytvoriť prvú zbierku (30. 9.).
- Hláška „Doplniť profil“ je len text a rozsvieti sa tlačidlo **Upraviť** pod logom, aby sa charita od začiatku učila, kde čo je (30. 9.).
- „Vytvoriť zbierku“ rozbalí v menu sekciu Zbierky, kde sa zbierky vytvárajú (30. 9.).
- Pri novej charite je v menu rozbalené rovno **Pridať zbierku** a nič sa nevysvetľuje (30. 9.).
- Profil sa upravuje tlačidlom Upraviť pod logom (hore), nie v nastaveniach (30. 9.).
- Profil je profil a nastavenia aplikácie sú nastavenia aplikácie (30. 9.).
- Na úpravu profilu je určené pole, ktoré poslal Martin (30. 9.).
- Úprava profilu sa ukladá automaticky (30. 9.).
- Pri úprave profilu je vedľa Uložiť aj **Zrušiť** a **Náhľad**, aby Martin videl výsledok pred uložením (30. 9.).
- Po uložení profilu musí hláška „Doplniť profil“ zmiznúť (30. 9.).
- Názov charity sa berie z registrácie a v úprave profilu je zamknutý (overený cez IČO) (30. 9.).

## 5. Rozhodnutia o vzhľade: verejný profil
- Charita je verejná, celkové sumy a počet darcov sa neskrývajú (30. 9.).
- Náhľad profilu sa otvorí na celú obrazovku presne tak, ako ho vidí návštevník (menu, hlavička, karty) (30. 9.).
- Malý náhľad vnútri pultu Martin zamietol, lebo by „zavrel a odišiel“ (30. 9.).
- Pod titulnou fotkou nebude Sledovať ani QR, lebo tam budú pribúdať štíty (30. 9.).
- Bronzový štít sa charite pridá automaticky (30. 9.).
- Titulná fotka sa má zmenšiť tak, aby dobre vyzerala na mobile aj tablete (30. 9.).
- Na PC sa voľné miesto vpravo od fotky využije na dlaždicu (30. 9.).
- Titulná fotka má mať štýl použiteľný pre väčšinu fotiek, bez bielych pásov a orezania len v jednom rohu (30. 9.).
- Okolo titulnej fotky je **rám**, ktorého farbu si charita vyberie pri tvorbe profilu tak, aby ladila s fotkou (30. 9.).
- Rám fotku prekrýva, pôvodne mal mať asi 4 mm (30. 9.).
- Navrhnuté farby rámu boli bordovo-zlatá a zeleno-zlatá s jemným prechodom (30. 9.).
- Rám sa zmenil na **2,5 mm na PC** (30. 9.).
- Zlatá sa zmazala a nahradila sa kombináciou s **bronzom**, ladiacou s bronzovým štítom (30. 9.).
- Výrez fotky sa dá upraviť do rámu (posunúť aj zmenšiť) (30. 9.).
- Fotka sa nesmie orezať proti vôli používateľa (30. 9.).
- Mobil musí vyzerať presne a perfektne ako PC vrátane farby rámu (30. 9.).
- Pridajú sa ďalšie sociálne siete (30. 9.).
- Text O nás má aspoň **1000 znakov** namiesto 600 (30. 9.).
- Ukážkový text O nás sa predĺžil aspoň o 10 viet (30. 9.).
- Charita si v texte určí, kde sa zobrazí **„viac“**, tlačidlom …viac v lište editora (30. 9.).
- Logo sa musí dať nahrať a upraviť a nesmie byť „mŕtve“ (30. 9.).
- Logo nesmie byť prekryté titulnou fotkou (30. 9.).
- Na stránke charity sú karty ako v appke: Všetko · Oznamy a ponuky · Zbierky · Ukončené zbierky · Skutky · Video · Akcie (30. 9.).
- Zbierky na stránke charity sú v mriežke po 3 a na kartu zbierky sa dá kliknúť (30. 9.).
- Kontakt je dole v dlaždiciach s ikonou, ako v appke (30. 9.).
- Kvôli testu som všetky texty, položky, logo aj fotku z profilu raz vymazal a texty mám zapamätané (30. 9.).

## 6. Rozhodnutia o obsahu a komunikácii
- Oznam nemá motivovať darcov k zbierke (30. 9.).
- Oznam oznamuje, čo charita chystá, pripravuje alebo kam pozýva (30. 9.).
- Cez oznam je zakázané robiť pracovný inzerát (30. 9.).
- Darcom ďakuje systém (30. 9.).
- Charita môže poďakovať len pri ukončení zbierky a pri celkovom dokladovaní (30. 9.).
- Charity nemajú byť vlezlé ani si vynucovať pozornosť darcov, majú robiť skutky, nie „kecy“ (30. 9.).

## 7. Rozhodnutia o tvorbe zbierky
- Pri zbierkach platia 2 veci: nastavenia pri vytvorení, ktoré sa po spustení **zapečatia** a nedajú sa meniť, a nástroje na správu zbierky (30. 9.).
- Najprv prejdeme proces vytvorenia a až potom správu zbierky (30. 9.).
- Tvorba zbierky vychádza z centrálnej zbierky (30. 9.).
- Náhľad karty sa presunul do tlačidla vpravo hore, aby nezaberal miesto (30. 9.).
- Náhľad je náhľad **celej zbierky na stránke**, nie malá karta, a otvára sa na celú obrazovku (30. 9.).
- Ľavý panel sa presunul dole a formulár sa roztiahol na celú obrazovku (30. 9.).
- Popis zbierky má **1500 znakov** (30. 9.).
- Zbierka má viac fotiek, editor, video a diktovanie textu, ako pri Skutkoch (30. 9.).
- Názov a text zbierky som vymyslel ja (30. 9.).
- Suma je cieľová alebo otvorená (30. 9.).
- „Doklady doložíte“ nebolo zrozumiteľné a muselo sa prepísať (30. 9.).
- K verejnej zbierke patrí **transparentný účet** (30. 9.).
- Poradie: názov → popis → foto a video (vizuálna časť) → suma → účet → dokladovanie (30. 9.).
- Ďalej nasleduje typ: krátkodobá, dlhodobá alebo pravidelná podpora (áno/nie) (30. 9.).
- Pravidelná podpora je bez cieľa a trvá minimálne 6 mesiacov (30. 9.).
- Potom nasledujú platby aj v kryptomene EURC (áno/nie) a pod tým nastavenie platobného modulu (30. 9.).
- Centrálna zbierka organizácie sa zadáva len raz a je len jedna (30. 9.).
- Sektorové zbierky (ak má charita viac sektorov) sú zvlášť (30. 9.).
- Centrálna sa len skopíruje aj so sektorovou, keď ju nastavíme, a zatiaľ sa to nerobí (30. 9.).
- V náhľade zbierky musí byť pod zbierkou platobný modul (30. 9.).
- Platobný modul je už hotový a naprogramovaný a nič sa nevymýšľa (30. 9.).
- Kóder má k môjmu návrhu len pripojiť hotový modul `<ZbierkaModul miesto="charita" zoStrankyOrg>` (Charita.tsx r. 167) (30. 9.).
- Zbierka sa prispôsobuje modulu, nie modul zbierke (30. 9.).
- Rámček „Za zbierku zodpovedá“ ostáva, lebo zbierka sa ukazuje aj vo feede a na stránkach firiem či tvorcov (30. 9.).
- Uložená zbierka sa musí objaviť na stránke charity s fotkou a dá sa otvoriť (30. 9.).
- Fotky zbierky sa ukladajú spolu so zbierkou, nie len dočasne (30. 9.).

## 8. Prototypy a súbory, ktoré som vyrobil
- `Sprava charity PC.dc.html` je hlavný a jediný pracovný návrh s pultom charity na PC, úvodom, úpravou profilu, verejným profilom, novou zbierkou a náhľadmi (29.–30. 9.).
- Súčasťou tohto súboru je mobilný náhľad verejného profilu vedľa pultu (30. 9.).
- Súčasťou tohto súboru je celoobrazovkový náhľad verejného profilu (30. 9.).
- Súčasťou tohto súboru je celoobrazovkový náhľad zbierky s platobným modulom (30. 9.).
- Na začiatku chatu vznikli varianty návrhov (1, 2, 3, veliteľský pult, živé dlaždice) a neskôr sa zmazali (29. 9.?).
- Varianta 3 bola zrozumiteľná, varianta 2 Martinovi nič nehovorila a varianta 1 mala dostať viac fantázie a funkcií z kódu (29. 9.?).
- Vznikla verzia veliteľského pultu na tablet a telefón a potom sa zmazala (30. 9.).
- Tvorca prepínal tiery v kóde správy, aby sme skladali funkcie od zadarmo po najvyššie (30. 9.).
- `deed/PRE-NOVY-CHAT-sprava-charity.md` je odovzdávka pre nový chat (30. 9.).
- `deed/kod/karty/32-profil-charity.md` je karta 32 od Martina, ktorú som skopíroval do deed (30. 9.).
- `deed/kod/OPRAVY-platby-modul.md` je zoznam opráv platobného modulu po bod 83, ktorý som skopíroval do deed (30. 9.).
- `deed/balik-animacie/` je balík s POKYNY.md, animacie.css, animacie.ts, AnimovaneKomponenty.tsx a Nova uroven - oslava.dc.html (30. 9.).
- `deed/ZHRNUTIE-CHATU-sprava-charity.md` je tento súbor (21. 10.).
- `ukazka-charita.json` sú ukážkové dáta charity (dátum neistý).

## 9. Rozrobené a nedokončené
- Nerozhodnuté: EURC a pravidelná podpora sa nastavia pri každej zbierke (kóder doplní do modulu) alebo raz pre celú charitu (30. 9.).
- Rozpor v P1 (všetky peniaze na jeden účet) treba opraviť (30. 9.).
- Dĺžka P3 zadarmo je 1 alebo 3 mesiace a nie je rozhodnutá (30. 9.).
- Tretí režim registrácie ešte nie je navrhnutý (30. 9.).
- Správa zbierky (nástroje po spustení) ešte nie je navrhnutá (30. 9.).
- Karty Skutky, Oznamy, O nás a ďalšie na stránke charity sa zatiaľ nedajú prepínať (30. 9.).
- Bod 2: podstránka charity v appke podľa snímok z tabletu (je rozhádzaná, na boku je profil usera) (30. 9.).
- Bod 2: karta zbierky vo feede (30. 9.).
- Pre kódera: z popisu centrálnej zbierky Svetla pomoci treba zmazať omylom vložený text chatu (30. 9.).
- Keď Martin potvrdí profil, napíšem kartu 33 podľa vzoru karty 32 (30. 9.).
- Na koniec OPRAVY napíšem bod 84 (30. 9.).
- Mobilná verzia pultu (rýchly oznam, akcia, prehľad peňazí) príde až po PC (30. 9.).
- Upozornenia so svetlúšikom sa v tomto chate neriešili a Martin si nie je istý, kde sa riešili (30. 9.).
- Svetlúšik (`svetlusik-let.png`) nie je v deed ani v balíku animácií (30. 9.).
- Projekt nebol pripojený k hlavnému projektu, preto sa súbory musia preniesť do nového chatu (30. 9.).
- Fotky nahraté v prehliadači sa pri prenose stratia a treba ich nahrať znova (30. 9.).
- IČO v zamknutom riadku Názov je zatiaľ vymyslené (30. 9.).

## 10. Zamietnuté nápady a prečo
- Ukázal som Martinovi náhľady, ktoré charita nikdy nevidela, lebo pôvodné podklady boli len zoznam funkcií na testovanie, nie dizajn (29. 9.?).
- Prepínanie rolí ako funkcia pre charitu bolo zamietnuté, lebo je to len pomôcka pre tvorcu (30. 9.).
- Formulár s otázkami bol zrušený, lebo Martin nestihol pozrieť návrhy (30. 9.).
- Názvy balíčkov boli zamietnuté, lebo mätú, a nahradili ich P1–P4 (30. 9.).
- Upraviť profil v nastaveniach bolo zamietnuté, lebo tlačidlo Upraviť už je hore a profil je oddelený od nastavení (30. 9.).
- Tmavé tlačidlo „vyplniť“ pri logu bolo zamietnuté, lebo nič nerobilo (30. 9.).
- Limit 600 znakov pri O nás bol zamietnutý ako málo a nahradil ho limit 1000 (30. 9.).
- Textové pole odlišné od štandardu bolo zamietnuté, lebo pole musí byť všade rovnaké ako v kóde (30. 9.).
- Textové pole bez formátovania bolo zamietnuté, lebo formátovanie nefungovalo (30. 9.).
- Malý náhľad profilu bol zamietnutý ako neatraktívny, používateľ by odišiel (30. 9.).
- Náhľad vnútri pultu bol zamietnutý, lebo nebolo jasné, na čo sa Martin pozerá (30. 9.).
- Sledovať a QR pod titulnou fotkou boli zamietnuté, lebo tam budú štíty (30. 9.).
- Orezaná fotka s bielymi pásmi bola zamietnutá, lebo vyzerala strašne (30. 9.).
- Malé náhľady PC/mobil a upozornenie „na mobile sa mení“ boli zamietnuté, lebo mobil musí vyzerať ako PC (30. 9.).
- Rozdielny rám na PC a mobile bol zamietnutý z rovnakého dôvodu (30. 9.).
- Tweaks/ovládače navyše boli zamietnuté (30. 9.).
- Zlatý rám bol nahradený bronzovou kombináciou (30. 9.).
- Tlačidlá v krokoch úvodu boli zamietnuté, lebo charita sa má učiť, kde sú skutočné tlačidlá (30. 9.).
- Vysvetľujúce texty pri rozbalenom menu boli zamietnuté ako zbytočné (30. 9.).
- Oznam ako motivácia darcov bol zamietnutý (30. 9.).
- Pracovný inzerát cez oznam bol zamietnutý (30. 9.).
- Ďakovanie charity darcom priebežne bolo zamietnuté, ďakuje systém (30. 9.).
- Malá karta ako „náhľad zbierky“ bola zamietnutá, náhľad má ukázať celú stránku zbierky (30. 9.).
- Vymyslený platobný modul bol zamietnutý, má sa použiť hotový z kódu (30. 9.).
- Zmazanie rámčeka „Za zbierku zodpovedá“ bolo zamietnuté, lebo je potrebný vo feede a na cudzích stránkach (30. 9.).
- Riešenie EURC počas dizajnu stránky zbierky Martin odložil, má sa riešiť dizajn (30. 9.).
- Obrovská karta zbierky cez pol stránky charity bola nahradená mriežkou po 3 (30. 9.).
- Kontakt na boku stránky charity bol presunutý dole ako v appke (30. 9.).
