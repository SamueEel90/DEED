// ============================================================
// KARTA 57 C.7–C.8 — verejná stránka, hore: červené NAŽIVO (keď beží vysielaná omša).
// OPRAVY 269: krúžok ▶ Príhovor farára hore je preč — príhovor sa spúšťa len v bloku Vypočuj si.
// ============================================================
import { useEffect, useState } from "react";
import { naZivo, onlineOmse, useZmenyPrihovoru } from "@/lib/prihovor";
import { useKalendar } from "@/lib/kalendarFarnosti";

const teraz = () => new Date();

export function PrihovorNaStranke({ strankaId, pad }: { strankaId: string; pad?: string; /** na tmavej titulke biely text */ svetly?: boolean }) {
  useZmenyPrihovoru(); useKalendar(strankaId);
  const [cas, setCas] = useState(teraz);
  useEffect(() => { const t = window.setInterval(() => setCas(teraz()), 30000); return () => window.clearInterval(t); }, []);
  const zivo = naZivo(strankaId, cas);
  if (!zivo) return null;
  const url = onlineOmse(strankaId).url.trim();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: pad }}>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, background: "#2A1414", border: "1.5px solid #B3261E", textDecoration: "none" }}>
        <span style={{ flex: "none", height: 26, padding: "0 9px", borderRadius: 7, background: "#B3261E", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>NAŽIVO</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15.5, color: "#fff" }}>Svätá omša práve beží</b><span style={{ fontSize: 13, color: "#E8C9C5" }}>dnes o {zivo}</span></span>
        <span style={{ flex: "none", minHeight: 44, padding: "0 14px", borderRadius: 12, background: "#B3261E", color: "#fff", fontSize: 14.5, fontWeight: 800, display: "flex", alignItems: "center" }}>Pozrieť ›</span>
      </a>
    </div>);
}
