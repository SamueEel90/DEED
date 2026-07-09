// ============================================================
// DEED · Osobné funkcie — DB-aware vrstva (Fáza 5)
// Správy „Ozvať sa", nahlásenia, RSVP a zostatok peňaženky.
// Poradie: ak je Supabase klient (živá DB + session) → zápis/čítanie do DB
// (tabuľky z migrácie 0019, owner-only RLS, kľúčované na auth.uid()).
// Inak → localStorage fallback (mock/offline) — funkčne identické, nič sa nestratí.
//
// Session zaisťuje anon-auth bootstrap (lib/auth.ts `zaistiSession`) — každý
// návštevník (aj hosť) dostane anonymné auth konto, takže DB pozná „kto".
// ============================================================
import { supabase } from "./supabase";

// máme reálne DB spojenie? (klient existuje = USE_SUPABASE aj env sú OK)
const maDB = () => !!supabase;

// ---- localStorage helpers (fallback) ----
function lsGet<T>(kluc: string, fallback: T): T {
  try { const s = localStorage.getItem(kluc); return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}
function lsSet(kluc: string, val: unknown) {
  try { localStorage.setItem(kluc, JSON.stringify(val)); } catch { /* LS nedostupné */ }
}

// ============ SPRÁVY („Ozvať sa") ============
const SPRAVY_LS = "deed.spravy.v1";
export interface OdoslanaSprava { komu: string; refId?: string | number; modul?: string; sprava: string; kedy: string; }

export async function poslatSpravu(s: OdoslanaSprava): Promise<void> {
  if (maDB()) {
    const { error } = await supabase!.from("sprava").insert({
      komu_text: s.komu, ref_id: s.refId != null ? String(s.refId) : null, modul: s.modul ?? null, sprava: s.sprava,
    });
    if (!error) return;               // úspech → hotovo; chyba → fallback nižšie (nič sa nestratí)
  }
  const vsetky = lsGet<OdoslanaSprava[]>(SPRAVY_LS, []);
  vsetky.unshift(s);
  lsSet(SPRAVY_LS, vsetky.slice(0, 100));
}

// ============ NAHLÁSENIA ============
const NAHLAS_LS = "deed.nahlasenia.v1";
export type NahlasDovod = "podvod" | "urazlive" | "spam" | "ine";
export interface Nahlasenie { co: string; refId?: string | number; modul?: string; dovod: NahlasDovod; poznamka?: string; kedy: string; }

export async function nahlasit(n: Nahlasenie): Promise<void> {
  if (maDB()) {
    const { error } = await supabase!.from("nahlasenie").insert({
      co_text: n.co, ref_id: n.refId != null ? String(n.refId) : null, modul: n.modul ?? null, dovod: n.dovod, poznamka: n.poznamka ?? null,
    });
    if (!error) return;
  }
  const vsetky = lsGet<Nahlasenie[]>(NAHLAS_LS, []);
  vsetky.unshift(n);
  lsSet(NAHLAS_LS, vsetky.slice(0, 100));
}

// ============ RSVP (účasť na udalosti) ============
const RSVP_LS = "deed.nab.rsvp";

/** Množina ref_id, na ktoré je používateľ prihlásený (v danom module). */
export async function nacitajRsvp(modul = "nabozenstvo"): Promise<Set<string>> {
  if (maDB()) {
    const { data, error } = await supabase!.from("rsvp").select("ref_id").eq("modul", modul);
    if (!error && data) return new Set(data.map((r) => String(r.ref_id)));
  }
  return new Set(lsGet<string[]>(RSVP_LS, []));
}

/** Prepni účasť; vráti nový stav (true = idem). */
export async function prepniRsvp(refId: string, modul = "nabozenstvo"): Promise<boolean> {
  if (maDB()) {
    const { data } = await supabase!.from("rsvp").select("id").eq("ref_id", refId).eq("modul", modul).maybeSingle();
    if (data?.id) { await supabase!.from("rsvp").delete().eq("id", data.id); return false; }
    const { error } = await supabase!.from("rsvp").insert({ ref_id: refId, modul });
    if (!error) return true;
    // chyba → fallback nižšie
  }
  const s = new Set(lsGet<string[]>(RSVP_LS, []));
  const idem = s.has(refId);
  if (idem) s.delete(refId); else s.add(refId);
  lsSet(RSVP_LS, [...s]);
  return !idem;
}

// ============ PEŇAŽENKA (mock zostatok DEED) ============
const ZOSTATOK_LS = "deed.wallet.zostatok";
const VYCHODZI_ZOSTATOK = 1240;

export async function nacitajZostatok(): Promise<number> {
  if (maDB()) {
    const { data, error } = await supabase!.from("penazenka").select("zostatok_deed").maybeSingle();
    if (!error) return data ? Number(data.zostatok_deed) : VYCHODZI_ZOSTATOK;
  }
  const n = Number(lsGet<number>(ZOSTATOK_LS, VYCHODZI_ZOSTATOK));
  return Number.isFinite(n) && n > 0 ? n : VYCHODZI_ZOSTATOK;
}

/** Dobitie (mock kúpa DEED kartou) — pripíše a vráti nový zostatok. */
export async function dobitPenazenku(deed: number): Promise<number> {
  if (maDB()) {
    const { data, error } = await supabase!.rpc("penazenka_dobit", { p_deed: deed });
    if (!error && data != null) return Number(data);
  }
  const nove = (await nacitajZostatok()) + deed;
  lsSet(ZOSTATOK_LS, nove);
  return nove;
}
