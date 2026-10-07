// ============================================================
// ZOZNAM DARCOV pri zbierke — JEDEN zdroj dát (DEED_Zoznam_Darcov_DEV.md).
// Železné pravidlá: zoznam je LEN zobrazenie daru — číta hotové dáta,
// nič nepočíta a nikam inam nezapisuje. Default = anonymita (opt-in darcu).
// Mock v1: in-memory store + seed; v produkcii sa plní z párovacieho
// enginu po PRIPÍSANÍ platby (PSP / AIS / on-chain) — tabuľka
// `platba` / view `v_vypis` (0014_payment_engine.sql).
// ============================================================
import { createContext, useContext, useSyncExternalStore } from "react";
import { dorovnanieNaDar, dorovnanieKDaru, zapisDar as zapisDorovnanie } from "./dorovnanie";
import { supabase } from "./supabase";
import { pridajPodporu, firmaAkoDarca } from "./podpory";
import { zapisDarZbierky, type ObjektZbierky } from "./darZbierky";
import { ukazkyTeraz, naZmenuTestStavu } from "./testStav";

// ---- CONFIG (spec §6) — všetky čísla ŠTARTOVACIE, žijú tu, nie v kóde ----
export const DARCOVIA_CFG = {
  configVersion: 1,
  prahSumy: 2,             // € — pod prahom sa suma nezobrazí NIKDY (ani keď darca chce)
  pocetRiadkovKompakt: 5,  // kompakt pod platobným modulom
  tickerZivotnostSek: 3.5, // rotácia tickera (rovnaký zdroj ako zoznam)
};

// verzie zobrazenia identity (spec §2) — volí registrovaný darca pri platbe
export type VerziaIdentity = 1 | 2 | 3 | 4 | 5; // 1 celé meno · 2 meno+iniciála · 3 prezývka · 4 anonym · 5 celé meno + mesto
export type KanalDaru = "psp" | "sepa" | "deed";

export interface VolbaDaru { verzia: VerziaIdentity; zobrazSumu: boolean }

export interface DarRiadok {
  id: string;
  refId: string;           // zbierka/žiadosť/kampaň, ku ktorej dar patrí
  cas: number;             // ms — poradie je chronologické, najnovší hore
  suma: number;            // € (hodnota daru) — či sa ZOBRAZÍ, rozhoduje render podľa configu
  kanal: KanalDaru;
  registrovany: boolean;   // neregistrovaný = vždy „Anonymný darca", bez mesta, bez sumy
  verzia: VerziaIdentity;  // voľba sa ukladá PER DAR (spec §5)
  zobrazSumu: boolean;     // samostatný prepínač darcu (len nad prahom)
  moj?: boolean;           // dar aktuálneho používateľa — identita sa NEZAPEKÁ,
                           // renderuje sa z aktuálneho profilu (spec §5)
  /** dorovnanie firmy — dar nie je od človeka, ale od firmy, a tá sa podpisuje
   *  vždy menom (firma má v DEED len verejný profil, anonymitu si nevyberá) */
  firma?: string;
  /** dar prišiel cez QR / odkaz tohto tvorcu (karta 13 — suma a darcovia „cez tvorcu") */
  cezTvorcu?: string;
  // zapečené polia LEN pre mock cudzích darcov (v produkcii render cez userId):
  meno?: string; inicialovo?: string; nick?: string; mesto?: string; mestoVerejne?: boolean;
}

// ---- predvoľba darcu (posledná voľba pri platbe sa pamätá) ----
const KLUC_PREDVOLBA = "deed.dar.predvolba";
const KLUC_MESTO = "deed.dar.mesto"; // profilové nastavenie „zobrazovať mesto" — opt-in (DPIA)

