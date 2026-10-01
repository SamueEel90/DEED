// KARTA 34 · OPRAVY 80 — pripnuté položky v Správe charity sa ukladajú do ÚČTU (tabuľka sprava_piny, migrácia 0025).
// Kľúč = prihlásený účet + stránka. Bez DB spojenia (mock/offline režim) appka drží piny len v pamäti relácie.
import { supabase } from "./supabase";
import { PIN_MAX, type PolozkaSpravy } from "@/features/rola/stav";

export const PINY_ZACIATOK: PolozkaSpravy[] = ["zbierky", "skutky", "dobrovolnici"];
const pamat = new Map<string, PolozkaSpravy[]>(); // mock/offline + okamžité zobrazenie pri návrate na obrazovku

/** pripnuté z účtu (alebo štart, keď ešte nič neuložil) */
export async function nacitajPiny(stranka: string): Promise<PolozkaSpravy[]> {
  if (supabase) {
    const { data, error } = await supabase.from("sprava_piny").select("piny").eq("stranka", stranka).maybeSingle();
    if (!error) { const p = (data?.piny as PolozkaSpravy[] | undefined) ?? PINY_ZACIATOK; pamat.set(stranka, p); return p; }
  }
  return pamat.get(stranka) ?? PINY_ZACIATOK;
}
/** posledné známe piny (synchronne, na prvé vykreslenie) */
export const pinyZPamate = (stranka: string): PolozkaSpravy[] => pamat.get(stranka) ?? PINY_ZACIATOK;

export async function ulozPiny(stranka: string, piny: PolozkaSpravy[]): Promise<void> {
  const p = piny.slice(0, PIN_MAX);
  pamat.set(stranka, p);
  if (!supabase) return;
  await supabase.from("sprava_piny").upsert({ stranka, piny: p, aktualizovane: new Date().toISOString() }, { onConflict: "pouzivatel,stranka" });
}

// ---- OPRAVY 95: zbalené sekcie Prehľadu (mobil + tablet) — v tom istom riadku účtu ako pripnuté (stĺpec zbalene, migrácia 0027) ----
export type Zbalenie = Record<string, boolean>; // id sekcie → rozbalená?
const pamatZ = new Map<string, Zbalenie>();
export const zbalenieZPamate = (stranka: string): Zbalenie => pamatZ.get(stranka) ?? {};
export async function nacitajZbalenie(stranka: string): Promise<Zbalenie> {
  if (supabase) {
    const { data, error } = await supabase.from("sprava_piny").select("zbalene").eq("stranka", stranka).maybeSingle();
    if (!error) { const z = (data?.zbalene as Zbalenie | undefined) ?? {}; pamatZ.set(stranka, z); return z; }
  }
  return pamatZ.get(stranka) ?? {};
}
export async function ulozZbalenie(stranka: string, z: Zbalenie): Promise<void> {
  pamatZ.set(stranka, z);
  if (!supabase) return;
  await supabase.from("sprava_piny").upsert({ stranka, zbalene: z, aktualizovane: new Date().toISOString() }, { onConflict: "pouzivatel,stranka" });
}
