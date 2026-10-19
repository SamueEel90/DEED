// ============================================================
// DEED · Charita — Supabase repozitár
// OPRAVY 403: len to, čo naozaj niekto vytvoril. Žiadne kurátorské (seed) riadky.
//   feed    = bežiace zverejnené zbierky skutočných charít (v_zbierky_na_pripnutie + zbierka_verejna, stránka typu
//             charita, nie testovacia) + skutky, ktoré do feedu Charity pridal prihlásený autor (prispevok_feed,
//             autor_ucet_id not null). Zoradené od najnovšieho.
//   adresar = zaregistrované charity (stranka typ charita, nie testovacia) so sídlom z registra.
// ============================================================
import { supabase } from "@/lib/supabase";
import type { CharitaFeedItem, OrgAdresar } from "@/types";

const DEN = 86_400_000;
const dniZ = (ts?: string): number => (ts ? Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / DEN)) : 0);
const casMs = (ts?: string) => (ts ? new Date(ts).getTime() : 0);

type Media = { typ?: string; src?: string }[];

/** skutok z `prispevok_feed` (feed charita, skutočný autor) → karta */
function naSkutok(r: any): CharitaFeedItem {
  const m = r.media || {};
  return {
    id: r.id, comp: "data", typ: "skutok", modul: r.modul ?? "charity", kat: r.kat ?? "Pomoc",
    skore: Number(r.skore ?? 0), typSituacie: r.typ_situacie, lat: r.lat ?? undefined, lng: r.lng ?? undefined,
    dni: dniZ(r.vytvorene), podpora: r.podpora_count ?? undefined, narodne: !!r.narodne,
    nazov: r.titul || r.autor_nazov || undefined, popis: r.popis || undefined,
    fotky: Array.isArray(m.fotky) && m.fotky.length ? m.fotky : undefined,
    overena: !!r.overene, lok: r.lok || undefined, casVytvorenia: r.vytvorene,
  } as CharitaFeedItem;
}

export const charitaSupabase = {
  async feed(): Promise<CharitaFeedItem[]> {
    if (!supabase) return [];
    const [zb, sk] = await Promise.all([
      supabase.from("v_zbierky_na_pripnutie").select("id, nazov, stranka, kto, ciel, vytvorene, vyzbierane, darov").order("vytvorene", { ascending: false }).limit(100),
      supabase.from("prispevok_feed").select("*").eq("feed", "charita").not("autor_ucet_id", "is", null).order("vytvorene", { ascending: false }).limit(50),
    ]);
    if (zb.error) throw zb.error;
    if (sk.error) throw sk.error;
    const zbierky = zb.data ?? [];
    const idStranok = [...new Set(zbierky.map((z: any) => z.stranka as string))];
    const idZbierok = zbierky.map((z: any) => z.id as string);
    const [st, nas] = await Promise.all([
      idStranok.length ? supabase.from("stranka").select("id, typ, testovacia").in("id", idStranok) : Promise.resolve({ data: [], error: null }),
      idZbierok.length ? supabase.from("zbierka_verejna").select("id, nastavenie").in("id", idZbierok) : Promise.resolve({ data: [], error: null }),
    ]);
    if (st.error) throw st.error;
    if (nas.error) throw nas.error;
    const charity = new Set((st.data ?? []).filter((s: any) => s.typ === "charita" && !s.testovacia).map((s: any) => s.id as string));
    const nastavenie = new Map<string, { popis?: string; media?: Media }>((nas.data ?? []).map((n: any) => [n.id as string, n.nastavenie ?? {}] as const));
    const karty: CharitaFeedItem[] = zbierky.filter((z: any) => charity.has(z.stranka)).map((z: any) => {
      const n = nastavenie.get(z.id) ?? {};
      const fotky = (Array.isArray(n.media) ? n.media : []).filter((m) => m.typ === "foto" && m.src).map((m) => m.src as string);
      const ciel = Number(z.ciel);
      return {
        id: z.id, comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", skore: 0, dni: dniZ(z.vytvorene),
        podpora: Number(z.darov) || undefined, narodne: false,
        nazov: z.nazov, popis: n.popis || undefined, fotky: fotky.length ? fotky : undefined,
        vyzbierane: Number(z.vyzbierane) || 0, ciel: ciel > 0 ? ciel : undefined,
        orgNazov: z.kto, stranka: z.stranka, casVytvorenia: z.vytvorene,
      } as CharitaFeedItem;
    });
    return [...karty, ...(sk.data ?? []).map(naSkutok)].sort((a, b) => casMs(b.casVytvorenia) - casMs(a.casVytvorenia));
  },

  async adresar(): Promise<OrgAdresar[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.from("stranka").select("id, nazov").eq("typ", "charita").eq("testovacia", false).order("nazov").limit(500);
    if (error) throw error;
    const ids = (data ?? []).map((s: any) => s.id as string);
    const ver = ids.length ? await supabase.from("nastavenia_stranky_verejne").select("stranka, verejne").in("stranka", ids) : { data: [], error: null };
    if (ver.error) throw ver.error;
    const reg = new Map<string, { nazov?: string; sidlo?: string }>((ver.data ?? []).map((v: any) => [v.stranka as string, v.verejne?.registra ?? {}] as const));
    return (data ?? []).map((s: any) => ({ id: s.id, nazov: reg.get(s.id)?.nazov || s.nazov, sidlo: reg.get(s.id)?.sidlo ?? "" }));
  },
};
