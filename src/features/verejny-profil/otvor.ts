// KARTA 43 · verejné profily — jedna obrazovka pre charitu, firmu aj tvorcu.
// Otvára sa z viacerých miest: tlačidlo v Správe stránky, feed, „Stránka organizácie",
// adresár aj QR. Verejný odkaz na zdieľanie: /p/svetlo · /p/pekaren · /p/martin.
// Režim modulu (všade / len v detaile) je v DEV paneli v Mojom profile, nie v adrese.
import { useSyncExternalStore } from "react";
import { slugNaKluc } from "@/lib/testProfily";

let otvorene = false;
let kluc: string | null = null;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

export function otvorVerejnyProfil(k: string) { otvorene = true; kluc = k; zmena(); }
export function zavriVerejnyProfil() { otvorene = false; zmena(); }
/** kľúč profilu, ktorý je otvorený (číta sa bez mazania — StrictMode volá inicializáciu dvakrát) */
export const verejnyProfilKluc = (): string | null => kluc;

// /p/{slug} — verejný odkaz (QR, zdieľanie). Slug sa preloží na kľúč profilu.
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/p\/([^/?#]+)/);
  if (m) {
    const k = slugNaKluc(decodeURIComponent(m[1]));
    if (k) { otvorene = true; kluc = k; }
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
  }
}

export function useVerejnyProfilOtvoreny(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return otvorene;
}
