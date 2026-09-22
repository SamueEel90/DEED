// ============================================================
// SPRÁVA ZBIERKY — stav, predĺženie, topovanie, dokladovanie (pravidlá + mock úložisko)
// Jeden zdroj pravdy pre správu aj verejný profil: najdiZbierku() v lib/zbierky
// si odtiaľto berie stav (aktívna/ukončená) a zverejnené dokladovanie.
// Všetky čísla = KONFIG (placeholder, ladí Martin). Perzistencia = localStorage.
// ============================================================
import { useSyncExternalStore } from "react";

export const SPRAVA_ZBIERKY_CFG = {
  /** štandardná dĺžka zbierky (kalendárne dni) */
  dlzkaDni: 30,
  /** predĺženie = platená alternatíva topovania; mŕtve zbierky sa nemajú umelo naťahovať.
   *  Neplatí pre dlhodobé zbierky (liečba, segmenty charity). */
  predlzenia: [
    { dni: 30, cena: 5 },
    { dni: 15, cena: 15 },
    { dni: 15, cena: 40 },
  ],
  /** topovanie = platená viditeľnosť, od programu ZBIERKA (T1); jedno z kritérií radenia */
  topovanieOdTieru: 1,
  topovanie: [
    { kluc: "mesto", nazov: "Mesto", cena: 5 },
    { kluc: "kraj", nazov: "Kraj", cena: 15 },
    { kluc: "krajina", nazov: "Krajina", cena: 40 },
  ],
  topovanieDni: 7,
  /** lehota na dokladovanie po ukončení (voľba charity pri zakladaní) */
  lehoty: { "30": 30, priebezne: 30, "60": 60 } as Record<Lehota, number>,
  /** po lehote: výzva — dolož do X dní, inak tabuľa hanby (alebo zdôvodnenie) */
  vyzvaDni: 3,
  /** 3 nedoložené zbierky = pozastavenie */
  strikesPozastavenie: 3,
  /** max priebežných správ pre darcov počas zbierky (placeholder) */
  maxSprav: 3,
  /** karma za dôkaz navyše (placeholder) */
  karmaNavyse: 5,
};

export type Lehota = "30" | "priebezne" | "60";

/** pásma podľa REÁLNE vyzbieranej sumy (nie cieľa) — povinné minimum dokladovania */
export type Poziadavka = "text" | "foto" | "rozpis" | "uctenky" | "doklady100" | "potvrdenie" | "spravy";
export const PASMA_DOKLADOV: { do: number; label: string; povinne: Poziadavka[] }[] = [
  { do: 150, label: "do 150 €", povinne: ["text", "foto"] },
  { do: 500, label: "150 – 500 €", povinne: ["text", "foto"] },
  { do: 1500, label: "500 – 1 500 €", povinne: ["text", "foto", "rozpis"] },
  { do: 5000, label: "1 500 – 5 000 €", povinne: ["text", "foto", "rozpis", "uctenky"] },
  { do: Infinity, label: "nad 5 000 €", povinne: ["text", "foto", "rozpis", "doklady100", "potvrdenie", "spravy"] },
];
export const POZIADAVKA_TEXT: Record<Poziadavka, string> = {
  text: "Text — na čo išli peniaze",
  foto: "Fotka alebo video použitia",
  rozpis: "Rozpis položiek (čo, koľko)",
  uctenky: "Účtenky k hlavným položkám (aspoň polovica sumy)",
  doklady100: "Doklady na celú sumu",
  potvrdenie: "Potvrdenie príjemcu o prevzatí",
  spravy: "Aspoň 1 priebežná správa počas zbierky",
};
export const pasmoPre = (vyzbierane: number) => PASMA_DOKLADOV.findIndex((p) => vyzbierane <= p.do);

export type DruhDokladu = "Bloček" | "Faktúra" | "Výpis" | "Potvrdenie o prevzatí";
export const DRUHY_DOKLADU: DruhDokladu[] = ["Bloček", "Faktúra", "Výpis", "Potvrdenie o prevzatí"];
export interface PolozkaDokladu {
  id: string;
  druh: DruhDokladu;
  nazov: string;       // čo sa kúpilo / na čo išlo
  dodavatel: string;
  suma: number;
  datum: string;       // ISO
  foto?: string;       // sken/fotka dokladu (data-URL)
}
export interface FotkaPouzitia { src: string; popis: string }  // popis: PRED / PO / voľný
export interface SpravaDarcom { text: string; datum: string }

