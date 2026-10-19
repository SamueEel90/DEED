// KARTA 50 · §1 Vzhľad stránky (všetky sektory): Kronika · Výklad · Pirát vyberá správca v Správe → Upraviť profil.
// Na verejnom profile prepínač nie je. Zadarmo má jeden vzhľad z configu, platený program si vyberie sám.
// Ukladá sa hneď do účtu stránky (profil_stranky.vzhlad, migrácia 0047). Číta sa z verejného pohľadu
// profil_stranky_verejny (pri Zadarmo vráti server null). Nič do prehliadača;
// bez DB spojenia (mock/offline) drží appka výber len v pamäti relácie.
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type Vzhlad = "kronika" | "vyklad" | "pirat";
export const VZHLADY: { k: Vzhlad; t: string; s: string; bg: string }[] = [
  { k: "kronika", t: "Kronika", s: "roky a príbehy", bg: "linear-gradient(160deg,#2F5E3A,#14110B)" },
  { k: "vyklad", t: "Výklad", s: "veľká titulka", bg: "linear-gradient(160deg,#876712,#14110B)" },
  { k: "pirat", t: "Pirát", s: "celé obrazovky", bg: "linear-gradient(160deg,#3D6B8E,#14110B)" },
];
/** KARTA 56D §4: farnosť — Kronika · Nástenka · Moderné (Moderné nahrádza Pirát), tie isté tri podania */
export const VZHLADY_FARNOST: typeof VZHLADY = [
  { ...VZHLADY[0] }, { ...VZHLADY[1], t: "Nástenka" }, { ...VZHLADY[2], t: "Moderné" },
];
export const vzhladyPre = (sektor?: string) => (sektor === "farnost" ? VZHLADY_FARNOST : VZHLADY);
/** CONFIG · vzhľad v programe Zadarmo (určuje DEED, správca ho nemení) */
export const VZHLAD_ZADARMO: Vzhlad = "kronika";
/** OPRAVY 148: blok Vzhľad stránky pri všetkých typoch; kým sektor nemá vlastné 3 podania, prepne vzhľad charity s jeho dátami */

const pamat = new Map<string, Vzhlad>();
export const maVybranyVzhlad = (stranka: string) => pamat.has(stranka);
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
const jeVzhlad = (v: unknown): v is Vzhlad => v === "kronika" || v === "vyklad" || v === "pirat";
// OPRAVY 308: zo servera pri každom otvorení (čerstvé 15 s), server má prednosť pred pamäťou — okrem zmeny urobenej tu počas načítania
const nacitane = new Map<string, number>();
const zapisane = new Map<string, number>();

export async function nacitajVzhlad(stranka: string): Promise<Vzhlad | null> {
  if (supabase && Date.now() - (nacitane.get(stranka) ?? 0) > 15_000) {
    const zac = Date.now();
    nacitane.set(stranka, zac);
    const { data, error } = await supabase.from("profil_stranky_verejny").select("vzhlad").eq("stranka", stranka).maybeSingle().then((x) => x, () => ({ data: null, error: { message: "siet" } }));
    if (error) nacitane.delete(stranka);
    else if ((zapisane.get(stranka) ?? 0) < zac) {
      const v = jeVzhlad(data?.vzhlad) ? data!.vzhlad as Vzhlad : null;
      if (v && pamat.get(stranka) !== v) { pamat.set(stranka, v); zmena(); }
      else if (!v && pamat.has(stranka)) { pamat.delete(stranka); zmena(); } // OPRAVY 403 doplnok: server bez vzhľadu = Klasik
    }
  }
  return pamat.get(stranka) ?? null;
}
/** zmena sa uloží hneď (Ukladá sa samo) */
export async function ulozVzhlad(stranka: string, v: Vzhlad): Promise<void> {
  zapisane.set(stranka, Date.now());
  pamat.set(stranka, v); zmena();
  if (supabase) await supabase.from("profil_stranky").upsert({ stranka, vzhlad: v }, { onConflict: "stranka" });
}
/** OPRAVY 403 doplnok · Klasik (tvorca): bez vybraného vzhľadu = pôvodná stránka tvorcu (StrankaTvorcu). Uloží sa hneď (vzhlad = null). */
export async function ulozKlasik(stranka: string): Promise<void> {
  zapisane.set(stranka, Date.now());
  pamat.delete(stranka); zmena();
  if (supabase) {
    const { error } = await supabase.from("profil_stranky").upsert({ stranka, vzhlad: null }, { onConflict: "stranka" });
    if (error) throw error;
  }
}
/** vybraný vzhľad, alebo null = Klasik (nič nevybrané) — pre výber v Správe */
export function useVybranyVzhlad(stranka: string): Vzhlad | null {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  useEffect(() => { void nacitajVzhlad(stranka); }, [stranka]);
  return pamat.get(stranka) ?? null;
}
/** vybraný vzhľad stránky; zadarmo = vždy vzhľad z configu */
export function useVzhlad(stranka: string, zadarmo: boolean): Vzhlad {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);
  useEffect(() => { void nacitajVzhlad(stranka); }, [stranka]);
  return zadarmo ? VZHLAD_ZADARMO : pamat.get(stranka) ?? VZHLAD_ZADARMO;
}
