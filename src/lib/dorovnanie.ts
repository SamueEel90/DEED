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
//
// Zadanie 3 · 3.3 (Martin 6. 10.): stavový automat žije VÝHRADNE v DB (migrácia 0046, nad escrow
// z ledgera). Appka drží len kópiu toho, čo vráti server (rpc dorovnania_nacitaj), a posiela kroky
// (dorovnanie_zapecat / dorovnanie_krok / dorovnanie_dar). localStorage verzia je zrušená.
// Bez databázy (mock) sa len prehrajú statické ukážkové dáta — nič sa nerozhoduje, kroky nejdú.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { rovnakaFirma, firma as uctFirmy, UCTY_FIRIEM } from "./firma";
import { somZamestnanec, menoDarcu } from "./zamestnanci";
import { supabase } from "./supabase";
import { toast } from "@/components/toast";

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
  /** stránka v DB, ktorej účet dostáva dorovnanie (server ju určí podľa cieľa) */
  stranka?: string;
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

// ---- kópia stavu zo servera ----
let verzia = 0;
let kopia: Dorovnanie[] = [];
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };
const emit = () => { verzia++; posluchaci.forEach((f) => f()); };
let nacitane = false;
/** prekreslenie pri zmene; prvé použitie si stav vypýta zo servera */
export function useZmenyDorovnani(): number {
  const v = useSyncExternalStore(subscribe, () => verzia, () => 0);
  useEffect(() => { if (!nacitane) void obnovDorovnania(); }, []);
  return v;
}

const ms = (t: unknown): number | undefined => (typeof t === "string" ? Date.parse(t) : typeof t === "number" ? t : undefined);
type Surove = Record<string, unknown> & { zaznamy?: Record<string, unknown>[] };
/** riadok zo servera → tvar appky (časy v ms) */
function zoServera(r: Surove): Dorovnanie {
  const j = <T,>(x: unknown) => (x ?? undefined) as T | undefined;
  const vys = j<{ suma: number; kam: "zbierke" | "firme"; kedy: string; referencia?: string }>(r.vysporiadane);
  const odm = j<{ dovod: string; kedy: string }>(r.odmietnutie);
  const vr = j<{ suma: number; do: string; vs: string; cez?: "deed" | "mimo"; doklad?: string; kedy?: string }>(r.vratenie);
  return {
    id: String(r.id), entita: String(r.entita), stranka: j<string>(r.stranka), ciel: String(r.ciel), cielNazov: String(r.cielNazov),
    firmaUcet: String(r.firmaUcet), firma: String(r.firma), firmaLogo: j<string>(r.firmaLogo),
    pomer: Number(r.pomer), strop: Number(r.strop), stropDaru: r.stropDaru == null ? undefined : Number(r.stropDaru),
    od: ms(r.od) ?? 0, do: ms(r.do) ?? 0, doVycerpania: !!r.doVycerpania, zvysok: r.zvysok === "firme" ? "firme" : "zbierke",
    stav: r.stav as StavDorovnania, lenZamestnanci: !!r.lenZamestnanci, lenTvorca: j<string>(r.lenTvorca), tvorcaNazov: j<string>(r.tvorcaNazov),
    suhlasTvorcu: j<Dorovnanie["suhlasTvorcu"]>(r.suhlasTvorcu), kanal: j<KanalDorovnania>(r.kanal), uhrada: j<"deed" | "mimo">(r.uhrada),
    automaticky: !!r.automaticky, zapecatene: ms(r.zapecatene) ?? 0, oznamene: ms(r.oznamene), zaplatene: ms(r.zaplatene),
    ukoncene: ms(r.ukoncene), pozastavene: ms(r.pozastavene), neprisli: ms(r.neprisli), upozornenaFirma: ms(r.upozornenaFirma),
    vysporiadane: vys ? { ...vys, suma: Number(vys.suma), kedy: ms(vys.kedy) ?? 0 } : undefined,
    odmietnutie: odm ? { dovod: odm.dovod, kedy: ms(odm.kedy) ?? 0 } : undefined,
    vratenie: vr ? { ...vr, suma: Number(vr.suma), do: ms(vr.do) ?? 0, kedy: ms(vr.kedy) } : undefined,
    zaznamy: (r.zaznamy ?? []).map((z) => ({ id: String(z.id), dar: Number(z.dar), dorovnane: Number(z.dorovnane), kedy: ms(z.kedy) ?? 0,
      darca: j<string>(z.darca), darcaUcet: j<string>(z.darcaUcet) })),
  };
}

