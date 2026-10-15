// ============================================================
// OPRAVY 263 — hromadný výber na mazanie (rovnaký ako Od veriacich → Pridali veriaci), jeden pre celú appku.
// „Vybrať viac“ → políčka 44 px · Označiť všetko · Staršie ako 30 dní · Zrušiť výber · Označiť skupinu ·
// dole pevný pás „Označené: N · Podržte a zmažte N“. Po zmazaní zelená hláška na tom istom mieste.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";

const DEN = 86400000;
export const tlMaleVyber = (aktiv = false): CSSProperties => ({ minHeight: 44, padding: "0 12px", borderRadius: 10, border: `1px solid ${aktiv ? "var(--gBd)" : "var(--cardBd)"}`, background: aktiv ? "var(--gSoft)" : "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: aktiv ? "var(--gInk)" : "var(--ink)", boxShadow: "none", whiteSpace: "nowrap" });

export function useHromadnyVyber() {
  const [zap, setZap] = useState(false);
  const [vyb, setVyb] = useState<ReadonlySet<string>>(() => new Set());
  const [hlaska, setHlaska] = useState("");
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  return {
    zap, vyb,
    prepniRezim: () => { setZap((z) => !z); setVyb(new Set()); },
    prepni: (id: string) => setVyb((v) => { const n = new Set(v); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    pridaj: (ids: string[]) => setVyb((v) => new Set([...v, ...ids])),
    nastav: (ids: string[]) => setVyb(new Set(ids)),
    zrus: () => setVyb(new Set()),
    hlaska,
    /** po zmazaní: výber sa zavrie, hláška ostane 3 s */
    hotovo: (t: string) => { setVyb(new Set()); setZap(false); setHlaska(t); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setHlaska(""), 3500); },
  };
}
export type HromadnyVyberStav = ReturnType<typeof useHromadnyVyber>;

/** tlačidlo „Vybrať viac“ / „Hotovo“ */
export function TlacidloVyberu({ v }: { v: HromadnyVyberStav }) {
  return <button type="button" onClick={v.prepniRezim} aria-pressed={v.zap} style={tlMaleVyber(v.zap)}>{v.zap ? "Hotovo" : "Vybrať viac"}</button>;
}

/** Označiť všetko · Staršie ako 30 dní · Zrušiť výber */
export function ListaVyberu({ v, polozky }: { v: HromadnyVyberStav; /** id a čas vzniku (ms) */ polozky: { id: string; cas: number }[] }) {
  if (!v.zap) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => v.pridaj(polozky.map((x) => x.id))} style={tlMaleVyber()}>Označiť všetko</button>
      <button type="button" onClick={() => { const teraz = Date.now(); v.nastav(polozky.filter((x) => teraz - x.cas > 30 * DEN).map((x) => x.id)); }} style={tlMaleVyber()}>Staršie ako 30 dní</button>
      <button type="button" onClick={v.zrus} style={tlMaleVyber()}>Zrušiť výber</button>
    </div>);
}

/** „Označiť skupinu“ pri nadpise skupiny */
export function OznacitSkupinu({ v, ids }: { v: HromadnyVyberStav; ids: string[] }) {
  return v.zap ? <button type="button" onClick={() => v.pridaj(ids)} style={tlMaleVyber()}>Označiť skupinu</button> : null;
}

/** zaškrtávacie políčko v riadku (44 px plocha) */
export function PolickoVyberu({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${on ? "#A34A2A" : "var(--cardBd)"}`, background: on ? "#A34A2A" : "transparent", color: "#fff", fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{on ? "✓" : ""}</span>
    </span>);
}

/** pevný pás dole: Označené: N · Podržte a zmažte N; po zmazaní zelená hláška na tom istom mieste */
export function PasVyberu({ v, pocet, onZmaz, dolu = 12, sloveso = "zmažte" }: { v: HromadnyVyberStav; /** „3 oznamy“ */ pocet: (n: number) => string; onZmaz: (ids: string[]) => string; dolu?: number; /** OPRAVY 284 (5): „odoberte“ pri ľuďoch a kostoloch */ sloveso?: string }) {
  const n = v.vyb.size;
  const st: CSSProperties = { position: "sticky", bottom: dolu, zIndex: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 16, boxShadow: "0 10px 26px rgba(30,28,20,.22)" };
  if (v.hlaska) return <div role="status" style={{ ...st, background: "var(--gSoft)", border: "2px solid var(--green)" }}><b style={{ fontSize: 15.5, color: "var(--gInk)" }}>{v.hlaska}</b></div>;
  if (!v.zap || !n) return null;
  return (
    <div role="region" aria-label="Označené" style={{ ...st, background: "var(--panel)", border: "1.5px solid var(--cRed)" }}>
      <b style={{ flex: 1, fontSize: 15 }}>Označené: {pocet(n)}</b>
      <PodrzZmaz label={`Podržte a ${sloveso} ${n}`} onZmaz={() => v.hotovo(onZmaz([...v.vyb]))} />
    </div>);
}


/** „Podržte a zmažte“ — OPRAVY 263: podržanie na celej ploche (pointer capture), 56 px, plní sa zľava, pustenie skôr = nič */
export function PodrzZmaz({ onZmaz, label = "Podržte a zmažte" }: { onZmaz: () => void; label?: string }) {
  const [drz, setDrz] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const start = () => { setDrz(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => { setDrz(false); onZmaz(); }, 1500); };
  const stop = () => { window.clearTimeout(t.current); setDrz(false); };
  return (
    <button type="button" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); start(); }} onPointerUp={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !drz) { e.preventDefault(); start(); } }} onKeyUp={stop}
      style={{ position: "relative", overflow: "hidden", minHeight: 56, padding: "0 18px", borderRadius: 12, border: "1.5px solid var(--cRed)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--cRed)", boxShadow: "none", touchAction: "none", userSelect: "none" }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--cRedBg)", opacity: 0.35, transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: drz ? "transform 1.5s linear" : "transform .2s ease" }} />
      <span style={{ position: "relative" }}>{drz ? "Držte…" : label}</span>
    </button>);
}
