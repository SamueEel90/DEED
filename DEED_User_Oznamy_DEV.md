# DEED — User oznamy (Jubilejný · Poďakovanie · Prosba o modlitbu): DEV podklad

*Pre kódovanie do testovacieho modulu (Samuel). Modul Náboženstvo. Rozhodnuté Martin + Fero, 6. 7. 2026.*

---

## 1 · Účel a filozofia

**Feed tvorí primárne farár.** User self-add nie je „daj veriacim hlas" — je to **odbremenenie farára**, aby mu ľudia nebuchali na dvere kvôli každému jubileu či poďakovaniu. Je to **voliteľné** — farár si to zapne/vypne (prípadne spoplatní).

## 2 · Kto tvorí a publikuje

- **Tvorí: user (KYC) → auto-publish** (ak má farnosť self-add zapnutý). **Hlavička = meno usera z registrácie.** Farár môže zmazať. **Feed: farský.**
- Poistka: **KYC + 10-ročný ban** za zbytočný/falošný oznam.
- **Nastavenie farnosti:** „useri pridávajú sami" ON/OFF + **voliteľný poplatok** (self-funding — poplatky pokryjú náklady appky).
- **VŽDY ZADARMO:** prosba o modlitbu + smútočné — nikdy nespoplatniť ani v platenom režime (**simónia**). Poplatok max pri jubileu / osobnom ozname.

## 3 · Dva režimy + obrázok

- **Režim A — jednoduchá karta:** user vyplní polia.
- **Režim B — vlastný návrh:** user nahrá vlastný obrázok.
- **Obrázok:** vyber z **prednastavených** (viď §5) / nahraj **vlastné foto** / **bez fota**.

## 4 · Typy, polia a poradie

### 4.1 Jubilejný (blahoželanie jubilantovi)
meno jubilanta *(pov.)* → dôvod/jubileum („90 rokov", „50. výr. sobáša") *(pov.)* → dátum *(volit.)* → text blahoželania *(formátovateľný, volit.)* → foto *(so súhlasom jubilanta)* / [režim B: vlastný obrázok] → ukážka → publikovať
**Reakcia:** srdiečko.

### 4.2 Poďakovanie (verejné poďakovanie)
za čo *(pov.)* → komu *(volit.)* → text *(formátovateľný, volit.)* → foto *(volit.)* / [režim B] → ukážka → publikovať
**Reakcia:** srdiečko.

### 4.3 Prosba o modlitbu
úmysel (za koho/za čo, **môže byť bez mena**) *(pov.)* → text *(formátovateľný, volit.)* → prepínač **„bez mena"** (súkromie — autor KYC v pozadí, obsah anonymný) → **obrázok: výber z prednastavených / vlastné / bez** → [režim B] → ukážka → publikovať
**Reakcia:** „modlím sa". **VŽDY zadarmo.**

## 5 · Prednastavené obrázky (picker)

- **Prosba o modlitbu:** spojené ruky modliaceho · horiaca sviečka · utešujúce/držané ruky · kríž / ruženec.
- Rozšíriteľné (bonus): Jubilejný = torta · kvety · balóny; Poďakovanie = srdce · kvety · spojené ruky.
- Vždy plus možnosť **vlastné foto** alebo **bez fota**.

## 6 · TEXT — formátovateľný (NEZABIŤ)

- Rich text: B · I · H · odrážky · číslovanie · odkaz. Zachovať odseky a zalomenia.
- **Vloženie z Wordu (paste) MUSÍ prežiť** — formátovanie sa nesmie zlepiť do „machule". Nový kód to nezregresuje (súvis: delta bod 14).

## 7 · Akcie a reakcie

- **Reakcia (kontextová):** Jubilejný/Poďakovanie = srdiečko · Prosba = „modlím sa". + **Zdieľať**.
- **Žiadne komentáre** (železné pravidlo). **Bez zbierky / Prispieť** (zjaví sa len ak by bol oznam napojený na zbierku).

## 8 · Platnosť (TTL)

- **Default 7 dní**, nastaviteľné. **Prosba o modlitbu** môže mať dlhšiu (modlitby bežia dlhšie, napr. 9 dní). Po expirácii z feedu preč. (Zbierka = samostatná entita, TTL oznamu ju nerieši.)

## 9 · Dátový model (náčrt)

```
UserOznam {
  id, autorId (KYC), typ: "jubilejny" | "podakovanie" | "prosba_o_modlitbu",
  mode: "card" | "image", imageMode: "preset" | "upload" | "none", presetId?, imageUrl?,
  // polia podľa typu:
  menoJubilanta?, dovod?, datum?, komu?, umysel?, bezMena? (bool),
  text? (rich, zachovať formát),
  status: "published", feed: "farsky", platnostDo,
  spoplatnene? (bool — nikdy pri prosbe/smútočnom)
}
```

## 10 · Akceptačné kritériá

1. Tri typy: jubilejný, poďakovanie, prosba o modlitbu — každý so svojím poradím polí (§4).
2. Dva režimy (karta / vlastný obrázok). Obrázok: preset / vlastné / bez.
3. **Prosba o modlitbu má picker prednastavených obrázkov** (spojené ruky, sviečka, utešujúce ruky, kríž/ruženec).
4. **TEXT je formátovateľný a paste z Wordu prežije** — nový kód to nezregresuje.
5. Reakcia kontextová (srdiečko / „modlím sa"), Zdieľať, žiadne komentáre, bez zbierky.
6. Publish = auto (user KYC), ak farnosť má self-add zapnutý; farár môže zmazať.
7. **Self-add ON/OFF + poplatok = nastavenie farnosti.** Prosba o modlitbu a smútočné **vždy zadarmo** (simónia).
8. „Bez mena" pri prosbe skryje autora v obsahu (KYC ostáva v pozadí).
9. TTL default 7 dní (prosba nastaviteľná dlhšie); po expirácii z feedu preč.

---

*— Fero pre Martina → Samuel, 6. 7. 2026 —*
