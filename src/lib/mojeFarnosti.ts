// ============================================================
// KARTA 60 — Moje farnosti: jedna domovská + N sledovaných (aj inej cirkvi). Tabuľka moje_farnosti (0076).
// Domovská = súhlas so spracovaním vierovyznania (A9), mení sa len v Adresári cirkví (nastav_domovsku).
// Adresár: farnosti registrované v DEED (v_adresar_farnosti) s cirkvou a obcou.
// Bez DB (mock) sa drží v localStorage a adresár sú testovacie stránky farností.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { UKAZKOVE_STRANKY } from "./mojeStranky";
import { zaregistrujKluc, zmenene } from "./mojeData";
import { jeVzor } from "@/lib/vzorStranky";

/** KARTA 62: sledovaný kostol = miesto konkrétnej farnosti (moje_kostoly, 0086) */
export interface SledovanyKostol { stranka: string; miesto: string; /** KARTA 63 */ bloky?: string[] }

// ---- KARTA 63: o čom chce sledujúci vedieť (bloky stránky farnosti, 0087) ----
export type Blok = "oz" | "om" | "pr" | "po" | "de" | "vy" | "te" | "sp" | "mo" | "ve" | "zb";
/** OPRAVY 298: všetky kategórie podľa blokov stránky, v poradí zo zadania (pribudlo Vypočuj si — server od 0098) */
export const BLOKY: [Blok, string, string][] = [
  ["oz", "Oznamy farnosti", "nedeľné oznamy a dôležité správy"], ["om", "Zmeny a zrušenia omší", "príde hneď"], ["pr", "Príď a zaži s nami", "akcie, púte, koncerty"],
  ["po", "Pomôž", "brigády a dobrovoľníci"], ["de", "Deti a mládež", "stretká, miništranti, tábory"], ["vy", "Vypočuj si", "príhovory a nahrávky"],
  ["mo", "Modli sa s nami", "prosby o modlitbu"], ["te", "Teš sa s nami", "svadby, jubileá, blahoželania"], ["sp", "Spomíname", "parte · príde hneď"],
  ["ve", "Od veriacich", "čo pridali ostatní"], ["zb", "Zbierky", "nová zbierka a míľniky"],
];
/** OPRAVY 298: blok upozornení → blok stránky (premenovaný nadpis z Usporiadať stránku, bod 292); omše nemajú blok */
export const BLOK_STRANKY: Partial<Record<Blok, "ozn" | "prid" | "pom" | "deti" | "vyp" | "mod" | "tes" | "spom" | "ver" | "zbierky">> = {
  oz: "ozn", pr: "prid", po: "pom", de: "deti", vy: "vyp", mo: "mod", te: "tes", sp: "spom", ve: "ver", zb: "zbierky" };
/** kostol má len bloky svojej podstránky (oznamy, omše, akcie, zbierka na miesto) */
export const BLOKY_KOSTOLA: Blok[] = ["oz", "om", "pr", "zb"];
export const PREDVOLENE_FARNOST: Blok[] = ["oz", "om", "sp"], PREDVOLENE_KOSTOL: Blok[] = ["oz", "om"];
export const kratkeBloky = (b: string[]) => BLOKY.filter(([k]) => b.includes(k)).map(([k, n]) => (k === "om" ? "Zmeny omší" : k === "pr" ? "Príď a zaži" : n.replace(" farnosti", ""))).join(" · ") || "nič, len sledujete";
export interface MojeFarnosti { domovska: string | null; sled: string[]; /** KARTA 63: bloky pri farnosti (stranka → bloky) */ bloky: Record<string, string[]>; /** KARTA 62 */ kostoly: SledovanyKostol[]; /** KARTA 62: Môj kostol pri domovskej (id miesta) */ mojKostol: string | null }
export interface FarnostAdresar { id: string; nazov: string; cirkev: string; obec: string | null; lat: number | null; lng: number | null }

