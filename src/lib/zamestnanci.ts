// ============================================================
// ZAMESTNANCI FIRMY — väzba človek ↔ firma. Vždy OBOJSTRANNÁ a dobrovoľná:
// buď firma pošle pozvánku a človek ju prijme, alebo človek požiada a firma
// ho potvrdí. Jednostranne sa nikto k nikomu nepripojí.
//
// Načo to je: firma dorovnáva dary SVOJICH ľudí a potrebuje vedieť, kto to je.
// Zamestnanec nedáva firme nič iné — firma nevidí, komu daroval mimo jej zbierok.
//
// Odpojiť sa dá kedykoľvek z oboch strán; väzba sa nemaže, len sa uzavrie
// (dovtedajšie dorovnané dary ostávajú platné, spätne sa nič neprepisuje).
//
// Mock: localStorage. V produkcii je to tabuľka väzieb s pozvánkovým kódom.
// ============================================================
import { useSyncExternalStore } from "react";
import { rovnakaFirma } from "./firma";

export type StavVazby =
  | "pozvany"     // firma pozvala, čaká sa na človeka
  | "ziadost"     // človek požiadal, čaká sa na firmu
  | "potvrdeny"   // obe strany súhlasili — väzba platí
  | "odmietnuty"  // jedna strana odmietla
  | "odpojeny";   // väzba bola ukončená

export interface Vazba {
  firma: string;
  /** meno človeka (v produkcii jeho účet, nie meno) */
  osoba: string;
  stav: StavVazby;
  /** kto to začal — kvôli textom („pozvali ste" vs „požiadal vás") */
  zaciatok: "firma" | "osoba";
  kedy: number;
  potvrdene?: number;
  ukoncene?: number;
}

const KLUC = "deed.zamestnanci";
const posluchaci = new Set<() => void>();
let verzia = 0;
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
const emit = () => { verzia++; posluchaci.forEach((f) => f()); };
export function useZmenyVazieb() {
  useSyncExternalStore(subscribe, () => verzia, () => 0);
}

export function nacitaj(): Vazba[] {
  try { return JSON.parse(localStorage.getItem(KLUC) ?? "[]") as Vazba[]; } catch { return []; }
}
function uloz(v: Vazba[]) {
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  emit();
}
const rovnakaOsoba = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const najdiIndex = (v: Vazba[], firma: string, osoba: string) =>
  v.findIndex((x) => rovnakaFirma(x.firma, firma) && rovnakaOsoba(x.osoba, osoba));

/** živá väzba = tá, ktorá ešte nie je uzavretá */
const ziva = (x: Vazba) => x.stav === "pozvany" || x.stav === "ziadost" || x.stav === "potvrdeny";

function zapis(firma: string, osoba: string, zmena: Partial<Vazba>, novy?: Vazba): Vazba {
  const v = nacitaj();
  const i = najdiIndex(v, firma, osoba);
  if (i >= 0) {
    const upraveny = { ...v[i], ...zmena };
    uloz(v.map((x, j) => (j === i ? upraveny : x)));
    return upraveny;
  }
  const z = novy ?? { firma, osoba, stav: "pozvany" as StavVazby, zaciatok: "firma" as const, kedy: Date.now(), ...zmena };
  uloz([z, ...v]);
  return z;
}

/** firma pozýva človeka */
export const pozvi = (firma: string, osoba: string) =>
  zapis(firma, osoba, { stav: "pozvany", zaciatok: "firma", kedy: Date.now(), ukoncene: undefined });

/** človek žiada o pripojenie k firme */
export const poziadaj = (firma: string, osoba: string) =>
  zapis(firma, osoba, { stav: "ziadost", zaciatok: "osoba", kedy: Date.now(), ukoncene: undefined });

/** druhá strana súhlasí — až tým väzba platí */
export const potvrd = (firma: string, osoba: string) =>
  zapis(firma, osoba, { stav: "potvrdeny", potvrdene: Date.now() });

export const odmietni = (firma: string, osoba: string) =>
  zapis(firma, osoba, { stav: "odmietnuty", ukoncene: Date.now() });

/** ukončenie platnej väzby — z oboch strán, kedykoľvek */
export const odpoj = (firma: string, osoba: string) =>
  zapis(firma, osoba, { stav: "odpojeny", ukoncene: Date.now() });

/** väzby firmy — čakajúce hore, potvrdení pod nimi */
export function vazbyFirmy(firma: string): Vazba[] {
  const poradie: Record<StavVazby, number> = { ziadost: 0, pozvany: 1, potvrdeny: 2, odmietnuty: 3, odpojeny: 4 };
  return nacitaj().filter((x) => rovnakaFirma(x.firma, firma)).sort((a, b) => poradie[a.stav] - poradie[b.stav] || b.kedy - a.kedy);
}
/** potvrdení zamestnanci — nad nimi beží zamestnanecké dorovnanie */
export const zamestnanci = (firma: string): Vazba[] =>
  nacitaj().filter((x) => rovnakaFirma(x.firma, firma) && x.stav === "potvrdeny");

/** väzba človeka — jedna živá naraz (kto robí u dvoch firiem, rieši sa neskôr) */
export const vazbaOsoby = (osoba: string): Vazba | null =>
  nacitaj().find((x) => rovnakaOsoba(x.osoba, osoba) && ziva(x)) ?? null;

/** je tento človek potvrdeným zamestnancom firmy? (podklad pre dorovnanie) */
export const jeZamestnanec = (firma: string, osoba: string): boolean =>
  nacitaj().some((x) => rovnakaFirma(x.firma, firma) && rovnakaOsoba(x.osoba, osoba) && x.stav === "potvrdeny");

export function useVazbyFirmy(firma: string): Vazba[] {
  useZmenyVazieb();
  return vazbyFirmy(firma);
}
export function useVazbaOsoby(osoba: string): Vazba | null {
  useZmenyVazieb();
  return vazbaOsoby(osoba);
}

/** meno prihláseného človeka — odkladá ho lib/pouzivatel, engine k nemu inak nemá prístup */
export function menoDarcu(): string {
  try { return localStorage.getItem("deed.ja.meno") ?? ""; } catch { return ""; }
}
/** je práve prihlásený človek potvrdeným zamestnancom tejto firmy? */
export const somZamestnanec = (firma: string): boolean => {
  const ja = menoDarcu();
  return !!ja && jeZamestnanec(firma, ja);
};
