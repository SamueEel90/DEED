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
import { rovnakaFirma, firma as uctFirmy, UCTY_FIRIEM } from "./firma";
import { somZamestnanec, menoDarcu } from "./zamestnanci";
import { mojeCisloUctu } from "./identita";

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
  | "zapecatene"      // uhradené a zapečatené, čaká na potvrdenie charity (cez DEED najviac 48 h, mimo DEED kým nepotvrdí)
  | "potvrdene"       // KARTA 49: charita potvrdila, že peniaze prišli — čaká, kým dorovnanie spustí
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
  /** kto dar dal — kvôli firemnému prehľadu „naši ľudia v tejto zbierke".
   *  Píše sa len meno prihláseného darcu; staré záznamy ho nemajú. */
  darca?: string;
  /** Zadanie 1 · Blok 1: číslo účtu darcu (U-…) — kľúč; `darca` je len meno na zobrazenie */
  darcaUcet?: string;
}

export interface Dorovnanie {
  id: string;
  /** kľúč subjektu, ktorému zbierka patrí — „charita", „fara:12"… */
  entita: string;
  /** čoho sa drží: konkrétna zbierka / sektor / celá organizácia */
  ciel: string;
  cielNazov: string;
  /** Zadanie 1 · Blok 1: kľúč firmy = číslo jej účtu (U-…, lib/firma), NIKDY názov */
  firmaUcet: string;
  /** názov firmy len na zobrazenie */
  firma: string;
  firmaProfil?: string;
  firmaLogo?: string;
  /** × k daru: 1 = dorovná rovnakú sumu (×2 pre príjemcu) */
  pomer: number;
  /** koľko firma vyčlenila celkom (predplatené) */
  strop: number;
  /** najviac k jednému daru (karta 11: 50–300 €, nikdy viac ako 300 €) — staré záznamy ho nemajú */
  stropDaru?: number;
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
  /** TVORCOVSKÉ DOROVNANIE — dorovnávajú sa LEN dary, ktoré prišli cez QR
   *  (split) tohto tvorcu. Firma tým platí za dosah konkrétneho človeka,
   *  ale peniaze idú zbierke, nie jemu: netreba reklamnú zmluvu a tvorca
   *  sa peňazí nedotkne. Hodnota je splitId / id tvorcu. */
  lenTvorca?: string;
  /** meno tvorcu do textov (firma sa oháňa jeho menom, nech je vidieť čím) */
  tvorcaNazov?: string;
  /** Právo veta tvorcu. Firma používa jeho meno, takže sa ho musí spýtať —
   *  rovnako, ako sa charita potvrdzuje príjem peňazí. Kým nepovie áno,
   *  dorovnanie NEBEŽÍ, nech je zaplatené akokoľvek. */
  suhlasTvorcu?: "caka" | "prijate" | "odmietnute";
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
  // ---- KARTA 49 · pohľad charity ----
  /** ako firma platila: cez DEED (platbu vidíme → po 48 h sa spustí samo) alebo prevod mimo DEED (nikdy samo) */
  uhrada?: "deed" | "mimo";
  /** kedy firma oznámila platbu / kedy sme ju spárovali (od toho beží 24 h na odmietnutie a 48 h automat) */
  oznamene?: number;
  /** charita odmietla — dôvod vidí len DEED, firma nie */
  odmietnutie?: { dovod: string; kedy: number };
  /** charita ťukla „Neprišli" — firma dostala správu, pri platbe cez DEED ju preverí DEED+ */
  neprisli?: number;
  /** vrátenie zvyšku firme = vlastný doklad D- typu „vratenie"; VS = číslo tohto dokladu, nikdy číslo zbierky */
  vratenie?: VratenieZvysku;
  /** charita dala firme vedieť, že sa rozpočet míňa */
  upozornenaFirma?: number;
}
export interface VratenieZvysku { suma: number; do: number; vs: string; cez?: "deed" | "mimo"; doklad?: string; kedy?: number }

const KLUC = (entita: string) => `deed.dorovnania.${entita}`;
let verzia = 0;
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
export function useZmenyDorovnani(): number { return useSyncExternalStore(subscribe, () => verzia); }

