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
const S_DETAILOM = ["good", "help", "charita", "nabozenstvo"];

/** Časti, ktoré musí vykresliť <PlatobnyModul> v každom detaile. */
const CASTI_PLATBY = [
  ["zdieľanie", /Zdieľať|zdieľa/i],
  ["sumy alebo podpora", /DEED|EUR|PODPOR|PRISPIE/i],
  ["obľúbené", /Obľúben|Uložiť/i],
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

/** Prejde na URL a vráti počet chýb, ktoré pri tom pribudli. */
async function otvor(cesta) {
  const pred = chyby.length;
  await page.goto(`${zaklad}${cesta}`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(900); // dobehnutie lazy chunku + prvého renderu
  return chyby.length - pred;
}

const text = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();

try {
  console.log("\nModuly:");
  for (const modul of MODULY) {
    const nove = await otvor(`/m/${modul}`);
    const obsah = await text();
    // Prázdna obrazovka = biely screen po chybe v lazy chunku.
    zapis(obsah.length > 60 && nove === 0, `/m/${modul} sa vykreslil (${obsah.length} znakov, ${nove} chýb)`);
  }

  console.log("\nDetail príspevku (platobný modul):");
  for (const modul of S_DETAILOM) {
    await otvor(`/m/${modul}`);
    const pred = chyby.length;

    // Prvá fotka vo feede je karta príspevku (nultá býva avatar v hlavičke).
    const karta = page.locator("img").nth(1);
    if ((await karta.count()) === 0) {
      zapis(false, `/m/${modul}: vo feede nie je žiadna karta na otvorenie`);
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
