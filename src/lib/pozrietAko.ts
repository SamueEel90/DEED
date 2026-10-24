// ============================================================
// Balík 50 · 1 (Martin 23. 10.) · „Pozrieť ako“ — charita s vyšším programom si na tomto zariadení prepne
// na nižší (P3 → P2 → P1 → Zadarmo), aby videla, čo by stratila. Len nadol, nad skutočný program nie.
// Server a dáta sa nemenia (server stále vie skutočný program). Zadarmo prepínač nemá.
// ============================================================
import { useSyncExternalStore } from "react";

const KLUC = (stranka: string) => `deed.pozrietAko.${stranka}`;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };

/** zvolený nižší program na tomto zariadení (null = skutočný) */
export function pozrietAko(stranka: string): number | null {
  try { const v = localStorage.getItem(KLUC(stranka)); return v == null ? null : Number(v); } catch { return null; }
}
export function nastavPozrietAko(stranka: string, tier: number | null) {
  try { if (tier == null) localStorage.removeItem(KLUC(stranka)); else localStorage.setItem(KLUC(stranka), String(tier)); } catch { /* bez úložiska */ }
  zmena();
}
/** program, ktorý appka ukazuje: zvolený nižší, inak skutočný (nikdy nad skutočný) */
export function usePozrietAko(stranka: string, skutocny: number): { tier: number; znizene: boolean } {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver);
  const v = pozrietAko(stranka);
  const tier = v != null && v < skutocny ? v : skutocny;
  return { tier, znizene: tier < skutocny };
}
