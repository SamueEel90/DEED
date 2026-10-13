// ============================================================
// OZNAMY DARCOM — čo príde darcovi zbierky do Oznámení:
// · „dolozene" — charita zverejnila dokladovanie (+ opätovné poďakovanie)
// · „sprava"   — priebežná správa počas zbierky
// Server (0081b): oznam_darcom() rozpošle oznam prihláseným darcom zbierky,
// darca si svoje číta z oznam_darcovi (id „db-…"). Lokálna kópia u autora
// ostáva ako ukážka (demo = aktuálny používateľ je darca).
// ============================================================
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export interface OznamDarcovi {
  id: string;
  zbierkaId: string;
  /** „vysledok" = KARTA 38: výsledok zbierky, posiela systém sám pri ukončení (1. z 2 správ) */
  typ: "dolozene" | "sprava" | "vysledok";
  text?: string;
  datum: string;      // ISO
  precitane?: boolean;
}

const KLUC = "deed.oznamy.darcom";
let cache: OznamDarcovi[] | null = null;
let spolu: OznamDarcovi[] | null = null; // lokálne + zo servera, zoradené (stabilná referencia pre useSyncExternalStore)
const posluchaci = new Set<() => void>();
const subscribe = (f: () => void) => { posluchaci.add(f); return () => posluchaci.delete(f); };

function nacitaj(): OznamDarcovi[] {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KLUC) ?? "[]") as OznamDarcovi[]; } catch { cache = []; }
  return cache;
}
function uloz(v: OznamDarcovi[]) {
  cache = v;
  spolu = null;
  try { localStorage.setItem(KLUC, JSON.stringify(v)); } catch { /* LS nedostupné */ }
  posluchaci.forEach((f) => f());
}

// ---- server (0081b) ----
let zDb: OznamDarcovi[] = [];
const vsetky = () => (spolu ??= [...zDb, ...nacitaj()].sort((a, b) => b.datum.localeCompare(a.datum)));
const ohlas = () => { spolu = null; posluchaci.forEach((f) => f()); };
let stiahnute = false;
async function stiahni() {
  if (!supabase || stiahnute) return;
  stiahnute = true;
  if (!(await supabase.auth.getSession()).data.session) { stiahnute = false; return; }
  const { data, error } = await supabase.from("oznam_darcovi").select("id, zbierka, typ, text, vytvorene, precitane")
    .order("vytvorene", { ascending: false }).limit(100);
  if (error) return; // tabuľka ešte nebeží (0081b) → len lokálne
  zDb = (data ?? []).map((r) => ({ id: `db-${r.id}`, zbierkaId: r.zbierka, typ: r.typ, text: r.text ?? undefined, datum: r.vytvorene, precitane: !!r.precitane }));
  ohlas();
}

export function pridajOznamDarcom(o: Omit<OznamDarcovi, "id" | "datum">) {
  uloz([{ ...o, id: `oz-${Date.now()}`, datum: new Date().toISOString() }, ...nacitaj()]);
  if (supabase) void supabase.rpc("oznam_darcom", { p_zbierka: o.zbierkaId, p_typ: o.typ, p_text: o.text ?? null })
    .then(({ error }) => { if (error) console.warn("Oznam darcom sa nepodarilo rozposlať", error.message); });
}
function precitajVDb(ids: string[]) {
  const cisla = ids.filter((i) => i.startsWith("db-")).map((i) => Number(i.slice(3)));
  if (!supabase || !cisla.length) return;
  void supabase.from("oznam_darcovi").update({ precitane: new Date().toISOString() }).in("id", cisla).then(() => {});
}
export function oznacPrecitany(id: string) {
  if (id.startsWith("db-")) { zDb = zDb.map((o) => (o.id === id ? { ...o, precitane: true } : o)); precitajVDb([id]); ohlas(); return; }
  uloz(nacitaj().map((o) => (o.id === id ? { ...o, precitane: true } : o)));
}
export function oznacVsetkyPrecitane() {
  precitajVDb(zDb.filter((o) => !o.precitane).map((o) => o.id));
  zDb = zDb.map((o) => ({ ...o, precitane: true }));
  uloz(nacitaj().map((o) => ({ ...o, precitane: true })));
}
export function useOznamyDarcom(): OznamDarcovi[] {
  void stiahni();
  return useSyncExternalStore(subscribe, vsetky);
}
