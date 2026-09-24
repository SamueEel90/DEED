// ============================================================
// DOROVNANIE DARU (firemný matching) — firma pridá ku každému daru svoj
// diel, kým sa nevyčerpá jej strop. Právne je to dar ako každý iný:
// žiadne protiplnenie, žiadna faktúra, karma ako ktorýkoľvek darca.
//
// Poradie krokov (dôkaz v každom kroku, nič sa nemení spätne):
//   charita pri vytváraní zbierky zapne „Prijímame dorovnanie"
//   → firma nastaví parametre a UHRADÍ sumu priamo charite (my sa jej nedotkneme)
//   → až po úhrade ZAPEČATÍ (odvtedy sa parametre nedajú zmeniť)
//   → dorovnanie beží a je vidieť pri zbierke
// Kedy začne bežať, určuje RÚRA, nie nálada charity:
//   KARTA — ide cez nášho procesora, potvrdenie máme v sekunde → beží IHNEĎ
//          (to isté bude platiť pre EURC, keď ho do platby dorovnania pridáme —
//           engine kanál „krypto" už pozná, v platbe zatiaľ nie je)
//   SEPA — non-custody, peniaze idú priamo na IBAN charity a do jej výpisu
//          nevidíme; potvrdiť príjem vie zatiaľ len charita. Aby firemné peniaze
//          neležali kvôli neodklikanej správe, po 48 h nabehne dorovnanie SAMO
//          (tichý súhlas). Charita ho môže potvrdiť hneď alebo pred úhradou odmietnuť.
// Keď charita pripojí účet (AIS čítanie výpisu, § A2 pre Dagmar), 48-ka padne
// a aj SEPA sa páruje automaticky podľa VS.
// ============================================================
import { useSyncExternalStore } from "react";
import { rovnakaFirma } from "./firma";
import { somZamestnanec } from "./zamestnanci";

export const DOROVNANIE_CFG = {
  /** ponuka pomerov vo formulári firmy — koľkonásobok daru firma pridá */
  pomery: [0.5, 1, 2, 5],
  /** predvolený pomer */
  pomer: 1,
  /** odvetvia, ktoré nesmú dorovnávať tam, kde samy robia škodu (§ pravidlo platformy) */
  zakazaneKombinacie: [
    { odvetvie: "hazard", zbierky: ["zavislosti", "deti"] },
    { odvetvie: "alkohol", zbierky: ["zavislosti"] },
    { odvetvie: "pozicky", zbierky: ["exekucie", "dlhy"] },
  ],
};

/** rúra, ktorou firma zaplatila — rozhoduje, či vieme príjem overiť sami */
export type KanalDorovnania = "karta" | "krypto" | "sepa";

/** kým beží 48-hodinový tichý súhlas pri SEPA */
export const AUTOMAT_MS = 48 * 3600 * 1000;

export type StavDorovnania =
  | "zapecatene"      // SEPA: uhradené a zapečatené, čaká na potvrdenie charity (max 48 h)
  | "aktivne"         // peniaze sú u charity, dorovnanie beží
  | "pozastavene"     // zbierka aj dary stoja; čaká sa na vysporiadanie zvyšku
  | "vycerpane"       // strop minutý
  | "ukoncene"        // koniec obdobia alebo koniec zbierky
  | "odmietnute"      // charita odmietla (len pred platbou)
  | "zrusene";        // firma zrušila (len pred platbou)

/** jeden dorovnaný dar — nemenný záznam */
export interface ZaznamDorovnania {
  id: string;
  dar: number;
  dorovnane: number;
  kedy: number;
}

