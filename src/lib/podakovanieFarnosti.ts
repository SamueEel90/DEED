// ============================================================
// OPRAVY 349 · Ľudia → Darcovia: Poďakovať darcom — server (0106 farnost_podakuj) pošle upozornenie
// každému prihlásenému darcovi (Oznámenia, push). Komu: všetkým · hlavná (aj zvončeková) · jedna zbierka farnosti.
// ============================================================
import { supabase } from "./supabase";

export async function podakujDarcomFarnosti(stranka: string, komu: string, text: string): Promise<{ n: number } | { e: string }> {
  // OPRAVY 351: bez servera alebo bez funkcie (migrácia 0106 nebeží) jedna veta; inak skutočná príčina
  const NEZAPNUTE = "Poďakovanie ešte nie je zapnuté na serveri";
  if (!supabase) return { e: NEZAPNUTE };
  const { data, error } = await supabase.rpc("farnost_podakuj", { p_stranka: stranka, p_komu: komu, p_text: text });
  if (error) {
    const m = error.message ?? "";
    return { e: error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(m) ? NEZAPNUTE
      : /nie_spravca/.test(m) ? "Poďakovanie posiela len správca stránky"
      : /neprihlaseny/.test(m) ? "Najprv sa prihláste"
      : /prazdne/.test(m) ? "Najprv napíšte poďakovanie"
      : /zbierka_neexistuje/.test(m) ? "Zbierka sa nenašla"
      : /fetch|network/i.test(m) ? "Nie je spojenie so serverom"
      : m || "Poďakovanie sa nepodarilo poslať" };
  }
  return { n: Number(data) || 0 };
}
