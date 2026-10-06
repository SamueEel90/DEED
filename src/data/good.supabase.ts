// ============================================================
// DEED · Good (Domov) — Supabase repozitár
// Číta `prispevok`/`udalost` z DB a mapuje späť na modulový tvar
// (GoodPolozka/Udalost). UI/hooky/feed.ts sa nemenia. Fáza 4 — krok A.
// ============================================================
import { supabase } from "@/lib/supabase";
import { nahrajFotky } from "@/lib/uploadFoto";
import type { GoodPolozka, Udalost } from "@/types";

const DEN = 86_400_000;

// vek v dňoch (pre feed.ts životnosť/čerstvosť)
function dniZ(ts?: string): number {
  if (!ts) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / DEN));
}

// relatívny čas pre kartu („práve teraz" / „2 h" / „3 d")
function casZ(ts?: string): string {
  if (!ts) return "";
  const min = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
  if (min < 5) return "práve teraz";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

/** riadok `prispevok` → GoodPolozka (engine polia zo stĺpcov, extra z `data`/`media`).
 *  Exportované, aby ho vedel znovapoužiť aj `top.supabase.ts` (Top príspevky). */
export function naGoodPolozka(r: any): GoodPolozka {
  const d = r.data || {};
  const m = r.media || {};
  const fotky: string[] | undefined = Array.isArray(m.fotky) && m.fotky.length ? m.fotky : undefined;
  return {
    id: r.id,                       // uuid (stabilný kľúč + detail lookup)
    num: Number(r.cislo),           // zobrazené „č."
    typ: r.typ,
    velkost: d.velkost || "small",  // feed ju aj tak prepočíta cez zobrazVelkost
    kat: r.kat,
    autor: r.autor_nazov,
    ini: r.autor_ini,
    pfp: r.autor_pfp,
    karma: r.autor_karma || undefined,
    modul: r.modul,
    typSituacie: r.typ_situacie,
    skore: Number(r.skore),
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    lok: r.lok || undefined,
    narodne: !!r.narodne,
    overene: !!r.overene,
    topovane: !!r.topovane,
    vyznam: r.vyznam || undefined,
    titul: r.titul,
    popis: r.popis,
    emoji: r.emoji,
    media: m.druh || undefined,
    fotky,
    video: m.video || undefined,
    ciel: r.ciel != null ? Number(r.ciel) : undefined,
    vyzbierane: r.vyzbierane != null ? Number(r.vyzbierane) : undefined,
    pomocnici: r.pomocnici ?? undefined,
    lajky: r.lajky ?? undefined,
    podpora: r.podpora_count ?? undefined,
    dni: dniZ(r.vytvorene),
    cas: casZ(r.vytvorene),
    suma: d.suma,
    zdroj: d.zdroj,
    charLevel: d.charLevel,
    otvorenaPodpora: d.otvorenaPodpora,
  } as GoodPolozka;
}

/** riadok `udalost` → Udalost (nástenka). */
function naUdalost(r: any): Udalost {
  return {
    id: r.id,
    top: !!r.top,
    when: r.kedy_text,
    title: r.titul,
    who: r.kto,
    src: r.zdroj,
    kat: r.kat,
    desc: r.popis,
    place: r.miesto,
    cap: r.kapacita,
    // filtre/kalendár nástenky — stĺpce zatiaľ nemusia existovať (bez nich sa udalosť správa ako doteraz)
    dom: r.dom ?? undefined,
    datum: r.datum ?? undefined,
    km: r.km ?? undefined,
  };
}

/** Zadanie 5 · 5.4: veľkosť stránky feedu (server viac nevráti) */
export const FEED_STRANA = 50;
export interface FeedDotaz { lat?: number; lng?: number; km?: number; pred?: { vytvorene: string; id: string } }

export const goodSupabase = {
  /** Zadanie 5 · 5.4: jedna stránka feedu Domov (najviac FEED_STRANA riadkov), okruh v SQL,
   *  kurzor podľa času (`pred` = posledná načítaná položka). Poradie a prah dorieši feed.ts. */
  async feed(v?: FeedDotaz): Promise<GoodPolozka[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc("feed_stranka", {
      p_feed: "domov", p_lat: v?.lat ?? null, p_lng: v?.lng ?? null, p_km: v?.km ?? null,
      p_pred_cas: v?.pred?.vytvorene ?? null, p_pred_id: v?.pred?.id ?? null, p_limit: FEED_STRANA,
    });
    if (error) throw error;
    return ((data || []) as Array<Record<string, unknown>>).map((r) => ({ ...naGoodPolozka(r), vytvorene: r.vytvorene as string }));
  },
  async vytvor(it: GoodPolozka, autorUcetId?: string | null): Promise<string | null> {
    if (!supabase) return null;
    const fotky = await nahrajFotky(it.fotky ?? []); // data URL → Storage (passthrough ak zlyhá)
    const { data, error } = await supabase.from("prispevok").insert({
      autor_ucet_id: autorUcetId ?? null,   // NULL = demo/seed; inak link na účet
      autor_nazov: it.autor,
      autor_karma: it.karma ?? null,
      modul: it.modul ?? "good",
      typ: it.typ,
      kat: it.kat,
      titul: it.titul,
      popis: it.popis,
      emoji: it.emoji,
      media: fotky.length ? { fotky } : {},
      lat: it.lat ?? null,
      lng: it.lng ?? null,
      lok: it.lok ?? null,
      narodne: !!it.narodne,
      typ_situacie: it.typSituacie ?? "normal",
      // Zadanie 3 · 3.1: skóre, overené a karmu klient nezapisuje — doplní ich DB z behu AI (0039)
      score_run_id: it.scoreRunId ?? null,
      ciel: it.ciel ?? null,
    }).select("id").single();
    if (error) throw error;
    return (data?.id as string) ?? null;
  },
  async udalosti(): Promise<Udalost[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("udalost")
      .select("*")
      .eq("modul", "good")
      .order("vytvorene", { ascending: true });
    if (error) throw error;
    return (data || []).map(naUdalost);
  },
};
