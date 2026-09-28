// KARTA 05 · Tempo darov — ZDROJ STUPŇA.
// !!! Výpočet stupňa je NENASTAVENÝ (CELOK 3.1, bod 8). Jediné miesto, kde sa doplní: tempoStupen().
// Zatiaľ vracia DEV simuláciu (prepínač v DEV paneli). Pracovné hranice: Silná 1,5× · Veľmi silná 2× · Extrémna 3× · Top 5× priemeru za 5 min.
import { useSyncExternalStore } from "react";

export const STUPNE = ["Priemerná", "Silná", "Veľmi silná", "Extrémna", "Top"] as const;
export type Stupen = 0 | 1 | 2 | 3 | 4;
export type Tempo = {
  stupen: Stupen;
  postup: number;        // 0–1 k ďalšej hranici (aktuálny diel)
  darov5min: number;     // počet darov za posledných 5 min
  doDalsieho: number;    // koľko darov chýba do ďalšieho stupňa (pri Top 0)
};

// ---- DEV simulácia (kým nie je výpočet) ----
const KLUC = "deed.dev.tempo";
let devStupen: Stupen = (() => { try { const v = Number(localStorage.getItem(KLUC)); return (v >= 0 && v <= 4 ? v : 0) as Stupen; } catch { return 0 as Stupen; } })();
const posl = new Set<() => void>();
export function nastavDevTempo(s: Stupen) { devStupen = s; try { localStorage.setItem(KLUC, String(s)); } catch { /* LS */ } posl.forEach((f) => f()); }
export function useDevTempo(): Stupen { return useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => devStupen); }
const UKAZKA: Record<Stupen, Omit<Tempo, "stupen">> = {
  0: { postup: 0.45, darov5min: 2, doDalsieho: 2 },
  1: { postup: 0.5, darov5min: 6, doDalsieho: 2 },
  2: { postup: 0.35, darov5min: 9, doDalsieho: 3 },
  3: { postup: 0.6, darov5min: 14, doDalsieho: 4 },
  4: { postup: 1, darov5min: 24, doDalsieho: 0 },
};

/** Stupeň tempa pre zbierku (pri tvorcovi len dary cez tvorcu). TODO: skutočný výpočet — zatiaľ DEV. */
export function tempoStupen(_refId: string, _cezTvorcu?: string): Tempo {
  return { stupen: devStupen, ...UKAZKA[devStupen] };
}
