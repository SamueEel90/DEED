// ============================================================
// QR SYSTÉM (§10) — utility bez Reactu
// deterministický pattern z reťazca (vyzerá QR-ovo; rovnaký odkaz = rovnaký vzor)
// ============================================================

export function qrHash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function qrPrng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// finder (rohové štvorce) klasického QR — 7×7 v troch rohoch mriežky N×N
export function qrFinder(r: number, c: number, N: number): "dark" | "light" | null {
  const rohy = [[0, 0], [0, N - 7], [N - 7, 0]];
  for (const [or, oc] of rohy) {
    const rr = r - or, cc = c - oc;
    if (rr >= 0 && rr < 7 && cc >= 0 && cc < 7) {
      const ramik = rr === 0 || rr === 6 || cc === 0 || cc === 6;
      const jadro = rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4;
      return ramik || jadro ? "dark" : "light";
    }
  }
  return null;
}

export const QR_TYPY: Record<string, { rot: number; tag: string; popis: string; col: string }> = {
  identita: { rot: 30, tag: "Identity Card", popis: "Overenie identity člena — rotujúci kód", col: "#8B7CFF" },
  platba:   { rot: 0,  tag: "Platobný QR",   popis: "Pošli DEED / prepitné — statický kód",  col: "#43E0C8" },
  akcia:    { rot: 15, tag: "Akčný QR",      popis: "Overenie účasti (proof-of-presence)",    col: "#F0A85E" },
  skutok:   { rot: 0,  tag: "QR skutku",     popis: "Odkaz na skutok / reťaz dobra",          col: "#5BA8F0" },
};

// ============================================================
// ODKAZOVÉ QR — reálne skenovateľné URL (QR impl. §1.1)
// QR kóduje URL na interné ID; resolver (deeplink.ts) ho otvorí v appke.
// ============================================================

/** Druh odkazového objektu — určuje cestu v URL. */
export type QrDruh = "case" | "handle" | "org" | "branch" | "chain" | "badge" | "event";

/** Cieľ pre vytvorenie/získanie statického QR. */
export interface QrCiel {
  druh: QrDruh;
  ref: string;          // prispevok.id | handle | ucet.id | pobocka.id | chain_id | badge_id
  modul?: string;       // kontext (good/help/charity/…)
}

/** Výsledok `staticPre` — krátky slug + materializovaná URL. */
export interface QrStatic {
  slug: string;
  url: string;
}

/** Resolvnutý odkaz (z `qr_kod` podľa slug). */
export interface QrResolved {
  objekt_druh: QrDruh;
  objekt_ref: string;
  modul?: string | null;
  slug: string;
}

// Base deep-linku: env override (brandovaný deed.good) inak živý origin
// (aby naskenovaný QR reálne otvoril bežiacu appku už vo vývoji).
export const DEEP_BASE: string =
  ((import.meta.env.VITE_DEEP_LINK_BASE as string | undefined)?.replace(/\/+$/, "")) ||
  (typeof window !== "undefined" ? window.location.origin : "https://deed.good");

// druh → cesta v URL (QR impl. §1.1: /c /@ /o /chain /badge)
const DRUH_CESTA: Record<QrDruh, (token: string) => string> = {
  case:   (t) => `/c/${t}`,
  handle: (t) => `/@${t}`,
  org:    (t) => `/o/${t}`,
  branch: (t) => `/o/${t}`,        // pobočka: token nesie identitu pobočky
  chain:  (t) => `/chain/${t}`,
  badge:  (t) => `/badge/${t}`,
  event:  (t) => `/e/${t}`,
};

/** Kanonická URL pre druh + slug/token. */
export function qrUrl(druh: QrDruh, token: string): string {
  const cesta = (DRUH_CESTA[druh] || DRUH_CESTA.case)(token);
  return `${DEEP_BASE}${cesta}`;
}

/** Univerzálna resolver-URL (`…/r/{slug}`) — funguje pre každý slug. */
export function qrResolveUrl(slug: string): string {
  return `${DEEP_BASE}/r/${slug}`;
}

// krátky slug (base62, default 8 znakov) — klient generuje, server unique-overí.
const B62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export function vyrobSlug(dlzka = 8): string {
  const buf = new Uint8Array(dlzka);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  let s = "";
  for (let i = 0; i < dlzka; i++) s += B62[buf[i] % 62];
  return s;
}

/** Parsne deep-link cestu → slug/token (podporuje /r /c /o /chain /badge /e a /@handle). */
export function parseDeepLink(pathname: string): { slug: string } | null {
  const p = pathname.replace(/\/+$/, "");
  // /@handle (token nesie @)
  const at = p.match(/\/@([^/]+)$/);
  if (at) return { slug: at[1] };
  // /<prefix>/<token>  (posledný segment = slug)
  const m = p.match(/\/(r|c|o|chain|badge|e)\/([^/]+)$/);
  if (m) return { slug: m[2] };
  return null;
}
