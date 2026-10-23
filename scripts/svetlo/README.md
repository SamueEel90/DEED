# Svetlo pomoci · ukážka (OPRAVY 517)

`public/svetlo/` je hotový build appky v stave **pred OPRAVY 403** (commit `80137e3^`, 19. 10. 2026), keď ešte bola v appke charita Svetlo pomoci s ukážkovými údajmi. Slúži len na ukazovanie (Martin, Soňa). V testovacej verzii na ňu vedie karta v Helpe.

- Beží bez servera (mock, `VITE_USE_MOCK=1`), testovacia lišta zapnutá (`VITE_TEST=1`), bez service workera.
- Úložisko prehliadača má predponu `svetlo:` a IndexedDB `svetlo-deed-media`, takže sa nemieša so živou appkou na tej istej adrese.
- Cesty `/m/…` sú `/svetlo/m/…`. Vercel: `/svetlo/*` → `/svetlo/index.html`. Service worker živej appky `/svetlo/` neobsluhuje ani neprednačítava.

## Ako to znova postaviť
```sh
git archive 80137e3^ src index.html tsconfig.json package.json | tar x -C /tmp/svetlo
# úpravy v /tmp/svetlo: src/lib/urlnav.ts (/m/ → /svetlo/m/), src/lib/videoUloz.ts a prilohy.ts (DB "svetlo-deed-media"),
# index.html (titulok, obal úložiska s predponou „svetlo:“, prednastavené deed.session demo a deed.intro.v1)
cp scripts/svetlo/vite.svetlo.config.ts /tmp/svetlo/ && cd /tmp/svetlo && ln -s <repo>/node_modules node_modules
npx vite build -c vite.svetlo.config.ts   # výstup out/svetlo → skopírovať do public/svetlo
```
