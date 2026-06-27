// ============================================================
// DEED · Notifikácie — Supabase repozitár (Fáza E)
// Číta `notifikacia` (broadcast: ucet_id IS NULL) → mapuje na Notifikacia
// (ikona→ic, cas timestamptz→relatívny text). Realtime subscribe je v hooks.ts
// (useNotifikacieRealtime) — na INSERT invaliduje query a zoznam sa obnoví.
// ============================================================
import { supabase } from "@/lib/supabase";
import type { Notifikacia } from "@/types";

// timestamptz → relatívny čas pre kartu ("teraz" / "8 min" / "2 h" / "1 d")
function casZ(ts?: string): string {
  if (!ts) return "";
  const min = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (min < 1) return "teraz";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

/** riadok `notifikacia` → Notifikacia (modulový tvar). */
function naNotifikaciu(r: any): Notifikacia {
  return {
    id: Number(r.id),
    kat: r.kat,
    ic: r.ikona || "•",
    col: r.col || "var(--a-info)",
    titul: r.titul,
    text: r.text || "",
    cas: casZ(r.cas),
    nove: !!r.nove,
    agg: !!r.agg,
  };
}

export const notifikacieSupabase = {
  async list(): Promise<Notifikacia[]> {
    if (!supabase) return [];
    // broadcast oznámenia (ucet_id NULL); najnovšie hore. Per-user cielenie
    // pribudne s Auth (Fáza 5) — vtedy sa pridá filter na ucet_id používateľa.
    const { data, error } = await supabase
      .from("notifikacia")
      .select("*")
      .is("ucet_id", null)
      .order("cas", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map(naNotifikaciu);
  },
};
