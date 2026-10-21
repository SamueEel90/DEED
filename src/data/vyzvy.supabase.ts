// ============================================================
// OPRAVY 431 · Výzvy na súrnu pomoc do feedu Domov.
// Bežiace výzvy charít (oznam_charity druh vyzva, nezrušené, „Pomoc treba do“ ≥ dnes, zverejnené pred ≤ 10 dňami)
// s údajmi charity (názov, logo, mesto zo sídla, štít). Testovacie stránky nie. Bez DB z pamäte relácie.
// ============================================================
import { supabase } from "@/lib/supabase";
import { OZNAMY_CFG, vsetkyOznamyZPamate, dnesIso, type OznamCharity } from "@/lib/oznamyNove";
import { mestoZoSidla } from "./charita.supabase";

export interface VyzvaVoFeede {
  o: OznamCharity;
  org: { nazov: string; logo?: string; ini: string; mesto?: string; stit: string };
}
const DEN = 86_400_000;
const UROVNE = ["Bronze", "Silver", "Gold", "Platinum", "Legend"] as const;
const stitZ = (v?: unknown) => { const s = String(v ?? "").toLowerCase(); return UROVNE.find((u) => u.toLowerCase() === s) ?? "Bronze"; };
const iniZ = (m: string) => m.replace(/,?\s*(o\.\s?z\.|n\.\s?o\.)\s*$/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
/** výzva ešte platí: nezrušená, do dátumu pomoci, najviac 10 dní od zverejnenia */
export const vyzvaPlati = (o: OznamCharity, dnes = dnesIso()) =>
  o.druh === "vyzva" && !o.zrusene && !!o.datum && o.datum >= dnes && Date.now() - Date.parse(o.zverejnene) <= (OZNAMY_CFG.vyzvaDni + 1) * DEN;

export async function vyzvyDomov(): Promise<VyzvaVoFeede[]> {
  if (!supabase) return vsetkyOznamyZPamate().filter((o) => vyzvaPlati(o)).map((o) => ({ o, org: { nazov: "Charita", ini: "CH", stit: "Bronze" } }));
  const od = new Date(Date.now() - (OZNAMY_CFG.vyzvaDni + 1) * DEN).toISOString();
  const { data, error } = await supabase.from("oznam_charity").select("stranka, data").eq("druh", "vyzva").is("zrusene", null).gte("zverejnene", od).limit(200);
  if (error) throw error;
  const vyzvy = (data ?? []).map((r: any) => ({ ...(r.data as OznamCharity), stranka: r.stranka as string })).filter((o) => vyzvaPlati(o));
  const ids = [...new Set(vyzvy.map((o) => o.stranka))];
  if (!ids.length) return [];
  const [st, ver, prof] = await Promise.all([
    supabase.from("stranka").select("id, nazov, testovacia").in("id", ids),
    supabase.from("nastavenia_stranky_verejne").select("stranka, verejne").in("stranka", ids),
    supabase.from("profil_stranky_verejny").select("stranka, ulozeny").in("stranka", ids),
  ]);
  if (st.error) throw st.error;
  const stranky = new Map<string, any>((st.data ?? []).filter((s: any) => !s.testovacia).map((s: any) => [s.id as string, s] as const));
  const verejne = new Map<string, any>(((ver.error ? [] : ver.data) ?? []).map((v: any) => [v.stranka as string, v.verejne ?? {}] as const));
  const profily = new Map<string, any>(((prof.error ? [] : prof.data) ?? []).map((v: any) => [v.stranka as string, v.ulozeny ?? {}] as const));
  return vyzvy.filter((o) => stranky.has(o.stranka)).map((o) => {
    const v = verejne.get(o.stranka) ?? {}, reg = v.registra ?? {}, pr = profily.get(o.stranka) ?? {};
    const nazov: string = reg.nazov || stranky.get(o.stranka)?.nazov || "Charita";
    return { o, org: { nazov, logo: pr.bezLoga ? undefined : pr.logo || undefined, ini: pr.bezLoga && pr.inicialy ? pr.inicialy : iniZ(nazov), mesto: mestoZoSidla(reg.sidlo), stit: stitZ(v.stit) } };
  }).sort((a, b) => b.o.zverejnene.localeCompare(a.o.zverejnene));
}
