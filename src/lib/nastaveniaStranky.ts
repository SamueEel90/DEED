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

/** zapíše hodnotu a naplánuje uloženie celej stránky */
export function zapisNastavenie(kluc: string, hodnota: unknown): void {
  data = { ...data, [kluc]: hodnota };
  zmena();
  if (!supabase || !stranka) return;
  const id = stranka, obsah = data;
  if (casovac) clearTimeout(casovac);
  // pri ukladaní tej istej stránky ide najnovší stav (aj to, čo prišlo zo servera medzitým)
  cakajuce = () => { void supabase!.from("nastavenia_stranky").upsert({ stranka: id, data: stranka === id ? data : obsah }, { onConflict: "stranka" }); };
  casovac = setTimeout(dopis, 600);
}
