// KARTA 24 · Prihlásené zariadenia — lokálne (kým nie je Supabase; zoznam aj pravidlá bude držať server).
// Pravidlá: najviac 5 aktívnych zariadení · nové zariadenie treba potvrdiť (kód alebo „Áno, som to ja")
// · prvých 24 h na novom zariadení bez zmeny e-mailu, telefónu, IBAN a karty, platby najviac do 50 €.
import { useSyncExternalStore } from "react";
import { getSession } from "@/lib/session";

export const MAX_ZARIADENI = 5;
export const NOVE_HODIN = 24;
export const NOVE_LIMIT_EUR = 50;

export interface Zariadenie { id: string; nazov: string; typ: "telefon" | "pocitac"; mesto: string; posledna: string; toto?: boolean; nove?: boolean; potvrdene?: string }

const KLUC = "deed.zariadenia", KLUC_OD = "deed.zariadenie.od";
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyZariadeni = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

/** kedy sa appka na tomto zariadení prvýkrát prihlásila (lokálne) */
export function odKedy(): number {
  try {
    const v = Number(localStorage.getItem(KLUC_OD));
    if (v) return v;
    const t = (getSession() as { demo?: boolean } | null)?.demo ? Date.now() - 40 * 86400000 : Date.now();
    localStorage.setItem(KLUC_OD, String(t)); return t;
  } catch { return Date.now(); }
}
/** koľko hodín ešte platí obmedzenie nového zariadenia (0 = neplatí) */
export function hodinNovehoZariadenia(): number {
  const h = NOVE_HODIN - (Date.now() - odKedy()) / 3600000;
  return h > 0 ? Math.ceil(h) : 0;
}
/** len na ukážku (DEV): toto zariadenie ako nové */
export function nastavNoveZariadenie(nove: boolean) {
  try { localStorage.setItem(KLUC_OD, String(nove ? Date.now() - 3 * 3600000 : Date.now() - 40 * 86400000)); } catch { /* LS */ }
  zmena();
}

function totoZariadenie(): Zariadenie {
  const ua = navigator.userAgent;
  const typ: Zariadenie["typ"] = /iPhone|Android.*Mobile|Mobile/.test(ua) ? "telefon" : "pocitac";
  const system = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Počítač";
  const prehliadac = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return { id: "toto", nazov: typ === "pocitac" && prehliadac ? `${system} · ${prehliadac}` : system, typ, mesto: "Trenčín", posledna: "teraz aktívny", toto: true, nove: hodinNovehoZariadenia() > 0 };
}
const DEMO: Zariadenie[] = [
  { id: "d2", nazov: "MacBook · Safari", typ: "pocitac", mesto: "Trenčín", posledna: "dnes 13:05", nove: true, potvrdene: "potvrdené kódom" },
  { id: "d3", nazov: "Samsung Galaxy A54", typ: "telefon", mesto: "Bratislava", posledna: "24. 9. 2026" },
];
function ostatne(): Zariadenie[] {
  try { const s = localStorage.getItem(KLUC); if (s) return JSON.parse(s); } catch { /* LS */ }
  return (getSession() as { demo?: boolean } | null)?.demo ? DEMO : [];
}
const ulozOstatne = (z: Zariadenie[]) => { try { localStorage.setItem(KLUC, JSON.stringify(z)); } catch { /* LS */ } zmena(); };

export const zariadenia = (): Zariadenie[] => [totoZariadenie(), ...ostatne()];
export const odhlas = (id: string) => ulozOstatne(ostatne().filter((z) => z.id !== id));
export const odhlasOstatne = () => ulozOstatne([]);
/** DEV: doplň 5 ďalších zariadení — toto by bolo šieste */
export function naplnDoLimitu() {
  const zoz = ostatne(), extra: Zariadenie[] = [
    { id: "d4", nazov: "iPad · Safari", typ: "pocitac", mesto: "Trenčín", posledna: "20. 9. 2026" },
    { id: "d5", nazov: "Windows · Chrome", typ: "pocitac", mesto: "Nitra", posledna: "12. 9. 2026" },
    { id: "d6", nazov: "Xiaomi Redmi Note", typ: "telefon", mesto: "Žilina", posledna: "2. 9. 2026" },
    { id: "d7", nazov: "Lenovo · Firefox", typ: "pocitac", mesto: "Trenčín", posledna: "30. 8. 2026" },
  ];
  ulozOstatne([...zoz, ...extra.filter((e) => !zoz.some((z) => z.id === e.id))].slice(0, MAX_ZARIADENI));
}
