// ============================================================
// DEED · Mapa — Supabase repozitár (Fáza H)
// Reálne body na mape + počty v okruhu: skutky z `prispevok`, udalosti z
// `udalost` (obe filtrované na riadky so súradnicami). Počítanie v okruhu
// (haversine) robí klient z týchto bodov — žiadne PostGIS, žiadne API kľúče.
// ============================================================
import { supabase } from "@/lib/supabase";
import type { MapaBod } from "@/types";

export const mapaSupabase = {
  async body(): Promise<MapaBod[]> {
    if (!supabase) return [];
    const [pr, ud] = await Promise.all([
      supabase.from("prispevok").select("lat,lng,modul,typ").not("lat", "is", null),
      supabase.from("udalost").select("lat,lng").not("lat", "is", null),
    ]);
    if (pr.error) throw pr.error;
    if (ud.error) throw ud.error;
    const skutky: MapaBod[] = (pr.data || []).map((r: any) => ({
      lat: r.lat, lng: r.lng, druh: "skutok", modul: r.modul, typ: r.typ,
    }));
    const udalosti: MapaBod[] = (ud.data || []).map((r: any) => ({
      lat: r.lat, lng: r.lng, druh: "udalost",
    }));
    return [...skutky, ...udalosti];
  },
};
