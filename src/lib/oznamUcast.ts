// ============================================================
// OPRAVY 431 · prihlásení k oznamu / výzve charity (migrácia 0136, tabuľka oznam_ucast).
// Počet = počet riadkov na serveri (oznam_ucast_pocty), prihlásenie cez oznam_ucast_prihlas (limit, dátum
// a zrušenie kontroluje server). Mená vidí len správca stránky. Bez DB (ukážka) drží appka počty v pamäti.
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

type Stav = { pocet: number; moja: boolean };
const pamat = new Map<string, Stav>();
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };
export const useZmenyUcasti = () => useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);

export const ucast = (id: string): Stav => pamat.get(id) ?? { pocet: 0, moja: false };

/** „6 ľudí už pomáha“ (výzva) · „6 ľudí príde“ (akcia) */
export function pocetText(n: number, vyzva: boolean): string {
  const ludi = n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí";
  return vyzva ? `${n} ${ludi} už ${n >= 2 && n <= 4 ? "pomáhajú" : "pomáha"}` : `${n} ${ludi} ${n >= 2 && n <= 4 ? "prídu" : "príde"}`;
}

export async function nacitajUcasti(ids: string[]): Promise<void> {
  const nove = [...new Set(ids)].filter(Boolean);
  if (!nove.length || !supabase) return;
  const { data, error } = await supabase.rpc("oznam_ucast_pocty", { p_ids: nove });
  if (error || !data) return;
  for (const r of data as { oznam: string; pocet: number; moja: boolean }[]) pamat.set(r.oznam, { pocet: Number(r.pocet) || 0, moja: !!r.moja });
  zmena();
}

/** prihlási prihláseného človeka; vráti chybu (slovenská veta) alebo null */
export async function prihlasNaOznam(id: string): Promise<string | null> {
  if (!supabase) { const s = ucast(id); if (!s.moja) pamat.set(id, { pocet: s.pocet + 1, moja: true }); zmena(); return null; }
  const { data, error } = await supabase.rpc("oznam_ucast_prihlas", { p_oznam: id });
  if (error) return /^[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ]/.test(error.message) && !/[a-z]+_[a-z]+/.test(error.message) ? error.message : "Nepodarilo sa prihlásiť. Skúste znova.";
  pamat.set(id, { pocet: Number(data) || ucast(id).pocet + 1, moja: true });
  zmena();
  return null;
}

/** mená prihlásených — len pre správcu stránky (RLS) */
export async function menaPrihlasenych(id: string): Promise<{ meno: string; kedy: string }[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("oznam_ucast").select("meno, kedy").eq("oznam", id).order("kedy");
  return error ? null : (data as { meno: string; kedy: string }[]);
}