/** 18 cirkví a náboženských spoločností registrovaných MK SR: [kód, názov, popis, rodina] */
export const CIRKVI: [string, string, string, number][] = [
  ["RKC", "Rímskokatolícka cirkev v SR", "kresťanská · katolícka", 0], ["GKC", "Gréckokatolícka cirkev na Slovensku", "kresťanská · katolícka, východný obrad", 0], ["PC", "Pravoslávna cirkev na Slovensku", "kresťanská · pravoslávna", 0],
  ["ECAV", "Evanjelická cirkev augsburského vyznania na Slovensku", "kresťanská · luteránska", 1], ["RKCr", "Reformovaná kresťanská cirkev na Slovensku", "kresťanská · reformovaná", 1], ["ECM", "Evanjelická cirkev metodistická, Slovenská oblasť", "kresťanská · protestantská", 1], ["BJB", "Bratská jednota baptistov v SR", "kresťanská · protestantská", 1], ["CB", "Cirkev bratská v SR", "kresťanská · protestantská", 1], ["ACS", "Apoštolská cirkev na Slovensku", "kresťanská · letničná", 1], ["KZ", "Kresťanské zbory na Slovensku", "kresťanská · protestantská", 1],
  ["CASD", "Cirkev adventistov siedmeho dňa", "kresťanská · protestantská", 2], ["CČSH", "Cirkev československá husitská na Slovensku", "kresťanská", 2], ["LDS", "Cirkev Ježiša Krista Svätých neskorších dní v SR", "kresťanská", 2], ["JS", "Náboženská spoločnosť Jehovovi svedkovia v SR", "kresťanská", 2], ["NAC", "Novoapoštolská cirkev v SR", "kresťanská", 2], ["SKC", "Starokatolícka cirkev na Slovensku", "kresťanská", 2],
  ["ÚZŽNO", "Ústredný zväz židovských náboženských obcí v SR", "židovská", 3], ["BS", "Bahájske spoločenstvo v SR", "bahájska", 3],
];
export const RODINY_CIRKVI = ["KATOLÍCKE A VÝCHODNÉ", "EVANJELICKÉ A PROTESTANTSKÉ", "OSTATNÉ KRESŤANSKÉ", "NEKRESŤANSKÉ"];
/** skratka na zobrazenie (RKCr → RKC-r, aby sa nepliela s rímskokatolíckou) */
export const skratkaCirkvi = (k: string) => (k === "RKCr" ? "RKC-r" : k);

const KLUC = "deed.mojeFarnosti.v1";
const PRAZDNE: MojeFarnosti = { domovska: null, sled: [], bloky: {}, kostoly: [], mojKostol: null };
let stav: MojeFarnosti = nacitajLS();
let adresar: FarnostAdresar[] | null = null;
let nacitane = false;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };

function nacitajLS(): MojeFarnosti {
  try {
    const v = JSON.parse(localStorage.getItem(KLUC) ?? "null") as Partial<MojeFarnosti> | null;
    return v ? { domovska: v.domovska ?? null, sled: Array.isArray(v.sled) ? v.sled : [], bloky: v.bloky && typeof v.bloky === "object" ? v.bloky : {}, kostoly: Array.isArray(v.kostoly) ? v.kostoly : [], mojKostol: v.mojKostol ?? null } : PRAZDNE;
  } catch { return PRAZDNE; }
}
const rovnaky = (a: SledovanyKostol, b: SledovanyKostol) => a.stranka === b.stranka && a.miesto === b.miesto;
function nastav(s: MojeFarnosti) {
  stav = { domovska: s.domovska, sled: [...new Set(s.sled.filter((x) => x && x !== s.domovska))], bloky: s.bloky,
    kostoly: s.kostoly.filter((k, i, l) => k.stranka && k.miesto && l.findIndex((y) => rovnaky(y, k)) === i), mojKostol: s.domovska ? s.mojKostol : null };
  try { localStorage.setItem(KLUC, JSON.stringify(stav)); } catch { /* LS */ }
  zmena();
}

async function nacitajDB() {
  if (!supabase) return;
  const [f, k] = await Promise.all([supabase.from("moje_farnosti").select("stranka, domovska, moj_kostol, bloky"), supabase.from("moje_kostoly").select("stranka, miesto, bloky")]);
  if (f.error || !f.data) return;
  const rows = f.data as { stranka: string; domovska: boolean; moj_kostol: string | null; bloky?: string[] }[];
  const hl = rows.find((r) => r.domovska);
  nastav({ domovska: hl?.stranka ?? null, sled: rows.filter((r) => !r.domovska).map((r) => r.stranka), mojKostol: hl?.moj_kostol ?? null,
    bloky: Object.fromEntries(rows.filter((r) => Array.isArray(r.bloky)).map((r) => [r.stranka, r.bloky!])),
    kostoly: k.error || !k.data ? stav.kostoly : (k.data as SledovanyKostol[]) });
}
async function nacitajAdresarDB(): Promise<FarnostAdresar[]> {
  if (!supabase) {
    return UKAZKOVE_STRANKY.filter((s) => s.typ === "farnost").map((s) => ({ id: s.k, nazov: s.n, cirkev: "RKC", obec: "Trenčín", lat: null, lng: null }));
  }
  const { data, error } = await supabase.from("v_adresar_farnosti").select("id, nazov, cirkev, obec, lat, lng");
  if (error || !data) return adresar ?? [];
  return data as FarnostAdresar[];
}

