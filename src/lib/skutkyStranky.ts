// ============================================================
// OPRAVY 418 (charita) · skutky charity na verejnom profile — server 0133 (skutok_stranky).
// Skutok za charitu (Pridať skutok, Obsah → Skutky) sa zapíše aj sem; verejný profil ich číta odtiaľto.
// Stiahnutý skutok návštevník nevidí. Bez databázy sa číta zo správy na tomto zariadení.
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { bezDataUrl } from "./uploadFoto";
import type { MojSkutok } from "./mojeSkutky";

const pamat = new Map<string, MojSkutok[]>();
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
export const useZmenySkutkovStranky = () => useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver, () => 0);

/** zverejnené skutky stránky (najnovší hore); null = ešte nenačítané */
export const skutkyStrankyZPamate = (stranka: string): MojSkutok[] | null => pamat.get(stranka) ?? null;

export async function nacitajSkutkyStranky(stranka: string): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from("skutok_stranky").select("data, stiahnuty").eq("stranka", stranka).is("stiahnuty", null).order("vytvorene", { ascending: false });
  if (error || !data) return;
  pamat.set(stranka, data.map((r) => r.data as MojSkutok));
  zmena();
}

/** zápis (nový aj úprava) — chyba sa nevyhadzuje, skutok ostáva v správe; pri ďalšej úprave sa zapíše znova */
export async function zapisSkutokStranky(stranka: string, s: MojSkutok): Promise<void> {
  const l = pamat.get(stranka);
  if (l) { pamat.set(stranka, s.stiahnuty ? l.filter((x) => x.id !== s.id) : l.some((x) => x.id === s.id) ? l.map((x) => (x.id === s.id ? s : x)) : [s, ...l]); zmena(); }
  if (!supabase) return;
  const data = await bezDataUrl(s, "stranky").catch(() => s);
  await supabase.from("skutok_stranky").upsert({ id: s.id, stranka, data, stiahnuty: s.stiahnuty ?? null, upravene: new Date().toISOString() }, { onConflict: "id" });
}

// OPRAVY 436 · skutok charity vo feede Domov (prispevok, zapísaný pri zverejnení) — úprava a zmazanie aj na serveri
export async function upravSkutokVoFeede(prispevokId: string | undefined, z: { titul: string; popis: string }): Promise<void> {
  if (!supabase || !prispevokId) return;
  await supabase.from("prispevok").update({ titul: z.titul, popis: z.popis }).eq("id", prispevokId);
}
export async function zmazSkutokZFeedu(prispevokId: string | undefined): Promise<void> {
  if (!supabase || !prispevokId) return;
  await supabase.from("prispevok").delete().eq("id", prispevokId);
}