export interface Dorovnanie {
  id: string;
  /** kľúč subjektu, ktorému zbierka patrí — „charita", „fara:12"… */
  entita: string;
  /** čoho sa drží: konkrétna zbierka / sektor / celá organizácia */
  ciel: string;
  cielNazov: string;
  firma: string;
  firmaProfil?: string;
  firmaLogo?: string;
  /** × k daru: 1 = dorovná rovnakú sumu (×2 pre príjemcu) */
  pomer: number;
  /** koľko firma vyčlenila celkom (predplatené) */
  strop: number;
  od: number;
  /** koniec obdobia; pri „do vyčerpania" je to len technický strop */
  do: number;
  /** beží, kým sa nevyčerpá strop — bez dátumu konca */
  doVycerpania?: boolean;
  /** nevyčerpaný zvyšok na konci: ostáva zbierke (default) alebo späť firme */
  zvysok: "zbierke" | "firme";
  stav: StavDorovnania;
  /** dorovnávame len dary vlastných zamestnancov (zamestnanecký matching).
   *  Bez toho dorovnáva každý dar, nech ho dá ktokoľvek. */
  lenZamestnanci?: boolean;
  /** ktorou rúrou firma zaplatila (staré záznamy ju nemajú → berú sa ako SEPA) */
  kanal?: KanalDorovnania;
  /** dorovnanie nabehlo tichým súhlasom po 48 h, nie klikom charity */
  automaticky?: boolean;
  /** časové pečiatky krokov — dôkaz, že poradie sedelo */
  zapecatene: number;
  zaplatene?: number;
  ukoncene?: number;
  /** nemenná história dorovnaných darov */
  zaznamy: ZaznamDorovnania[];
  // ---- ukončenie: zbierka stojí → zvyšok vysporiadaný → až potom koniec ----
  pozastavene?: number;
  /** ako sa naložilo so zvyškom a kedy — bez toho sa dorovnanie nedá ukončiť */
  vysporiadane?: { suma: number; kam: "zbierke" | "firme"; kedy: number; referencia?: string };
}

const KLUC = (entita: string) => `deed.dorovnania.${entita}`;
let verzia = 0;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenyDorovnani(): number { return useSyncExternalStore(subscribe, () => verzia); }

export function nacitajDorovnania(entita: string): Dorovnanie[] {
  let v: Dorovnanie[];
  try { v = JSON.parse(localStorage.getItem(KLUC(entita)) ?? "[]") as Dorovnanie[]; } catch { return []; }
  // tichý súhlas: čo čaká na potvrdenie dlhšie než 48 h, nabehne samo
  const teraz = Date.now();
  const po = v.map((d) => (d.stav === "zapecatene" && teraz >= d.zapecatene + AUTOMAT_MS
    ? { ...d, stav: "aktivne" as StavDorovnania, zaplatene: d.zapecatene + AUTOMAT_MS, automaticky: true }
    : d));
  if (po.some((d, i) => d !== v[i])) {
    try { localStorage.setItem(KLUC(entita), JSON.stringify(po)); } catch { /* LS nedostupné */ }
  }
  return po;
}

/** kedy najneskôr nabehne (SEPA, tichý súhlas) — null, ak už beží alebo je po ňom */
export const automatOd = (d: Dorovnanie) =>
  d.stav === "zapecatene" ? d.zapecatene + AUTOMAT_MS : null;

/** „o 41 h" / „o 12 min" — koľko ostáva do automatického spustenia */
export function casAutomatu(d: Dorovnanie, teraz = Date.now()): string {
  const t = automatOd(d);
  if (t === null) return "";
  const zostava = t - teraz;
  if (zostava <= 0) return "o chvíľu";
  const hodiny = Math.floor(zostava / 3600000);
  return hodiny >= 1 ? `o ${hodiny} h` : `o ${Math.max(1, Math.round(zostava / 60000))} min`;
}
function uloz(entita: string, v: Dorovnanie[]) {
  try { localStorage.setItem(KLUC(entita), JSON.stringify(v)); } catch { /* LS nedostupné */ }
  verzia++; posluchaci.forEach((f) => f());
}

// ---- výpočet ----
export const vycerpane = (d: Dorovnanie) => d.zaznamy.reduce((s, z) => s + z.dorovnane, 0);
export const zostatok = (d: Dorovnanie) => Math.max(0, d.strop - vycerpane(d));

/** koľko firma pridá k tomuto daru — nikdy viac, než koľko jej ostáva.
 *  Pri zamestnaneckom dorovnaní platí len pre potvrdených zamestnancov firmy;
 *  ostatným darcom sa nič nesľubuje ani nezobrazuje. */
