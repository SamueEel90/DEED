// ============================================================
// DEED · Smoke test — appka sa naozaj spustí, nielen skompiluje.
//
// Projekt nemá unit testy. Tento skript je náhrada za "aspoň niečo":
// otvorí každý modul aj detail príspevku v skutočnom prehliadači
// a spadne, keď sa niečo nevykreslí alebo vyhodí chybu do konzoly.
//
// Práve toto chytí typickú regresiu, ktorú typecheck prejde —
// odstránený prop, zlý import v lazy chunku, chyba v efekte.
//
// Spustenie:  npm run smoke        (build + tento skript)
// Vyžaduje:   npx playwright install chromium   (jednorazovo)
// ============================================================
import { preview } from "vite";
import { chromium } from "playwright";

const PORT = 4183; // zámerne iný ako `npm run preview` (4173), nech sa nebijú
const VIEWPORT = { width: 430, height: 930 }; // mobil → TabBar layout

/** Moduly, ktoré appka routuje cez /m/<id> (viď VSETKY_MODULY v TabBar.tsx). */
const MODULY = [
  "good",
  "help",
  "charita",
  "nabozenstvo",
  "vyzva",
  "mapa",
  "top",
  "skore",
  "profil",
];

/** Moduly s feedom, kde vieme otvoriť detail a skontrolovať platobný modul. */
// TODO: vrátiť pri nasadení Farnosť v3 — "nabozenstvo" (stránka farnosti sa celá mení, Martin 6. 10. 2026).
// TODO: vrátiť, keď smoke pobeží proti seedovanej DB — "charita" (OPRAVY 403: feed charity je len z DB, mock karty zmazané).
const S_DETAILOM = ["good", "help"];

/** Časti, ktoré musí vykresliť <PlatobnyModul> v každom detaile. */
const CASTI_PLATBY = [
  ["zdieľanie", /Zdieľať|zdieľa/i],
  ["sumy alebo podpora", /DEED|EUR|PODPOR|PRISPIE/i],
  ["sledovať", /Sledova|Sleduješ|Uložiť|Obľúben/i], // OPRAVY 141 → 209: prototyp „Platobny modul charita a viera“ má v module jedno tlačidlo Obľúbené (V obľúbených)
  ["QR", /QR/],
];

const zlyhania = [];
const zapis = (ok, sprava) => {
  console.log(`${ok ? "  ok  " : "  ZLE "} ${sprava}`);
  if (!ok) zlyhania.push(sprava);
};

const server = await preview({
  preview: { port: PORT, strictPort: true },
  logLevel: "warn",
});
const zaklad = `http://localhost:${PORT}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT });

// Obíď login a intro — testujeme obrazovky, nie onboarding.
await ctx.addInitScript(() => {
  localStorage.setItem("deed.session", JSON.stringify({ demo: true }));
  localStorage.setItem("deed.intro.v1", "1");
});

const page = await ctx.newPage();
const chyby = [];
page.on("pageerror", (e) => chyby.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") chyby.push(`console: ${m.text()}`);
});

const text = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
/** karta feedu alebo poctivý prázdny stav (EmptyState má data-prazdny-stav) */
const KARTA = ".good-card";
const PRAZDNY = "[data-prazdny-stav]";
const pocet = async (sel) => page.locator(sel).count();

/** Prejde na URL a vráti počet chýb, ktoré pri tom pribudli.
 *  Martin 21. 10.: nečaká pevný čas — čaká, kým sa modul naozaj ukáže (prvé otvorenie so živou DB trvá dlhšie,
 *  kým beží úvodná obrazovka D+), najviac 20 s. Moduly s feedom čakajú na kartu ALEBO prázdny stav. */
async function otvor(cesta, feed = false) {
  const pred = chyby.length;
  await page.goto(`${zaklad}${cesta}`, { waitUntil: "networkidle", timeout: 30_000 });
  const koniec = Date.now() + 20_000;
  while (Date.now() < koniec) {
    if (feed ? (await pocet(KARTA)) + (await pocet(PRAZDNY)) > 0 : (await text()).length > 60) break;
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(600); // dobehnutie prvého renderu
  return chyby.length - pred;
}

try {
  console.log("\nModuly:");
  for (const modul of MODULY) {
    const feed = S_DETAILOM.includes(modul);
    const nove = await otvor(`/m/${modul}`, feed);
    const obsah = await text();
    // Prázdna obrazovka = biely screen po chybe v lazy chunku. Feed: karta ALEBO prázdny stav, nie menej.
    const karty = await pocet(KARTA), prazdny = await pocet(PRAZDNY);
    const ok = obsah.length > 60 && nove === 0 && (!feed || karty + prazdny > 0);
    zapis(ok, `/m/${modul} sa vykreslil (${obsah.length} znakov, ${nove} chýb${feed ? `, ${karty ? `${karty} kariet` : prazdny ? "prázdny stav" : "ani karta, ani prázdny stav"}` : ""})`);
  }

  console.log("\nDetail príspevku (platobný modul):");
  for (const modul of S_DETAILOM) {
    await otvor(`/m/${modul}`, true);
    const pred = chyby.length;

    const karta = page.locator(KARTA).first();
    if ((await karta.count()) === 0) {
      // prázdny feed (nová DB, nové mesto): detail nie je čo otvoriť — v poriadku, len keď je poctivý prázdny stav
      const prazdny = (await pocet(PRAZDNY)) > 0;
      zapis(prazdny, prazdny ? `/m/${modul}: feed je prázdny, ukazuje prázdny stav (detail nie je čo otvoriť)` : `/m/${modul}: vo feede nie je karta ani prázdny stav`);
      continue;
    }
    await karta.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_200);

    const obsah = await text();
    const chyba = CASTI_PLATBY.filter(([, re]) => !re.test(obsah)).map(([n]) => n);
    zapis(
      chyba.length === 0 && chyby.length === pred,
      `/m/${modul} detail${chyba.length ? ` — chýba: ${chyba.join(", ")}` : ""}${
        chyby.length > pred ? ` — ${chyby.length - pred} chýb v konzole` : ""
      }`,
    );
  }
} finally {
  await browser.close();
  await server.close();
}

if (chyby.length) {
  console.log("\nChyby z prehliadača:");
  for (const c of [...new Set(chyby)]) console.log(`  ${c}`);
}

if (zlyhania.length) {
  console.error(`\nSMOKE TEST ZLYHAL — ${zlyhania.length} problémov.`);
  process.exit(1);
}
console.log("\nSmoke test prešiel.");
