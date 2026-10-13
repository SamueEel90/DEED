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
// Server: tabuľka podpora_firmy (0082b), localStorage je cache / offline.
// Neskôr to bude pohľad nad platbami (kto komu koľko), keď firemný dar pôjde cez platby.
// ============================================================
import { useSyncExternalStore } from "react";
import { rovnakaFirma, nazovFirmy, DEV_FIRMA } from "./firma";
import { normCislo } from "./identita";
import { supabase } from "./supabase";

export interface Podpora {
  /** Zadanie 1 · Blok 1: kľúč firmy = číslo jej účtu (U-…, lib/firma), NIKDY názov */
  firmaUcet: string;
  /** názov firmy len na zobrazenie */
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
  void stiahni();
  useSyncExternalStore(subscribe, () => verzia, () => 0);
}

// ---- server (0082b): celá tabuľka je malá → stiahne sa raz, po každej zmene znova ----
let stiahnute = false;
async function stiahni(znova = false) {
  if (!supabase || (stiahnute && !znova)) return;
  stiahnute = true;
  const { data, error } = await supabase.from("podpora_firmy").select("*").limit(2000);
  if (error) { stiahnute = false; return; } // tabuľka ešte nebeží → len lokálne
  const ms = (t: string | null) => (t ? new Date(t).getTime() : undefined);
  uloz((data ?? []).map((r) => ({
    firmaUcet: r.firma_ucet, firma: r.firma, zbierkaId: r.zbierka, suma: Number(r.suma),
    ...(r.vyclenene != null ? { vyclenene: Number(r.vyclenene) } : {}),
    prve: ms(r.prve)!, posledne: ms(r.posledne)!, ...(r.archivovane ? { archivovane: ms(r.archivovane) } : {}),
  })));
}
function naServer(fn: string, args: Record<string, unknown>) {
  if (!supabase) return;
  void supabase.rpc(fn, args).then(({ error }) => {
    if (error) console.warn("Podporu firmy sa nepodarilo uložiť na server", error.message);
    else void stiahni(true);
  });
}

export function nacitaj(): Podpora[] {
  // staré záznamy viazané na názov firmy (pred Blokom 1) sa nečítajú
  try { return (JSON.parse(localStorage.getItem(KLUC) ?? "[]") as Podpora[]).filter((p) => !!p.firmaUcet); } catch { return []; }
}
function uloz(v: Podpora[]) {
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  emit();
}

/** firma dala na zbierku — pripne sa jej na podstránku (a suma sa pripočíta).
 *  Vo všetkých funkciách tu je `firma` = číslo účtu firmy, `nazov` len na zobrazenie. */
export function pridajPodporu(firma: string, zbierkaId: string, suma: number, nazov = nazovFirmy(firma)): Podpora {
  naServer("podpora_firmy_pridaj", { p_firma: normCislo(firma), p_zbierka: zbierkaId, p_nazov: nazov, p_suma: suma });
  const teraz = Date.now();
  const v = nacitaj();
  const i = v.findIndex((p) => p.zbierkaId === zbierkaId && rovnakaFirma(p.firmaUcet, firma));
  if (i >= 0) {
    // ďalší dar na tú istú zbierku ju zároveň vracia z archívu — firma do nej
    // znova dala, tak nech je zase vidieť
    const { archivovane: _archiv, ...zvysok } = v[i];
    const novy: Podpora = { ...zvysok, suma: v[i].suma + suma, posledne: teraz };
    uloz(v.map((p, j) => (j === i ? novy : p)));
    return novy;
  }
  const novy: Podpora = { firmaUcet: firma, firma: nazov, zbierkaId, suma, prve: teraz, posledne: teraz };
  uloz([novy, ...v]);
  return novy;
}

/** firma zapečatila matching — strop je zaplatený vopred, takže zbierku
 *  pripína rovnako ako dar, len sa ukazuje ako „vyčlenené", nie „darované" */
export function pripniVyclenene(firma: string, zbierkaId: string, strop: number, nazov = nazovFirmy(firma)): Podpora {
  naServer("podpora_firmy_pridaj", { p_firma: normCislo(firma), p_zbierka: zbierkaId, p_nazov: nazov, p_suma: 0, p_vyclenene: strop });
  const teraz = Date.now();
  const v = nacitaj();
  const i = v.findIndex((p) => p.zbierkaId === zbierkaId && rovnakaFirma(p.firmaUcet, firma));
  if (i >= 0) {
    const { archivovane: _archiv, ...zvysok } = v[i];
    const novy: Podpora = { ...zvysok, vyclenene: (v[i].vyclenene ?? 0) + strop, posledne: teraz };
    uloz(v.map((p, j) => (j === i ? novy : p)));
    return novy;
  }
  const novy: Podpora = { firmaUcet: firma, firma: nazov, zbierkaId, suma: 0, vyclenene: strop, prve: teraz, posledne: teraz };
  uloz([novy, ...v]);
  return novy;
}

/** stiahnuť z podstránky — dar ostáva v histórii aj v ESG */
export const archivuj = (firma: string, zbierkaId: string) => {
  naServer("podpora_firmy_archiv", { p_firma: normCislo(firma), p_zbierka: zbierkaId, p_archiv: true });
  uloz(nacitaj().map((p) => (p.zbierkaId === zbierkaId && rovnakaFirma(p.firmaUcet, firma) ? { ...p, archivovane: Date.now() } : p)));
};
export const vratZArchivu = (firma: string, zbierkaId: string) => {
  naServer("podpora_firmy_archiv", { p_firma: normCislo(firma), p_zbierka: zbierkaId, p_archiv: false });
  uloz(nacitaj().map((p) => (p.zbierkaId === zbierkaId && rovnakaFirma(p.firmaUcet, firma) ? { ...p, archivovane: undefined } : p)));
};

/** Kto práve daruje: ak je zapnutý prepínač „Darujem ako firma", dar je firemný.
 *  Identita = účet firmy (DEV: firma prepnutej roly b2b), názov len na zobrazenie
 *  (firma si ho v nastaveniach môže zmeniť — väzby sa tým nerozbijú). */
export function firmaAkoDarca(): { ucet: string; nazov: string } | null {
  // Rozhoduje VÝHRADNE prepínač „Darujem ako firma". Prepnutá rola to určovať
  // nesmie: správca firmy je aj bežný človek a musí vedieť darovať sám za seba
  // (inak sa nedá vyskúšať zamestnanecké dorovnanie, keď spravuješ tú istú firmu).
  try {
    if (localStorage.getItem("deed.dev.darcaFirma") !== "1") return null;
  } catch { return null; }
  let nazov = nazovFirmy(DEV_FIRMA);
  try {
    const vlastny = JSON.parse(localStorage.getItem("deed.rola.nazov.b2b") ?? "null") as string | null;
    if (vlastny && vlastny.trim()) nazov = vlastny.trim();
  } catch { /* predvolený názov */ }
  return { ucet: DEV_FIRMA, nazov };
}

/** firma, za ktorú sa zakladá dorovnanie: tá, za ktorú sa daruje, inak DEV firma prepnutej roly b2b */
export const firmaPreDorovnanie = (): { ucet: string; nazov: string } => firmaAkoDarca() ?? { ucet: DEV_FIRMA, nazov: "Vaša firma" };

/** čo firma podporuje — najnovšie hore */
export const podporyFirmy = (firma: string): Podpora[] =>
  nacitaj().filter((p) => rovnakaFirma(p.firmaUcet, firma)).sort((a, b) => b.posledne - a.posledne);

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
