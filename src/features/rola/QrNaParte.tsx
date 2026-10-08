// ============================================================
// KARTA 57 A.4 — QR na vlastnom parte (prototyp „QR na parte").
// S QR / Bez QR · Pod parte alebo 4 rohy · náhľad celého hárku A5 / A4 · QR 3 × 3 cm (prepočet v mm),
// pri páse pod parte sa parte zmenší · upozornenie pri rohu · „Nemáte miesto? Bez QR alebo Vytvoriť nové zo šablóny ›".
// Pred zapečatením sa s QR netlačí (miesto sa uloží). Obrázok QR zatiaľ /editor/qr-deed.png (systém dodá skutočný).
// ============================================================
import { useState, type CSSProperties } from "react";

export type MiestoQr = "pod" | "lh" | "ph" | "ld" | "pd";
export interface QrParte { qr: boolean; kde: MiestoQr; papier: "A5" | "A4" }
const QR_OBR = "/editor/qr-deed.png";
const ROHY: Record<Exclude<MiestoQr, "pod">, CSSProperties> = {
  lh: { top: "3%", left: "3%" }, ph: { top: "3%", right: "3%" }, ld: { bottom: "3%", left: "3%" }, pd: { bottom: "3%", right: "3%" },
};
const MIESTA: [string, MiestoQr][] = [["Pod parte", "pod"], ["Vľavo hore", "lh"], ["Vpravo hore", "ph"], ["Vľavo dole", "ld"], ["Vpravo dole", "pd"]];

