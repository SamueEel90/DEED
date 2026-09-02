# DEED — Rolové panely PATCH 2 (podstránky + farský engine)

**18. 7. 2026 · k DEED_Role_Panely_Sprava_v0_1 + PATCH 1 · nahrádza usporiadanie obrazovky „Môj DEED firemný"**
**Súvisí s:** DEED_Stity_v0_1 (štíty) · modul Náboženstvo (vzor)

---

## 1 · Kľúčová zmena: farský vzor namiesto kokpitu s kartičkami

Klik na „Môj DEED firemný" → zobrazí sa **entity obrazovka presne ako má fara**:

1. **Karta subjektu** — logo/foto, meno, overená, ŠTÍT (bez progresu!), 3 čísla
2. **Prehľadové bloky** (nočné panely: Dnes prišlo, Moji dobrovoľníci, Sponzorujeme... žijú tu — ako „Prehľad farnosti")
3. **Verejný obsah** — zbierky, udalosti, oznamy (čo vidí každý zvonku)
4. **SPRÁVA [typ]** — inline sekcia, vidí len držiteľ roly + delegovaní (ako „Správa farnosti")
5. Kontakt

**Jeden engine pre všetkých** (farnosť = vedomý prototyp — najkomplexnejší subjekt postavený prvý, ostatní sú podmnožiny s inými nástrojmi):

| Subjekt | Engine | Vlastné nástroje v SPRÁVE |
|---|---|---|
| Farnosť | originál | omše, Split QR pohreb/svadba, oznamy farníkov |
| Charita | ten istý | dokladovanie zbierok (POVINNÉ, netierované), dobrovoľníci + 6★, badge embed |
| Tvorca | ten istý (na profile) | reťaz prehľad, terminál (Transak), oznamy, akcie, Overená smena |
| B2B | ten istý | sponzoring, zamestnanci (opt-in), VTO, ESG export |

**DEV prepínače ZOSTÁVAJÚ:** hore na obrazovke prepínač POZÍCIE (Charita · Tvorca · B2B) + prepínač TIERU — jednoduché prehadzovanie klobúka pri testovaní. Feature flagy per PATCH 1; v produkcii preč.

## 2 · Umiestnenie vchodu

- **FINÁL (produkcia):** jednotný vchod v Core — avatar vpravo hore, tam kde ho má bežný user. Avatar = logo subjektu pri aktívnej role; klik → Môj DEED (s rolovým obsahom). Pri viacerých rolách na účte: prepínač identít („Vystupujem ako: Martin / Charita XY / Firma Z") — avatar sa mení podľa voľby.
- **TERAZ (DEV, kým neexistuje registrácia charity):** vstupná karta v module Charita ZOSTÁVA + pridať KÓPIU vchodu do **Môj profil** (položka „Môj DEED firemný" / „Moje roly" v ľavom menu). Obe vedú na tú istú obrazovku — dva odkazy, jeden obsah.

## 3 · Verejná podstránka — jednotná štruktúra pre všetky subjekty

Rola (charita, tvorca, B2B, farnosť) má **VŽDY verejnú podstránku** — rola je verejná funkcia. Súkromie má len bežný user (režim Bežná: zamknutý profil, priateľstvá so súhlasom). Checkbox „som tvorca" pri registrácii = súhlas s verejným profilom.

**Vlastník vidí TÚ ISTÚ verejnú stránku ako cudzí** + navyše inline SPRÁVU. Žiadny oddelený admin náhľad — jeden zdroj pravdy.

**Fixné poradie blokov (user sa nesmie strácať):**
1. Hero (foto/cover, meno, overená, štít, lokalita)
2. Štatistiky — 3 čísla (charita: vyzbierané/podporovatelia/úroveň · tvorca: mobilizované/prípady/úroveň · firma: podporené €/prípady/úroveň)
3. Sledovať + zvonček
4. Taby obsahu (charita: Kampane·Skutky·Talent · tvorca: Reťaz·Skutky·Akcie·Oznamy · firma: Podporujeme·Skutky·Akcie · farnosť: Zbierky·Udalosti·Oznamy)
5. O nás
6. Badge vysvetlivka („zaslúžený karmou, nie kúpený") + QR/embed profilu
7. Kontakt

**Jediná povolená odchýlka — poloha kasičky podľa účelu subjektu:** charita/farnosť zbiera = podpora hore pri štatistikách · tvorca/firma nezbiera pre seba = terminál/nič dole („skutky hore, kasička dole").

**Tvorca špecificky:** podstránka = jeho verejný profil v režime Tvorca (už existuje v prepínači Bežná·Priateľ·Tvorca) obohatený o tvorcovské bloky. Jedna identita, žiadna druhá stránka.

## 4 · Cesty k podstránke

**Vlastník:** avatar (finál) · karta v Charite + Môj profil (DEV) → farská obrazovka → v nej „Otvoriť podstránku"/priamo obsah.
**Verejnosť:** klik na meno/logo pri zbierke (existuje) · adresáre · QR/link v biu · logo pri sponzoringu · skutky vo feede.

## 5 · Adresáre

- **Charita:** existuje, nechať (katalóg dôvery: kategórie, štít, dôvera+blízkosť).
- **B2B: pridať** — výkladná skriňa + anti-greenwashing overenie. Riadok: logo, štít, odvetvie, mesto, súčet podpory. Radenie dôvera+blízkosť. **Poradie v adresári sa NIKDY nepredáva** (featured pozícia z Premium vizitky smie byť v moduloch, nie v adresári).
- **Tvorca: adresár NIE** (tvorca = osoba → zoznam FO radený štítom je krok k rebríčku fyzických osôb; objavuje sa cez obsah/QR/reťaze; prázdny adresár pri štarte = výkladná skriňa hanby). Prípadne fáza 2 „Objavuj tvorcov" (kurátorsky). Školitelia/organizátori = Profi vizitky v moduloch Aktivít.
- V riadku adresára len súhrn (štít + 1 číslo), detail na podstránke. Adresár je rázcestník, nie dashboard.

## 6 · Logo subjektu (NOVÉ — fara ho nemala)

- Do SPRÁVY (Upraviť profil) pridať **upload loga** pre všetky entity (charita, B2B, aj farnosť dodatočne). Logo = štvorcový avatar subjektu (zobrazuje sa v krúžku).
- Použitie: avatar/prepínač identít vpravo hore · riadok adresára (namiesto iniciálok LR/PL) · karta subjektu · hero podstránky (vedľa cover fota) · embed badge · logo pri sponzoringu (D++).
- Cover foto zostáva ako hero pozadie; logo je identita v malom. Tvorca logo nepotrebuje — má profilovú fotku osoby.
- Fallback bez loga: iniciálky (ako teraz).

## 7 · Badge opravy (pripomenutie z DEED_Stity_v0_1 — implementovať)

- **ZMAZAŤ progress bar z Môjho profilu usera** („Do ďalšej úrovne (Platinum) 72 %") — pravidlo platí globálne: štít + text, žiadny postup, žiadne percentá. Všetci začínajú Bronze.
- Hlavná karma = ornamentálny štít · modulová = hladký štít + gravírovaný symbol · hook `on_badge_levelup` (reveal video).
- Vysvetlivka „zaslúžený, nie kúpený" patrí na VEREJNÚ podstránku (pri badge), nie do admin nástrojov.

## 8 · Poradie implementácie (záväzné)

1. **Charita** — najbližšie k hotovej farnosti (najviac reuse), v MVP, reálne subjekty existujú. Nové kusy: dokladovanie + dobrovoľníci.
2. **Tvorca** — najľahší (profil + režim Tvorca už v kóde), odomyká tvorcovskú vrstvu (reťaze, QR).
3. **B2B** — najťažší (zamestnanci, VTO, ESG, k-anonymita) a najmenej urgentný: prvé firmy sa obslúžia ručne (concierge), self-service portál sa stavia na overenom skelete. B2B sekcia = špecifikácia do zásoby, nie zajtrajšia úloha.

---
*Nič iné sa v v0.1 + PATCH 1 nemení. — Fero*
