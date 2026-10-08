// ============================================================
// DEED · Aktivity — Supabase repozitár (Fáza F)
// Číta Aktivity riadky z `prispevok` (diskriminátor data.akt=true) a mapuje
// späť na EN tvar (AktivitaItem). ENGINE polia (typ/skore/geo/dni/kat/podpora)
// NEdopĺňame — robí to klient cez obohatit() (Aktivity.tsx). EN `type` aj
// numerické `id` (1–34) prichádzajú z `data` → komponent ostáva nezmenený.
// ============================================================
import { supabase } from "@/lib/supabase";
import { nahrajFotky } from "@/lib/uploadFoto";
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
      .from("prispevok_feed") // 0037: vyzbierané z ledgera
      .select("*")
      .eq("feed", "aktivity")   // 5.7: stĺpec, nie kľúč v jsonb
      .order("cislo", { ascending: false })
      .limit(50);                // 5.4: nikdy celá tabuľka
    if (error) throw error;
    return (data || []).map(naAktivitaItem);
  },
  async vytvor(it: AktivitaItem, autorUcetId?: string | null): Promise<string | null> {
    if (!supabase) return null;
    const fotky = await nahrajFotky(it.fotky ?? []); // data URL → Storage (passthrough ak zlyhá)
    // zrkadlo naAktivitaItem (tvar ako seed 0009): EN polia karty idú do `data` (diskriminátor akt:true → feed aktivity)
    const { data, error } = await supabase.from("prispevok").insert({
      autor_ucet_id: autorUcetId ?? null,
      autor_nazov: it.author ?? null,
      autor_ini: it.ini ?? null,
      autor_pfp: it.pfp ?? null,
      autor_karma: it.karma ?? null,
      modul: MODUL[it.type as string] ?? "good",
      feed: "aktivity",
      typ: it.type === "help" ? "ziadost" : it.type,
      kat: it.dom ?? null,
      titul: it.title ?? null,
      popis: it.desc ?? null,
      emoji: it.emoji ?? null,
      media: { druh: it.media ?? null, fotky },
      lok: it.loc ?? null,
      narodne: /online/i.test(it.loc || ""),
      typ_situacie: "normal",
      // skóre a overené zapisuje len server (0039); príspevok začína neoverený
      vyznam: it.importance ?? null,
      pomocnici: it.helpers ?? null,
      data: {
        akt: true, id: it.id, type: it.type, size: it.size, time: it.time,
        price: it.price, priceTxt: it.priceTxt, seats: it.seats, rating: it.rating, profi: it.profi,
      },
    }).select("id").single();
    if (error) throw error;
    return (data?.id as string) ?? null;
  },
};

// EN type karty → modul príspevku (ako seed 0009); skutok/talent = good
const MODUL: Record<string, string> = { help: "help", workshop: "workshop", case: "charity" };
