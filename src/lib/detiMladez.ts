// ============================================================
// OPRAVY 211 — Deti a mládež (Správa → Ľudia → DETI A MLÁDEŽ, blok „Deti a mládež" na Nástenke).
// Úložisko ako brigády: KV stav farnosti, oblasť „deti" = Stretnutie[]; prihlásení cez reakcie farnosti (pole „ucast" + mena).
// Mená detí verejne nikdy, len počet; mená vidí farár a koordinátor v Správe. Zo stránky zmizne deň po termíne (tábor po poslednom dni).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, obnovOblast } from "@/features/viera/stav";
import { bezDataUrl } from "./uploadFoto";

export const DRUHY_STRETNUTIA = ["Stretko", "Miništranti", "Spevokol", "Tábor", "Iné"] as const;
export type DruhStretnutia = (typeof DRUHY_STRETNUTIA)[number];
export interface Stretnutie {
  id: string; druh: DruhStretnutia; t: string; dat: string; /** tábor: posledný deň */ datDo?: string; cas: string; kde: string;
  /** text (HTML z TextovePolia) */ txt: string;
  /** OPRAVY 212: fotky z GaleriaEditor (prvá titulná) + popisy */ fotky?: string[]; popisy?: string[];
  /** 0 bez prihlásenia · 1 Prídem · 2 záväzne (tábor: Prihlásiť dieťa) */ pz: 0 | 1 | 2;
  limit: number; vytvorena: string;
  /** KARTA 63: farár zvolil Upozorniť sledujúcich (blok Deti a mládež) */ upoz?: boolean;
}

let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const nacitane = new Set<string>();
export const stretnutia = (stranka: string): Stretnutie[] => nacitajStav<Stretnutie[]>("deti", stranka, []);

export function useStretnutia(stranka: string): Stretnutie[] {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => { if (!nacitane.has(stranka)) { nacitane.add(stranka); void obnovOblast("deti", stranka).then((ok) => { if (ok) zmena(); }, () => undefined); } }, [stranka]);
  return stretnutia(stranka);
}

/** deň po termíne (pri tábore po poslednom dni) zo stránky zmizne */
export const skoncilo = (s: Stretnutie, teraz = Date.now()) => !!s.dat && new Date(`${s.datDo || s.dat}T23:59:00`).getTime() + 864e5 < teraz;
export const jeTabor = (s: Pick<Stretnutie, "druh">) => s.druh === "Tábor";

export async function ulozStretnutie(stranka: string, s: Stretnutie): Promise<void> {
  const x = await bezDataUrl(s, "stranky");
  await obnovOblast("deti", stranka).catch(() => false);
  const l = stretnutia(stranka);
  ulozStav("deti", stranka, l.some((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [x, ...l]);
  zmena();
}
export async function zmazStretnutie(stranka: string, id: string): Promise<void> {
  await obnovOblast("deti", stranka).catch(() => false);
  ulozStav("deti", stranka, stretnutia(stranka).filter((y) => y.id !== id));
  zmena();
}
