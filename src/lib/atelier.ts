// ============================================================
// OPRAVY 467–469 · Ateliér stránky (farnosť): skúšobná verzia vzhľadu a rozloženia.
// Koncept = len vzhľad a rozloženie (vzhľad, poradie, skrytie, názvy, vedľa predošlého), obsah je spoločný.
// Ukladá sa na server pod stránkou do súkromných nastavení (nastavenia_stranky.data, kľúč „atelier“) — vidí ho len Správa.
// Naostro je vo verejných nastaveniach (rozlozenie, usporiadanie); Zverejniť ich prepíše (hneď alebo server o 2:00).
// ============================================================
import { citajNastavenie, zapisNastavenie, zapisNastavenieIsto, useZmenyNastaveni } from "./nastaveniaStranky";
import { ROZLOZENIA, type Rozlozenie } from "./rozlozenieFarnosti";
import { zapisVerejneIsto } from "./verejneNastavenia";
import { supabase } from "./supabase";
import { BLOKY_STRANKY, normalizuj, type BlokStranky, type Usporiadanie } from "./usporiadanieStranky";

export type KonceptAtelieru = { rozlozenie: Rozlozenie; usporiadanie: Usporiadanie; zmenene: string; /** ISO: server prepne o 2:00 */ naplanovane?: string };
const KLUC = "atelier";
const platny = (k: unknown): k is KonceptAtelieru => !!k && typeof k === "object" && ROZLOZENIA.some((r) => r.k === (k as KonceptAtelieru).rozlozenie);
export function useKonceptAtelieru(): KonceptAtelieru | null {
  useZmenyNastaveni();
  const k = citajNastavenie(KLUC);
  return platny(k) ? k : null;
}
export const konceptAtelieru = (): KonceptAtelieru | null => { const k = citajNastavenie(KLUC); return platny(k) ? k : null; };
/** OPRAVY 471: uloženie konceptu, na ktoré sa čaká (chyba ako text alebo null) */
export const ulozKonceptIsto = (k: Omit<KonceptAtelieru, "zmenene">): Promise<string | null> => zapisNastavenieIsto(KLUC, { ...k, zmenene: new Date().toISOString() });
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

/** OPRAVY 468/469: zmeny konceptu oproti naostro — riadky do „Zverejniť zmeny?“ a ich počet v ateliéri */
export function zmenyKonceptu(k: KonceptAtelieru, naostro: Rozlozenie, usp: Usporiadanie): string[] {
  const a = normalizuj(k.usporiadanie), b = normalizuj(usp), z: string[] = [];
  const nazov = (id: BlokStranky) => BLOKY_STRANKY.find((x) => x.id === id)?.t ?? id;
  if (k.rozlozenie !== naostro) z.push(`Vzhľad: ${nazovVzhladu(naostro)} → ${nazovVzhladu(k.rozlozenie)}`);
  if (a.poradie.join() !== b.poradie.join()) z.push("Poradie blokov je zmenené");
  const skr = a.skryte.filter((x) => !b.skryte.includes(x)), uk = b.skryte.filter((x) => !a.skryte.includes(x));
  if (skr.length) z.push(`Skryté bloky: ${skr.map(nazov).join(", ")}`);
  if (uk.length) z.push(`Znova ukázané: ${uk.map(nazov).join(", ")}`);
  const prem = BLOKY_STRANKY.filter((x) => (a.nazvy[x.id] ?? "") !== (b.nazvy[x.id] ?? ""));
  if (prem.length) z.push(`Premenované bloky: ${prem.map((x) => a.nazvy[x.id] || x.t).join(", ")}`);
  if ([...a.vedla].sort().join() !== [...b.vedla].sort().join()) z.push("Bloky vedľa seba sú zmenené");
  return z;
}

// ---- OPRAVY 469 · Zverejniť ----
/** odložený doterajší vzhľad po zverejnení (Vrátiť späť ešte 7 dní); po 2:00 ho zapíše server (0153 atelier_prepni) */
export type SpatAtelieru = { rozlozenie: Rozlozenie; usporiadanie?: Usporiadanie; do: string };
const KLUC_SPAT = "atelierSpat";
export function useSpatAtelieru(): SpatAtelieru | null {
  useZmenyNastaveni();
  const s = citajNastavenie(KLUC_SPAT) as SpatAtelieru | null | undefined;
  return s && ROZLOZENIA.some((r) => r.k === s.rozlozenie) && Date.parse(s.do) > Date.now() ? s : null;
}
/** najbližšia 2:00 miestneho času */
export function najblizsie2(teraz = new Date()): Date { const d = new Date(teraz); d.setHours(2, 0, 0, 0); if (d <= teraz) d.setDate(d.getDate() + 1); return d; }
/** „dnes o 2:00“ (po polnoci) alebo „v noci o 2:00“ */
export const kedy2 = (iso: string, teraz = new Date()) => (new Date(iso).toDateString() === teraz.toDateString() ? "dnes o 2:00" : "v noci o 2:00");
export function naplanujKoncept(k: KonceptAtelieru, naplanovane: string | null) {
  zapisNastavenie(KLUC, { rozlozenie: k.rozlozenie, usporiadanie: k.usporiadanie, zmenene: k.zmenene, ...(naplanovane ? { naplanovane } : {}) });
}
/** zverejní koncept hneď: verejné nastavenia, doterajší vzhľad odloží na 7 dní, koncept zmaže. Chyba ako text alebo null. */
export async function zverejniHned(stranka: string, k: KonceptAtelieru, naostro: Rozlozenie, uspNaostro: Usporiadanie): Promise<string | null> {
  const e = (await zapisVerejneIsto(stranka, "rozlozenie", k.rozlozenie)) ?? (await zapisVerejneIsto(stranka, "usporiadanie", k.usporiadanie));
  if (e) return e;
  zapisNastavenie(KLUC_SPAT, { rozlozenie: naostro, usporiadanie: uspNaostro, do: new Date(Date.now() + 7 * 864e5).toISOString() } satisfies SpatAtelieru);
  zapisNastavenie(KLUC, null);
  return null;
}
/** Vrátiť späť na doterajší vzhľad */
export async function vratSpat(stranka: string, s: SpatAtelieru): Promise<string | null> {
  const e = (await zapisVerejneIsto(stranka, "rozlozenie", s.rozlozenie)) ?? (s.usporiadanie ? await zapisVerejneIsto(stranka, "usporiadanie", s.usporiadanie) : null);
  if (!e) zapisNastavenie(KLUC_SPAT, null);
  return e;
}
/** koľko ľudí stránku sleduje (0153); null = nevedno (bez servera alebo chyba) — vtedy sa číslo neukazuje */
export async function sledujuciStranky(stranka: string): Promise<number | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("sledujuci_stranky", { p_stranka: stranka });
  return error || data == null ? null : Number(data);
}
