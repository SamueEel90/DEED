// ============================================================
// KARTA 60 — Moje farnosti: jedna domovská + N sledovaných (aj inej cirkvi). Tabuľka moje_farnosti (0076).
// Domovská = súhlas so spracovaním vierovyznania (A9), mení sa len v Adresári cirkví (nastav_domovsku).
// Adresár: farnosti registrované v DEED (v_adresar_farnosti) s cirkvou a obcou.
// Bez DB (mock) sa drží v localStorage a adresár sú testovacie stránky farností.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { UKAZKOVE_STRANKY } from "./mojeStranky";

export interface MojeFarnosti { domovska: string | null; sled: string[] }
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
let stav: MojeFarnosti = nacitajLS();
let adresar: FarnostAdresar[] | null = null;
let nacitane = false;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };

function nacitajLS(): MojeFarnosti {
  try { const v = JSON.parse(localStorage.getItem(KLUC) ?? "null") as MojeFarnosti | null; return v ? { domovska: v.domovska ?? null, sled: Array.isArray(v.sled) ? v.sled : [] } : { domovska: null, sled: [] }; } catch { return { domovska: null, sled: [] }; }
}
function nastav(s: MojeFarnosti) {
  stav = { domovska: s.domovska, sled: [...new Set(s.sled.filter((x) => x && x !== s.domovska))] };
  try { localStorage.setItem(KLUC, JSON.stringify(stav)); } catch { /* LS */ }
  zmena();
}

async function nacitajDB() {
  if (!supabase) return;
  const { data, error } = await supabase.from("moje_farnosti").select("stranka, domovska");
  if (error || !data) return;
  const rows = data as { stranka: string; domovska: boolean }[];
  nastav({ domovska: rows.find((r) => r.domovska)?.stranka ?? null, sled: rows.filter((r) => !r.domovska).map((r) => r.stranka) });
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
  nastav({ domovska: id, sled: id ? [...stav.sled.filter((x) => x !== id), ...(stara && stara !== id ? [stara] : [])] : stav.sled });
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
  if (supabase) {
    const { data } = await supabase.from("farnost_adresar").select("cirkev").eq("stranka", stranka).maybeSingle();
    const c = (data as { cirkev?: string } | null)?.cirkev;
    if (c) cirkevPamat.set(stranka, c);
  }
  return cirkevPamat.get(stranka) ?? "RKC";
}
export async function nastavCirkevFarnosti(stranka: string, kod: string): Promise<void> {
  if (!CIRKVI.some((c) => c[0] === kod)) throw new Error("Neznáma cirkev.");
  cirkevPamat.set(stranka, kod);
  if (adresar) { adresar = adresar.map((f) => (f.id === stranka ? { ...f, cirkev: kod } : f)); }
  zmena();
  if (supabase) { const { error } = await supabase.from("farnost_adresar").upsert({ stranka, cirkev: kod, upravene: new Date().toISOString() }, { onConflict: "stranka" }); chyba(error); }
}
