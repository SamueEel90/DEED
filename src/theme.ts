/*
  ============================================================
  DEED Aura — dizajnový systém
  ============================================================
  Identita: "aurora" gradient (modrá → fialová → tyrkys),
  glass povrchy, tmavé dýchajúce pozadie, aura prstene.
  ============================================================
*/
import type { CSSProperties } from "react";

// ---- DIZAJN-TOKENY (škály) — SPACE/RADIUS/TYPE/SHADOW/MOTION ----
// Oddelené od farieb (C). Import zo `@/theme` funguje pre oboje.
export * from "./tokens";

// ---- PALETA — štruktúrne farby cez CSS premenné (tmavý/svetlý motív) ----
// bg/surface/line/text sa prepínajú podľa motívu (--c-*, --glass-rgb v index.css),
// akcentové farby (blue/green/…) ostávajú rovnaké v oboch režimoch.
export const C = {
  bg: "var(--c-bg)",
  bg2: "var(--c-bg2)",
  surface: "rgba(var(--glass-rgb),.045)",
  surface2: "rgba(var(--glass-rgb),.07)",
  line: "rgba(var(--glass-rgb),.085)",
  line2: "rgba(var(--glass-rgb),.05)",
  text: "var(--c-text)",
  textSec: "var(--c-textSec)",
  textTer: "var(--c-textTer)",
  // akcenty — theme-aware (warm earthy), čitateľné v oboch režimoch (--a-* v index.css)
  blue: "var(--a-info)",       // slate (bývalá modrá)
  blueL: "var(--a-info)",
  green: "var(--a-green)",     // mach-oliva (brand / eco)
  greenL: "var(--a-green)",
  red: "var(--a-danger)",      // brick
  redBg: "var(--a-danger-bg)",
  purple: "var(--a-plum)",     // tlmená slivka
  gold: "var(--a-gold)",       // ochre
  teal: "var(--a-teal)",       // eukalyptus
  orange: "var(--a-clay)",     // terracotta
};

// ---- BRAND GRADIENT (warm earthy · eco) — podpis značky ----
export const GRAD = "linear-gradient(135deg, #4E7A3E 0%, #74A24A 100%)";
export const GRAD_KUZEL = "conic-gradient(from 0deg, #4E7A3E, #74A24A, #3E8C7A, #4E7A3E)";
export const GRAD_ZELENY = "linear-gradient(90deg, #4E7A3E, #8FB36A)";

// gradientový text
export const gradText: CSSProperties = {
  background: GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

// ---- GLASS POVRCH (priesvitný; biely na tmavom / jemný tmavý na svetlom) ----
export function glass(blur = 16, alpha = 0.05): CSSProperties {
  return {
    background: `rgba(var(--glass-rgb),${alpha})`,
    border: "1px solid rgba(var(--glass-rgb),.09)",
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
  };
}

// panelový glass (sheety, dock, modaly, hlavičky — nad obsahom): tmavý panel / svetlý frosted
export function glassTmavy(blur = 22, alpha = 0.66): CSSProperties {
  return {
    background: `rgba(var(--panel-rgb),${alpha})`,
    border: "1px solid rgba(var(--glass-rgb),.09)",
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
  };
}

// ---- ZRNO (filmový noise cez SVG turbulenciu) ----
export const ZRNO = `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// ---- PÁSMA SUMY (prvý nástrel, doladí sa) ----
export interface Pasmo {
  kod: string;
  text: string;
  blok: boolean;
}
export function pasmo(suma: number): Pasmo {
  if (suma < 100) return { kod: "pod100", text: "Pod 100 € sa finančná žiadosť nepublikuje — skús Ľudskú pomoc alebo priamy dar.", blok: true };
  if (suma <= 500) return { kod: "100-500", text: "KYC + telefón. Dôkaz účelu voliteľný. Štart vo štvrti, dosah rastie s podporou.", blok: false };
  if (suma <= 1000) return { kod: "500-1000", text: "KYC + povinný dôkaz k účelu. Dosah mesto po doložení.", blok: false };
  if (suma <= 2400) return { kod: "1000-2400", text: "KYC + dôkaz + položkový rozpočet. Dosah región po overení.", blok: false };
  return { kod: "nad2400", text: "Prijatá suma nad 2400 €/rok podlieha dani z príjmu. Máš voľbu: zdaniť, alebo prebytok poslať ďalšiemu (reťaz dobra). Odporúčané cez Charitu.", blok: false };
}

// ---- FOTKY (Unsplash CDN + pravatar; všade fallback na emoji) ----
export const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=60`;
export const AV = (n: number | string) => `https://i.pravatar.cc/100?img=${n}`;

// ---- SPOLOČNÉ ŠTÝLY ----
export function inp(h?: number): CSSProperties {
  return {
    width: "100%", padding: 15, borderRadius: 13,
    background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`,
    color: C.text, fontSize: 16, minHeight: h, fontFamily: "inherit", resize: "vertical",
    outline: "none", lineHeight: 1.5,
  };
}

export const infoBox: CSSProperties = {
  background: "var(--a-info-bg)", border: `1px solid ${C.line}`,
  borderRadius: 13, padding: "12px 14px", fontSize: 13.5, color: C.blue,
  lineHeight: 1.5, marginTop: 12,
};

export function btn(kind?: "primary" | "ghost" | "disabled" | string): CSSProperties {
  const base: CSSProperties = {
    flex: 1, padding: "15px 0", borderRadius: 14, fontSize: 15.5, fontWeight: 700,
    cursor: "pointer", border: "none", fontFamily: "inherit",
    transition: "transform .12s ease, box-shadow .25s ease, opacity .2s ease",
  };
  if (kind === "primary") return { ...base, background: GRAD, color: "#fff", boxShadow: "0 8px 26px rgba(78,122,62,.30), inset 0 1px 0 rgba(255,255,255,.22)" };
  if (kind === "ghost") return { ...base, background: "rgba(var(--glass-rgb),.05)", color: C.textSec, border: `1px solid ${C.line}` };
  if (kind === "disabled") return { ...base, background: "rgba(var(--glass-rgb),.06)", color: C.textTer, cursor: "not-allowed" };
  return base;
}
