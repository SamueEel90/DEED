// ============================================================
// DEED · Pripomienky — reálne fungujúce upozornenia (Web Notifications API).
// „🔔 Pripomeň" na udalosti: vypýta povolenie, uloží pripomienku natrvalo
// (localStorage), hneď potvrdí OS notifikáciou a naplánuje ju na čas udalosti.
//
// Realita PWA bez push servera: notifikácia sa spustí, keď je appka otvorená
// v čase (setTimeout), alebo pri najbližšom otvorení, ak už čas prešiel
// (`naplanujPripomienky()` na štarte). Spoľahlivé „na presný čas aj zavretá
// appka" rieši .ics export (lib/kalendar) — pridá do systémového kalendára.
// ============================================================

const LS = "deed.pripomienky.v1";
const MAX_DOPREDU = 24 * 3600 * 1000;   // setTimeout plánujeme len do 24 h (inak pri ďalšom otvorení)
const MAX_STARE = 7 * 24 * 3600 * 1000; // splatné staršie ako 7 dní už neupozorňujeme (nespamuj)

export interface Pripomienka {
  refId: string;
  modul: string;
  nazov: string;
  kedy: string;    // ISO — kedy upozorniť
  datum?: string;  // ISO deň udalosti (pre text)
  fired?: boolean; // už spustená (aby sa neopakovala pri každom otvorení)
}

function nacitaj(): Pripomienka[] {
  try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; }
}
function uloz(p: Pripomienka[]) {
  try { localStorage.setItem(LS, JSON.stringify(p)); } catch { /* LS nedostupné */ }
}

export function maPripomienku(refId: string): boolean {
  return nacitaj().some((p) => p.refId === refId);
}

/** Aktívne pripomienky (napr. na zoznam „Moje pripomienky"). */
export function pripomienky(): Pripomienka[] {
  return nacitaj().filter((p) => !p.fired);
}

// dátum udalosti → čas upozornenia (deň o `cas` alebo 09:00, 60 min vopred)
function casUpozornenia(datum?: string, cas?: string): string {
  if (!datum) return new Date().toISOString(); // bez dátumu → hneď (len potvrdenie)
  const [h, m] = (cas || "09:00").split(":").map(Number);
  const d = new Date(datum + "T00:00:00");
  d.setHours(h, m - 60, 0, 0); // 60 minút vopred
  return d.toISOString();
}

function formatDatum(iso: string): string {
  try { return new Date(iso + "T00:00:00").toLocaleDateString("sk-SK", { day: "numeric", month: "long" }); }
  catch { return iso; }
}

/** Vypýta povolenie na notifikácie (musí ísť z kliku používateľa). */
export async function povolenieNotifikacii(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try { return (await Notification.requestPermission()) === "granted"; } catch { return false; }
}

// zobraz notifikáciu — radšej cez service worker (spoľahlivejšie, aj mimo fokusu), inak `new Notification`
async function zobraz(titul: string, telo: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body: telo, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "deed-pripomienka" };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(titul, opts);
      return;
    }
  } catch { /* SW nedostupný → fallback */ }
  try { new Notification(titul, opts); } catch { /* notifikácia zlyhala */ }
}

const timery = new Map<string, ReturnType<typeof setTimeout>>();

function naplanujJedno(refId: string, kedy: string, nazov: string) {
  const delta = new Date(kedy).getTime() - Date.now();
  if (delta <= 0 || delta > MAX_DOPREDU) return; // minulé → boot; ďalej než 24h → pri ďalšom otvorení
  const stary = timery.get(refId);
  if (stary) clearTimeout(stary);
  timery.set(refId, setTimeout(() => { void zobraz("🔔 Pripomienka", nazov); oznacFired(refId); }, delta));
}

function oznacFired(refId: string) {
  const zoznam = nacitaj();
  const i = zoznam.findIndex((x) => x.refId === refId);
  if (i >= 0) { zoznam[i].fired = true; uloz(zoznam); }
}

/**
 * Zapni pripomienku na udalosť. Vypýta povolenie, uloží, hneď potvrdí
 * (aby user videl, že to funguje) a naplánuje na čas udalosti.
 * Vráti true, ak sú notifikácie povolené (inak je uložená, ale ticho).
 */
export async function zapniPripomienku(p: { refId: string; modul: string; nazov: string; datum?: string; cas?: string }): Promise<boolean> {
  const povolene = await povolenieNotifikacii();
  const kedy = casUpozornenia(p.datum, p.cas);
  const zoznam = nacitaj().filter((x) => x.refId !== p.refId);
  zoznam.push({ refId: p.refId, modul: p.modul, nazov: p.nazov, kedy, datum: p.datum, fired: false });
  uloz(zoznam);
  if (povolene) {
    await zobraz("🔔 Pripomienka nastavená", `${p.nazov}${p.datum ? " · " + formatDatum(p.datum) : ""}`);
    naplanujJedno(p.refId, kedy, p.nazov);
  }
  return povolene;
}

export function vypniPripomienku(refId: string) {
  uloz(nacitaj().filter((x) => x.refId !== refId));
  const t = timery.get(refId);
  if (t) { clearTimeout(t); timery.delete(refId); }
}

/**
 * Na štarte appky: spusti splatné (nie staršie ako 7 dní) a naplánuj tie,
 * ktoré prídu do 24 h. Volané raz z main.tsx.
 */
export function naplanujPripomienky() {
  if (typeof window === "undefined") return;
  const zoznam = nacitaj();
  const teraz = Date.now();
  let zmena = false;
  for (const p of zoznam) {
    if (p.fired) continue;
    const t = new Date(p.kedy).getTime();
    if (t <= teraz) {
      if (teraz - t < MAX_STARE) void zobraz("🔔 Pripomienka", p.nazov);
      p.fired = true; zmena = true;
    } else {
      naplanujJedno(p.refId, p.kedy, p.nazov);
    }
  }
  if (zmena) uloz(zoznam);
}
