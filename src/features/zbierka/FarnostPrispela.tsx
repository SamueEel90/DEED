// ============================================================
// OPRAVY 222 — v module zbierky: farnosť ako prispievateľ (ako firma v module charity) a „Prispieť za farnosť“ (len farár).
// ============================================================
import { useState } from "react";
import { useFarnostFarara, usePrispievatelia, darFarnosti } from "@/lib/farnostPrispela";
import { otvorVerejnyProfil } from "@/features/verejny-profil/otvor";
import { toast } from "@/shared";
import { PlatobneOkno } from "./Platba";

const eur = (n: number) => `${n.toLocaleString("sk-SK", { maximumFractionDigits: 2 })} €`;
const inic = (m: string) => m.split(/\s+/).filter((w) => w.length > 1 && w !== "Farnosť").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";

/** riadok „Farnosť Stakčín prispela 200 € · Pozri profil ›“ (pri zbierke rodiny len „Prispela aj Farnosť Stakčín“, bez sumy) */
export function PrispievateliaFarnosti({ refId, rodina }: { refId: string; rodina?: boolean }) {
  const L = usePrispievatelia(refId);
  if (!L.length) return null;
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
    {L.map((p) => (
      <div key={p.stranka} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 16, background: "var(--goldBg)", border: "1px solid var(--goldBd)" }}>
        <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: "var(--card)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 800 }}>{inic(p.meno)}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <b style={{ fontSize: 14.5, color: "var(--ink)" }}>{rodina || p.suma == null ? `Prispela aj ${p.meno}` : `${p.meno} prispela ${eur(p.suma)}`}</b>
          <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>farnosť · prispievateľ zbierky</span>
        </span>
        <button type="button" onClick={() => otvorVerejnyProfil(p.stranka)} style={{ flex: "none", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", color: "var(--gold)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>Pozri profil ›</button>
      </div>))}
  </div>;
}

/** „Prispieť za farnosť“ — len farár, len na cudziu zbierku; SEPA alebo karta farnosti */
export function PrispietZaFarnost({ refId, nazov, vlastnik }: { refId: string; nazov: string; /** meno stránky, ktorej zbierka patrí */ vlastnik?: string }) {
  const f = useFarnostFarara();
  const [otv, setOtv] = useState(false);
  if (!f || (vlastnik && vlastnik === f.meno)) return null;
  return <>
    <button type="button" className="zb-karta" onClick={() => setOtv(true)} style={{ width: "100%", marginTop: 10, minHeight: 56, padding: "8px 14px", borderRadius: 16, background: "var(--goldBg)", border: "1px solid var(--goldBd)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 15, color: "var(--gold)" }}>Prispieť za farnosť</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{f.meno} · prevodom alebo kartou farnosti</span></span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    {otv && <PlatobneOkno kanal="eur" nazov={`${nazov} · za ${f.meno}`} registrovany pred={{ vyzbierane: 0, ciel: null, pocetDarov: 0, darovDnes: 0 }}
      onClose={() => setOtv(false)}
      onHotovo={(v) => { void darFarnosti(refId, v.eur, v.sposob === "sepa", f).then(() => toast(`${f.meno} prispela ${eur(v.eur)} ✓ Doklad nájdete v Peňaženke vo Výpisoch.`)).catch((e: Error) => toast(e.message)); }} />}
  </>;
}
