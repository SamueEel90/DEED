// ============================================================
// OPRAVY 352 — pravidelná podpora na serveri (0109): kto, suma, od kedy, zrušenie.
// Bez DB (mock) sa nič neukladá (hárok si ju drží v prehliadači ako doteraz).
// ============================================================
import { supabase } from "./supabase";
import { idZbierkyDB } from "./darZbierky";

const chyba = (code: string | undefined, m: string) =>
  code === "PGRST202" || code === "42883" || /could not find the function|does not exist/i.test(m) ? "Ukladanie pravidelnej podpory ešte nie je zapnuté na serveri"
  : /neprihlaseny/.test(m) ? "Najprv sa prihláste" : /zbierka_neexistuje/.test(m) ? "Zbierka sa nenašla" : /neplatna_suma/.test(m) ? "Neplatná suma"
  : /fetch|network/i.test(m) ? "Nie je spojenie so serverom" : m || "Pravidelnú podporu sa nepodarilo uložiť";

/** zapne pravidelnú podporu zbierky; vráti chybu (text) alebo null */
export async function pravidelnaZapni(refId: string, suma: number, mena: "EUR" | "EURC", perioda: "tyzdenne" | "mesacne" | "rocne"): Promise<string | null> {
  if (!supabase) return null;
  const zbierka = idZbierkyDB(refId);
  if (!zbierka) return null; // objekt mimo ledgera (ukážka) — nie je čo uložiť
  const { error } = await supabase.rpc("pravidelna_zapni", { p_zbierka: zbierka, p_suma: suma, p_mena: mena, p_perioda: perioda });
  return error ? chyba(error.code, error.message ?? "") : null;
}

/** zruší pravidelnú podporu (len vlastnú); vráti chybu (text) alebo null */
export async function pravidelnaZrus(id: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("pravidelna_zrus", { p_id: id });
  return error ? chyba(error.code, error.message ?? "") : data ? null : "Pravidelná podpora sa nenašla";
}