export function dorovnanieKDaru(d: Dorovnanie, dar: number, teraz = Date.now()): number {
  if (!bezi(d, teraz) || dar <= 0) return 0;
  if (d.lenZamestnanci && !somZamestnanec(d.firma)) return 0;
  return Math.min(Math.round(dar * d.pomer * 100) / 100, zostatok(d));
}

/** platí toto dorovnanie pre práve prihláseného darcu? (texty, bežec, prepočet) */
export const platiPreMna = (d: Dorovnanie): boolean => !d.lenZamestnanci || somZamestnanec(d.firma);

export const bezi = (d: Dorovnanie, teraz = Date.now()) =>
  d.stav === "aktivne" && teraz >= d.od && teraz <= d.do && zostatok(d) > 0;

/** dorovnanie, ktoré práve beží na danom cieli (zbierka/sektor/organizácia) */
export function beziaceDorovnanie(entita: string, ciel: string, teraz = Date.now()): Dorovnanie | null {
  return nacitajDorovnania(entita).find((d) => d.ciel === ciel && bezi(d, teraz)) ?? null;
}

/** dorovnanie bežiace na tomto cieli — nech dar príde z ktorejkoľvek obrazovky.
 *  Zbierku dorovnáva vždy najviac jedna firma, takže prvý nález je ten pravý. */
export function beziaceDorovnanieNaCiel(ciel: string, teraz = Date.now()): (Dorovnanie & { entita: string }) | null {
  for (const e of vsetkyEntity()) {
    const d = nacitajDorovnania(e).find((x) => x.ciel === ciel && bezi(x, teraz));
    if (d) return { ...d, entita: d.entita ?? e };
  }
  return null;
}

/** zmazať sa dá len to, čo je už uzavreté — bežiace a zaplatené drží peniaze */
export const daSaZmazat = (d: Dorovnanie) =>
  d.stav === "ukoncene" || d.stav === "odmietnute" || d.stav === "zrusene"
  || (d.stav === "vycerpane" && !!d.ukoncene);

export function zmazDorovnanie(entita: string, id: string): boolean {
  const v = nacitajDorovnania(entita);
  const d = v.find((x) => x.id === id);
  if (!d || !daSaZmazat(d)) return false;
  uloz(entita, v.filter((x) => x.id !== id));
  return true;
}

/** všetky entity, ktoré majú nejaké dorovnanie (mock — v produkcii jeden dotaz) */
function vsetkyEntity(): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("deed.dorovnania.")) out.push(k.slice("deed.dorovnania.".length));
    }
  } catch { /* LS nedostupné */ }
  return out;
}


/** dorovnania jednej firmy naprieč charitami — pohľad z jej vlastnej správy */
export function dorovnaniaFirmy(firma: string): Dorovnanie[] {
  return vsetkyEntity()
    .flatMap((e) => nacitajDorovnania(e))
    .filter((d) => rovnakaFirma(d.firma, firma))
    .sort((a, b) => b.zapecatene - a.zapecatene);
}
export function useDorovnaniaFirmy(firma: string): Dorovnanie[] {
  useZmenyDorovnani();
  return dorovnaniaFirmy(firma);
}

export function useDorovnania(entita: string): Dorovnanie[] {
  useZmenyDorovnani();
  return nacitajDorovnania(entita).sort((a, b) => b.zapecatene - a.zapecatene);
}

