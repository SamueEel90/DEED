// ============================================================
// KARTA 57 C.7–C.8 — verejná stránka farnosti, hore: červené NAŽIVO (keď beží vysielaná omša)
// a krúžok ▶ Príhovor farára; ťuk = prehrávač na celú obrazovku. Nie je to vo feede Iskier.
// ============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { naZivo, onlineOmse, prihovor, useZmenyPrihovoru } from "@/lib/prihovor";
import { useKalendar } from "@/lib/kalendarFarnosti";

const teraz = () => new Date();

export function PrihovorNaStranke({ strankaId, pad, svetly }: { strankaId: string; pad?: string; /** na tmavej titulke biely text */ svetly?: boolean }) {
  useZmenyPrihovoru(); useKalendar(strankaId);
  const [cas, setCas] = useState(teraz);
  useEffect(() => { const t = window.setInterval(() => setCas(teraz()), 30000); return () => window.clearInterval(t); }, []);
  const [otv, setOtv] = useState(false);
  useEffect(() => {
    if (!otv) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOtv(false); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [otv]);
  const p = prihovor(strankaId);
  const zivo = naZivo(strankaId, cas);
  if (!p && !zivo) return null;
  const url = onlineOmse(strankaId).url.trim();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: pad }}>
      {zivo && <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "#2A1414", border: "1.5px solid #B3261E", textDecoration: "none" }}>
        <span style={{ flex: "none", height: 26, padding: "0 9px", borderRadius: 7, background: "#B3261E", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>NAŽIVO</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15.5, color: "#fff" }}>Svätá omša práve beží</b><span style={{ fontSize: 13, color: "#E8C9C5" }}>dnes o {zivo}</span></span>
        <span style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, background: "#B3261E", color: "#fff", fontSize: 14.5, fontWeight: 800, display: "flex", alignItems: "center" }}>Pozrieť ›</span>
      </a>}
      {p && <button type="button" onClick={() => setOtv(true)} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 12, padding: 0, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: svetly ? "#fff" : "var(--ink)", boxShadow: "none" }}>
        <span aria-hidden="true" style={{ flex: "none", width: 64, height: 64, borderRadius: "50%", padding: 3, background: "conic-gradient(#C9A24A,#4B7A35,#C9A24A)", boxSizing: "border-box" }}>
          <span style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#1D211B", border: "2px solid var(--bg)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 0, height: 0, borderLeft: "14px solid #fff", borderTop: "9px solid transparent", borderBottom: "9px solid transparent", marginLeft: 4 }} /></span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>Príhovor farára</b><span style={{ fontSize: 13.5, color: svetly ? "#E8E1D3" : "var(--ink3)" }}>krátke video · ťuknite a prehrá sa</span></span>
      </button>}
      {otv && p && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Príhovor farára" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: "none", padding: "calc(14px + env(safe-area-inset-top, 0px)) 16px 10px", display: "flex", alignItems: "center", gap: 12 }}>
            <b style={{ flex: 1, fontSize: 17, color: "#fff" }}>Príhovor farára</b>
            <button type="button" onClick={() => setOtv(false)} autoFocus style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#111" }}>× Zavrieť</button>
          </div>
          <video src={p.src} controls playsInline autoPlay style={{ flex: 1, minHeight: 0, width: "100%", background: "#000", objectFit: "contain" }} />
        </div>, document.body)}
    </div>);
}
