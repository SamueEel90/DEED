// ============================================================
// DEED · Nahlásiť z menu ⋯ (skutok, zbierka, komentár, profil) — OPRAVY 51.
// Jedna obrazovka pre celú appku: Nahlásiť problém (karta 24 · 2k), otvorená rovno
// s tým, čo sa nahlasuje. Nahlásenie ide do moderácie (lib/osobne → DB alebo lokálne).
// ============================================================
import { NahlasitProblem } from "@/features/profil/Pomoc";

/** typ predmetu podľa modulu / názvu, ak ho volajúci nepovie */
const typPodla = (co: string, modul?: string) =>
  /^Profil ·/.test(co) ? "Profil" : modul === "help" ? "Žiadosť o pomoc" : modul === "zbierka" ? "Zbierka" : modul === "good" ? "Skutok" : "Príspevok";

export function NahlasitSheet({ co, refId, modul, onClose, typ }: {
  co: string;                 // názov nahlasovaného obsahu
  refId?: string | number;
  modul?: string;
  onClose?: () => void;
  /** Skutok · Zbierka · Komentár · Profil … */
  typ?: string;
  toast?: (m: string) => void;
}) {
  return (
    <NahlasitProblem z={175} obrazovka={typ ?? typPodla(co, modul)} onBack={() => onClose?.()}
      predmet={{ typ: typ ?? typPodla(co, modul), nazov: co.replace(/^Profil · /, ""), refId, modul }} />
  );
}
