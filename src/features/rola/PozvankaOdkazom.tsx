// ============================================================
// OPRAVY 502 (balík 44) · pozvánka do Správy cez QR a odkaz — jedna pre farnosť aj charitu.
// Platí 48 h (server 0125 kontroluje „dos“). V zozname „čaká · platí ešte 31 h“, po 48 h „Pozvánka vypršala“ + Poslať znova
// (nová pozvánka s tou istou rolou a právami, starý odkaz prestane platiť — mení sa id).
// Pozvánka e-mailom nevyprší (server ju drží, kým ju človek neprijme alebo neodmietne), preto pri nej čas nie je.
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import { QrNaUkazanie } from "@/components/qrNaUkazanie";
import { zdielaj, kopiruj } from "@/lib/zdielanie";

export const POZVANKA_MS = 48 * 3600e3;
const ZELENA = "#4B7A35", CERV = "#A34A2A";

/** nová pozvánka cez odkaz: id (= posledná časť odkazu), dokedy platí (ms) a text „23. 10. o 14:05“ */
export function novaPozvanka(): { id: number; dos: number; doT: string } {
  const id = Date.now(), dt = new Date(id + POZVANKA_MS);
  return { id, dos: dt.getTime(), doT: `${dt.getDate()}. ${dt.getMonth() + 1}. o ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}` };
}

/** stav pozvaného v zozname: text štítka, či je zlý (červený) a či pozvánka vypršala */
export function stavPozvanky(caka: unknown, dos?: number, teraz = Date.now()): { t: string; zly: boolean; vyprsala: boolean } | null {
  if (caka === "odmietol") return { t: "Odmietol", zly: true, vyprsala: false };
  if (caka === "odkaz") {
    if (!dos) return { t: "Pozvaný · pozvánka cez QR", zly: false, vyprsala: false };
    if (dos <= teraz) return { t: "Pozvánka vypršala", zly: true, vyprsala: true };
    const h = Math.min(48, Math.round((dos - teraz) / 3600e3));
    return { t: h >= 1 ? `čaká · platí ešte ${h} h` : "čaká · platí ešte necelú hodinu", zly: false, vyprsala: false };
  }
  if (caka === true) return { t: "Pozvaný · čaká", zly: false, vyprsala: false };
  return null;
}

/** prekreslí sa raz za minútu (odpočet „platí ešte … h“) */
export function useMinuta(): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => { const i = window.setInterval(() => setT(Date.now()), 60_000); return () => window.clearInterval(i); }, []);
  return t;
}

const plne: CSSProperties = { minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 };
const obrys: CSSProperties = { minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)" };
const kick: CSSProperties = { fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" };

/** QR + odkaz, „Takto príde správa“, Zdieľať · Kopírovať (→ Skopírované ✓) · Zrušiť */
export function KartaPozvanky({ odkaz, rola, doT, sprava, onZrus }: { odkaz: string; rola: string; doT: string; sprava: string; onZrus: () => void }) {
  const [skop, setSkop] = useState(false);
  useEffect(() => { if (!skop) return; const t = window.setTimeout(() => setSkop(false), 2500); return () => window.clearTimeout(t); }, [skop]);
  return (
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <QrNaUkazanie qr={{ data: odkaz }} size={112} popis={`Pozvánka do správy stránky · ${rola}`} ram={{ border: "1px solid var(--cardBd)", overflow: "hidden" }} />
        <span style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 15.5 }}>Pozvánka · {rola}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Platí do {doT}. Naskenuje QR alebo ťukne na odkaz.</span></span>
      </div>
      <span style={kick}>TAKTO PRÍDE SPRÁVA</span>
      <span style={{ fontSize: 14.5, lineHeight: 1.5, padding: "10px 12px", borderRadius: 12, background: "var(--field)", overflowWrap: "anywhere" }}>{sprava}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void zdielaj({ titul: "Pozvánka do správy stránky", text: sprava, url: odkaz })} style={plne}>Zdieľať pozvánku</button>
        <button type="button" onClick={() => void kopiruj(odkaz).then((ok) => setSkop(ok))} aria-live="polite" style={{ ...obrys, minHeight: 52, ...(skop ? { borderColor: ZELENA, color: ZELENA } : {}) }}>{skop ? "Skopírované ✓" : "Kopírovať odkaz"}</button>
      </div>
      <button type="button" onClick={onZrus} style={{ ...obrys, alignSelf: "flex-start", color: CERV }}>Zrušiť pozvánku</button>
    </div>);
}

/** „Ako to prebieha“ — očíslované kroky */
export function AkoPrebieha({ nadpis, kroky }: { nadpis: string; kroky: [string, string][] }) {
  return (<>
    <span style={kick}>{nadpis}</span>
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px" }}>
      {kroky.map(([t, s], i) => <div key={t} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <span style={{ width: 26, height: 26, flex: "none", borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{i + 1}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{t}</b><span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)" }}>{s}</span></span>
      </div>)}
    </div>
  </>);
}
