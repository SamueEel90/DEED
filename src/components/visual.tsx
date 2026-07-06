import type { CSSProperties, ReactNode } from "react";
import { GRAD_KUZEL, ZRNO, RADIUS } from "@/theme";

// prefers-reduced-motion — blur vrstvy nechaj, ale zastav animácie (šetrí batériu aj vestibulárny systém)
const znizenyPohyb = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ============================================================
// DÝCHAJÚCE POZADIE — theme-aware earthy blob-y (žiadna hardcoded
// aurora modrá), jemne dýcha + zrno. Montuje sa RAZ (App vnútro).
// ============================================================
export function DychajucePozadie({ silne }: { silne?: boolean }) {
  const k = silne ? 1.5 : 1;
  const staticke = znizenyPohyb();
  const blob = (style: CSSProperties, anim: string) => (
    <div style={{ position: "absolute", borderRadius: RADIUS.round, filter: "blur(70px)", willChange: staticke ? undefined : "transform, opacity", ...style, animation: staticke ? "none" : anim }} />
  );
  const tinta = (varName: string, pct: number) => `radial-gradient(circle, color-mix(in srgb, var(${varName}) ${Math.round(pct * 100)}%, transparent), transparent 70%)`;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: -1, pointerEvents: "none" }}>
      {blob({ width: 360, height: 360, top: -130, left: -110, background: tinta("--a-green", .20 * k) }, "dych 9s ease-in-out infinite alternate")}
      {blob({ width: 320, height: 320, top: "36%", right: -140, background: tinta("--a-teal", .15 * k) }, "dych 13s ease-in-out 2s infinite alternate-reverse")}
      {blob({ width: 300, height: 300, bottom: -110, left: "18%", background: tinta("--a-gold", .11 * k) }, "dych 11s ease-in-out 1s infinite alternate")}
      {/* filmové zrno */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: ZRNO, backgroundSize: 240, opacity: .05, mixBlendMode: "overlay" }} />
    </div>
  );
}

// ============================================================
// AURA PRSTEŇ — podpis značky (rotujúci kruh so žiarou)
// ============================================================
export function Aura({ size = 110, hrubka = 2, children }: { size?: number; hrubka?: number; children?: ReactNode }) {
  const staticke = znizenyPohyb();
  const prsten: CSSProperties = { position: "absolute", inset: 0, borderRadius: RADIUS.round, background: GRAD_KUZEL, animation: staticke ? "none" : "tocenie 7s linear infinite" };
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      {/* žiara */}
      <div style={{ ...prsten, filter: "blur(16px)", opacity: .7 }} />
      {/* samotný prsteň (maskou orezaný na obrys) */}
      <div style={{ ...prsten, padding: hrubka, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
      {/* obsah — theme-aware jadro (bolo hardcoded #0A0F1C → lámalo svetlý motív) */}
      <div style={{ position: "absolute", inset: hrubka + 5, borderRadius: RADIUS.round, background: "var(--c-bg2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
