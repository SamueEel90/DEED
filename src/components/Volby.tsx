// ============================================================
// OPRAVY 288 — prepínač s 2–4 voľbami, jeden pre celú appku (doplnok k 265, AnoNie).
// Vybratá voľba = plná zelená, biely text 800. Nevybratá = priehľadná, tlmený text. Výška 44 px.
// Pri Áno · Nie sa používa AnoNie (vybraté Nie tmavé). PC aj mobil, svetlý aj tmavý režim.
// ============================================================
import type { CSSProperties, ReactNode } from "react";

export function Volby<T extends string | number | boolean>({ value, onChange, moznosti, label, siroke = false, styl }: {
  value: T | null | undefined;
  onChange: (v: T) => void;
  /** [hodnota, popis] v poradí zobrazenia */ moznosti: readonly (readonly [T, ReactNode])[];
  /** aria-label skupiny */ label: string;
  /** na celú šírku (rovnaké diely) */ siroke?: boolean;
  styl?: CSSProperties;
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: siroke ? "flex" : "inline-flex", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 14, background: "var(--btn,#DCD8CF)", alignSelf: siroke ? "stretch" : "flex-start", maxWidth: "100%", boxSizing: "border-box", ...styl }}>
      {moznosti.map(([v, t]) => { const on = value === v; return (
        <button key={String(v)} type="button" role="radio" aria-checked={on} onClick={() => { if (!on) onChange(v); }}
          style={{ minHeight: 44, padding: "0 16px", flex: siroke ? "1 1 0" : "none", minWidth: 0, border: "none", borderRadius: 10, cursor: "pointer",
            fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none", whiteSpace: "nowrap",
            background: on ? "var(--green,#4E7D37)" : "transparent", color: on ? "#fff" : "var(--ink2,#3F3A30)" }}>{t}</button>); })}
    </div>);
}

// ---- OPRAVY 288 doplnok (Martin 15. 10.): voľba ako karta s textom — bez plnej výplne, 2 px zelený rám,
// jemne zelené pozadie a ✓ vpravo hore. Volajúci pridá do karty <FajkaVolby on={…} /> a štýl kartaVolby(on).
/** štýl karty s voľbou (bez rozmerov a rozloženia — tie dáva volajúci) */
export const kartaVolby = (on: boolean): CSSProperties => ({
  position: "relative", boxSizing: "border-box",
  border: on ? "2px solid var(--green,#4E7D37)" : "2px solid var(--cardBd,#D9D3C7)",
  background: on ? "var(--gSoft,#DCE3D0)" : "var(--field,#F6F3EC)",
});
/** ✓ vpravo hore na vybratej karte */
export function FajkaVolby({ on }: { on: boolean }) {
  if (!on) return null;
  return <span aria-hidden="true" style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "var(--green,#4E7D37)", color: "#fff", fontSize: 13, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>✓</span>;
}
/** filter s viacerými voľbami (čip): vybratý plne zelený ako prepínač */
export const cipFiltra = (on: boolean): CSSProperties => ({
  border: on ? "1.5px solid var(--green,#4E7D37)" : "1px solid var(--cardBd,#D9D3C7)",
  background: on ? "var(--green,#4E7D37)" : "var(--field,#F6F3EC)",
  color: on ? "#fff" : "var(--ink2,#3F3A30)",
});
