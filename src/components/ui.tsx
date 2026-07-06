// ============================================================
// DEED · UI KIT — skutočné komponenty namiesto štýl-helperov.
// Button / Input / Switch / BackChip / BackHeader / Card / ProgresBox
// Vynucujú TYPE/SHADOW/SPACE/RADIUS tokeny a theme-aware farby —
// JEDNA implementácia pre celú appku (koniec kópií btnLokal/btnP/…).
// ============================================================
import type { CSSProperties, ReactNode, ChangeEvent } from "react";
import { C, GRAD, GRAD_ZELENY, glassTmavy, SPACE, RADIUS, TYPE, FW, SHADOW } from "@/theme";
import { tint } from "@/lib/ui";
import { pressable } from "@/components/pressable";
import { IkonaSpat } from "@/components/icons";

// ---- BUTTON — primárne CTA / zelené CTA / ghost / danger ----
export type ButtonVariant = "primary" | "green" | "ghost" | "danger";
export function Button({ variant = "primary", full, disabled, onClick, children, style, ariaLabel }: {
  variant?: ButtonVariant; full?: boolean; disabled?: boolean; onClick?: () => void;
  children?: ReactNode; style?: CSSProperties; ariaLabel?: string;
}) {
  const base: CSSProperties = {
    ...(full ? { width: "100%" } : { flex: 1 }),
    padding: `${SPACE.md - 1}px 0`, borderRadius: RADIUS.md,
    fontSize: TYPE.bodyL.fontSize, fontWeight: FW.bold, fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer", border: "none",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs,
    transition: "transform .12s ease, box-shadow .25s ease, opacity .2s ease",
  };
  const styl: CSSProperties = disabled
    ? { ...base, background: "rgba(var(--glass-rgb),.06)", color: C.textTer }
    : variant === "primary" ? { ...base, background: GRAD, color: "#fff", boxShadow: SHADOW.glow }
    : variant === "green" ? { ...base, background: GRAD_ZELENY, color: "#fff", boxShadow: `0 8px 26px ${tint("var(--a-green)", .32)}, inset 0 1px 0 rgba(255,255,255,.22)` }
    : variant === "danger" ? { ...base, background: tint(C.red, .14), color: C.red, border: `1px solid ${tint(C.red, .4)}` }
    : { ...base, background: "rgba(var(--glass-rgb),.05)", color: C.textSec, border: `1px solid ${C.line}` };
  return <button type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick} style={{ ...styl, ...style }}>{children}</button>;
}

