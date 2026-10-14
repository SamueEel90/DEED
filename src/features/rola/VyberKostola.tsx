// ============================================================
// OPRAVY 287 — pole Kostol pri udalosti, ozname, Pomôž a Deti: Celá farnosť · kostoly farnosti · Iné miesto.
// Celá farnosť je predvolená, keď má farnosť viac kostolov (s jedným kostolom je predvolený on).
// Pri Inom mieste je pole Miesto povinné a na stránke sa ukáže miesto namiesto kostola.
// Výber kostola ostáva kvôli filtru „môj kostol“ (Karta 62): Celá farnosť a Iné miesto vidia všetci, kto sleduje farnosť.
// ============================================================
import type { CSSProperties } from "react";
import type { Miesto } from "@/lib/miestaFarnosti";

export const CELA_FARNOST = "*";
export const INE_MIESTO = "~";
/** predvolená voľba */
export const predvolenyKostol = (miesta: Miesto[]) => (miesta.length > 1 ? CELA_FARNOST : miesta[0]?.id ?? "0");
/** platná voľba (zmazaný kostol → predvolená) */
export const platnyKostol = (v: string | undefined, miesta: Miesto[]) =>
  v === CELA_FARNOST || v === INE_MIESTO || (v && miesta.some((m) => m.id === v)) ? v! : predvolenyKostol(miesta);
/** id konkrétneho kostola, inak null (celá farnosť, iné miesto) */
export const idKostola = (v: string) => (v === CELA_FARNOST || v === INE_MIESTO ? null : v);
/** čo ukázať na stránke: pri Inom mieste miesto, pri kostole (keď ich je viac) jeho názov, ak miesto nie je vyplnené */
export function kdeNaStranke(v: string | undefined, miesto: string, miesta: Miesto[]): string {
  const m = miesto.trim();
  if (m || !v || v === CELA_FARNOST || v === INE_MIESTO) return m;
  return miesta.length > 1 ? miesta.find((x) => x.id === v)?.nazov ?? "" : "";
}

export function VyberKostola({ miesta, value, onChange, style, lblStyl, label = "Kostol" }: { miesta: Miesto[]; value: string; onChange: (v: string) => void; style?: CSSProperties; /** štýl nadpisu poľa (ako ostatné polia formulára) */ lblStyl?: CSSProperties; label?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lblStyl ?? { fontSize: 14, fontWeight: 800, color: "var(--ink2)" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} style={{ fontWeight: 700, ...style }}>
        {miesta.length > 1 && <option value={CELA_FARNOST}>Celá farnosť</option>}
        {miesta.map((m) => <option key={m.id} value={m.id}>{m.nazov}</option>)}
        <option value={INE_MIESTO}>Iné miesto</option>
      </select>
    </label>);
}
