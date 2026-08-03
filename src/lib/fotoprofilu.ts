// ============================================================
// PROFILOVÁ FOTKA OSOBY — jeden zdroj pravdy pre celú appku.
// Fotka sa nahráva zo zariadenia (FotoUpload → spracujFotku: re-enkód,
// EXIF/GPS preč, orez na štvorec) a ukladá sa ako data-URL:
//  · localStorage (per účet) — funguje aj v mock/offline režime,
//  · Supabase `profil.profilovka_url` — best-effort, aby fotka prešla
//    aj na iné zariadenie (rovnaký vzor ako viera/stav.ts).
// Čítanie ide cez usePouzivatel().foto — komponenty nesiahajú na LS priamo.
// Poznámka: avatar sa zmenšuje na AVATAR_SIRKA px, aby data-URL ostal malý
// (LS má ~5 MB) — hero cover fotky idú inou cestou (FotoUpload 16:9).
// ============================================================
import { supabase } from "./supabase";

/** dlhšia strana avataru po zmenšení — drží data-URL v desiatkach kB */
export const AVATAR_SIRKA = 512;

const kluc = (ucetId?: string | null) => `deed.foto.profil${ucetId ? `.${ucetId}` : ""}`;

export function nacitajFotoProfilu(ucetId?: string | null): string | null {
  try { return localStorage.getItem(kluc(ucetId)); } catch { return null; }
}

/** Uloží (alebo zmaže pri null) fotku lokálne a best-effort do DB. */
export function ulozFotoProfilu(ucetId: string | null | undefined, dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(kluc(ucetId), dataUrl);
    else localStorage.removeItem(kluc(ucetId));
  } catch { /* LS nedostupné (private mode) — fotka ostane len v pamäti */ }
  if (supabase && ucetId) {
    void supabase.from("profil")
      .upsert({ ucet_id: ucetId, profilovka_url: dataUrl, aktualizovane: new Date().toISOString() }, { onConflict: "ucet_id" })
      .then(() => undefined, () => undefined); // fire-and-forget (builder beží až po .then)
  }
}
