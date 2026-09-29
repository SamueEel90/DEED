// Nastavenia appky (karta 20) — všetko o appke, nič o profile. Lokálne (localStorage).
// Prístupnosť (karta 19): veľkosť písma, obmedziť animácie a vibrácie sa aplikujú hneď na celú appku.
import type { FirmaVolba } from "./mojaFirma";
import { useSyncExternalStore } from "react";

export type Okruh = "stvrt" | "mesto" | "slovensko";
export type NastaveniaAppky = {
  pismo: number;          // 90–150 %, krok 10
  obmedzAnim: boolean;
  vibracie: boolean;
  titulky: boolean;
  tichyCas: boolean;      // 22:00 – 7:00, okrem SOS
  poloha: boolean;
  okruh: Okruh;
  biometria: boolean;
  hranicaPlatby: number;  // nad túto sumu tvár / odtlačok / PIN (20 | 50 | 100 | 200 · 0 = každú platbu)
  kontakty: boolean;
  /** ukážky pre začiatok (Moje skutky, neskôr peňaženka, priatelia, záujmy) */
  ukazky: boolean;
  tichyOd: string;
  tichyDo: string;
  /** oznámenia (karta 23): hlavný vypínač, prepínače položiek (a = v appke, p = na displej), strop 3 denne, večerný súhrn */
  oznamy: { master: boolean; zmeny: Record<string, { a: boolean; p: boolean }>; strop: boolean; vecer: boolean };
  /** okruh počítať od polohy telefónu (Kde práve som) namiesto Moje miesto */
  odPolohy: boolean;
  /** nepovinné súhlasy (karta 24 · 2e) + záznam zmien (čas, verzia) */
  /** karta 24 · 2g jazyk appky (názov vo vlastnom jazyku) · 2i predvoľba ukázať firme */
  jazyk: string;
  /** skutky mimo firmy: predvoľba pre riadok Firma v náhľade (firma ju nikdy nevidí) */
  firmaPredvolba: FirmaVolba;
  suhlasy: { pers: boolean; stat: boolean; news: boolean; part: boolean; zaznam: { k: string; on: boolean; cas: string; verzia: string }[] };
};
const KLUC = "deed.nastavenia.appky";
const ZAKLAD: NastaveniaAppky = { pismo: 100, obmedzAnim: false, vibracie: true, titulky: true, tichyCas: true, poloha: true, okruh: "mesto", biometria: false, hranicaPlatby: 50, kontakty: false, ukazky: true, tichyOd: "22:00", tichyDo: "7:00", oznamy: { master: true, zmeny: {}, strop: true, vecer: false }, odPolohy: false, jazyk: "Slovenčina", firmaPredvolba: "anonym", suhlasy: { pers: true, stat: true, news: false, part: false, zaznam: [] } };
let verzia = 0;
const posluchaci = new Set<() => void>();

export function nacitajNastavenia(): NastaveniaAppky {
  try { const s = localStorage.getItem(KLUC); return s ? { ...ZAKLAD, ...JSON.parse(s) } : ZAKLAD; } catch { return ZAKLAD; }
}
export function zmenNastavenia(z: Partial<NastaveniaAppky>) {
  const n = { ...nacitajNastavenia(), ...z };
  try { localStorage.setItem(KLUC, JSON.stringify(n)); } catch { /* LS */ }
  aplikujNastavenia(n);
  verzia++; posluchaci.forEach((f) => f());
}
export function useNastaveniaAppky(): NastaveniaAppky {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return nacitajNastavenia();
}

const povodnaVibracia = typeof navigator !== "undefined" ? navigator.vibrate?.bind(navigator) : undefined;
/** premietne nastavenia do celej appky (volá sa pri štarte a pri každej zmene) */
export function aplikujNastavenia(n: NastaveniaAppky = nacitajNastavenia()) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  // veľkosť písma: násobí veľkosť z telefónu. Appka ešte nemá všetko v rem → celá plocha sa škáluje (zoom).
  html.style.setProperty("--pismo", String(n.pismo / 100));
  (html.style as CSSStyleDeclaration & { zoom: string }).zoom = n.pismo === 100 ? "" : String(n.pismo / 100);
  html.classList.toggle("obmedz-anim", n.obmedzAnim);
  window.dispatchEvent(new Event("resize")); // rozloženie (mobil/tablet/PC) sa prepočíta podľa novej veľkosti
  if (povodnaVibracia) {
    try { (navigator as Navigator & { vibrate: Navigator["vibrate"] }).vibrate = n.vibracie ? povodnaVibracia : () => false; } catch { /* read-only */ }
  }
}
