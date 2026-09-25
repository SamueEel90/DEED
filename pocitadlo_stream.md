# Počítadlo do streamu — kde to je a čo sa kde mení

## Odkazy na pozretie

Skúšobný režim (sám si vymýšľa dary, na nastavenie v OBS):

    http://localhost:5173/overlay/skusobne?demo=1

Svetlá téma — na tmavé video:

    http://localhost:5173/overlay/skusobne?demo=1&tema=svetla

Ostrá verzia (bez `demo`) — zatiaľ nemá odkiaľ brať dáta:

    http://localhost:5173/overlay/<splitId>

## Kde to je v appke

Profil → Moje roly → Tvorca → SPRÁVA TVORCU → **📺 Počítadlo do streamu** (od T1)

Otvorí sa zoznam QR kódov tvorcu a ku každému vlastné počítadlo. Keď tvorca
ešte žiadny QR nemá, ponúkne sa „Odskúšať v OBS" so skúšobným režimom.

## Súbory

| Súbor | Čo je v ňom |
|---|---|
| `src/features/overlay/Overlay.tsx` | **vzhľad pása** — rozmery, podklad, pruh, zvýraznenie pri novom dare |
| `src/features/overlay/zdroj.ts` | odkiaľ berie dáta + demo generátor |
| `src/features/overlay/PocitadloSheet.tsx` | panel v appke — odkaz, voľby, náhľad, návod |
| `src/features/overlay/PocitadloVyber.tsx` | zoznam QR kódov, výber ktorý počítať |
| `src/main.tsx` | odbočka na `/overlay/...` pred štartom appky |

## Tri veci, ktoré sa nesmú pokaziť

1. **Priehľadné pozadie** — `background: transparent` na `html` aj `body`.
   Inak bude v streame čierny obdĺžnik. Nastavuje sa v `Overlay.tsx`
   v prvom `useEffect`, lebo appkový `index.css` kreslí telu vlastné pozadie.

2. **Čitateľnosť na akomkoľvek videu** — preto je tam tieň textu aj
   polopriehľadný podklad. Musí to prežiť biely sneh aj tmavú scénu.

3. **Pri výpadku ostáva posledný stav** — nikdy prázdna obrazovka ani chybová
   hláška. V strede streamu nesmie svietiť „nepodarilo sa načítať".

Odporúčaná veľkosť zdroja v OBS je 800 × 200, pás sa roztiahne na akúkoľvek šírku.

## Ako to dostať do OBS

1. Zdroje → ＋
2. Prehliadač (Browser Source)
3. vložiť odkaz do poľa URL
4. šírka 800, výška 200
5. OK

## Čo ešte nie je hotové

Dary zatiaľ žijú v prehliadači, takže OBS (vlastný prehliadač) ich nevidí.
Živé dáta sa doplnia na jednom mieste — funkcia `zoServera` v `zdroj.ts`.
Patrí tam Realtime odber na tabuľke darov s filtrom na aktuálnu zbierku
daného splitu, čítanie cez view/RPC len s verejnými poľami (suma, cieľ,
názov, zobrazované meno posledného darcu), žiadny zápis, záloha polling 10 s.
