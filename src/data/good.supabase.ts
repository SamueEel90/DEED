// ============================================================
// DEED · Good (Domov) — Supabase repozitár
// Číta `prispevok`/`udalost` z DB a mapuje späť na modulový tvar
// (GoodPolozka/Udalost). UI/hooky/feed.ts sa nemenia. Fáza 4 — krok A.
// ============================================================
import { supabase } from "@/lib/supabase";
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
  };
}

export const goodSupabase = {
  async feed(): Promise<GoodPolozka[]> {
    if (!supabase) return [];
    // Domov agreguje skutky/žiadosti/charitu z POLOZKY. Charita má vlastný
    // kurátorský feed (riadky s `data.comp`) — tie sem NEpatria, inak by sa
    // bespoke karty z modulu Charita preliali do Domova. Poradie/filter rieši
    // feed.ts (pripravFeed) na klientovi.
    const { data, error } = await supabase
      .from("prispevok")
      .select("*")
      .is("data->>comp", null)
      .is("data->>akt", null)   // vylúč Aktivity (Fáza F) — majú vlastný modul/feed
      .is("data->>help", null)  // vylúč Help (Fáza G) — má vlastný modul/feed
      .order("vytvorene", { ascending: false });
    if (error) throw error;
    return (data || []).map(naGoodPolozka);
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
