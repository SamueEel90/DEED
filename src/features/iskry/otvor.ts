// KARTA 41 · centrálny prúd Iskier — jedna obrazovka pre celú appku (IskryHost v App), otvára sa odkiaľkoľvek.
import { useSyncExternalStore } from "react";

let otvorene = false;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export function otvorIskry() { otvorene = true; zmena(); }
export function zavriIskry() { otvorene = false; zmena(); }
export function useIskryOtvorene(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return otvorene;
}
