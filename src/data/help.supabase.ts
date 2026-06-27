// ============================================================
// DEED · Help — Supabase repozitár (Fáza G)
// Číta Help riadky z `prispevok` (diskriminátor data.help=true) a mapuje späť
// na modulový tvar (HelpFeedItem). UI/hooky/feed.ts sa nemenia.
// Engine polia (skore/geo/typSituacie/narodne/podpora) sú v STĹPCOCH; modulové
// extra (velkost/odbornik/sponzor/avatar) + pôvodné numerické id a Help typ
// ('charity' round-trip, lebo CHECK pozná len SK 'charita') sú v `data`.
// suma←vyzbierane, ciel←ciel, ludia←pomocnici, overeny←overene.
// ============================================================
import { supabase } from "@/lib/supabase";
import type { HelpFeedItem } from "@/types";

const DEN = 86_400_000;

// vek v dňoch (pre feed.ts životnosť/čerstvosť) — vytvorene je backdatované o `dni`
function dniZ(ts?: string): number {
  if (!ts) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / DEN));
}

/** riadok `prispevok` (data.help) → HelpFeedItem (SK slovník karty). */
function naHelpItem(r: any): HelpFeedItem {
  const d = r.data || {};
  const m = r.media || {};
  const fotky: string[] | undefined = Array.isArray(m.fotky) && m.fotky.length ? m.fotky : undefined;
  return {
    id: Number(d.id),               // pôvodné numerické id (kľúč + detail/search lookup)
    typ: d.typ,                     // pôvodný Help typ (ziadost/ponuka/charity) — feed + render
    nazov: r.autor_nazov,
    pribeh: r.popis,
    ikona: r.emoji,
    velkost: d.velkost,
    lok: r.lok || undefined,
    karma: r.autor_karma || undefined,
    overeny: !!r.overene,
    odbornik: d.odbornik,
    sponzor: d.sponzor,             // boolean | {meno, suma}
    avatar: d.avatar,
    suma: r.vyzbierane != null ? Number(r.vyzbierane) : undefined,
    ciel: r.ciel != null ? Number(r.ciel) : undefined,
    ludia: r.pomocnici ?? undefined,
    fotky,
    // engine meta (pripravFeed)
    skore: Number(r.skore),
    typSituacie: r.typ_situacie,
    modul: r.modul,
    kat: r.kat,
    narodne: !!r.narodne,
    dni: dniZ(r.vytvorene),
    podpora: r.podpora_count ?? undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
  } as HelpFeedItem;
}

export const helpSupabase = {
  async feed(): Promise<HelpFeedItem[]> {
    if (!supabase) return [];
    // len Help riadky (data.help=true). Okruh/prah/zoradenie rieši klient (pripravFeed);
    // tu len stabilné poradie podľa skóre.
    const { data, error } = await supabase
      .from("prispevok")
      .select("*")
      .not("data->>help", "is", null)
      .order("skore", { ascending: false });
    if (error) throw error;
    return (data || []).map(naHelpItem);
  },
};
