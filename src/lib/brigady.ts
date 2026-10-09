// ============================================================
// KARTA 61 §2 — Dobrovoľníctvo a organizovanie brigád farnosti.
// Brigáda nie je udalosť: na stránke farnosti len v bloku Pomôž (nie Príď a zaži, nie kalendár).
// Úložisko: KV stav farnosti, oblasť „brigady“ (naboz_stav) = Brigada[]; prihlásení cez reakcie farnosti (pole „ucast“ + mena).
// Zo stránky zmizne deň po termíne, v Správe ostane „SKONČILA · na stránke už nie je“.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, obnovOblast } from "@/features/viera/stav";
import { bezDataUrl } from "./uploadFoto";

export const DRUHY_BRIGADY = ["Brigáda", "Služba pri omši", "Iná pomoc"] as const;
export type DruhBrigady = (typeof DRUHY_BRIGADY)[number];
export interface Brigada {
  id: string; druh: DruhBrigady; t: string; dat: string; cas: string; kde: string;
  /** text (HTML z TextovePolia) */ txt: string; txt2?: string;
  foto?: string;
  /** Pozvať ľudí: 0 bez prihlásenia · 1 nezáväzne (Prídem pomôcť) · 2 záväzne (Prihlásiť sa) */ pz: 0 | 1 | 2;
  /** len pri záväznom: koľko ľudí najviac (0 = bez limitu) */ limit: number;
  vytvorena: string;
}

let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const nacitane = new Set<string>();
export const brigady = (stranka: string): Brigada[] => nacitajStav<Brigada[]>("brigady", stranka, []);

export function useBrigady(stranka: string): Brigada[] {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => { if (!nacitane.has(stranka)) { nacitane.add(stranka); void obnovOblast("brigady", stranka).then((ok) => { if (ok) zmena(); }, () => undefined); } }, [stranka]);
  return brigady(stranka);
}

/** koniec dňa brigády + 1 deň (potom zo stránky zmizne) */
export const skoncila = (b: Brigada, teraz = Date.now()) => !!b.dat && new Date(`${b.dat}T23:59:00`).getTime() + 864e5 < teraz;

export async function ulozBrigadu(stranka: string, b: Brigada): Promise<void> {
  const x = await bezDataUrl(b, "stranky");
  await obnovOblast("brigady", stranka).catch(() => false);
  const l = brigady(stranka);
  ulozStav("brigady", stranka, l.some((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [x, ...l]);
  zmena();
}
export async function zmazBrigadu(stranka: string, id: string): Promise<void> {
  await obnovOblast("brigady", stranka).catch(() => false);
  ulozStav("brigady", stranka, brigady(stranka).filter((y) => y.id !== id));
  zmena();
}
