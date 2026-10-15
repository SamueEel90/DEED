// ============================================================
// MODUL VIERA — perzistencia stavu (localStorage + Supabase zrkadlo).
// Správcovské úkony (editácia profilu, rozvrh, viditeľnosť súm, self-add
// konfig) sa ukladajú lokálne A zároveň do tabuľky `naboz_stav` (migrácia
// 0022) — aby sa preniesli na ostatné zariadenia. synchronizujStav(id)
// pri otvorení farnosti stiahne DB stav do LS (last-write-wins).
// Oblasti "prispevky"/"dbsync" majú vlastnú cestu (prispevkyDB.ts).
// Bez DB (mock režim) čisto localStorage — správanie ako doteraz.
// ============================================================
import { supabase } from "@/lib/supabase";

function nacitaj<T>(kluc: string, fallback: T): T {
  try { const s = localStorage.getItem(kluc); return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}
/** OPRAVY 273: vráti false, keď sa zápis nepodaril (plné úložisko) — volajúci nesmie hlásiť „uložené“ */
function uloz(kluc: string, val: unknown): boolean {
  try { localStorage.setItem(kluc, JSON.stringify(val)); return true; } catch { return false; /* LS nedostupné alebo plné */ }
}

// namespace: deed.naboz.<oblast>.<id>
const kluc = (oblast: string, id: string) => `deed.naboz.${oblast}.${id}`;

// oblasti mimo KV zrkadla: prispevky = vlastná tabuľka, dbsync = čisto lokálne
const LOKALNE = new Set(["prispevky", "dbsync"]);

export function nacitajStav<T>(oblast: string, id: string, fallback: T): T {
  return nacitaj<T>(kluc(oblast, id), fallback);
}
export function ulozStav(oblast: string, id: string, val: unknown): boolean {
  const ok = uloz(kluc(oblast, id), val);
  if (supabase && !LOKALNE.has(oblast)) {
    void supabase.from("naboz_stav")
      .upsert({ oblast, id, data: val, upravene: new Date().toISOString() }, { onConflict: "oblast,id" })
      .then(() => undefined, () => undefined); // fire-and-forget (builder beží až po .then)
  }
  return ok;
}
/** OPRAVY 273: zápis, na ktorý sa čaká — s DB rozhoduje server, bez DB zariadenie. Vráti chybu ako text alebo null. */
export async function ulozStavIsto(oblast: string, id: string, val: unknown): Promise<string | null> {
  const ok = uloz(kluc(oblast, id), val);
  if (supabase && !LOKALNE.has(oblast)) {
    const { error } = await supabase.from("naboz_stav").upsert({ oblast, id, data: val, upravene: new Date().toISOString() }, { onConflict: "oblast,id" });
    return error ? "Nepodarilo sa uložiť na server. Skontrolujte pripojenie a skúste znova." : null;
  }
  return ok ? null : "Na zariadení nie je miesto. Uvoľnite miesto alebo zmenšite fotky a skúste znova.";
}

/** Stiahne KV stav farnosti z DB do LS. Vráti true, ak niečo prišlo. */
export async function synchronizujStav(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from("naboz_stav").select("oblast,data").eq("id", id);
  if (error || !data?.length) return false;
  for (const r of data) if (!LOKALNE.has(r.oblast)) uloz(kluc(r.oblast, id), r.data);
  return true;
}

/** OPRAVY 178: stiahne jednu oblasť z DB do LS (čerstvý stav pred zápisom). Vráti true, ak prišla. */
export async function obnovOblast(oblast: string, id: string): Promise<boolean> {
  if (!supabase || LOKALNE.has(oblast)) return false;
  const { data, error } = await supabase.from("naboz_stav").select("data").eq("oblast", oblast).eq("id", id).maybeSingle();
  if (error || !data) return false;
  uloz(kluc(oblast, id), data.data);
  return true;
}
