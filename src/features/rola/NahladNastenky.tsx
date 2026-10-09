// ============================================================
// KARTA 56H §6 · 57C §1 — „Pozrieť celú verejnú stránku ›" (Správa farnosti → Oznamy).
// Ukazuje tú istú živú stránku ako pre veriacich (NastenkaFarnosti) — len to, čo farár a veriaci zverejnili.
// Celá obrazovka (PC, tablet, mobil): prekryje aj lištu appky, pevný pruh hore „‹ Späť do Správy",
// Späť aj Esc vráti presne tam, odkiaľ sa otvoril (aj posun). Len na pozretie — ťuk nič nezmení.
// ============================================================
import { useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { ProfilStranky } from "@/lib/profilStranky";
import { NastenkaFarnosti } from "@/features/verejny-profil/NastenkaFarnosti";
import { toast } from "@/shared";

const ZELENA = "#4B7A35";

export function NahladNastenky({ strankaId, meno, profil, mobil, onSpat }: { strankaId: string; meno: string; profil: ProfilStranky | null; mobil: boolean; onSpat: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onSpat(); };
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, [onSpat]);
  // pod náhľadom sa nič nehýbe; po zatvorení sa vráti posun stránky aj fokus na tlačidlo, ktoré náhľad otvorilo
  useLayoutEffect(() => {
    const spat = document.activeElement as HTMLElement | null;
    const posuny: [Element, number][] = [];
    for (let e: Element | null = spat; e; e = e.parentElement) if (e.scrollTop) posuny.push([e, e.scrollTop]);
    if (document.scrollingElement) posuny.push([document.scrollingElement, document.scrollingElement.scrollTop]);
    const ov = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ov; posuny.forEach(([e, t]) => { e.scrollTop = t; }); spat?.focus?.({ preventScroll: true }); };
  }, []);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Verejná stránka" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#14110B", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: mobil ? "10px 12px" : "12px 24px", background: "#14110B", borderBottom: "1px solid #2E2A22" }}>
        <button type="button" onClick={onSpat} autoFocus style={{ flex: "none", minHeight: 48, padding: "0 18px", border: "none", borderRadius: 12, background: ZELENA, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", boxShadow: "none" }}>‹ Späť do Správy</button>
        <span style={{ minWidth: 0, fontSize: 14, fontWeight: 700, color: "#E8E1D3" }}>Takto vašu stránku vidia veriaci</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: mobil ? 0 : 24 }}>
        {/* KARTA 57C §1: tá istá živá stránka ako pre veriacich; tu len na pozretie (ťuk nič nezmení) */}
        <div onClickCapture={(e) => { if ((e.target as HTMLElement).closest("button,a")) { e.preventDefault(); e.stopPropagation(); toast("Toto je náhľad. Ťuknúť sa dá na verejnej stránke."); } }}
          style={{ maxWidth: 1440, margin: "0 auto", borderRadius: mobil ? 0 : 16, overflow: "hidden" }}>
          <NastenkaFarnosti strankaId={strankaId} meno={meno} profil={profil} stit="Silver" />
        </div>
      </div>
    </div>,
    document.body);
}
