// ============================================================
// OPRAVY 292 · Usporiadať stránku farnosti (Správa → Nástroje → Usporiadať stránku).
// Poradie, skrytie a nadpisy blokov stredného stĺpca — jedno pre všetky štyri vzhľady (Nástenka, Kronika, Moderné, Klasika).
// Ukladá sa do verejných nastavení stránky (kľúč „usporiadanie“, server), platí PC, tablet aj mobil.
// Pevné (nie sú tu): titulka a hlavička, bočný panel (Omše a kalendár, Farský úrad), päta, zelené +.
// Zbierky farnosti: pri Nástenke a Modernom sa presúvajú, pri Kronike a Klasike sú v bočnom paneli.
// Premenovať sa dá len 7 blokov (Vypočuj si … Od veriacich), mení sa len nadpis na stránke — obsah,
// upozornenia (karta 63) a hľadanie ostávajú viazané na blok. Prázdny blok sa neukáže, aj keď je zapnutý (247).
// ============================================================
import { useVerejneNastavenia, verejneZPamate, zapisVerejneIsto } from "./verejneNastavenia";

export type BlokStranky = "zbierky" | "ozn" | "vyp" | "mod" | "pom" | "prid" | "tes" | "spom" | "ver" | "deti" | "kostoly";
/** predvolené poradie podľa 221 a 226 (Naše kostoly posledné) */
export const BLOKY_STRANKY: { id: BlokStranky; t: string; farba: string }[] = [
  { id: "zbierky", t: "Zbierky farnosti", farba: "#4B7A35" }, { id: "ozn", t: "Oznamy farnosti", farba: "#8A6A1F" },
  { id: "vyp", t: "Vypočuj si", farba: "#2F5A7A" }, { id: "mod", t: "Modli sa s nami", farba: "#6E4E7A" },
  { id: "pom", t: "Pomôž", farba: "#8E4523" }, { id: "prid", t: "Príď a zaži s nami", farba: "#8A6A1F" },
  { id: "tes", t: "Teš sa s nami", farba: "#C9A24A" }, { id: "spom", t: "Spomíname", farba: "#722535" },
  { id: "ver", t: "Od veriacich", farba: "#4B7A35" }, { id: "deti", t: "Deti a mládež", farba: "#2F5E3A" },
  { id: "kostoly", t: "Naše kostoly", farba: "#5F656B" },
];
/** bloky, ktoré sa dajú premenovať — čo do nich stále pôjde */
export const PREMENOVAT: Partial<Record<BlokStranky, string>> = {
  vyp: "príhovory a nahrávky", mod: "úmysly a modlitby", pom: "brigády a prosby o pomoc", prid: "akcie a udalosti",
  tes: "jubileá, svadby a krsty", spom: "parte a spomienky", ver: "príspevky od veriacich",
};
export const NAZOV_MAX = 30;

export interface Usporiadanie { poradie: BlokStranky[]; skryte: BlokStranky[]; nazvy: Partial<Record<BlokStranky, string>> }
const ID = new Set<string>(BLOKY_STRANKY.map((b) => b.id));
export const POVODNE: Usporiadanie = { poradie: BLOKY_STRANKY.map((b) => b.id), skryte: [], nazvy: {} };

/** z hocijakej uloženej hodnoty platné usporiadanie (neznáme bloky preč, chýbajúce na svoje predvolené miesto) */
export function normalizuj(v: unknown): Usporiadanie {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof Usporiadanie, unknown>>;
  const por = Array.isArray(o.poradie) ? [...new Set(o.poradie.filter((x): x is BlokStranky => typeof x === "string" && ID.has(x)))] : [];
  POVODNE.poradie.forEach((id, i) => { if (!por.includes(id)) por.splice(Math.min(i, por.length), 0, id); });
  const skryte = Array.isArray(o.skryte) ? o.skryte.filter((x): x is BlokStranky => typeof x === "string" && ID.has(x)) : [];
  const nazvy: Usporiadanie["nazvy"] = {};
  if (o.nazvy && typeof o.nazvy === "object") for (const [k, t] of Object.entries(o.nazvy as Record<string, unknown>)) {
    if (PREMENOVAT[k as BlokStranky] && typeof t === "string" && t.trim()) nazvy[k as BlokStranky] = t.trim().slice(0, NAZOV_MAX);
  }
  return { poradie: por, skryte, nazvy };
}
export const usporiadanieZPamate = (stranka: string): Usporiadanie => normalizuj(verejneZPamate(stranka)?.usporiadanie);
export function useUsporiadanie(stranka: string): Usporiadanie {
  useVerejneNastavenia(stranka);
  return usporiadanieZPamate(stranka);
}
/** nadpis bloku na stránke: premenovaný alebo pôvodný */
export const nadpisBloku = (u: Usporiadanie, id: BlokStranky, povodny: string): string => (PREMENOVAT[id] && u.nazvy[id]?.trim()) || povodny;
/** poradie viditeľných blokov (skryté preč) */
export const viditelne = (u: Usporiadanie): BlokStranky[] => u.poradie.filter((id) => !u.skryte.includes(id));
/** uloží na server; vráti chybu ako text alebo null */
export const ulozUsporiadanie = (stranka: string, u: Usporiadanie): Promise<string | null> => zapisVerejneIsto(stranka, "usporiadanie", normalizuj(u));
