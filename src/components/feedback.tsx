import type { ReactNode } from "react";
import { C, GRAD_ZELENY, glassTmavy } from "@/theme";
import { Aura } from "@/components/visual";

export function Modal({ children, onClose }: { children?: ReactNode; onClose?: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.5)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 55, animation: "fadeUp .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", ...glassTmavy(26, .8), borderBottom: "none", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: "10px 20px 22px", boxShadow: "0 -18px 60px rgba(0,0,0,.45)" }}>
        <div style={{ width: 42, height: 4, borderRadius: 3, background: "rgba(var(--glass-rgb),.22)", margin: "4px auto 16px" }} />
        {children}
      </div>
    </div>
  );
}

export function Toast({ text }: { text?: ReactNode }) {
  // snackbar — vždy tmavý (aj vo svetlom režime), aby bol mätový text vždy čitateľný
  return (
    <div style={{ position: "absolute", bottom: 92, left: "50%", transform: "translateX(-50%)",
      background: "rgba(12,20,16,.93)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
      border: "1px solid rgba(92,230,184,.35)", color: "#C9F2E2", padding: "11px 18px", borderRadius: 30, fontSize: 12.5, fontWeight: 600,
      zIndex: 60, width: "max-content", maxWidth: "88%", textAlign: "center", animation: "fadeUp .3s ease",
      boxShadow: "0 10px 34px rgba(0,0,0,.45), 0 0 24px rgba(67,224,200,.12)" }}>
      <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: GRAD_ZELENY_LOKAL, marginRight: 8, verticalAlign: "middle" }} />
      {text}
    </div>
  );
}
const GRAD_ZELENY_LOKAL = "linear-gradient(90deg, #1FBF8F, #5CE6B8)";

// ---- OSLAVA — jednotný „celebration“ overlay (aura prsteň = podpis značky) ----
// rovnaký naprieč modulmi: emoji v aura prstenci + titulok + text
export function Oslava({ emoji = "🎉", title, text, onClose }: { emoji?: ReactNode; title?: ReactNode; text?: ReactNode; onClose?: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(4,6,12,.75)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 200, animation: "fadeUp .2s ease", padding: 24 }}>
      <Aura size={134} hrubka={2}><span style={{ fontSize: 52 }}>{emoji}</span></Aura>
      <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, textAlign: "center" }}>{title}</div>
      {text && <div style={{ color: C.textSec, fontSize: 14, textAlign: "center", padding: "0 22px", lineHeight: 1.5, maxWidth: 340 }}>{text}</div>}
    </div>
  );
}
