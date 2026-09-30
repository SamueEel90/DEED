// Osobný profil (karta 18 · Upraviť profil) — čo si človek nastaví sám.
// Miesto, kde sa zdržiava: NIE adresa z registrácie ani z občianskeho — nikde sa nezobrazuje,
// slúži len na okruh štvrť / mesto. Zatiaľ lokálne (localStorage), neskôr Supabase.
import { useSyncExternalStore } from "react";

export type OsobnyProfil = {
  ulica: string; cislo: string; mesto: string;
  oMne: string;
  verejny: boolean;       // verejný profil (meno pri daroch vidia ostatní)
  ukazStit: boolean;      // štít pri mene, v zozname darcov a na profile
  fotoPriDare: boolean;   // fotka pri dare (nie pri Anonymne)
  prezyvka: string;
};
const KLUC = "deed.profil.osobny";
const ZAKLAD: OsobnyProfil = { ulica: "", cislo: "", mesto: "", oMne: "", verejny: true, ukazStit: true, fotoPriDare: true, prezyvka: "" };
let verzia = 0;
const posluchaci = new Set<() => void>();

export function nacitajOsobny(): OsobnyProfil {
  try { const s = localStorage.getItem(KLUC); return s ? { ...ZAKLAD, ...JSON.parse(s) } : ZAKLAD; } catch { return ZAKLAD; }
}
export function ulozOsobny(p: OsobnyProfil) {
  try { localStorage.setItem(KLUC, JSON.stringify(p)); } catch { /* LS */ }
  verzia++; posluchaci.forEach((f) => f());
}
export function useOsobnyProfil(): OsobnyProfil {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return nacitajOsobny();
}
