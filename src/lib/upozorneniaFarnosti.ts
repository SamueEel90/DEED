// ============================================================
// KARTA 63 · farár — upozornenia sledujúcich pri zverejnení.
// 1d: Správa → Oznamy → Nastavenie upozornení = čo sa predvolene pošle (stav farnosti, oblasť „upozornenia“).
// 1c: pri každom formulári „Upozorniť sledujúcich: Áno · Nie“ (predvolené z 1d), pri veci sa uloží upoz: true/false.
// Doručenie robí server (Samuel): len v appke (zvonček) a push; najviac 1 súhrn denne, zrušená omša a parte hneď.
// E-maily z farnosti veriacim sa NEPOSIELAJÚ (Martin 13. 10.).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, obnovOblast } from "@/features/viera/stav";
import type { Blok } from "./mojeFarnosti";

export type DruhUpoz = "oznam" | "omsa" | "parte" | "zbierka" | "udalost" | "fotky" | "upravy";
/** [druh, názov, text pri Áno, predvolené] — zmena omše sa nedá vypnúť */
export const DRUHY_UPOZ: [DruhUpoz, string, string, boolean][] = [
  ["oznam", "Krátky oznam", "Áno", true], ["omsa", "Zmena alebo zrušenie omše", "Vždy, hneď", true], ["parte", "Parte", "Áno, hneď", true],
  ["zbierka", "Nová zbierka", "Áno", true], ["udalost", "Udalosť, brigáda, stretnutie", "Áno · prihláseným aj deň vopred", true],
  ["fotky", "Fotky z akcie", "Áno", false], ["upravy", "Úpravy už zverejneného", "Áno", false],
];
export type NastavenieUpoz = Partial<Record<DruhUpoz, boolean>>;

let ver = 0;
const posl = new Set<() => void>();
const nacitane = new Set<string>();
export const predvoleneUpoz = (stranka: string, druh: DruhUpoz): boolean =>
  druh === "omsa" || (nacitajStav<NastavenieUpoz>("upozornenia", stranka, {})[druh] ?? DRUHY_UPOZ.find(([d]) => d === druh)![3]);
export function useNastavenieUpoz(stranka: string): (druh: DruhUpoz) => boolean {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => { if (!nacitane.has(stranka)) { nacitane.add(stranka); void obnovOblast("upozornenia", stranka).then((ok) => { if (ok) { ver++; posl.forEach((f) => f()); } }, () => undefined); } }, [stranka]);
  return (d) => predvoleneUpoz(stranka, d);
}
export function nastavPredvoleneUpoz(stranka: string, druh: DruhUpoz, on: boolean) {
  if (druh === "omsa") return;
  ulozStav("upozornenia", stranka, { ...nacitajStav<NastavenieUpoz>("upozornenia", stranka, {}), [druh]: on });
  ver++; posl.forEach((f) => f());
}

/** blok stránky, ktorého sledujúcim upozornenie ide, a jeho názov vo vete „ktorí sledujú …“ */
export const BLOK_VETA: Record<Blok, string> = {
  oz: "Oznamy farnosti", om: "Zmeny a zrušenia omší", pr: "Príď a zaži s nami", po: "Pomôž", de: "Deti a mládež",
  te: "Teš sa s nami", sp: "Spomíname", mo: "Modli sa s nami", ve: "Od veriacich", zb: "Zbierky",
};
/** parte a zmena omše idú hneď, ostatné v dennom súhrne */
export const hned = (b: Blok) => b === "sp" || b === "om";