/** stav Moje farnosti (prvé použitie ho stiahne z DB) */
export function useMojeFarnosti(): MojeFarnosti {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => { if (!nacitane) { nacitane = true; void nacitajDB(); } }, []);
  return stav;
}
export const mojeFarnosti = () => stav;

/** adresár farností v DEED (načíta sa raz, potom z pamäte) */
export function useAdresarFarnosti(): FarnostAdresar[] | null {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => { if (!adresar) void nacitajAdresarDB().then((a) => { adresar = a; zmena(); }); }, []);
  return adresar;
}
export const nazovFarnosti = (id: string) => adresar?.find((f) => f.id === id)?.nazov ?? UKAZKOVE_STRANKY.find((s) => s.k === id)?.n ?? id;

const chyba = (e: { message?: string } | null) => { if (e) throw new Error(e.message ?? "Nepodarilo sa uložiť."); };

/** nová domovská (stará ostane medzi sledovanými); null = odstrániť domovskú */
export async function nastavDomovsku(id: string | null): Promise<void> {
  const stara = stav.domovska;
  nastav({ ...stav, domovska: id, sled: id ? [...stav.sled.filter((x) => x !== id), ...(stara && stara !== id ? [stara] : [])] : stav.sled, mojKostol: id === stara ? stav.mojKostol : null });
  if (supabase) { const { error } = await supabase.rpc("nastav_domovsku", { p_stranka: id }); chyba(error); }
}
export async function pridajSledovanu(id: string): Promise<void> {
  if (id === stav.domovska || stav.sled.includes(id)) return;
  nastav({ ...stav, sled: [...stav.sled, id] });
  if (supabase) { const { error } = await supabase.from("moje_farnosti").insert({ stranka: id }); chyba(error); }
}
export async function odstranSledovanu(id: string): Promise<void> {
  nastav({ ...stav, sled: stav.sled.filter((x) => x !== id) });
  if (supabase) { const { error } = await supabase.from("moje_farnosti").delete().eq("stranka", id).eq("domovska", false); chyba(error); }
}

// ---- KARTA 62: Sledovať tento kostol · Môj kostol · počet sledujúcich per miesto (0086) ----
export const sledujemKostol = (stranka: string, miesto: string) => stav.kostoly.some((k) => k.stranka === stranka && k.miesto === miesto);
export async function sledujKostol(stranka: string, miesto: string): Promise<void> {
  if (sledujemKostol(stranka, miesto)) return;
  nastav({ ...stav, kostoly: [...stav.kostoly, { stranka, miesto }] });
  if (supabase) { const { error } = await supabase.from("moje_kostoly").insert({ stranka, miesto }); chyba(error); }
}
export async function prestanKostol(stranka: string, miesto: string): Promise<void> {
  nastav({ ...stav, kostoly: stav.kostoly.filter((k) => !rovnaky(k, { stranka, miesto })) });
  if (supabase) { const { error } = await supabase.from("moje_kostoly").delete().eq("stranka", stranka).eq("miesto", miesto); chyba(error); }
}
/** Môj kostol pri domovskej farnosti (null = žiadny) */
export async function nastavMojKostol(miesto: string | null): Promise<void> {
  if (!stav.domovska) return;
  nastav({ ...stav, mojKostol: miesto });
  if (supabase) { const { error } = await supabase.rpc("nastav_moj_kostol", { p_miesto: miesto }); chyba(error); }
}
/** počet sledujúcich pri každom mieste (len správca); bez DB len vlastné sledovanie (test) */
export async function sledujuciMiest(stranka: string): Promise<Record<string, number>> {
  if (!supabase) return Object.fromEntries(stav.kostoly.filter((k) => k.stranka === stranka).map((k) => [k.miesto, 1]));
  const { data, error } = await supabase.rpc("sledujuci_miest", { p_stranka: stranka });
  if (error || !data) return {};
  return Object.fromEntries((data as { miesto: string; pocet: number }[]).map((r) => [r.miesto, Number(r.pocet)]));
}

