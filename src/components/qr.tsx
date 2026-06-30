import { useState, useEffect, lazy, Suspense } from "react";
import type { ReactNode } from "react";
import QRCode from "qrcode";
import { C, GRAD_ZELENY, SPACE, RADIUS } from "@/theme";
import { tint } from "@/lib/ui";
import { QR_TYPY, type QrCiel } from "@/lib/qr";
import { useQrStatic, useEventToken } from "@/data";
import { Sheet } from "@/components/sheet";
import { Lupa, IkonaDoska, IkonaUlozit, Zdielanie } from "@/components/icons";

// skener (@zxing/browser) = vlastný chunk, načíta sa až pri otvorení kamery
const QrSkener = lazy(() => import("@/components/qrskener").then((m) => ({ default: m.QrSkener })));

// REÁLNY skenovateľný QR (lib `qrcode`, SVG). Zachováva bespoke biely rámik.
// Vykreslí SVG cez 100 % šírku/výšku kontajnera (priehľadná „quiet zone“).
export function QrVizual({ data = "deed", size = 132, fg = "#0B0C10" }: { data?: string; size?: number; fg?: string }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(data, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: fg, light: "#00000000" } })
      .then((s) => {
        // vynúť 100 % rozmer (nech sa škáluje do rámika), zachovaj viewBox
        const out = s.replace(/<svg([^>]*?)>/, (_m, attrs) =>
          `<svg${String(attrs).replace(/\s(width|height)="[^"]*"/g, "")} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`);
        if (alive) setSvg(out);
      })
      .catch(() => { if (alive) setSvg(""); });
    return () => { alive = false; };
  }, [data, fg]);
  return (
    <div style={{ width: size, height: size, background: "#fff", borderRadius: RADIUS.sm, padding: size * 0.07, flex: "0 0 auto", boxShadow: "0 6px 18px rgba(0,0,0,.18)" }}>
      <div style={{ width: "100%", height: "100%", display: "block" }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

export function QrModal({ typ = "skutok", titul, popis, odkaz = "https://deed.app/s/120042", qrCiel, eventId, reazPct, prijemca, onClose, toast }: { typ?: string; titul?: ReactNode; popis?: ReactNode; odkaz?: string; qrCiel?: QrCiel | null; eventId?: string | null; reazPct?: number | null; prijemca?: ReactNode; onClose?: () => void; toast?: (t: string) => void }) {
  const meta = QR_TYPY[typ] || QR_TYPY.skutok;
  const rotujuci = meta.rot > 0;
  const [zb, setZb] = useState(meta.rot);     // zostávajúce sekundy do rotácie
  const [krok, setKrok] = useState(0);        // poradie rotácie (mení seed — len vizuálny fallback)
  const [skener, setSkener] = useState(false);
  // odkazové QR: ak je `qrCiel`, vyrieš kanonický slug/URL (inak fallback `odkaz`)
  const stat = useQrStatic(qrCiel ?? null);
  const odkazReal = stat.data?.url ?? odkaz;
  // rotujúce QR: ak je `eventId`, použi REÁLNY TOTP token (RFC 6238) zo servera
  // (secret ostáva na serveri); inak ostáva vizuálny reseed (back-compat / offline).
  const realnyRot = rotujuci && !!eventId;
  const { data: token } = useEventToken(realnyRot ? eventId! : null, meta.rot || 15, "threshold", typeof titul === "string" ? titul : typ);
  useEffect(() => {
    if (!rotujuci) return;
    const t = setInterval(() => setZb((s) => { if (s <= 1) { setKrok((x) => x + 1); return meta.rot; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [rotujuci, meta.rot]);
  const seed = realnyRot ? (token ?? odkazReal) : odkazReal + (rotujuci ? "·" + krok : "");

  const kopiruj = () => {
    try { navigator.clipboard?.writeText(odkazReal); } catch { /* clipboard nedostupný */ }
    toast?.("Odkaz skopírovaný do schránky");
  };
  const zdielaj = () => {
    try { if (navigator.share) { navigator.share({ title: (titul as string) || "DEED", url: odkazReal }); return; } } catch { /* share zrušený */ }
    kopiruj();
  };

  const out = (ic: ReactNode, label: ReactNode, sub: ReactNode, onClick?: () => void) => (
    <button onClick={onClick} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xxs, padding: `${SPACE.sm}px ${SPACE.xs}px`, borderRadius: RADIUS.sm, background: C.surface2, border: `1px solid ${C.line}`, color: C.text, cursor: "pointer", fontFamily: "inherit" }}>
      <span style={{ color: meta.col }}>{ic}</span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 9.5, color: C.textTer }}>{sub}</span>
    </button>
  );

  return (
    <>
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm, marginBottom: SPACE.gutter }}>
        <span style={{ width: 36, height: 36, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint(meta.col, .16), color: meta.col }}><IkonaDoska size={18} color={meta.col} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{titul || meta.tag}</div>
          <div style={{ fontSize: 11.5, color: C.textTer, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{popis || meta.popis}</div>
        </div>
        <span style={{ marginLeft: "auto", flex: "none", fontSize: 10, fontWeight: 700, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.xs, background: tint(meta.col, .14), color: meta.col }}>{meta.tag}</span>
      </div>

      {/* samotný QR */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm, padding: `${SPACE.xs}px 0 ${SPACE.xxs}px` }}>
        <div style={{ position: "relative" }}>
          <QrVizual data={seed} size={156} />
          {reazPct != null && (
            <span style={{ position: "absolute", top: -8, right: -8, fontSize: 10, fontWeight: 800, padding: `${SPACE.xxs}px ${SPACE.xs}px`, borderRadius: RADIUS.lg, background: GRAD_ZELENY, color: "#06281d", boxShadow: "0 4px 12px rgba(31,191,143,.4)" }}>D+R {reazPct}%</span>
          )}
        </div>
        {prijemca && <div style={{ fontSize: 12, color: C.textSec }}>{reazPct}% ide ďalej → <b style={{ color: C.text }}>{prijemca}</b></div>}
        {rotujuci ? (
          <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 11.5, color: C.textTer }}>
            <span style={{ width: 22, height: 22, borderRadius: RADIUS.round, border: `2px solid ${tint(meta.col, .3)}`, borderTopColor: meta.col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: meta.col, animation: "tocenie 1s linear infinite" }} />
            obnoví sa o <b style={{ color: meta.col }}>{zb}s</b> · screenshot neplatný (anti-relay)
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.textTer, fontFamily: "monospace", maxWidth: "92%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{odkazReal}</div>
        )}
      </div>

      {/* 3 výstupy — univerzálne pravidlo §10 */}
      <div style={{ display: "flex", gap: SPACE.xs, marginTop: SPACE.gutter }}>
        {out(<Lupa size={18} color={meta.col} />, "Skenovať", "fotoaparát", () => setSkener(true))}
        {out(<IkonaUlozit size={18} color={meta.col} />, "Kopírovať", "odkaz", kopiruj)}
        {out(<Zdielanie size={18} color={meta.col} />, "Zdieľať", "siete", zdielaj)}
      </div>
    </Sheet>
    {skener && <Suspense fallback={null}><QrSkener onClose={() => setSkener(false)} toast={toast} /></Suspense>}
    </>
  );
}
