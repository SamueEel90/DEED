# Reťaz tvorcu — Fronta & Overflow (implementácia)

Zdrojové špecifikácie (v roote repa):
- `DEED_Retaz_Fronta_Overflow_DEV.md` — DEV špec v2 (8. 7. 2026, Martin + Fero) — **akčný podklad, implementovaný nižšie**.
- `DEED_QR_Katalog_v2.docx` — referenčný katalóg QR využití v2. Sekcia 2 (Tvorcovia), riadok
  „Honorár s reťazou + FRONTA" odkazuje na túto implementáciu.

## Kľúčové rozhodnutie

Tvorca podporuje **VŽDY PRÁVE JEDNU** aktívnu zbierku. Zbierky si zoradí do **FRONTY**;
po naplnení cieľa sa QR/podstránka **automaticky prehodí** na ďalšiu. Paralelný split
viacerých zbierok pre tvorcu je **zrušený** a prerobený na frontu.

> Split viacerých príjemcov *jednej* zbierky (pohreb: rodina 97 / kostol 3) sa **neruší** —
> to je iný kontext (Modul Náboženstvo, `SplitQrSheet` s `variant`) a ostáva.

## Mapovanie špec → kód

| Špec | Súbor |
|---|---|
| §3 dátový model (`CreatorChain`, `ChainQueueItem`, `ForwardBlock`) | `src/features/retaz/fronta.ts` |
| §4 routing algoritmus (`smerujDar` — dorovnanie, overflow, fallback, atomicita) | `src/features/retaz/fronta.ts` |
| §2 pravidlá percent (krok 5 %, min 5 %, 0 % = zákaz QR, zámok) | `fronta.ts` + `MojaRetaz.tsx` |
| §5.1 „Moja reťaz" — DRAFT/PUBLIKOVANÁ správca | `src/features/retaz/MojaRetaz.tsx` |
| §5.2 Picker príjemcov (Obľúbené · Nedávne · Odporúčané · Hľadať · Sken QR) | `MojaRetaz.tsx` (`PickerPrijemcov`) |
| §5.3 Verejná podstránka tvorcu (jedna aktívna + história + živý prehod) | `src/features/retaz/RetazPodstranka.tsx` |
| Vstup pre tvorcu | Profil → Peňaženka → „Moja reťaz · fronta honoráru" |
| Deep-link `/chain/{slug}` → verejná podstránka | `src/app/App.tsx` (`chainSheet`) |

## Stav

Mock (testovací modul) — stav drží komponent, routing beží cez čisté funkcie v `fronta.ts`.
Napojenie na Supabase (transakčné dorovnanie server-side, §4.5) je ďalší krok; engine je
pripravený ako pure funkcia, ktorá sa dá presunúť do RPC.

## Akceptačné kritériá (§6) — pokrytie

1. QR vedie vždy na jednu aktívnu zbierku ✔ (`aktivnaPolozka`, podstránka §5.3)
2. Naplnenie prepne + overflow tečie ďalšej ✔ (`smerujDar` dorovnanie, jeden dar zavrie aj dve zbierky)
3. Slider krok 5 %, min 5 %, 0 % → QR disabled ✔ (`naKrok`, `mozeGenerovatQr`)
4. Po zverejnení sa nedá meniť nič; draft edituje/maže celé ✔ (`chainStatus` zámok)
5. Prázdna fronta → `system-assigned`, ForwardBlock sa nikdy nespáruje ✔ (`vyberFallback`)
6. Darca vždy vidí, komu dar ide — aj po prepnutí ✔ (podstránka po dare zobrazí novú aktívnu)
