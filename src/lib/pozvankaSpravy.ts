// ============================================================
// OPRAVY 392 · pozvánka do Správy stránky — Prijať · Odmietnuť (server 0125: práva až po Prijať).
// Prichádza dvoma cestami: upozornenie v zvončeku (odkaz poz:<stránka>:<id>) alebo QR pozvánka /pozvanka/<stránka>/<id>.
// QR adresa sa zapamätá (sessionStorage), aby pozvánka počkala aj cez prihlásenie či registráciu.
// ============================================================
import { supabase } from "./supabase";
import { ADRESA } from "./adresa";

export type Pozvanka = { stranka: string; nazov: string; typ?: string | null; r: string; p?: string | null; stav: "caka" | "prijal" | "odmietol" | "vyprsala";
  /** OPRAVY 524 (0167): čo bude smieť (charita) a kto pridáva */ prava?: string[] | null; od?: { meno?: string; f?: string } | null };
/** OPRAVY 524: pozvánka z QR na mieste nesie token (mení sa každých 15 s) */
export type CielPozvanky = { stranka: string; id: string; t?: string };
const KLUC = "deed.pozvanka";
export const UDALOST_POZVANKA = "deed:pozvanka";
export const odkazPozvanky = (stranka: string, id: number | string) => `${ADRESA}/pozvanka/${encodeURIComponent(stranka)}/${id}`;

if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/pozvanka\/([^/?#]+)\/([^/?#]+)/);
  if (m) {
    const t = new URLSearchParams(window.location.search).get("t") ?? undefined;
    try { sessionStorage.setItem(KLUC, JSON.stringify({ stranka: decodeURIComponent(m[1]), id: decodeURIComponent(m[2]), ...(t ? { t } : {}) })); } catch { /* bez úložiska len táto návšteva */ }
    try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ }
  }
}
/** čakajúca pozvánka z QR (číta sa bez mazania) */
export function cakajucaPozvanka(): CielPozvanky | null {
  try { return JSON.parse(sessionStorage.getItem(KLUC) ?? "null"); } catch { return null; }
}
export function zabudniPozvanku() { try { sessionStorage.removeItem(KLUC); } catch { /* bez úložiska */ } }
/** otvorí okno pozvánky (zo zvončeka) */
export function otvorPozvanku(stranka: string, id: string, t?: string) { window.dispatchEvent(new CustomEvent(UDALOST_POZVANKA, { detail: { stranka, id, ...(t ? { t } : {}) } })); }
/** OPRAVY 524: QR pozvánky naskenovaný v DEED+ (…/pozvanka/<stránka>/<id>[?t=…]) */
export function pozvankaZQr(text: string): CielPozvanky | null {
  const m = text.trim().match(/\/pozvanka\/([^/?#\s]+)\/([^/?#\s]+)(?:\?t=([0-9a-f]{6,20}))?/i);
  return m ? { stranka: decodeURIComponent(m[1]), id: decodeURIComponent(m[2]), ...(m[3] ? { t: m[3].toLowerCase() } : {}) } : null;
}
/** OPRAVY 524: QR na mieste — odkaz s tokenom aktuálnych 15 s */
export const odkazNaMieste = (stranka: string, id: number | string, t: string) => `${odkazPozvanky(stranka, id)}?t=${t}`;
export const oknoNaMieste = (ms = Date.now()) => Math.floor(ms / 15000);
/** token = prvých 10 hex z HMAC-SHA256(kľúč = tajomstvo pozvánky, správa = číslo 15 s okna) — rovnako počíta server (0167) */
export async function tokenNaMieste(tajne: string, okno: number): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(tajne), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(String(okno))));
  return Array.from(s.slice(0, 5), (b) => b.toString(16).padStart(2, "0")).join("");
}
export const noveTajne = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

const CHYBY: Record<string, string> = {
  pozvanka_neexistuje: "Pozvánka už neplatí. Požiadajte toho, kto vás pozval, o novú.",
  pozvanka_neplati: "Pozvánka už neplatí. Požiadajte toho, kto vás pozval, o novú.",
  vyprsala: "Pozvánka vypršala. Požiadajte toho, kto vás pozval, o novú.",
  bez_emailu: "Váš účet nemá e-mail. Prihláste sa e-mailom a skúste znova.",
  neprihlaseny: "Najprv sa prihláste.",
  qr_neplatny: "Tento QR už neplatí. Naskenujte ten, ktorý je práve na obrazovke.",
  uz_v_sprave: "V Správe tejto stránky už ste.",
};
const chyba = (e: { message?: string } | null) => CHYBY[e?.message ?? ""] ?? "Nepodarilo sa. Skúste znova.";

export async function nacitajPozvanku(stranka: string, id: string, t?: string): Promise<{ ok: Pozvanka } | { chyba: string }> {
  if (!supabase) return { chyba: "Pozvánka sa dá prijať len v ostrej verzii so serverom." };
  const { data, error } = await (t ? supabase.rpc("pozvanka_miesto", { p_stranka: stranka, p_id: id, p_t: t }) : supabase.rpc("pozvanka", { p_stranka: stranka, p_id: id })).then((x) => x, () => ({ data: null, error: { message: "" } }));
  return error || !data ? { chyba: chyba(error) } : { ok: data as Pozvanka };
}
export async function odpovedzPozvanke(stranka: string, id: string, prijat: boolean): Promise<string | null> {
  if (!supabase) return "Pozvánka sa dá prijať len v ostrej verzii so serverom.";
  const { error } = await supabase.rpc("pozvanka_odpoved", { p_stranka: stranka, p_id: id, p_prijat: prijat }).then((x) => x, () => ({ error: { message: "" } }));
  return error ? chyba(error) : null;
}
