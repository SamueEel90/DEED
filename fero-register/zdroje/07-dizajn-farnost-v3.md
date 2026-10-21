# Výpis dohôd · chat „Farnosť v3 / Správa farnosti v2 / zbierky farnosti“ (Soňa, ~5. – 7. 10. 2026)
Bez triedenia, či to ešte platí. Časť starších správ z chatu už nemám v pamäti, preto môžu chýbať detaily. Pri pochybnosti platia PRAVIDLA-APPKY.md, kod/karty 56, 56A, 56B, 56C, 57, 58, 59 a kod/OPRAVY-platby-modul.md (body 157–159, KONTROLA 19 a 20).

## 1 · Pravidlá a zásady
- Na začiatku chatu čítať pamäť projektu a pokračovať podľa ODOVZDANIE, sekcia 0.
- Keď niečo existuje v charite, kopíruje sa 1 : 1 a menia sa len rozdiely sektora. Nič nové sa nevymýšľa (Martin opakovane 7. 10.).
- Všade ten istý textový editor (TextovePolia) a tá istá galéria (GaleriaEditor s popisom fotky), aj pri oznamoch a udalostiach. Martin to nechce opakovať (7. 10.).
- Pri prvom príchode a pri novej zbierke je modul neutrálny: žiadne sumy, darcovia, QR, Z-číslo ani štatistiky. Cieľ je doladiť za 5 minút, nie riešiť znova (7. 10.).
- Žiadny prepínač „beží“ pri teste. Spolu vytvoríme jednu zbierku a otestujeme každé pole (7. 10.).
- Pri kreslení treba premýšľať, komu a kde to ide, nie len vymieňať slová.
- Ja som Martinova CTO poradkyňa: smiem navrhovať zlepšenia, robím ich až po súhlase.
- Stránka farnosti musí byť pre mladých, stredný vek aj starších: text min. 16 px, štítky 14 px, plná farba písma, tlačidlá 44 – 48 px.
- Viera je konzervatívny svet, nie príliš výrazný štýl. Stránka však má byť pekná, nie suchá.
- Viera má svetlý aj tmavý režim ako ostatné sektory.
- Optika stránky farnosti (Martin + Fero 6. 10.): nie náhrada farskej stránky, nie Facebook, ale nástenka živej komunity. Každý blok je niečo, čo veriaci môže hneď urobiť. Informácie sú len podklad.
- Mená darcov pri farnosti sú vždy bez súm. Kto nemá, nemá byť trestaný.
- V celom module Viera nie je „Anonymný darca“, ale „Bohu známy darca“ (6. 10.).
- Kóderovi sa posielajú čiastkové balíky po jednom, ďalší až po kontrole. Poradie je v kod/karty/PORADIE-farnost.md (7. 10.).
- Kontrolu kódera robím cez GitHub (SamueEel90/DEED, vetva platby-modul).
- Tlačidlá dávajú odozvu na sebe a z každej obrazovky musí byť cesta späť.

