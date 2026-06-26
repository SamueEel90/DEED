// ============================================================
// MODUL AKTIVITY — konfigurácia (palety, domény, mapy pre engine)
// Bez JSX → čistý .ts. Hodnoty 1:1 prenesené z pôvodného Aktivity.jsx.
// ============================================================

// ---- lokálna paleta (z prototypu) — theme-aware (tmavý aj svetlý režim) ----
// „Bg" tóny sú priesvitné akcentové tinty → fungujú v oboch režimoch (nie napevno tmavé)
export const A = {
  surface: "rgba(var(--glass-rgb),.05)", surface2: "rgba(var(--glass-rgb),.075)", line: "rgba(var(--glass-rgb),.10)", line2: "rgba(var(--glass-rgb),.06)",
  txt: "var(--c-text)", txt2: "var(--c-textSec)", txt3: "var(--c-textTer)",
  blue: "var(--a-info)", blueBg: "var(--a-info-bg)", blueBd: tint("var(--a-info)", .4),
  green: "var(--a-green)", greenBg: "var(--a-green-bg)", greenBd: tint("var(--a-green)", .4),
  red: "var(--a-danger)", redBg: "var(--a-danger-bg)", redBd: tint("var(--a-danger)", .4),
  purple: "var(--a-plum)", purpleBg: "var(--a-plum-bg)", purpleBd: tint("var(--a-plum)", .4),
  gold: "var(--a-gold)", goldBg: "var(--a-gold-bg)", orange: "var(--a-clay)",
};

export interface DomKonfig { label: string; ic: string; c: string; bg: string; bd: string; tint: string; }

// ---- DOMÉNY ----
// earthy hue + theme-aware tinty (bg/bd/tint odvodené z hue → fungujú v oboch režimoch)
const dk = (label: string, ic: string, c: string): DomKonfig => ({ label, ic, c, bg: tint(c, .12), bd: tint(c, .34), tint: tint(c, .06) });
export const DOM: Record<string, DomKonfig> = {
  mix:     dk("Mix", "◆", "var(--a-green)"),    // olivová (brand)
  sport:   dk("Šport", "🏃", "var(--a-info)"),  // slate
  art:     dk("Art", "🎨", "var(--a-plum)"),    // slivka
  learn:   dk("Learn", "📚", "var(--a-teal)"),  // eukalyptus
  eko:     dk("Eko", "🌳", "var(--a-green)"),   // listová zelená
  zdravie: dk("Zdravie", "❤️", "var(--a-clay)"),// terracotta
};
export const ORDER = ["zdravie", "learn", "sport", "eko", "art"]; // mix = automatický režim, bez tlačidla

// ---- obohatenie pre Feed algoritmus (Časť B) ----
export const SKORE_VELKOST: Record<string, number> = { big: 7.5, med: 4.5, small: 2.0, req: 4.0 };
// type → engine typ (skutok/ziadost/charita) + modul (pre frekvenčný strop)
export const TYP_ENGINE: Record<string, string> = { help: "ziadost", case: "charita" };
export const MODUL_ENGINE: Record<string, string> = { help: "help", workshop: "workshop", case: "charity" };

export const KARMA_ORDER: Record<string, number> = { "Nováčik": 0, Bronze: 1, Silver: 2, Gold: 3 };

// farba → priesvitný tint; podporuje hex aj CSS premennú (color-mix → theme-aware)
export function tint(c: string, a: number) {
  if (c.startsWith("var(") || c.startsWith("color-mix")) {
    return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
  }
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
