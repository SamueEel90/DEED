// ============================================================
// OPRAVY 271 — rozpísané sa nesmie stratiť: koncept na zariadení natrvalo (localStorage), kým sa nezverejní
// alebo človek neťukne „Zahodiť“. Platí aj keď Safari gestom späť zavrie stránku.
// Fotky ako data URL môžu byť veľké — keď sa nezmestia, koncept sa uloží bez nich.
// ============================================================
import { useEffect } from "react";

const K = (k: string) => `deed.koncept.${k}`;
export interface Koncept<T> { d: T; cas: number }

export function nacitajKoncept<T>(k: string): Koncept<T> | null {
  try { const s = localStorage.getItem(K(k)); return s ? (JSON.parse(s) as Koncept<T>) : null; } catch { return null; }
}
/** data URL (base64) nahradí prázdnym — záložné uloženie, keď je koncept príliš veľký */
const bezData = (v: unknown): unknown => typeof v === "string" ? (/^data:/.test(v) ? "" : v)
  : Array.isArray(v) ? v.map(bezData).filter((x) => !(x && typeof x === "object" && "src" in x && !(x as { src: string }).src))
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, bezData(b)])) : v;
export function ulozKoncept<T>(k: string, d: T) {
  const z = (x: unknown) => localStorage.setItem(K(k), JSON.stringify({ d: x, cas: Date.now() }));
  try { z(d); } catch { try { z(bezData(d)); } catch { /* úložisko plné */ } }
}
export function zmazKoncept(k: string) { try { localStorage.removeItem(K(k)); } catch { /* nič */ } }

/** ukladá koncept pri každej zmene (po 400 ms), keď je `aktivny` (rozpísané, nie úprava zverejneného) */
export function useUkladajKoncept<T>(k: string, d: T, aktivny: boolean) {
  const json = aktivny ? JSON.stringify(d) : "";
  useEffect(() => {
    if (!json) return;
    const t = window.setTimeout(() => ulozKoncept(k, JSON.parse(json) as T), 400);
    return () => window.clearTimeout(t);
  }, [k, json]);
}
