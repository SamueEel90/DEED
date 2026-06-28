import type { ReactNode } from "react";
import { C, GRAD, glassTmavy, SPACE, RADIUS } from "@/theme";
import { pressable } from "@/components/pressable";
import { IkonaMenu, IkonaPenazenka } from "@/components/icons";
import type { Modul } from "@/components/TabBar";

// ============================================================
// DESKTOP — ľavá bočná navigácia (nahrádza spodný dok pri šírke ≥1180).
// Ukáže VŠETKY moduly (na desktope je miesto), dole Peňaženka · Viac · Režim.
// Klik volá tie isté callbacky ako dok (onModul/onViac) — žiadny nový stav.
// ============================================================
export function Sidebar({ moduly, aktivny, onModul, onViac, onPenazenka }: {
  moduly: Modul[];
  aktivny: string;
  onModul: (id: string) => void;
  onViac: () => void;
  onPenazenka?: () => void;
}) {
  return (
    <div style={{ width: 100, flex: "0 0 auto", height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", padding: `${SPACE.gutter}px ${SPACE.sm}px ${SPACE.md}px`, ...glassTmavy(18, .5), borderRight: `1px solid ${C.line}`, zIndex: 20 }}>
      {/* logo D⁺ — na desktope jediné logo v appke (v hlavičke modulov je skryté) */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: SPACE.md }}>
        <span style={{ width: 52, height: 52, borderRadius: RADIUS.md, background: GRAD, color: "#fff", fontWeight: 800, fontSize: 27, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 6px 18px rgba(99,134,255,.42)" }}>
          D<span style={{ position: "absolute", top: 6, right: 8, fontSize: 13 }}>+</span>
        </span>
      </div>

      {/* navigácia modulov */}
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xxs, flex: 1, overflowY: "auto", minHeight: 0 }}>
        {moduly.map((m) => <SideTab key={m.id} m={m} on={aktivny === m.id} onClick={() => onModul(m.id)} />)}
      </div>

      {/* dole — Peňaženka · Viac · Režim */}
      <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xxs, marginTop: SPACE.xs, paddingTop: SPACE.xs, borderTop: `1px solid ${C.line2}` }}>
        {onPenazenka && <SideBtn icon={<IkonaPenazenka size={20} color={C.textSec} />} label="Peňaženka" onClick={onPenazenka} />}
        <SideBtn icon={<IkonaMenu size={20} color={C.textSec} />} label="Viac" onClick={onViac} />
      </div>
    </div>
  );
}

function SideTab({ m, on, onClick }: { m: Modul; on: boolean; onClick: () => void }) {
  return (
    <div {...pressable(onClick, m.nazov)} aria-current={on ? "page" : undefined} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xxs, cursor: "pointer", padding: `${SPACE.xs}px ${SPACE.xxs}px`, borderRadius: RADIUS.md,
      background: on ? "linear-gradient(135deg, rgba(91,155,255,.30), rgba(139,124,255,.24))" : "transparent",
      border: on ? "1px solid rgba(116,166,255,.4)" : "1px solid transparent",
      boxShadow: on ? "0 4px 16px rgba(91,124,255,.30)" : "none",
      transition: "background .2s ease, box-shadow .2s ease",
    }}>
      <span style={{ fontSize: 21, lineHeight: 1, display: "flex", color: on ? C.text : C.textSec }}>{m.ikona}</span>
      <span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600, color: on ? C.blueL : C.textSec, letterSpacing: ".01em", textAlign: "center" }}>{m.nazov}</span>
    </div>
  );
}

function SideBtn({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <div {...pressable(onClick, label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xxs, cursor: "pointer", padding: `${SPACE.xs}px ${SPACE.xxs}px`, borderRadius: RADIUS.md, color: C.textSec }}>
      <span style={{ display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: C.textSec }}>{label}</span>
    </div>
  );
}
