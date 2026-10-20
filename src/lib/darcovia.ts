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
import { zapisCin } from "./vyzvy";
import { zapisDarZbierky, idZbierkyDB, naviazObjekt, nacitajDaryZbierky, zdrojDaru, type ObjektZbierky } from "./darZbierky";
import { toast } from "@/components/toast";
import { ukazkyTeraz, naZmenuTestStavu } from "./testStav";
import { sumaEur } from "@/lib/suma";

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
  /** OPRAVY 187: dar prišiel cez stránku (farnosť), kde je zbierka pripnutá */
  zdroj?: string;
  /** KARTA 57C: riadok z ledgera — voľba mena sa tam ešte nezapisuje (vo Viere je preto „Bohu známy veriaci") */
  zLedgera?: boolean;
  /** OPRAVY 294: skončená zvončeková omša v Hlavnej zbierke = jeden riadok („Ranná omša 6:00 · Pán Boh zaplať · 138 €“),
   *  jediný riadok so sumou v zozname darcov farnosti; stranka = kvôli poďakovaniu farnosti */
  omsa?: { nazov: string; stranka: string };
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
const OMSA_REF = /-omsa-\d{4}-\d{2}-\d{2}$|-zv-[^-]+-\d{4}-\d{2}-\d{2}-\d{4}$/; // OPRAVY 289: aj zvončeková omše
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
// ---- 0067: zbierka stránky v databáze — zoznam aj súčty LEN z ledgera (dar, ktorý server odmietol, sa neukáže) ----
// OPRAVY 311: dary zo servera sa čítajú znova, keď sú staršie ako 20 s (predtým raz za beh appky → Správa a stránka nesedeli,
// dar z iného zariadenia sa ukázal až po reštarte)
const zLedgera = new Map<string, number>();
const ledgerBezi = new Set<string>();
const CERSTVE_DARY_MS = 20_000;
/** zbierky rodiny, ktorých sumu server nepošle (0075b · KARTA 57 A.7): refId → počet darov */
const skrytaSuma = new Map<string, number>();
/** id zbierky v ledgeri, ak má appka databázu a dar patrí zbierke stránky */
function ledgerId(refId: string): string | null { return supabase ? idZbierkyDB(refId) : null; }
function obnovZLedgera(refId: string, id: string) {
  if (ledgerBezi.has(refId)) return;
  ledgerBezi.add(refId); zLedgera.set(refId, Date.now());
  void nacitajDaryZbierky(id).finally(() => ledgerBezi.delete(refId)).then(({ dary: l, skryte, pocet }) => {
    if (skryte) skrytaSuma.set(refId, pocet); else skrytaSuma.delete(refId);
    // dorovnanie firmy zapísal server (dorovnanie_dar) — jeho riadok ostáva
    const firmy = realneDary(refId).filter((x) => x.firma);
    const stranka = id.split(":")[0];
    const dary: DarRiadok[] = l.map((d) => ({
      id: d.id, refId, cas: d.cas, suma: d.eur, kanal: d.kanal, registrovany: d.registrovany,
      verzia: d.meno ? 1 : 4, zobrazSumu: true, moj: d.moj, zLedgera: true, ...(d.meno ? { meno: d.meno } : {}),
      ...(d.omsa ? { omsa: { nazov: (d.meno ?? "Svätá omša").trim(), stranka } } : {}),
    }));
    sklad.set(refId, [...firmy, ...dary].sort((a, b) => b.cas - a.cas));
    emit();
  }).catch(() => { /* sieť — ostáva posledný stav z ledgera */ });
}
/** OPRAVY 294 · bez databázy: Hlavná zbierka farnosti dostane skončené omše ako riadky (so serverom ich pošle server, 0096) */
type Doplnok = (refId: string) => DarRiadok[] | null;
let doplnokHlavnej: Doplnok | null = null;
export function nastavDoplnokHlavnej(f: Doplnok) { doplnokHlavnej = f; }
const sDoplnkom = new Map<string, { r: DarRiadok[]; kl: string; z: DarRiadok[] }>();
function sOmsami(refId: string, r: DarRiadok[]): DarRiadok[] {
  const d = doplnokHlavnej?.(refId);
  if (!d?.length) return r;
  const kl = d.map((x) => `${x.id}:${x.suma}`).join("|");
  const c = sDoplnkom.get(refId);
  if (c && c.r === r && c.kl === kl) return c.z; // stabilná referencia pre useSyncExternalStore
  const z = [...r, ...d].sort((a, b) => b.cas - a.cas);
  sDoplnkom.set(refId, { r, kl, z });
  return z;
}
/** OPRAVY 294: znovu načítať dary zbierky z ledgera (po zavretí omše) */
export function obnovDaryZbierky(refId: string) { const id = ledgerId(refId); if (id) obnovZLedgera(refId, id); }
function riadkyPre(refId: string): DarRiadok[] {
  const id = ledgerId(refId);
  if (id) {
    if (!ledgerBezi.has(refId) && Date.now() - (zLedgera.get(refId) ?? 0) > CERSTVE_DARY_MS) { zLedgera.set(refId, Date.now()); queueMicrotask(() => obnovZLedgera(refId, id)); }
    return realneDary(refId);
  }
  const r = sOmsami(refId, realneDary(refId));
  // KARTA 56D · OPRAVY 289: zvončeková omše (…-zv-…) nikdy nemá vymyslené dary
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

/** OPRAVY 440 (2): dary zbierky už prišli z ledgera — vtedy sú riadky CELÝ súčet a „základ“ zo zbierky
 *  (pohľad v_zbierky_na_pripnutie, ten istý ledger) sa k nim už nepripočíta. Inak sa sumy zdvojili (40 € + 40,10 €). */
export function zLedgeraNacitane(refId: string): boolean { return ledgerId(refId) != null && sklad.has(refId); }
/** základ zbierky mimo živých riadkov: 0, keď riadky prišli z ledgera */
export const zakladMimoRiadkov = (refId: string, zaklad: number) => (zLedgeraNacitane(refId) ? 0 : zaklad);

/** súčet a počet darov zbierky (eurá; EURC 1 : 1) — jeden zdroj pre ukazovateľ aj hlavičku.
 *  `skryta` = zbierka rodiny, sumu server neposlal (0075b · KARTA 57 A.7): suma je 0, počet zo servera. */
export function sucetDarov(refId: string): { suma: number; pocet: number; skryta?: true } {
  const r = riadkyPre(refId);
  const skryty = skrytaSuma.get(refId);
  if (skryty !== undefined) return { suma: 0, pocet: skryty, skryta: true };
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
  /** 0084: meno, ktoré darca vybral („Meno z profilu“); bez neho je dar bez mena */
  menoDarcu?: string;
}): DarRiadok & { dorovnane?: number; dorovnalaFirma?: string } {
  const reg = vstup.registrovany;
  const volba = reg ? (vstup.volba ?? nacitajPredvolbu()) : { verzia: 4 as VerziaIdentity, zobrazSumu: false };
  if (vstup.objekt) naviazObjekt(vstup.refId, vstup.objekt);
  const lid = ledgerId(vstup.refId);
  const riadok: DarRiadok = {
    id: `dar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    refId: vstup.refId, cas: Date.now(), suma: vstup.suma, kanal: vstup.kanal,
    registrovany: reg, verzia: volba.verzia, zobrazSumu: volba.zobrazSumu, moj: reg && !vstup.firma,
    ...(vstup.firma ? { firma: vstup.firma } : {}),
    ...(vstup.cezTvorcu ? { cezTvorcu: vstup.cezTvorcu } : {}),
    ...(zdrojDaru(vstup.refId) ? { zdroj: zdrojDaru(vstup.refId) } : {}),
  };
  if (lid && !vstup.firma) {
    // 0066/0067: dar sa ukáže až keď vznikne v ledgeri
    void zapisDarZbierky(vstup.refId, vstup.suma, vstup.kanal, vstup.objekt, reg && volba.verzia !== 4 ? vstup.menoDarcu : undefined)
      .then(() => obnovZLedgera(vstup.refId, lid))
      .catch((e: { message?: string }) => toast(`Dar sa nezapísal${e?.message ? ` · ${e.message}` : ""}`));
  } else {
    sklad.set(vstup.refId, [riadok, ...realneDary(vstup.refId)]);
    emit();
  }
  // dar od firmy (dorovnanie alebo firemný dar) sa ďalej nespracúva — inak by
  // dorovnanie dorovnávalo samo seba
  if (vstup.firma) return riadok;
  // výzvy tvorcov (0085b): dar registrovaného človeka môže splniť podmienku bežiacej výzvy
  if (reg) { let meno = ""; try { meno = localStorage.getItem("deed.ja.meno") ?? ""; } catch { /* LS */ } zapisCin(meno, { suma: vstup.suma, ciel: vstup.refId, cezTvorcu: vstup.cezTvorcu }); }
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

// ---- OPRAVY 159 · 57C: darca bez mena podľa sektora — vo Viere „Bohu známy veriaci" (v appke vždy „veriaci"), inde „Anonymný darca" ----
// Martin 13. 10. (Blok A): pohrebná zbierka cez faru „Bohu známy darca“; slovo „Anonym“ sa nikde nepoužíva.
export type SektorDarcu = "viera" | "pohreb" | "ine";
/** Jediné miesto textu darcu bez mena (neregistrovaný aj voľba Bez mena). */
export function menoBezMena(sektor: SektorDarcu = "ine"): string {
  return sektor === "viera" ? "Bohu známy veriaci" : sektor === "pohreb" ? "Bohu známy darca" : "Anonymný darca";
}
/** Voľba „bez mena“ pri výbere zobrazenia — ten istý text ako v zozname. */
export function volbaBezMena(sektor: SektorDarcu = "ine"): string {
  return menoBezMena(sektor);
}
/** Viera (stránka farnosti, pohrebná cez faru): darca volí len Meno z profilu · Bez mena */
export const jeViera = (s: SektorDarcu) => s === "viera" || s === "pohreb";
/** Sumy pri darcoch (Martin 13. 10.): false = nikdy (súkromné zbierky), true = podľa darcu, nad 2 €.
 *  Bez nastavenia: vo Viere nie (farár ich zapína pri zbierke), inde podľa darcu. */
export const SumyDarcovKontext = createContext<boolean | null>(null);
export function useUkazSumy(): boolean {
  const k = useContext(SumyDarcovKontext), s = useContext(SektorDarcuKontext);
  return k ?? !jeViera(s);
}
/** Sektor pre zoznamy darcov a platobné okno — Viera (modul, farnosť, Správa farnosti) ho nastaví na „viera". */
export const SektorDarcuKontext = createContext<SektorDarcu>("ine");
export const useSektorDarcu = () => useContext(SektorDarcuKontext);

// ---- render helpre (zoznam len ZOBRAZUJE — všetky pravidlá sú tu) ----
export interface JaIdentita { meno?: string; priezvisko?: string; celeMeno?: string; nick?: string | null; mesto?: string }

/** Identita riadku podľa verzie. Vlastné dary sa renderujú z AKTUÁLNEHO profilu (nezapekajú sa). */
export function identitaDarcu(r: DarRiadok, ja?: JaIdentita, sektor: SektorDarcu = "ine"): string {
  if (r.omsa) return r.omsa.nazov;              // OPRAVY 294: skončená zvončeková omša („Ranná omša 6:00“)
  if (r.firma) return r.firma;                  // dorovnanie — firma sa podpisuje vždy
  if (!r.registrovany) return menoBezMena(sektor); // bez mesta, bez čohokoľvek
  // 0084: riadok z ledgera nesie meno, ktoré darca vybral; bez neho je bez mena (podľa sektora)
  if (r.zLedgera) return r.meno || menoBezMena(sektor);
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
  if (r.firma || r.omsa) return `${sumaEur(r.suma)}`; // OPRAVY 294: riadok omše je jediný so sumou
  if (!r.registrovany || !r.zobrazSumu) return null;
  if (r.suma < DARCOVIA_CFG.prahSumy) return null; // pod prahom NIKDY — žiadne dvojeurové výkriky
  return `${sumaEur(r.suma)}`;
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
