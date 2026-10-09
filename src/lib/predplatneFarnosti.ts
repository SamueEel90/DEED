// ============================================================
// KARTA 61 §3 — Predplatné farnosti. 2 mesiace zadarmo od PRVÉHO ZVEREJNENIA (oznam alebo omše), nie od registrácie.
// Cena za miesta: hlavný kostol 35 €, prvá filiálka +10 €, každá ďalšia +5 € mesačne (filiálky = zoznam z Ľudí farnosti).
// Ročne: 1. rok plná suma (12 mesiacov), od 2. roka 10 mesiacov. Platca ≠ vlastník: farnosť môže platiť aj za iné farnosti
// (obojstranne potvrdené, faktúra per platca); keď platca prestane, 30 dní na prevzatie, až potom neaktívny režim.
// Úložisko ako Nastavenia charity: nastavenia_stranky (0050), kľúč „predplatne“.
// PLACEBO — karta 61 §3: platba a faktúra sú testovacie (fakturyOrg), väzba platca ↔ farnosť a neaktívny režim stránky zatiaľ nie sú na serveri.
// ============================================================
import { citajNastavenie, maNastavenie, zapisNastavenie } from "./nastaveniaStranky";

export interface ZaFarnost { t: string; ok: boolean }
export interface Predplatne {
  /** ms prvého zverejnenia (začiatok 2 mesiacov zadarmo) */ start?: number;
  plateneDo?: number; rocne?: boolean; zaplatene?: boolean;
  /** farnosti, za ktoré platíme my */ za?: ZaFarnost[];
  /** kto platí za nás (iná farnosť / biskupstvo); prestal = ms, keď prestal platiť */ platca?: { meno: string; prestal?: number };
}
export type StavPredplatneho = "nezverejnene" | "skusobne" | "konci" | "skoncilo" | "aktivne" | "zaNasPlati" | "platcaPrestal";

export const CENA_HLAVNY = 35, CENA_FIL1 = 10, CENA_FIL = 5, GRACE_DNI = 30;
export const cenaMiest = (n: number) => CENA_HLAVNY + (n >= 2 ? CENA_FIL1 : 0) + (n > 2 ? (n - 2) * CENA_FIL : 0);
export const DEN = 864e5;
export const predplatne = (): Predplatne => (maNastavenie("predplatne") ? citajNastavenie("predplatne") : {}) as Predplatne;
export const ulozPredplatne = (o: Partial<Predplatne>) => zapisNastavenie("predplatne", { ...predplatne(), ...o });
export const koniecSkusobneho = (p: Predplatne) => (p.start ? new Date(p.start).setMonth(new Date(p.start).getMonth() + 2) : 0);

export function stavPredplatneho(p: Predplatne, teraz: number): StavPredplatneho {
  if (p.platca) return p.platca.prestal ? "platcaPrestal" : "zaNasPlati";
  if (!p.start) return "nezverejnene";
  if (p.plateneDo && p.plateneDo > teraz) return "aktivne";
  const k = koniecSkusobneho(p);
  if (k > teraz) return (k - teraz) / DEN <= 7 ? "konci" : "skusobne"; // dni sa počítajú kalendárne (dniDo)
  return "skoncilo";
}
export const dniText = (n: number) => (n === 1 ? "1 deň" : n >= 2 && n <= 4 ? `${n} dni` : `${n} dní`);
export const datumText = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
/** počet kalendárnych dní od dnes do dňa ms (bez posunu letného času) */
export const dniDo = (ms: number, teraz: number) => { const d = (x: number) => { const t = new Date(x); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); }; return Math.max(0, Math.round((d(ms) - d(teraz)) / DEN)); };
