// ============================================================
// Supabase klient (testovacia DB)
// Env premenné (Vite): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// Hodnoty sú v .env.local (negitované). Ak chýbajú, appka beží ďalej
// v "offline" režime — supabase === null a všetko ide na mock.
//
// TEST-FÁZA VYPÍNAČ: VITE_USE_MOCK=1 (v .env.local) → appka beží 100 %
// na mock dátach. Žiadne volania na Supabase (REST/Auth/Realtime) →
// žiadne CORS/sieťové chyby, keď je backend uspatý/nedostupný.
// Späť na živú DB: VITE_USE_MOCK=0 (alebo riadok zmaž) + reštart dev servera.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// vynútený mock (test fáza) — akceptuje 1/true/yes/on
const FORCE_MOCK = ["1", "true", "yes", "on"].includes(
  String(import.meta.env.VITE_USE_MOCK ?? "").trim().toLowerCase()
);

/** Env je nakonfigurované (URL + kľúč). Nezávisí od FORCE_MOCK — pre presné hlášky. */
export const supabaseReady: boolean = Boolean(url && anonKey);

/** Smie sa reálne sieťovať? = env je + nie je vynútený mock. Týmto sa riadi
 *  dátová vrstva (repo) aj auth-boot (App). FORCE_MOCK ho vypne. */
export const USE_SUPABASE: boolean = supabaseReady && !FORCE_MOCK;

/** Klient je null v mock/offline režime → každý `if (!supabase)` / `supabase?.`
 *  guard sa stane no-op (auth, realtime, personalizácia) — nulová sieť. */
export const supabase: SupabaseClient | null = USE_SUPABASE ? createClient(url!, anonKey!) : null;

if (import.meta.env.DEV) {
  if (!supabaseReady) console.warn("[DEED] Supabase nie je nakonfigurovaný — chýba VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env.local).");
  else if (FORCE_MOCK) console.info("[DEED] VITE_USE_MOCK=1 → appka beží na MOCK dátach (Supabase je vypnutý, žiadne CORS chyby).");
}
