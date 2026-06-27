// ============================================================
// DEED · Aktivity — Supabase repozitár (Fáza F)
// Číta Aktivity riadky z `prispevok` (diskriminátor data.akt=true) a mapuje
// späť na EN tvar (AktivitaItem). ENGINE polia (typ/skore/geo/dni/kat/podpora)
// NEdopĺňame — robí to klient cez obohatit() (Aktivity.tsx). EN `type` aj
// numerické `id` (1–34) prichádzajú z `data` → komponent ostáva nezmenený.
// ============================================================
import { supabase } from "@/lib/supabase";
import type { AktivitaItem } from "@/types";

/** riadok `prispevok` (data.akt) → AktivitaItem (EN slovník karty). */
function naAktivitaItem(r: any): AktivitaItem {
  const d = r.data || {};
  const m = r.media || {};
  const fotky: string[] | undefined = Array.isArray(m.fotky) && m.fotky.length ? m.fotky : undefined;
  return {
    id: Number(d.id),               // pôvodné numerické id (1–34) — kľúč/detail v komponente
    num: Number(r.cislo),
    dom: r.kat,                     // doména (engine si kat=dom dorobí v obohatit)
    type: d.type,                   // EN type (skutok/talent/workshop/help/case)
    size: d.size,
    title: r.titul,
    desc: r.popis,
    emoji: r.emoji,
    media: m.druh || undefined,
    fotky,
    verified: !!r.overene,
    importance: r.vyznam || undefined,
    author: r.autor_nazov || undefined,
    ini: r.autor_ini || undefined,
    pfp: r.autor_pfp || undefined,
    karma: r.autor_karma || undefined,
    loc: r.lok || undefined,
    time: d.time,
    likes: r.lajky ?? undefined,
    helpers: r.pomocnici ?? undefined,
    goal: r.ciel != null ? Number(r.ciel) : undefined,
    raised: r.vyzbierane != null ? Number(r.vyzbierane) : undefined,
    // workshop / case / extra (modulové polia)
    price: d.price,
    priceTxt: d.priceTxt,
    seats: d.seats,
    rating: d.rating,
    profi: d.profi,
    b2b: d.b2b,
    drr: d.drr,
    source: d.source,
    mine: d.mine,
    skore: d.skore,                 // explicitný override (vzdialené mestá); inak obohatit z size
  } as AktivitaItem;
}

export const aktivitySupabase = {
  async feed(): Promise<AktivitaItem[]> {
    if (!supabase) return [];
    // len Aktivity riadky (data.akt=true). Poradie/okruh/typ rieši klient
    // (obohatit + pripravFeed); tu len stabilné poradie podľa cisla.
    const { data, error } = await supabase
      .from("prispevok")
      .select("*")
      .not("data->>akt", "is", null)
      .order("cislo", { ascending: false });
    if (error) throw error;
    return (data || []).map(naAktivitaItem);
  },
};
