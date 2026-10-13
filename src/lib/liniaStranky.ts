// ============================================================
// OPRAVY 243 · farebné línie na verejnej stránke farnosti (prototyp „Farnost nastenka - zivo“ + „farebne linie“).
// Hrubá línia 12 px pod titulkou, 3 px nad každým blokom, 4 px nad omšami. Farbu volí farár v Správe → Nastavenia →
// Vzhľad stránky → Farba línií. Tlačidlá, karty, text a pozadie sa nemenia.
// Úložisko: verejné nastavenia stránky (0070b), kľúč „linia“ — platí pre svetlý aj tmavý režim.
// ============================================================
import { useVerejneNastavenia, verejneZPamate, zapisVerejne } from "./verejneNastavenia";

/** Bordová (Martin 13. 10.): matná, bez lesku — svetlý režim #722535, tmavý #A8445A (premenná --linia-bordova v index.css) */
export const FARBY_LINIE: Record<string, string> = { "Fialová": "#5E3F86", "Zlatá": "#C9A24A", "Zelená": "#4B7A35", "Červená": "#B3261E", "Ružová": "#C77B9B", "Bordová": "var(--linia-bordova, #722535)" };
export const ROK = "Podľa cirkevného roka";
/** cirkvi s liturgickým (cirkevným) rokom — pri ostatných sa „Podľa cirkevného roka“ neponúka a predvolená je zelená */
const S_ROKOM = new Set(["RKC", "GKC", "PC", "ECAV", "RKC-r", "ECM", "SKC", "CČSH"]);
export const maCirkevnyRok = (cirkev?: string) => !cirkev || S_ROKOM.has(cirkev);
export const volbyLinie = (cirkev?: string) => [...(maCirkevnyRok(cirkev) ? [ROK] : []), ...Object.keys(FARBY_LINIE)];

const DEN = 864e5;
const den = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
/** Veľká noc — gregoriánsky výpočet (katolíci, evanjelici, gréckokatolíci) */
function velkaNocZapad(y: number): number {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, e = (19 * a + b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 15) % 30;
  const f = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - e - (c % 4)) % 7, g = Math.floor((a + 11 * e + 22 * f) / 451);
  const mes = Math.floor((e + f - 7 * g + 114) / 31), dn = ((e + f - 7 * g + 114) % 31) + 1;
  return new Date(y, mes - 1, dn).getTime();
}
/** Veľká noc — juliánsky výpočet (pravoslávni), prevedená do občianskeho kalendára (+13 dní v rokoch 1900–2099) */
function velkaNocVychod(y: number): number {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const mes = Math.floor((d + e + 114) / 31), dn = ((d + e + 114) % 31) + 1;
  return new Date(y, mes - 1, dn + 13).getTime();
}

/** advent a pôst fialová · Vianoce (do Krstu Pána) a Veľká noc (do Turíc) zlatá · Turíce červená · inak zelená.
 *  Pravoslávna cirkev: Veľká noc podľa juliánskeho kalendára, Vianoce 7. 1. (do Bohozjavenia 19. 1.), advent (Filipovský pôst) od 28. 11.,
 *  Veľký pôst od Čistého pondelka. Gréckokatolícka cirkev ostáva pri katolíckom výpočte. */
export function farbaCirkevnehoRoka(d = new Date(), cirkev?: string): string {
  const y = d.getFullYear(), t = den(d), F = FARBY_LINIE;
  if (cirkev === "PC") {
    const ve = velkaNocVychod(y);
    if (t >= new Date(y, 10, 28).getTime() || t < new Date(y, 0, 7).getTime()) return F["Fialová"];
    if (t <= new Date(y, 0, 19).getTime()) return F["Zlatá"];
    if (t >= ve - 48 * DEN && t < ve - 2 * DEN) return F["Fialová"];
    if (t === ve + 49 * DEN) return F["Červená"];
    if (t >= ve - 2 * DEN && t < ve + 49 * DEN) return F["Zlatá"];
    return F["Zelená"];
  }
  const ve = velkaNocZapad(y), vian = new Date(y, 11, 25), adv = new Date(y, 11, 25 - (vian.getDay() || 7) - 21).getTime();
  // Krst Pána = nedeľa po 6. januári (najneskôr 13. 1.)
  const zj = new Date(y, 0, 6), krst = new Date(y, 0, 6 + ((7 - zj.getDay()) % 7 || 7)).getTime();
  if (t >= adv && t < vian.getTime()) return F["Fialová"];
  if (t >= vian.getTime() || t <= krst) return F["Zlatá"];
  if (t >= ve - 46 * DEN && t < ve - 2 * DEN) return F["Fialová"];
  if (t === ve + 49 * DEN) return F["Červená"];
  if (t >= ve - 2 * DEN && t < ve + 49 * DEN) return F["Zlatá"];
  return F["Zelená"];
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
  return FARBY_LINIE[v] ?? farbaCirkevnehoRoka(new Date(), cirkev);
}
export const nastavLiniu = (stranka: string, v: string) => zapisVerejne(stranka, "linia", v);