## 2 · Rozhodnutia o vzhľade a tokoch
### Verejná stránka farnosti (Farnosť v3)
- Prvé kolo návrhov len pre PC (6. 10.).
- Pás NAŽIVO preč.
- Videá sú dvojstupňové: nedeľný príhovor je 14 dní na očiach („Vypočuj si“), potom sa presunie dole medzi videá. Dole je galéria videí.
- Filiálka je samostatná stránka. Farár píše oznam raz a odklikne, kde sa zobrazí (centrálna, filiálky, všade).
- Čo smie veriaci pridať sám (napr. jubileum, úmrtie), farár povolí v Nastaveniach, aby ho ľudia neotravovali.
- Úvod je ako pri charite: obrázok charakteru farnosti, pod ním popis, potom hlavná (centrálna) zbierka, potom oznamy.
- Hlavná zbierka je na titulnej stránke vkusne zakomponovaná, bez popisu, na čo ide.
- Pod hlavnou zbierkou je sektor zbierok: zbierka na najbližšiu omšu, potom účelové (nové lavice, organ…), najviac 4 karty. Informačná časť je nižšie.
- Oznam a udalosť sú dve rôzne veci. Oznam môže byť suchý (len text). Udalosť je pútavá pozvánka s fotkou (púť, deti, Vianoce, brigáda).
- Oznam aj parte môžu mať fotku. Parte si veriaci vytvorí u nás alebo nahrá vlastný plagát.
- Bloky sú pomenované slovesom: Príď, Vypočuj si, Modli sa s nami, Spomíname, Teš sa s nami, Pomôž. Potom podklad (oznamy, omše, farský úrad, filiálky) a videá.
- Spomíname má vlastný tichý pás a nie je v jednom rade s jubileami.
- Udalosti majú tlačidlá Prídem a Do kalendára.
- Riadok Dnes ukazuje dnešnú omšu a zmenu programu červenou.
- Na mobile sa zbierky posúvajú vodorovne.
- Na stránke vybraný hlavný návrh: Nástenka (6. 10.). K nej rovnaké sekcie v šate Kronika a Pirát, takže sú tri verzie na testovanie v appke.
- Pri farnosti je namiesto kovu štítu strieborná linka a strieborné kovové nadpisy.
- Výklad pri farnosti nie je.
### Zbierky farnosti
- Farnosť má jeden účet. Fara má prehľad, kedy a odkiaľ prišli peniaze.
- Zbierka na najbližšiu omšu: farár si v kalendári nastaví omše a zbierka sa k nim viaže. Pri jednej nedeľnej omši sa okno otvorí v pondelok a zavrie v nedeľu v noci. Je to ako dar do zvončeka.
- Pôvodne (6. 10.): meno darcu a suma sa ukazujú od 2 €. Vyťaženie zvončeka sa zapíše ako jeden darca („Zvonček nedeľná omša 22. 5. 2026“).
- Neskôr (model Martin + Fero, 6. 10. večer): všetky zbierky farnosti tečú na jeden účet, hlavná zbierka už obsahuje ostatné (nikdy dve čísla ako súčet). Omšové okno je pondelok až nedeľa, mená bez súm len kým beží, potom jeden riadok „spoločný dar farníkov“. Účelová zbierka má verejné počítadlo navždy. Sumy len cez DEED, hotovosť do appky nevstupuje.
- Pri farnosti sa nehovorí „rieka a potôčiky“. Martin chcel iný, pragmatický príklad (7. 10.).
- Hlavná zbierka sa volá „Hlavná zbierka farnosti“, na profile „Podporiť farnosť ›“ (7. 10.).
- Hlavná zbierka = Správa centrálnej zbierky charity bez sektorov, dorovnania a dokladov. Záložky: Nastavenie, Štatistiky, Ukončenie (7. 10.).
- Prvý príchod: v Zbierkach vľavo hore tlačidlo „+ Pridať hlavnú zbierku farnosti“. Po vytvorení je na jeho mieste hotová zbierka. Tlačidlo sa vráti len po zmazaní (7. 10.).
- Hlavnú zbierku nejde zmazať, kým beží iná zbierka farnosti. Bez hlavnej sa iná zbierka nezaloží (7. 10.).
- Ďalšie zbierky farnosti: celá cesta tvorby a Správa zbierky ako pri charite.
- Tretí prípad: farnosť ako overovateľ (pohrebná zbierka).
### Parte a pohrebná zbierka (farnosť ako overovateľ)
- Ak farár povolil smútočné oznámenia, veriaci vytvorí parte na stránke farnosti sám. Ak nie, donesie oznam (USB, mail) a farár ho nahrá ako plagát, alebo pošle fotku a farár vytvorí parte zo šablóny v Správe (7. 10.).
- V hlavičke je vždy farnosť (ako pri charite), aby bolo jasné, kto je za zbierku zodpovedný.
- Pozostalý musí prísť za farárom s telefónom (overenie, že je tam fyzicky).
- Farár pri QR farnosti v appke zapne rolu Overovateľ (namiesto Organizátora pri charite). QR sa zobrazí na jeho mobile alebo PC, platí 15 s a sám sa obnovuje.
- Pozostalý naskenuje. Pri skene nie je kód.
- Farár vytvorí parte zo šablóny alebo vyberie parte zo zoznamu a dá Pripojiť zbierku. Pribudla aj možnosť nahrať vlastné parte.
- Pri vlastnom parte stačí meno a priezvisko, pri žene rodená, a nepovinne kedy a kde bude pohreb (keď ešte termín nevedia). Text je nepovinný a dá sa doplniť. Platí pre oba prípady (šablóna aj vlastné).
- Vybehne rozdeľovací modul: farnosť najviac 3 %, môže aj menej, alebo 100 % pre pozostalého.
- Rozdelenie: pohyblivý bežec alebo kroky po 0,5 %.
- Pri rozdelení je info: maximálna odmena pre farnosť je 100 €.
- Farár dá Zapečatiť, pozostalému príde kód ako upozornenie v appke (platí 5 min, Poslať znova), napíše ho a potvrdí. Tým súhlasí s rozdelením a zbierka je vytvorená s platobným modulom.
- Zbierka beží do 7 dní po pohrebe, farár ju môže ukončiť skôr.
- Rozpor v starom zadaní (3 % cirkvi verzus „cirkev zarába oddelene“) vyriešil Martin: 0 – 3 %, max 100 €.
### Správa farnosti v2
- Omše a kalendár: mesačný návrh bol ťažký, nedal sa rýchlo zmeniť čas a Pridať omšu nefungovalo. Pribudli prepínač Týždeň · Mesiac · Rozvrh, − / + pri omši a pridanie pohrebu, svadby, krstu a udalosti (7. 10.).
- Pohreb, krst a iné majú meno, aby to vedel farár aj ľudia na stránke (7. 10.).
- Farár si prepne, či bude omše upravovať týždenne alebo mesačne.
- Viac farností: môžu to byť samostatné farnosti s vlastným IČO, ale farár je jeden správca (7. 10.).
- Prehľad: čísla hore (ako charita), pod nimi Pripnuté, najviac 8. Vedľa hlavnej zbierky je posledná omšová zbierka.
- Všetky čísla sú hore v jednom riadku, „Hlavná“ = „Vyzbierané“ (jedno číslo).
- Sledujúci nie sú medzi peniazmi, ale oddelene. Počet darov a pravidelná podpora patria do Štatistík.
- Každé číslo má vlastný rámček, aby bol každý údaj samostatný.
- Treba vybaviť: ukazuje sa len jedna úloha, na konci × na skrytie. Úlohy vznikajú samy. Ohlášky sa pripomínajú len ak si to farár zapol.
- Nastavenia aplikácie a účtu sú rovnaké ako pri charite (karta 35). Rozdiely: bez dokladov a dorovnania. Reťaz dobra pri Viere zatiaľ nie. Rola Overovateľ. Evanjelici majú aj dozorcu s rovnakými právami ako farár. Údaje z registra cirkevných právnických osôb. Program 35 € zatiaľ. Súhlasy doplníme po konzultácii praxe. Vlastné časté otázky. Vzhľad a prístupnosť si môže nastaviť charita aj farár.
- Tlačidlo Nastavenia v ľavom stĺpci Správy je hneď pod Verejným profilom (bod 157).
- Ťuk na zbierku otvára Správu zbierky tak, aby sa dalo vrátiť späť.

