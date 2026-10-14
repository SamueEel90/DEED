// ============================================================
// OPRAVY 260 — nastavenie zvončekovej zbierky farnosti (Správa zvončekovej zbierky podľa modulu Hlavná zbierka).
// Názov, text (TextovePolia), titulná fotka a fotky (GaleriaEditor s popisom), rýchle sumy, EURC, ukončená.
// Úložisko: naboz_stav, oblasť „zvoncek", id = stránka (cez stav.ts, fotky najprv do Storage — v DB nikdy base64).
// Dary idú ku každej omši zvlášť (zvoncekOmse.ts, OPRAVY 289) na účet farnosti.
// ============================================================
import { useSyncExternalStore } from "react";
import { nacitajStav, ulozStav } from "@/features/viera/stav";
import { bezDataUrl } from "./uploadFoto";
import type { MediumZbierky } from "./novaZbierka";

export interface NastavenieZvoncek {
  nazov: string; popis: string; popis2: string; media: MediumZbierky[];
  /** index v SADY_EUR / SADY_EURC (ako hlavná zbierka) */ sada: number; eurc: boolean; sadaE: number;
  /** ukončená farárom — na stránke farnosti sa neukazuje */ ukoncena?: boolean;
  /** OPRAVY 289: poďakovanie v riadku Hlavnej zbierky; prázdne = podľa cirkvi („Pán Boh zaplať“ / „Ďakujeme“) */ podakovanie?: string;
}
export const ZVONCEK_NAZOV = "Zvončeková zbierka";
export const ZVONCEK_TEXT = "Ako do zvončeka pri omši. Dar ide farnosti.";
export const prazdnyZvoncek = (): NastavenieZvoncek => ({ nazov: "", popis: "", popis2: "", media: [], sada: 1, eurc: true, sadaE: 0 });
export const nazovZvoncek = (n?: Pick<NastavenieZvoncek, "nazov"> | null) => n?.nazov?.trim() || ZVONCEK_NAZOV;

const OBLAST = "zvoncek";
const pamat = new Map<string, NastavenieZvoncek>();
let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };

export function nastavenieZvoncek(stranka: string): NastavenieZvoncek {
  const p = pamat.get(stranka);
  if (p) return p;
  return { ...prazdnyZvoncek(), ...nacitajStav<Partial<NastavenieZvoncek>>(OBLAST, stranka, {}) };
}
/** živé nastavenie (Správa aj stránka farnosti sa prekreslia hneď) */
export function useZvoncek(stranka: string): NastavenieZvoncek {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => verzia);
  return nastavenieZvoncek(stranka);
}
let casovac: number | undefined;
/** uloží hneď do pamäte; do úložiska po 600 ms, fotky najprv do Storage */
export function ulozZvoncek(stranka: string, n: NastavenieZvoncek) {
  pamat.set(stranka, n); zmena();
  window.clearTimeout(casovac);
  casovac = window.setTimeout(() => {
    void bezDataUrl(n, "stranky").then((c) => { ulozStav(OBLAST, stranka, c); if (pamat.get(stranka) === n) pamat.set(stranka, c); }, () => ulozStav(OBLAST, stranka, { ...n, media: n.media.filter((m) => !/^data:/.test(m.src)) }));
  }, 600);
}
/** OPRAVY 289: poďakovanie v riadku Hlavnej zbierky — farárovo, inak podľa cirkvi (číselník, 0091) */
export const podakovanieZvoncek = (n: Pick<NastavenieZvoncek, "podakovanie">, slova: { podakovanie: string }) => n.podakovanie?.trim() || slova.podakovanie;
