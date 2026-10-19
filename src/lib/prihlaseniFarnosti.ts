// ============================================================
// OPRAVY 397 (Viera) · zoznam prihlásených — správa prihláseným (server 0128 napis_prihlasenym) a zoznam na papier.
// ============================================================
import { supabase } from "./supabase";

export async function napisPrihlasenym(stranka: string, ref: string, text: string): Promise<{ n: number } | { e: string }> {
  const NEZAPNUTE = "Správa prihláseným ešte nie je zapnutá na serveri";
  if (!supabase) return { e: NEZAPNUTE };
  const { data, error } = await supabase.rpc("napis_prihlasenym", { p_stranka: stranka, p_ref: ref, p_text: text });
  if (error) {
    const m = error.message ?? "";
    return { e: error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(m) ? NEZAPNUTE
      : /nie_spravca/.test(m) ? "Správu posiela len správca stránky"
      : /neprihlaseny/.test(m) ? "Najprv sa prihláste"
      : /prazdne/.test(m) ? "Najprv napíšte správu"
      : /fetch|network/i.test(m) ? "Nie je spojenie so serverom"
      : m || "Správu sa nepodarilo poslať" };
  }
  return { n: Number(data) || 0 };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
/** zoznam na papier (tlač alebo uloženie ako PDF v okne tlače) */
export function stiahniZoznam(nazov: string, podnadpis: string, riadky: [string, string, string][]): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const telo = riadky.map(([m, a, k], i) => `<tr><td>${i + 1}.</td><td>${esc(m)}</td><td>${esc(a)}</td><td>${esc(k)}</td><td class="p"></td></tr>`).join("");
  w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>${esc(nazov)} · prihlásení</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:24px;color:#1d211b}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#555}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid #ccc;padding:8px 6px;text-align:left}th{font-size:12px;text-transform:uppercase;color:#555}td.p{width:28%}</style></head>
<body><h1>${esc(nazov)}</h1><p>${esc(podnadpis)}</p><table><thead><tr><th>#</th><th>Meno</th><th>Ako</th><th>Kedy</th><th>Poznámka</th></tr></thead><tbody>${telo}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}
