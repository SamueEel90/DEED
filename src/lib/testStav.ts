// OPRAVY 147 · testovacie stavy pre verejné profily a správy (len testovacia verzia, pamätá sa lokálne v prehliadači testera).
// Profil: vyplnený / prázdny · Rola v Správe stránky (prázdne zoznamy = sekcie sa neukážu, ako u novej stránky).
import { useEffect, useState } from "react";

const KLUC = "deed.dev.testStav";
export type TestRola = "hlavny" | "spravca" | "pomocnik" | "organizator";
export interface TestStav {
  prazdny: boolean;
  /** rola prihláseného v Správe (kým ju nepošle server) */ rola: TestRola;
  /** kto si pozerá verejný profil (návštevník alebo niekto zo správy stránky) */ rolaProfil: "navstevnik" | TestRola;
  /** program na verejnom profile; null = podľa stránky */ program: 0 | 1 | 2 | 3 | 4 | null;
}
const ZAKLAD: TestStav = { prazdny: false, rola: "hlavny", rolaProfil: "navstevnik", program: null };
const posl = new Set<() => void>();
export function nacitajTestStav(): TestStav {
  try { return { ...ZAKLAD, ...(JSON.parse(localStorage.getItem(KLUC) ?? "{}") as Partial<TestStav>) }; } catch { return ZAKLAD; }
}
export function zmenTestStav(p: Partial<TestStav>) {
  try { localStorage.setItem(KLUC, JSON.stringify({ ...nacitajTestStav(), ...p })); } catch { /* LS */ }
  posl.forEach((f) => f());
}
export function useTestStav(): TestStav {
  const [s, setS] = useState(nacitajTestStav);
  useEffect(() => { const f = () => setS(nacitajTestStav()); posl.add(f); return () => { posl.delete(f); }; }, []);
  return s;
}
/** zoznam obsahu = pole objektov (zbierky, skutky, práce…); čísla, dvojice a štítky (polia hodnôt alebo n-tíc) ostanú */
const jeZoznam = (v: unknown[]) => v.length > 0 && v.every((x) => !!x && typeof x === "object" && !Array.isArray(x));
/** „prázdny profil": zoznamy obsahu (aj o úroveň nižšie) vyprázdni — texty, mená, čísla a štít ostanú */
export function vyprazdni<T>(o: T, hlbka = 2): T {
  if (!o || typeof o !== "object" || Array.isArray(o)) return o;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
    out[k] = Array.isArray(v) ? (jeZoznam(v) ? [] : v) : v && typeof v === "object" && hlbka > 1 ? vyprazdni(v, hlbka - 1) : v;
  }
  return out as T;
}
