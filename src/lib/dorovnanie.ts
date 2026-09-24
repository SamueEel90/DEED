// ============================================================
// DOROVNANIE DARU (firemný matching) — firma pridá ku každému daru svoj
// diel, kým sa nevyčerpá jej strop. Právne je to dar ako každý iný:
// žiadne protiplnenie, žiadna faktúra, karma ako ktorýkoľvek darca.
//
// Poradie krokov (dôkaz v každom kroku, nič sa nemení spätne):
//   charita pri vytváraní zbierky zapne „Prijímame dorovnanie"
//   → firma nastaví parametre a UHRADÍ sumu priamo charite (my sa jej nedotkneme)
//   → až po úhrade ZAPEČATÍ (odvtedy sa parametre nedajú zmeniť)
//   → charita príjem potvrdí → dorovnanie beží a je vidieť pri zbierke
// Charita nič neschvaľuje (súhlas dala zaškrtnutím), ale kým firma
// nezaplatila, vie ho odmietnuť.
// ============================================================
import { useSyncExternalStore } from "react";

export const DOROVNANIE_CFG = {
  /** ponuka pomerov vo formulári firmy — koľkonásobok daru firma pridá */
  pomery: [0.5, 1, 2, 5],
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
  | "zapecatene"      // firma uhradila a zapečatila, čaká na potvrdenie charity
  | "aktivne"         // peniaze sú u charity, dorovnanie beží
  | "pozastavene"     // zbierka aj dary stoja; čaká sa na vysporiadanie zvyšku
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
  /** koniec obdobia; pri „do vyčerpania" je to len technický strop */
  do: number;
  /** beží, kým sa nevyčerpá strop — bez dátumu konca */
  doVycerpania?: boolean;
  /** nevyčerpaný zvyšok na konci: ostáva zbierke (default) alebo späť firme */
  zvysok: "zbierke" | "firme";
  stav: StavDorovnania;
  /** časové pečiatky krokov — dôkaz, že poradie sedelo */
  zapecatene: number;
  zaplatene?: number;
  ukoncene?: number;
  /** nemenná história dorovnaných darov */
  zaznamy: ZaznamDorovnania[];
  // ---- ukončenie: zbierka stojí → zvyšok vysporiadaný → až potom koniec ----
  pozastavene?: number;
  /** ako sa naložilo so zvyškom a kedy — bez toho sa dorovnanie nedá ukončiť */
  vysporiadane?: { suma: number; kam: "zbierke" | "firme"; kedy: number; referencia?: string };
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

/** zmazať sa dá len to, čo je už uzavreté — bežiace a zaplatené drží peniaze */
export const daSaZmazat = (d: Dorovnanie) =>
  d.stav === "ukoncene" || d.stav === "odmietnute" || d.stav === "zrusene"
  || (d.stav === "vycerpane" && !!d.ukoncene);

export function zmazDorovnanie(entita: string, id: string): boolean {
  const v = nacitajDorovnania(entita);
  const d = v.find((x) => x.id === id);
  if (!d || !daSaZmazat(d)) return false;
  uloz(entita, v.filter((x) => x.id !== id));
  return true;
}

/** všetky entity, ktoré majú nejaké dorovnanie (mock — v produkcii jeden dotaz) */
function vsetkyEntity(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("deed.dorovnania.")) out.push(k.slice("deed.dorovnania.".length));
    }
  } catch { /* LS nedostupné */ }
  return out;
}

/** porovnanie názvov firiem — „Pekáreň Dobrota" a „Pekáreň Dobrota s.r.o." je tá istá
 *  firma (v prototype je identitou názov z QR; v produkcii to bude IČO) */
const kluceFirmy = (n: string) => n
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\b(s\.?\s?r\.?\s?o\.?|a\.?\s?s\.?|o\.?\s?z\.?|spol\.?|k\.?\s?s\.?|n\.?\s?o\.?)\b/g, "")
  .replace(/[^a-z0-9]+/g, "")
  .trim();
export const rovnakaFirma = (a: string, b: string) => kluceFirmy(a) === kluceFirmy(b);

/** dorovnania jednej firmy naprieč charitami — pohľad z jej vlastnej správy */
export function dorovnaniaFirmy(firma: string): Dorovnanie[] {
  return vsetkyEntity()
    .flatMap((e) => nacitajDorovnania(e))
    .filter((d) => rovnakaFirma(d.firma, firma))
    .sort((a, b) => b.zapecatene - a.zapecatene);
}
export function useDorovnaniaFirmy(firma: string): Dorovnanie[] {
  useZmenyDorovnani();
  return dorovnaniaFirmy(firma);
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

// ---- ukončenie má poradie: pozastaviť → vysporiadať zvyšok → ukončiť ----
/** zbierka sa zastaví: neprijíma dary, takže sa už nič nedorovnáva */
export const pozastav = (entita: string, id: string) =>
  zmen(entita, id, { stav: "pozastavene", pozastavene: Date.now() });

/** Kam ide zvyšok:
 *  · charita zbierku zrušila sama → VŠETKO späť firme. Firma si kupovala
 *    dorovnanie darov, nie dar charite — keď charita skončí, nemá si čo nechať.
 *  · zbierka dobehla prirodzene (cieľ, termín) → podľa toho, čo si firma
 *    zvolila pri zapečatení (nechať zbierke / vrátiť).
 */
export function vysporiadaj(entita: string, id: string, predcasne = true, referencia?: string) {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d || d.stav !== "pozastavene" || d.vysporiadane) return;
  const kam: "zbierke" | "firme" = predcasne ? "firme" : d.zvysok;
  zmen(entita, id, { vysporiadane: { suma: zostatok(d), kam, kedy: Date.now(), referencia } });
}

/** ukončiť sa dá až po vysporiadaní zvyšku — inak by charita držala cudzie peniaze */
export function ukonci(entita: string, id: string): boolean {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d) return false;
  if (d.stav !== "pozastavene" || !d.vysporiadane) return false;
  zmen(entita, id, { stav: "ukoncene", ukoncene: Date.now() });
  return true;
}

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

/** čo firma pridáva — slovom, nech to netreba lúštiť */
export const popisPomeru = (pomer: number) =>
  pomer === 0.5 ? "polovicu daru"
  : pomer === 1 ? "rovnakú sumu"
  : pomer === 2 ? "dvojnásobok"
  : pomer === 5 ? "päťnásobok"
  : `${pomer}-násobok`;

/** názov voľby vo formulári firmy */
export const nazovPomeru = (pomer: number) =>
  pomer === 0.5 ? "Polovica daru"
  : pomer === 1 ? "Rovnaký dar"
  : pomer === 2 ? "Dvojnásobný dar"
  : pomer === 5 ? "Päťnásobný dar"
  : `${pomer}× dar`;

/** koľko bude mať príjemca z daru 20 € — príklad pod voľbu */
export const priklad = (pomer: number, dar = 20) => dar + dar * pomer;
