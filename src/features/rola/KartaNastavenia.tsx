// ============================================================
// OPRAVY 324 · jeden vzhľad pre nastavenia a nástroje farára — zlatý obdĺžnik, nikdy riadok ako príspevok.
// Tmavozlatý podklad, zlatý rám, min. 96 px, ikona 40 px vľavo, nadpis 18 px + stav jednou vetou, vpravo plné tlačidlo (min. 52 px).
// Ťuk na celú kartu = to isté ako tlačidlo. Rovnaké na PC aj mobile, vo svetlom aj tmavom režime.
// ============================================================
import type { CSSProperties, ReactNode } from "react";

/** OPRAVY 325: nadpis sekcie Správy — väčší a svetlejší (tmavý režim #D9D2C4), nad ním 28 px (s medzerou rodiča) */
export const NADPIS_SEKCIE: CSSProperties = { fontSize: 15, fontWeight: 800, letterSpacing: ".07em", lineHeight: 1.3, color: "var(--nadSek)", paddingTop: 16 };

/** OPRAVY 325: štítok typu podľa farby — PARTE bordová piety, SVADBA a JUBILEUM (aj zmena omše) zlatá, ostatné (krátky oznam) zelená */
export function farbaStitku(druh: "parte" | "zlata" | "zelena"): CSSProperties {
  return druh === "parte" ? { background: "var(--stPBg)", border: "1px solid var(--stPBd)", color: "var(--stPInk)" }
    : druh === "zlata" ? { background: "var(--stZBg)", border: "1px solid var(--stZBd)", color: "var(--stZInk)" }
    : { background: "var(--gSoft)", border: "1px solid var(--gBd)", color: "var(--gInk)" };
}

export const IK_KOLIESKO = <>
  <circle cx="12" cy="12" r="3.2" />
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
</>;
export const IK_PORADIE = <>
  <rect x="3" y="3.5" width="18" height="5" rx="1.5" /><rect x="3" y="10.5" width="11" height="10" rx="1.5" /><rect x="16" y="10.5" width="5" height="10" rx="1.5" />
</>;

export function KartaNastavenia({ nadpis, stav, tlacidlo, onClick, ikona = IK_KOLIESKO, mobil }: {
  nadpis: string; stav: ReactNode; tlacidlo: string; onClick: () => void; ikona?: ReactNode; mobil?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} data-karta-nastavenia=""
      style={{ width: "100%", minHeight: 96, padding: mobil ? "14px 14px" : "16px 20px", borderRadius: mobil ? 18 : 22, background: "#2A2214", border: "2px solid #C9A24A",
        display: "flex", alignItems: "center", gap: mobil ? 12 : 16, cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "none", boxSizing: "border-box", flexWrap: "wrap" }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#C9A24A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>{ikona}</svg>
      <span style={{ flex: "1 1 160px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 18, lineHeight: 1.25, color: "#F3EBDD" }}>{nadpis}</b>
        <span style={{ fontSize: 13.5, lineHeight: 1.4, color: "#D9D2C4" }}>{stav}</span>
      </span>
      <span style={{ flex: "none", minHeight: 52, padding: "0 22px", borderRadius: 14, background: "#C9A24A", color: "#2A2214", fontSize: 16, fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "auto" }}>{tlacidlo}</span>
    </button>);
}