export function nacitajDorovnania(entita: string): Dorovnanie[] {
  let v: Dorovnanie[];
  try { v = JSON.parse(localStorage.getItem(KLUC(entita)) ?? "[]") as Dorovnanie[]; } catch { return []; }
  // staré záznamy viazané na názov firmy (pred Blokom 1) sa nečítajú
  v = v.filter((d) => !!d.firmaUcet);
  // tichý súhlas: čo čaká na potvrdenie dlhšie než 48 h, nabehne samo
  const teraz = Date.now();
  // KARTA 49: samo sa spustí len platba cez DEED (vidíme ju); prevod mimo DEED nikdy
  const po = v.map((d) => (d.stav === "zapecatene" && d.uhrada !== "mimo" && teraz >= (d.oznamene ?? d.zapecatene) + AUTOMAT_MS
    ? { ...d, stav: "aktivne" as StavDorovnania, zaplatene: (d.oznamene ?? d.zapecatene) + AUTOMAT_MS, automaticky: true }
    : d));
  if (po.some((d, i) => d !== v[i])) {
    try { localStorage.setItem(KLUC(entita), JSON.stringify(po)); } catch { /* LS nedostupné */ }
  }
  return po;
}

/** kedy najneskôr nabehne (SEPA, tichý súhlas) — null, ak už beží alebo je po ňom */
export const automatOd = (d: Dorovnanie) =>
  d.stav === "zapecatene" && d.uhrada !== "mimo" ? (d.oznamene ?? d.zapecatene) + AUTOMAT_MS : null;

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
export function dorovnanieKDaru(d: Dorovnanie, dar: number, teraz = Date.now(), cezTvorcu?: string): number {
  if (!bezi(d, teraz) || dar <= 0) return 0;
  if (d.lenZamestnanci && !somZamestnanec(d.firmaUcet)) return 0;
  // dar, ktorý neprišiel cez QR toho tvorcu, sa nedorovnáva — to je celý zmysel
  if (d.lenTvorca && d.lenTvorca !== cezTvorcu) return 0;
  return Math.min(Math.round(dar * d.pomer * 100) / 100, d.stropDaru ?? Infinity, zostatok(d));
}

/** platí toto dorovnanie pre práve prihláseného darcu? (texty, bežec, prepočet)
 *  Pri tvorcovskom sa pýtame aj na to, či darca prišiel cez toho tvorcu. */
export const platiPreMna = (d: Dorovnanie, cezTvorcu?: string): boolean =>
  (!d.lenZamestnanci || somZamestnanec(d.firmaUcet))
  && (!d.lenTvorca || d.lenTvorca === cezTvorcu);

export const bezi = (d: Dorovnanie, teraz = Date.now()) =>
  d.stav === "aktivne" && teraz >= d.od && teraz <= d.do && zostatok(d) > 0
  // tvorcovské dorovnanie potrebuje jeho súhlas — firma si jeho meno nevezme sama
  && (!d.lenTvorca || d.suhlasTvorcu === "prijate");

/** tvorca povie áno — až tým sa jeho dorovnanie rozbehne */
export const prijmiTvorcom = (entita: string, id: string) =>
  zmen(entita, id, { suhlasTvorcu: "prijate" });
/** tvorca povie nie — firma sa jeho menom oháňať nebude */
export const odmietniTvorcom = (entita: string, id: string) =>
  zmen(entita, id, { suhlasTvorcu: "odmietnute", stav: "odmietnute", ukoncene: Date.now() });

/** dorovnanie, ktoré práve beží na danom cieli (zbierka/sektor/organizácia) */
export function beziaceDorovnanie(entita: string, ciel: string, teraz = Date.now()): Dorovnanie | null {
  return nacitajDorovnania(entita).find((d) => d.ciel === ciel && bezi(d, teraz)) ?? null;
}

/** VŠETKY bežiace dorovnania na tomto cieli — na jednej zbierke môže naraz
 *  bežať verejné aj tvorcovské, každé má vlastný strop a vlastné peniaze. */
export function beziaceDorovnaniaNaCiel(ciel: string, teraz = Date.now()): Array<Dorovnanie & { entita: string }> {
  return vsetkyEntity().flatMap((e) =>
    nacitajDorovnania(e).filter((x) => x.ciel === ciel && bezi(x, teraz)).map((d) => ({ ...d, entita: d.entita ?? e })));
}

/** Ktoré dorovnanie platí pre TENTO dar. Tvorcovské má prednosť: firma zaň
 *  zaplatila práve za to, že dar prišiel cez toho tvorcu. Až keď také nie je
 *  (alebo dar prišiel inou cestou), berie sa verejné. */
