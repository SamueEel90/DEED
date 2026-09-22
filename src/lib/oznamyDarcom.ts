// ============================================================
// OZNAMY DARCOM — čo príde darcovi zbierky do Oznámení:
// · „dolozene" — charita zverejnila dokladovanie (+ opätovné poďakovanie)
// · „sprava"   — priebežná správa počas zbierky
// Mock: localStorage (demo = aktuálny používateľ je darca). V produkcii
// server pošle push + oznam len tým, čo na zbierku darovali.
// ============================================================
import { useSyncExternalStore } from "react";

export interface OznamDarcovi {
  id: string;
  zbierkaId: string;
  typ: "dolozene" | "sprava";
  text?: string;
  datum: string;      // ISO
  precitane?: boolean;
}

const KLUC = "deed.oznamy.darcom";
let cache: OznamDarcovi[] | null = null;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };

function nacitaj(): OznamDarcovi[] {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KLUC) ?? "[]") as OznamDarcovi[]; } catch { cache = []; }
  return cache;
}
function uloz(v: OznamDarcovi[]) {
  cache = v;
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  posluchaci.forEach((f) => f());
}

export function pridajOznamDarcom(o: Omit<OznamDarcovi, "id" | "datum">) {
  uloz([{ ...o, id: `oz-${Date.now()}`, datum: new Date().toISOString() }, ...nacitaj()]);
}
export function oznacPrecitany(id: string) {
  uloz(nacitaj().map((o) => (o.id === id ? { ...o, precitane: true } : o)));
}
export function oznacVsetkyPrecitane() {
  uloz(nacitaj().map((o) => ({ ...o, precitane: true })));
}
export function useOznamyDarcom(): OznamDarcovi[] {
  return useSyncExternalStore(subscribe, nacitaj);
}
