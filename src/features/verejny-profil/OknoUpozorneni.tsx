// ============================================================
// KARTA 63 · 1a — „O čom vám dáme vedieť?“ (prototyp „Upozornenia farnost.dc.html“).
// Otvorí sa po ťuknutí Sledovať (farnosť aj kostol), po ťuknutí Sledujem ✓ a z Profil → Upozornenia → Moje farnosti.
// Prepínače podľa blokov stránky; pri kostole len bloky, ktoré má. Predvolené: Oznamy, Zmeny omší, Spomíname.
// Kanály: len v appke a push (server, Samuel). E-maily z farnosti sa neposielajú.
// ============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useZamokVrstvy } from "@/lib/zamokVrstvy";
import { BLOKY, BLOKY_KOSTOLA, blokyFarnosti, blokyKostola, nastavBloky, odstranSledovanu, prestanKostol, useMojeFarnosti } from "@/lib/mojeFarnosti";
import { toast } from "@/shared";

export interface CielUpozorneni { stranka: string; nazovFarnosti: string; /** sledovaný kostol */ miesto?: { id: string; nazov: string } }

export function OknoUpozorneni({ ciel, onZavri, onPrestal }: { ciel: CielUpozorneni; onZavri: () => void; /** po „Prestať sledovať“ */ onPrestal?: () => void }) {
  useZamokVrstvy();
  const MF = useMojeFarnosti();
  const { stranka, miesto } = ciel;
  const [b, setB] = useState<string[]>(() => (miesto ? blokyKostola(stranka, miesto.id) : blokyFarnosti(stranka)));
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const domovska = !miesto && MF.domovska === stranka;
  const zoznam = miesto ? BLOKY.filter(([k]) => BLOKY_KOSTOLA.includes(k)) : BLOKY;
  const hotovo = () => { void nastavBloky(stranka, miesto?.id ?? null, b).catch((e: Error) => toast(e.message)); onZavri(); };
  const prestat = () => {
    void (miesto ? prestanKostol(stranka, miesto.id) : odstranSledovanu(stranka)).catch((e: Error) => toast(e.message));
    onPrestal?.(); onZavri();
  };
  const kto = (miesto ? `${miesto.nazov} · ${ciel.nazovFarnosti}` : ciel.nazovFarnosti).toLocaleUpperCase("sk-SK");
  return createPortal(
    <div className="sc-tokeny" onClick={onZavri} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(20,17,11,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div role="dialog" aria-modal="true" aria-label="O čom vám dáme vedieť?" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520, maxHeight: "92%", overflowY: "auto", overscrollBehavior: "contain", borderRadius: "26px 26px 0 0", background: "var(--bg)", color: "var(--ink)", padding: "14px 18px max(26px, env(safe-area-inset-bottom))", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
        <span aria-hidden="true" style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, background: "var(--track)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--gInk)" }}>{domovska ? "VAŠA FARNOSŤ" : "SLEDUJETE ✓"} · {kto}</span>
          <b style={{ fontSize: 21 }}>O čom vám dáme vedieť?</b>
          <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Najviac jedna správa denne. Zrušená omša a parte prídu hneď.</span>
        </div>
        {zoznam.map(([k, n, s]) => { const on = b.includes(k); return (
          <button key={k} type="button" role="switch" aria-checked={on} onClick={() => setB((x) => (on ? x.filter((y) => y !== k) : [...x, k]))}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 14px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--card)", fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: "var(--ink)", boxShadow: "none" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15.5 }}>{n}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
            <span aria-hidden="true" style={{ position: "relative", width: 50, height: 30, borderRadius: 15, background: on ? "#4B7A35" : "var(--track)", flex: "none", transition: "background .2s" }}>
              <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .2s" }} /></span>
          </button>); })}
        <button type="button" onClick={hotovo} style={{ minHeight: 54, marginTop: 4, border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Hotovo</button>
        {!domovska && <button type="button" onClick={prestat} style={{ minHeight: 44, border: "none", background: "transparent", color: "var(--cRed)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Prestať sledovať</button>}
        <span style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink3)" }}>Zmeniť to môžete kedykoľvek tu alebo v Profil → Upozornenia.</span>
      </div>
    </div>, document.body);
}