export function dorovnanieNaDar(ciel: string, cezTvorcu?: string, teraz = Date.now()): (Dorovnanie & { entita: string }) | null {
  const vsetky = beziaceDorovnaniaNaCiel(ciel, teraz);
  const tvorcove = cezTvorcu ? vsetky.find((d) => d.lenTvorca === cezTvorcu) : undefined;
  return tvorcove ?? vsetky.find((d) => !d.lenTvorca) ?? null;
}

/** dorovnanie bežiace na tomto cieli — nech dar príde z ktorejkoľvek obrazovky. */
export function beziaceDorovnanieNaCiel(ciel: string, teraz = Date.now()): (Dorovnanie & { entita: string }) | null {
  return dorovnanieNaDar(ciel, undefined, teraz);
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
export function dorovnaniaFirmy(firma: string /* číslo účtu firmy */): Dorovnanie[] {
  return vsetkyEntity()
    .flatMap((e) => nacitajDorovnania(e))
    .filter((d) => rovnakaFirma(d.firmaUcet, firma))
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
export function zapecat(n: Omit<Dorovnanie, "id" | "stav" | "zapecatene" | "zaznamy" | "oznamene">): Dorovnanie {
  const teraz = Date.now();
  // KARTA 49: príjem potvrdzuje charita VŽDY — aj pri karte. Platba cez DEED sa po 48 h spustí sama.
  const novy: Dorovnanie = {
    ...n, id: `dv-${teraz}-${Math.random().toString(36).slice(2, 6)}`, zaznamy: [], zapecatene: teraz,
    stav: "zapecatene", uhrada: n.uhrada ?? "deed", oznamene: teraz,
    // tvorcovské sa pýta tvorcu — peniaze môžu byť zaplatené, ale beh čaká na neho
    ...(n.lenTvorca ? { suhlasTvorcu: "caka" as const } : {}),
  };
  uloz(n.entita, [novy, ...nacitajDorovnania(n.entita)]);
  return novy;
}
function zmen(entita: string, id: string, patch: Partial<Dorovnanie>) {
  uloz(entita, nacitajDorovnania(entita).map((d) => (d.id === id ? { ...d, ...patch } : d)));
}
/** charita potvrdila, že peniaze prišli na jej účet → čaká na „Spustiť dorovnanie" */
export const potvrdPlatbu = (entita: string, id: string) =>
  zmen(entita, id, { stav: "potvrdene", zaplatene: Date.now() });
/** KARTA 49: Spustiť dorovnanie — beží hneď */
export const spustiDorovnanie = (entita: string, id: string) => zmen(entita, id, { stav: "aktivne" });
/** len kým firma nezaplatila */
export const odmietni = (entita: string, id: string) => zmen(entita, id, { stav: "odmietnute", ukoncene: Date.now() });
export const zrus = (entita: string, id: string) => zmen(entita, id, { stav: "zrusene", ukoncene: Date.now() });

/** Doliatie stropu — jediná zmena, ktorú firma smie urobiť na bežiacom
 *  dorovnaní. Pridáva sa navrch (peniaze idú na účet charity ako pri zapečatení),
 *  takže nikomu nič neberie: darcom už dorovnané ostáva a ďalší dostanú viac.
 *  Znížiť strop ani dorovnanie zrušiť sa nedá — to vie len charita, a to
 *  vrátením zvyšku. Vyčerpané dorovnanie sa doliatím znova rozbehne. */
export function dolejStrop(entita: string, id: string, suma: number): boolean {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d || suma <= 0) return false;
  if (d.stav !== "aktivne" && d.stav !== "zapecatene" && d.stav !== "vycerpane") return false;
  const obnovit = d.stav === "vycerpane";
  zmen(entita, id, {
    strop: Math.round((d.strop + suma) * 100) / 100,
    ...(obnovit ? { stav: "aktivne" as StavDorovnania, ukoncene: undefined } : {}),
  });
  return true;
}

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
export function zapisDar(entita: string, id: string, dar: number, teraz = Date.now(), cezTvorcu?: string): number {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d) return 0;
  const pridane = dorovnanieKDaru(d, dar, teraz, cezTvorcu);
  if (pridane <= 0) return 0;
  const darca = menoDarcu().trim(), darcaUcet = mojeCisloUctu();
  const zaznamy = [...d.zaznamy, { id: `zd-${teraz}`, dar, dorovnane: pridane, kedy: teraz, ...(darca ? { darca } : {}), ...(darcaUcet ? { darcaUcet } : {}) }];
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


// ============================================================
// KARTA 49 · Správa charity → Dorovnanie daru
// ============================================================
/** okno na odmietnutie: 24 h od oznámenia platby */
export const ODMIETNUT_MS = 24 * 3600 * 1000;
const VRATIT_DNI = 7;
export type StavCharity = "cakaMimo" | "cakaDeed" | "potvrdene" | "vratit" | "bezi" | "minute" | "kon" | "odm";
export function stavCharity(d: Dorovnanie): StavCharity {
  if (d.stav === "zapecatene") return d.uhrada === "mimo" ? "cakaMimo" : "cakaDeed";
  if (d.stav === "potvrdene") return "potvrdene";
  if (d.stav === "pozastavene") return d.vratenie && !d.vratenie.kedy ? "vratit" : "kon";
  if (d.stav === "aktivne") return "bezi";
  if (d.stav === "vycerpane") return "minute";
  if (d.stav === "odmietnute" || d.stav === "zrusene") return "odm";
  return "kon";
}
/** ešte sa dá odmietnuť? (do 24 h od oznámenia platby) */
export const daSaOdmietnut = (d: Dorovnanie, teraz = Date.now()) => teraz - (d.oznamene ?? d.zapecatene) < ODMIETNUT_MS;
export const hodinDoKoncaOdmietnutia = (d: Dorovnanie, teraz = Date.now()) => Math.max(1, Math.ceil(((d.oznamene ?? d.zapecatene) + ODMIETNUT_MS - teraz) / 3600000));
/** VS vratného dokladu (D- rada dokladov, 9 + Luhn) — TESTOVACIE odvodené z id, číslo dá server */
function vsVratenia(id: string): string {
  let h = 2166136261; const k = `vratenie:${id}`;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const n = String(200000000 + (h % 100000000));
  let sum = 0;
  for (let i = 0; i < 9; i++) { let c = n.charCodeAt(8 - i) - 48; if (i % 2 === 0) { c *= 2; if (c > 9) c -= 9; } sum += c; }
  return n + ((10 - (sum % 10)) % 10);
}
const noveVratenie = (d: Dorovnanie, suma: number): VratenieZvysku => ({ suma: Math.round(suma * 100) / 100, do: Date.now() + VRATIT_DNI * 86400000, vs: vsVratenia(d.id) });
/** odmietnutie (len do 24 h) — dôvod povinný, vidí ho len DEED; firme sa vráti celá suma */
export function odmietniDorovnanie(entita: string, id: string, dovod: string): boolean {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d || !dovod.trim() || !daSaOdmietnut(d)) return false;
  zmen(entita, id, { stav: "pozastavene", pozastavene: Date.now(), odmietnutie: { dovod: dovod.trim(), kedy: Date.now() }, vratenie: noveVratenie(d, d.strop) });
  return true;
}
/** „Neprišli" (len po 24 h) — firma dostane správu; pri platbe cez DEED ju preverí DEED+ */
export function peniazeNeprisli(entita: string, id: string): boolean {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d || daSaOdmietnut(d)) return false;
  zmen(entita, id, { stav: "odmietnute", neprisli: Date.now(), ukoncene: Date.now() });
  return true;
}
/** Ukončiť zbierku a dorovnanie — predčasne, firme sa vráti celý nevyčerpaný zvyšok */
export function ukonciDorovnanie(entita: string, id: string) {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d) return;
  const z = zostatok(d);
  if (z <= 0) { zmen(entita, id, { stav: "ukoncene", ukoncene: Date.now() }); return; }
  zmen(entita, id, { stav: "pozastavene", pozastavene: Date.now(), vratenie: noveVratenie(d, z) });
}
/** zvyšok vrátený (cez DEED podržaním, alebo mimo DEED s dokladom o úhrade) → prípad sa uzavrie */
export function vratZvysok(entita: string, id: string, cez: "deed" | "mimo", doklad?: string): boolean {
  const d = nacitajDorovnania(entita).find((x) => x.id === id);
  if (!d?.vratenie || (cez === "mimo" && !doklad)) return false;
  const kedy = Date.now();
  zmen(entita, id, { vratenie: { ...d.vratenie, cez, doklad, kedy }, vysporiadane: { suma: d.vratenie.suma, kam: "firme", kedy, referencia: d.vratenie.vs },
    stav: d.odmietnutie ? "odmietnute" : "ukoncene", ukoncene: kedy });
  return true;
}
export const upozorniFirmu = (entita: string, id: string) => zmen(entita, id, { upozornenaFirma: Date.now() });