export interface StavZbierky {
  stav: "aktivna" | "ukoncena";
  koniec: string;            // ISO — plánovaný koniec zbierky
  ukoncena?: string;         // ISO — kedy sa ukončila
  predlzenia: number;        // koľko predĺžení už zaplatila
  top?: { uroven: string; do: string };
  lehota: Lehota;
  zdovodnenie60?: string;
  zdovodnenieBezDokladov?: string;
  text: string;
  fotky: FotkaPouzitia[];
  doklady: PolozkaDokladu[];
  spravy: SpravaDarcom[];
  zverejnene?: string;       // ISO — dokladovanie zverejnené a darcovia upovedomení
  simVyzbierane?: number;    // DEV — simulácia sumy na test pásiem
}

// ---- úložisko + reaktivita ----
const KLUC = (id: string) => `deed.zbierka.sprava.${id}`;
let verzia = 0;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenySpravy(): number { return useSyncExternalStore(subscribe, () => verzia); }

export function nacitajStav(id: string): StavZbierky | null {
  try { const s = localStorage.getItem(KLUC(id)); return s ? (JSON.parse(s) as StavZbierky) : null; } catch { return null; }
}
export function ulozStav(id: string, s: StavZbierky) {
  try { localStorage.setItem(KLUC(id), JSON.stringify(s)); } catch { /* LS nedostupné */ }
  verzia++; posluchaci.forEach((f) => f());
}

// ---- výpočty ----
const DEN = 86400000;
export const dniDo = (iso: string, teraz: number) => Math.ceil((new Date(iso).getTime() - teraz) / DEN);
export const pridajDni = (iso: string | number, dni: number) => new Date(new Date(iso).getTime() + dni * DEN).toISOString();

export function sumaDokladov(s: StavZbierky, lenSFotkou = false) {
  return s.doklady.filter((d) => !lenSFotkou || !!d.foto).reduce((a, d) => a + d.suma, 0);
}
/** „doložené X % použitia" — rátajú sa len položky so skenom dokladu */
export function percentoDolozenia(s: StavZbierky, vyzbierane: number): number {
  if (!vyzbierane) return s.doklady.some((d) => d.foto) ? 100 : 0;
  return Math.min(100, Math.round((sumaDokladov(s, true) / vyzbierane) * 100));
}
export function splnene(p: Poziadavka, s: StavZbierky, vyzbierane: number): boolean {
  switch (p) {
    case "text": return s.text.trim().length >= 20;
    case "foto": return s.fotky.length >= 1;
    case "rozpis": return s.doklady.length >= 1;
    case "uctenky": return vyzbierane > 0 && sumaDokladov(s, true) >= vyzbierane * 0.5;
    case "doklady100": return vyzbierane > 0 && sumaDokladov(s, true) >= vyzbierane * 0.99;
    case "potvrdenie": return s.doklady.some((d) => d.druh === "Potvrdenie o prevzatí");
    case "spravy": return s.spravy.length >= 1;
  }
}
/** dôkaz navyše nad povinné minimum → +karma (poctivosť odmeňujeme) */
export function navyse(s: StavZbierky, vyzbierane: number): number {
  const pas = PASMA_DOKLADOV[pasmoPre(vyzbierane)];
  let n = Math.max(0, s.fotky.length - 1);
  if (!pas.povinne.includes("rozpis")) n += s.doklady.length;
  else if (!pas.povinne.includes("uctenky") && !pas.povinne.includes("doklady100")) n += s.doklady.filter((d) => d.foto).length;
  return n;
}

/** fáza dokladovania ukončenej zbierky */
export type FazaDokladu = "lehota" | "vyzva" | "caka" | "zdovodnene" | "dolozene";
export function fazaDokladovania(s: StavZbierky, vyzbierane: number, teraz: number): { faza: FazaDokladu; dni: number } {
  const pas = PASMA_DOKLADOV[pasmoPre(vyzbierane)];
  if (s.zverejnene && pas.povinne.every((p) => splnene(p, s, vyzbierane))) return { faza: "dolozene", dni: 0 };
  if (!s.ukoncena) return { faza: "lehota", dni: SPRAVA_ZBIERKY_CFG.lehoty[s.lehota] };
  const koniecLehoty = pridajDni(s.ukoncena, SPRAVA_ZBIERKY_CFG.lehoty[s.lehota]);
  const dni = dniDo(koniecLehoty, teraz);
  if (dni > 0) return { faza: "lehota", dni };
  if (s.zdovodnenieBezDokladov) return { faza: "zdovodnene", dni: 0 };
  const vyzva = dni + SPRAVA_ZBIERKY_CFG.vyzvaDni;
  if (vyzva > 0) return { faza: "vyzva", dni: vyzva };
  return { faza: "caka", dni: 0 };
}

/** doklad z pôvodných (už overených) dát — sken je u nás, nie v prehliadači */
export const OVERENY_SKEN = "overene";