// ---- KARTA 63: bloky upozornení ----
export const blokyFarnosti = (stranka: string): string[] => stav.bloky[stranka] ?? PREDVOLENE_FARNOST;
export const blokyKostola = (stranka: string, miesto: string): string[] => stav.kostoly.find((k) => k.stranka === stranka && k.miesto === miesto)?.bloky ?? PREDVOLENE_KOSTOL;
/** uloží bloky pri farnosti (miesto null) alebo pri sledovanom kostole */
export async function nastavBloky(stranka: string, miesto: string | null, bloky: string[]): Promise<void> {
  if (miesto === null) nastav({ ...stav, bloky: { ...stav.bloky, [stranka]: bloky } });
  else nastav({ ...stav, kostoly: stav.kostoly.map((k) => (k.stranka === stranka && k.miesto === miesto ? { ...k, bloky } : k)) });
  if (supabase) {
    let { error } = await supabase.rpc("nastav_bloky", { p_stranka: stranka, p_miesto: miesto, p_bloky: bloky });
    // OPRAVY 298: kým nebeží 0098, server nepozná Vypočuj si — ostatné sa uložia, Vypočuj si len na tomto zariadení
    if (error && bloky.includes("vy")) ({ error } = await supabase.rpc("nastav_bloky", { p_stranka: stranka, p_miesto: miesto, p_bloky: bloky.filter((b) => b !== "vy") }));
    chyba(error);
  }
}
/** Profil → Upozornenia → Moje farnosti: „Spolu najviac 1 správa denne“ (moje_data, server podľa neho skladá súhrn) */
const KLUC_SUHRN = "deed.farnostiSuhrn";
zaregistrujKluc(KLUC_SUHRN, () => zmena());
export const farnostiSuhrn = (): boolean => { try { return localStorage.getItem(KLUC_SUHRN) !== "false"; } catch { return true; } };
export const nastavFarnostiSuhrn = (on: boolean) => { try { localStorage.setItem(KLUC_SUHRN, JSON.stringify(on)); } catch { /* LS */ } zmenene(KLUC_SUHRN); zmena(); };
/** pri zverejnení: koľkým ľuďom pôjde upozornenie (blok; pri ozname pre konkrétne kostoly aj ich sledujúci) — len správca */
export async function pocetSledujucich(stranka: string, blok: Blok, miesta?: string[]): Promise<number> {
  const riadky: { miesto: string | null; blok: string; pocet: number }[] = supabase
    ? (((await supabase.rpc("sledujuci_blokov", { p_stranka: stranka })).data ?? []) as { miesto: string | null; blok: string; pocet: number }[])
    : [ // bez DB: len vlastné sledovanie (test)
      ...((stav.domovska === stranka || stav.sled.includes(stranka)) ? blokyFarnosti(stranka).map((b) => ({ miesto: null, blok: b, pocet: 1 })) : []),
      ...stav.kostoly.filter((k) => k.stranka === stranka).flatMap((k) => (k.bloky ?? PREDVOLENE_KOSTOL).map((b) => ({ miesto: k.miesto, blok: b, pocet: 1 }))),
    ];
  return riadky.filter((r) => r.blok === blok && (r.miesto === null || !miesta || miesta.includes(r.miesto))).reduce((a, r) => a + Number(r.pocet), 0);
}

// ---- okno Adresára (otvára ho Viera aj okno Moje farnosti na stránke farnosti) ----
let adresarOtv: string | null = null; // text tlačidla Späť na kroku 1
/** otvorí Adresár cirkví; spat = kam vráti „‹ Späť" (napr. „‹ Späť na moju farnosť") */
export const otvorAdresar = (spat = "‹ Späť") => { adresarOtv = spat; zmena(); };
export const zavriAdresar = () => { adresarOtv = null; zmena(); };
export function useAdresarOtvoreny(): string | null {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  return adresarOtv;
}

