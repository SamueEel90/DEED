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

/** zápis (nový aj úprava). OPRAVY 443 (1): vráti chybu (slovenská veta) alebo null — Správa ju ukáže, skutok sa „nestratí“ potichu */
export async function zapisSkutokStranky(stranka: string, s: MojSkutok): Promise<string | null> {
  const l = pamat.get(stranka);
  if (l) { pamat.set(stranka, s.stiahnuty ? l.filter((x) => x.id !== s.id) : l.some((x) => x.id === s.id) ? l.map((x) => (x.id === s.id ? s : x)) : [s, ...l]); zmena(); }
  if (!supabase) return null;
  const data = await bezDataUrl(s, "stranky").catch(() => s);
  const { error } = await supabase.from("skutok_stranky").upsert({ id: s.id, stranka, data, stiahnuty: s.stiahnuty ?? null, upravene: new Date().toISOString() }, { onConflict: "id" });
  if (error) { void nacitajSkutkyStranky(stranka); return "Skutok sa nepodarilo uložiť. Skontrolujte pripojenie a skúste znova."; }
  return null;
}

// OPRAVY 436 · skutok charity na Domove (prispevok, zapísaný pri zverejnení) — úprava a zmazanie aj na serveri
export async function upravSkutokVoFeede(prispevokId: string | undefined, z: { titul: string; popis: string }): Promise<void> {
  if (!supabase || !prispevokId) return;
  await supabase.from("prispevok").update({ titul: z.titul, popis: z.popis }).eq("id", prispevokId);
}
export async function zmazSkutokZFeedu(prispevokId: string | undefined): Promise<void> {
  if (!supabase || !prispevokId) return;
  await supabase.from("prispevok").delete().eq("id", prispevokId);
}

/** OPRAVY 448 (3) · 0144: zverejnené skutky charít, pri ktorých som bol (sken Môj QR alebo potvrdená pozvánka) — do denníka */
export async function skutkyKdeSomPomahal(): Promise<MojSkutok[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("skutky_kde_som_pomahal");
  if (error || !data) return [];
  return (data as { skutok: string; stranka: string; od: string; data: MojSkutok; vytvorene: string }[]).map((r) => ({
    ...r.data, id: `pom-${r.skutok}`, za: r.od, karma: null, stav: "ok" as MojSkutok["stav"], fotky: r.data.fotky ?? [],
    det: `Pomáhal(a) si s ${r.od}.`, datum: r.data.datum || new Date(r.vytvorene).getTime(),
  }));
}
