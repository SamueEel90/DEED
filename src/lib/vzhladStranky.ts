// KARTA 50 · §1 Vzhľad stránky (všetky sektory): Kronika · Výklad · Pirát vyberá správca v Správe → Upraviť profil.
// Na verejnom profile prepínač nie je. Zadarmo má jeden vzhľad z configu, platený program si vyberie sám.
// Ukladá sa hneď do účtu stránky (profil_stranky.vzhlad, migrácia — Samuel). Nič do prehliadača;
// bez DB spojenia (mock/offline) drží appka výber len v pamäti relácie.
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type Vzhlad = "kronika" | "vyklad" | "pirat";
export const VZHLADY: { k: Vzhlad; t: string; s: string; bg: string }[] = [
  { k: "kronika", t: "Kronika", s: "roky a príbehy", bg: "linear-gradient(160deg,#2F5E3A,#14110B)" },
  { k: "vyklad", t: "Výklad", s: "veľká titulka", bg: "linear-gradient(160deg,#876712,#14110B)" },
  { k: "pirat", t: "Pirát", s: "celé obrazovky", bg: "linear-gradient(160deg,#3D6B8E,#14110B)" },
];
/** CONFIG · vzhľad v programe Zadarmo (určuje DEED, správca ho nemení) */
export const VZHLAD_ZADARMO: Vzhlad = "kronika";
/** sektory, ktoré majú viac vzhľadov (ostatné zatiaľ jeden) */
export const SEKTORY_S_VZHLADOM = ["charita", "farnost"];

const pamat = new Map<string, Vzhlad>();
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const jeVzhlad = (v: unknown): v is Vzhlad => v === "kronika" || v === "vyklad" || v === "pirat";
const nacitane = new Set<string>();

export async function nacitajVzhlad(stranka: string): Promise<Vzhlad | null> {
  if (supabase && !nacitane.has(stranka)) {
    nacitane.add(stranka);
    const { data, error } = await supabase.from("profil_stranky").select("vzhlad").eq("stranka", stranka).maybeSingle();
    if (!error && jeVzhlad(data?.vzhlad) && !pamat.has(stranka)) { pamat.set(stranka, data.vzhlad); zmena(); }
  }
  return pamat.get(stranka) ?? null;
}
/** zmena sa uloží hneď (Ukladá sa samo) */
export async function ulozVzhlad(stranka: string, v: Vzhlad): Promise<void> {
  pamat.set(stranka, v); zmena();
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, vzhlad: v }, { onConflict: "stranka" });
}
/** vybraný vzhľad stránky; zadarmo = vždy vzhľad z configu */
export function useVzhlad(stranka: string, zadarmo: boolean): Vzhlad {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  useEffect(() => { void nacitajVzhlad(stranka); }, [stranka]);
  return zadarmo ? VZHLAD_ZADARMO : pamat.get(stranka) ?? VZHLAD_ZADARMO;
}