// ---- od koho charita prijíma dorovnanie (obmedzené firmy dorovnanie vôbec neuvidia; firma nevie, že je obmedzená) ----
/** číselník odvetví, ktoré sa dajú obmedziť (config) */
export const ODVETVIA_OBMEDZENIA = ["Kasína a herne", "Stávkové kancelárie", "Obsah pre dospelých"];
/** firmy = čísla účtov firiem (nie názvy) */
export interface ObmedzenieDorovnania { zapnute: boolean; odvetvia: string[]; firmy: string[] }
const obmedzenia = new Map<string, ObmedzenieDorovnania>();
export const obmedzenieDorovnania = (entita: string): ObmedzenieDorovnania => obmedzenia.get(entita) ?? { zapnute: false, odvetvia: [...ODVETVIA_OBMEDZENIA], firmy: [] };
export function ulozObmedzenie(entita: string, o: ObmedzenieDorovnania) { obmedzenia.set(entita, o); verzia++; posluchaci.forEach((f) => f()); }
/** register firiem DEED (TESTOVACÍ výrez; odvetvie z registrácie firmy) — účty firiem z lib/firma */
export const REGISTER_FIRIEM: { ucet: string; nazov: string; odvetvie: string; mesto: string }[] = ["firma-herna", "firma-stavky", "firma-kaviaren", "firma-autoservis", "firma-elektro", "firma-stavebniny", "firma-pekaren"]
  .map((id) => UCTY_FIRIEM.find((f) => f.id === id)!)
  .map((f) => ({ ucet: uctFirmy(f.id), nazov: f.nazov, odvetvie: f.odvetvie ?? "", mesto: f.mesto ?? "" }));
