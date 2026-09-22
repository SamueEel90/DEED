// ============================================================
// SEGMENTY PRE DARCOV (charita, od programu ZBIERKA) — témy, ktoré si darca
// vyberie pri pravidelnej podpore („podporím túto tému, nie konkrétnu zbierku").
// Základ je z registrácie, správca ich tu upravuje. Mock: localStorage.
// ============================================================
import { useSyncExternalStore } from "react";
import { segmentyZRegistracie } from "./registracia";

export interface SegmentOrg {
  id: string;
  nazov: string;
  popis: string;      // jedna veta pre darcu
  aktivny: boolean;   // vypnutý sa darcovi neponúka (existujúca podpora beží ďalej)
  zRegistracie?: boolean;
}

const KLUC = "deed.rola.segmenty.charita.v2";
let cache: SegmentOrg[] | null = null;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };

function zo(nazov: string, i: number): SegmentOrg {
  return { id: `r${i}`, nazov, popis: "", aktivny: true, zRegistracie: true };
}
export function nacitajSegmenty(): SegmentOrg[] {
  if (cache) return cache;
  try {
    const s = localStorage.getItem(KLUC);
    cache = s ? (JSON.parse(s) as SegmentOrg[]) : segmentyZRegistracie().map(zo);
  } catch { cache = segmentyZRegistracie().map(zo); }
  return cache;
}
export function ulozSegmenty(v: SegmentOrg[]) {
  cache = v;
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  posluchaci.forEach((f) => f());
}
export function useSegmenty(): SegmentOrg[] { return useSyncExternalStore(subscribe, nacitajSegmenty); }

/** názvy segmentov, ktoré sa ponúkajú darcovi */
export const aktivneSegmenty = (): string[] => nacitajSegmenty().filter((s) => s.aktivny).map((s) => s.nazov);