## 3 · Prototypy a dokumenty
- prototypy/Farnost v3 - napady.dc.html: prvé 3 nápady (1a, 1b, 1c). 1b bol vymenený za Kalendár farnosti, potom všetko zamietnuté.
- prototypy/Farnost v3 - nastenka.dc.html: hlavný návrh. 4a Nástenka PC (svetlý + tmavý), 5a mobil 390, 6a Kronika PC, 6b Pirát PC.
- odovzdanie-celok/farnost-v3-nastenka-svetly.png, -tmavy.png a farnost-v3-nastenka.md: vizuál a popis pre iný chat.
- prototypy/Sprava farnosti v2.dc.html: Správa farnosti PC (Prehľad, Zbierky, pohrebná zbierka 5 krokov, Omše a kalendár, Oznamy, prepínač farností, Nastavenia, hore odkazy na správne verzie stránok).
- prototypy/Sprava hlavnej zbierky farnosti.dc.html: kópia Správy centrálnej zbierky charity, prázdny stav so Spustiť, ‹ Späť do Správy farnosti.
- kod/karty/56-farnost-v3.md, 56A-drobnosti.md, 56B-zbierky-farnosti.md, 56C-verejna-stranka-farnosti.md, 57-sprava-farnosti-v2.md, 58-pohrebna-zbierka.md, 59-viac-farnosti.md, PORADIE-farnost.md.
- kod/OPRAVY-platby-modul.md: body 157, 158, 159, KONTROLA 19 a 20.
- PRAVIDLA-APPKY.md, ODOVZDANIE.md (sekcia 0, stav 7. 10.), github.md (sync 6. 10.).
- uploads/zbierky-farnosti-model.md (od Martina a Fera) a jeho kópia v odovzdanie-celok/.
- Celý balík je v odovzdanie-celok/.

