// ============================================================
// OPRAVY 383 (0119) · Prihlásenie na stretnutie detí a mládeže — mená nie sú verejné.
// S DB: počty verejne (deti_pocty), mená len rodič (svoje) a farár (deti_prihlasenie); zápis len deti_prihlas.
// Bez DB (ukážka): ako doteraz cez reakcie farnosti (pole „ucast“ + mena).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { reakcieF, prepniReakciuF } from "./reakcieFarnosti";
import { jeVzor } from "@/lib/vzorStranky";

type Riadok = { ref: string; ucet: string; meno: string | null };
const pocty = new Map<string, Record<string, number>>();
const riadky = new Map<string, Riadok[]>();
let ver = 0;
const posl = new Set<() => void>();
const zmena = () => { ver++; posl.forEach((f) => f()); };

export async function obnovDeti(stranka: string): Promise<void> {
  if (!supabase || jeVzor(stranka)) return;
  const [p, r] = await Promise.all([
    supabase.rpc("deti_pocty", { p_stranka: stranka }),
    supabase.from("deti_prihlasenie").select("ref,ucet,meno").eq("stranka", stranka),
  ]);
  if (!p.error && p.data) pocty.set(stranka, p.data as Record<string, number>);
  if (!r.error && r.data) riadky.set(stranka, r.data as Riadok[]);
  zmena();
}

export function useDetiPrihlasenie(stranka: string) {
  useSyncExternalStore((f) => { posl.add(f); return () => { posl.delete(f); }; }, () => ver);
  useEffect(() => { void obnovDeti(stranka).catch(() => undefined); }, [stranka]);
  return {
    /** počet prihlásených */
    pocet: (ref: string) => (supabase ? pocty.get(stranka)?.[ref] ?? 0 : (reakcieF(stranka, ref).ucast ?? []).length),
    /** som prihlásený (kľúč účtu) */
    ja: (ref: string, kto: string) => (supabase ? (riadky.get(stranka) ?? []).some((x) => x.ref === ref && x.ucet === kto) : (reakcieF(stranka, ref).ucast ?? []).includes(kto)),
    /** mená (vidí farár; rodič len svoje) */
    mena: (ref: string): string[] => (supabase ? (riadky.get(stranka) ?? []).filter((x) => x.ref === ref).map((x) => x.meno || "veriaci")
      : (() => { const r = reakcieF(stranka, ref); return (r.ucast ?? []).map((k) => r.mena?.[k] ?? "veriaci"); })()),
  };
}

/** prihlásiť / odhlásiť; vráti chybu ako text alebo null (OPRAVY 382: chyba pri tlačidle) */
export async function prepniDieta(stranka: string, ref: string, chce: boolean, kto: string, meno?: string): Promise<string | null> {
  if (!supabase) { prepniReakciuF(stranka, ref, "ucast", kto, meno); return null; }
  const { error } = await supabase.rpc("deti_prihlas", { p_stranka: stranka, p_ref: ref, p_chce: chce, p_meno: meno ?? null });
  await obnovDeti(stranka).catch(() => undefined);
  if (!error) return null;
  return /plne/.test(error.message) ? "Miesta sú už obsadené." : /neprihlaseny/.test(error.message) ? "Prihláste sa a skúste znova." : "Nepodarilo sa · Skúsiť znova";
}
