# DEED — Oznámenie o úmrtí (parte): DEV podklad

*Pre Samuela. Modul Náboženstvo. NAHRÁDZA a upratuje predošlý „Smútočný oznam" (to bolo zavádzajúce). Rozhodnuté Martin + Fero, 6. 7. 2026.*

---

## 0 · DÔLEŽITÉ — zbierky sem NEPATRIA

Oznámenie o úmrtí je **len oznam**. **Žiadne peniaze, žiadna zbierka, žiadny odkaz na zbierku.** Farár spravuje zbierky vo **svojej samostatnej sekcii zbierok** (jedno miesto, aby v tom nebol zmätok). Ak rodina chce pohrebnú zbierku, farár ju vytvorí **v ZBIERKACH — samostatne**, mimo tohto oznamu.

## 1 · Účel

Dôstojné oznámenie úmrtia (parte) — buď do pripravenej šablóny, alebo z vlastného grafického parte (obrázok).

## 2 · Kto tvorí a publikuje

- **Tvorí:** user (KYC) → auto-publish (farár môže zmazať), alebo farár. **Hlavička = meno tvorcu z registrácie.** **Feed: farský.**
- Poistka: **KYC + 10-ročný ban** za zbytočný/falošný oznam.

## 3 · Dva režimy

- **A — šablóna:** vyplň polia → render (1/2/3).
- **B — vlastné parte ako obrázok:** nahraj hotový obrázok.
- V oboch: povinné štruktúrované polia **pod oznamom** (kalendár, notifikácie, vyhľadávanie).

## 4 · Polia a poradie

1. **Meno** *(povinné)*
2. **Dátumy** nar. – zom., vedľa **vek** (dopočíta sa) *(povinné)*
3. **Verš** — výber z prednastavených + vlastný *(odporúčané)*
4. **Rozlúčka:** kde + kedy (miesto · dátum · čas) *(povinné)*
5. **Foto** — režim A voliteľné; režim B = obrázok parte, povinný
6. **Výber šablóny** (1/2/3) — režim A
7. **Ukážka → Potvrdiť**

Povinné minimum: meno · dátum(y) · čas + miesto rozlúčky.

## 5 · TEXT — formátovateľný (NEZABIŤ)

Rich text (B·I·H·odrážky·číslovanie·odkaz), zachovať odseky a zalomenia. **Vloženie z Wordu (paste) MUSÍ prežiť** — nezlepiť do „machule". Nový kód to nezregresuje (delta bod 14).

## 6 · Šablóny (vzory)

A — Klasická (parte, krémová, krížik †) · B — Teplá (so sviečkou, „Zapáliť sviečku" = kondolencia) · C — Minimalistická (foto v popredí). Mockup: „smutocny_oznam_sablony_3".

## 7 · Akcie a reakcia

**Srdiečko (= kondolencia) · Zdieľať.** Žiadne komentáre. **Žiadna zbierka, žiadne Prispieť.**

## 8 · Platnosť (TTL)

Default 7 dní, nastaviteľné; **neexpiruje pred rozlúčkou** (platí min. do rozlúčky + pár dní). Po expirácii z feedu preč.

## 9 · Dátový model (náčrt)

```
OznamenieUmrtie {
  id, autorId (KYC), mode: "template" | "image", templateId? (1|2|3), imageUrl?,
  meno, datumNar, datumUmr, vek (computed), vers?,
  rozluckaMiesto, rozluckaDatumCas,
  text? (rich, zachovať formát),
  status: "published", feed: "farsky", platnostDo
}
```
(Žiadne pole zbierky. Zbierka je samostatná entita v sekcii zbierok.)

## 10 · Akceptačné kritériá

1. Vytvoriteľné oboma režimami (šablóna / vlastný obrázok).
2. Bez povinných polí (meno · dátumy · čas + miesto rozlúčky) sa nedá potvrdiť.
3. Povinné polia sa zobrazia **pod oznamom** aj pri obrázku (režim B).
4. **NIKDE v ozname nie je zbierka ani odkaz na zbierku.**
5. TEXT formátovateľný, paste z Wordu prežije.
6. Reakcia srdiečko, Zdieľať, žiadne komentáre.
7. TTL default 7 dní, neexpiruje pred rozlúčkou.
8. Poradie polí presne podľa §4.

---

*— Fero pre Martina → Samuel, 6. 7. 2026. Starý súbor „DEED_Smutocny_Oznam_DEV" je týmto nahradený (možno zmazať).*