// ---- cirkev farnosti (Martin 13:11: farár nastavuje cirkev; zápis do farnost_adresar, RLS: len správca) ----
const cirkevPamat = new Map<string, string>();
/** cirkev farnosti (kód z CIRKVI); kým nie je načítaná, RKC ako v DB */
export async function nacitajCirkevFarnosti(stranka: string): Promise<string> {
  if (jeVzor(stranka)) return "RKC";
  if (supabase) {
    const { data } = await supabase.from("farnost_adresar").select("cirkev").eq("stranka", stranka).maybeSingle();
    const c = (data as { cirkev?: string } | null)?.cirkev;
    if (c) cirkevPamat.set(stranka, c);
  } else if (!cirkevPamat.has(stranka)) {
    // bez databázy (testovacia verzia v prehliadači): cirkev z tohto prehliadača
    try { const c = localStorage.getItem(`deed.cirkev.${stranka}`); if (c) cirkevPamat.set(stranka, c); } catch { /* LS */ }
  }
  return cirkevPamat.get(stranka) ?? "RKC";
}
export async function nastavCirkevFarnosti(stranka: string, kod: string): Promise<void> {
  if (!CIRKVI.some((c) => c[0] === kod)) throw new Error("Neznáma cirkev.");
  cirkevPamat.set(stranka, kod);
  if (adresar) { adresar = adresar.map((f) => (f.id === stranka ? { ...f, cirkev: kod } : f)); }
  zmena();
  if (supabase) { const { error } = await supabase.from("farnost_adresar").upsert({ stranka, cirkev: kod, upravene: new Date().toISOString() }, { onConflict: "stranka" }); chyba(error); }
  else { try { localStorage.setItem(`deed.cirkev.${stranka}`, kod); } catch { /* LS */ } }
}

