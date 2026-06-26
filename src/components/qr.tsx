import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { C, GRAD_ZELENY } from "@/theme";
import { tint } from "@/lib/ui";
import { qrHash, qrPrng, qrFinder, QR_TYPY } from "@/lib/qr";
import { Modal } from "@/components/feedback";
import { Lupa, IkonaDoska, IkonaUlozit, Zdielanie } from "@/components/icons";

export function QrVizual({ data = "deed", size = 132, fg = "#0B0C10" }: { data?: string; size?: number; fg?: string }) {
  const N = 25;
  const rnd = qrPrng(qrHash(data));
  const bunky: boolean[] = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const f = qrFinder(r, c, N);
    bunky.push(f ? f === "dark" : rnd() > 0.52);
  }
  return (
    <div style={{ width: size, height: size, background: "#fff", borderRadius: 12, padding: size * 0.07, flex: "0 0 auto", boxShadow: "0 6px 18px rgba(0,0,0,.18)" }}>
      <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: `repeat(${N},1fr)`, gridTemplateRows: `repeat(${N},1fr)` }}>
        {bunky.map((on, k) => <i key={k} style={{ background: on ? fg : "transparent" }} />)}
      </div>
    </div>
  );
}

export function QrModal({ typ = "skutok", titul, popis, odkaz = "https://deed.app/s/120042", reazPct, prijemca, onClose, toast }: { typ?: string; titul?: ReactNode; popis?: ReactNode; odkaz?: string; reazPct?: number | null; prijemca?: ReactNode; onClose?: () => void; toast?: (t: string) => void }) {
  const meta = QR_TYPY[typ] || QR_TYPY.skutok;
  const rotujuci = meta.rot > 0;
  const [zb, setZb] = useState(meta.rot);     // zostávajúce sekundy do rotácie
  const [krok, setKrok] = useState(0);        // poradie rotácie (mení seed)
  useEffect(() => {
    if (!rotujuci) return;
    const t = setInterval(() => setZb((s) => { if (s <= 1) { setKrok((x) => x + 1); return meta.rot; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [rotujuci, meta.rot]);
  const seed = odkaz + (rotujuci ? "·" + krok : "");

  const kopiruj = () => {
    try { navigator.clipboard?.writeText(odkaz); } catch { /* clipboard nedostupný */ }
    toast?.("Odkaz skopírovaný do schránky");
  };
  const zdielaj = () => {
    try { if (navigator.share) { navigator.share({ title: (titul as string) || "DEED", url: odkaz }); return; } } catch { /* share zrušený */ }
    kopiruj();
  };

  const out = (ic: ReactNode, label: ReactNode, sub: ReactNode, onClick?: () => void) => (
    <button onClick={onClick} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 6px", borderRadius: 13, background: C.surface2, border: `1px solid ${C.line}`, color: C.text, cursor: "pointer", fontFamily: "inherit" }}>
      <span style={{ color: meta.col }}>{ic}</span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 9.5, color: C.textTer }}>{sub}</span>
    </button>
  );

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 36, height: 36, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(meta.col, .16), color: meta.col }}><IkonaDoska size={18} color={meta.col} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{titul || meta.tag}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{popis || meta.popis}</div>
        </div>
        <span style={{ marginLeft: "auto", flex: "none", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: tint(meta.col, .14), color: meta.col }}>{meta.tag}</span>
      </div>

      {/* samotný QR */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "6px 0 4px" }}>
        <div style={{ position: "relative" }}>
          <QrVizual data={seed} size={156} />
          {reazPct != null && (
            <span style={{ position: "absolute", top: -8, right: -8, fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 20, background: GRAD_ZELENY, color: "#06281d", boxShadow: "0 4px 12px rgba(31,191,143,.4)" }}>D+R {reazPct}%</span>
          )}
        </div>
        {prijemca && <div style={{ fontSize: 12, color: C.textSec }}>{reazPct}% ide ďalej → <b style={{ color: C.text }}>{prijemca}</b></div>}
        {rotujuci ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: C.textTer }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${tint(meta.col, .3)}`, borderTopColor: meta.col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: meta.col, animation: "tocenie 1s linear infinite" }} />
            obnoví sa o <b style={{ color: meta.col }}>{zb}s</b> · screenshot neplatný (anti-relay)
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.textTer, fontFamily: "monospace", maxWidth: "92%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{odkaz}</div>
        )}
      </div>

      {/* 3 výstupy — univerzálne pravidlo §10 */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {out(<Lupa size={18} color={meta.col} />, "Skenovať", "fotoaparát", () => toast?.("Otváram fotoaparát na skenovanie (demo)"))}
        {out(<IkonaUlozit size={18} color={meta.col} />, "Kopírovať", "odkaz", kopiruj)}
        {out(<Zdielanie size={18} color={meta.col} />, "Zdieľať", "siete", zdielaj)}
      </div>
    </Modal>
  );
}
