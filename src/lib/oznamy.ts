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
  /** pracovná ponuka je dlhšia — reálne výberové konania majú 2–4 tisíc znakov */
  maxTextPonuky: 4000,
  maxFotiek: 3,
  /** predvolená platnosť v dňoch — koľko oznam visí na profile */
  platnostDni: 14,
  /** ponuka platností vo formulári */
  platnosti: [7, 14, 30, 60],
  /** koľko oznamov môže byť naraz pripnutých navrch */
  maxPripnutych: 1,
};

/** limity inzerátov podľa programu — počítajú sa BEŽIACE (neobsadené, nevypršané) */
export const INZERAT_CFG = {
  limity: { 0: 0, 1: 1, 2: 5, 3: 9999, 4: 9999 } as Record<number, number>,
  platnostDni: 30,
  platnosti: [14, 30, 60],
  /** po zavretí inzerátu sa kontakty záujemcov po toľkých dňoch zmažú */
  dniDoZmazaniaKontaktov: 30,
};

/** podrobnosti pracovnej ponuky — to, čo človek hľadá očami skôr, než začne čítať */
export interface PonukaDetail {
  miesto?: string;
  uvazok?: string;
  nastup?: string;
  /** uzávierka prihlášok (ms) — po nej ponuka sama zíde z profilu */
  uzavierka?: number;
  mzda?: string;
  // ---- ako sa prihlásiť ----
  /** cez DEED tlačidlom „Mám záujem" */
  cezDeed?: boolean;
  /** žiadosť e-mailom */
  email?: string;
  /** žiadosť poštou / osobne */
  adresa?: string;
  /** čo treba priložiť (životopis, doklad o vzdelaní…) */
  doklady?: string;
  /** hotový dokument výberového konania (odkaz „idb:…", lib/prilohy.ts) */
  priloha?: string;
  prilohaNazov?: string;
}

/** človek, čo klikol „Mám záujem" — vypĺňa si údaje sám a vyberá, čo dá k dispozícii */
export interface Zaujemca {
  id: string;
  meno: string;
  telefon?: string;
  email?: string;
  poznamka?: string;
  /** dobrovoľne priložený štít a karma z profilu */
  stit?: string;
  karma?: number;
  kedy: number;
}

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
  // ---- len inzerát ----
  /** miesto je obsadené — inzerát prestáva bežať, ostatným sa poďakuje */
  obsadene?: number;      // ms, kedy sa zavrel
  zaujemcovia?: Zaujemca[];
  ponuka?: PonukaDetail;
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
export const oznamAktivny = (o: Oznam, teraz = Date.now()) =>
  teraz < o.vytvorene + o.platnostDni * DEN && !poUzavierke(o, teraz);
/** ponuka s uzávierkou prihlášok zíde z profilu sama, nech nikto neposiela žiadosť zbytočne */
export const poUzavierke = (o: Oznam, teraz = Date.now()) =>
  !!o.ponuka?.uzavierka && teraz > o.ponuka.uzavierka + DEN;   // do konca dňa uzávierky
/** koľko dní ešte visí (záporné = skončil) */
export const dniDoKonca = (o: Oznam, teraz = Date.now()) =>
  Math.max(0, Math.round((o.vytvorene + o.platnostDni * DEN - teraz) / DEN));

/** oznamy subjektu pre verejný profil — pripnuté navrch, potom najnovšie */
export function verejneOznamy(entita: string, kategoria: KategoriaOznamu = "oznam", teraz = Date.now()): Oznam[] {
  return nacitajOznamy(entita)
    .filter((o) => o.kategoria === kategoria && !o.obsadene && oznamAktivny(o, teraz))
    .sort((a, b) => Number(!!b.pripnute) - Number(!!a.pripnute) || b.vytvorene - a.vytvorene);
}
/** všetky oznamy subjektu pre správu — aj skončené, najnovšie hore */
export function vsetkyOznamy(entita: string, kategoria: KategoriaOznamu = "oznam"): Oznam[] {
  return nacitajOznamy(entita).filter((o) => o.kategoria === kategoria).sort((a, b) => b.vytvorene - a.vytvorene);
}
export function useOznamy(entita: string, kategoria: KategoriaOznamu = "oznam"): Oznam[] {
  useZmenyOznamov();
  return vsetkyOznamy(entita, kategoria);
}

// ---- INZERÁTY ----
/** beží = neobsadený a nevypršaný; limit sa počíta z týchto */
export const beziaceInzeraty = (entita: string, teraz = Date.now()) =>
  nacitajOznamy(entita).filter((o) => o.kategoria === "inzerat" && !o.obsadene && oznamAktivny(o, teraz));
export const limitInzeratov = (tier: number) => INZERAT_CFG.limity[tier] ?? 0;
/** miesto obsadené — inzerát zmizne z profilu, záujemcovia ostávajú v správe */
export function obsadInzerat(entita: string, id: string) {
  upravOznam(entita, id, { obsadene: Date.now() });
}
export function otvorInzeratZnova(entita: string, id: string, dni: number) {
  upravOznam(entita, id, { obsadene: undefined, vytvorene: Date.now(), platnostDni: dni });
}
export function pridajZaujemcu(entita: string, id: string, z: Omit<Zaujemca, "id" | "kedy">): string | null {
  const inz = nacitajOznamy(entita).find((o) => o.id === id);
  if (!inz) return null;
  const novy: Zaujemca = { ...z, id: `zj-${Date.now()}`, kedy: Date.now() };
  upravOznam(entita, id, { zaujemcovia: [...(inz.zaujemcovia ?? []), novy] });
  return novy.id;
}
export function zrusZaujem(entita: string, id: string, zaujemcaId: string): void {
  const inz = nacitajOznamy(entita).find((o) => o.id === id);
  if (!inz) return;
  upravOznam(entita, id, { zaujemcovia: (inz.zaujemcovia ?? []).filter((z) => z.id !== zaujemcaId) });
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
