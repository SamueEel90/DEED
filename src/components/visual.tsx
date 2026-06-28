import type { CSSProperties, ReactNode } from "react";
import { GRAD_KUZEL, ZRNO, RADIUS } from "@/theme";

// ============================================================
// DÝCHAJÚCE POZADIE — tmavý subtle gradient, jemne dýcha + zrno
// ============================================================
export function DychajucePozadie({ silne }: { silne?: boolean }) {
  const k = silne ? 1.5 : 1;
  const blob = (style: CSSProperties, anim: string) => (
    <div style={{ position: "absolute", borderRadius: RADIUS.round, filter: "blur(70px)", willChange: "transform, opacity", ...style, animation: anim }} />
  );
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1, pointerEvents: "none" }}>
      {blob({ width: 360, height: 360, top: -130, left: -110, background: `radial-gradient(circle, rgba(62,123,250,${.20 * k}), transparent 70%)` }, "dych 9s ease-in-out infinite alternate")}
      {blob({ width: 320, height: 320, top: "36%", right: -140, background: `radial-gradient(circle, rgba(139,124,255,${.15 * k}), transparent 70%)` }, "dych 13s ease-in-out 2s infinite alternate-reverse")}
      {blob({ width: 300, height: 300, bottom: -110, left: "18%", background: `radial-gradient(circle, rgba(67,224,200,${.11 * k}), transparent 70%)` }, "dych 11s ease-in-out 1s infinite alternate")}
      {/* filmové zrno */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: ZRNO, backgroundSize: 240, opacity: .05, mixBlendMode: "overlay" }} />
    </div>
  );
}

// ============================================================
// AURA PRSTEŇ — podpis značky (rotujúci aurora kruh so žiarou)
// ============================================================
export function Aura({ size = 110, hrubka = 2, children }: { size?: number; hrubka?: number; children?: ReactNode }) {
  const prsten: CSSProperties = { position: "absolute", inset: 0, borderRadius: RADIUS.round, background: GRAD_KUZEL, animation: "tocenie 7s linear infinite" };
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      {/* žiara */}
      <div style={{ ...prsten, filter: "blur(16px)", opacity: .7 }} />
      {/* samotný prsteň (maskou orezaný na obrys) */}
      <div style={{ ...prsten, padding: hrubka, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
      {/* obsah */}
      <div style={{ position: "absolute", inset: hrubka + 5, borderRadius: RADIUS.round, background: "#0A0F1C", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
