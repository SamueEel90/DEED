// KARTA 21 · Moje skutky — lokálny zdroj (kým nie je Supabase).
// Pridané skutky, koncept, ohlásený skutok a akcia žijú v localStorage (useSyncExternalStore).
// Demo účet dostane ukážkovú históriu (SEED); nový účet začína prázdny → ukážky pre začiatok.
import { useSyncExternalStore } from "react";
import { getSession } from "@/lib/session";

/** ai = Kontroluje AI · ok = Overila AI, v štvrti · mesto = Komunita overila, v meste · nam = Spochybnený · ja = Môj denník */
export type StavSkutku = "ai" | "ok" | "mesto" | "nam" | "ja";
export const OBLASTI = ["Komunita", "Hudba", "Šport", "Zdravie", "Príroda", "Zvieratá", "Umenie", "Učenie", "Pomoc", "Viera"] as const;
export type Oblast = (typeof OBLASTI)[number];

export interface ZbierkaVolba { id: string; nazov: string; org: string; cislo: string }
export interface MojSkutok {
  id: string;
  nazov: string;
  /** sanitizované HTML (RichTextInput) */
  popis: string;
  oblast: Oblast;
  miesto: string;
  datum: number;
  stav: StavSkutku;
  /** null = „po kontrole" (AI ešte nerozhodla) */
  karma: number | null;
  /** vysvetlenie pod rozbaleným skutkom */
  det: string;
  fotky: string[];
  /** farebná plocha, kým nie je fotka (ukážky, demo) */
  grad?: string;
  osobny?: boolean;
  ucastnici?: string[];
  retaz?: { zbierka: ZbierkaVolba; pct: number };
  dar?: ZbierkaVolba[];
  seria?: string;
  /** karta 21 · 11: čo uvidí firma (len prepojený so zamestnávateľom) */
  firma?: "neukazat" | "anonym" | "meno";
  /** OPRAVY 121: skutok za charitu — navonok autor charita (za), vnútri meno organizátora (vytvoril) */
  za?: string;
  vytvoril?: string;
  /** záznam zmien z akcie za charitu (odobratí účastníci) — len vnútri charity */
  zaznam?: { cas: number; kto: string; co: string }[];
  /** OPRAVY 122 (2): kam pôjdu peniaze zo skutku charity — zapečatené pri zverejnení (100 % na zbierku) */
  peniaze?: "centralna" | "ina" | "bez";
  /** Obsah → Skutky (charita): stiahnutý z profilu a feedu, ISO; upravený po zverejnení, ISO */
  stiahnuty?: string;
  upraveny?: string;
  /** id položky vo feede (skutok za charitu) — úprava a stiahnutie ju zmenia aj tam */
  feedId?: number;
}

export interface Ucastnik { meno: string; overeny: boolean }
export interface Koncept {
  sk: boolean; plan: boolean; nazov: string; popis: string; miesto: string; kedy: string;
  oblast: Oblast | null; dar: ZbierkaVolba[]; ucastnici: Ucastnik[]; ulozene: number;
  /** OPRAVY 121: „Viac o skutku" (skutok za charitu) */
  popis2?: string;
}
export interface Ohlasenie { id: string; nazov: string; popis: string; kedy: string; odkaz: string; stav: "plan" | "bezi"; dar: ZbierkaVolba[]; sk: boolean; retaz?: { zbierka: ZbierkaVolba; pct: number } }

type Stav = { pridane: MojSkutok[]; koncept: Koncept | null; ohlasenie: Ohlasenie | null; upravy: Record<string, Partial<MojSkutok>>;
  /** OPRAVY 121: koncept a skutky za charitu — oddelene od osobných, podľa stránky */
  konceptOrg?: Record<string, Koncept>; skutkyOrg?: Record<string, MojSkutok[]> };
const KLUC = "deed.moje.skutky";
const PRAZDNY: Stav = { pridane: [], koncept: null, ohlasenie: null, upravy: {} };
let cache: Stav | null = null;
let verzia = 0;
const posluchaci = new Set<() => void>();

function nacitaj(): Stav {
  if (cache) return cache;
  try { const s = localStorage.getItem(KLUC); cache = s ? { ...PRAZDNY, ...JSON.parse(s) } : { ...PRAZDNY }; } catch { cache = { ...PRAZDNY }; }
  return cache!;
}
function uloz(z: Partial<Stav>) {
  cache = { ...nacitaj(), ...z };
  try { localStorage.setItem(KLUC, JSON.stringify(cache)); } catch { /* LS plné (fotky) — ostane v pamäti */ }
  verzia++; posluchaci.forEach((f) => f());
}
export function useZmenySkutkov() {
  return useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
}

