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
import { cistyText } from "@/lib/richtext";

/** OPRAVY 426: mesto zo sídla registra („Piaristická 25, 911 01 Trenčín, Slovensko“ → „Trenčín“) */
export function mestoZoSidla(sidlo?: string): string | undefined {
  const c = (sidlo ?? "").split(",").map((x) => x.trim()).filter((x) => x && !/^slovensk/i.test(x));
  const m = c[c.length - 1]?.replace(/^\d{3}\s?\d{2}\s*/, "").trim();
  return m || undefined;
}
const UROVNE = ["Bronze", "Silver", "Gold", "Platinum", "Legend"] as const;
/** štít stránky z verejných nastavení (OPRAVY 412) — nová charita = Bronzový */
const stitZ = (v?: unknown) => { const s = String(v ?? "").toLowerCase(); return UROVNE.find((u) => u.toLowerCase() === s) ?? "Bronze"; };
const iniZ = (m: string) => m.replace(/,?\s*(o\.\s?z\.|n\.\s?o\.)\s*$/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

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
    nazov: r.titul || r.autor_nazov || undefined, popis: cistyText(r.popis || "").trim() || undefined,
    fotky: Array.isArray(m.fotky) && m.fotky.length ? m.fotky : undefined,
    overena: !!r.overene, lok: r.lok || undefined, casVytvorenia: r.vytvorene, vs: r.vs || undefined,
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
    const [st, nas, ver, prof] = await Promise.all([
      idStranok.length ? supabase.from("stranka").select("id, typ, testovacia").in("id", idStranok) : Promise.resolve({ data: [], error: null }),
      idZbierok.length ? supabase.from("zbierka_verejna").select("id, vs, nastavenie").in("id", idZbierok) : Promise.resolve({ data: [], error: null }),
      // OPRAVY 426: tvorca na karte — názov, sídlo, IČO a štít z verejných nastavení, logo z uloženého profilu
      idStranok.length ? supabase.from("nastavenia_stranky_verejne").select("stranka, verejne").in("stranka", idStranok) : Promise.resolve({ data: [], error: null }),
      idStranok.length ? supabase.from("profil_stranky_verejny").select("stranka, ulozeny").in("stranka", idStranok) : Promise.resolve({ data: [], error: null }),
    ]);
    const verejne = new Map<string, any>(((ver.error ? [] : ver.data) ?? []).map((v: any) => [v.stranka as string, v.verejne ?? {}] as const));
    const profily = new Map<string, any>(((prof.error ? [] : prof.data) ?? []).map((v: any) => [v.stranka as string, v.ulozeny ?? {}] as const));
    if (st.error) throw st.error;
    if (nas.error) throw nas.error;
    const charity = new Set((st.data ?? []).filter((s: any) => s.typ === "charita" && !s.testovacia).map((s: any) => s.id as string));
    const nastavenie = new Map<string, { popis?: string; media?: Media; typ?: string; mesiace?: number; komu?: { oblast: string; pod: string[] }; prav?: boolean }>((nas.data ?? []).map((n: any) => [n.id as string, n.nastavenie ?? {}] as const));
    const vsZbierok = new Map<string, string>((nas.data ?? []).map((n: any) => [n.id as string, n.vs as string] as const));
    const karty: CharitaFeedItem[] = zbierky.filter((z: any) => charity.has(z.stranka)).map((z: any) => {
      const n = nastavenie.get(z.id) ?? {};
      const fotky = (Array.isArray(n.media) ? n.media : []).filter((m) => m.typ === "foto" && m.src).map((m) => m.src as string);
      const ciel = Number(z.ciel);
      const v = verejne.get(z.stranka) ?? {}, reg = v.registra ?? {}, pr = profily.get(z.stranka) ?? {};
      const meno: string = reg.nazov || z.kto || "Organizácia";
      // koniec: dlhodobá = spustenie + mesiace, krátkodobá 30 dní (ako NovaZbierka)
      const koniec = new Date(z.vytvorene); if (n.typ === "dlha" && n.mesiace) koniec.setMonth(koniec.getMonth() + Number(n.mesiace)); else koniec.setTime(koniec.getTime() + 30 * DEN);
      return {
        id: z.id, comp: "data", typ: "charita", modul: "charity", kat: "Pomoc", skore: 0, dni: dniZ(z.vytvorene),
        podpora: Number(z.darov) || undefined, narodne: false,
        nazov: z.nazov, popis: cistyText(n.popis || "").trim() || undefined, fotky: fotky.length ? fotky : undefined,
        vyzbierane: Number(z.vyzbierane) || 0, ciel: ciel > 0 ? ciel : undefined, darov: Number(z.darov) || 0,
        konciDni: Math.max(0, Math.ceil((koniec.getTime() - Date.now()) / DEN)), vs: vsZbierok.get(z.id) || undefined, komu: n.komu?.oblast ? { oblast: n.komu.oblast, pod: Array.isArray(n.komu.pod) ? n.komu.pod.slice(0, 2) : [] } : undefined,
        orgNazov: meno, stranka: z.stranka, casVytvorenia: z.vytvorene,
        pravidelna: n.prav === true, // OPRAVY 440 (3): pravidelná len keď ju zbierka má (Zadarmo nikdy)
        org: { logo: pr.bezLoga ? undefined : pr.logo || undefined, ini: pr.bezLoga && pr.inicialy ? pr.inicialy : iniZ(meno), mesto: mestoZoSidla(reg.sidlo), stit: stitZ(v.stit), ico: reg.ico || undefined, sidlo: reg.sidlo || undefined },
      } as CharitaFeedItem;
    });
    // OPRAVY 426 (3): kurátorské riadky (data.comp — seed 0004/0005/0010) nikdy, aj keby ostali v databáze
    return [...karty, ...(sk.data ?? []).filter((r: any) => !r.data?.comp && !r.data?.help).map(naSkutok)].sort((a, b) => casMs(b.casVytvorenia) - casMs(a.casVytvorenia));
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
