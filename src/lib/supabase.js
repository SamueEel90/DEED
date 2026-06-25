// ============================================================
// Supabase klient (testovacia DB)
// Env premenné (Vite): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// Hodnoty sú v .env.local (negitované). Ak chýbajú, appka beží ďalej
// v "offline" režime — supabaseReady === false a supabase === null.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && anonKey);

export const supabase = supabaseReady ? createClient(url, anonKey) : null;

if (!supabaseReady && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    "[DEED] Supabase nie je nakonfigurovaný — chýba VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env.local)."
  );
}