function Segment<T extends string | boolean>({ vol, cur, set }: { vol: [string, T][]; cur: T; set: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", alignSelf: "flex-start" }}>
      {vol.map(([t, v]) => { const on = v === cur; return <button key={t} type="button" aria-pressed={on} onClick={() => set(v)} style={{ flex: "none", whiteSpace: "nowrap", minHeight: 44, padding: "0 16px", border: "none", borderRadius: 9, background: on ? "var(--card)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>; })}
    </div>);
}

/** hárok na tlač: parte + QR (pod parte alebo v rohu), A5 / A4 */
function harokHtml(src: string, n: QrParte, kratky: string, qrObr: string): string {
  const roh = n.qr && n.kde !== "pod" ? Object.entries(ROHY[n.kde as Exclude<MiestoQr, "pod">]).map(([k, v]) => `${k}:${v}`).join(";") : "";
  return `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8mm">
    <div style="position:relative;flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center"><img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain">${roh ? `<div style="position:absolute;${roh};width:30mm;padding:1mm;background:#fff;text-align:center"><img src="${qrObr}" style="width:30mm;height:30mm;display:block"><b style="font-size:7pt">Prispieť rodine</b></div>` : ""}</div>
    ${n.qr && n.kde === "pod" ? `<div style="flex:none;display:flex;align-items:center;gap:4mm;border-top:0.3mm solid #ddd;padding-top:3mm;width:100%"><img src="${qrObr}" style="width:30mm;height:30mm"><span><b style="font-size:11pt">Prispieť rodine</b><br><span style="font-size:9pt;color:#444">${kratky}</span></span></div>` : ""}
  </div>`;
}
export function tlacParte(src: string, n: QrParte, kratky = "deed.sk/z/…") {
  const f = document.createElement("iframe"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"; document.body.appendChild(f);
  const d = f.contentDocument; if (!d) return;
  const qr = new URL(QR_OBR, window.location.href).href;
  d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Parte</title><style>@page{size:${n.papier};margin:6mm}html,body{margin:0;height:100%;font-family:"Plus Jakarta Sans",-apple-system,"Segoe UI",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${harokHtml(src, n, kratky, qr)}</body></html>`); d.close();
  window.setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); window.setTimeout(() => f.remove(), 1500); }, 600);
}

export function QrNaParte({ src, zapecatene = false, onSablona, onZmena, onIne, kratky = "deed.sk/z/…" }: {
  src: string; zapecatene?: boolean; onSablona?: () => void; onZmena?: (n: QrParte) => void; onIne?: () => void; kratky?: string;
}) {
  const [n, setN] = useState<QrParte>({ qr: true, kde: "pod", papier: "A5" });
  const [pomer, setPomer] = useState(0.7);
  const [tl, setTl] = useState(false);
  const zmen = (p: Partial<QrParte>) => { const x = { ...n, ...p }; setN(x); onZmena?.(x); };
  // náhľad hárku: šírka 320 px, mm podľa papiera, QR 30 mm, okraj 6 mm, pás pod parte = QR + 8 mm
  const W = 320, H = Math.round(W * 1.4142), mm = W / (n.papier === "A5" ? 148 : 210);
  const pad = Math.round(6 * mm), q = Math.round(30 * mm), pas = n.qr && n.kde === "pod" ? q + Math.round(8 * mm) : 0;
  const aw = W - 2 * pad, ah = H - 2 * pad - pas;
  let iw = aw, ih = aw / pomer; if (ih > ah) { ih = ah; iw = ah * pomer; }
  const roh = n.qr && n.kde !== "pod";
  const smieTlac = zapecatene || !n.qr;
  const lbl: CSSProperties = { fontSize: 15, fontWeight: 800 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={lbl}>QR kód zbierky</b><Segment vol={[["S QR zbierky", true], ["Bez QR", false]]} cur={n.qr} set={(v) => zmen({ qr: v })} /></div>
      {n.qr && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={lbl}>Kam dať QR</b>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Ťuknite na miesto. Pod parte nikdy nič neprekryje.</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MIESTA.map(([t, v]) => { const on = n.kde === v; return <button key={v} type="button" aria-pressed={on} onClick={() => zmen({ kde: v })} style={{ flex: "none", whiteSpace: "nowrap", minHeight: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${on ? "#4B7A35" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>{t}</button>; })}
        </div>
      </div>}
      <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, maxWidth: "100%" }}>
        <div style={{ width: W, maxWidth: "100%", height: H, boxSizing: "border-box", background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: pad }}>
          <div style={{ position: "relative", flex: "none", width: Math.round(iw), height: Math.round(ih) }}>
            <img src={src} alt="Vaše parte" onLoad={(e) => { const im = e.currentTarget; if (im.naturalWidth) setPomer(im.naturalWidth / im.naturalHeight); }} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }} />
            {roh && <div style={{ position: "absolute", ...ROHY[n.kde as Exclude<MiestoQr, "pod">], width: q, padding: 3, borderRadius: 4, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <img src={QR_OBR} alt="QR kód zbierky" style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "contain" }} />
              <span style={{ fontSize: 7, fontWeight: 800, color: "#111", textAlign: "center", lineHeight: 1.15 }}>Prispieť rodine</span>
            </div>}
          </div>
          {n.qr && n.kde === "pod" && <div style={{ flex: "none", width: Math.round(iw), display: "flex", alignItems: "center", gap: 10, paddingTop: 8, borderTop: "1px solid #DDD", color: "#111" }}>
            <img src={QR_OBR} alt="QR kód zbierky" style={{ flex: "none", width: q, height: q, objectFit: "contain" }} />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 13 }}>Prispieť rodine</b><span style={{ fontSize: 11, color: "#444" }}>{kratky}</span></span>
          </div>}
        </div>
        <span style={{ fontSize: 12.5, color: "var(--ink3)", textAlign: "center" }}>{(n.papier === "A5" ? "A5 · 148 × 210 mm" : "A4 · 210 × 297 mm") + (n.qr ? " · QR 3 × 3 cm" : "") + (pas ? " · parte je zmenšené, aby sa QR zmestil pod neho" : "")}</span>
      </div>
      {roh && <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>Pozrite, či QR neprekrýva fotku alebo text. Ak áno, vyberte iný roh alebo Pod parte.</span>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={lbl}>Veľkosť papiera</b><Segment vol={[["A5", "A5"], ["A4", "A4"]]} cur={n.papier} set={(v) => zmen({ papier: v })} /></div>
      {smieTlac
        ? <button type="button" onClick={() => { tlacParte(src, n, kratky); setTl(true); window.setTimeout(() => setTl(false), 2200); }} style={{ minHeight: 56, border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" }}>{tl ? "Posielam do tlačiarne ✓" : `Vytlačiť ${n.papier}${n.qr ? " s QR" : " bez QR"}`}</button>
        : <span style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid var(--cardBd)", fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>Vytlačiť s QR pôjde po zapečatení zbierky. Miesto pre QR sa uloží.</span>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 12, border: "1px solid var(--cardBd)" }}>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" }}>Na vašom parte nie je miesto pre QR? Vytlačte ho <b>Bez QR</b>, alebo vytvorte nové zo šablóny, tam má QR miesto pod parte.</span>
        {onSablona && <button type="button" onClick={onSablona} style={{ alignSelf: "flex-start", minHeight: 48, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Vytvoriť nové zo šablóny ›</button>}
      </div>
      {onIne && <button type="button" onClick={onIne} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Nahrať iné parte</button>}
    </div>);
}
