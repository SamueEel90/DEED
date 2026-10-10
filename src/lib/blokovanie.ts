// KARTA 24 · 2c Zablokovaní ľudia — lokálne (kým nie je Supabase). Blok platí obojsmerne v celej appke
// (feed, vyhľadávanie, správy, pozvánky, pridanie do skutku, žiadosti o priateľstvo); dary a platby neblokuje.
import { useSyncExternalStore } from "react";
import { zaregistrujKluc, zmenene } from "./mojeData";
import { getSession } from "@/lib/session";

export interface Zablokovany { meno: string; ini: string; datum: string }
const KLUC = "deed.zablokovani";
let verzia = 0;
const posluchaci = new Set<() => void>();
export const useZmenyBlokovania = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
const DEMO: Zablokovany[] = [{ meno: "Ján Mrkva", ini: "JM", datum: "12. 9. 2026" }, { meno: "Reklama Rýchle pôžičky", ini: "RP", datum: "2. 8. 2026" }];

export function zablokovani(): Zablokovany[] {
  try { const s = localStorage.getItem(KLUC); if (s) return JSON.parse(s); } catch { /* LS */ }
  return (getSession() as { demo?: boolean } | null)?.demo ? DEMO : [];
}
function uloz(z: Zablokovany[]) { try { localStorage.setItem(KLUC, JSON.stringify(z)); } catch { /* LS */ } zmenene(KLUC); verzia++; posluchaci.forEach((f) => f()); }
export const odblokuj = (meno: string) => uloz(zablokovani().filter((z) => z.meno !== meno));
export function zablokuj(meno: string) {
  if (zablokovani().some((z) => z.meno === meno)) return;
  const d = new Date();
  uloz([{ meno, ini: meno.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase(), datum: `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` }, ...zablokovani()]);
}
export const jeZablokovany = (meno: string) => zablokovani().some((z) => z.meno === meno);

// do účtu (moje_data, 0084b)
zaregistrujKluc(KLUC, () => { verzia++; posluchaci.forEach((f) => f()); });
