// Pridať skutok = JEDEN komponent pre celú appku. Každý vstup volá otvorPridatSkutok(),
// komponent žije raz v App (PridatSkutokHost). Nikde vlastná kópia.
import { useSyncExternalStore } from "react";
import type { Oblast } from "@/lib/mojeSkutky";

export type PridatParams = {
  /** solo = rovno výber bežný / skutok ako dar · skupina = výber A/B · akcia = rovno skener akcie (Môj QR) */
  start?: "solo" | "skupina" | "akcia";
  /** detail zbierky „Pomôž skutkom" → skutok ako dar s predvybranou zbierkou */
  zbierka?: string;
  /** Aktivity / ukážka „Urobím podobný" → predvolená oblasť */
  oblast?: Oblast;
  /** organizácia ako autor (Charita „Skutok takto sme pomohli") */
  autor?: string;
  /** OPRAVY 121: skutok za charitu (správca alebo Organizátor) — bez AI, vykanie, autor navonok = charita */
  organizacia?: boolean;
  /** OPRAVY 121: id stránky charity (logo z uloženého profilu, úvod „Veríme vám" v účte stránky) */
  strankaId?: string;
  /** OPRAVY 122 (2): centrálna zbierka charity (ak beží) — jedna z volieb „Kam pôjdu peniaze" */
  centralna?: { id: string; nazov: string; org: string; cislo: string } | null;
  /** oznam „AI sa pýta · Odpovedať" → rovno krok otázok (so skutkom, ku ktorému sa AI pýta) */
  otazky?: string[];
  skutok?: { nazov: string; popis: string };
  /** profil · Rozpracovaný skutok „Dokončiť" → pokračovať v uloženom koncepte (OPRAVY 70) */
  koncept?: boolean;
  /** ohlásený skutok „Dokončiť" → krok 2, text predvyplnený */
  dokoncit?: boolean;
  /** akcia skončila → krok 2 s účastníkmi, miestom a trvaním */
  zAkcie?: { ucastnici: string[]; miesto: string; trvanie: string; dar?: { id: string; nazov: string; org: string; cislo: string }[];
    /** OPRAVY 121: akcia za charitu — záznam zmien ide so skutkom (vnútri) */
    zaznam?: { cas: number; kto: string; co: string }[] };
};

let aktualne: PridatParams | null = null;
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

export function otvorPridatSkutok(p: PridatParams = {}) { aktualne = { ...p }; zmena(); }
export function zavriPridatSkutok() { aktualne = null; zmena(); }
export function usePridatSkutok(): PridatParams | null {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  return aktualne;
}
