// ============================================================
// OPRAVY 449 (1) · osobná pozvánka (Môj QR → Pozvánka) — odkaz „<appka>/u/<odkaz>“ otvorí profil usera (migrácia 0143).
// Starý tvar /p/<meno-x> (už poslané pozvánky): keď taká stránka nie je, otvorí sa profil usera s týmto odkazom.
// ============================================================
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { ADRESA } from "./adresa";

export type ProfilOsoby = { odkaz: string; meno: string | null; mesto: string | null; foto: string | null; od: string };

let cache: string | null = null;
/** môj stály odkaz (server ho vytvorí pri prvom volaní); bez servera návrh */
export async function mojOdkaz(navrh: string): Promise<string> {
  if (cache) return cache;
  if (!supabase) return navrh;
  const { data, error } = await supabase.rpc("moj_odkaz", { p_navrh: navrh });
  if (error || !data) return navrh;
  cache = String(data);
  return cache;
}
export const odkazOsoby = (odkaz: string) => `${ADRESA}/u/${encodeURIComponent(odkaz)}`;

export async function profilOsoby(odkaz: string): Promise<ProfilOsoby | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("profil_osoby", { p_odkaz: odkaz });
  if (error || !data) return null;
  return data as ProfilOsoby;
}

// ---- otvorený profil usera (vrstva nad appkou) ----
let otvoreny: string | null = null;
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };
export function otvorOsobu(odkaz: string) { otvoreny = odkaz; zmena(); }
export function zavriOsobu() { otvoreny = null; zmena(); try { if (/^\/(u|p)\//.test(window.location.pathname)) window.history.replaceState(null, "", window.location.origin + "/"); } catch { /* sandbox */ } }
export function useOtvorenaOsoba(): string | null { useSyncExternalStore((f) => { posl.add(f); return () => posl.delete(f); }, () => ver); return otvoreny; }

let zOdkazu = false;
/** adresa prišla s odkazom na usera (/u/…) — appka neukáže bránu, otvorí profil aj hosťovi */
export const prisloSOdkazomOsoby = (): boolean => zOdkazu;
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/u\/([^/?#]+)/);
  if (m) { zOdkazu = true; otvoreny = decodeURIComponent(m[1]).toLowerCase(); }
}

/** môj odkaz v komponente: hneď návrh, po odpovedi servera stály odkaz */
export function useMojOdkaz(navrh: string, prihlaseny: boolean): string {
  const [o, setO] = useState(cache ?? navrh);
  useEffect(() => { if (!prihlaseny) return; let z = true; void mojOdkaz(navrh).then((x) => { if (z) setO(x); }); return () => { z = false; }; }, [navrh, prihlaseny]);
  return o;
}
