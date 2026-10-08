// ============================================================
// KARTA 57 F · OPRAVY 172 — štatistika Editora oznámení (tabuľka editor_vytvorenia, migrácia 0069).
// Každé uloženie (hotovo, doplnené), vlastné parte, tlač a stiahnutý obrázok = jeden zápis cez editor_zapis().
// Appka len zapisuje, prehľad je len pre DEED. Bez DB (mock) sa nič nezapisuje. Chyba zápisu nič nezastaví.
// ============================================================
import { supabase } from "./supabase";
import type { PayloadEditora, TypEditora } from "@/components/EditorOznameni";

export type UdalostEditora = "hotovo" | "doplnene" | "vlastne" | "tlac" | "obrazok";
export interface ZapisEditora {
  udalost: UdalostEditora; typ: TypEditora; sablona?: string | null; rezim?: "rychly" | "plny" | null;
  qr?: boolean; qr_umiestnenie?: "vnutri" | "pas" | null; vlastne?: boolean; qr_miesto?: "pod" | "rohy" | null; papier?: "A4" | "A5" | null;
  kto: "veriaci" | "overovatel" | "farar"; stranka_typ?: string; stranka?: string; pri_zbierke?: boolean;
}
export function zapisEditora(z: ZapisEditora) {
  if (!supabase) return;
  void supabase.rpc("editor_zapis", { p: { ...z, qr: z.typ === "parte" && !!z.qr } }).then(() => undefined, () => undefined);
}
/** zápis z payloadu editora (hotovo / doplnené) */
export function zapisZPayloadu(p: PayloadEditora, kde: Pick<ZapisEditora, "kto" | "stranka_typ" | "stranka" | "pri_zbierke">) {
  if (p.stav !== "hotovo" && p.stav !== "doplnene") return;
  const um = p.qrUmiestnenie;
  zapisEditora({ udalost: p.stav, typ: p.typ, sablona: p.sablona ?? null, rezim: p.rezim === "rychly" ? "rychly" : "plny",
    qr: p.qr === true, qr_umiestnenie: um === "vnutri" || um === "pas" ? um : null, ...kde });
}
