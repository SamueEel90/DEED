// ============================================================
// KARTA 56I — farník pridáva sám (zelené + Pridať na verejnej stránke farnosti).
// Nastavenie farára: „Farníci môžu pridávať oznamy" + poplatok = selfadd (viera/UserOznamy),
// „Čo smie farník pridať sám" = 8 prepínačov (predvolene všetky zapnuté) = oblasť farniksmie.
// Pridané položky = oblasť odfarnikov (KV stav farnosti, zrkadlo naboz_stav). Zverejní sa hneď, farár môže zmazať.
// ============================================================
import { useSyncExternalStore } from "react";
import { nacitajStav, ulozStav } from "@/features/viera/stav";

export type DruhFarnika = "parte" | "svadba" | "ine" | "oznam" | "udalost" | "umysel" | "fotky" | "modlitba";
/** k · názov · popis v Správe · popis vo výbere farníka · vždy zadarmo */
export const DRUHY_FARNIKA: { k: DruhFarnika; t: string; s: string; sv: string; zadarmo: boolean }[] = [
  { k: "parte", t: "Parte", s: "smútočné oznámenie · vždy zadarmo", sv: "smútočné oznámenie", zadarmo: true },
  { k: "svadba", t: "Svadobné oznámenie", s: "sobáš, pozvanie", sv: "sobáš, pozvanie", zadarmo: false },
  { k: "ine", t: "Jubileum a iné oznámenie", s: "výročie, poďakovanie, narodenie", sv: "výročie, poďakovanie, narodenie", zadarmo: false },
  { k: "oznam", t: "Krátky oznam", s: "len text", sv: "len text · napr. stratené kľúče", zadarmo: false },
  { k: "udalost", t: "Udalosť", s: "púť, stretnutie · zapíše sa do kalendára", sv: "púť, stretnutie · dátum, čas, miesto", zadarmo: false },
  { k: "umysel", t: "Úmysel na omšu", s: "vy potom potvrdíte čas omše", sv: "za koho sa má slúžiť omša", zadarmo: false },
  { k: "fotky", t: "Fotky z akcie", s: "do galérie farnosti", sv: "do galérie farnosti", zadarmo: false },
  { k: "modlitba", t: "Prosba o modlitbu", s: "aj bez mena · vždy zadarmo", sv: "aj bez mena", zadarmo: true },
];
/** Parte, Svadba, Jubileum idú cez Editor oznámení — zatiaľ nenapojený (PLACEBO — karta 56I) */
export const CEZ_EDITOR: DruhFarnika[] = ["parte", "svadba", "ine"];

export type SmieFarnika = Partial<Record<DruhFarnika, boolean>>;
export const nacitajSmie = (id: string): SmieFarnika => nacitajStav<SmieFarnika>("farniksmie", id, {});
export const smie = (s: SmieFarnika, k: DruhFarnika) => s[k] !== false;

export interface PolozkaFarnika {
  id: string; k: DruhFarnika; t: string; s: string;
  /** meno z registrácie alebo „Bohu známy farník" */
  kto: string; cas: number; fotky?: string[];
}

let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };
export function ulozSmie(id: string, s: SmieFarnika) { ulozStav("farniksmie", id, s); zmena(); }
export const odFarnikov = (id: string): PolozkaFarnika[] => nacitajStav<PolozkaFarnika[]>("odfarnikov", id, []);
export function pridajOdFarnika(id: string, p: PolozkaFarnika) { ulozStav("odfarnikov", id, [p, ...odFarnikov(id)]); zmena(); }
export function zmazOdFarnika(id: string, pid: string) { ulozStav("odfarnikov", id, odFarnikov(id).filter((x) => x.id !== pid)); zmena(); }
/** prekreslenie pri zmene nastavenia alebo zoznamu */
export function useOdFarnikov(): number {
  return useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => verzia);
}
