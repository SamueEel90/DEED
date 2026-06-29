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
  async vytvor(it: HelpFeedItem, autorUcetId?: string | null): Promise<boolean> {
    if (!supabase) return false;
    // Help-specifické polia idú do `data` (diskriminátor help:true); engine polia do stĺpcov.
    // autor_nazov = titul žiadosti (denormalizácia podľa naHelpItem), suma→vyzbierane, ludia→pomocnici.
    const { error } = await supabase.from("prispevok").insert({
      autor_ucet_id: autorUcetId ?? null,
      autor_nazov: it.nazov,
      autor_karma: it.karma ?? null,
      modul: it.modul ?? "help",
      typ: it.typ,                  // 'ponuka' | 'ziadost' (CHECK ich pozná)
      kat: it.kat ?? null,
      popis: it.pribeh,
      emoji: it.ikona,
      media: it.fotky?.length ? { fotky: it.fotky } : {},
      lat: it.lat ?? null,
      lng: it.lng ?? null,
      lok: it.lok ?? null,
      narodne: !!it.narodne,
      typ_situacie: it.typSituacie ?? "normal",
      skore: it.skore ?? 0,
      overene: !!it.overeny,
      ciel: it.ciel ?? null,
      vyzbierane: it.suma ?? null,
      pomocnici: it.ludia ?? null,
      data: { help: true, id: it.id, typ: it.typ, velkost: it.velkost, odbornik: it.odbornik ?? false, sponzor: it.sponzor ?? false, avatar: it.avatar ?? null },
    });
    if (error) throw error;
    return true;
  },
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
