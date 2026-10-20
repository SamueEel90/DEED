// ============================================================
// OPRAVY 457 · jeden spoločný komponent pre každý QR, ktorý niekto skenuje z obrazovky.
// Ťuk na QR = celá obrazovka, biele pozadie, QR čo najväčší, pri rotujúcom kóde odpočet a pás ako v Môj QR,
// obrazovka nezhasne (jas na maximum web nevie, len natívna appka), × Zavrieť vpravo hore aj ťuk mimo.
// Pod QR jeden riadok, čo to je („Akcia Pod korunami · naskenujte v appke DEED+“).
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DeedQr, type DeedOdznak } from "@/components/deedqr";

type QrProps = { data: string; odznak?: DeedOdznak; bezOdznaku?: boolean; retaz?: boolean; delenie?: string; farba?: string };
type Rotacia = { sek: number; perioda?: number };

function useNezhasni(zapnute: boolean) {
  useEffect(() => {
    if (!zapnute) return;
    let zamok: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { zamok = l; }).catch(() => { /* nepodporované */ });
    return () => { zamok?.release().catch(() => {}); };
  }, [zapnute]);
}

/** QR na celú obrazovku */
export function QrCelaObrazovka({ qr, popis, rotacia, onZavri }: { qr: QrProps; popis: string; rotacia?: Rotacia; onZavri: () => void }) {
  useNezhasni(true);
  const [rozmer, setRozmer] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const r = () => setRozmer({ w: window.innerWidth, h: window.innerHeight });
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); };
    window.addEventListener("resize", r); window.addEventListener("keydown", k);
    return () => { window.removeEventListener("resize", r); window.removeEventListener("keydown", k); };
  }, [onZavri]);
  const size = Math.max(160, Math.min(rozmer.w - 40, rozmer.h - (rotacia ? 210 : 170), 720));
  const perioda = rotacia?.perioda ?? 15;
  return createPortal(
    <div onClick={onZavri} role="dialog" aria-modal="true" aria-label={popis}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#FFFFFF", color: "#1D211B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "max(56px, env(safe-area-inset-top)) 20px 24px", boxSizing: "border-box", cursor: "zoom-out", fontFamily: "'Plus Jakarta Sans', sans-serif", animation: "zbFsIn .25s ease both" }}>
      <button type="button" autoFocus onClick={(e) => { e.stopPropagation(); onZavri(); }} aria-label="Zavrieť"
        style={{ position: "absolute", top: "max(12px, env(safe-area-inset-top))", right: 12, minWidth: 48, height: 48, padding: "0 14px", borderRadius: 24, border: "1.5px solid #D9D3C7", background: "#EFEAE1", color: "#1D211B", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>Zavrieť</button>
      <div onClick={(e) => e.stopPropagation()} style={{ lineHeight: 0, cursor: "default" }}>
        <DeedQr data={qr.data} odznak={qr.odznak} bezOdznaku={qr.bezOdznaku} retaz={qr.retaz} delenie={qr.delenie} farba={qr.farba} variant="svetly" size={size} />
      </div>
      {rotacia && <div style={{ display: "flex", flexDirection: "column", gap: 6, width: Math.min(size, 320) }}>
        <div style={{ height: 6, borderRadius: 3, background: "#E4DFD4", overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#4B7A35", transformOrigin: "left", transform: `scaleX(${rotacia.sek / perioda})`, transition: "transform .5s linear" }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#4A4C43" }}><span>nový kód o <b style={{ color: "#1D211B", fontVariantNumeric: "tabular-nums" }}>{rotacia.sek} s</b></span><span>snímka obrazovky neplatí</span></div>
      </div>}
      <span style={{ fontSize: 17, fontWeight: 700, textAlign: "center", lineHeight: 1.4, maxWidth: 520 }}>{popis}</span>
    </div>, document.body);
}

/** QR, ktorý sa ťukom zväčší na celú obrazovku (všade, kde ho niekto skenuje z obrazovky) */
export function QrNaUkazanie({ qr, size, popis, rotacia, ram, children }: { qr: QrProps; size: number; popis: string; rotacia?: Rotacia;
  /** štýl obalu (biely rámik a pod.) */ ram?: CSSProperties; /** vlastný obsah tlačidla namiesto QR (napr. s prechodom pri obnove) */ children?: ReactNode }) {
  const [cela, setCela] = useState(false);
  return <>
    <button type="button" onClick={() => setCela(true)} aria-label={`Zväčšiť QR na celú obrazovku · ${popis}`}
      style={{ padding: 0, border: "none", background: "transparent", lineHeight: 0, cursor: "zoom-in", flex: "none", borderRadius: 14, ...ram }}>
      {children ?? <DeedQr data={qr.data} odznak={qr.odznak} bezOdznaku={qr.bezOdznaku} retaz={qr.retaz} delenie={qr.delenie} farba={qr.farba} variant="svetly" size={size} />}
    </button>
    {cela && <QrCelaObrazovka qr={qr} popis={popis} rotacia={rotacia} onZavri={() => setCela(false)} />}
  </>;
}
