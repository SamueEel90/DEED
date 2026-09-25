# Počítadlo do streamu — čo ešte doplniť

Zadanie na dokončenie overlayu `/overlay/:splitId`. Základ je postavený
a funkčný, tento dokument hovorí, čo k nemu pribudne a v akej podobe.

---

## 1. Čo už existuje (nepredrábať)

| Vec | Stav |
|---|---|
| stránka `/overlay/:splitId` mimo appky, bez hlavičky a service workera | hotové |
| priehľadné pozadie pre OBS | hotové |
| názov zbierky, vyzbierané / cieľ, pruh, %, posledný darca | hotové |
| zvýraznenie pri novom dare (4,5 s) | hotové, ale len zmena farby a rámu |
| `?tema=svetla` / tmavá (default) | hotové, ale len dva odtiene, nie plná paleta |
| `?demo=1` — sám si vymýšľa dary každých 5 s, po naplnení skočí na ďalšiu zbierku | hotové |
| pri výpadku ostáva posledný stav, žiadna chybová hláška | hotové |
| panel v appke: odkaz, voľby, živý náhľad, návod do OBS | hotové |
| zoznam QR kódov tvorcu + výber, ktorý počítať | hotové |

Súbory: `src/features/overlay/Overlay.tsx` (vzhľad), `zdroj.ts` (dáta),
`PocitadloSheet.tsx` (panel v appke), `PocitadloVyber.tsx` (výber QR).

---

## 2. Dátový kontrakt

Komponent dnes dostáva objekt `StavOverlay`:

    nazov           string    názov aktuálnej zbierky
    vyzbierane      number    € spolu
    ciel            number    € cieľ
    poslednyDarca   string?   v podobe, ktorú si darca sám zvolil
    poslednaSuma    number?   € posledného daru
    pecat           number    rastie pri každom novom dare → spúšťa zvýraznenie

**Pribudne jedno pole:**

    naposledy       number    čas posledného ÚSPEŠNÉHO načítania dát

Bez neho sa nedá spraviť bodka „naživo" (bod 3.4). Percentá, míľniky ani
zostatok do cieľa sa neposielajú — počítajú sa z `vyzbierane` a `ciel`.

---

## 3. Čo pribudne vo vzhľade

### 3.1 Bublina pri novom dare

Nad pásom vyskočí bublina: farebná pilulka so sumou (`+10 €`) a text
`Tomáš — ďakujeme ♥`.

- trvanie 4,5 s, potom sa vytratí nahor
- suma sa v páse napočíta (nie preskočí) z pôvodnej na novú hodnotu
- pruh sa pružne predĺži — mierny prekmit a dosadnutie
- z konca pruhu vyletia iskry; pri dare **20 € a viac** je efekt výraznejší
- pri dvoch daroch rýchlo za sebou sa bublina nestohuje — druhá nahradí prvú

**Text bubliny:** `Tomáš · 10 €`, prípadne `Tomáš — ďakujeme`.
Tvar `daroval(a)` sa nepoužije — je to najsledovanejší pixel streamu
a zátvorka ho kazí. Meno sa berie presne v tej podobe, akú si darca zvolil
(celé meno / meno a iniciála / prezývka / mesto / Anonymný darca), nič sa
k nemu nedopĺňa a nič sa z neho neuhádza.

### 3.2 Míľniky

- pri **50 %** a **75 %** krátke poďakovanie nad pásom (rovnaký priestor ako bublina)
- pri **100 %** pruh zabliká a vyletí dvojitá dávka iskier
- každý míľnik sa ukáže **raz**; po reštarte overlayu sa už neopakuje
- v skúšobnom režime sa po dosiahnutí cieľa demo vráti na začiatok

### 3.3 Zostatok do cieľa

Pod pásom vpravo, drobným písmom: `do cieľa chýba 550 €`.
Keď je cieľ splnený, nahradí ho `cieľ splnený`.

### 3.4 Bodka „naživo"

Malá zelená bodka pri názve zbierky, jemne pulzuje.

- **spojenie beží** (posledné načítanie < 30 s): bodka svieti a pulzuje
- **spojenie vypadlo** (> 30 s): bodka **prestane pulzovať a zošedne**,
  všetko ostatné ostáva presne tak, ako bolo
- nikdy sa nezobrazí chybová hláška, prázdna obrazovka ani „načítavam"

To je jediné, čo divák z výpadku vidí, a streamer to pozná na prvý pohľad.

---