/** načíta dorovnania zo servera (server pri tom spraví aj 48 h tichý súhlas) */
export async function obnovDorovnania(): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.rpc("dorovnania_nacitaj");
  if (error) return;
  nacitane = true;
  kopia = ((data ?? []) as Surove[]).map(zoServera);
  emit();
}

export function nacitajDorovnania(entita: string): Dorovnanie[] {
  return kopia.filter((d) => d.entita === entita);
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

// ---- výpočet na ZOBRAZENIE (koľko firma pridá, rozhoduje server pri dare) ----
export const vycerpane = (d: Dorovnanie) => d.zaznamy.reduce((s, z) => s + z.dorovnane, 0);
export const zostatok = (d: Dorovnanie) => Math.max(0, d.strop - vycerpane(d));

/** koľko firma pridá k tomuto daru — len náhľad pre text pri platbe; skutočnú sumu určí server */
export function dorovnanieKDaru(d: Dorovnanie, dar: number, teraz = Date.now(), cezTvorcu?: string): number {
  if (!bezi(d, teraz) || dar <= 0) return 0;
  if (d.lenZamestnanci && !somZamestnanec(d.firmaUcet)) return 0;
  if (d.lenTvorca && d.lenTvorca !== cezTvorcu) return 0;
  return Math.min(Math.round(dar * d.pomer * 100) / 100, d.stropDaru ?? Infinity, zostatok(d));
}

/** platí toto dorovnanie pre práve prihláseného darcu? (texty, bežec, prepočet) */
export const platiPreMna = (d: Dorovnanie, cezTvorcu?: string): boolean =>
  (!d.lenZamestnanci || somZamestnanec(d.firmaUcet))
  && (!d.lenTvorca || d.lenTvorca === cezTvorcu);

export const bezi = (d: Dorovnanie, teraz = Date.now()) =>
  d.stav === "aktivne" && teraz >= d.od && teraz <= d.do && zostatok(d) > 0
  && (!d.lenTvorca || d.suhlasTvorcu === "prijate");

/** dorovnanie, ktoré práve beží na danom cieli (zbierka/sektor/organizácia) */
export function beziaceDorovnanie(entita: string, ciel: string, teraz = Date.now()): Dorovnanie | null {
  return nacitajDorovnania(entita).find((d) => d.ciel === ciel && bezi(d, teraz)) ?? null;
}

/** VŠETKY bežiace dorovnania na tomto cieli (verejné aj tvorcovské) */
export function beziaceDorovnaniaNaCiel(ciel: string, teraz = Date.now()): Dorovnanie[] {
  return kopia.filter((x) => x.ciel === ciel && bezi(x, teraz));
}

/** ktoré dorovnanie platí pre TENTO dar — tvorcovské má prednosť (rovnaké pravidlo ako server) */
export function dorovnanieNaDar(ciel: string, cezTvorcu?: string, teraz = Date.now()): Dorovnanie | null {
  const vsetky = beziaceDorovnaniaNaCiel(ciel, teraz);
  const tvorcove = cezTvorcu ? vsetky.find((d) => d.lenTvorca === cezTvorcu) : undefined;
  return tvorcove ?? vsetky.find((d) => !d.lenTvorca) ?? null;
}

/** dorovnanie bežiace na tomto cieli — nech dar príde z ktorejkoľvek obrazovky */
export function beziaceDorovnanieNaCiel(ciel: string, teraz = Date.now()): Dorovnanie | null {
  return dorovnanieNaDar(ciel, undefined, teraz);
}

/** zmazať (skryť) sa dá len to, čo je už uzavreté — bežiace a zaplatené drží peniaze */
export const daSaZmazat = (d: Dorovnanie) =>
  d.stav === "ukoncene" || d.stav === "odmietnute" || d.stav === "zrusene"
  || (d.stav === "vycerpane" && !!d.ukoncene);

/** dorovnania jednej firmy naprieč charitami — pohľad z jej vlastnej správy */
export function dorovnaniaFirmy(firma: string /* číslo účtu firmy */): Dorovnanie[] {
  return kopia.filter((d) => rovnakaFirma(d.firmaUcet, firma)).sort((a, b) => b.zapecatene - a.zapecatene);
}
export function useDorovnaniaFirmy(firma: string): Dorovnanie[] {
  useZmenyDorovnani();
  return dorovnaniaFirmy(firma);
}
export function useDorovnania(entita: string): Dorovnanie[] {
  useZmenyDorovnani();
  return [...nacitajDorovnania(entita)].sort((a, b) => b.zapecatene - a.zapecatene);
}

// ---- kroky: rozhoduje server, appka len pošle a prevezme nový stav ----
const BEZ_DB = "Dorovnanie drží server — bez databázy sa v ukážke nedá.";
function prevezmi(r: unknown) {
  const d = zoServera(r as Surove);
  kopia = kopia.some((x) => x.id === d.id) ? kopia.map((x) => (x.id === d.id ? d : x)) : [d, ...kopia];
  emit();
}
type Akcia = "potvrd_platbu" | "spusti" | "odmietni" | "neprisli" | "zrus" | "dolej_strop" | "pozastav" | "vysporiadaj" | "ukonci"
  | "ukonci_dorovnanie" | "vrat_zvysok" | "upozorni_firmu" | "prijmi_tvorcom" | "odmietni_tvorcom" | "zmaz";
/** jeden krok na serveri; true = prešiel. Chybu (hlášku servera) ukáže sám. */
async function krok(id: string, akcia: Akcia, param: Record<string, unknown> = {}): Promise<boolean> {
  if (!supabase) { toast(BEZ_DB); return false; }
  const { data, error } = await supabase.rpc("dorovnanie_krok", { p_id: id, p_akcia: akcia, p_param: param });
  if (error) { toast(error.message); return false; }
  prevezmi(data);
  return true;
}

/** firma nastavila a zapečatila — parametre sa už nedajú zmeniť. Cieľ musí v DEED existovať;
 *  ukážková zbierka testovacej stránky sa najprv zaregistruje ako testovací cieľ (server pustí len testovaciu stránku). */
export async function zapecat(n: Omit<Dorovnanie, "id" | "stav" | "zapecatene" | "zaznamy" | "oznamene">): Promise<Dorovnanie | null> {
  if (!supabase) { toast(BEZ_DB); return null; }
  const stranka = n.stranka ?? strankaEntity(n.entita);
  if (stranka) await supabase.rpc("dorovnanie_ciel_pridaj", { p_ciel: n.ciel, p_stranka: stranka, p_nazov: n.cielNazov });
  const { data, error } = await supabase.rpc("dorovnanie_zapecat", { p: { ...n, od: n.od, do: n.do } });
  if (error) { toast(error.message); return null; }
  prevezmi(data);
  return zoServera(data as Surove);
}
/** tvorca povie áno / nie */
export const prijmiTvorcom = (_entita: string, id: string) => krok(id, "prijmi_tvorcom");
export const odmietniTvorcom = (_entita: string, id: string) => krok(id, "odmietni_tvorcom");
/** charita potvrdila, že peniaze prišli → čaká na „Spustiť dorovnanie" */
export const potvrdPlatbu = (_entita: string, id: string) => krok(id, "potvrd_platbu");
/** KARTA 49: Spustiť dorovnanie — beží hneď */
export const spustiDorovnanie = (_entita: string, id: string) => krok(id, "spusti");
/** firma zruší — len kým nezaplatila */
export const zrus = (_entita: string, id: string) => krok(id, "zrus");
/** doliatie stropu — jediná zmena na bežiacom dorovnaní; peniaze idú na viazaný účet */
export const dolejStrop = (_entita: string, id: string, suma: number) => krok(id, "dolej_strop", { suma });
// ---- ukončenie má poradie: pozastaviť → vysporiadať zvyšok → ukončiť ----
export const pozastav = (_entita: string, id: string) => krok(id, "pozastav");
export const vysporiadaj = (_entita: string, id: string, predcasne = true, referencia?: string) => krok(id, "vysporiadaj", { predcasne, referencia });
export const ukonci = (_entita: string, id: string) => krok(id, "ukonci");
export const zmazDorovnanie = (_entita: string, id: string) => krok(id, "zmaz");

/** Dorovnanie k jednému daru — rozhodne a presunie peniaze server (viazané → príjemca).
 *  Vracia, koľko firma naozaj pridala. Bez databázy sa nedorovnáva nič. */
export async function zapisDar(ciel: string, dar: number, cezTvorcu?: string, idem?: string): Promise<{ dorovnane: number; firma?: string; firmaUcet?: string }> {
  if (!supabase || dar <= 0) return { dorovnane: 0 };
  const { data, error } = await supabase.rpc("dorovnanie_dar", { p_ciel: ciel, p_dar: dar, p_cez_tvorcu: cezTvorcu ?? null, p_idem: idem ?? null, p_darca: menoDarcu().trim() || null });
  if (error) return { dorovnane: 0 };
  const r = data as { dorovnane: number; firma?: string; id?: string };
  await obnovDorovnania();
  return { dorovnane: Number(r.dorovnane) || 0, firma: r.firma, firmaUcet: kopia.find((d) => d.id === r.id)?.firmaUcet };
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
/** odmietnutie (len do 24 h) — dôvod povinný, vidí ho len DEED; firme sa vráti celá suma */
export const odmietniDorovnanie = (_entita: string, id: string, dovod: string) => krok(id, "odmietni", { dovod });
/** „Neprišli" (len po 24 h) — firma dostane správu; pri platbe cez DEED ju preverí DEED+ */
export const peniazeNeprisli = (_entita: string, id: string) => krok(id, "neprisli");
/** Ukončiť zbierku a dorovnanie — predčasne, firme sa vráti celý nevyčerpaný zvyšok */
export const ukonciDorovnanie = (_entita: string, id: string) => krok(id, "ukonci_dorovnanie");
/** zvyšok vrátený (cez DEED podržaním, alebo mimo DEED s dokladom o úhrade) → prípad sa uzavrie */
export const vratZvysok = (_entita: string, id: string, cez: "deed" | "mimo", doklad?: string) => krok(id, "vrat_zvysok", { cez, doklad });
export const upozorniFirmu = (_entita: string, id: string) => krok(id, "upozorni_firmu");

// ---- od koho charita prijíma dorovnanie (obmedzené firmy dorovnanie vôbec neuvidia; firma nevie, že je obmedzená) ----
/** číselník odvetví, ktoré sa dajú obmedziť (config) */
export const ODVETVIA_OBMEDZENIA = ["Kasína a herne", "Stávkové kancelárie", "Obsah pre dospelých"];
/** firmy = čísla účtov firiem (nie názvy) */
export interface ObmedzenieDorovnania { zapnute: boolean; odvetvia: string[]; firmy: string[] }
const obmedzenia = new Map<string, ObmedzenieDorovnania>();
const ZAKLAD_OBM = (): ObmedzenieDorovnania => ({ zapnute: false, odvetvia: [...ODVETVIA_OBMEDZENIA], firmy: [] });
/** obmedzenie stránky (kópia zo servera) */
export const obmedzenieDorovnania = (entita: string): ObmedzenieDorovnania => obmedzenia.get(entita) ?? ZAKLAD_OBM();
export async function nacitajObmedzenie(entita: string): Promise<ObmedzenieDorovnania> {
  const st = strankaEntity(entita);
  if (!supabase || !st) return obmedzenieDorovnania(entita);
  const { data, error } = await supabase.rpc("dorovnanie_obmedzenie_citaj", { p_stranka: st });
  if (error || !data) return obmedzenieDorovnania(entita);
  const o = data as ObmedzenieDorovnania;
  obmedzenia.set(entita, { zapnute: !!o.zapnute, odvetvia: o.odvetvia ?? [], firmy: o.firmy ?? [] });
  emit();
  return obmedzenieDorovnania(entita);
}
export async function ulozObmedzenie(entita: string, o: ObmedzenieDorovnania): Promise<boolean> {
  const st = strankaEntity(entita);
  if (!supabase || !st) { toast(BEZ_DB); return false; }
  const { error } = await supabase.rpc("dorovnanie_obmedzenie_uloz", { p_stranka: st, p_zapnute: o.zapnute, p_odvetvia: o.odvetvia, p_firmy: o.firmy });
  if (error) { toast(error.message); return false; }
  obmedzenia.set(entita, o); emit();
  return true;
}
/** register firiem DEED (TESTOVACÍ výrez; odvetvie z registrácie firmy) — účty firiem z lib/firma */
export const REGISTER_FIRIEM: { ucet: string; nazov: string; odvetvie: string; mesto: string }[] = ["firma-herna", "firma-stavky", "firma-kaviaren", "firma-autoservis", "firma-elektro", "firma-stavebniny", "firma-pekaren"]
  .map((k) => UCTY_FIRIEM.find((f) => f.kluc === k)!)
  .map((f) => ({ ucet: uctFirmy(f.id), nazov: f.nazov, odvetvie: f.odvetvie ?? "", mesto: f.mesto ?? "" }));
/** smie táto firma dorovnávať zbierky tejto charity? (ponuka sa obmedzenej firme neukáže).
 *  Zobrazenie podľa kópie obmedzenia; pri zapečatení to overí server. */
export function smieDorovnat(entita: string, firma: string /* číslo účtu firmy */): boolean {
  const o = obmedzenieDorovnania(entita);
  if (!o.zapnute) return true;
  if (o.firmy.some((f) => rovnakaFirma(f, firma))) return false;
  const odv = REGISTER_FIRIEM.find((f) => rovnakaFirma(f.ucet, firma))?.odvetvie;
  return !(odv && o.odvetvia.includes(odv));
}

/** stránka v DB pre kľúč subjektu v appke (testovacie stránky z 0035) */
export function strankaEntity(entita: string): string | undefined {
  if (entita === "charita") return "svetlo";
  if (entita === "tvorca") return "tvorca";
  if (entita === "b2b") return "pekaren";
  if (entita.startsWith("fara")) return "farnost";
  return undefined;
}

type CieleUkazky = { strecha: string; vozik: string; ovocie: string; skolske: string; seniori: string; deti: string };
/** TESTOVACIE dorovnania podľa prototypu: s databázou ich založí server (z testovacej pokladne, len testovacia stránka);
 *  bez databázy sa len zobrazí statická ukážka. */
export async function naplnTestovacieDorovnania(entita: string, ciele: CieleUkazky): Promise<void> {
  if (supabase) {
    const st = strankaEntity(entita);
    if (!st) return;
    await supabase.rpc("dorovnania_testovacie", { p_entita: entita, p_stranka: st, p_ciele: ciele });
    await obnovDorovnania();
    return;
  }
  if (kopia.some((d) => d.entita === entita)) return;
  kopia = [...kopia, ...ukazka(entita, ciele)];
  emit();
}

/** statická ukážka (len bez databázy) — rovnaké dáta, aké server založí v dorovnania_testovacie */
function ukazka(entita: string, ciele: CieleUkazky): Dorovnanie[] {
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
      zaznamy: zazn(27, 210, 0.5, dt("2026-09-01T08:00:00Z"), ["Lucia S.", "Anonymný darca"], dt("2026-09-21T18:00:00Z")), vratenie: { suma: 90, do: dt("2026-10-06T20:00:00Z"), vs: "2000000000" } },
    { ...zakl, id: "dv-t-a", ciel: ciele.strecha, cielNazov: "Strecha pre rodinu Horváthovú", firmaUcet: uctFirmy("firma-pekaren"), firma: "Pekáreň Dobrota s.r.o.", pomer: 1, strop: 1000, stropDaru: 300, od: dt("2026-10-02T08:00:00Z"), do: dt("2026-10-27T21:00:00Z"), uhrada: "deed", stav: "aktivne", zapecatene: dt("2026-10-02T08:00:00Z"), zaplatene: dt("2026-10-02T09:00:00Z"),
      zaznamy: zazn(41, 820, 1, dt("2026-10-02T08:00:00Z"), ["Anonymný darca", "Zuzana H.", "Jana K."]) },
    { ...zakl, id: "dv-t-b", ciel: ciele.deti, cielNazov: "Sektor Deti", firmaUcet: uctFirmy("firma-stavebniny"), firma: "Stavebniny Opatová s.r.o.", pomer: 0.5, strop: 500, stropDaru: 100, od: dt("2026-09-18T08:00:00Z"), do: dt("2026-12-31T22:00:00Z"), zvysok: "firme", lenZamestnanci: true, kanal: "sepa", uhrada: "deed", stav: "aktivne", zapecatene: dt("2026-09-18T08:00:00Z"), zaplatene: dt("2026-09-18T09:00:00Z"),
      zaznamy: zazn(14, 140, 0.5, dt("2026-09-18T08:00:00Z"), ["Eva R.", "Peter M."]) },
    { ...zakl, id: "dv-t-d", ciel: ciele.skolske, cielNazov: "Školské potreby", firmaUcet: uctFirmy("firma-pekaren"), firma: "Pekáreň Dobrota s.r.o.", pomer: 1, strop: 600, stropDaru: 50, od: dt("2026-08-01T08:00:00Z"), do: dt("2026-08-25T20:00:00Z"), uhrada: "deed", stav: "vycerpane", zapecatene: dt("2026-08-01T08:00:00Z"), zaplatene: dt("2026-08-01T09:00:00Z"), ukoncene: dt("2026-08-19T12:00:00Z"),
      zaznamy: zazn(48, 600, 1, dt("2026-08-01T08:00:00Z"), ["Anonymný darca", "Mária V."], dt("2026-08-19T11:00:00Z")) },
  ];
  void D;
  return L;
}
