// KARTA 22 · Organizovaná akcia — jedna bežiaca akcia naraz. Beží aj po zatvorení appky:
// čas počítame od `start` (neskôr čas servera), stav žije v localStorage.
import { useSyncExternalStore } from "react";

/** OPRAVY 121 · bod 11: typ záznamu účastníka. Zadarmo = „prichod" (sken pri príchode povinný, odchod dobrovoľný).
 *  Dobrovoľníctvo (od P2) = „prichod_odchod" (príchod aj odchod povinný, v čase a na mieste akcie, oprava len so zdôvodnením,
 *  z toho výkaz hodín). Presné parametre dodá dizajn pri Dobrovoľníctve. */
export type TypZaznamu = "prichod" | "prichod_odchod";
export interface UcastnikAkcie {
  meno: string; neskor: boolean;
  /** čas príchodu (sken QR charity) a dobrovoľného odchodu — potvrdenie od–do */
  prichod?: number; odchod?: number;
}
/** záznam zmien (odobratie účastníka, oprava času) — vnútri charity, s menom organizátora */
export interface ZmenaAkcie { cas: number; kto: string; co: string; dovod?: string }
export interface Akcia {
  stav: "sken" | "bezi";
  /** účastníci overení skenom (organizátor je v zozname automaticky, tu nie je) */
  uc: UcastnikAkcie[];
  /** okno pre meškajúcich v minútach (30 / 60 / 120) */
  okno: number;
  start: number | null;
  miesto: string;
  /** obrazovka akcie je otvorená (inak banner „Akcia beží") */
  otvorena: boolean;
  /** skutok ako dar vybraný pred akciou (Pridať skutok → So skupinou → Akcia práve začína) */
  dar?: { id: string; nazov: string; org: string; cislo: string }[];
  /** OPRAVY 121 · body 10–12: akcia za charitu — organizátor ukazuje QR charity, dobrovoľníci ho naskenujú */
  org?: { stranka: string; nazov: string; organizator: string; typ: TypZaznamu };
  /** id akcie (podpis akčného QR charity) */
  id?: string;
  zaznam?: ZmenaAkcie[];
}
const KLUC = "deed.akcia";
let cache: Akcia | null | undefined;
let verzia = 0;
const posluchaci = new Set<() => void>();

export function akcia(): Akcia | null {
  if (cache === undefined) { try { cache = JSON.parse(localStorage.getItem(KLUC) || "null"); } catch { cache = null; } }
  return cache ?? null;
}
export function nastavAkciu(a: Akcia | null) {
  cache = a;
  try { if (a) localStorage.setItem(KLUC, JSON.stringify(a)); else localStorage.removeItem(KLUC); } catch { /* LS */ }
  verzia++; posluchaci.forEach((f) => f());
}
export const zmenAkciu = (z: Partial<Akcia>) => { const a = akcia(); if (a) nastavAkciu({ ...a, ...z }); };
export function useAkcia(): Akcia | null {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return akcia();
}
/** Môj QR „Organizujem akciu" alebo Pridať skutok → So skupinou → Akcia práve začína */
export function otvorAkciu(dar?: Akcia["dar"], org?: Akcia["org"]) {
  const a = akcia();
  nastavAkciu(a ? { ...a, otvorena: true } : { stav: "sken", uc: [], okno: 30, start: null, miesto: "", otvorena: true, dar, ...(org ? { org, id: `ak${Date.now().toString(36)}`, zaznam: [] } : {}) });
}
export const cas = (sek: number) => `${Math.floor(sek / 3600)}:${String(Math.floor((sek % 3600) / 60)).padStart(2, "0")}:${String(sek % 60).padStart(2, "0")}`;
