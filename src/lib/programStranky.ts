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

// ---- balík 50 · 3 · 0173: pozvaná charita — P3 zadarmo N mesiacov od zverejnenia stránky ----
export interface Pozvana { mesiacov: number; do: string | null }
const pozvane = new Map<string, Pozvana | null>();
const nacitavaP = new Set<string>();
async function nacitajPozvanu(k: string) {
  if (!supabase || nacitavaP.has(k)) return;
  nacitavaP.add(k);
  const { data, error } = await supabase.rpc("pozvana_stranky", { p_stranka: k });
  nacitavaP.delete(k);
  if (!error) { pozvane.set(k, (data as Pozvana | null) ?? null); zmena(); }
}
/** null = nie je pozvaná (alebo bez servera); inak počet mesiacov a dátum konca (null, kým stránka nie je zverejnená) */
export function usePozvana(k: string | null | undefined): Pozvana | null {
  useSyncExternalStore((f) => { posluchaci.add(f); return () => posluchaci.delete(f); }, () => verzia);
  useEffect(() => { if (k && !pozvane.has(k)) void nacitajPozvanu(k); }, [k]);
  return k ? pozvane.get(k) ?? null : null;
}