// ---- kroky ----
/** firma nastavila a zapečatila — parametre sa už nedajú zmeniť */
export function zapecat(n: Omit<Dorovnanie, "id" | "stav" | "zapecatene" | "zaznamy">): Dorovnanie {
  const teraz = Date.now();
  // karta a EURC idú cez nášho procesora — príjem vieme overiť sami, čakať netreba
  const hned = n.kanal === "karta" || n.kanal === "krypto";
  const novy: Dorovnanie = {
    ...n, id: `dv-${teraz}`, zaznamy: [], zapecatene: teraz,
    stav: hned ? "aktivne" : "zapecatene",
    ...(hned ? { zaplatene: teraz } : {}),
  };
  uloz(n.entita, [novy, ...nacitajDorovnania(n.entita)]);
  return novy;
}
function zmen(entita: string, id: string, patch: Partial<Dorovnanie>) {
  uloz(entita, nacitajDorovnania(entita).map((d) => (d.id === id ? { ...d, ...patch } : d)));
}
/** charita potvrdila, že peniaze prišli na jej účet → odvtedy sa smie sľubovať darcom */
export const potvrdPlatbu = (entita: string, id: string) =>
  zmen(entita, id, { stav: "aktivne", zaplatene: Date.now() });
/** len kým firma nezaplatila */
export const odmietni = (entita: string, id: string) => zmen(entita, id, { stav: "odmietnute", ukoncene: Date.now() });
export const zrus = (entita: string, id: string) => zmen(entita, id, { stav: "zrusene", ukoncene: Date.now() });

// ---- ukončenie má poradie: pozastaviť → vysporiadať zvyšok → ukončiť ----
/** zbierka sa zastaví: neprijíma dary, takže sa už nič nedorovnáva */
export const pozastav = (entita: string, id: string) =>
  zmen(entita, id, { stav: "pozastavene", pozastavene: Date.now() });

/** Kam ide zvyšok:
 *  · charita zbierku zrušila sama → VŠETKO späť firme. Firma si kupovala
 *    dorovnanie darov, nie dar charite — keď charita skončí, nemá si čo nechať.
 *  · zbierka dobehla prirodzene (cieľ, termín) → podľa toho, čo si firma
 *    zvolila pri zapečatení (nechať zbierke / vrátiť).
 */
export function vysporiadaj(entita: string, id: string, predcasne = true, referencia?: string) {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d || d.stav !== "pozastavene" || d.vysporiadane) return;
  const kam: "zbierke" | "firme" = predcasne ? "firme" : d.zvysok;
  zmen(entita, id, { vysporiadane: { suma: zostatok(d), kam, kedy: Date.now(), referencia } });
}

/** ukončiť sa dá až po vysporiadaní zvyšku — inak by charita držala cudzie peniaze */
export function ukonci(entita: string, id: string): boolean {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d) return false;
  if (d.stav !== "pozastavene" || !d.vysporiadane) return false;
  zmen(entita, id, { stav: "ukoncene", ukoncene: Date.now() });
  return true;
}

/** zapíše dorovnanie k jednému daru — vracia, koľko firma pridala */
export function zapisDar(entita: string, id: string, dar: number, teraz = Date.now()): number {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d) return 0;
  const pridane = dorovnanieKDaru(d, dar, teraz);
  if (pridane <= 0) return 0;
  const zaznamy = [...d.zaznamy, { id: `zd-${teraz}`, dar, dorovnane: pridane, kedy: teraz }];
  const minute = zaznamy.reduce((s, z) => s + z.dorovnane, 0) >= d.strop;
  zmen(entita, id, { zaznamy, ...(minute ? { stav: "vycerpane" as StavDorovnania, ukoncene: teraz } : {}) });
  return pridane;
}

/** čo firma pridáva — slovom, nech to netreba lúštiť */
export const popisPomeru = (pomer: number) =>
  pomer === 0.5 ? "polovicu daru"
  : pomer === 1 ? "rovnakú sumu"
  : pomer === 2 ? "dvojnásobok"
  : pomer === 5 ? "päťnásobok"
  : `${pomer}-násobok`;

/** názov voľby vo formulári firmy */
export const nazovPomeru = (pomer: number) =>
  pomer === 0.5 ? "Polovica daru"
  : pomer === 1 ? "Rovnaký dar"
  : pomer === 2 ? "Dvojnásobný dar"
  : pomer === 5 ? "Päťnásobný dar"
  : `${pomer}× dar`;

/** koľko bude mať príjemca z daru 20 € — príklad pod voľbu */
export const priklad = (pomer: number, dar = 20) => dar + dar * pomer;