export function nacitajPredvolbu(): VolbaDaru {
  try {
    const s = localStorage.getItem(KLUC_PREDVOLBA);
    if (s) { const v = JSON.parse(s) as VolbaDaru; if (v.verzia >= 1 && v.verzia <= 5) return { verzia: v.verzia, zobrazSumu: !!v.zobrazSumu }; }
  } catch { /* LS nedostupné */ }
  return { verzia: 4, zobrazSumu: true }; // default = anonym, so sumou (darca vie sumu vypnúť)
}
export function ulozPredvolbu(v: VolbaDaru) {
  try { localStorage.setItem(KLUC_PREDVOLBA, JSON.stringify(v)); } catch { /* LS nedostupné */ }
}
export function nacitajMestoVerejne(): boolean {
  try { return localStorage.getItem(KLUC_MESTO) === "1"; } catch { return false; }
}
export function ulozMestoVerejne(on: boolean) {
  try { localStorage.setItem(KLUC_MESTO, on ? "1" : "0"); } catch { /* LS nedostupné */ }
}

// ---- store (mock, in-memory) — zoznam + počítadlo rastú z JEDNÉHO miesta ----
const sklad = new Map<string, DarRiadok[]>();
const posluchaci = new Set<() => void>();
let verzia = 0;
const emit = () => { verzia++; posluchaci.forEach((f) => f()); };
/** prekreslenie pri akomkoľvek novom dare (súčty v hlavičke a ukazovateľoch) */
export function useZmenyDarov(): number { return useSyncExternalStore(subscribe, () => verzia); }
function subscribe(f: () => void) { posluchaci.add(f); return () => { posluchaci.delete(f); }; }

