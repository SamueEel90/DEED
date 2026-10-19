// ============================================================
// OPRAVY 392 · pozvánka do Správy stránky — Prijať · Odmietnuť (server 0125: práva až po Prijať).
// Prichádza dvoma cestami: upozornenie v zvončeku (odkaz poz:<stránka>:<id>) alebo QR pozvánka /pozvanka/<stránka>/<id>.
// QR adresa sa zapamätá (sessionStorage), aby pozvánka počkala aj cez prihlásenie či registráciu.
// ============================================================
import { supabase } from "./supabase";
import { ADRESA } from "./adresa";

export type Pozvanka = { stranka: string; nazov: string; r: string; p?: string | null; stav: "caka" | "prijal" | "odmietol" | "vyprsala" };
const KLUC = "deed.pozvanka";
export const UDALOST_POZVANKA = "deed:pozvanka";
export const odkazPozvanky = (stranka: string, id: number | string) => `${ADRESA}/pozvanka/${encodeURIComponent(stranka)}/${id}`;

if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/pozvanka\/([^/?#]+)\/([^/?#]+)/);
  if (m) {
    try { sessionStorage.setItem(KLUC, JSON.stringify({ stranka: decodeURIComponent(m[1]), id: decodeURIComponent(m[2]) })); } catch { /* bez úložiska len táto návšteva */ }
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
  }
}
/** čakajúca pozvánka z QR (číta sa bez mazania) */
export function cakajucaPozvanka(): { stranka: string; id: string } | null {
  try { return JSON.parse(sessionStorage.getItem(KLUC) ?? "null"); } catch { return null; }
}
export function zabudniPozvanku() { try { sessionStorage.removeItem(KLUC); } catch { /* bez úložiska */ } }
/** otvorí okno pozvánky (zo zvončeka) */
export function otvorPozvanku(stranka: string, id: string) { window.dispatchEvent(new CustomEvent(UDALOST_POZVANKA, { detail: { stranka, id } })); }

const CHYBY: Record<string, string> = {
  pozvanka_neexistuje: "Pozvánka už neplatí. Požiadajte farára o novú.",
  pozvanka_neplati: "Pozvánka už neplatí. Požiadajte farára o novú.",
  vyprsala: "Pozvánka vypršala. Požiadajte farára o novú.",
  bez_emailu: "Váš účet nemá e-mail. Prihláste sa e-mailom a skúste znova.",
  neprihlaseny: "Najprv sa prihláste.",
};
const chyba = (e: { message?: string } | null) => CHYBY[e?.message ?? ""] ?? "Nepodarilo sa. Skúste znova.";

export async function nacitajPozvanku(stranka: string, id: string): Promise<{ ok: Pozvanka } | { chyba: string }> {
  if (!supabase) return { chyba: "Pozvánka sa dá prijať len v ostrej verzii so serverom." };
  const { data, error } = await supabase.rpc("pozvanka", { p_stranka: stranka, p_id: id }).then((x) => x, () => ({ data: null, error: { message: "" } }));
  return error || !data ? { chyba: chyba(error) } : { ok: data as Pozvanka };
}
export async function odpovedzPozvanke(stranka: string, id: string, prijat: boolean): Promise<string | null> {
  if (!supabase) return "Pozvánka sa dá prijať len v ostrej verzii so serverom.";
  const { error } = await supabase.rpc("pozvanka_odpoved", { p_stranka: stranka, p_id: id, p_prijat: prijat }).then((x) => x, () => ({ error: { message: "" } }));
  return error ? chyba(error) : null;
}
