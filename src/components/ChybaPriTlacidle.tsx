// ============================================================
// OPRAVY 335 — chyba pri ukladaní je tam, kde je prst (pravidlo pre celú appku).
// Červená karta priamo nad tlačidlom „Podržte…“: Neuložilo sa · čo sa stalo (jedna veta) · čo urobiť · Skúsiť znova.
// Na mobile navyše okno uprostred obrazovky, kým ho človek nezavrie. Tlačidlo pod kartou ostáva viditeľné.
// Použitie: <ChybaPriTlacidle text={chyba} onZnova={…} uklada={…} /> hneď nad <PodrzTlacidlo … />.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRamPisania } from "./RamPisania";

const CERVENA = "#A34A2A";
/** „Na zariadení nie je miesto. Zmenšite fotku a skúste znova.“ → [čo sa stalo, čo urobiť] */
export function rozdelChybu(t: string): [string, string] {
  const m = t.trim().match(/^(.+?[.!?])\s+(.+)$/s);
  return m ? [m[1], m[2]] : [t.trim(), ""];
}

export function ChybaPriTlacidle({ text, onZnova, uklada, nadpis = "Neuložilo sa", dovetok, znovaText = "Skúsiť znova" }: {
  text: string | null | undefined; onZnova?: () => void; uklada?: boolean; nadpis?: string;
  /** veta navyše na koniec (napr. „Rozpísané ostáva.“) */ dovetok?: string; znovaText?: string;
}) {
  const mobil = useRamPisania();
  const ref = useRef<HTMLDivElement>(null);
  // okno na mobile: otvorí sa pri každej novej chybe (text sa medzi pokusmi vynuluje), zavrie ho človek
  const [okno, setOkno] = useState(false);
  const [pred, setPred] = useState<string | null | undefined>(null);
  if (text !== pred) { setPred(text); setOkno(!!text); }
  useEffect(() => { if (text) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [text]);
  if (!text) return null;
  const [co, rada] = rozdelChybu(text);
  const radaT = [rada, dovetok].filter(Boolean).join(" ");
  const tlZnova = (velke?: boolean) => onZnova && <button type="button" disabled={uklada} onClick={() => { setOkno(false); onZnova(); }}
    style={{ minHeight: velke ? 52 : 48, padding: "0 18px", borderRadius: 12, border: "none", background: CERVENA, color: "#fff", cursor: uklada ? "default" : "pointer", fontFamily: "inherit", fontSize: velke ? 16 : 15, fontWeight: 800, boxShadow: "none", opacity: uklada ? 0.7 : 1 }}>{uklada ? "Ukladá sa…" : znovaText}</button>;
  const obsah = (velke?: boolean) => <>
    <b style={{ fontSize: velke ? 19 : 16, color: CERVENA }}>{nadpis}</b>
    <span style={{ fontSize: velke ? 16.5 : 15, fontWeight: 700, lineHeight: 1.4, color: "#1D211B" }}>{co}</span>
    {radaT && <span style={{ fontSize: velke ? 15.5 : 14, lineHeight: 1.45, color: "#3A3A33" }}>{radaT}</span>}
  </>;
  return <>
    <div ref={ref} role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "#F6E3DC", border: `2px solid ${CERVENA}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", scrollMarginBottom: 90 }}>
      <span style={{ flex: "1 1 200px", minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>{obsah()}</span>
      {tlZnova()}
    </div>
    {mobil && okno && createPortal(
      <div role="alertdialog" aria-modal="true" aria-label={nadpis} onClick={(e) => { if (e.target === e.currentTarget) setOkno(false); }}
        style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(20,17,11,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: 420, padding: 18, borderRadius: 18, background: "#F6E3DC", border: `2px solid ${CERVENA}`, display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 14px 40px rgba(0,0,0,.3)" }}>
          {obsah(true)}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
            {tlZnova(true)}
            <button type="button" autoFocus onClick={() => setOkno(false)} style={{ minHeight: 52, borderRadius: 12, border: `1.5px solid ${CERVENA}`, background: "transparent", color: CERVENA, cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, boxShadow: "none" }}>Zavrieť</button>
          </div>
        </div>
      </div>, document.body)}
  </>;
}
