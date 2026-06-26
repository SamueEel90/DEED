// ============================================================
// MODUL AKTIVITY — konfigurácia (palety, domény, mapy pre engine)
// Bez JSX → čistý .ts. Hodnoty 1:1 prenesené z pôvodného Aktivity.jsx.
// ============================================================

// ---- lokálna paleta (z prototypu) — theme-aware (tmavý aj svetlý režim) ----
// „Bg" tóny sú priesvitné akcentové tinty → fungujú v oboch režimoch (nie napevno tmavé)
export const A = {
  surface: "rgba(var(--glass-rgb),.05)", surface2: "rgba(var(--glass-rgb),.075)", line: "rgba(var(--glass-rgb),.10)", line2: "rgba(var(--glass-rgb),.06)",
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
  blue: "#5BA8F0", blueBg: "rgba(91,168,240,.14)", blueBd: "rgba(42,94,142,.55)",
  green: "#3DD68C", greenBg: "rgba(61,214,140,.13)", greenBd: "rgba(46,125,82,.55)",
  red: "#F2706F", redBg: "rgba(242,112,111,.12)", redBd: "rgba(122,48,48,.6)",
  purple: "#A98BF0", purpleBg: "rgba(169,139,240,.15)", purpleBd: "rgba(122,91,216,.5)",
  gold: "#E7C766", goldBg: "rgba(231,199,102,.13)", orange: "#F0A85E",
};

export interface DomKonfig { label: string; ic: string; c: string; bg: string; bd: string; tint: string; }

// ---- DOMÉNY ----
export const DOM: Record<string, DomKonfig> = {
  mix:     { label: "Mix",     ic: "◆",  c: "#3DD6CE", bg: "#0d2422", bd: "#2E9E9E", tint: "#0B0C0F" },
  sport:   { label: "Šport",   ic: "🏃", c: "#5BA8F0", bg: "#13243a", bd: "#2A5E8E", tint: "#080d15" },
  art:     { label: "Art",     ic: "🎨", c: "#A98BF0", bg: "#1a1430", bd: "#7A5BD8", tint: "#0e0a18" },
  learn:   { label: "Learn",   ic: "📚", c: "#46C2A0", bg: "#0d2620", bd: "#2E8E72", tint: "#081512" },
  eko:     { label: "Eko",     ic: "🌳", c: "#5BD06E", bg: "#0f2417", bd: "#2E7D52", tint: "#0a130c" },
  zdravie: { label: "Zdravie", ic: "❤️", c: "#E98AAD", bg: "#2a1620", bd: "#8E4A63", tint: "#150a0f" },
};
export const ORDER = ["zdravie", "learn", "sport", "eko", "art"]; // mix = automatický režim, bez tlačidla

// ---- obohatenie pre Feed algoritmus (Časť B) ----
export const SKORE_VELKOST: Record<string, number> = { big: 7.5, med: 4.5, small: 2.0, req: 4.0 };
// type → engine typ (skutok/ziadost/charita) + modul (pre frekvenčný strop)
export const TYP_ENGINE: Record<string, string> = { help: "ziadost", case: "charita" };
export const MODUL_ENGINE: Record<string, string> = { help: "help", workshop: "workshop", case: "charity" };

export const KARMA_ORDER: Record<string, number> = { "Nováčik": 0, Bronze: 1, Silver: 2, Gold: 3 };

// hex → priesvitné rgba (akcentové tinty fungujúce v tmavom aj svetlom režime)
export function tint(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
