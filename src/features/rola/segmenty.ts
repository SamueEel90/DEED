// ============================================================
// SEGMENTY PRE DARCOV (charita, od programu ZBIERKA) — témy, ktoré si darca
// vyberie pri pravidelnej podpore („podporím túto tému, nie konkrétnu zbierku").
// Základ je z registrácie, správca ich tu upravuje. Mock: localStorage.
// ============================================================
import { useSyncExternalStore } from "react";
import { nacitajVerejne, verejneZPamate, zapisVerejne } from "@/lib/verejneNastavenia";
import { segmentyZRegistracie } from "./registracia";

export interface SegmentOrg {
  id: string;
  nazov: string;
  popis: string;      // jedna veta pre darcu
  aktivny: boolean;   // vypnutý sa darcovi neponúka (existujúca podpora beží ďalej)
  zRegistracie?: boolean;
  /** AKCIA (T2): vlastná zbierka sektora a vlastný účet, kam chodia jeho dary */
  zbierkaId?: string;
  iban?: string;
}

const KLUC = "deed.rola.segmenty.charita.v2";
let cache: SegmentOrg[] | null = null;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };

function zo(nazov: string, i: number): SegmentOrg {
  return { id: `r${i}`, nazov, popis: "", aktivny: true, zRegistracie: true };
}
export function nacitajSegmenty(): SegmentOrg[] {
  if (cache) return cache;
  try {
    const s = localStorage.getItem(KLUC);
    cache = s ? (JSON.parse(s) as SegmentOrg[]) : segmentyZRegistracie().map(zo);
  } catch { cache = segmentyZRegistracie().map(zo); }
  return cache;
}
function ulozSegmentyLokalne(v: SegmentOrg[]) {
  cache = v;
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  posluchaci.forEach((f) => f());
}
export function useSegmenty(): SegmentOrg[] { nacitajSegmentyZDb(); return useSyncExternalStore(subscribe, nacitajSegmenty); }

/** názvy segmentov, ktoré sa ponúkajú darcovi */
export const aktivneSegmenty = (): string[] => nacitajSegmenty().filter((s) => s.aktivny).map((s) => s.nazov);

/** AKCIA (T2): sektor má vlastný QR, vlastnú zbierku a vlastný účet */
export const SEKTOR_ROZSIRENIE_OD_TIERU = 2;

/** IBAN: formát + kontrolné číslice (mod 97). Vracia očistený IBAN alebo null. */
export function overIban(v: string): string | null {
  const x = v.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(x)) return null;
  const p = x.slice(4) + x.slice(0, 4);
  let zvysok = 0;
  for (const ch of p) {
    const n = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const c of n) zvysok = (zvysok * 10 + Number(c)) % 97;
  }
  return zvysok === 1 ? x : null;
}
/** IBAN po štvorčekoch — čitateľné pre človeka */
export const formatujIban = (v: string) => v.replace(/(.{4})/g, "$1 ").trim();

// ---- verejné nastavenia stránky charity (0070b): vidí ich aj návštevník, localStorage = záloha ----
const STRANKA = "svetlo"; // = STRANKA_POZICIE.charita (rola/stav) — bez importu, nech nie je cyklus
export function ulozSegmenty(v: SegmentOrg[]) {
  ulozSegmentyLokalne(v);
  void zapisVerejne(STRANKA, "segmenty", v);
}
let zDb = false;
/** raz stiahne verejnú verziu; keď v DB je, prepíše lokálnu */
export function nacitajSegmentyZDb() {
  if (zDb) return;
  zDb = true;
  void nacitajVerejne(STRANKA).then(() => {
    const v = verejneZPamate(STRANKA)?.["segmenty"];
    if (Array.isArray(v)) ulozSegmentyLokalne(v as SegmentOrg[]);
  });
}
