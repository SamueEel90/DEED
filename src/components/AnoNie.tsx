// ============================================================
// OPRAVY 265 — prepínač Áno · Nie, jeden pre celú appku.
// Vybraté Áno = plná zelená, biely text 800. Vybraté Nie = plná tmavosivá (v tmavom režime svetlejšia sivá), biely text.
// Nevybraté = priehľadné, tlmený text. Výška 44 px. Vetu pod prepínačom dáva volajúci (mení sa podľa voľby).
// ============================================================
import type { CSSProperties } from "react";

export function AnoNie({ value, onChange, label, siroke = false, ano = "Áno", nie = "Nie" }: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  /** aria-label skupiny */ label: string;
  /** na celú šírku (dve rovnaké polovice) */ siroke?: boolean;
  ano?: string; nie?: string;
}) {
  const tl = (on: boolean, v: boolean): CSSProperties => ({
    minHeight: 44, padding: "0 20px", flex: siroke ? "1 1 0" : "none", border: "none", borderRadius: 10, cursor: "pointer",
    fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none",
    background: on ? (v ? "var(--green,#4E7D37)" : "var(--nieBg,#3A342A)") : "transparent",
    color: on ? "#fff" : "var(--ink3,#5B5D53)",
  });
  return (
    <div role="radiogroup" aria-label={label} style={{ display: siroke ? "flex" : "inline-flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--btn,#DCD8CF)", alignSelf: siroke ? "stretch" : "flex-start", maxWidth: "100%" }}>
      {([[true, ano], [false, nie]] as const).map(([v, t]) => { const on = value === v; return (
        <button key={t} type="button" role="radio" aria-checked={on} onClick={() => { if (!on) onChange(v); }} style={tl(on, v)}>{t}</button>); })}
    </div>);
}
