// ============================================================
// OPRAVY 432 · program stránky (0 Zadarmo · 1 P1 · 2 P2 · 3 P3 · 4) z jedného miesta pre verejný profil:
// server stranka_program cez program_stranky() (migrácia 0137). Bez DB alebo bez riadku = Zadarmo.
// Testovací prepínač Program (Správa → TESTOVACIE) ho na tomto zariadení prebije (rieši volajúci).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";

const pamat = new Map<string, number>();
const nacitava = new Set<string>();
let verzia = 0;
const posluchaci = new Set<() => void>();
const zmena = () => { verzia++; posluchaci.forEach((f) => f()); };

async function nacitaj(k: string) {
  if (!supabase || nacitava.has(k)) return;
  nacitava.add(k);
  const { data, error } = await supabase.rpc("program_stranky", { p_stranka: k });
  nacitava.delete(k);
  if (!error && data != null) { pamat.set(k, Number(data) || 0); zmena(); }
}
/** program stránky zo servera (kým nepríde, Zadarmo — nič platené sa neukáže omylom) */
export function useProgramStranky(k: string | null | undefined): number {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  useEffect(() => { if (k && !pamat.has(k)) void nacitaj(k); }, [k]);
  return k ? pamat.get(k) ?? 0 : 0;
}
