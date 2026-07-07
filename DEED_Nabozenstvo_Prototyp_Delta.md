# Prototyp Náboženstvo — čo dokódovať (delta)

*Pre kódovací chat/nástroj. Prototyp beží zo staršieho kontextu a nemá dnešné rozhodnutia. Toto je zoznam zmien, aby dobehol. Zdroj pravdy = `Strom_Polia_Matica`, `Kalendar_Rozvrh_DEV`, `v1.1_rozhodnutia`. Prioritizované.*

---

## 1 · Split QR slider — farárov jazyk (immediate)
Súčasný stav: „Rozdeliť platbu (influencer)", labely „cico — zvyšok", „ide ďalej — komu koľko", default 30/70.
Zmeniť na:
- Nadpis **„Rozdeliť dar"** (nie „platbu (influencer)").
- Labely: **„Rodine (pozostalí)"** + **„Kostolu — dar na sviečky, výzdobu (dobrovoľné)"**. Preč „cico / zvyšok / ide ďalej".
- Default **rodina veľká, kostol malý** (napr. 97/3), nie 30/70. Rodina nastaví lištou.
- Min 3 % na príjemcu; ak rodina nechce dať kostolu, **kostol nepridá** (nie ťahanie na 0).
- Ostáva: „pridať charitu/žiadosť", „% sa po vytvorení zafixujú", „Vygenerovať split QR".
- Zdroj: Matica → „Rozdeliť dar (Split QR — farársky variant)".

## 2 · Reakcia = SRDIEČKO, nie palec/Like
V module Náboženstvo je reakcia **srdiečko** (Core má palec, nemiešať). Kontextovo: pri úmrtí/pohrebe „kondolencia", pri prosbe o modlitbu „modlím sa".
Zdroj: Matica → Univerzálne pravidlá; rozhodnutia bod 83, 85.

## 3 · Farská karta BEZ karmy
Preč „Silver" a akýkoľvek level/rebríček na cirkevných subjektoch. Ostáva len badge **„overená"**.
Zdroj: rozhodnutia bod 40–41, 49, 53.

## 4 · Ticker: cirkev dostáva €, nie DEED
„Farnosť Trenčín dostala 200 DEED" → cirkev dostáva **€**. Znenie napr. „darca poslal 200 DEED → zbierke padlo X €". NEsľubovať „plnú sumu".
Zdroj: rozhodnutia bod 37, 39b.

## 5 · „+" strom podľa matice
4 vetvy (Zbierka · Udalosť · Oznam · Dobrovoľníctvo), každý uzol má svoje polia a akcie (kto tvorí, Prispieť len ak zbierka, RSVP/Pripomeň len pri dátume, omša bez RSVP). „+" je **kontextové** (user vidí len Oznam; farár celý strom).
Zdroj: Matica (celá) + „Vstupné body pridávania".

## 6 · Kalendár + rozvrh omší (nové UI)
Rozvrh: predvolené časy (nastav raz) + týždenný vzor → omše sa generujú samé; sviatky predvyplnené; výnimky ručne cez zaškrtávacie políčka v dni. Kalendár mesačný s farbami podľa typu.
Zdroj: `Kalendar_Rozvrh_DEV` (celý).

## 7 · Zbierka — tri módy podľa príjemcu
A) farnosť = ľahká vetva; B) iný, už registrovaný = QR-merge (consent-QR + potvrdenie príjemcu v appke, NIE verejný share-QR); C) iný, neregistrovaný = plný Help wizard.
Zdroj: rozhodnutia bod 73–78; Matica sekcia 1.

## 8 · Overujem / Namietam na kartách prípadov
Pravosť rieši **komunitné Overujem/Namietam** (reuse z Help/Core), NIE „záruka/garant" cirkvi. Preč jazyk „farnosť ručí za pravosť".
Zdroj: rozhodnutia bod 78.

## 9 · Žiadne komentáre — nikde
Železné pravidlo. Len štruktúrované akcie (srdiečko · zúčastním sa · zdieľať · prispieť). Žiadna diskusia pod príspevkom.
Zdroj: rozhodnutia bod 85.

## 10 · Adresár — chýba vedený výber + potvrdenie
Súčasný stav: dva ploché taby (Farnosti / Cirkvi), sorting funguje, ale **riadky nie sú akčné** — nedá sa vybrať cirkev/farnosť ani nič potvrdiť. Farnosti sú navyše pomiešané cez všetky vyznania.
Zmeniť na:
- Každý riadok **klikateľný → „vybrať / nastaviť ako domovskú / pridať k obľúbeným" → potvrdiť**.
- **Vedená sekvencia** namiesto plochých tabov: `poloha → vyznanie → farnosti TEJ cirkvi podľa vzdialenosti → vyber domovskú → potvrď`.
- **Farnosti scopovať podľa zvolenej cirkvi** (nie všetky vyznania v jednom zozname).
- Nechať: sorting (abeceda/rodiny/najbližšie), geo na úrovni farností, fallback „napíš obec", „18 cirkví sa nerebríčkuje".
- Zdroj: rozhodnutia bod 1–5 (sekcie A, B).

## 11 · Overujem/Namietam LEN na Help prípadoch jednotlivcov
NIE na pohreb / svadbu / oznamy. „Niekto zomrel — Namietam" je netaktné aj zbytočné. Pravosť pohrebu/svadby = **overená farnosť + farár schválil + registrácia (dom smútku, rodina)**; na zriedkavý fake stačí **nahlásiť (vlajka)**, nie verejné hlasovanie. Overujem/Namietam ostáva len tam, kde ide o núdzu jednotlivca s rizikom podvodu (Help).
Zdroj: rozhodnutia bod 78 (scope spresnený).

## 12 · Oznamy = bez donation tlačidiel
Ohlášky, jubilejný, poďakovanie, prosba o modlitbu — **len Srdiečko + Zdieľať**, žiadne „Podporiť / 10-50-100 DEED / Prispieť" (nemajú napojenú zbierku). Karta „Bez zbierky, len oznam" si nesmie sama protirečiť donate tlačidlami. „Prispieť" len ak je oznam napojený na zbierku (napr. úmrtie → pohrebná zbierka).
Zdroj: Matica sekcia 3 (OZNAM).

## 13 · Render karty = SRDIEČKO, nie palec
Karty ešte zobrazujú palec (thumbs-up); formulár už má srdiečko správne. Zjednotiť aj na renderi karty.
Zdroj: bod 2 vyššie.

---

*Postup: kódovaciemu chatu priložiť tri zdrojové dokumenty + tento delta. Fero, 6. 7. 2026.*
