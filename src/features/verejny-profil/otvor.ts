// KARTA 43 · verejné profily (test) — jedna obrazovka pre charitu, firmu aj tvorcu.
// Otvára sa odkiaľkoľvek, deep-link /p/{kľúč profilu}. Režim modulu je v URL (?modul=vsade / ?modul=detail).
import { useSyncExternalStore } from "react";

let otvorene = false;
let kluc: string | null = null;
/** režim modulu z URL pri otvorení — zachytený skôr, než appka prepíše URL na /m/… */
let rezim: "vsade" | "detail" = "vsade";
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

export function otvorVerejnyProfil(k: string, r?: "vsade" | "detail") { otvorene = true; kluc = k; if (r) rezim = r; zmena(); }
/** režim modulu (?modul=vsade predvolene / ?modul=detail) zachytený pri otvorení profilu */
export const verejnyProfilRezim = (): "vsade" | "detail" => rezim;
export function zavriVerejnyProfil() { otvorene = false; zmena(); }
/** kľúč profilu, ktorý je otvorený (číta sa bez mazania — StrictMode volá inicializáciu dvakrát) */
export const verejnyProfilKluc = (): string | null => kluc;

// /p/{kľúč} — odkaz na profil (QR, zdieľanie)
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/p\/([^/?#]+)/);
  if (m) {
    otvorene = true; kluc = decodeURIComponent(m[1]);
    try { rezim = new URLSearchParams(window.location.search).get("modul") === "detail" ? "detail" : "vsade"; } catch { /* sandbox */ }
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
  }
}

export function useVerejnyProfilOtvoreny(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return otvorene;
}
