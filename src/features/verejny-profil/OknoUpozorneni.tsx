// ============================================================
// KARTA 63 · 1a — „O čom vám dáme vedieť?“ (prototyp „Upozornenia farnost.dc.html“).
// Otvorí sa po ťuknutí Sledovať (farnosť aj kostol), po ťuknutí Sledujem ✓ a z Profil → Upozornenia → Moje farnosti.
// Prepínače podľa blokov stránky; pri kostole len bloky, ktoré má. Predvolené: Oznamy, Zmeny omší, Spomíname.
// Kanály: len v appke a push (server, Samuel). E-maily z farnosti sa neposielajú.
// ============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useZamokVrstvy } from "@/lib/zamokVrstvy";
import { BLOKY, BLOK_STRANKY, blokyFarnosti, blokyKostola, nastavBloky, odstranSledovanu, prestanKostol, useMojeFarnosti, type Blok } from "@/lib/mojeFarnosti";
import { useUsporiadanie, nadpisBloku, type Usporiadanie } from "@/lib/usporiadanieStranky";
import { toast } from "@/shared";

export interface CielUpozorneni { stranka: string; nazovFarnosti: string; /** sledovaný kostol */ miesto?: { id: string; nazov: string } }

/** OPRAVY 298: názov kategórie podľa premenovaného bloku stránky (bod 292), viazaný na blok */
export const nazovKategorie = (u: Usporiadanie, k: Blok, n: string) => { const b = BLOK_STRANKY[k]; return b ? nadpisBloku(u, b, n) : n; };
/** „Oznamy, Zmeny omší, Spomíname“ — čo chodí (riadok v Moje farnosti) */
export function useCoChodi(stranka: string, b: string[]): string {
  const u = useUsporiadanie(stranka);
  return BLOKY.filter(([k]) => b.includes(k)).map(([k, n]) => (k === "om" ? "Zmeny omší" : nazovKategorie(u, k, n).replace(/ farnosti$/, "").replace(/ s nami$/, ""))).join(", ") || "nič, len sledujete";
}

export function OknoUpozorneni({ ciel, onZavri, onPrestal, onUlozene }: { ciel: CielUpozorneni; onZavri: () => void; /** po „Prestať sledovať“ */ onPrestal?: () => void;
  /** OPRAVY 298: po uložení (hláška na mieste, odkiaľ sa okno otvorilo) */ onUlozene?: (t: string) => void }) {
  useZamokVrstvy();
  const MF = useMojeFarnosti();
  const { stranka, miesto } = ciel;
  const [b, setB] = useState<string[]>(() => (miesto ? blokyKostola(stranka, miesto.id) : blokyFarnosti(stranka)));
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const domovska = !miesto && MF.domovska === stranka;
  // OPRAVY 298: rovnaké okno pri farnosti aj pri každom kostole, všetky kategórie podľa blokov stránky (premenované nadpisy)
  const u = useUsporiadanie(stranka);
  const zoznam = BLOKY;
  const vsetko = zoznam.every(([k]) => b.includes(k));
  const [uklada, setUklada] = useState<"" | "caka" | "ok" | "chyba">("");
  const hotovo = async () => {
    if (uklada === "caka") return;
    setUklada("caka");
    try { await nastavBloky(stranka, miesto?.id ?? null, b); } catch { setUklada("chyba"); return; }
    setUklada("ok");
    window.setTimeout(() => { onUlozene?.(`Uložené ✓ upozornenia · ${miesto ? miesto.nazov : ciel.nazovFarnosti}`); onZavri(); }, 700);
  };
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
        <button type="button" role="switch" aria-checked={vsetko} onClick={() => setB(vsetko ? [] : zoznam.map(([k]) => k))}
          style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "6px 14px", borderRadius: 14, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: "var(--ink)", boxShadow: "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 16 }}>Všetko</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{vsetko ? "vypnúť všetko naraz" : "zapnúť všetko naraz"}</span></span>
          <span aria-hidden="true" style={{ position: "relative", width: 50, height: 30, borderRadius: 15, background: vsetko ? "#4B7A35" : "var(--track)", flex: "none", transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: `translateX(${vsetko ? 20 : 0}px)`, transition: "transform .2s" }} /></span>
        </button>
        {zoznam.map(([k, n0, s]) => { const on = b.includes(k), n = nazovKategorie(u, k, n0); return (
          <button key={k} type="button" role="switch" aria-checked={on} onClick={() => setB((x) => (on ? x.filter((y) => y !== k) : [...x, k]))}
            style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "6px 14px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--card)", fontFamily: "inherit", textAlign: "left", cursor: "pointer", color: "var(--ink)", boxShadow: "none" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15.5 }}>{n}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
            <span aria-hidden="true" style={{ position: "relative", width: 50, height: 30, borderRadius: 15, background: on ? "#4B7A35" : "var(--track)", flex: "none", transition: "background .2s" }}>
              <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: `translateX(${on ? 20 : 0}px)`, transition: "transform .2s" }} /></span>
          </button>); })}
        {uklada === "chyba" && <span role="alert" style={{ padding: "10px 14px", borderRadius: 12, background: "var(--goldBg)", border: "1.5px solid var(--goldBd)", fontSize: 14.5, fontWeight: 800 }}>Neuložilo sa · skontrolujte pripojenie</span>}
        <button type="button" onClick={() => void hotovo()} aria-live="polite" style={{ minHeight: 54, marginTop: 4, border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
          {uklada === "caka" ? "Ukladá sa…" : uklada === "ok" ? "Uložené ✓" : uklada === "chyba" ? "Skúsiť znova" : "Hotovo"}</button>
        {!domovska && <button type="button" onClick={prestat} style={{ minHeight: 44, border: "none", background: "transparent", color: "var(--cRed)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Prestať sledovať</button>}
        <span style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink3)" }}>Zmeniť to môžete kedykoľvek tu alebo v Profil → Upozornenia.</span>
      </div>
    </div>, document.body);
}