## 4 · Rozrobené a nedokončené
- Test hlavnej zbierky farnosti na PC s Martinom pole po poli.
- Mobil hlavnej zbierky a Správy farnosti až po schválení PC.
- Cesta tvorby centrálnej zbierky pri charite: Martin mal ukázať, kde je, aby sa skopírovala namiesto mojej.
- Tipy na pravidelný dar pri farnosti (dnes charitné).
- Cena ďalších spravovaných farností.
- Súhlasy v Nastaveniach farnosti: doplniť po konzultácii praxe.
- Dozorca a obdoby v iných náboženstvách: zistiť.
- Správa zbierky (účelová) je stále charitná verzia, pre farnosť ju treba upraviť (bez dokladov, Bohu známy darca, omšové okno).
- Karty 56B, 56C, 57, 58, 59 čakajú na poslanie kóderovi po jednej (56A hotové, KONTROLA 20).
- Karta 56B bola napísaná pred testom hlavnej zbierky. Ak sa pri teste niečo zmení, treba ju doplniť.
- Reťaz dobra pri Viere: zatiaľ nie, rozhodnúť neskôr.

## 5 · Zamietnuté nápady a prečo
- Prvé 3 nápady stránky (1a, 1b, 1c): Martinovi sa nepáčili.
- 1b Vývesná skrinka: príliš výrazné pre konzervatívny svet viery.
- 1b Kalendár farnosti (všetko podľa dní): nepáčil sa.
- Návrhy príliš suché: stránka má byť aj pekná, nie len informačná.
- Ďalšie kolo návrhov: Martin dal všetky vymazať a začať s optikou „nástenka živej komunity“.
- Omše ako hlavný obsah hore: sú len podklad, idú dole.
- Menovité sumy pri zbierke: kto nemá, nemá byť trestaný.
- Parte v jednom rade s jubileami: nepatrí to k sebe.
- Stránka ako prefarbená Kronika charity: farnosť má iné skutky, má vyzerať inak.
- „Rieka a potôčiky“ ako vysvetlenie pre farára: Martin chcel pragmatický príklad.
- Vlastná nová cesta tvorby a Správy hlavnej zbierky: zbytočné, hotové je v charite, kopíruje sa.
- Prepínač „beží“ pri teste: testujeme naozaj, pole po poli.
- Zápis vyťaženia zvončeka ako jedného darcu: hotovosť do appky nevstupuje (model 6. 10. večer).
- Mesačný kalendár omší ako jediný: príliš veľa práce pre farára, pribudol týždenný.
- Čísla v jednom riadku bez rámčekov: zlievali sa.
- Sledujúci medzi peniazmi: nie sú to peniaze.
- Viac úloh v Treba vybaviť naraz: len jedna a ×.
- Kód pri skene QR: kód je až pri zapečatení.
- Bežec po 1 %: Martin chcel po 0,5 %.
- Otváranie Správy zbierky v tom istom okne bez Späť: nedalo sa vrátiť.
- Reťaz dobra vo Viere: zatiaľ nie.
