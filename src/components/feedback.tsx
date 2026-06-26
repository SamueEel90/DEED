import type { ReactNode } from "react";
import { C } from "@/theme";
import { Aura } from "@/components/visual";

// Pozn.: pôvodný ručný `Modal` nahradený komponentom <Sheet> (Vaul);
// pôvodný `Toast` nahradený globálnym sonner (components/toast.tsx, `toast()`).

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