// ---------- ukážková história (len demo účet) ----------
const G = { modra: "linear-gradient(135deg,#B9C7CF,#7E97A8)", zelena: "linear-gradient(135deg,#9DB38A,#5F7F5A)", svetla: "linear-gradient(135deg,#C9D5BC,#8FA98A)", zlata: "linear-gradient(135deg,#E2D7BF,#C9B27B)", siva: "linear-gradient(135deg,#D5CFC2,#A8A396)", cervena: "linear-gradient(135deg,#E6CCC4,#B8452F)" };
const DEN = 86400000;
function seed(): MojSkutok[] {
  const t = new Date(); const r = t.getFullYear(), m = t.getMonth();
  const vMesiaci = (mes: number, den: number, rok = r) => new Date(rok, mes, Math.max(1, Math.min(den, 28)), 10).getTime();
  const dnes = Date.now();
  const s = (id: string, stav: StavSkutku, nazov: string, oblast: Oblast, miesto: string, datum: number, karma: number | null, det: string, grad: string, x: Partial<MojSkutok> = {}): MojSkutok =>
    ({ id, stav, nazov, popis: `<p>${nazov}.</p>`, oblast, miesto, datum, karma, det, fotky: [], grad, ...x });
  const teraz: MojSkutok[] = [
    s("d1", "mesto", "Vyčistili sme skládku pri potoku", "Príroda", "Trenčín, Zámostie", dnes - 3600000, 84, "S tebou 8 ľudí · 12 overujem · 0 namietam. Vďaka komunite sa skutok ukazuje v celom meste a s väčšou fotkou.", G.zelena, { ucastnici: ["Lucia H.", "Tomáš B.", "Jana N.", "Peťo K.", "Mária S.", "Ondrej V.", "Katka L.", "Miro D."] }),
    s("d2", "ok", "Zabezpečil som susede pitný režim na mesiac", "Pomoc", "Trenčín", dnes - 2 * DEN, 48, "20 kartónov vody na 5. poschodie bez výťahu a fotka plnej špajze. Dôkaz stačil do feedu štvrte.", G.modra),
    s("d3", "ok", "Odviezol som suseda na dialýzu", "Pomoc", "Trenčín", dnes - DEN, 30, "3 overujem · 0 namietam. Keď ho overí viac ľudí, dostane sa do feedu mesta.", G.modra),
    s("d4", "ai", "Pomohol som na brigáde v parku", "Komunita", "Trenčín", dnes - DEN - 3600000, null, "AI potrebuje fotku výsledku. Doplň ju a kontrola pokračuje.", G.svetla),
    s("d5", "nam", "Hasili sme horiaci dom", "Pomoc", "Komárno", dnes - 4 * DEN, 60, "Namietka: „V Komárne v ten deň nikde nehorelo.“ Namietku posúdi AI a náš tím. Kým platí, skutok nestúpa vyššie.", G.cervena),
    s("d6", "ja", "Prvý raz na bicykli 5 km", "Šport", "osobný rozvoj", dnes - 7200000, 5, "Ostáva v tvojom denníku, nikto iný ho nevidí.", G.zlata, { osobny: true }),
    s("d7", "ja", "Prečítal som knihu o prvej pomoci", "Učenie", "osobný rozvoj", dnes - 6 * DEN, 5, "AI: osobný rozvoj, ostáva v tvojom zozname.", G.siva, { osobny: true }),
    s("d8", "ja", "Vyniesol som susede tašku", "Pomoc", "Trenčín", dnes - 8 * DEN, 3, "AI: pekný malý skutok, ale bez dôkazu. Ostáva v tvojom zozname.", G.siva, { osobny: true }),
  ].map((x) => (new Date(x.datum).getMonth() === m ? x : { ...x, datum: vMesiaci(m, new Date(x.datum).getDate()) }));
  const NAZVY: [string, Oblast, boolean][] = [
    ["Odprevadil som susedu k lekárovi", "Pomoc", false], ["Naučil som babičku volať cez videohovor", "Komunita", false], ["Daroval som krv", "Zdravie", false],
    ["Vyčistili sme breh Váhu", "Príroda", false], ["Venčil som psy z útulku", "Zvieratá", false], ["Doučoval som matematiku", "Učenie", false],
    ["Beh 10 km", "Šport", true], ["Opravil som lavičky na ihrisku", "Komunita", false], ["Nakúpil som potraviny pre seniora", "Pomoc", false],
    ["Hral som na gitare v domove seniorov", "Hudba", false], ["Prečítal som knihu", "Učenie", true], ["Pomohol som pri zbierke šatstva", "Pomoc", false],
  ];
  const mesiac = (rok: number, mes: number, pocet: number, pref: string) => Array.from({ length: pocet }, (_, i) => {
    const [n, o, osobny] = NAZVY[(i + mes) % NAZVY.length];
    return s(`${pref}-${rok}-${mes}-${i}`, osobny ? "ja" : i % 5 === 0 ? "mesto" : "ok", n, o, osobny ? "osobný rozvoj" : "Trenčín", vMesiaci(mes, 27 - i, rok),
      osobny ? 5 : 20 + ((i * 7) % 40), osobny ? "Ostáva v tvojom denníku." : "Overila AI.", [G.modra, G.zelena, G.svetla, G.zlata][i % 4], { osobny });
  });
  const tentoRok = [[1, 14], [2, 9], [3, 11], [4, 6]].filter(([d]) => m - d >= 0).flatMap(([d, n]) => mesiac(r, m - d, n, "s"));
  const minuly = [11, 10, 9, 9, 10, 8, 12, 9, 8, 9, 10, 8].flatMap((n, mes) => mesiac(r - 1, mes, n, "p"));
  const predminuly = [0, 0, 0, 2, 3, 4, 5, 6, 5, 6, 5, 5].flatMap((n, mes) => mesiac(r - 2, mes, n, "q"));
  return [...teraz, ...tentoRok, ...minuly, ...predminuly];
}
let seedCache: MojSkutok[] | null = null;
const jeDemo = () => { const s = getSession() as { demo?: boolean } | null; return !!s?.demo; };

