// ============================================================
// KARTA 31 · preklady. Zdroj = slovenčina (i18n/sk/*.ts), angličtina = i18n/en/*.ts.
// Kľúče po obrazovkách (profil.*, karma.*, …). Hook: const t = useT(); t("karma.titul"); t("sp.skutkov", { n: 5 }).
// Množné číslo cez Intl.PluralRules, čísla/sumy/dátumy cez Intl podľa jazyka.
// Chýbajúci kľúč v EN → slovenčina + [i18n] v konzole, nikdy prázdne miesto.
// Neprekladá sa: DEED+, DEEDGOOD, DeeD, EURC, názvy štítov (ART, EKO…), mená ľudí a organizácií, obsah príspevkov.
// ============================================================
import { useNastaveniaAppky, nacitajNastavenia } from "@/lib/nastaveniaAppky";
import type { Hodnota, Slovnik } from "./typy";
import { sk } from "./sk";
import { en } from "./en";

export type Jazyk = "sk" | "en";
const SLOVNIKY: Record<Jazyk, Slovnik> = { sk, en };
/** názov jazyka v Nastaveniach → kód; ostatné jazyky zatiaľ nemáme → slovenčina */
export const kodJazyka = (nazov: string): Jazyk => (nazov === "English" ? "en" : "sk");
const LOCALE: Record<Jazyk, string> = { sk: "sk-SK", en: "en-GB" };

const hlasene = new Set<string>();
function najdi(j: Jazyk, k: string): Hodnota | undefined {
  const v = SLOVNIKY[j][k];
  if (v !== undefined) return v;
  if (j !== "sk") {
    if (!hlasene.has(j + k)) { hlasene.add(j + k); console.warn(`[i18n] chýba ${j}: ${k}`); }
    return SLOVNIKY.sk[k];
  }
  if (!hlasene.has(k)) { hlasene.add(k); console.warn(`[i18n] chýba kľúč: ${k}`); }
  return undefined;
}

export type Param = Record<string, string | number>;
export type T = ((k: string, p?: Param) => string) & {
  jazyk: Jazyk; locale: string;
  /** 1 240 / 1,240 */ cislo: (n: number, max?: number) => string;
  /** 1 240 € / €1,240 */ eur: (n: number, desatinne?: boolean) => string;
  /** 29. 9. / 29 Sep (bez roka), s rokom: 29. 9. 2026 / 29 Sep 2026 */ datum: (d: Date | number, rok?: boolean) => string;
  /** názov mesiaca (0–11) */ mesiac: (m: number, kratky?: boolean) => string;
};

export function vytvorT(j: Jazyk): T {
  const locale = LOCALE[j];
  const pr = new Intl.PluralRules(locale);
  const nf = new Intl.NumberFormat(locale);
  const cislo = (n: number, max = 2) => new Intl.NumberFormat(locale, { maximumFractionDigits: max }).format(n);
  const f = ((k: string, p?: Param) => {
    let v = najdi(j, k);
    if (v === undefined) return k;
    if (typeof v !== "string") {
      const n = Number(p?.n ?? 0);
      const tvar = pr.select(n) as keyof typeof v;
      v = (v[tvar] ?? v.other) as string;
    }
    if (p) v = v.replace(/\{(\w+)\}/g, (m, x: string) => (p[x] === undefined ? m : typeof p[x] === "number" ? nf.format(p[x] as number) : String(p[x])));
    return v;
  }) as T;
  f.jazyk = j; f.locale = locale; f.cislo = cislo;
  f.eur = (n, des) => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: des ? 2 : 0, maximumFractionDigits: des ? 2 : 0 }).format(n);
  f.datum = (d, rok) => {
    const x = typeof d === "number" ? new Date(d) : d;
    if (j === "sk") return `${x.getDate()}. ${x.getMonth() + 1}.${rok ? ` ${x.getFullYear()}` : ""}`;
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", ...(rok ? { year: "numeric" } : {}) }).format(x);
  };
  f.mesiac = (m, kratky) => new Intl.DateTimeFormat(locale, { month: kratky ? "short" : "long" }).format(new Date(2026, m, 15));
  return f;
}

const cache: Partial<Record<Jazyk, T>> = {};
const tPre = (j: Jazyk) => (cache[j] ??= vytvorT(j));
/** hook — komponent sa prekreslí hneď po zmene jazyka v Nastaveniach */
export function useT(): T { return tPre(kodJazyka(useNastaveniaAppky().jazyk)); }
/** mimo komponentu (hlásenia, zdieľanie) — aktuálny jazyk bez odberu zmien */
export function tTeraz(): T { return tPre(kodJazyka(nacitajNastavenia().jazyk)); }
