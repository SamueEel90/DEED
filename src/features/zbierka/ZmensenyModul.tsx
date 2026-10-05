// KARTA 55 · B a bod 149 — spoločné časti platobného modulu pre celú appku (profily, feed, Help, Charita, Viera…):
//  · ZmensenyModul: na mobile (< 760 px) sa modul otvorí zmenšený (max 640 px, dole prechod do --bg 120 px),
//    šípka ⌄ (kruh 48 px) ukáže celý, ⌃ zmenší. PC a tablet bez zmenšenia.
//  · SpatNaZbierky: „‹ Späť na zbierky" nad modulom (48 px, --btn).
//  · ZbalitASpat: „Zbaliť a späť ⌃" pod modulom (celá šírka, 52 px, okraj 1,5 px --acc, 15 / 800).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLayout } from "@/components/context";

const MAX = 640;
const sipka = (hore: boolean, s = 20) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ transform: `rotate(${hore ? 180 : 0}deg)`, transition: "transform .3s ease" }}><path d="M6 9l6 6 6-6" /></svg>);

/** kruhová šípka ⌄ / ⌃ bez textu (darcovia 44 px, modul 48 px) */
export function SipkaKruh({ hore, onClick, label, s = 48 }: { hore: boolean; onClick: () => void; label: string; s?: number }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-expanded={hore}
      style={{ alignSelf: "center", flex: "none", width: s, height: s, borderRadius: "50%", border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none", padding: 0 }}>
      {sipka(hore)}
    </button>);
}

export function ZmensenyModul({ children }: { children: ReactNode }) {
  const { wide } = useLayout();
  const [cely, setCely] = useState(false);
  const vnutro = useRef<HTMLDivElement>(null);
  const [vyska, setVyska] = useState(0);
  useLayoutEffect(() => {
    const el = vnutro.current; if (!el) return;
    const ro = new ResizeObserver(() => setVyska(el.scrollHeight)); ro.observe(el); setVyska(el.scrollHeight);
    return () => ro.disconnect();
  }, []);
  if (wide) return <>{children}</>;
  const treba = vyska > MAX + 40;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative", overflow: "hidden", maxHeight: !treba || cely ? Math.max(vyska, MAX) : MAX, transition: "max-height .5s ease" }}>
        <div ref={vnutro}>{children}</div>
        {treba && <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, pointerEvents: "none", background: "linear-gradient(180deg,rgba(0,0,0,0),var(--bg))", opacity: cely ? 0 : 1, transition: "opacity .3s ease" }} />}
      </div>
      {treba && <SipkaKruh hore={cely} onClick={() => setCely((c) => !c)} label={cely ? "Zmenšiť modul" : "Zobraziť celý modul"} />}
    </div>);
}

export function SpatNaZbierky({ onClick, text = "‹ Späť na zbierky", style }: { onClick: () => void; text?: string; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={{ alignSelf: "stretch", minHeight: 48, padding: "0 16px", borderRadius: 14, border: "none", background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, textAlign: "left", boxShadow: "none", ...style }}>{text}</button>);
}

export function ZbalitASpat({ onClick, style }: { onClick: () => void; style?: CSSProperties }) {
  return (
    <button type="button" onClick={onClick} style={{ width: "100%", height: 52, borderRadius: 14, border: "1.5px solid var(--acc, var(--green))", background: "transparent", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...style }}>
      Zbaliť a späť {sipka(true, 18)}
    </button>);
}
