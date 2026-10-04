// KARTA 47 · jednoduché obrazovky obsahu tvorcu (dočasné, kým dizajnérka nedodá návrh a testovacie texty):
// Čítačka článku (nadpis, autor, obrázok, text, Späť) · náš prehrávač videa (celá šírka, zástupné video)
// · hárok „Odchádzaš z DEED+ · {platforma}" (Pokračovať otvorí odkaz v novom okne, Zostať zavrie).
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { PortalVp } from "./casti";
import { PRUH } from "./charitaCasti";

const tlSpat: CSSProperties = { alignSelf: "flex-start", height: 44, padding: "0 14px 0 8px", border: "1px solid var(--cardBd)", borderRadius: 14, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none", fontFamily: "inherit" };
function Spat({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label="Späť" style={tlSpat}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť</button>;
}
function Obrazovka({ pc, children }: { pc: boolean; children: ReactNode }) {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--ink)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: pc ? "24px 32px 80px" : "max(14px, env(safe-area-inset-top)) 16px 140px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

/** čítačka článku — text môže chýbať (prázdna čítačka s nadpisom) */
export function Citacka({ pc, nadpis, autor, foto, text, onBack }: { pc: boolean; nadpis: string; autor: string; foto?: string; text?: string; onBack: () => void }) {
  return (
    <Obrazovka pc={pc}>
      <Spat onClick={onBack} />
      {foto && <span style={{ display: "block", width: "100%", aspectRatio: "16/9", borderRadius: 22, background: `url('${foto}') center/cover no-repeat #3a3530` }} />}
      <b style={{ fontSize: pc ? 32 : 26, lineHeight: 1.15, letterSpacing: "-.01em" }}>{nadpis}</b>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink3)" }}>{autor}</span>
      {text && <div style={{ fontSize: 16, lineHeight: 1.65, color: "var(--ink2)", whiteSpace: "pre-line" }}>{text}</div>}
    </Obrazovka>
  );
}

/** náš prehrávač videa na celú šírku (zatiaľ zástupné video) */
export function Prehravac({ pc, nadpis, autor, src = "/video/nakup.mp4", onBack }: { pc: boolean; nadpis: string; autor: string; src?: string; onBack: () => void }) {
  return (
    <Obrazovka pc={pc}>
      <Spat onClick={onBack} />
      <video src={src} controls playsInline preload="metadata" style={{ display: "block", width: "100%", aspectRatio: "16/9", borderRadius: 22, background: "#000", objectFit: "contain" }} />
      <b style={{ fontSize: pc ? 26 : 22, lineHeight: 1.2 }}>{nadpis}</b>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink3)" }}>{autor}</span>
    </Obrazovka>
  );
}

/** hárok pred odchodom z DEED+ (mobil zdola, PC v strede) */
export function OdchodHarok({ pc, stit, kam, url, onClose }: { pc: boolean; stit: string; kam: string; url: string; onClose: () => void }) {
  const [vidno, setVidno] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setVidno(true))); return () => cancelAnimationFrame(r); }, []);
  const zavri = () => { setVidno(false); window.setTimeout(onClose, 260); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const pokracuj = () => { try { window.open(url, "_blank", "noopener,noreferrer"); } catch { /* sandbox */ } zavri(); };
  const tl: CSSProperties = { flex: 1, height: 50, borderRadius: 14, cursor: "pointer", fontSize: 15.5, fontWeight: 800, boxShadow: "none", fontFamily: "inherit" };
  const obsah = (<>
    <b style={{ fontSize: 19, lineHeight: 1.3 }}>Odchádzaš z DEED+ · {kam}</b>
    <div style={{ display: "flex", gap: 10 }}>
      <button type="button" onClick={zavri} style={{ ...tl, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)" }}>Zostať</button>
      <button type="button" onClick={pokracuj} style={{ ...tl, border: "none", background: PRUH, color: "#fff" }}>Pokračovať</button>
    </div>
  </>);
  const karta: CSSProperties = { position: "fixed", zIndex: 81, background: "var(--bg)", color: "var(--ink)", boxShadow: "0 30px 80px rgba(0,0,0,.45)", display: "flex", flexDirection: "column", gap: 16 };
  return (
    <PortalVp stit={stit}>
      <div onClick={zavri} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(10,8,5,.55)", opacity: vidno ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-label={`Odchádzaš z DEED+ · ${kam}`} style={pc
        ? { ...karta, left: "50%", top: "50%", width: "min(440px, calc(100% - 32px))", padding: "22px 22px 20px", borderRadius: 24, opacity: vidno ? 1 : 0, transform: `translate(-50%, -50%) scale(${vidno ? 1 : 0.94})`, transition: "opacity .25s ease, transform .3s ease" }
        : { ...karta, left: 0, right: 0, bottom: 0, padding: "22px 18px max(24px, env(safe-area-inset-bottom))", borderRadius: "26px 26px 0 0", transform: `translateY(${vidno ? "0%" : "105%"})`, transition: "transform .32s cubic-bezier(.2,.8,.2,1)" }}>
        {obsah}
      </div>
    </PortalVp>
  );
}
