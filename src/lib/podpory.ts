// ============================================================
// PODPORY FIRIEM — „dar = pripnutie".
// Firma nezdieľa a nevyberá si, čo si dá na stránku: keď na zbierku
// reálne dala peniaze, zbierka sa jej sama objaví na podstránke a ona
// ju tým šíri ďalej. Nedá sa teda pripnúť zbierka, na ktorú firma
// nedala ani cent — to je celá ochrana proti chváleniu sa cudzím.
//
// V zbierke je opačný smer: pri nej svieti, ktorá firma ju podporila
// a akou sumou (Pekáreň Dobrota · 500 €).
//
// Archív: firma si zbierku môže stiahnuť z podstránky (nové veci, alebo
// nulový záujem zamestnancov). Dar sa tým NEMAŽE — ostáva v histórii aj
// v ESG číslach, len sa už neprezentuje.
//
// Mock: localStorage. V produkcii to bude view nad platbami (kto komu koľko).
// ============================================================
import { useSyncExternalStore } from "react";
import { rovnakaFirma } from "./firma";

export interface Podpora {
  /** názov firmy z jej profilu (v produkcii IČO) */
  firma: string;
  zbierkaId: string;
  /** koľko firma na túto zbierku reálne dala — vlastné dary + dorovnané sumy */
  suma: number;
  /** strop matchingu, ktorý firma zaplatila vopred (leží na účte charity,
   *  ale ešte sa nerozdal darcom) — preto sa uvádza zvlášť, nie ako „darované" */
  vyclenene?: number;
  prve: number;
  posledne: number;
  /** stiahnuté z podstránky — dar ostáva, len sa neprezentuje */
  archivovane?: number;
}

const KLUC = "deed.podpory";
const posluchaci = new Set<() => void>();
let verzia = 0;
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
const emit = () => { verzia++; posluchaci.forEach((f) => f()); };
export function useZmenyPodpor() {
  useSyncExternalStore(subscribe, () => verzia, () => 0);
}

export function nacitaj(): Podpora[] {
  try { return JSON.parse(localStorage.getItem(KLUC) ?? "[]") as Podpora[]; } catch { return []; }
}
function uloz(v: Podpora[]) {
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  emit();
}

/** firma dala na zbierku — pripne sa jej na podstránku (a suma sa pripočíta) */
export function pridajPodporu(firma: string, zbierkaId: string, suma: number): Podpora {
  const teraz = Date.now();
  const v = nacitaj();
  const i = v.findIndex((p) => p.zbierkaId === zbierkaId && rovnakaFirma(p.firma, firma));
  if (i >= 0) {
    // ďalší dar na tú istú zbierku ju zároveň vracia z archívu — firma do nej
    // znova dala, tak nech je zase vidieť
    const { archivovane: _archiv, ...zvysok } = v[i];
    const novy: Podpora = { ...zvysok, suma: v[i].suma + suma, posledne: teraz };
    uloz(v.map((p, j) => (j === i ? novy : p)));
    return novy;
  }
  const novy: Podpora = { firma, zbierkaId, suma, prve: teraz, posledne: teraz };
  uloz([novy, ...v]);
  return novy;
}

/** firma zapečatila matching — strop je zaplatený vopred, takže zbierku
 *  pripína rovnako ako dar, len sa ukazuje ako „vyčlenené", nie „darované" */
export function pripniVyclenene(firma: string, zbierkaId: string, strop: number): Podpora {
  const teraz = Date.now();
  const v = nacitaj();
  const i = v.findIndex((p) => p.zbierkaId === zbierkaId && rovnakaFirma(p.firma, firma));
  if (i >= 0) {
    const { archivovane: _archiv, ...zvysok } = v[i];
    const novy: Podpora = { ...zvysok, vyclenene: (v[i].vyclenene ?? 0) + strop, posledne: teraz };
    uloz(v.map((p, j) => (j === i ? novy : p)));
    return novy;
  }
  const novy: Podpora = { firma, zbierkaId, suma: 0, vyclenene: strop, prve: teraz, posledne: teraz };
  uloz([novy, ...v]);
  return novy;
}

/** stiahnuť z podstránky — dar ostáva v histórii aj v ESG */
export const archivuj = (firma: string, zbierkaId: string) =>
  uloz(nacitaj().map((p) => (p.zbierkaId === zbierkaId && rovnakaFirma(p.firma, firma) ? { ...p, archivovane: Date.now() } : p)));
export const vratZArchivu = (firma: string, zbierkaId: string) =>
  uloz(nacitaj().map((p) => (p.zbierkaId === zbierkaId && rovnakaFirma(p.firma, firma) ? { ...p, archivovane: undefined } : p)));

/** Kto práve daruje: ak je používateľ prepnutý do roly firmy, dar je firemný.
 *  Rola aj názov sedia v mock stave (deed.rola.*), preto sa čítajú odtiaľ —
 *  v produkcii to bude identita prihláseného účtu, nie localStorage. */
export function firmaAkoDarca(): string | null {
  // Rozhoduje VÝHRADNE prepínač „Darujem ako firma". Prepnutá rola to určovať
  // nesmie: správca firmy je aj bežný človek a musí vedieť darovať sám za seba
  // (inak sa nedá vyskúšať zamestnanecké dorovnanie, keď spravuješ tú istú firmu).
  try {
    if (localStorage.getItem("deed.dev.darcaFirma") !== "1") return null;
  } catch { return null; }
  try {
    const vlastny = JSON.parse(localStorage.getItem("deed.rola.nazov.b2b") ?? "null") as string | null;
    return vlastny && vlastny.trim() ? vlastny.trim() : NAZOV_FIRMY_DEV;
  } catch { return NAZOV_FIRMY_DEV; }
}
/** názov firmy v DEV mocku (SUBJEKTY.b2b) — lib nesmie ťahať features, tak je tu */
const NAZOV_FIRMY_DEV = "Pekáreň Dobrota s.r.o.";

/** čo firma podporuje — najnovšie hore */
export const podporyFirmy = (firma: string): Podpora[] =>
  nacitaj().filter((p) => rovnakaFirma(p.firma, firma)).sort((a, b) => b.posledne - a.posledne);

/** kto podporil túto zbierku — najštedrejší hore (archív sa tu NEskrýva:
 *  firma sa môže stiahnuť zo svojej stránky, ale dar zbierke ostáva jej) */
export const podporyZbierky = (zbierkaId: string): Podpora[] =>
  nacitaj().filter((p) => p.zbierkaId === zbierkaId).sort((a, b) => b.suma - a.suma);

export function usePodporyFirmy(firma: string): Podpora[] {
  useZmenyPodpor();
  return podporyFirmy(firma);
}
export function usePodporyZbierky(zbierkaId: string): Podpora[] {
  useZmenyPodpor();
  return podporyZbierky(zbierkaId);
}
