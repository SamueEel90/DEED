// ============================================================
// OPRAVY 400 · údaje organizácie z registra — jeden zdroj pre Nastavenia → Údaje organizácie, Upraviť profil a verejný profil.
// Verejné (nastavenia_stranky.verejne → „registra“, číta aj návštevník): názov, právna forma, IČO, registrácia, sídlo, dátum vzniku.
// Súkromné (nastavenia stránky → „statutar“, len správa): meno štatutára a jeho funkcia — na verejnom profile nie je.
// Plní ich registrácia (CharitaB) zo skutočného registra. Čo register nevráti, ostane prázdne („doplniť ›“), nič napevno.
// Testovacia verzia: zamknuté údaje sa dajú prepísať („upraviť (test)“), kým nebude modul charity hotový.
// ============================================================
import { verejneZPamate, zapisVerejne, useVerejneNastavenia } from "./verejneNastavenia";
import { citajNastavenie, maNastavenie, zapisNastavenie, useZmenyNastaveni } from "./nastaveniaStranky";

export interface UdajeRegistra { nazov: string; forma: string; ico: string; /** OPRAVY 422 */ dic: string; icdph: string; registracia: string; sidlo: string; /** „14. 3. 2012“ */ vznik: string; /** OPRAVY 422: dobrovoľný údaj, len číslo */ zamestnanci: string }
export interface Statutar { meno: string; funkcia: string }
export const PRAZDNY_REGISTER: UdajeRegistra = { nazov: "", forma: "", ico: "", dic: "", icdph: "", registracia: "", sidlo: "", vznik: "", zamestnanci: "" };
/** OPRAVY 422: „1 zamestnanec“ · „3 zamestnanci“ · „12 zamestnancov“; prázdne = nič */
export function zamestnanciText(z: string): string {
  const n = Number(z.replace(/\D/g, ""));
  if (!z.trim() || !Number.isFinite(n) || n <= 0) return "";
  return `${n.toLocaleString("sk-SK")} ${n === 1 ? "zamestnanec" : n < 5 ? "zamestnanci" : "zamestnancov"}`;
}

export const registra = (stranka: string): UdajeRegistra => ({ ...PRAZDNY_REGISTER, ...((verejneZPamate(stranka)?.["registra"] as Partial<UdajeRegistra> | undefined) ?? {}) });
export function useRegistra(stranka: string): UdajeRegistra {
  useVerejneNastavenia(stranka);
  return registra(stranka);
}
export async function ulozRegistra(stranka: string, z: Partial<UdajeRegistra>): Promise<void> {
  await zapisVerejne(stranka, "registra", { ...registra(stranka), ...z });
}

/** štatutár — zo súkromných nastavení otvorenej Správy */
export function useStatutar(): Statutar {
  useZmenyNastaveni();
  return { meno: "", funkcia: "", ...((maNastavenie("statutar") ? citajNastavenie("statutar") : {}) as Partial<Statutar>) };
}
export const ulozStatutara = (z: Partial<Statutar>) => zapisNastavenie("statutar", { meno: "", funkcia: "", ...((maNastavenie("statutar") ? citajNastavenie("statutar") : {}) as Partial<Statutar>), ...z });

/** IČO po trojiciach ako v registri: 52 846 170 */
export const icoText = (ico: string) => ico.replace(/\D/g, "").replace(/(\d{2})(\d{3})(\d{0,3})/, "$1 $2 $3").trim();
/** ISO alebo „14. 3. 2012“ → „14. 3. 2012“ */
export function vznikText(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
  return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : d.trim();
}
const MESIACE = ["január", "február", "marec", "apríl", "máj", "jún", "júl", "august", "september", "október", "november", "december"];
/** „14. 3. 2012“ → „marec 2012“ (predvyplnené Založené) */
export function mesiacRok(vznik: string): string {
  const m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(vznikText(vznik));
  return m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${MESIACE[Number(m[2]) - 1]} ${m[3]}` : "";
}
