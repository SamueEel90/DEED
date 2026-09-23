// ============================================================
// VLASTNÉ ZBIERKY CHARITY — centrálna zbierka organizácie a sektorové zbierky.
// Spoločné pre obe: charita zbiera na VLASTNÚ overenú činnosť (odznak D+),
// takže netreba AI kontrolu žiadosti ani súhlas beneficienta — sektor je
// overený už pri registrácii a charita zaň ručí.
// Nemajú cieľovú sumu → dokladovanie sa nespúšťa časom, ale DOSIAHNUTÍM SUMY:
// každých MILNIK € od posledného dokladovania = nová tranža na doloženie.
// Perzistencia = localStorage (mock, rovnaký vzor ako stav.ts).
// ============================================================
import { useSyncExternalStore } from "react";

export const VLASTNA_ZBIERKA_CFG = {
  /** tranža, po ktorej musí charita doložiť použitie (placeholder, ladí Martin) */
  milnik: 3000,
  /** koľko dní má na doloženie tranže */
  dniNaDolozenie: 30,
  /** sektorové zbierky sú od programu AKCIA (T2), centrálna od ZBIERKA (T1) */
  sektoroveOdTieru: 2,
  centralnaOdTieru: 1,
};

/** karta zbierky — to, čo z nej robí zbierku a nie suchý platobný modul */
export interface ProfilZbierky {
  nazov: string;
  popis: string;
  foto?: string;       // data-URL; prázdne = logo organizácie
  iban?: string;       // centrálna: z registrácie · sektorová: transparentný účet zbierky
  spustena?: boolean;
  vytvorena?: string;  // ISO
}

const KLUC = (id: string) => `deed.zbierka.profil.${id}`;
let verzia = 0;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenyProfilov(): number { return useSyncExternalStore(subscribe, () => verzia); }

export function nacitajProfil(id: string): ProfilZbierky | null {
  try { const s = localStorage.getItem(KLUC(id)); return s ? (JSON.parse(s) as ProfilZbierky) : null; } catch { return null; }
}
export function ulozProfil(id: string, p: ProfilZbierky) {
  try { localStorage.setItem(KLUC(id), JSON.stringify(p)); } catch { /* LS nedostupné */ }
  verzia++; posluchaci.forEach((f) => f());
}
export function zmazProfil(id: string) {
  try { localStorage.removeItem(KLUC(id)); } catch { /* LS nedostupné */ }
  verzia++; posluchaci.forEach((f) => f());
}

/** id centrálnej zbierky — používa ho aj mock zbierok a QR nástroje */
export const CENTRALNA_ID = "z-centralna";
/** id zbierky sektora */
export const sektorZbierkaId = (idSektora: string) => `org-sekt-${idSektora}`;

// ---- míľniky namiesto cieľovej sumy ----
export interface Milniky {
  /** dosiahnuté míľniky (3000, 6000, …) */
  dosiahnute: number[];
  /** najbližší míľnik nad vyzbieranou sumou */
  dalsi: number;
  /** spodná hranica aktuálneho úseku baru */
  od: number;
  /** naplnenie aktuálneho úseku v % */
  pct: number;
}
export function milniky(vyzbierane: number, krok = VLASTNA_ZBIERKA_CFG.milnik): Milniky {
  const celych = Math.floor(vyzbierane / krok);
  const dosiahnute = Array.from({ length: celych }, (_, i) => (i + 1) * krok);
  const od = celych * krok;
  return { dosiahnute, dalsi: od + krok, od, pct: Math.round(((vyzbierane - od) / krok) * 100) };
}
/** koľko € je doložených → koľko míľnikov má zelenú značku */
export const dolozeneMilniky = (dolozeneEur: number, krok = VLASTNA_ZBIERKA_CFG.milnik) =>
  Math.floor(dolozeneEur / krok);
