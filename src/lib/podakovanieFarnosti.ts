// ============================================================
// OPRAVY 349 · Ľudia → Darcovia: Poďakovať darcom — server (0106 farnost_podakuj) pošle upozornenie
// každému prihlásenému darcovi (Oznámenia, push). Komu: všetkým · hlavná (aj zvončeková) · jedna zbierka farnosti.
// ============================================================
import { supabase } from "./supabase";

export async function podakujDarcomFarnosti(stranka: string, komu: string, text: string): Promise<{ n: number } | { e: string }> {
  if (!supabase) return { e: "Poďakovanie posiela server. V tejto verzii bez servera sa neposlalo." };
  const { data, error } = await supabase.rpc("farnost_podakuj", { p_stranka: stranka, p_komu: komu, p_text: text });
  if (error) return { e: /nie_spravca/.test(error.message) ? "Poďakovanie posiela len správca stránky." : /prazdne/.test(error.message) ? "Najprv napíšte poďakovanie." : /zbierka_neexistuje/.test(error.message) ? "Zbierka sa nenašla." : "Poďakovanie sa nepodarilo poslať." };
  return { n: Number(data) || 0 };
}
