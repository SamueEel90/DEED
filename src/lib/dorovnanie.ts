// ============================================================
// DOROVNANIE DARU (firemný matching) — firma pridá ku každému daru svoj
// diel, kým sa nevyčerpá jej strop. Právne je to dar ako každý iný:
// žiadne protiplnenie, žiadna faktúra, karma ako ktorýkoľvek darca.
//
// Poradie krokov (dôkaz v každom kroku, nič sa nemení spätne):
//   charita pri vytváraní zbierky zapne „Prijímame dorovnanie"
//   → firma nastaví parametre a ZAPEČATÍ (odvtedy sa nedajú zmeniť)
//   → firma pošle peniaze priamo charite (my sa ich nedotkneme)
//   → charita príjem potvrdí → dorovnanie beží a je vidieť pri zbierke
// Charita nič neschvaľuje (súhlas dala zaškrtnutím), ale kým firma
// nezaplatila, vie ho odmietnuť.
// ============================================================
import { useSyncExternalStore } from "react";

export const DOROVNANIE_CFG = {
  /** ponuka pomerov vo formulári firmy (× k daru) — 4 = k príjemcovi ide päťnásobok */
  pomery: [0.5, 1, 2, 4],
  /** predvolený pomer */
  pomer: 1,
  /** odvetvia, ktoré nesmú dorovnávať tam, kde samy robia škodu (§ pravidlo platformy) */
  zakazaneKombinacie: [
    { odvetvie: "hazard", zbierky: ["zavislosti", "deti"] },
    { odvetvie: "alkohol", zbierky: ["zavislosti"] },
    { odvetvie: "pozicky", zbierky: ["exekucie", "dlhy"] },
  ],
};

export type StavDorovnania =
  | "zapecatene"      // firma nastavila a zapečatila, čaká sa na jej platbu
  | "aktivne"         // peniaze sú u charity, dorovnanie beží
  | "vycerpane"       // strop minutý
  | "ukoncene"        // koniec obdobia alebo koniec zbierky
  | "odmietnute"      // charita odmietla (len pred platbou)
  | "zrusene";        // firma zrušila (len pred platbou)

/** jeden dorovnaný dar — nemenný záznam */
export interface ZaznamDorovnania {
  id: string;
  dar: number;
  dorovnane: number;
  kedy: number;
}

export interface Dorovnanie {
  id: string;
  /** kľúč subjektu, ktorému zbierka patrí — „charita", „fara:12"… */
  entita: string;
  /** čoho sa drží: konkrétna zbierka / sektor / celá organizácia */
  ciel: string;
  cielNazov: string;
  firma: string;
  firmaProfil?: string;
  firmaLogo?: string;
  /** × k daru: 1 = dorovná rovnakú sumu (×2 pre príjemcu) */
  pomer: number;
  /** koľko firma vyčlenila celkom (predplatené) */
  strop: number;
  od: number;
  do: number;
  /** nevyčerpaný zvyšok na konci: ostáva zbierke (default) alebo späť firme */
  zvysok: "zbierke" | "firme";
  stav: StavDorovnania;
  /** časové pečiatky krokov — dôkaz, že poradie sedelo */
  zapecatene: number;
  zaplatene?: number;
  ukoncene?: number;
  /** nemenná história dorovnaných darov */
  zaznamy: ZaznamDorovnania[];
}

const KLUC = (entita: string) => `deed.dorovnania.${entita}`;
let verzia = 0;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenyDorovnani(): number { return useSyncExternalStore(subscribe, () => verzia); }

export function nacitajDorovnania(entita: string): Dorovnanie[] {
  try { return JSON.parse(localStorage.getItem(KLUC(entita)) ?? "[]") as Dorovnanie[]; } catch { return []; }
}
function uloz(entita: string, v: Dorovnanie[]) {
  try { localStorage.setItem(KLUC(entita), JSON.stringify(v)); } catch { /* LS nedostupné */ }
  verzia++; posluchaci.forEach((f) => f());
}

// ---- výpočet ----
export const vycerpane = (d: Dorovnanie) => d.zaznamy.reduce((s, z) => s + z.dorovnane, 0);
export const zostatok = (d: Dorovnanie) => Math.max(0, d.strop - vycerpane(d));

/** koľko firma pridá k tomuto daru — nikdy viac, než koľko jej ostáva */
export function dorovnanieKDaru(d: Dorovnanie, dar: number, teraz = Date.now()): number {
  if (!bezi(d, teraz) || dar <= 0) return 0;
  return Math.min(Math.round(dar * d.pomer * 100) / 100, zostatok(d));
}

export const bezi = (d: Dorovnanie, teraz = Date.now()) =>
  d.stav === "aktivne" && teraz >= d.od && teraz <= d.do && zostatok(d) > 0;

/** dorovnanie, ktoré práve beží na danom cieli (zbierka/sektor/organizácia) */
export function beziaceDorovnanie(entita: string, ciel: string, teraz = Date.now()): Dorovnanie | null {
  return nacitajDorovnania(entita).find((d) => d.ciel === ciel && bezi(d, teraz)) ?? null;
}

export function useDorovnania(entita: string): Dorovnanie[] {
  useZmenyDorovnani();
  return nacitajDorovnania(entita).sort((a, b) => b.zapecatene - a.zapecatene);
}

// ---- kroky ----
/** firma nastavila a zapečatila — parametre sa už nedajú zmeniť */
export function zapecat(n: Omit<Dorovnanie, "id" | "stav" | "zapecatene" | "zaznamy">): Dorovnanie {
  const novy: Dorovnanie = { ...n, id: `dv-${Date.now()}`, stav: "zapecatene", zapecatene: Date.now(), zaznamy: [] };
  uloz(n.entita, [novy, ...nacitajDorovnania(n.entita)]);
  return novy;
}
function zmen(entita: string, id: string, patch: Partial<Dorovnanie>) {
  uloz(entita, nacitajDorovnania(entita).map((d) => (d.id === id ? { ...d, ...patch } : d)));
}
/** charita potvrdila, že peniaze prišli na jej účet → odvtedy sa smie sľubovať darcom */
export const potvrdPlatbu = (entita: string, id: string) =>
  zmen(entita, id, { stav: "aktivne", zaplatene: Date.now() });
/** len kým firma nezaplatila */
export const odmietni = (entita: string, id: string) => zmen(entita, id, { stav: "odmietnute", ukoncene: Date.now() });
export const zrus = (entita: string, id: string) => zmen(entita, id, { stav: "zrusene", ukoncene: Date.now() });
export const ukonci = (entita: string, id: string) => zmen(entita, id, { stav: "ukoncene", ukoncene: Date.now() });

/** zapíše dorovnanie k jednému daru — vracia, koľko firma pridala */
export function zapisDar(entita: string, id: string, dar: number, teraz = Date.now()): number {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d) return 0;
  const pridane = dorovnanieKDaru(d, dar, teraz);
  if (pridane <= 0) return 0;
  const zaznamy = [...d.zaznamy, { id: `zd-${teraz}`, dar, dorovnane: pridane, kedy: teraz }];
  const minute = zaznamy.reduce((s, z) => s + z.dorovnane, 0) >= d.strop;
  zmen(entita, id, { zaznamy, ...(minute ? { stav: "vycerpane" as StavDorovnania, ukoncene: teraz } : {}) });
  return pridane;
}

/** text na bežec pri zbierke */
export const popisPomeru = (pomer: number) =>
  pomer === 1 ? "×2" : pomer === 2 ? "×3" : pomer === 0.5 ? "+50 %" : `×${1 + pomer}`;