## 4. Svetlá a tmavá verzia

Prepína sa parametrom `?tema=svetla`; bez neho beží tmavá.

**Pomenovanie je podľa VIDEA, nie podľa pása** — a v appke to tak musí byť
napísané, inak si to tvorca prepne naopak:

- tmavá verzia = tmavý pás → na **svetlé** video
- svetlá verzia = svetlý pás → na **tmavé** video

| | tmavá (default) | svetlá |
|---|---|---|
| podklad pása | `rgba(8, 10, 16, .62)` | `rgba(255, 255, 255, .72)` |
| rozostrenie podkladu | `blur(6px)` | `blur(6px)` |
| okraj | `rgba(255, 255, 255, .14)` | `rgba(0, 0, 0, .10)` |
| hlavný text | `#ffffff` | `#10131a` |
| tieň textu | `0 2px 6px rgba(0,0,0,.85)` | `0 1px 2px rgba(255,255,255,.7)` |
| druhotný text (cieľ, %) | 75 % krytie hlavného | 75 % krytie hlavného |
| žliabok pruhu | `rgba(255, 255, 255, .18)` | `rgba(0, 0, 0, .12)` |
| bodka naživo | `#3FA66B` | `#2E7D52` |
| bodka pri výpadku | `rgba(255,255,255,.35)` | `rgba(0,0,0,.30)` |

**Výplň pruhu, bublina a iskry** — treba rozhodnúť, ktorá paleta platí:

- *aurora* z návrhu: modrá → fialová → mätová
- *značková* zo zvyšku appky: zelená → zlatá

Overlay je verejná tvár DEED na cudzom kanáli, takže by mal vyzerať ako
appka. Ale ak má aurora platiť ako nový vizuál celej appky, má prednosť.
**Toto je rozhodnutie, nie technická vec.**

Obe verzie musia prejsť tým istým testom: pás na bielom snehu, pás na
tmavej scéne a pás na pestrom hernom zábere. Kde text zanikne, je zle.

---

## 5. Technické pravidlá, ktoré sa nesmú porušiť

1. **Priehľadné pozadie** — `background: transparent` na `html` aj `body`.
   Nastavuje sa v `Overlay.tsx`, lebo appkový `index.css` kreslí telu vlastné
   pozadie. Bez toho bude v streame čierny obdĺžnik.

2. **Iskry a animácie z CSS, nie z canvas častíc.** Overlay beží streamerovi
   celé hodiny na tom istom stroji, na ktorom enkóduje video. Každé percento
   CPU je vidieť na kvalite streamu.

3. **Žiadna chybová hláška v obraze.** Pri výpadku ostáva posledný stav,
   mení sa len bodka naživo.

4. **Len na čítanie, verejné, bez prihlásenia.** Cez view alebo RPC, ktoré
   vracia iba: suma, cieľ, názov, zobrazované meno posledného darcu a jeho
   suma. Žiadne e-maily, ID účtov, čísla účtov. Žiadny zápis.

5. **Odporúčaná veľkosť 800 × 200**, ale pás sa musí roztiahnuť na akúkoľvek
   šírku bez rozbitia. Pri užšom okne sa ako prvý skracuje názov zbierky
   (výpustka), nikdy nie suma.

---

## 6. Živé dáta

Dary dnes žijú v prehliadači, takže OBS ich nevidí — má vlastný prehliadač.
Dopĺňa sa to na jednom mieste: funkcia `zoServera` v `zdroj.ts`.

Patrí tam:
- Realtime odber na tabuľke darov, filter na aktuálnu zbierku daného splitu
- záloha: polling každých 10 s
- pri kaskáde sa po naplnení zbierky sama vráti ďalšia zbierka v poradí
- pole `naposledy` sa nastaví pri každom úspešnom načítaní

Testovacie RLS „všetko povolené" sa na toto nesmie použiť.

---

## 7. Hotovo vtedy, keď

- [ ] nový dar: bublina, napočítanie sumy, pružný pruh, iskry
- [ ] míľniky 50 %, 75 %, 100 % — každý raz
- [ ] zostatok do cieľa pod pásom
- [ ] bodka naživo vrátane sivnutia pri výpadku
- [ ] obe témy podľa tabuľky, otestované na troch typoch videa
- [ ] žiadna zátvorka `(a)` nikde v textoch
- [ ] v OBS pri 800 × 200 aj pri 1200 × 200 vyzerá dobre
- [ ] hodinový beh v OBS bez nárastu CPU
