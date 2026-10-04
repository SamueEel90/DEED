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
  /** KARTA 38 · bod 3: predĺženie vo feede (30 dní je v cene) — rebrík 15 · 15 · 15 dní, najviac 75 dní vo feede.
   *  Neplatí pre centrálnu, sektorové a dlhodobé zbierky. */
  predlzenia: [
    { dni: 15, cena: 5 },
    { dni: 15, cena: 15 },
    { dni: 15, cena: 40 },
  ],
  /** topovanie = platená viditeľnosť, v každom programe aj Zadarmo (karta 38); jedno z kritérií radenia */
  topovanieOdTieru: 0,
  topovanie: [
    { kluc: "mesto", nazov: "Mesto", cena: 5 },
    { kluc: "kraj", nazov: "Kraj", cena: 15 },
    { kluc: "krajina", nazov: "Krajina", cena: 40 },
  ],
  topovanieDni: 7,
  /** lehota na dokladovanie po ukončení (voľba charity pri zakladaní) */
  lehoty: { "30": 30, priebezne: 30, "60": 60, stvrtrocne: 90 } as Record<Lehota, number>,
  /** KARTA 38 · bod 4: zbierka skončená pred 30. dňom ostane vo feede do konca svojich 30 dní ako poďakovanie */
  podakovanieDni: 30,
  /** po lehote: výzva — dolož do X dní, inak tabuľa hanby (alebo zdôvodnenie) */
  vyzvaDni: 3,
  /** 3 nedoložené zbierky = pozastavenie */
  strikesPozastavenie: 3,
  /** karma za dôkaz navyše (placeholder) */
  karmaNavyse: 5,
};

/** lehoty dokladovania — zjednotené s kartou 37 (30 dní · 60 dní · priebežne + záverečná · štvrťročne) */
export type Lehota = "30" | "priebezne" | "60" | "stvrtrocne";
export const LEHOTA_TEXT: Record<Lehota, string> = { "30": "do 30 dní od skončenia", "60": "do 60 dní od skončenia", priebezne: "priebežne + záverečná", stvrtrocne: "štvrťročne" };

/** pásma podľa REÁLNE vyzbieranej sumy (nie cieľa) — povinné minimum dokladovania */
export type Poziadavka = "text" | "foto" | "rozpis" | "uctenky" | "doklady100" | "potvrdenie";
export const PASMA_DOKLADOV: { do: number; label: string; povinne: Poziadavka[] }[] = [
  { do: 150, label: "do 150 €", povinne: ["text", "foto"] },
  { do: 500, label: "150 – 500 €", povinne: ["text", "foto"] },
  { do: 1500, label: "500 – 1 500 €", povinne: ["text", "foto", "rozpis"] },
  { do: 5000, label: "1 500 – 5 000 €", povinne: ["text", "foto", "rozpis", "uctenky"] },
  { do: Infinity, label: "nad 5 000 €", povinne: ["text", "foto", "rozpis", "doklady100", "potvrdenie"] },
];
export const POZIADAVKA_TEXT: Record<Poziadavka, string> = {
  text: "Text, na čo išli peniaze",
  foto: "Fotka alebo video použitia",
  rozpis: "Rozpis položiek",
  uctenky: "Účtenky k hlavným položkám (aspoň polovica sumy)",
  doklady100: "Doklady na celú sumu",
  potvrdenie: "Potvrdenie príjemcu o prevzatí",
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
/** fotka / video dokladu použitia — 5. 10.: popis = voľný popis fotky (najviac 80 znakov), žiadne PRED / PO */
export interface FotkaPouzitia { src: string; popis: string; typ?: "foto" | "video"; sek?: number }
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
  /** 5. 10. · pokračovanie textu „Na čo išli peniaze" (TextovePolia, po „… viac") */
  text2?: string;
  fotky: FotkaPouzitia[];
  doklady: PolozkaDokladu[];
  spravy: SpravaDarcom[];
  zverejnene?: string;       // ISO — dokladovanie zverejnené a darcovia upovedomení
  /** KARTA 38: začiatok zbierky (deň 1 z 30) a stiahnutie z feedu po skončení */
  zaciatok?: string;
  stiahnuta?: string;
  /** KARTA 38: výsledok poslaný darcom automaticky pri ukončení (1. z 2 správ) */
  vysledokPoslany?: string;
  /** KARTA 37 · bod 7: dlhodobá zbierka — kedy charita zavrela upozornenie po 90 dňoch bez doloženia („Teraz nie") */
  upozornenie90Zavrete?: string;
  /** KARTA 39 · bod 1: posledné vytiahnutie dlhodobej hore (priebežné doloženie), ISO */
  vytiahnute?: string;
  /** KARTA 39 · bod 1: žiadosť o zmenu účelu (len dlhodobá) */
  zmenaUcelu?: { ucel: string; zdovodnenie: string; podana: string; schvalena?: string };
  simDary30?: number;        // DEV — simulácia darov za posledných 30 dní (živá / nie)
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
/** KARTA 37 · bod 7: upozornenie pre charitu (nie trest, nie darcom) vždy po 90 dňoch bez doloženia pri dlhodobej zbierke */
export const UPOZORNENIE_DNI = 90;
export const UPOZORNENIE_90_TEXT = "Prešli 3 mesiace od spustenia. Máte niečo nové na doloženie? Zbierka sa tým dostane na 24 hodín hore.";
export function upozornenie90(s: StavZbierky, zaciatok: string, teraz: number): boolean {
  const posledne = Math.max(Date.parse(zaciatok), ...s.doklady.map((d) => Date.parse(d.datum) || 0));
  const obdobie = Math.floor((teraz - posledne) / (UPOZORNENIE_DNI * DEN));
  if (obdobie < 1) return false;
  return !(s.upozornenie90Zavrete && Date.parse(s.upozornenie90Zavrete) >= posledne + obdobie * UPOZORNENIE_DNI * DEN);
}
/** KARTA 39 · bod 1: kde je dlhodobá zbierka vo feede (logika radenia je na serveri — toto je to isté pravidlo pre správu) */
export type MiestoDlhodobej = "velka" | "hore" | "mala" | "profil";
export function kdeJeDlhodoba(o: { zaciatok: string; dary30: number; vytiahnute?: string; teraz: number;
  cfg: { velkaDni: number; prah: { dary: number; dni: number }; horeHodin: number; vytiahnutieKazdychDni: number } }) {
  const { cfg, teraz } = o;
  const vyt = o.vytiahnute ? Date.parse(o.vytiahnute) : 0;
  const ziva = o.dary30 >= cfg.prah.dary;
  const hore = vyt > 0 && teraz - vyt < cfg.horeHodin * 3600000;
  const vPrvych = teraz - Date.parse(o.zaciatok) < cfg.velkaDni * DEN;
  const miesto: MiestoDlhodobej = hore ? "hore" : vPrvych ? "velka" : ziva ? "mala" : "profil";
  const dalsie = vyt ? vyt + cfg.vytiahnutieKazdychDni * DEN : 0;
  return { miesto, ziva, mozeVytiahnut: !dalsie || teraz >= dalsie, dalsieVytiahnutie: dalsie && teraz < dalsie ? new Date(dalsie).toISOString() : null };
}
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
