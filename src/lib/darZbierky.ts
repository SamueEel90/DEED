// ============================================================
// Karta 56E · migrácia 0066 — každý dar na zbierku stránky sa zapíše do ledgera cez rpc zbierka_dar.
// Pravidlo bez výnimiek: čo sa počíta, existuje ako pohyb. Podiely (príjemca, overovateľ, podelené)
// alebo celý dar na účet stránky rozhodne server. Volá ho len zápis daru (lib/darcovia → pridajDar).
//  · spustená zbierka stránky: id „zb-…" (riadok v tabuľke zbierka)
//  · hlavná a sektorová zbierka stránky: id „<stránka>:hlavna" / „<stránka>:<sektor>" — riadok založí server pri prvom dare
// 1 DeeD = 0,01 € (appka posiela hodnotu daru v eurách).
// ============================================================
import { supabase } from "./supabase";
import type { KanalDaru } from "./darcovia";

/** zbierka stránky, ktorá nemá vlastný riadok „zb-…" */
export interface ObjektZbierky { stranka: string; hlavna: boolean; nazov: string }

/** id zbierky v databáze, alebo null, ak dar nepatrí zbierke stránky */
export function idZbierkyDB(refId: string, objekt?: ObjektZbierky): string | null {
  if (/^zb-/.test(refId)) return refId;
  if (!objekt) return null;
  return `${objekt.stranka}:${objekt.hlavna ? "hlavna" : refId}`;
}

export async function zapisDarZbierky(refId: string, eur: number, kanal: KanalDaru, objekt?: ObjektZbierky): Promise<void> {
  const id = idZbierkyDB(refId, objekt);
  if (!supabase || !id || !(eur > 0)) return;
  const [dbKanal, mena, suma] = kanal === "deed" ? ["deed", "DEED", Math.round(eur * 100 * 10000) / 10000]
    : kanal === "sepa" ? ["sepa", "EUR", eur] : ["fiat", "EUR", eur];
  let idem: string;
  try { idem = crypto.randomUUID(); } catch { idem = `dar-${Date.now()}-${Math.round(Math.random() * 1e9)}`; }
  const { error } = await supabase.rpc("zbierka_dar", {
    p_zbierka: id, p_idem: idem, p_suma: suma, p_mena: mena, p_kanal: dbKanal,
    p_meno_darcu: null, p_stranka: objekt?.stranka ?? null, p_nazov: objekt?.nazov ?? null,
  });
  if (error) throw error;
}