// deterministický seed per refId (mock „posledné dary" — ako keby prišli z enginu)
const POOL = [
  { meno: "Jana Kováčová", inicialovo: "Jana K.", nick: "janka_zl", mesto: "Žilina" },
  { meno: "Peter Baláž", inicialovo: "Peter B.", nick: "petob", mesto: "Prešov" },
  { meno: "Mária Urbanová", inicialovo: "Mária U.", nick: "majka_u", mesto: "Nitra" },
  { meno: "Tomáš Hruška", inicialovo: "Tomáš H.", nick: "tomi_h", mesto: "Trenčín" },
  { meno: "Zuzana Malá", inicialovo: "Zuzana M.", nick: "zuzka", mesto: "Martin" },
  { meno: "Ondrej Vlk", inicialovo: "Ondrej V.", nick: "ondro77", mesto: "Snina" },
];
function hashRef(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

function seed(refId: string): DarRiadok[] {
  const h = hashRef(refId);
  const teraz = Date.now();
  // mix verzií, kanálov a súm — anonym, pod prahom, nad prahom so sumou aj bez
  const vzor: Array<Partial<DarRiadok> & { minPred: number }> = [
    { minPred: 4, suma: 10, kanal: "psp", verzia: 2, zobrazSumu: true, mestoVerejne: true },
    { minPred: 22, suma: 2, kanal: "psp", registrovany: false },
    { minPred: 51, suma: 25, kanal: "sepa", verzia: 1, zobrazSumu: true, mestoVerejne: true },
    { minPred: 60 * 3, suma: 4, kanal: "deed", verzia: 3, zobrazSumu: true }, // pod prahom → suma sa NEukáže
    { minPred: 60 * 9, suma: 15, kanal: "psp", verzia: 4 },
    { minPred: 60 * 26, suma: 8, kanal: "psp", verzia: 2, zobrazSumu: false },
    { minPred: 60 * 24 * 2, suma: 50, kanal: "sepa", verzia: 1, zobrazSumu: true, mestoVerejne: false },
  ];
  return vzor.map((v, i) => {
    const d = POOL[(h + i) % POOL.length];
    return {
      id: `${refId}-seed-${i}`, refId, cas: teraz - v.minPred * 60000,
      suma: v.suma!, kanal: v.kanal!,
      registrovany: v.registrovany !== false,
      verzia: (v.verzia ?? 4) as VerziaIdentity,
      zobrazSumu: !!v.zobrazSumu,
      mestoVerejne: !!v.mestoVerejne,
      ...d,
    };
  });
}

// zbierky na ukážku klientovi: začínajú bez vymyslených darov — pribúdajú len skutočné (simulované) platby
const ciste = new Set<string>();
const OMSA_REF = /-omsa-\d{4}-\d{2}-\d{2}$/;
/** KARTA 56D: zbierka spustená z účtu (zb-…, novaZbierka.spustiZbierku) je skutočná — nikdy nemá vymyslené dary */
const ZBIERKA_Z_UCTU = /^zb-/;
export function nastavCiste(ids: string[]) { ids.forEach((i) => ciste.add(i)); }

// sklad = len skutočné (simulované) dary; vymyslené dary (seed) len pri ukážkach — testovacia verzia
// a „Profil: Vyplnený". Pri „Prázdny" a mimo testovacej verzie žiadne vymyslené mená (pravidlo placebo).
const skladSeed = new Map<string, DarRiadok[]>();
const zlozene = new Map<string, { r: DarRiadok[]; z: DarRiadok[] }>();
naZmenuTestStavu(emit);
function realneDary(refId: string): DarRiadok[] {
  let r = sklad.get(refId);
  if (!r) { r = []; sklad.set(refId, r); }
  return r;
}
function riadkyPre(refId: string): DarRiadok[] {
  const r = realneDary(refId);
  // KARTA 56D: omšové okno farnosti (týždenný kľúč …-omsa-RRRR-MM-DD) nikdy nemá vymyslené dary
  if (ciste.has(refId) || !ukazkyTeraz() || OMSA_REF.test(refId) || ZBIERKA_Z_UCTU.test(refId)) return r;
  let s = skladSeed.get(refId);
  if (!s) { s = seed(refId); skladSeed.set(refId, s); }
  const c = zlozene.get(refId);
  if (c && c.r === r) return c.z; // stabilná referencia pre useSyncExternalStore
  const z = [...r, ...s];
  zlozene.set(refId, { r, z });
  return z;
}
/** kľúče zbierok so skutočnými darmi podľa začiatku (omšové okná farnosti) */
export function refIdySDarmi(zaciatok: string): string[] { return [...sklad.keys()].filter((k) => k.startsWith(zaciatok) && (sklad.get(k)?.length ?? 0) > 0); }

/** súčet a počet darov zbierky (eurá; EURC 1 : 1) — jeden zdroj pre ukazovateľ aj hlavičku */
export function sucetDarov(refId: string): { suma: number; pocet: number } {
  const r = riadkyPre(refId);
  return { suma: r.reduce((a, x) => a + x.suma, 0), pocet: r.length };
}

/** Dary pre zbierku bez hooku (prehľady v správe — reaktivitu dá useZmenyDarov). */
export function darcoviaPre(refId: string): DarRiadok[] { return riadkyPre(refId); }

/** Živý zoznam darov pre zbierku — chronologicky, najnovší hore. */
export function useDarcovia(refId: string): DarRiadok[] {
  return useSyncExternalStore(subscribe, () => riadkyPre(refId));
}

/** Zápis daru po pripísaní platby. QR bez účtu → registrovany:false (vždy anonym). */
/** Zápis daru je JEDINÉ miesto, cez ktoré prechádzajú všetky dary (Charita,
 *  Help, Viera, cudzí profil, vlastný profil). Preto tu — a nikde inde — visí
 *  aj to, čo sa má stať „pri každom dare":
 *   · beží na zbierke dorovnanie firmy → firma pridá svoj diel a zapíše sa ako darca
 *   · daruje samotná firma (je prepnutá do svojej roly) → zbierka sa jej pripne
 *  Keby to viselo na obrazovkách, každá nová obrazovka by na to zabudla. */
export function pridajDar(vstup: {
  refId: string; suma: number; kanal: KanalDaru; registrovany: boolean; volba?: VolbaDaru; firma?: string;
  /** dar prišiel cez QR (split) tohto tvorcu — rozhoduje o tvorcovskom dorovnaní */
  cezTvorcu?: string;
  /** hlavná / sektorová zbierka stránky (nemá id „zb-…") — kvôli zápisu do ledgera (0066) */
  objekt?: ObjektZbierky;
}): DarRiadok & { dorovnane?: number; dorovnalaFirma?: string } {
  const reg = vstup.registrovany;
  const volba = reg ? (vstup.volba ?? nacitajPredvolbu()) : { verzia: 4 as VerziaIdentity, zobrazSumu: false };
  const riadok: DarRiadok = {
    id: `dar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    refId: vstup.refId, cas: Date.now(), suma: vstup.suma, kanal: vstup.kanal,
    registrovany: reg, verzia: volba.verzia, zobrazSumu: volba.zobrazSumu, moj: reg && !vstup.firma,
    ...(vstup.firma ? { firma: vstup.firma } : {}),
    ...(vstup.cezTvorcu ? { cezTvorcu: vstup.cezTvorcu } : {}),
  };
  sklad.set(vstup.refId, [riadok, ...realneDary(vstup.refId)]);
  emit();
  // 0066: dar na zbierku stránky → pohyby v ledgeri (podiely rozhodne server). Neprihlásený / bez DB = nič.
  if (!vstup.firma && reg) void zapisDarZbierky(vstup.refId, vstup.suma, vstup.kanal, vstup.objekt).catch(() => { /* chyba servera — dar ostáva len v UI */ });
  // dar od firmy (dorovnanie alebo firemný dar) sa ďalej nespracúva — inak by
  // dorovnanie dorovnávalo samo seba
  if (vstup.firma) return riadok;
  // Viera je samostatný svet: zbierky sa odtiaľ neberú, firmy ich nedorovnávajú
  // ani si ich nepripínajú. Cirkevná charita ide cez modul Charita ako každá iná.
  if (/^(farnost|naboz)-/.test(vstup.refId)) return riadok;

  // 1) beží dorovnanie → firma pridá svoj diel hneď za darcov dar.
  //    Zadanie 3 · 3.3: koľko a či vôbec, rozhodne server (rpc dorovnanie_dar) a presunie peniaze
  //    z viazaného účtu; tu je len náhľad do textu „firma pridala". Riadok firmy sa zapíše
  //    so sumou, ktorú vrátil server. Bez databázy sa nedorovnáva nič.
  let dorovnane = 0;
  let dorovnalaFirma: string | undefined;
  const dv = supabase ? dorovnanieNaDar(vstup.refId, vstup.cezTvorcu) : null;
  if (dv) {
    dorovnane = dorovnanieKDaru(dv, vstup.suma, Date.now(), vstup.cezTvorcu);
    if (dorovnane > 0) dorovnalaFirma = dv.firma;
    void zapisDorovnanie(vstup.refId, vstup.suma, vstup.cezTvorcu, riadok.id).then((r) => {
      if (r.dorovnane <= 0) return;
      pridajDar({ refId: vstup.refId, suma: r.dorovnane, kanal: vstup.kanal, registrovany: true,
        volba: { verzia: 4, zobrazSumu: true }, firma: r.firma ?? dv.firma, cezTvorcu: vstup.cezTvorcu });
      pridajPodporu(r.firmaUcet ?? dv.firmaUcet, vstup.refId, r.dorovnane, r.firma ?? dv.firma);
    });
  }
  // 2) daruje firma → zbierka jej naskočí na podstránku („dar = pripnutie")
  const firmaDarca = firmaAkoDarca();
  if (firmaDarca) pridajPodporu(firmaDarca.ucet, vstup.refId, vstup.suma, firmaDarca.nazov);

  return dorovnane > 0 ? { ...riadok, dorovnane, dorovnalaFirma } : riadok;
}

/** Spätné prepnutie daru na Anonym — JEDNOSMERNÉ (k väčšej anonymite áno, opačne nie). */
/** Spätné skrytie identity vlastného daru. V zozname darcov TLAČIDLO NIE JE —
 *  darca si identitu volí v profile a pri platbe; v zozname sa dalo kliknúť omylom. */
export function prepniNaAnonym(refId: string, id: string) {
  const nove = realneDary(refId).map((r) => (r.id === id ? { ...r, verzia: 4 as VerziaIdentity, zobrazSumu: false } : r));
  sklad.set(refId, nove);
  emit();
}

// ---- OPRAVY 159: darca bez mena podľa sektora — vo Viere „Bohu známy darca", inde „Anonymný darca" ----
export type SektorDarcu = "viera" | "ine";
/** Jediné miesto textu darcu bez mena (neregistrovaný aj voľba Neukázať meno). */
export function menoBezMena(sektor: SektorDarcu = "ine"): string {
  return sektor === "viera" ? "Bohu známy darca" : "Anonymný darca";
}
/** Voľba „bez mena" pri výbere zobrazenia (mimo Viery krátko „Anonym", ako doteraz). */
export function volbaBezMena(sektor: SektorDarcu = "ine"): string {
  return sektor === "viera" ? menoBezMena(sektor) : "Anonym";
}
/** Sektor pre zoznamy darcov a platobné okno — Viera (modul, farnosť, Správa farnosti) ho nastaví na „viera". */
export const SektorDarcuKontext = createContext<SektorDarcu>("ine");
export const useSektorDarcu = () => useContext(SektorDarcuKontext);

// ---- render helpre (zoznam len ZOBRAZUJE — všetky pravidlá sú tu) ----
export interface JaIdentita { meno?: string; priezvisko?: string; celeMeno?: string; nick?: string | null; mesto?: string }

/** Identita riadku podľa verzie. Vlastné dary sa renderujú z AKTUÁLNEHO profilu (nezapekajú sa). */
export function identitaDarcu(r: DarRiadok, ja?: JaIdentita, sektor: SektorDarcu = "ine"): string {
  if (r.firma) return r.firma;                  // dorovnanie — firma sa podpisuje vždy
  if (!r.registrovany) return menoBezMena(sektor); // bez mesta, bez čohokoľvek
  const zdroj = r.moj && ja
    ? { meno: ja.celeMeno || ja.meno || "Člen", inicialovo: `${ja.meno || "Člen"} ${(ja.priezvisko || "")[0]?.toUpperCase() ?? ""}${(ja.priezvisko || "")[0] ? "." : ""}`.trim(), nick: ja.nick || undefined, mesto: ja.mesto, mestoVerejne: false }
    : r;
  if (r.verzia === 5) return `${zdroj.meno || "Darca"}${zdroj.mesto && zdroj.mesto !== "—" ? `, ${zdroj.mesto}` : ""}`;
  const zaklad = r.verzia === 1 ? (zdroj.meno || "Darca")
    : r.verzia === 2 ? (zdroj.inicialovo || zdroj.meno || "Darca")
    : r.verzia === 3 ? (zdroj.nick || zdroj.inicialovo || "Darca")
    : volbaBezMena(sektor);
  // mesto = profilové nastavenie, platí pre verzie 1–3 aj 4 (spec §2)
  const mesto = zdroj.mestoVerejne && zdroj.mesto && zdroj.mesto !== "—" ? ` · ${zdroj.mesto}` : "";
  return zaklad + mesto;
}

/** Suma na zobrazenie — alebo null (= len „daroval"). Prah žije v configu (AC#3). */
export function zobrazenaSuma(r: DarRiadok): string | null {
  if (r.firma) return `${r.suma.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
  if (!r.registrovany || !r.zobrazSumu) return null;
  if (r.suma < DARCOVIA_CFG.prahSumy) return null; // pod prahom NIKDY — žiadne dvojeurové výkriky
  return `${r.suma.toLocaleString("sk", { maximumFractionDigits: 2 })} €`;
}

/** Relatívny čas riadku. */
export function relCas(cas: number): string {
  const min = Math.floor(Math.max(0, Date.now() - cas) / 60000);
  if (min < 1) return "práve teraz";
  if (min < 60) return `pred ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `pred ${h} h`;
  const dni = Math.floor(h / 24);
  return dni === 1 ? "včera" : `pred ${dni} d.`;
}

/** KARTA 41 (DEV/mock) — cudzí dar „ako keby prišiel z enginu" (meno z POOL-u, súhlas podľa verzie).
 *  V produkcii prídu cudzie dary zo servera (realtime), nie odtiaľto. */
export function pridajCudziDarMock(refId: string, suma: number, anonym = false): DarRiadok {
  const d = POOL[Math.floor(Math.random() * POOL.length)];
  const riadok: DarRiadok = {
    id: `dar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, refId, cas: Date.now(), suma, kanal: suma < 1 ? "deed" : "psp",
    registrovany: true, verzia: (anonym ? 4 : 2) as VerziaIdentity, zobrazSumu: !anonym, ...d,
  };
  sklad.set(refId, [riadok, ...realneDary(refId)]);
  emit();
  return riadok;
}
