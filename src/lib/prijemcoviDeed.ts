// ============================================================
// KARTA 56E §2b · komu sa dá podeliť zo zbierky s overovateľom — len registrovaní v DEED (stránka, žiadosť z Help,
// osoba), nikdy voľný IBAN. Zatiaľ sa hľadá v stránkach (tabuľka stranka, verejné čítanie 0035).
// Žiadosti z Help a osoby pribudnú, keď budú mať verejný register (PLACEBO — karta 56E).
// ============================================================
import { supabase } from "./supabase";
import { TESTOVACIA } from "./testovacia";
import { TEST_PROFILY } from "./testProfily";

export interface PrijemcaDeed { id: string; nazov: string; popis: string }
const TYP: Record<string, string> = { charita: "charita", farnost: "farnosť", spolok: "spolok", klub: "klub", firma: "firma", tvorca: "tvorca" };
const popis = (typ: string) => `${TYP[typ] ?? "stránka"} v DEED`;

export async function hladajPrijemcov(q: string, bez: string[]): Promise<PrijemcaDeed[]> {
  const h = q.trim();
  if (!h) return [];
  if (supabase) {
    let dot = supabase.from("stranka").select("id, nazov, typ").ilike("nazov", `%${h}%`).in("typ", ["charita", "farnost", "spolok", "klub"]).limit(8);
    if (!TESTOVACIA) dot = dot.eq("testovacia", false);
    const { data, error } = await dot;
    if (!error && data) return data.filter((r) => !bez.includes(r.id as string)).slice(0, 5).map((r) => ({ id: r.id as string, nazov: r.nazov as string, popis: popis(r.typ as string) }));
  }
  const m = h.toLocaleLowerCase("sk-SK");
  return TEST_PROFILY.filter((p) => p.typ === "charita" || p.typ === "farnost")
    .filter((p) => p.meno.toLocaleLowerCase("sk-SK").includes(m) && !bez.includes(p.k))
    .slice(0, 5).map((p) => ({ id: p.k, nazov: p.meno, popis: popis(p.typ) }));
}
