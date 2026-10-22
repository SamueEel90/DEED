// ============================================================
// 0158 · Prístupové kódy testovacej verzie (Martin 22. 10.)
// Kód vydáva tím DEED (Viac → TÍM DEED → Prístupové kódy). Druh (test / pilot) pozná len server.
// Registrácia: kód je nepovinný, bez kódu je stránka testovacia. Štítok PILOT / TESTOVACIA vidí len správca v Správe.
// Bez databázy (mock) sa nič nerobí: kódy aj štítok sú len na serveri.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type RezimStranky = "test" | "pilot";
export interface KodRiadok { kod: string; druh: RezimStranky; komu: string | null; vytvoreny: string; pouzity: string | null; stranka: string | null; nazov: string | null; typ: string | null; rezim: RezimStranky | null }

/** písanie kódu: veľké písmená, len povolené znaky, pomlčka po štyroch */
export function upravKod(v: string): string {
  const c = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}
export const kodCely = (k: string) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(k);

/** platí kód (nepoužitý)? druh sa neprezradí */
export async function overKod(kod: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("kod_over", { p_kod: kod });
  if (error) throw error;
  return data === true;
}
/** po založení stránky pripne kód; vráti druh */
export async function pripniKod(stranka: string, kod: string): Promise<RezimStranky> {
  if (!supabase) throw new Error("bez_db");
  const { data, error } = await supabase.rpc("kod_uplatni", { p_stranka: stranka, p_kod: kod });
  if (error) throw error;
  return data as RezimStranky;
}

/** štítok v Správe: režim mojej stránky (null = mimo testovacieho režimu alebo bez databázy) */
export function useRezimStranky(stranka: string | null | undefined): RezimStranky | null {
  const [r, setR] = useState<{ k: string; v: RezimStranky | null } | null>(null);
  useEffect(() => {
    if (!supabase || !stranka) return;
    let ziva = true;
    void supabase.rpc("stranka_rezim_moj", { p_stranka: stranka }).then(({ data, error }) => {
      if (ziva) setR({ k: stranka, v: !error && (data === "test" || data === "pilot") ? data : null });
    });
    return () => { ziva = false; };
  }, [stranka]);
  return r && r.k === stranka ? r.v : null;
}

// ---- tím DEED ----
const chybaAdmina = (e: { message?: string }) => new Error(/nie_admin/.test(e.message ?? "") ? "Len pre tím DEED." : /kody_vypnute/.test(e.message ?? "") ? "Kódy sú po ostrom štarte vypnuté." : "Nepodarilo sa. Skontrolujte pripojenie a skúste to znova.");
export async function nacitajKody(): Promise<KodRiadok[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("kod_zoznam");
  if (error) throw chybaAdmina(error);
  return (data as KodRiadok[]) ?? [];
}
export async function vytvorKod(druh: RezimStranky, komu: string): Promise<string> {
  if (!supabase) throw new Error("Kódy fungujú len so serverom.");
  const { data, error } = await supabase.rpc("kod_vytvor", { p_druh: druh, p_komu: komu.trim() || null });
  if (error) throw chybaAdmina(error);
  return data as string;
}
export async function nastavRezim(stranka: string, rezim: RezimStranky): Promise<void> {
  if (!supabase) throw new Error("Kódy fungujú len so serverom.");
  const { error } = await supabase.rpc("stranka_rezim_nastav", { p_stranka: stranka, p_rezim: rezim });
  if (error) throw chybaAdmina(error);
}