// ---- INPUT — text / textarea, jednotný vzhľad (nahrádza rozsypané inp()) ----
export function Input({ value, onChange, placeholder, type = "text", multiline, minH, maxLength, style, ariaLabel }: {
  value?: string; onChange?: (v: string) => void; placeholder?: string; type?: string;
  multiline?: boolean; minH?: number; maxLength?: number; style?: CSSProperties; ariaLabel?: string;
}) {
  const base: CSSProperties = {
    width: "100%", padding: SPACE.md - 1, borderRadius: RADIUS.sm,
    background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`,
    color: C.text, fontSize: 16, minHeight: minH, fontFamily: "inherit", resize: "vertical",
    outline: "none", lineHeight: 1.5, ...style,
  };
  if (multiline) {
    return <textarea aria-label={ariaLabel} value={value} maxLength={maxLength} placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value)} style={base} />;
  }
  return <input aria-label={ariaLabel} type={type} value={value} maxLength={maxLength} placeholder={placeholder}
    onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)} style={base} />;
}

// ---- SWITCH — JEDINÝ prístupný prepínač (role=switch + klávesnica) ----
// nahrádza tri kópie: Profil.Switch / Notifikacie.Toggle / RegKit.Prepinac
export function Switch({ on, onChange, ariaLabel, disabled }: { on: boolean; onChange: (v: boolean) => void; ariaLabel?: string; disabled?: boolean }) {
  const prepni = () => { if (!disabled) onChange(!on); };
  return (
    <span
      role="switch" aria-checked={on} aria-label={ariaLabel} tabIndex={disabled ? -1 : 0}
      onClick={prepni}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); prepni(); } }}
      style={{ width: 40, height: 23, borderRadius: RADIUS.pill, flex: "0 0 auto", position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        background: on ? GRAD : "rgba(var(--glass-rgb),.15)", opacity: disabled ? .5 : 1, transition: "background .2s ease", display: "inline-block" }}
    >
      <span style={{ position: "absolute", top: 3, left: on ? 20 : 3, width: 17, height: 17, borderRadius: RADIUS.round, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.3)", transition: "left .2s ease" }} />
    </span>
  );
}

// ---- BACK CHIP — jednotné „späť" koliesko (glass rad / hero overlay) ----
export function BackChip({ onBack, hero, label = "Späť" }: { onBack?: () => void; hero?: boolean; label?: string }) {
  const styl: CSSProperties = hero
    ? { width: 34, height: 34, borderRadius: RADIUS.round, background: "rgba(0,0,0,.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto", zIndex: 2 }
    : { width: 32, height: 32, borderRadius: RADIUS.round, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.textSec, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 auto" };
  return <span {...pressable(onBack, label)} style={styl}><IkonaSpat size={17} color={hero ? "#fff" : C.textSec} /></span>;
}

// ---- BACK HEADER — JEDNOTNÁ hlavička pod-obrazovky (detail/sheet) ----
// sticky glass riadok: ← späť · obsah (badge/labels) · pravé akcie.
// Používajú Charita/Help/Náboženstvo/… detaily — jeden vzor „ako sa vrátim".
export function BackHeader({ onBack, title, children, right }: { onBack?: () => void; title?: ReactNode; children?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 5, ...glassTmavy(18, .6), borderLeft: "none", borderRight: "none", borderTop: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.gutter}px` }}>
        <BackChip onBack={onBack} />
        {title != null && <span style={{ fontSize: TYPE.title.fontSize, fontWeight: FW.bold, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>}
        {children}
        {right && <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: SPACE.gutter }}>{right}</span>}
      </div>
    </div>
  );
}

// ---- CARD — jednoduchý glass povrch (box detailov / sekcií) ----
export function Card({ children, onClick, pad = SPACE.sm, accent, style }: { children?: ReactNode; onClick?: () => void; pad?: number | string; accent?: string; style?: CSSProperties }) {
  return (
    <div {...(onClick ? pressable(onClick) : {})} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderLeft: accent ? `3px solid ${accent}` : undefined, borderRadius: RADIUS.md, padding: pad, overflow: "hidden", cursor: onClick ? "pointer" : undefined, ...style }}>
      {children}
    </div>
  );
}

// ---- PROGRES BOX — JEDNOTNÝ veľký progres v detaile zbierky/žiadosti ----
// (nahrádza 3 ručné implementácie v Good/Help/Charita detailoch — jeden MoniBar)
export function ProgresBox({ suma, ciel, ludia, live = true }: { suma: number; ciel: number; ludia?: number; live?: boolean }) {
  const pct = ciel ? Math.min(100, Math.round(suma / ciel * 100)) : 0;
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div><span style={{ fontSize: 26, fontWeight: FW.bold }}>{Math.round(suma).toLocaleString("sk")} €</span> <span style={{ fontSize: 13, color: C.textTer }}>z {ciel.toLocaleString("sk")} €</span></div>
        <span style={{ fontSize: 16, fontWeight: FW.bold, color: C.greenL }}>{pct} %</span>
      </div>
      <div style={{ height: 9, background: "rgba(var(--glass-rgb),.1)", borderRadius: RADIUS.pill, overflow: "hidden", margin: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>
        <div style={{ height: "100%", width: `${pct}%`, background: GRAD_ZELENY, borderRadius: RADIUS.pill, transition: "width .6s ease", boxShadow: `0 0 12px ${tint("var(--a-green)", .45)}` }} />
      </div>
      {(ludia != null || live) && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
          <span style={{ color: C.textSec }}>{ludia != null ? `👥 ${ludia} ľudí pomohlo` : ""}</span>
          {live && <span style={{ color: C.greenL }}>● rastie live</span>}
        </div>
      )}
    </div>
  );
}

