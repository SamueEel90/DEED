// ============================================================
// DEED · Dizajn-tokeny — číselné škály (px), padnú priamo do inline
// štýlov: padding: SPACE.md, borderRadius: RADIUS.md, ...TYPE.bodyL.
// Re-exportované z @/theme — import { C, SPACE } from "@/theme".
// Hodnoty zvolené = najčastejšia dnešná hodnota v klastri → adopcia
// posúva render ≤2 px (vizuálny no-op). Farby ostávajú v C (theme.ts).
// ============================================================
import type { CSSProperties } from "react";

// ---- SPACING (4px základ) — mapuje 30+ ad-hoc hodnôt ----
export const SPACE = {
  none: 0,
  xxs: 4, // 3,4,5      → 4
  xs: 8, //  6,7,8,9    → 8
  sm: 12, // 10,11,12,13 → 12  (najväčší near-dupe klaster)
  md: 16, // 14,16,18   → 16
  lg: 22, // 20,22,24   → 22
  xl: 28, // 26,28      → 28
  xxl: 40,
  gutter: 14, // horizontálne okraje modulov/hlavičiek (nech sa edge neposunie)
} as const;

// ---- RADIUS — mapuje 20+ hodnôt ----
export const RADIUS = {
  xs: 8, //  2,4,6,7,8       → 8 (chipy/badge)
  sm: 12, // 9,10,11,12,13   → 12 (inputy, malé karty)
  md: 16, // 14,15,16,17,18  → 16 (feed karty)
  lg: 22, // 20,22           → 22 (vnútro sheetu)
  xl: 26, // 26,30           → 26 (horné rohy sheetu — ako dnešný Modal)
  pill: 999, // pilulky (bolo 30/50%)
  round: "50%",
} as const;

// ---- TYPE — size + weight + lineHeight spolu ----
export const FW = { reg: 400, med: 500, semi: 600, bold: 700, black: 800 } as const;
export const TYPE = {
  micro: { fontSize: 11, lineHeight: 1.35, fontWeight: FW.semi }, //   7.5,9,9.5,10,10.5,11
  caption: { fontSize: 12.5, lineHeight: 1.4, fontWeight: FW.semi }, // 11.5,12,12.5,13
  body: { fontSize: 14, lineHeight: 1.5, fontWeight: FW.reg }, //      13.5,14,14.5
  bodyL: { fontSize: 15.5, lineHeight: 1.5, fontWeight: FW.bold }, //  15,15.5,16
  title: { fontSize: 17, lineHeight: 1.4, fontWeight: FW.bold }, //    16,17,18
  h2: { fontSize: 20, lineHeight: 1.3, fontWeight: FW.black }, //      20,22
  h1: { fontSize: 24, lineHeight: 1.25, fontWeight: FW.black },
} as const satisfies Record<string, CSSProperties>;

// ---- SHADOW — mapuje 20+ bespoke stringov na ~5 elevácií ----
export const SHADOW = {
  sm: "0 4px 14px rgba(0,0,0,.18)",
  md: "0 8px 26px rgba(0,0,0,.28)",
  lg: "0 18px 60px rgba(0,0,0,.45)", // sheet (= dnešný Modal -18px 60px)
  glow: "0 8px 26px rgba(99,134,255,.32), inset 0 1px 0 rgba(255,255,255,.25)", // primary btn (= btn())
  glowGreen: "0 10px 34px rgba(0,0,0,.45), 0 0 24px rgba(67,224,200,.12)", // toast
} as const;

// ---- MOTION — durations (s, pre Framer) + easings + tap ----
export const DUR = { fast: 0.14, base: 0.22, slow: 0.32, slower: 0.45 } as const;
export const EASE = {
  out: [0.22, 0.9, 0.3, 1] as [number, number, number, number], // = dnešný lightbox cubic-bezier
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: "spring", stiffness: 380, damping: 32 } as const,
} as const;
export const TAP = { scale: 0.97 } as const; // štandardný whileTap
