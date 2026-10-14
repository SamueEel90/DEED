// ============================================================
// OPRAVY 269 — blok Vypočuj si na stránke farnosti: najnovší príhovor veľký (video = obraz s Prehrať na celú obrazovku,
// len zvuk = pás so zvukom a Prehrať), staršie pod ním v zozname, odkazy na videá inde (náhľad, ak ho služba dá, a „Pozrieť ›",
// otvorí sa mimo appky). Príhovor sa spúšťa len tu, nie z titulnej fotky ani z krúžku pri logu.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { sluzbaOdkazu, type OdkazVidea, type Prihovor } from "@/lib/prihovor";

const KARTA = "var(--nf-karta)", INK = "var(--nf-ink)", INK3 = "var(--nf-ink3)", LINKA = "var(--nf-linka)";
const dd = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const Play = ({ r = 58 }: { r?: number }) => (
  <span aria-hidden="true" style={{ flex: "none", width: r, height: r, borderRadius: "50%", background: "rgba(255,255,255,.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ width: 0, height: 0, borderLeft: `${Math.round(r * 0.31)}px solid #14110B`, borderTop: `${Math.round(r * 0.19)}px solid transparent`, borderBottom: `${Math.round(r * 0.19)}px solid transparent`, marginLeft: Math.round(r * 0.09) }} />
  </span>);

/** pás so zvukom: ťuk Prehrať / Pozastaviť, priebeh v páse */
export function ZvukPas({ p, vyska = 120 }: { p: Prihovor; vyska?: number }) {
  const a = useRef<HTMLAudioElement>(null);
  const [hra, setHra] = useState(false);
  const [pr, setPr] = useState(0);
  useEffect(() => { const el = a.current; return () => { el?.pause(); }; }, []);
  const prepni = () => { const el = a.current; if (!el) return; if (el.paused) void el.play(); else el.pause(); };
  const pruhy = Array.from({ length: 36 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + 0.6) * Math.cos(i * 0.45)));
  return (
    <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, width: "100%", minHeight: vyska, padding: "14px 16px", boxSizing: "border-box", borderRadius: 16, background: "#14110B" }}>
      <audio ref={a} src={p.src} preload="metadata" onPlay={() => setHra(true)} onPause={() => setHra(false)} onEnded={() => { setHra(false); setPr(0); }}
        onTimeUpdate={(e) => { const el = e.currentTarget; setPr(el.duration ? el.currentTime / el.duration : 0); }} />
      <button type="button" onClick={prepni} style={{ flex: "none", minHeight: 52, padding: "0 20px", borderRadius: 26, border: "none", background: "#fff", color: "#14110B", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        {hra ? <span aria-hidden="true" style={{ display: "flex", gap: 4 }}><span style={{ width: 5, height: 16, background: "#14110B" }} /><span style={{ width: 5, height: 16, background: "#14110B" }} /></span>
          : <span aria-hidden="true" style={{ width: 0, height: 0, borderLeft: "13px solid #14110B", borderTop: "8px solid transparent", borderBottom: "8px solid transparent" }} />}
        {hra ? "Pozastaviť" : "Prehrať"}
      </button>
      <span aria-hidden="true" style={{ flex: 1, minWidth: 0, height: 44, display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}>
        {pruhy.map((h, i) => <span key={i} style={{ flex: "1 1 0", minWidth: 2, height: `${Math.round(h * 100)}%`, borderRadius: 2, background: i / pruhy.length <= pr ? "#C9A24A" : "rgba(255,255,255,.35)" }} />)}
      </span>
      <span style={{ flex: "none", fontSize: 14, fontWeight: 700, color: "#E8E1D3", fontVariantNumeric: "tabular-nums" }}>{Math.round(p.sek)} s</span>
    </span>);
}

/** najnovší príhovor veľký: video = obraz s Prehrať (celá obrazovka), zvuk = pás so zvukom */
export function PrihovorVelky({ p, onPrehraj, vedla, velkyNadpis }: { p: Prihovor; onPrehraj: (p: Prihovor) => void; /** obraz vedľa textu (PC) */ vedla?: boolean; velkyNadpis?: boolean }) {
  const text = <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: ".12em", color: INK3 }}>PRÍHOVOR FARÁRA · PRIDANÝ {dd(p.cas)}</span>
    <b style={{ fontSize: velkyNadpis ? "clamp(22px,2.2vw,30px)" : 21, lineHeight: 1.15, letterSpacing: "-.02em" }}>Príhovor farára</b>
    <span style={{ fontSize: 16, color: INK3 }}>{p.zvuk ? `Len zvuk · ${Math.round(p.sek)} s` : "Ťuknite a prehrá sa na celú obrazovku."}</span>
  </span>;
  if (p.zvuk) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, borderRadius: 22, background: KARTA, color: INK }}>
      {text}<ZvukPas p={p} />
    </div>);
  return (
    <button type="button" onClick={() => onPrehraj(p)} style={{ width: "100%", display: "flex", gap: vedla ? 24 : 14, alignItems: "center", flexWrap: vedla ? "nowrap" : "wrap", padding: 16, borderRadius: 22, background: KARTA, border: "none", cursor: "pointer", color: INK, fontFamily: "inherit", textAlign: "left", boxSizing: "border-box" }}>
      <span style={{ flex: "none", width: vedla ? 280 : "100%", aspectRatio: "16 / 9", borderRadius: 14, background: "#14110B", display: "flex", alignItems: "center", justifyContent: "center" }}><Play /></span>
      {text}
    </button>);
}

