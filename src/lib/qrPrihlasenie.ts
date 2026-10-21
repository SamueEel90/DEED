// ============================================================
// OPRAVY 466 · prihlásenie na PC cez QR z mobilu (server: api/qr-prihlasenie + migrácia 0149)
//  · PC (bez prihlásenia): zalozQr → QR s odkazom <appka>/qp/<token>, tajomstvo ostane v tomto PC;
//    každú 1,5 s sa pýta (stavQr); po potvrdení v mobile dostane jednorazový odkaz a prihlási sa (verifyOtp)
//  · mobil (prihlásený): sken QR (Môj QR → Naskenovať, aj kamera telefónu cez /qp/…) → okno „Prihlásiť počítač?“
//    so zariadením a mestom podľa IP → Podržte a prihláste (qr_prihlasenie_potvrd) alebo Zrušiť
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { ADRESA } from "./adresa";

const vetaChyby = (m: string | undefined, nahrada: string) => (m && /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(m) && !/[a-z]+_[a-z]+/.test(m) ? m : nahrada);
export const QR_PRIHLASENIE_S = 120;
export const odkazPrihlasenia = (token: string) => `${ADRESA}/qp/${token}`;
/** token z naskenovaného textu (adresa …/qp/<token>) */
export function kodPrihlaseniaZQr(text: string): string | null {
  const m = text.trim().match(/\/qp\/([A-Za-z0-9_-]{20,80})(?:[/?#]|$)/);
  return m ? m[1] : null;
}

// ---------------- PC ----------------
export type QrPc = { token: string; tajomstvo: string; platiDo: number };
async function api<T>(telo: object): Promise<T> {
  const r = await fetch("/api/qr-prihlasenie", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(telo) });
  const d = (await r.json().catch(() => ({}))) as T & { sprava?: string };
  if (!r.ok) throw new Error(d.sprava || "Prihlásenie mobilom teraz nefunguje. Prihláste sa e-mailom a heslom.");
  return d;
}
export async function zalozQr(zariadenie: string): Promise<QrPc> {
  const d = await api<{ token: string; tajomstvo: string; platiDo: string }>({ akcia: "zaloz", zariadenie });
  return { token: d.token, tajomstvo: d.tajomstvo, platiDo: Date.parse(d.platiDo) };
}
export type StavQr = { stav: "caka" | "vyprsal" | "zrusene" | "pouzite" | "nenajdene" | "bez_emailu" } | { stav: "potvrdene"; tokenHash: string; mesto: string | null };
export const stavQr = (q: QrPc) => api<StavQr>({ akcia: "stav", token: q.token, tajomstvo: q.tajomstvo });
/** jednorazový odkaz zo servera → relácia na tomto PC */
export async function prihlasOdkazom(tokenHash: string): Promise<string | null> {
  if (!supabase) return "Nie je spojenie so serverom.";
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  return error ? "Prihlásenie sa nepodarilo. Naskenujte nový QR." : null;
}

// ---------------- mobil: okno „Prihlásiť počítač?“ ----------------
let token: string | null = null;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
export function usePrihlaseniePc(): string | null { useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver); return token; }
export function otvorPrihlaseniePc(t: string) { token = t; zmena(); }
export function zavriPrihlaseniePc() { token = null; zmena(); }
// odkaz /qp/<token> otvorený kamerou telefónu (mimo appky) → po spustení rovno okno
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/qp\/([A-Za-z0-9_-]{20,80})/);
  if (m) { token = m[1]; try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ } }
}

export type InfoPc = { plati: boolean; pouzite?: boolean; zariadenie?: string; mesto?: string | null; ip?: string | null; vytvorene?: string };
export async function infoPc(t: string): Promise<InfoPc | { chyba: string }> {
  if (!supabase) return { chyba: "Nie je spojenie so serverom." };
  const { data, error } = await supabase.rpc("qr_prihlasenie_info", { p_token: t });
  return error ? { chyba: vetaChyby(error.message, "QR sa nepodarilo načítať. Skúste znova.") } : (data as InfoPc);
}
export async function potvrdPc(t: string): Promise<string | null> {
  if (!supabase) return "Nie je spojenie so serverom.";
  const { error } = await supabase.rpc("qr_prihlasenie_potvrd", { p_token: t });
  return error ? vetaChyby(error.message, "Nepodarilo sa. Skúste znova.") : null;
}
export async function zrusPc(t: string): Promise<void> { if (supabase) await supabase.rpc("qr_prihlasenie_zrus", { p_token: t }); }
