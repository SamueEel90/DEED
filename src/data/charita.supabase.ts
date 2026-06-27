// ============================================================
// DEED · Charita — Supabase repozitár
// Číta charita-page `prispevok` (riadky s `data.comp`), `adresar_charita`
// a zbierku (uloženú v urgent riadku) → mapuje späť na modulový tvar
// (CharitaFeedItem/AdresarSekcia/Zbierka). UI/hooky/feed.ts sa nemenia.
// Fáza 4 — krok B.
// ============================================================
import { supabase } from "@/lib/supabase";
import type { CharitaFeedItem, AdresarSekcia, AdresarPolozkaTuple, Zbierka } from "@/types";

const DEN = 86_400_000;

// vek v dňoch (pre feed.ts životnosť/čerstvosť)
function dniZ(ts?: string): number {
  if (!ts) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / DEN));
}

/** riadok `prispevok` (charita-page) → CharitaFeedItem. `comp` riadi render karty. */
function naCharitaItem(r: any): CharitaFeedItem {
  const d = r.data || {};
  const m = r.media || {};
  const fotky: string[] | undefined = Array.isArray(m.fotky) && m.fotky.length ? m.fotky : undefined;
  return {
    id: r.id,                       // uuid (stabilný kľúč)
    comp: d.comp,                   // urgent | top | mala | zapoj | material | data
    typ: r.typ,
    modul: r.modul,
    kat: r.kat,
    skore: Number(r.skore),
    typSituacie: r.typ_situacie,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    dni: dniZ(r.vytvorene),
    podpora: r.podpora_count ?? undefined,
    narodne: !!r.narodne,
    // obsah pre dátovú kartu (comp: "data")
    nazov: r.autor_nazov || r.titul || undefined,
    popis: r.popis || undefined,
    emoji: r.emoji || undefined,
    fotky,
    vyzbierane: r.vyzbierane != null ? Number(r.vyzbierane) : undefined,
    ciel: r.ciel != null ? Number(r.ciel) : undefined,
    overena: !!r.overene,
    tag: d.tag || undefined,
    badgeL: d.badgeL || undefined,
    lok: r.lok || undefined,
  } as CharitaFeedItem;
}

/** ploché riadky adresára → sekcie (zoskupenie podľa `sekcia`, chipy zo sekcie). */
function naAdresar(rows: any[]): AdresarSekcia[] {
  const mapa = new Map<string, AdresarSekcia>();
  for (const r of rows) {
    let sek = mapa.get(r.sekcia);
    if (!sek) {
      sek = { sekcia: r.sekcia, chipy: r.chipy || [], polozky: [] };
      mapa.set(r.sekcia, sek);
    }
    sek.polozky.push([r.skratka, r.nazov, r.popis, r.level, r.ponuky] as AdresarPolozkaTuple);
  }
  return [...mapa.values()];
}

export const charitaSupabase = {
  async feed(): Promise<CharitaFeedItem[]> {
    if (!supabase) return [];
    // len kurátorský charita-page feed (riadky s `data.comp`)
    const { data, error } = await supabase
      .from("prispevok")
      .select("*")
      .not("data->>comp", "is", null)
      .order("skore", { ascending: false });
    if (error) throw error;
    return (data || []).map(naCharitaItem);
  },

  async adresar(): Promise<AdresarSekcia[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("adresar_charita")
      .select("*")
      .eq("aktivny", true)
      .order("poradie", { ascending: true });
    if (error) throw error;
    return naAdresar(data || []);
  },

  async zbierka(): Promise<Zbierka> {
    if (!supabase) throw new Error("Supabase nie je nakonfigurovaný");
    // hlavná zbierka (detail) je uložená v urgent riadku → data.zbierka
    const { data, error } = await supabase
      .from("prispevok")
      .select("data")
      .eq("data->>comp", "urgent")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data?.data?.zbierka ?? null) as Zbierka;
  },
};
