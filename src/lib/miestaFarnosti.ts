// ============================================================
// KARTA 62 · Kostoly a miesta (aj filiálky). Subjekt je jeden (IČO, IBAN, farár, zbierky, program), miest je viac.
// Kostol v meste aj filiálka = miesto so stránkou, rozdiel je len v slove. Jedna tabuľka miest, žiadne dve mechaniky.
// Peniaze per miesto nie sú: zbierka môže mať miesto len ako účel, účet, VS a doklady sú vždy farnosti.
// Cena z počtu miest (karta 61): 35 € prvé + 10 € druhé + 5 € každé ďalšie (cenaMiest).
// Úložisko: KV stav farnosti, oblasť „miesta“ (naboz_stav) = Miesto[]. Prvé miesto vznikne z registrácie (hlavný kostol, id „0“).
// Kľúč miesta je zároveň kľúč kostola v kalendári farnosti (omše a udalosti per miesto).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { nacitajStav, ulozStav, obnovOblast } from "@/features/viera/stav";
import type { KostolFarnosti } from "@/features/viera/mock";
import type { MediumZbierky } from "./novaZbierka";
import { bezDataUrl } from "./uploadFoto";
import { cenaMiest } from "./predplatneFarnosti";

export type DruhMiesta = "farsky" | "kostol" | "kaplnka" | "filialka" | "ine";
export const DRUHY_MIESTA: [DruhMiesta, string][] = [["farsky", "Farský kostol"], ["kostol", "Kostol"], ["kaplnka", "Kaplnka"], ["filialka", "Filiálka"], ["ine", "Iné"]];
export const nazovDruhu = (d: DruhMiesta) => DRUHY_MIESTA.find(([k]) => k === d)?.[1] ?? "Kostol";

export interface Miesto {
  id: string; druh: DruhMiesta; nazov: string; adresa: string;
  /** fotky cez GaleriaEditor, prvá je titulná */ media: MediumZbierky[];
  /** jedna veta na kartu */ popis: string;
  /** história na podstránku (HTML z TextovePolia), nepovinné */ historia: string;
  /** odobraté miesto: stránka zamrzne, nezmaže sa, dá sa obnoviť */ zamrznute?: boolean;
  vytvorene: string;
}

let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const nacitane = new Set<string>();

/** miesto z registrácie (profil farnosti → kostoly) — id je poradie, aby sedel kľúč kostola v kalendári */
function zRegistracie(stranka: string): Miesto[] {
  const k = nacitajStav<{ kostoly?: KostolFarnosti[] }>("profil", stranka, {}).kostoly ?? [];
  const l = k.length ? k : [{ nazov: "Farský kostol", adresa: "", casyOmsi: "" }];
  return l.map((x, i) => ({ id: String(i), druh: i === 0 ? "farsky" : "kostol", nazov: x.nazov, adresa: x.adresa ?? "", media: [], popis: "", historia: "", vytvorene: "" }));
}
/** všetky miesta vrátane zamrznutých (Správa) */
export const vsetkyMiesta = (stranka: string): Miesto[] => {
  const l = nacitajStav<Miesto[] | null>("miesta", stranka, null);
  return l && l.length ? l : zRegistracie(stranka);
};
/** aktívne miesta (stránka, kalendár, cena) */
export const miesta = (stranka: string): Miesto[] => vsetkyMiesta(stranka).filter((m) => !m.zamrznute);

export function useMiesta(stranka: string, vsetky = false): Miesto[] {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => { if (!nacitane.has(stranka)) { nacitane.add(stranka); void obnovOblast("miesta", stranka).then((ok) => { if (ok) zmena(); }, () => undefined); } }, [stranka]);
  return vsetky ? vsetkyMiesta(stranka) : miesta(stranka);
}

export const noveIdMiesta = () => `m${Date.now().toString(36)}`;
export const prazdneMiesto = (): Miesto => ({ id: noveIdMiesta(), druh: "kostol", nazov: "", adresa: "", media: [], popis: "", historia: "", vytvorene: new Date().toISOString() });

async function zapis(stranka: string, f: (l: Miesto[]) => Miesto[]) {
  await obnovOblast("miesta", stranka).catch(() => false);
  ulozStav("miesta", stranka, f(vsetkyMiesta(stranka)));
  zmena();
}
export async function ulozMiesto(stranka: string, m: Miesto): Promise<void> {
  const x = await bezDataUrl(m, "stranky");
  await zapis(stranka, (l) => (l.some((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [...l, x]));
}
/** odobratie = zamrznutie (stránka miesta sa nezmaže, dá sa obnoviť); cena klesne od ďalšej platby */
export const zamrazMiesto = (stranka: string, id: string, ano: boolean) => zapis(stranka, (l) => l.map((y) => (y.id === id ? { ...y, zamrznute: ano || undefined } : y)));

/** cena pri počte aktívnych miest a riadok pred „Podržte a uložte“ */
export const POR = ["Prvé", "Druhé", "Tretie", "Štvrté", "Piate", "Šieste", "Siedme", "Ôsme", "Deviate", "Desiate"];
export function riadokCeny(pocetPo: number, pocetPred: number, skusobne: boolean): string {
  const po = cenaMiest(pocetPo), rozdiel = po - cenaMiest(pocetPred);
  if (skusobne) return `Počas skúšobnej doby je pridávanie zadarmo. Po skúšobnej dobe ${po} € mesačne.`;
  if (rozdiel > 0) return `${POR[pocetPo - 1] ?? `${pocetPo}.`} miesto zvýši predplatné o ${rozdiel} € mesačne. Spolu ${po} € od ďalšej platby.`;
  if (rozdiel < 0) return `Predplatné klesne o ${-rozdiel} € mesačne. Spolu ${po} € od ďalšej platby, spätne sa nič nevracia.`;
  return `Cena sa nemení, ${po} € mesačne.`;
}
