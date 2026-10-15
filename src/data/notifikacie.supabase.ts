// ============================================================
// DEED · Notifikácie — Supabase repozitár (Fáza E)
// Číta `notifikacia` (broadcast + vlastné podľa RLS) → mapuje na Notifikacia
// (ikona→ic, cas timestamptz→relatívny text). Realtime subscribe je v hooks.ts
// (useNotifikacieRealtime) — na INSERT invaliduje query a zoznam sa obnoví.
// ============================================================
import { supabase } from "@/lib/supabase";
import type { Notifikacia } from "@/types";

const IKONY = ["ok", "srd", "otaz", "stit", "ret", "lud", "kal", "dok", "ciel", "sum", "deed", "namiet"];
const KAT_STARE: Record<string, Notifikacia["kat"]> = { penazenka: "penaze", sledovane: "zbierky", socialne: "ludia" };
const KAT_IKONA: Record<Notifikacia["kat"], Notifikacia["ikona"]> = { skutky: "ok", skupina: "lud", penaze: "sum", zbierky: "ciel", ludia: "lud", deed: "deed", firma: "kal" };
const KAT_TON: Record<Notifikacia["kat"], Notifikacia["ton"]> = { skutky: "g", skupina: "b", penaze: "gold", zbierky: "gold", ludia: "b", deed: "b", firma: "gold" };

// timestamptz → deň skupiny (Dnes · Včera · 27. 9.) + čas (dnes relatívne, inak hh:mm)
function denCas(ts?: string): { den: string; cas: string } {
  if (!ts) return { den: "Dnes", cas: "" };
  const d = new Date(ts), t = new Date();
  const dni = Math.round((new Date(t.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (dni === 0) {
    const min = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
    return { den: "Dnes", cas: min < 1 ? "teraz" : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h` };
  }
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { den: dni === 1 ? "Včera" : `${d.getDate()}. ${d.getMonth() + 1}.`, cas: hm };
}

/** riadok `notifikacia` → Notifikacia (modulový tvar). */
function naNotifikaciu(r: any): Notifikacia {
  const kat: Notifikacia["kat"] = KAT_STARE[r.kat] ?? r.kat ?? "deed";
  return {
    id: Number(r.id),
    kat,
    ikona: IKONY.includes(r.ikona) ? r.ikona : KAT_IKONA[kat] ?? "deed",
    ton: r.ton === "g" || r.ton === "b" || r.ton === "gold" ? r.ton : KAT_TON[kat] ?? "b",
    titul: r.titul,
    text: r.text || "",
    ...denCas(r.cas),
    nove: !!r.nove,
    agg: !!r.agg,
    akcie: Array.isArray(r.akcie) ? r.akcie : undefined,
    odkaz: typeof r.odkaz === "string" && r.odkaz ? r.odkaz : undefined, // OPRAVY 315 (0097)
  };
}

export const notifikacieSupabase = {
  async list(): Promise<Notifikacia[]> {
    if (!supabase) return [];
    // broadcast (ucet_id NULL) + moje (upozornenia z farností, platby …); najnovšie hore.
    // Filter robí RLS (0055: ucet_id is null or = moj_ucet()).
    const { data, error } = await supabase
      .from("notifikacia")
      .select("*")
      .order("cas", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []).map(naNotifikaciu);
  },
};
