// KARTA 41 · centrálny prúd Iskier — jedna obrazovka pre celú appku (IskryHost v App), otvára sa odkiaľkoľvek.
import { useSyncExternalStore } from "react";

let otvorene = false;
/** Iskra, na ktorej sa prúd otvorí (odkaz /iskra/{id}) */
let startId: string | null = null;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export function otvorIskry(id?: string) { otvorene = true; startId = id ?? null; zmena(); }
/** Iskra, na ktorej má prúd začať (číta sa bez mazania — StrictMode volá inicializáciu dvakrát) */
export const startIskry = (): string | null => startId;
export function zabudniStartIskry() { startId = null; }
// odkaz /iskra/{id} (zdieľanie, QR) → appka sa otvorí rovno v prúde na tomto videu
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/iskra\/([^/?#]+)/);
  if (m) {
    otvorene = true; startId = decodeURIComponent(m[1]);
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
  }
}
export function zavriIskry() { otvorene = false; zmena(); }
export function useIskryOtvorene(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return otvorene;
}
