// ============================================================
// OPRAVY 258 — rám písania na mobile a tablete na výšku (prototyp „Editor mobil - celá obrazovka").
// Prekryje celú obrazovku aj spodné menu appky, stránka pod ním sa nehýbe.
// Hore pevná lišta: ‹ Späť · PÍŠETE · KROK N Z M + čo · Náhľad, pod ňou pás krokov.
// Pod lištou len polia, jedno rolovanie. Dole pevne ‹ Krok N a Pokračovať ›, nad klávesnicou (visualViewport).
// Náhľad nie je stále na obrazovke: ťuk na Náhľad = celá plocha, × Zavrieť vráti na to isté miesto.
// ============================================================
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** mobil, telefón na šírku a tablet na výšku — tam sa píše v ráme na celú obrazovku */
const DOTAZ = "(max-width: 759px), (orientation: portrait) and (max-width: 1100px), (max-height: 500px)";
export function useRamPisania(): boolean {
  const [m, setM] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(DOTAZ).matches);
  useEffect(() => { const mq = window.matchMedia?.(DOTAZ); if (!mq) return; const f = () => setM(mq.matches); f(); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, []);
  return m;
}

/** výška a posun viditeľnej plochy (klávesnica na iPhone zmenší visualViewport, nie okno) */
function useViditelne() {
  const [v, setV] = useState(() => ({ h: typeof window !== "undefined" ? window.innerHeight : 800, t: 0 }));
  useEffect(() => {
    const vv = window.visualViewport;
    const f = () => setV({ h: vv ? vv.height : window.innerHeight, t: vv ? vv.offsetTop : 0 });
    f();
    vv?.addEventListener("resize", f); vv?.addEventListener("scroll", f); window.addEventListener("resize", f);
    return () => { vv?.removeEventListener("resize", f); vv?.removeEventListener("scroll", f); window.removeEventListener("resize", f); };
  }, []);
  return v;
}

const OKO = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;

export function RamPisania({ nazov, kroky, onSpat, onNahlad, nahlad, onZavriNahlad, nahladObsah, dole, chyba, teloRef, vrstva, children }: {
  /** čo sa píše (Parte, Blahoželanie…) */ nazov: string;
  /** krok (od 0) a počet krokov; bez = jeden krok */ kroky?: { i: number; n: number };
  onSpat: () => void; onNahlad?: () => void;
  /** náhľad je otvorený */ nahlad?: boolean; onZavriNahlad?: () => void;
  /** obsah náhľadu (bez = náhľad kreslí obsah tela sám, napr. editor v iframe) */ nahladObsah?: ReactNode;
  /** pevne dole */ dole?: ReactNode; chyba?: string;
  teloRef: RefObject<HTMLDivElement>; /** nad rámom (hláška) */ vrstva?: ReactNode; children: ReactNode;
}) {
  const v = useViditelne();
  // stránka pod rámom sa nehýbe, žiadne obnovenie ťahom
  useEffect(() => {
    const h = document.documentElement, b = document.body;
    const p = { ho: h.style.overflow, hb: h.style.overscrollBehavior, bo: b.style.overflow };
    h.style.overflow = "hidden"; h.style.overscrollBehavior = "none"; b.style.overflow = "hidden";
    return () => { h.style.overflow = p.ho; h.style.overscrollBehavior = p.hb; b.style.overflow = p.bo; };
  }, []);
  const tl = { flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", boxShadow: "none" } as const;
  return createPortal(
    <div className="sc-tokeny" role="dialog" aria-modal="true" aria-label={nazov}
      style={{ position: "fixed", left: 0, right: 0, top: v.t, height: v.h, zIndex: 1250, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column", overscrollBehavior: "contain", fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      <div style={{ flex: "none", padding: "calc(12px + env(safe-area-inset-top, 0px)) 14px 12px", borderBottom: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 10 }}>
        {nahlad ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--gInk)" }}>NÁHĽAD</span><b style={{ fontSize: 17 }}>Takto to uvidia ľudia</b></span>
            <button type="button" onClick={onZavriNahlad} style={{ ...tl, minHeight: 48, padding: "0 18px", border: "none", background: "var(--ink)", color: "var(--bg)", fontSize: 16 }}>× Zavrieť</button>
          </div>
        ) : <>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={onSpat} style={{ ...tl, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)" }}>‹ Späť</button>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--gInk)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kroky && kroky.n > 1 ? `PÍŠETE · KROK ${kroky.i + 1} Z ${kroky.n}` : "PÍŠETE"}</span>
              <b style={{ fontSize: 17, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nazov}</b>
            </span>
            {onNahlad && <button type="button" onClick={onNahlad} style={{ ...tl, border: "none", background: "var(--ink)", color: "var(--bg)" }}>{OKO}Náhľad</button>}
          </div>
          {kroky && kroky.n > 1 && <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: `repeat(${kroky.n},1fr)`, gap: 4 }}>
            {Array.from({ length: kroky.n }, (_, i) => <span key={i} style={{ height: 5, borderRadius: 3, background: i <= kroky.i ? "#8DB866" : "var(--cardBd)" }} />)}
          </div>}
        </>}
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div ref={teloRef} style={{ position: "absolute", inset: 0, overflowY: nahlad && !nahladObsah ? "hidden" : "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", background: nahlad && !nahladObsah ? "#14110B" : undefined }}>{children}</div>
        {nahlad && nahladObsah && <div style={{ position: "absolute", inset: 0, overflowY: "auto", overscrollBehavior: "contain", background: "#14110B", padding: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 460 }}>{nahladObsah}</div>
        </div>}
      </div>
      {nahlad ? <span style={{ flex: "none", padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", fontSize: 14.5, color: "var(--ink3)", textAlign: "center" }}>Zatvoríte a ste späť pri poli, kde ste skončili.</span>
        : (dole || chyba) && <div style={{ flex: "none", padding: "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 10 }}>
          {chyba && <span role="alert" style={{ padding: "10px 14px", borderRadius: 12, background: "var(--goldBg)", border: "1.5px solid var(--goldBd)", fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>{chyba}</span>}
          {dole}
        </div>}
      {vrstva}
    </div>, document.body);
}

/** ‹ Krok N · Pokračovať › (v poslednom kroku vlastný text) */
export function DoleKroky({ i, onSpat, onDalej, dalej = "Pokračovať ›", zakazane }: { i: number; onSpat: () => void; onDalej: () => void; dalej?: string; zakazane?: boolean }) {
  const b = { minHeight: 54, borderRadius: 14, fontFamily: "inherit", fontSize: 16.5, fontWeight: 800, cursor: "pointer", boxShadow: "none" } as const;
  return (
    <div style={{ display: "grid", gridTemplateColumns: i > 0 ? "auto 1fr" : "1fr", gap: 10 }}>
      {i > 0 && <button type="button" onClick={onSpat} style={{ ...b, padding: "0 18px", border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontSize: 16 }}>‹ Krok {i}</button>}
      <button type="button" onClick={onDalej} disabled={zakazane} style={{ ...b, border: "none", background: zakazane ? "var(--btn)" : "#4B7A35", color: zakazane ? "var(--ink2)" : "#fff", cursor: zakazane ? "default" : "pointer" }}>{dalej}</button>
    </div>);
}
