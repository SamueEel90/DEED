// ============================================================
// OPRAVY 398 (Viera) · kedy farár naposledy videl sekciu Správy (Od veriacich, Oznamy → Na stránke).
// Od veriacich: číslo = Čaká na schválenie + nové od poslednej návštevy sekcie (aj povolené, ktoré už visia na stránke).
// Oznamy: číslo = príspevky, ktoré na stránke pribudli od poslednej návštevy (nie tie, ktoré pridal farár sám).
// Videné sa zapíše, keď farár zo sekcie odíde alebo ťukne „Videl som ✓“.
// Ukladá sa k účtu farára (moje_data, rovnako ako videné oznamy 297) — na každom zariadení rovnako.
// Kým farár nič nevidel: Od veriacich = doterajší čas z nastavení stránky (odfnast.videne), Oznamy = odteraz.
// ============================================================
import { useSyncExternalStore } from "react";
import { zaregistrujKluc, zmenene } from "./mojeData";
import { nacitajStav } from "@/features/viera/stav";

export type SekciaVidene = "odv" | "ozn";
const kluc = (stranka: string, sek: SekciaVidene) => `deed.${sek}Videne.${stranka.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 60)}`;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const cislo = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const registrovane = new Set<string>();
function registruj(k: string) {
  if (registrovane.has(k)) return;
  registrovane.add(k);
  zaregistrujKluc(k, zmena, (lokal, ucet) => Math.max(cislo(lokal), cislo(ucet)));
}
function citaj(k: string): number {
  try { return cislo(JSON.parse(localStorage.getItem(k) ?? "0")); } catch { return 0; }
}

/** čas (ms), kedy farár naposledy videl sekciu */
export function videneSekcie(stranka: string, sek: SekciaVidene): number {
  const k = kluc(stranka, sek);
  registruj(k);
  const v = citaj(k);
  if (v) return v;
  if (sek === "odv") return cislo(nacitajStav<{ videne?: number }>("odfnast", stranka, {}).videne);
  const t = Date.now(); // Oznamy: prvé otvorenie = odteraz (nie všetko staré ako nové)
  try { localStorage.setItem(k, JSON.stringify(t)); } catch { /* LS */ }
  return t;
}
/** farár odišiel zo sekcie alebo ťukol „Videl som ✓“ */
export function oznacSekciuVidenu(stranka: string, sek: SekciaVidene) {
  const k = kluc(stranka, sek);
  registruj(k);
  try { localStorage.setItem(k, JSON.stringify(Date.now())); } catch { /* LS */ }
  zmenene(k);
  zmena();
}
export function useVideneSekcie(stranka: string, sek: SekciaVidene): number {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  return videneSekcie(stranka, sek);
}
// Od veriacich (skratky)
export const videneOdV = (stranka: string) => videneSekcie(stranka, "odv");
export const oznacOdVVidene = (stranka: string) => oznacSekciuVidenu(stranka, "odv");
export const useOdVVidene = (stranka: string) => useVideneSekcie(stranka, "odv");
