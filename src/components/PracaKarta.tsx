// OPRAVY 156/2 — JEDNA karta pracovnej ponuky zo Správy (brigáda, práca, dobrovoľník cez inzerát) pre všetky vzhľady,
// sektory, feed aj Help. Podľa „Hľadáme ľudí" (KARTA 45): modrý gradient, biely text, biely štítok typu s termínom,
// riadky Kde · Kedy · Odmena a biele tlačidlo „Mám záujem" s počtom záujemcov.
// OPRAVY 156/4: v Odmene len to, čo dá organizácia (raňajky, lístok, obed, certifikát) — nikdy karma, tú dáva len DEED.
import { useState, type CSSProperties } from "react";
import type React from "react";

export interface PracaUdaje {
  id: string;
  nazov: string;
  /** štítok typu: „BRIGÁDA" · „DOBROVOĽNÍK" · „POLOVIČNÝ ÚVÄZOK" */
  stitok?: string;
  /** termín: „prihlásiť sa do 15. 10." */
  pod?: string;
  opis?: string;
  kde?: string;
  kedy?: string;
  odmena?: string;
  /** „3 ľudia už majú záujem" */
  zaujem?: string;
  /** farnosť: iný text tlačidla a tretieho riadku */
  tlacidlo?: string;
  tretiRiadok?: string;
}

export const PRACA_BG = "linear-gradient(160deg,#2C5576 0%,#3D6B8E 60%,#4F7FA3 100%)";
const MODRA = "#2C5576";

function Udaje({ j, onZaujem }: { j: PracaUdaje; onZaujem?: () => void }) {
  const riadky = ([["Kde", j.kde], ["Kedy", j.kedy], [j.tretiRiadok ?? "Odmena", j.odmena]] as [string, string | undefined][]).filter(([, v]) => v);
  return (<>
    {riadky.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "4px 12px", fontSize: 13.5, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.22)", borderBottom: "1px solid rgba(255,255,255,.22)" }}>
      {riadky.map(([k, v]) => <span key={k} style={{ display: "contents" }}><span style={{ opacity: 0.75 }}>{k}</span><b>{v}</b></span>)}
    </div>}
    <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onZaujem?.(); }} style={{ height: 46, padding: "0 20px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800, color: MODRA, fontFamily: "inherit", boxShadow: "none" }}>{j.tlacidlo ?? "Mám záujem"}</button>
      {j.zaujem && <span style={{ fontSize: 12.5, opacity: 0.85 }}>{j.zaujem}</span>}
    </span>
  </>);
}

/** zbaleny = mobil a tablet v Kronike: len štítok, termín a názov, ťuk rozbalí */
export function PracaKarta({ j, zbaleny, onZaujem, onClick, style }: { j: PracaUdaje; zbaleny?: boolean; onZaujem?: () => void; /** feed: ťuk na celú kartu = detail */ onClick?: () => void; style?: CSSProperties }) {
  const [otv, setOtv] = useState(false);
  const stitokRiadok = [j.stitok, j.pod].filter(Boolean);
  if (zbaleny) return (
    <article style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: PRACA_BG, color: "#fff", display: "flex", flexDirection: "column", boxShadow: "0 10px 24px rgba(30,60,90,.25)", ...style }}>
      <button type="button" onClick={() => setOtv((o) => !o)} aria-expanded={otv}
        style={{ minHeight: 64, padding: "12px 10px 12px 16px", border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", textAlign: "left", color: "#fff", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {stitokRiadok.length > 0 && <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", opacity: 0.85 }}>{stitokRiadok.join(" · ")}</span>}
          <b style={{ fontSize: 17, lineHeight: 1.2 }}>{j.nazov}</b>
        </span>
        <span style={{ flex: "none", width: 44, height: 44, borderRadius: 22, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .25s ease" }}><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
      {otv && <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {j.opis && <span style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.92 }}>{j.opis}</span>}
        <Udaje j={j} onZaujem={onZaujem} />
      </div>}
    </article>);
  return (
    <article {...(onClick ? { role: "button", tabIndex: 0, "aria-label": j.nazov, onClick, onKeyDown: (e: React.KeyboardEvent) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onClick(); } } } : {})}
      style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: PRACA_BG, color: "#fff", padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 12px 28px rgba(30,60,90,.28)", boxSizing: "border-box", cursor: onClick ? "pointer" : undefined, ...style }}>
      <span aria-hidden="true" style={{ position: "absolute", right: -30, top: -30, width: 130, height: 130, borderRadius: "50%", border: "16px solid rgba(255,255,255,.08)", pointerEvents: "none" }} />
      {stitokRiadok.length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {j.stitok && <span style={{ height: 26, padding: "0 10px", borderRadius: 13, background: "#fff", color: MODRA, fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{j.stitok}</span>}
        {j.pod && <span style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.85 }}>{j.pod}</span>}
      </span>}
      <b style={{ position: "relative", fontSize: 22, lineHeight: 1.15, letterSpacing: "-.01em" }}>{j.nazov}</b>
      {j.opis && <span style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.92 }}>{j.opis}</span>}
      <Udaje j={j} onZaujem={onZaujem} />
    </article>);
}
