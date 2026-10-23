// OPRAVY 88 · Nastavenia charity do účtu stránky (tabuľka nastavenia_stranky, migrácia 0050).
// Jeden jsonb na stránku: { "<kľúč obrazovky>": hodnota }. Číta a píše len správca stránky (RLS).
// Zmena sa uloží sama 600 ms po poslednom zásahu. Bez DB spojenia (mock/offline) drží appka
// hodnoty len v pamäti relácie — nič do prehliadača.
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

let stranka: string | null = null;
let data: Record<string, unknown> = {};
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
let casovac: ReturnType<typeof setTimeout> | null = null;
let cakajuce: (() => void) | null = null;

/** uloží čakajúcu zmenu hneď (pred prepnutím stránky) */
function dopis() {
  if (casovac) clearTimeout(casovac);
  casovac = null;
  const f = cakajuce; cakajuce = null; f?.();
}

/** prekreslí komponent pri zmene nastavení (aj po načítaní zo servera) */
export const useZmenyNastaveni = () => useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);

export const maNastavenie = (kluc: string) => Object.prototype.hasOwnProperty.call(data, kluc);
export const citajNastavenie = (kluc: string): unknown => data[kluc];

/** Správa stránky ju otvorila — načítaj jej nastavenia (iná stránka = iné nastavenia) */
export async function nacitajNastavenia(id: string): Promise<void> {
  if (stranka !== id) { dopis(); stranka = id; data = {}; zmena(); }
  if (!supabase) return;
  const { data: r, error } = await supabase.from("nastavenia_stranky").select("data").eq("stranka", id).maybeSingle();
  if (error || stranka !== id || !r?.data || typeof r.data !== "object") return;
  data = { ...(r.data as Record<string, unknown>), ...data }; // čo človek zmenil počas načítania, má prednosť
  zmena();
}

/** OPRAVY 336: na server idú len zmenené kľúče a server ich zlúči s uloženým objektom (0103 nastavenia_zapis).
 *  Predtým sa zapisoval celý objekt — zariadenie so starou alebo ešte nenačítanou kópiou prepísalo kľúče,
 *  ktoré nemenilo (napr. farár „duch“ v Ľuďoch zmizol po zmene iného nastavenia na inom zariadení). */
let zmeneneKluce = new Set<string>();
async function posliKluce(id: string, kluce: string[], hodnoty: Record<string, unknown>): Promise<void> {
  if (!supabase || !kluce.length) return;
  const cast = Object.fromEntries(kluce.map((k) => [k, hodnoty[k]]));
  const { error } = await supabase.rpc("nastavenia_zapis", { p_stranka: id, p_data: cast });
  if (!error) return;
  // 0103 ešte nebeží: prečítaj uložené, zlúč len zmenené kľúče, zapíš (nikdy nie celá stará kópia)
  if (!/nastavenia_zapis|PGRST202|42883|function/i.test(`${error.code ?? ""} ${error.message ?? ""}`)) return;
  const { data: r } = await supabase.from("nastavenia_stranky").select("data").eq("stranka", id).maybeSingle();
  const ulozene = r?.data && typeof r.data === "object" ? (r.data as Record<string, unknown>) : {};
  await supabase.from("nastavenia_stranky").upsert({ stranka: id, data: { ...ulozene, ...cast } }, { onConflict: "stranka" });
}

/** zapíše hodnotu a naplánuje uloženie zmenených kľúčov */
export function zapisNastavenie(kluc: string, hodnota: unknown): void {
  data = { ...data, [kluc]: hodnota };
  zmena();
  if (!supabase || !stranka) return;
  const id = stranka;
  zmeneneKluce.add(kluc);
  if (casovac) clearTimeout(casovac);
  cakajuce = () => { const k = [...zmeneneKluce], h = data; zmeneneKluce = new Set(); void posliKluce(id, k, h); };
  casovac = setTimeout(dopis, 600);
}

/** OPRAVY 524: znova prečíta jeden kľúč zo servera (QR na mieste — pracovník mohol pozvánku medzitým prijať).
 *  Kľúč, ktorý tu čaká na odoslanie, sa neprepíše. */
export async function obnovKluc(kluc: string): Promise<void> {
  if (!supabase || !stranka || zmeneneKluce.has(kluc)) return;
  const id = stranka;
  const { data: r, error } = await supabase.from("nastavenia_stranky").select("data").eq("stranka", id).maybeSingle().then((x) => x, () => ({ data: null, error: { message: "siet" } }));
  if (error || stranka !== id || zmeneneKluce.has(kluc) || !r?.data || typeof r.data !== "object") return;
  const nova = (r.data as Record<string, unknown>)[kluc];
  if (JSON.stringify(nova) === JSON.stringify(data[kluc])) return;
  data = { ...data, [kluc]: nova };
  zmena();
}

/** OPRAVY 471: zápis, na ktorý sa čaká (ateliér: „uložené ✓“ až po potvrdení servera) — chyba ako text alebo null.
 *  Bez DB (testovacia verzia) len v pamäti relácie. */
export async function zapisNastavenieIsto(kluc: string, hodnota: unknown): Promise<string | null> {
  data = { ...data, [kluc]: hodnota };
  zmena();
  if (!supabase || !stranka) return null;
  zmeneneKluce.delete(kluc); // čakajúci zápis toho istého kľúča by poslal staršiu hodnotu
  const { error } = await supabase.rpc("nastavenia_zapis", { p_stranka: stranka, p_data: { [kluc]: hodnota } }).then((x) => x, () => ({ error: { message: "siet" } }));
  return error ? "Neuložilo sa na server. Skontrolujte pripojenie a skúste znova." : null;
}
