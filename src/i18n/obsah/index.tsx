// ============================================================
// OPRAVY 79b · preklad OBSAHU (príspevky, názvy akcií a skutkov, poďakovania, oznamy firmy…).
// Prekladá sa všetko okrem mien ľudí, názvov firiem a značiek. V ostrej verzii preloží server
// (strojový preklad), zatiaľ je to pamäť prekladov pre ukážkové dáta: presný SK text → EN.
// Pri preloženom obsahu je odkaz „Zobraziť originál" (a späť „Zobraziť preklad").
// ============================================================
import { useState, type ReactNode } from "react";
import { useT, tTeraz, type T } from "@/i18n";
import { priatelia } from "./priatelia";
import { skutky } from "./skutky";
import { firma } from "./firma";

const EN: Record<string, string> = { ...priatelia, ...skutky, ...firma };
const PAMAT: Record<string, Record<string, string>> = { en: EN };

/** preklad jedného textu obsahu (bez odkazu) — ak preklad nemáme, vráti originál */
export function prelozObsah(s: string, t: T = tTeraz()): string {
  if (t.jazyk === "sk" || !s) return s;
  return PAMAT[t.jazyk]?.[s] ?? PAMAT[t.jazyk]?.[s.trim()] ?? s;
}
export const maPreklad = (s: string, t: T) => t.jazyk !== "sk" && prelozObsah(s, t) !== s;

/**
 * Preklad obsahu v jednej sekcii s odkazom Zobraziť originál / Zobraziť preklad.
 *   const pr = usePrekladObsahu();  …  {pr.p(akcia.nazov)}  …  {pr.odkaz}
 * Odkaz sa ukáže len v inom jazyku ako slovenčine.
 */
export function usePrekladObsahu(): { p: (s: string) => string; original: boolean; odkaz: ReactNode } {
  const t = useT();
  const [original, setOriginal] = useState(false);
  const p = (s: string) => (original ? s : prelozObsah(s, t));
  const odkaz = t.jazyk === "sk" ? null : <OdkazOriginal original={original} onClick={() => setOriginal(!original)} />;
  return { p, original, odkaz };
}

export function OdkazOriginal({ original, onClick }: { original: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button type="button" onClick={onClick} aria-pressed={original}
      style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 2px", border: "none", background: "none", boxShadow: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h12M9 3v2c0 4-2.5 7.5-6 9M5 9c1.5 3 4.5 5 8 6M13 21l4-9 4 9M14.5 18h5" /></svg>
      {original ? t("obsah.zobrazitPreklad") : t("obsah.prelozene")}
    </button>
  );
}
