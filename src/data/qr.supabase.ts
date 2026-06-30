// ============================================================
// DEED · QR systém — Supabase repozitár   [Fáza 1]
// `staticPre` zaistí/získa kanonické odkazové QR pre objekt (slug+URL);
// `resolve` premapuje slug → interný objekt (živý deep-link resolver).
// UI volá cez hooky (data/hooks.ts) — nikdy priamo.
// ============================================================
import { supabase } from "@/lib/supabase";
import { qrUrl, vyrobSlug, type QrCiel, type QrStatic, type QrResolved } from "@/lib/qr";

/** Výsledok skenu rotujúceho QR (proof-of-presence). */
export interface ScanVysledok {
  vysledok: "ok" | "replay" | "expired" | "fake" | "out_of_radius";
  event?: string;
  mod?: string;
}
export interface ScanVstup {
  token: string;
  deviceId: string;
  userId?: string | null;
  lat?: number | null;
  lng?: number | null;
}

/** Slug pre objekt: handle/org/branch nesú vlastný identifikátor; ostatné = náhodný slug. */
function slugPre(ciel: QrCiel): string {
  return ciel.druh === "handle" || ciel.druh === "org" || ciel.druh === "branch"
    ? ciel.ref
    : vyrobSlug();
}

export const qrSupabase = {
  /** Zaistí (alebo získa existujúce) statické QR pre objekt → { slug, url }. */
  async staticPre(ciel: QrCiel): Promise<QrStatic> {
    if (!supabase) {
      // offline/mock: deterministicky bez DB (slug = ref / náhodný)
      const slug = slugPre(ciel);
      return { slug, url: qrUrl(ciel.druh, slug) };
    }
    // existuje už kanonické QR pre tento objekt?
    const { data: ex } = await supabase
      .from("qr_kod")
      .select("slug,url")
      .eq("objekt_druh", ciel.druh)
      .eq("objekt_ref", ciel.ref)
      .maybeSingle();
    if (ex) return ex as QrStatic;

    const slug = slugPre(ciel);
    const url = qrUrl(ciel.druh, slug);
    const { data, error } = await supabase
      .from("qr_kod")
      .insert({ typ: "static", objekt_druh: ciel.druh, objekt_ref: ciel.ref, slug, url, modul: ciel.modul ?? null })
      .select("slug,url")
      .single();
    if (error) {
      // súbeh (unique na objekt alebo slug) → znova načítaj kanonický riadok
      const { data: re } = await supabase
        .from("qr_kod")
        .select("slug,url")
        .eq("objekt_druh", ciel.druh)
        .eq("objekt_ref", ciel.ref)
        .maybeSingle();
      if (re) return re as QrStatic;
      throw error;
    }
    return data as QrStatic;
  },

  /** Resolvne slug → interný objekt (deep-link). Null ak neexistuje / offline. */
  async resolve(slug: string): Promise<QrResolved | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("qr_kod")
      .select("objekt_druh,objekt_ref,modul,slug")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as QrResolved | null) ?? null;
  },

  // ---- TOTP proof-of-presence (Fáza 3) ----

  /** Zaisti event-secret (idempotentne) + vráť čerstvý rotujúci token. Secret ostáva na serveri. */
  async eventToken(eventId: string, step = 15, mod = "threshold", nazov?: string): Promise<string | null> {
    if (!supabase) return null;
    await supabase.rpc("event_secret_create", { p_event: eventId, p_step: step, p_mod: mod, p_nazov: nazov ?? null });
    const { data, error } = await supabase.rpc("event_token", { p_event: eventId });
    if (error) throw error;
    return (data as string) ?? null;
  },

  /** Validuj sken rotujúceho QR (sig/okno/replay) + zapíš dochádzku. */
  async scan(v: ScanVstup): Promise<ScanVysledok> {
    if (!supabase) return { vysledok: "ok" };  // offline/mock: demo úspech
    const { data, error } = await supabase.rpc("scan_validate", {
      p_token: v.token, p_device: v.deviceId, p_user: v.userId ?? null,
      p_lat: v.lat ?? null, p_lng: v.lng ?? null,
    });
    if (error) throw error;
    return (data as ScanVysledok) ?? { vysledok: "fake" };
  },
};
