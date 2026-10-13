// ============================================================
// OPRAVY 243 · farebné línie na verejnej stránke farnosti (prototyp „Farnost nastenka - zivo“ + „farebne linie“).
// Hrubá línia 12 px pod titulkou, 3 px nad každým blokom, 4 px nad omšami. Farbu volí farár v Správe → Nastavenia →
// Vzhľad stránky → Farba línií. Tlačidlá, karty, text a pozadie sa nemenia.
// Úložisko: verejné nastavenia stránky (0070b), kľúč „linia“ — platí pre svetlý aj tmavý režim.
// ============================================================
import { useVerejneNastavenia, verejneZPamate, zapisVerejne } from "./verejneNastavenia";

export const FARBY_LINIE: Record<string, string> = { "Fialová": "#5E3F86", "Zlatá": "#C9A24A", "Zelená": "#4B7A35", "Červená": "#B3261E", "Ružová": "#C77B9B" };
export const ROK = "Podľa cirkevného roka";
/** cirkvi s liturgickým (cirkevným) rokom — pri ostatných sa „Podľa cirkevného roka“ neponúka a predvolená je zelená */
const S_ROKOM = new Set(["RKC", "GKC", "PC", "ECAV", "RKC-r", "ECM", "SKC", "CČSH"]);
export const maCirkevnyRok = (cirkev?: string) => !cirkev || S_ROKOM.has(cirkev);
export const volbyLinie = (cirkev?: string) => [...(maCirkevnyRok(cirkev) ? [ROK] : []), ...Object.keys(FARBY_LINIE)];

/** advent a pôst fialová · Vianoce (do Krstu Pána) a Veľká noc (do Turíc) zlatá · Turíce červená · inak zelená */
export function farbaCirkevnehoRoka(d = new Date()): string {
  const y = d.getFullYear(), den = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(), t = den(d), D = 864e5;
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, e = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  const f = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - e - (c % 4)) % 7, g = Math.floor((a + 11 * e + 22 * f) / 451);
  const mes = Math.floor((e + f - 7 * g + 114) / 31), dn = ((e + f - 7 * g + 114) % 31) + 1;
  const ve = new Date(y, mes - 1, dn).getTime(), vian = new Date(y, 11, 25), adv = new Date(y, 11, 25 - (vian.getDay() || 7) - 21).getTime();
  // Krst Pána = nedeľa po 6. januári (najneskôr 13. 1.)
  const zj = new Date(y, 0, 6), krst = new Date(y, 0, 6 + ((7 - zj.getDay()) % 7 || 7)).getTime();
  if (t >= adv && t < vian.getTime()) return FARBY_LINIE["Fialová"];
  if (t >= vian.getTime() || t <= krst) return FARBY_LINIE["Zlatá"];
  if (t >= ve - 46 * D && t < ve - 2 * D) return FARBY_LINIE["Fialová"];
  if (t === ve + 49 * D) return FARBY_LINIE["Červená"];
  if (t >= ve - 2 * D && t < ve + 49 * D) return FARBY_LINIE["Zlatá"];
  return FARBY_LINIE["Zelená"];
}

const volba = (stranka: string) => verejneZPamate(stranka)?.linia as string | undefined;
/** uložená voľba farára (alebo predvolená) */
export function useVolbaLinie(stranka: string, cirkev?: string): string {
  useVerejneNastavenia(stranka);
  const v = volba(stranka);
  if (v && FARBY_LINIE[v]) return v;
  return maCirkevnyRok(cirkev) ? ROK : "Zelená";
}
/** farba línií na stránke farnosti */
export function useFarbaLinie(stranka: string, cirkev?: string): string {
  const v = useVolbaLinie(stranka, cirkev);
  return FARBY_LINIE[v] ?? farbaCirkevnehoRoka();
}
export const nastavLiniu = (stranka: string, v: string) => zapisVerejne(stranka, "linia", v);