/** všetky moje skutky (najnovšie hore) */
export function mojeSkutky(): MojSkutok[] {
  const st = nacitaj();
  const zaklad = jeDemo() ? (seedCache ??= seed()) : [];
  return [...st.pridane, ...zaklad].map((x) => (st.upravy[x.id] ? { ...x, ...st.upravy[x.id] } : x)).sort((a, b) => b.datum - a.datum);
}
export function pridajSkutok(s: MojSkutok) { uloz({ pridane: [s, ...nacitaj().pridane] }); }
export function upravSkutok(id: string, z: Partial<MojSkutok>) {
  const st = nacitaj();
  if (st.pridane.some((x) => x.id === id)) uloz({ pridane: st.pridane.map((x) => (x.id === id ? { ...x, ...z } : x)) });
  else uloz({ upravy: { ...st.upravy, [id]: { ...st.upravy[id], ...z } } });
}

// ---------- koncept (jeden naraz) ----------
export const koncept = () => nacitaj().koncept;
export const ulozKoncept = (k: Koncept | null) => uloz({ koncept: k });

// ---------- OPRAVY 121: skutok za charitu (koncept a zoznam podľa stránky, nie v osobnom denníku) ----------
export const konceptOrg = (stranka: string): Koncept | null => nacitaj().konceptOrg?.[stranka] ?? null;
export const ulozKonceptOrg = (stranka: string, k: Koncept | null) => {
  const m = { ...(nacitaj().konceptOrg ?? {}) };
  if (k) m[stranka] = k; else delete m[stranka];
  uloz({ konceptOrg: m });
};
export const skutkyOrg = (stranka: string): MojSkutok[] => nacitaj().skutkyOrg?.[stranka] ?? [];
export const pridajSkutokOrg = (stranka: string, x: MojSkutok) => uloz({ skutkyOrg: { ...(nacitaj().skutkyOrg ?? {}), [stranka]: [x, ...skutkyOrg(stranka)] } });
/** Obsah → Skutky: úprava zverejneného skutku charity (text) alebo stiahnutie */
export const upravSkutokOrg = (stranka: string, id: string, z: Partial<MojSkutok>) =>
  uloz({ skutkyOrg: { ...(nacitaj().skutkyOrg ?? {}), [stranka]: skutkyOrg(stranka).map((x) => (x.id === id ? { ...x, ...z } : x)) } });

// ---------- ohlásený skutok (Chystám sa to urobiť) ----------
export const ohlasenie = () => nacitaj().ohlasenie;
export const nastavOhlasenie = (o: Ohlasenie | null) => uloz({ ohlasenie: o });

// ---------- súhrny ----------
export const karmaSkutkov = (l: MojSkutok[]) => l.reduce((a, x) => a + (x.karma ?? 0), 0);

/** hľadanie bez diakritiky, veľkých písmen, medzier a # („vozik" nájde „vozík", „47821" nájde „#47 821") */
export const normalizuj = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[#\s]/g, "");
