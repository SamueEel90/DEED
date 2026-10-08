// ============================================================
// Karta 56E · migrácia 0066 — každý dar na zbierku stránky sa zapíše do ledgera cez rpc zbierka_dar.
// Pravidlo bez výnimiek: čo sa počíta, existuje ako pohyb. Podiely (príjemca, overovateľ, podelené)
// alebo celý dar na účet stránky rozhodne server. Volá ho len zápis daru (lib/darcovia → pridajDar).
//  · spustená zbierka stránky: id „zb-…" (riadok v tabuľke zbierka)
//  · hlavná a sektorová zbierka stránky: id „<stránka>:hlavna" / „<stránka>:<sektor>" — riadok založí server pri prvom dare
// 0067: počítadlá a zoznam darcov takejto zbierky čítajú len z ledgera (nacitajDaryZbierky).
// ============================================================
import { supabase } from "./supabase";
import type { KanalDaru } from "./darcovia";

/** zbierka stránky, ktorá nemá vlastný riadok „zb-…" */
export interface ObjektZbierky { stranka: string; hlavna: boolean; nazov: string }

// Prepočet DeeD ↔ €: dočasne ostáva doterajší (1 DeeD = 0,01 €) na jednom mieste.
// Oprava meny a kurzu (EURC vlastná rúra, DEED vlastný kurz) je bod 4 poradia opráv.
export const DEED_ZA_EUR = 100;

// hlavná / sektorová zbierka stránky: obrazovka, ktorá ju ukazuje, povie, ku ktorej stránke patrí
const objekty = new Map<string, ObjektZbierky>();
export function naviazObjekt(refId: string, o: ObjektZbierky) { if (!/^zb-/.test(refId)) objekty.set(refId, o); }

/** id zbierky v databáze, alebo null, ak dar nepatrí zbierke stránky */
export function idZbierkyDB(refId: string, objekt?: ObjektZbierky): string | null {
  if (/^zb-/.test(refId)) return refId;
  objekt = objekt ?? objekty.get(refId);
  if (!objekt) return null;
  return `${objekt.stranka}:${objekt.hlavna ? "hlavna" : refId}`;
}

export async function zapisDarZbierky(refId: string, eur: number, kanal: KanalDaru, objekt?: ObjektZbierky): Promise<void> {
  const id = idZbierkyDB(refId, objekt);
  if (!supabase || !id || !(eur > 0)) return;
  const [dbKanal, mena, suma] = kanal === "deed" ? ["deed", "DEED", Math.round(eur * DEED_ZA_EUR * 10000) / 10000]
    : kanal === "sepa" ? ["sepa", "EUR", eur] : ["fiat", "EUR", eur];
  let idem: string;
  try { idem = crypto.randomUUID(); } catch { idem = `dar-${Date.now()}-${Math.round(Math.random() * 1e9)}`; }
  const { error } = await supabase.rpc("zbierka_dar", {
    p_zbierka: id, p_idem: idem, p_suma: suma, p_mena: mena, p_kanal: dbKanal,
    p_meno_darcu: null, p_stranka: objekt?.stranka ?? null, p_nazov: objekt?.nazov ?? null,
  });
  if (error) throw error;
}

/** dar zbierky tak, ako je v ledgeri (rpc zbierka_dary, 0067) */
export interface DarZLedgera { id: string; cas: number; eur: number; kanal: KanalDaru; meno: string | null; registrovany: boolean; moj: boolean }

export async function nacitajDaryZbierky(id: string): Promise<DarZLedgera[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("zbierka_dary", { p_zbierka: id, p_limit: 200 });
  if (error) throw error;
  const dary = ((data as { dary?: unknown[] } | null)?.dary ?? []) as { id: string; cas: string; mena: string; kanal: string; meno: string | null; registrovany: boolean; moj: boolean; suma: number }[];
  return dary.map((d) => ({
    id: d.id, cas: new Date(d.cas).getTime(), eur: d.mena === "DEED" ? Number(d.suma) / DEED_ZA_EUR : Number(d.suma),
    kanal: d.kanal === "deed" ? "deed" : d.kanal === "sepa" ? "sepa" : "psp", meno: d.meno, registrovany: d.registrovany, moj: d.moj,
  }));
}
