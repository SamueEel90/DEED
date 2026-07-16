# DEED — Smútočný oznam (úmrtie): DEV podklad

*Pre kódovanie do testovacieho modulu (Samuel). Modul Náboženstvo. Rozhodnuté Martin + Fero, 6. 7. 2026.*

---

## 1 · Účel

Vytvorenie dôstojného smútočného oznamu — buď do pripravenej šablóny, alebo z vlastného grafického parte (obrázok). Vytvorí ho rodina/komunita, ide von hneď (auto-publish). Voliteľná pohrebná zbierka sa pripája **len cez farára**.

## 2 · Kto tvorí a publikuje

| Vec | Kto | Publish |
|---|---|---|
| **Smútočný oznam** | user (KYC) | **auto-publish**; farár/nahlásenie môže zmazať |
| **Pohrebná zbierka (peniaze)** | **LEN farár** | farár vytvorí/schváli |

- Poistka pri ozname = **KYC + 10-ročný ban** za zbytočný/falošný oznam (nie predbežná moderácia).
- **Oznam patrí komunite, zbierka farnosti.** User sám zbierku NIKDY nespustí.
- Feed: **farský**.

## 3 · Dva režimy vytvorenia oznamu

- **Režim A — šablóna:** user vyplní polia → systém vyrenderuje do vybranej šablóny (1/2/3).
- **Režim B — vlastné parte ako obrázok:** user nahrá hotový grafický oznam (foto/obrázok).
- **V oboch režimoch sú POVINNÉ štruktúrované polia, zobrazené POD oznamom.** Obrázok je pre oko, polia sú pre systém (kalendár, notifikácie, vyhľadávanie, odkaz na pohrebnú zbierku). Bez polí je nahraný obrázok „mŕtvy".

## 4 · Polia a poradie formulára

1. **Meno** (koho spomíname) — *povinné*
2. **Dátumy:** nar. – zom., **vedľa vek** (vek sa dopočíta z dátumov) — *povinné*
3. **Verš** — výber z prednastavených + možnosť vlastného — *odporúčané*
4. **Rozlúčka:** **kde + kedy** (miesto · dátum · čas) — *povinné*
5. **Foto** — režim A: voliteľné; režim B: samotný obrázok oznamu, povinný
6. **Výber šablóny** (1 / 2 / 3) — režim A
7. **Ukážka** (preview)
8. **Potvrdiť** → publikovať

**Povinné minimum (oba režimy):** meno · dátum(y)/rok · čas + miesto rozlúčky. Bez nich sa nedá potvrdiť.

## 5 · Šablóny (vzory)

- **A — Klasická (parte):** krémová, formálna, krížik †, verš. Pre tradičnú/konzervatívnu farnosť.
- **B — Teplá (so sviečkou):** tmavá, zlaté akcenty, sviečka, tlačidlo „Zapáliť sviečku" (= kondolencia).
- **C — Minimalistická:** veľká fotka v popredí, čistá.

(Vizuálne mockupy sú v návrhu — Fero, ukážka „smutocny_oznam_sablony_3".)

## 6 · Akcie na karte oznamu

- **Srdiečko** (= kondolencia — kontextová reakcia) · **Zdieľať**.
- **Žiadne komentáre** — železné pravidlo platformy.

## 7 · Pohrebná zbierka (voliteľná — LEN farár)

- Farár môže k úmrtiu pripojiť **pohrebnú zbierku** so splitom (rodina / kostol) cez bežec.
- **Bežec v Náboženstve:** 0 % povolené (kostol dobrovoľný), krok 5 %, žiadna fronta. (Viď „Split bežec — pravidlá pre Sama".)
- **Príjemca (pozostalý) = registrovaný user**, prepojenie cez **consent-QR** (jednorazový, potvrdenie príjemcu v appke) — NIE verejný share-QR.
- Settlement **€** (rok 1 / EURC rail — viď token architektúra). Feed iba farský.

## 8 · Dátový model (náčrt)

### `SmutocnyOznam`
```
{ id, autorId (KYC), mode: "template" | "image", templateId? (1|2|3), imageUrl?,
  meno, datumNar, datumUmr, vek (computed), vers?, rozluckaMiesto, rozluckaDatumCas,
  status: "published", createdAt, feed: "farsky" }
```
### Napojená pohrebná zbierka (voliteľná)
```
{ collectionId (vytvorená farárom), recipientId (registrovaný), split[], settlement: "EUR" }
```

## 8b · Platnosť oznamu (TTL) — všeobecná vlastnosť oznamov

- **Default 7 dní**, po ktorých oznam **mizne z feedu** (odpratanie feedu + šetrenie miesta). **Nastaviteľné** — tvorca zadá vlastný počet dní.
- **Pri úmrtí naviazať na dátum rozlúčky:** platí **min. do rozlúčky + pár dní** (napr. rozlúčka + 3), alebo 7 dní — **čo je neskôr**. Nikdy nesmie zmiznúť pred udalosťou, ktorú ohlasuje.
- **„Preč z feedu" ≠ „hard delete":** po expirácii sa oznam skryje z feedu. Bežné info oznamy (jubileum, poďakovanie) sa môžu aj zmazať (šetrí miesto). **Oznamy s napojenou zbierkou / peniazmi sa NEMAŽÚ** — transakčný záznam sa uchová (účtovníctvo/legal); z feedu preč, záznam archivovať.
- Platí aj pre ostatné oznamy (zmenové, jubilejné, poďakovanie, prosba o modlitbu) — zmenové navyše prirodzene expirujú po dátume udalosti.

## 9 · Akceptačné kritériá

1. Oznam sa dá vytvoriť oboma režimami (šablóna / vlastný obrázok).
2. Bez povinných polí (meno · dátumy · čas + miesto rozlúčky) sa **nedá potvrdiť**.
3. Povinné polia sa zobrazia **POD oznamom** aj pri nahranom obrázku (režim B).
4. Oznam **publikuje auto** (user KYC); farár/report ho vie stiahnuť.
5. **Pohrebnú zbierku pripojí LEN farár**; user ju nevytvorí.
6. Peniaze routujú **len na registrovaného príjemcu cez consent-QR**.
7. Verš = výber + vlastný. Reakcia = **srdiečko**. **Žiadne komentáre.**
8. Poradie polí presne: meno → dátumy+vek → verš → rozlúčka (kde+kedy) → foto → šablóna → ukážka → potvrdiť.
9. **Platnosť:** default 7 dní, nastaviteľné; po expirácii oznam mizne z feedu. Pri úmrtí **neexpiruje pred rozlúčkou**. Oznamy s napojenou zbierkou sa z feedu skryjú, ale záznam sa **uchová (nemaže sa)**.

---

*— Fero pre Martina → Samuel, 6. 7. 2026 —*
