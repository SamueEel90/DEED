// ============================================================
// MOJE DATA — drobné osobné veci z localStorage zrkadlené do účtu (moje_data, 0084b).
// Modul si kľúč zaregistruje (s funkciou, ktorá ho po stiahnutí znova načíta) a po
// každom lokálnom zápise zavolá zmenene(kluc). Po prihlásení: účet má prednosť,
// čo v účte chýba, doplní sa z tohto prehliadača (ak ho nepoužíval iný účet).
// Bez DB / demo / odhlásený = všetko ostáva len lokálne.
// ============================================================
import { useEffect } from "react";
import { supabase } from "./supabase";

const obnovy = new Map<string, () => void>();
const VLASTNIK = "deed.mojeData.vlastnik";
let vUcte: string | null = null;

/** modul: „tento kľúč patrí do účtu", obnov = znova načítaj z localStorage + ohlás zmenu */
export function zaregistrujKluc(kluc: string, obnov: () => void) { obnovy.set(kluc, obnov); }

const citaj = (kluc: string): unknown => { try { const s = localStorage.getItem(kluc); return s == null ? null : JSON.parse(s); } catch { return null; } };

const casovace = new Map<string, ReturnType<typeof setTimeout>>();
/** modul práve zapísal kľúč do localStorage → pošli do účtu (s oneskorením) */
export function zmenene(kluc: string) {
  if (!supabase || !vUcte) return;
  clearTimeout(casovace.get(kluc));
  casovace.set(kluc, setTimeout(() => { casovace.delete(kluc); void posli(kluc); }, 800));
}
async function posli(kluc: string) {
  if (!supabase || !vUcte) return;
  const data = citaj(kluc);
  const { error } = data == null
    ? await supabase.from("moje_data").delete().eq("ucet_id", vUcte).eq("kluc", kluc)
    : await supabase.from("moje_data").upsert({ kluc, data }, { onConflict: "ucet_id,kluc" });
  if (error) console.warn("Nastavenie sa nepodarilo uložiť do účtu", kluc, error.message);
}

async function synchronizuj(ucetId: string) {
  if (!supabase || vUcte === ucetId) return;
  const { data, error } = await supabase.from("moje_data").select("kluc, data");
  if (error) return; // tabuľka ešte nebeží (0084b) → len lokálne
  let cudzi = false;
  try { const v = localStorage.getItem(VLASTNIK); cudzi = !!v && v !== ucetId; localStorage.setItem(VLASTNIK, ucetId); } catch { /* LS */ }
  vUcte = ucetId;
  const zUctu = new Map((data ?? []).map((r) => [r.kluc as string, r.data]));
  for (const [kluc, obnov] of obnovy) {
    if (zUctu.has(kluc)) {
      try { localStorage.setItem(kluc, JSON.stringify(zUctu.get(kluc))); } catch { /* LS */ }
      obnov();
    } else if (cudzi) {
      try { localStorage.removeItem(kluc); } catch { /* LS */ } // nastavenia iného účtu z tohto prehliadača nepreberaj
      obnov();
    } else if (citaj(kluc) != null) void posli(kluc);
  }
}

/** hook pre provider: reálny účet → synchronizuj; odhlásenie / demo → len lokálne */
export function useSynchronizaciaMojichDat(ucetId: string | null) {
  useEffect(() => { if (ucetId) void synchronizuj(ucetId); else vUcte = null; }, [ucetId]);
}
