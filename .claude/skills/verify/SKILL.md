---
name: verify
description: Ako overiť zmenu v DEED appke naživo — build, preview server, headless Chrome driver (playwright-core), obídenie loginu/intra.
---

# Verify — DEED (Vite + React SPA)

## Build + spustenie
```bash
npm run build          # tsc --noEmit && vite build (typecheck je súčasť buildu)
npm run preview        # servíruje dist na http://localhost:4173 (spusti na pozadí)
```
Dev server: `npm run dev` (port 5173) — na verify stačí preview nad distom.

## Najprv skús smoke test
Väčšinu regresií chytí hotový skript — netreba písať vlastný driver:
```bash
npm run smoke          # build + prejde všetky moduly a detaily
```
Zdroj: `scripts/smoke.mjs`. Keď stačí overiť „appka sa spustí a nič nehádže", končíš tu.

## Handle na prehliadač (vlastný scenár)
Playwright je devDependency (`npx playwright install chromium` jednorazovo):
```js
import { chromium } from "playwright";
const browser = await chromium.launch();   // bundled chromium, netreba cestu
```
Ako predloha poslúži `scripts/smoke.mjs` — má už vyriešený štart preview servera
cez vite `preview()` API, demo session aj zber `pageerror`/console chýb.

Mobilný viewport 430×930 ukáže mobilný layout (TabBar); desktop ~1280 šírka.

## Obídenie loginu a intra (demo session)
```js
await ctx.addInitScript(() => {
  localStorage.setItem("deed.session", JSON.stringify({ demo: true }));
  localStorage.setItem("deed.intro.v1", "1");
});
```

## Navigácia
- URL routing: `/m/<modul>` — good | help | charita | nabozenstvo | profil | vyzva | mapa | top.
- Sheety sú vaul/Radix dialógy — po akcii v paywalli/sheete ostáva podkladový sheet
  otvorený (prekrýva pointer events); zavri `Escape` alebo klikaj v rámci dialógu.
- Toasty sa zobrazujú dole — dobrý signál v screenshotoch.

## Gotchas
- Mock perzistencia žije v localStorage (`deed.me.*`, `deed.naboz.*`, `deed.rola.*`) —
  pre deterministický beh kľúče vyčisti v addInitScript (sessionStorage guard, nech
  prežije reload test perzistencie).
- Zbieraj `pageerror` + console error — appka nemá error overlay v dist builde.
