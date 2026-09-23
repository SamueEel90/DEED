// ============================================================
// OZNAMY SUBJEKTU — spoločný engine pre charitu, faru, firmu, spolok, tvorcu.
// Vedomé rozhodnutie: subjekt je len kľúč („charita", „fara:123"), takže ten
// istý kód obslúži každú entitu — kategórie a limity si určuje modul.
// Platnosť: oznam po X dňoch zmizne z profilu, záznam ostáva (mäkká expirácia).
// Perzistencia = localStorage (mock); v produkcii to isté cez server.
// ============================================================
import { useSyncExternalStore } from "react";

export type KategoriaOznamu = "oznam" | "akcia" | "inzerat";

export const OZNAM_CFG = {
  maxNadpis: 70,
  maxText: 600,
  maxFotiek: 3,
  /** predvolená platnosť v dňoch — koľko oznam visí na profile */
  platnostDni: 14,
  /** ponuka platností vo formulári */
  platnosti: [7, 14, 30, 60],
  /** koľko oznamov môže byť naraz pripnutých navrch */
  maxPripnutych: 1,
};

export interface Oznam {
  id: string;
  /** kľúč subjektu — „charita", „tvorca", „b2b", „fara:<id>" */
  entita: string;
  kategoria: KategoriaOznamu;
  nadpis: string;
  text: string;
  fotky?: string[];
  platnostDni: number;
  vytvorene: number;    // ms
  upravene?: number;    // ms
  pripnute?: boolean;
}

const KLUC = (entita: string) => `deed.oznamy.${entita}`;
let verzia = 0;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenyOznamov(): number { return useSyncExternalStore(subscribe, () => verzia); }

export function nacitajOznamy(entita: string): Oznam[] {
  try { return JSON.parse(localStorage.getItem(KLUC(entita)) ?? "[]") as Oznam[]; } catch { return []; }
}
function uloz(entita: string, v: Oznam[]) {
  try { localStorage.setItem(KLUC(entita), JSON.stringify(v)); } catch { /* LS nedostupné */ }
  verzia++; posluchaci.forEach((f) => f());
}

const DEN = 86400000;
/** oznam je na profile, kým nevyprší platnosť — potom ostáva len v správe */
export const oznamAktivny = (o: Oznam, teraz = Date.now()) => teraz < o.vytvorene + o.platnostDni * DEN;
/** koľko dní ešte visí (záporné = skončil) */
export const dniDoKonca = (o: Oznam, teraz = Date.now()) =>
  Math.ceil((o.vytvorene + o.platnostDni * DEN - teraz) / DEN);

/** oznamy subjektu pre verejný profil — pripnuté navrch, potom najnovšie */
export function verejneOznamy(entita: string, teraz = Date.now()): Oznam[] {
  return nacitajOznamy(entita)
    .filter((o) => oznamAktivny(o, teraz))
    .sort((a, b) => Number(!!b.pripnute) - Number(!!a.pripnute) || b.vytvorene - a.vytvorene);
}
/** všetky oznamy subjektu pre správu — aj skončené, najnovšie hore */
export function vsetkyOznamy(entita: string): Oznam[] {
  return nacitajOznamy(entita).sort((a, b) => b.vytvorene - a.vytvorene);
}
export function useOznamy(entita: string): Oznam[] {
  useZmenyOznamov();
  return vsetkyOznamy(entita);
}

export function pridajOznam(o: Omit<Oznam, "id" | "vytvorene">): Oznam {
  const novy: Oznam = { ...o, id: `oz-${Date.now()}`, vytvorene: Date.now() };
  uloz(o.entita, [novy, ...nacitajOznamy(o.entita)]);
  return novy;
}
export function upravOznam(entita: string, id: string, patch: Partial<Oznam>) {
  uloz(entita, nacitajOznamy(entita).map((o) => (o.id === id ? { ...o, ...patch, upravene: Date.now() } : o)));
}
export function zmazOznam(entita: string, id: string) {
  uloz(entita, nacitajOznamy(entita).filter((o) => o.id !== id));
}
/** pripnutie navrch — naraz len OZNAM_CFG.maxPripnutych, ostatné sa odopnú */
export function pripniOznam(entita: string, id: string, pripnut: boolean) {
  uloz(entita, nacitajOznamy(entita).map((o) =>
    o.id === id ? { ...o, pripnute: pripnut } : pripnut ? { ...o, pripnute: false } : o));
}
/** predĺženie platnosti bežiaceho oznamu — posunie začiatok, nie dĺžku */
export function predlzOznam(entita: string, id: string, dni: number) {
  upravOznam(entita, id, { vytvorene: Date.now(), platnostDni: dni });
}