/** smie táto firma dorovnávať zbierky tejto charity? (ponuka sa obmedzenej firme neukáže) */
export function smieDorovnat(entita: string, firma: string /* číslo účtu firmy */): boolean {
  const o = obmedzenieDorovnania(entita);
  if (!o.zapnute) return true;
  if (o.firmy.some((f) => rovnakaFirma(f, firma))) return false;
  const odv = REGISTER_FIRIEM.find((f) => rovnakaFirma(f.ucet, firma))?.odvetvie;
  return !(odv && o.odvetvia.includes(odv));
}

/** TESTOVACIE: dorovnania 1 : 1 podľa prototypu „Sprava charity - Dorovnanie daru" (len keď entita nemá žiadne) */
export function naplnTestovacieDorovnania(entita: string, ciele: { strecha: string; vozik: string; ovocie: string; skolske: string; seniori: string; deti: string }) {
  if (nacitajDorovnania(entita).length) return;
  const H = 3600000, D = 24 * H, t = Date.now(), dt = (s: string) => Date.parse(s);
  /** n dorovnaných darov rovnomerne od „od" po „po"; dorovnané spolu presne „sum" (pomerne k darom) */
  const zazn = (n: number, sum: number, _pomer: number, od: number, mena: string[], po = t): ZaznamDorovnania[] => {
    const dary = Array.from({ length: n }, (_, i) => [20, 50, 25, 10, 40, 20][i % 6]);
    const spolu = dary.reduce((x, y) => x + y, 0); let zost = sum;
    return dary.map((dar, i) => {
      const k = i === n - 1 ? zost : Math.round(sum * dar / spolu * 100) / 100; zost = Math.round((zost - k) * 100) / 100;
      return { id: `zt-${od}-${i}`, dar, dorovnane: k, kedy: od + (i + 1) * ((po - od) / (n + 1)), darca: mena[i % mena.length] };
    });
  };
  const zakl = { entita, firmaLogo: undefined, stropDaru: 0, lenZamestnanci: false, zvysok: "zbierke" as const, kanal: "karta" as KanalDorovnania };
  const L: Dorovnanie[] = [
    { ...zakl, id: "dv-t-g", ciel: ciele.seniori, cielNazov: "Sektor Seniori", firmaUcet: uctFirmy("firma-elektro"), firma: "Elektro Mráz s.r.o.", pomer: 1, strop: 1500, stropDaru: 100, od: t, do: dt("2026-12-31T22:00:00Z"), kanal: "sepa", uhrada: "mimo", stav: "zapecatene", zapecatene: t - 6 * H, oznamene: t - 6 * H, zaznamy: [] },
    { ...zakl, id: "dv-t-c", ciel: ciele.vozik, cielNazov: "Invalidný vozík pre Ninu", firmaUcet: uctFirmy("firma-autoservis"), firma: "Autoservis Kováč s.r.o.", pomer: 1, strop: 2000, stropDaru: 200, od: t, do: dt("2026-11-30T22:00:00Z"), kanal: "sepa", uhrada: "deed", stav: "zapecatene", zapecatene: t - 4 * H, oznamene: t - 4 * H, zaznamy: [] },
    { ...zakl, id: "dv-t-e", ciel: ciele.ovocie, cielNazov: "Ovocie do výdajne", firmaUcet: uctFirmy("firma-kaviaren"), firma: "Kaviareň Pod Hradom", pomer: 0.5, strop: 300, stropDaru: 50, od: dt("2026-09-01T08:00:00Z"), do: dt("2026-09-22T20:00:00Z"), zvysok: "firme", uhrada: "deed", stav: "pozastavene", zapecatene: dt("2026-09-01T08:00:00Z"), zaplatene: dt("2026-09-01T09:00:00Z"), pozastavene: dt("2026-09-22T20:00:00Z"),
      zaznamy: zazn(27, 210, 0.5, dt("2026-09-01T08:00:00Z"), ["Lucia S.", "Anonymný darca"], dt("2026-09-21T18:00:00Z")), vratenie: { suma: 90, do: dt("2026-10-06T20:00:00Z"), vs: vsVratenia("dv-t-e") } },
    { ...zakl, id: "dv-t-a", ciel: ciele.strecha, cielNazov: "Strecha pre rodinu Horváthovú", firmaUcet: uctFirmy("firma-pekaren"), firma: "Pekáreň Dobrota s.r.o.", pomer: 1, strop: 1000, stropDaru: 300, od: dt("2026-10-02T08:00:00Z"), do: dt("2026-10-27T21:00:00Z"), uhrada: "deed", stav: "aktivne", zapecatene: dt("2026-10-02T08:00:00Z"), zaplatene: dt("2026-10-02T09:00:00Z"),
      zaznamy: zazn(41, 820, 1, dt("2026-10-02T08:00:00Z"), ["Anonymný darca", "Zuzana H.", "Jana K."]) },
    { ...zakl, id: "dv-t-b", ciel: ciele.deti, cielNazov: "Sektor Deti", firmaUcet: uctFirmy("firma-stavebniny"), firma: "Stavebniny Opatová s.r.o.", pomer: 0.5, strop: 500, stropDaru: 100, od: dt("2026-09-18T08:00:00Z"), do: dt("2026-12-31T22:00:00Z"), zvysok: "firme", lenZamestnanci: true, kanal: "sepa", uhrada: "deed", stav: "aktivne", zapecatene: dt("2026-09-18T08:00:00Z"), zaplatene: dt("2026-09-18T09:00:00Z"),
      zaznamy: zazn(14, 140, 0.5, dt("2026-09-18T08:00:00Z"), ["Eva R.", "Peter M."]) },
    { ...zakl, id: "dv-t-d", ciel: ciele.skolske, cielNazov: "Školské potreby", firmaUcet: uctFirmy("firma-pekaren"), firma: "Pekáreň Dobrota s.r.o.", pomer: 1, strop: 600, stropDaru: 50, od: dt("2026-08-01T08:00:00Z"), do: dt("2026-08-25T20:00:00Z"), uhrada: "deed", stav: "vycerpane", zapecatene: dt("2026-08-01T08:00:00Z"), zaplatene: dt("2026-08-01T09:00:00Z"), ukoncene: dt("2026-08-19T12:00:00Z"),
      zaznamy: zazn(48, 600, 1, dt("2026-08-01T08:00:00Z"), ["Anonymný darca", "Mária V."], dt("2026-08-19T11:00:00Z")) },
  ];
  void D;
  uloz(entita, L);
}
