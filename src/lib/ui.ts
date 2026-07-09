import type { CSSProperties } from "react";

// farba → priesvitný tint. Funguje pre hex ("#RRGGBB") aj CSS premennú
// ("var(--a-green)"). Pre premennú použije color-mix → tint je theme-aware
// (rozlíši sa podľa režimu rovnako ako samotná premenná).
export const tint = (c: string, a: number) => {
  if (c.startsWith("var(") || c.startsWith("color-mix")) {
    return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
  }
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Jednotná „pill" pre tagy na kartách (overené / žiadosť / kategória / TOP…).
// Výrazný kontrast: tint pozadie + farebný okraj + tučné písmo. Theme-aware (cez tint).
export const tagChip = (c: string): CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 4, flex: "none",
  fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 8, lineHeight: 1.2,
  background: tint(c, .2), color: c, border: `1px solid ${tint(c, .4)}`, whiteSpace: "nowrap",
});

// „Hrdina" = zaslúžená top úroveň karmy (Gold/Legend). Jeden zdroj pravdy pre odznak
// hrdinu naprieč modulmi (Top rebríček, karty príspevkov, cudzí profil).
export const HRDINA_COL = "var(--a-clay)";
export const jeHrdina = (karma?: string | null): boolean => karma === "Gold" || karma === "Legend";

// Komparátor pre React.memo feed kariet: shallow porovnanie VŠETKÝCH props
// OKREM funkcií (onClick/onDetail… sa vytvárajú inline pri každom renderi rodiča —
// ich identitu ignorujeme). Bezpečné, lebo closures kariet zachytávajú stabilné
// state settery a samotnú položku (`it`) — stará closure sa správa rovnako.
// Dátové objekty (it/z/f) sa porovnávajú identitou → react-query structural
// sharing drží referencie, karta sa re-renderuje len keď sa JEJ dáta zmenia.
export const rovnakeOkremFunkcii = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    const v = a[k];
    if (typeof v === "function" && typeof b[k] === "function") continue;
    if (v !== b[k]) return false;
  }
  return true;
};
