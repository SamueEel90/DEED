// KARTA 43 · verejné profily — jedna obrazovka pre charitu, firmu aj tvorcu.
// Otvára sa z viacerých miest: tlačidlo v Správe stránky, feed, „Stránka organizácie",
// adresár aj QR. Verejný odkaz na zdieľanie: /p/svetlo · /p/pekaren · /p/martin.
// Režim modulu (všade / len v detaile) je v DEV paneli v Mojom profile, nie v adrese.
import { useEffect, useSyncExternalStore } from "react";
import { slugNaKluc, klucNaSlug } from "@/lib/testProfily";
import { hlavnaBezi, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { STREAMY } from "@/lib/testTvorca";

let otvorene = false;
let kluc: string | null = null;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

export function otvorVerejnyProfil(k: string) { otvorene = true; kluc = k; zmena(); }
/** KARTA 55 · E: odkaz z feedu „Celý príbeh na stránke … ›" — stránka Príbeh nad feedom, „Späť do feedu" vráti na to isté miesto */
export function otvorPribeh(zbierkaId: string) { otvorVerejnyProfil(`pribeh:${zbierkaId}`); }
export function zavriVerejnyProfil() { otvorene = false; zmena(); }
/** kľúč profilu, ktorý je otvorený (číta sa bez mazania — StrictMode volá inicializáciu dvakrát) */
export const verejnyProfilKluc = (): string | null => kluc;

// OPRAVY 162 · QR farnosti = jeden QR z registrácie (/p/{slug}?qr=1), nikdy sa nemení.
// Kým hlavná zbierka nebeží, otvorí profil; keď beží, ten istý QR otvorí rovno hlavnú zbierku.
let qrHlavna = false;
export const odkazQrStranky = (stranka: string) => `https://deed.sk/p/${klucNaSlug(stranka)}?qr=1`;
/** profil farnosti otvorený z QR farnosti: keď hlavná zbierka beží, otvor ju (raz) */
export function useOtvorHlavnuZQr(stranka: string, farnost: boolean, otvor: () => void) {
  useZmenyCentralnej();
  const bezi = farnost && hlavnaBezi(stranka);
  useEffect(() => { if (bezi && qrHlavna) { qrHlavna = false; otvor(); } }, [bezi]); // eslint-disable-line react-hooks/exhaustive-deps
}

// /p/{slug} — verejný odkaz (QR, zdieľanie). Slug sa preloží na kľúč profilu.
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/p\/([^/?#]+)/);
  if (m) {
    const k = slugNaKluc(decodeURIComponent(m[1]));
    if (k) { otvorene = true; kluc = k; qrHlavna = new URLSearchParams(window.location.search).has("qr"); }
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
  }
}
// KARTA 47 · /z/{zbierka}?s={stream} — QR / odkaz zo streamu tvorcu → rovno stránka streamu na zbierku.
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/z\/([^/?#]+)/);
  const s = new URLSearchParams(window.location.search).get("s");
  if (m && s && STREAMY[s] && STREAMY[s].zbierka === decodeURIComponent(m[1])) {
    otvorene = true; kluc = `stream:${s}`;
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
  }
}

export function useVerejnyProfilOtvoreny(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return otvorene;
}

// koľko vrstiev profilu je práve na obrazovke (Host aj vložený z feedu) — appka vtedy skryje plávajúce „+"
let vrstvy = 0;
export function vrstvaProfiluPripoj(): () => void { vrstvy++; zmena(); return () => { vrstvy--; zmena(); }; }
export function useVrstvaProfiluOtvorena(): boolean {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return vrstvy > 0;
}
