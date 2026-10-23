// ============================================================
// OPRAVY 510 · Ateliér stránky v charite (balík 46): skúšobná verzia vzhľadu — Kronika · Výklad · Moderné.
// Tok ako vo farnosti (lib/atelier.ts), len bez poradia blokov: koncept = vybraný vzhľad.
// Koncept je v súkromných nastaveniach stránky (nastavenia_stranky.data, kľúč „atelierCharita“) — vidí ho len Správa.
// Naostro je profil_stranky.vzhlad. Zverejniť vzhľad: hneď (appka) alebo v noci o 2:00 (server 0161 atelier_prepni).
// Doterajší vzhľad ostane 7 dní na Vrátiť späť (kľúč „atelierCharitaSpat“).
// ============================================================
import { citajNastavenie, zapisNastavenie, zapisNastavenieIsto, useZmenyNastaveni } from "./nastaveniaStranky";
import { VZHLADY, ulozVzhladIsto, type Vzhlad } from "./vzhladStranky";

export type KonceptCharity = { vzhlad: Vzhlad; zmenene: string; /** ISO: server prepne o 2:00 */ naplanovane?: string };
export type SpatCharity = { vzhlad: Vzhlad; do: string };
const KLUC = "atelierCharita", KLUC_SPAT = "atelierCharitaSpat";
const jeVzhlad = (v: unknown): v is Vzhlad => VZHLADY.some((x) => x.k === v);
export const nazovVzhladuCharity = (v: Vzhlad) => VZHLADY.find((x) => x.k === v)?.t ?? "Kronika";

export function useKonceptCharity(): KonceptCharity | null {
  useZmenyNastaveni();
  const k = citajNastavenie(KLUC) as KonceptCharity | null | undefined;
  return k && jeVzhlad(k.vzhlad) ? k : null;
}
export function useSpatCharity(): SpatCharity | null {
  useZmenyNastaveni();
  const s = citajNastavenie(KLUC_SPAT) as SpatCharity | null | undefined;
  return s && jeVzhlad(s.vzhlad) && Date.parse(s.do) > Date.now() ? s : null;
}
/** uloženie konceptu, na ktoré sa čaká (chyba ako text alebo null) */
export const ulozKonceptCharityIsto = (vzhlad: Vzhlad, naplanovane?: string): Promise<string | null> =>
  zapisNastavenieIsto(KLUC, { vzhlad, zmenene: new Date().toISOString(), ...(naplanovane ? { naplanovane } : {}) } satisfies KonceptCharity);
export function naplanujKonceptCharity(k: KonceptCharity, naplanovane: string | null) {
  zapisNastavenie(KLUC, { vzhlad: k.vzhlad, zmenene: k.zmenene, ...(naplanovane ? { naplanovane } : {}) });
}
/** zmeny oproti naostro — riadky do „Zverejniť vzhľad?“ */
export const zmenyKonceptuCharity = (k: KonceptCharity, naostro: Vzhlad): string[] =>
  k.vzhlad !== naostro ? [`Vzhľad: ${nazovVzhladuCharity(naostro)} → ${nazovVzhladuCharity(k.vzhlad)}`] : [];
/** zverejní hneď: vzhľad naostro, doterajší odloží na 7 dní, koncept zmaže */
export async function zverejniCharitaHned(stranka: string, k: KonceptCharity, naostro: Vzhlad): Promise<string | null> {
  const e = await ulozVzhladIsto(stranka, k.vzhlad);
  if (e) return e;
  zapisNastavenie(KLUC_SPAT, { vzhlad: naostro, do: new Date(Date.now() + 7 * 864e5).toISOString() } satisfies SpatCharity);
  zapisNastavenie(KLUC, null);
  return null;
}
export async function vratSpatCharity(stranka: string, s: SpatCharity): Promise<string | null> {
  const e = await ulozVzhladIsto(stranka, s.vzhlad);
  if (!e) zapisNastavenie(KLUC_SPAT, null);
  return e;
}