// ---- KARTA 61 §0 · slová podľa cirkvi (číselník public.cirkev, 0078). V kóde jedna rola „duchovný“, mení sa len slovo. ----
export interface SlovaCirkvi { titul: string; titul2p: string; jednotka2p: string; oslovenie: string | null; dozorca: boolean; /** OPRAVY 289: poďakovanie v riadku zvončekovej v Hlavnej zbierke (0091) */ podakovanie: string }
/** balík 47 (0163): výrazy pre Svetlúšika · Prvé kroky — farnosť / Vaša farnosť / svätá omša / kostol (podľa cirkvi, nie napevno) */
export interface SlovaSprievodcu { jednotka: string; vasa: string; bohosluzba: string; bohosluzby: string; miesto: string; miestoA: string }
const SP = (jednotka: string, vasa: string, bohosluzba: string, bohosluzby: string, miesto: string, miestoA = miesto): SlovaSprievodcu => ({ jednotka, vasa, bohosluzba, bohosluzby, miesto, miestoA });
const ZBOR = SP("zbor", "Váš zbor", "bohoslužba", "bohoslužby", "kostol");
/** záloha, kým nebeží 0163 (rovnaké hodnoty) */
const SPRIEVODCA_ZALOHA: Record<string, SlovaSprievodcu> = {
  RKC: SP("farnosť", "Vaša farnosť", "svätá omša", "sväté omše", "kostol"), GKC: SP("farnosť", "Vaša farnosť", "svätá liturgia", "sväté liturgie", "chrám"),
  PC: SP("cirkevná obec", "Vaša cirkevná obec", "svätá liturgia", "sväté liturgie", "chrám"),
  ECAV: SP("cirkevný zbor", "Váš cirkevný zbor", "bohoslužba", "bohoslužby", "kostol"), RKCr: SP("cirkevný zbor", "Váš cirkevný zbor", "bohoslužba", "bohoslužby", "kostol"),
  ECM: ZBOR, BJB: ZBOR, CB: ZBOR, ACS: ZBOR, KZ: ZBOR, CASD: ZBOR,
  ÚZŽNO: SP("náboženská obec", "Vaša náboženská obec", "bohoslužba", "bohoslužby", "synagóga", "synagógu"),
  SKC: SP("spoločenstvo", "Vaše spoločenstvo", "svätá omša", "sväté omše", "kostol"),
};
const SPRIEVODCA_INE = SP("spoločenstvo", "Vaše spoločenstvo", "bohoslužba", "bohoslužby", "miesto stretnutí");
let sprievodcaDb: Record<string, SlovaSprievodcu> | null = null;
export const slovaSprievodcu = (kod: string): SlovaSprievodcu => sprievodcaDb?.[kod] ?? SPRIEVODCA_ZALOHA[kod] ?? SPRIEVODCA_INE;
type RiadokCirkvi = { kod: string; titul: string; titul_2p: string; jednotka_2p: string; oslovenie: string | null; dozorca: boolean; podakovanie?: string | null };
/** OPRAVY 289: zbory a obce „Ďakujeme“, ostatné „Pán Boh zaplať“ (záloha ako 0091) */
const podakovanieJednotky = (jednotka2p: string) => (/(zboru|obce)$/.test(jednotka2p) ? "Ďakujeme" : "Pán Boh zaplať");
const S = (titul: string, titul2p: string, jednotka2p: string, oslovenie: string | null, dozorca = false, podakovanie?: string | null): SlovaCirkvi => ({ titul, titul2p, jednotka2p, oslovenie, dozorca, podakovanie: podakovanie?.trim() || podakovanieJednotky(jednotka2p) });
/** záloha, kým nepríde číselník z DB (rovnaké hodnoty ako 0078) */
const SLOVA_ZALOHA: Record<string, SlovaCirkvi> = {
  RKC: S("Farár", "farára", "farnosti", "pán farár"), GKC: S("Farár", "farára", "farnosti", "otec"), PC: S("Otec duchovný", "otca duchovného", "cirkevnej obce", "otec"),
  ECAV: S("Farár", "farára", "cirkevného zboru", "brat farár", true), RKCr: S("Farár", "farára", "cirkevného zboru", "brat farár", true),
  ECM: S("Kazateľ", "kazateľa", "zboru", "brat kazateľ", true), BJB: S("Kazateľ", "kazateľa", "zboru", "brat kazateľ", true), CB: S("Kazateľ", "kazateľa", "zboru", "brat kazateľ", true),
  ACS: S("Kazateľ", "kazateľa", "zboru", "brat kazateľ", true), KZ: S("Kazateľ", "kazateľa", "zboru", "brat", true), CASD: S("Kazateľ", "kazateľa", "zboru", "brat kazateľ"),
  ÚZŽNO: S("Rabín", "rabína", "náboženskej obce", "pán rabín"),
};
const SLOVA_INE = S("Duchovný správca", "duchovného správcu", "spoločenstva", null);
let ciselnik: Record<string, SlovaCirkvi> | null = null;
let ciselnikNacitany = false;
async function nacitajCiselnik() {
  if (!supabase) return;
  let { data, error } = await supabase.from("cirkev").select("kod, titul, titul_2p, jednotka_2p, oslovenie, dozorca, podakovanie");
  if (error) ({ data, error } = await supabase.from("cirkev").select("kod, titul, titul_2p, jednotka_2p, oslovenie, dozorca")); // DB ešte bez 0091
  if (error || !data) return;
  ciselnik = Object.fromEntries((data as RiadokCirkvi[]).map((r) => [r.kod, S(r.titul, r.titul_2p, r.jednotka_2p, r.oslovenie, r.dozorca, r.podakovanie)]));
  // balík 47: výrazy sprievodcu (0163); bez nich ostáva záloha
  const sp = await supabase.from("cirkev").select("kod, jednotka, vasa, bohosluzba, bohosluzby, miesto, miesto_a").then((x) => x, () => ({ data: null, error: { message: "" } }));
  if (!sp.error && sp.data) sprievodcaDb = Object.fromEntries((sp.data as { kod: string; jednotka: string | null; vasa: string | null; bohosluzba: string | null; bohosluzby: string | null; miesto: string | null; miesto_a: string | null }[])
    .filter((r) => r.jednotka && r.vasa && r.bohosluzba && r.bohosluzby && r.miesto).map((r) => [r.kod, SP(r.jednotka!, r.vasa!, r.bohosluzba!, r.bohosluzby!, r.miesto!, r.miesto_a ?? r.miesto!)]));
  zmena();
}
export const slovaCirkvi = (kod: string): SlovaCirkvi => ciselnik?.[kod] ?? SLOVA_ZALOHA[kod] ?? SLOVA_INE;

/** slová pre stránku farnosti podľa jej cirkvi (Farár farnosti · Kazateľ zboru · Otec duchovný cirkevnej obce…) */
/** OPRAVY 220: slovo pri čase bohoslužby podľa cirkvi (17:30 sv. omša · 9:00 služby Božie …) */
export const slovoOmse = (kod: string): string => (kod === "RKC" ? "sv. omša" : kod === "GKC" || kod === "PC" ? "sv. liturgia" : kod === "ECAV" || kod === "RKCr" ? "služby Božie" : "bohoslužba");
export function useSlovaFarnosti(stranka: string): SlovaCirkvi & SlovaSprievodcu & { cirkev: string; omsa: string } {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => {
    if (!ciselnikNacitany) { ciselnikNacitany = true; void nacitajCiselnik(); }
    if (!cirkevPamat.has(stranka)) void nacitajCirkevFarnosti(stranka).then(() => zmena());
  }, [stranka]);
  const k = cirkevPamat.get(stranka) ?? "RKC";
  return { ...slovaCirkvi(k), ...slovaSprievodcu(k), cirkev: k, omsa: slovoOmse(k) };
}
