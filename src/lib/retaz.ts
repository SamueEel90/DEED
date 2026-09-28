// ============================================================
// REŤAZ DOBRA (karta 14) — tvorca pošle z každého daru časť zbierke.
// Zbierky idú V RADE, nie naraz: beží vždy len jedna, ďalšia začne, až keď sa
// predošlá naplní alebo skončí. Po zapečatení sa nedá meniť nič; dá sa len
// vytvoriť nová reťaz. Koniec radu → 100 % tvorcovi.
// Zatiaľ lokálne (localStorage) — rovnaký tvar pôjde do Supabase.
// ============================================================
import { useSyncExternalStore } from "react";
import { ZBIERKY, najdiZbierku } from "./zbierky";
import { darcoviaPre } from "./darcovia";

export const RETAZ_PCT_MIN = 5, RETAZ_PCT_KROK = 5;
/** percento vždy 5–100 po 5 (27 → 25, 28 → 30) */
export const zaokruhliPct = (v: number) => Math.min(100, Math.max(RETAZ_PCT_MIN, Math.round(v / RETAZ_PCT_KROK) * RETAZ_PCT_KROK));

export type StavVRetazi = "caka" | "bezi" | "naplnena" | "skoncila" | "preskocena";
export interface PolozkaRetaze { zbierkaId: string; pct: number; stav: StavVRetazi; poslane: number; snap?: Znama }
export interface Retaz { id: string; zapecatene: number; polozky: PolozkaRetaze[]; dostal: number; poslane: number }

/** zbierka, ako ju vidí tvorca pri výbere a v rade */
export interface ZbierkaVRetazi { id: string; nazov: string; org: string; ciel: number | null; vyzbierane: number; aktivna: boolean }

/** zbierka mimo katalógu (napr. karta z feedu) — appka ju ohlási, keď z nej otvára reťaz */
export type Znama = { nazov: string; org: string; ciel: number | null; zaklad: number };
const ZNAME = new Map<string, Znama>();
export const ohlasZbierku = (id: string, z: Znama) => { ZNAME.set(id, z); };

export function zbierkaVRetazi(id: string): ZbierkaVRetazi | null {
  const zive = darcoviaPre(id).reduce((a, r) => a + r.suma, 0);
  const z = najdiZbierku(id);
  if (!z) {
    const x = ZNAME.get(id);
    return x ? { id, nazov: x.nazov, org: x.org, ciel: x.ciel, vyzbierane: x.zaklad + zive, aktivna: true } : null;
  }
  return { id, nazov: z.nazov, org: z.ziadatel.typ === "org" ? z.ziadatel.meno : `Pomoc · ${z.lok}`, ciel: z.ciel > 0 ? z.ciel : null, vyzbierane: z.vyzbierane + zive, aktivna: z.stav === "aktivna" };
}
/** výber: len verejné bežiace zbierky (súkromnú len cez odkaz — nie tu) */
export const verejneBeziace = (): ZbierkaVRetazi[] =>
  [...ZBIERKY.filter((z) => z.stav === "aktivna").map((z) => z.id), ...ZNAME.keys()]
    .filter((id, i, a) => a.indexOf(id) === i).map(zbierkaVRetazi).filter((z): z is ZbierkaVRetazi => !!z);

const KLUC = "deed.retaz.moja";
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyRetaze = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

export function nacitajRetaz(): Retaz | null {
  try {
    const s = localStorage.getItem(KLUC);
    if (!s) return null;
    const r = JSON.parse(s) as Retaz;
    r.polozky.forEach((x) => { if (x.snap && !ZNAME.has(x.zbierkaId)) ZNAME.set(x.zbierkaId, x.snap); });
    return posun(r);
  } catch { return null; }
}
function uloz(r: Retaz | null) {
  try { if (r) localStorage.setItem(KLUC, JSON.stringify(r)); else localStorage.removeItem(KLUC); } catch { /* LS */ }
  zmena();
}

/** posunie rad: bežiaca naplnená / skončená → ďalšia; uzavreté skôr sa preskočia */
function posun(r: Retaz): Retaz {
  const p = r.polozky.map((x) => ({ ...x }));
  let i = p.findIndex((x) => x.stav === "bezi" || x.stav === "caka");
  while (i >= 0 && i < p.length) {
    const z = zbierkaVRetazi(p[i].zbierkaId);
    if (!z || !z.aktivna) { p[i].stav = p[i].stav === "bezi" ? "skoncila" : "preskocena"; i++; continue; }
    if (z.ciel && z.vyzbierane >= z.ciel) { p[i].stav = "naplnena"; i++; continue; }
    p[i].stav = "bezi"; break;
  }
  return { ...r, polozky: p };
}

export const beziaca = (r: Retaz) => r.polozky.find((x) => x.stav === "bezi") ?? null;

/** zapečatí rad — odvtedy sa nemení; všetky QR dvojice vzniknú naraz */
export function zapecatRetaz(polozky: { zbierkaId: string; pct: number }[]): Retaz {
  const r = posun({ id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, zapecatene: Date.now(), dostal: 0, poslane: 0,
    polozky: polozky.map((x) => ({ zbierkaId: x.zbierkaId, pct: zaokruhliPct(x.pct), stav: "caka" as const, poslane: 0,
      ...(ZNAME.has(x.zbierkaId) ? { snap: ZNAME.get(x.zbierkaId) } : {}) })) });
  uloz(r);
  return r;
}
/** „Vytvoriť novú reťaz" — stará sa uzavrie (tu: zabudne), nová sa nastavuje od nuly */
export const zrusRetaz = () => uloz(null);

/** dar tvorcovi → koľko ide bežiacej zbierke (dar na ceste sa pripíše pôvodnej) */
export function darTvorcovi(eur: number): { zbierkaId: string | null; doZbierky: number } {
  const r = nacitajRetaz();
  if (!r) return { zbierkaId: null, doZbierky: 0 };
  const b = beziaca(r);
  const doZbierky = b ? Math.round(eur * b.pct) / 100 : 0;
  uloz({ ...r, dostal: r.dostal + eur, poslane: r.poslane + doZbierky,
    polozky: r.polozky.map((x) => (b && x.zbierkaId === b.zbierkaId ? { ...x, poslane: x.poslane + doZbierky } : x)) });
  return { zbierkaId: b?.zbierkaId ?? null, doZbierky };
}