/** staršie príhovory (zoznam) */
export function StarsiePrihovory({ l, onPrehraj }: { l: Prihovor[]; onPrehraj: (p: Prihovor) => void }) {
  const [hra, setHra] = useState<string | null>(null);
  if (!l.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${LINKA}` }}>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: INK3, padding: "12px 0 4px" }}>STARŠIE PRÍHOVORY</span>
      {l.map((p) => (
        <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 0", borderBottom: `1px solid ${LINKA}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>Príhovor · {dd(p.cas)}</b><span style={{ fontSize: 14.5, color: INK3 }}>{p.zvuk ? "len zvuk" : "video"} · {Math.round(p.sek)} s</span></span>
            <button type="button" onClick={() => (p.zvuk ? setHra((h) => (h === p.id ? null : p.id)) : onPrehraj(p))} aria-expanded={p.zvuk ? hra === p.id : undefined}
              style={{ flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 12, border: `1.5px solid ${LINKA}`, background: "transparent", color: INK, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>{p.zvuk && hra === p.id ? "Skryť" : "Prehrať"}</button>
          </div>
          {p.zvuk && hra === p.id && <ZvukPas p={p} vyska={76} />}
        </div>))}
    </div>);
}

/** odkazy na videá inde — náhľad (ak ho služba dá) a Pozrieť ›, otvorí sa mimo appky */
export function OdkazyVidei({ o }: { o: OdkazVidea[] }) {
  if (!o.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {o.map((x) => { const s = sluzbaOdkazu(x.url); return (
        <a key={x.id} href={x.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, borderRadius: 18, background: KARTA, color: INK, textDecoration: "none" }}>
          <span aria-hidden="true" style={{ position: "relative", flex: "none", width: 112, aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: s.nahlad ? `center/cover no-repeat url('${s.nahlad}') #14110B` : "#14110B", display: "flex", alignItems: "center", justifyContent: "center" }}><Play r={34} /></span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16, lineHeight: 1.3, overflowWrap: "anywhere" }}>{x.nazov}</b><span style={{ fontSize: 14, color: INK3 }}>{s.sluzba}</span></span>
          <span style={{ flex: "none", fontSize: 15, fontWeight: 800, color: "var(--nf-gInk)" }}>Pozrieť ›</span>
        </a>); })}
    </div>);
}
