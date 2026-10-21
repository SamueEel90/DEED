// ============================================================
// OPRAVY 467–469 · Ateliér stránky (farnosť): skúšobná verzia vzhľadu a rozloženia.
// Koncept = len vzhľad a rozloženie (vzhľad, poradie, skrytie, názvy, vedľa predošlého), obsah je spoločný.
// Ukladá sa na server pod stránkou do súkromných nastavení (nastavenia_stranky.data, kľúč „atelier“) — vidí ho len Správa.
// Naostro je vo verejných nastaveniach (rozlozenie, usporiadanie); Zverejniť ich prepíše (hneď alebo server o 2:00).
// ============================================================
import { citajNastavenie, zapisNastavenie, useZmenyNastaveni } from "./nastaveniaStranky";
import { ROZLOZENIA, type Rozlozenie } from "./rozlozenieFarnosti";
import type { Usporiadanie } from "./usporiadanieStranky";

export type KonceptAtelieru = { rozlozenie: Rozlozenie; usporiadanie: Usporiadanie; zmenene: string; /** ISO: server prepne o 2:00 */ naplanovane?: string };
const KLUC = "atelier";
const platny = (k: unknown): k is KonceptAtelieru => !!k && typeof k === "object" && ROZLOZENIA.some((r) => r.k === (k as KonceptAtelieru).rozlozenie);
export function useKonceptAtelieru(): KonceptAtelieru | null {
  useZmenyNastaveni();
  const k = citajNastavenie(KLUC);
  return platny(k) ? k : null;
}
export const konceptAtelieru = (): KonceptAtelieru | null => { const k = citajNastavenie(KLUC); return platny(k) ? k : null; };
export function ulozKonceptAtelieru(k: Omit<KonceptAtelieru, "zmenene"> | null) {
  zapisNastavenie(KLUC, k ? { ...k, zmenene: new Date().toISOString() } : null);
}
/** popisy vzorov (prototyp Ateliér stránky) */
export const POPIS_VZORU: Record<Rozlozenie, string> = {
  nastenka: "všetko na jednej stránke, ako farská nástenka",
  kronika: "dni pod sebou, čo bolo a čo bude",
  moderne: "veľké fotky a karty vedľa seba",
  konzervativny: "pokojná, bez fotiek, veľké písmo",
};
export const nazovVzhladu = (k: Rozlozenie) => ROZLOZENIA.find((r) => r.k === k)?.t ?? "Nástenka";
