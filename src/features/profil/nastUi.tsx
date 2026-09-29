// KARTA 25 · spoločné prvky všetkých obrazoviek nastavení (obe témy).
// Riadok min. 68 px, odsadenie 12/18, ikona 19 px v štvorčeku 38×38 vo farbe SEKCIE (nie každá ikona inak).
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

export type Sek = "b" | "g" | "o" | "r";
const SekCtx = createContext<Sek>("b");

/** farby sekcie z farby.css (--sek-*) */
export const sekFarba = (k: Sek) => ({ c: `var(--sek-${k})`, bg: `var(--sek-${k}Bg)`, bd: `var(--sek-${k}Bd)` });

/** čiarové ikony (path d, 24×24, stroke 2) — z prototypu Tmavý režim */
export const IK = {
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  type: "M4 7V5h11v2M9.5 5v14M7 19h5M14 13v-2h7v2M17.5 11v8M16 19h3",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  vib: "M8 4h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM3 9v6M21 9v6",
  cc: "M3 6h18v12H3zM7 12h4M13 12h4M7 15h7",
  tap: "M9 11V5a2 2 0 0 1 4 0v6M13 10a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7L5 15a2 2 0 0 1 3-2.6l1 1.1",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  pin: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  ring: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  check: "M20 6 9 17l-5-5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  wallet: "M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M17 14h.01",
  heart: "M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z",
  user: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10",
  leaf: "M11 20A7 7 0 0 1 4 13c0-5 5-9 16-9 0 11-4 16-9 16zM4 20l8-8",
  finger: "M12 11v4M8.5 8.5a5 5 0 0 1 8.5 3.5v2M7 12v1a9 9 0 0 0 1.5 5M17 16.5a14 14 0 0 1-.8 3.5M12 19v2M4.5 9a9 9 0 0 1 15.3-2.5",
  shield: "M12 21s7-3.5 7-9V5l-7-2.5L5 5v7c0 5.5 7 9 7 9zM9 12l2 2 4-4",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  block: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8",
  file: "M14 3H6v18h12V7zM14 3v4h4M9 13l2 2 4-4",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  brief: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  play: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM10 8.5v7l6-3.5z",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.7-2.5 2.2-2.5 3.8M12 17h.01",
  chat: "M4 5h16v11H9l-5 4z",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  key: "M8 15a4 4 0 1 1 3.5-6h9.5v3h-2v3h-3v-3h-4.5A4 4 0 0 1 8 15z",
  logout: "M15 4h4v16h-4M10 17l5-5-5-5M15 12H4",
  gift: "M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7s-1.5-4-4-4a2 2 0 0 0 0 4M12 7s1.5-4 4-4a2 2 0 0 1 0 4",
} as const;

export function IkonaSek({ d, k, size = 38 }: { d: string; k?: Sek; size?: number }) {
  const ctx = useContext(SekCtx);
  const f = sekFarba(k ?? ctx);
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 11, background: f.bg, color: f.c, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  );
}

export const Sipka = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--d-ink3, var(--ink3))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>;

/** prepínač 50×30 · vypnutý: dráha --d-trackOff, gulička --d-knobOff (v tmavej musí byť vidieť) */
export const Prepinac = ({ on }: { on: boolean }) => (
  <span aria-hidden="true" style={{ width: 50, height: 30, borderRadius: 15, background: on ? "var(--green)" : "var(--d-trackOff, #CFC9BC)", position: "relative", transition: "background .2s ease", flex: "none" }}>
    <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: on ? "#fff" : "var(--d-knobOff, #fff)", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: on ? "translateX(20px)" : "none", transition: "transform .2s ease" }} /></span>);

/** nadpis sekcie (bodka 8 px vo farbe sekcie) + karta s linkou vo farbe sekcie */
export function NastSekcia({ nadpis, k, children }: { nadpis: string; k: Sek; children: ReactNode }) {
  const f = sekFarba(k);
  return (
    <SekCtx.Provider value={k}>
      <section aria-label={nadpis} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ margin: "6px 0 0", padding: "0 6px", display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, letterSpacing: ".07em", color: "var(--d-ink3, var(--ink3))" }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: f.c, flex: "none" }} />{nadpis}
        </h2>
        <NastKarta k={k}>{children}</NastKarta>
      </section>
    </SekCtx.Provider>
  );
}
/** karta nastavení: #232820 v tmavej, linka vo farbe sekcie + svetlý horný okraj */
export function NastKarta({ k, children, style }: { k: Sek; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ borderRadius: 20, background: "var(--d-card, var(--card))", border: `1px solid ${sekFarba(k).bd}`, boxShadow: "var(--d-hl, none)", overflow: "hidden", ...style }}>{children}</div>;
}

export const oddelovac = "1px solid var(--d-sep, var(--cardBd))";

/** riadok: ťuk (›) alebo prepínač (role=switch) */
export function NastRiadok({ d, t, s, hodnota, prepinac, onClick, prvy, bezSipky }: { d: string; t: ReactNode; s?: ReactNode; hodnota?: ReactNode; prepinac?: boolean; onClick: () => void; prvy?: boolean; bezSipky?: boolean }) {
  const jePrep = prepinac !== undefined;
  return (
    <button type="button" onClick={onClick} role={jePrep ? "switch" : undefined} aria-checked={jePrep ? prepinac : undefined}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 68, padding: "12px 18px", border: "none", borderTop: prvy ? "none" : oddelovac, boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" }}>
      <IkonaSek d={d} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{t}</span>
        {s && <span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--d-ink3, var(--ink3))", marginTop: 2 }}>{s}</span>}
      </span>
      {hodnota !== undefined && <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--d-ink2, var(--ink2))", flex: "none" }}>{hodnota}</span>}
      {jePrep ? <Prepinac on={!!prepinac} /> : !bezSipky && <Sipka />}
    </button>
  );
}
