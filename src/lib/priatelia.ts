// KARTA 29 · Čo o mne vidia priatelia + akcie, na ktoré sa pridávam. Zatiaľ lokálne, server neskôr.
import { useSyncExternalStore } from "react";
import { zaregistrujKluc, zmenene } from "./mojeData";

export type VidiaPriatelia = { kam: boolean; skutky: boolean; stity: boolean };
type Stav = { vidia: VidiaPriatelia; idem: string[]; mamPriatela?: boolean };
const ZAKLAD: Stav = { vidia: { kam: true, skutky: true, stity: true }, idem: [] };
const KLUC = "deed.priatelia";
const posl = new Set<() => void>();
let ver = 0;

function nacitaj(): Stav {
  try { const s = JSON.parse(localStorage.getItem(KLUC) ?? "null") as Stav | null; return s ? { vidia: { ...ZAKLAD.vidia, ...s.vidia }, idem: s.idem ?? [], mamPriatela: !!s.mamPriatela } : ZAKLAD; } catch { return ZAKLAD; }
}
function uloz(s: Stav) { try { localStorage.setItem(KLUC, JSON.stringify(s)); } catch { /* LS */ } zmenene(KLUC); ver++; posl.forEach((f) => f()); }

export function usePriatelia(): Stav {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  return nacitaj();
}
export const prepniVidia = (k: keyof VidiaPriatelia) => { const s = nacitaj(); uloz({ ...s, vidia: { ...s.vidia, [k]: !s.vidia[k] } }); };
export const prepniIdem = (id: string) => { const s = nacitaj(); uloz({ ...s, idem: s.idem.includes(id) ? s.idem.filter((x) => x !== id) : [...s.idem, id] }); };
/** Prvé kroky: prvý priateľ (prijatá alebo poslaná žiadosť) — v produkcii zo servera */
export const oznacPriatela = () => { const s = nacitaj(); if (!s.mamPriatela) uloz({ ...s, mamPriatela: true }); };

// do účtu (moje_data, 0084b)
zaregistrujKluc(KLUC, () => { ver++; posl.forEach((f) => f()); });
