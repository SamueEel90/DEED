// ============================================================
// OPRAVY 449 (2) · pozvánka ku skutku (migrácia 0143).
// Organizátor: pozvanka_vytvor → odkaz „<appka>/pozvanka/<token>“ (platí 2 hodiny) → pozvanky_skutku ukáže, kto potvrdil.
// Pozvaný: odkaz otvorí rovno okno „… ťa pozýva ku skutku · Bol som pri tom (podržať)“. Bez účtu prihlásenie / registrácia
// a hneď späť na toto okno (token sa pamätá v zariadení 2 hodiny, ako pri overení príjemcu, OPRAVY 338).
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { ADRESA } from "./adresa";

const KLUC = "deed.pozvanka";
const PLATI_MS = 2 * 60 * 60 * 1000;

export type StavPozvanky = { token: string } | null;
let stav: StavPozvanky = null;
let verzia = 0;
const posl = new Set<() => void>();
const zmena = () => { verzia++; posl.forEach((f) => f()); };

function uloz(token: string | null) {
  try { if (token) localStorage.setItem(KLUC, JSON.stringify({ token, cas: Date.now() })); else localStorage.removeItem(KLUC); } catch { /* súkromné okno */ }
}
function pamatany(): string | null {
  try { const x = JSON.parse(localStorage.getItem(KLUC) ?? "null") as { token?: string; cas?: number } | null; return x?.token && Date.now() - (x.cas ?? 0) < PLATI_MS ? x.token : null; } catch { return null; }
}
export function usePozvanka(): StavPozvanky {
  useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => verzia);
  return stav;
}
export function zavriPozvanku() { uloz(null); stav = null; zmena(); }

// /pozvanka/<token> — otvorí okno pozvánky ešte pred prihlásením (adresa sa vráti na „/“)
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/pozvanka\/([a-f0-9]{8,64})/);
  if (m) { try { window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ } uloz(m[1]); stav = { token: m[1] }; }
  else { const t = pamatany(); if (t) stav = { token: t }; }
}

export const odkazPozvanky = (token: string) => `${ADRESA}/pozvanka/${token}`;

export type InfoPozvanky = { nazov: string; od: string; stranka: string | null; plati: boolean; prijata: boolean; moja: boolean; vlastna: boolean };
export async function infoPozvanky(token: string): Promise<InfoPozvanky | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("pozvanka_info", { p_token: token });
  if (error) throw error;
  return (data as InfoPozvanky | null) ?? null;
}
/** „Bol som pri tom“; vráti chybu (veta) alebo null */
export async function prijmiPozvanku(token: string): Promise<string | null> {
  if (!supabase) return "Nie je spojenie so serverom. Skúste znova.";
  const { error } = await supabase.rpc("pozvanka_prijmi", { p_token: token });
  if (!error) return null;
  const m = error.message ?? "";
  if (/neprihlaseny/.test(error.details ?? "") || /prihláste/.test(m)) return "Najprv sa prihláste.";
  return /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(m) && !/[a-z]+_[a-z]+/.test(m) ? m : "Nepodarilo sa potvrdiť. Skúste znova.";
}

/** organizátor: nová pozvánka ku skutku → odkaz; null = bez servera / chyba */
export async function vytvorPozvanku(skutok: string, nazov: string, stranka?: string | null): Promise<{ token: string; odkaz: string } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("pozvanka_vytvor", { p_skutok: skutok, p_nazov: nazov || "Skutok", p_stranka: stranka ?? null });
  if (error || !data) return null;
  return { token: String(data), odkaz: odkazPozvanky(String(data)) };
}
/** organizátor: stav pozvánok skutku (kto potvrdil) */
export async function stavPozvanok(skutok: string): Promise<{ token: string; prijal_meno: string | null; prijate: string | null; plati_do: string }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("pozvanky_skutku", { p_skutok: skutok });
  return error || !data ? [] : (data as { token: string; prijal_meno: string | null; prijate: string | null; plati_do: string }[]);
}
