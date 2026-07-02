// ============================================================
// DEED · Obľúbené (bookmark) — prepínač „pridať do obľúbených"
// Číta/píše do personalizačného store (usePersonalizacia). Dve varianty:
//  • OblubeneHviezda — kompaktná hviezda ako overlay na karte feedu
//    (stopPropagation, nech klik neotvorí detail)
//  • OblubeneBtn     — labeled tlačidlo do detailu príspevku
// Obľúbené sa zobrazia v „Môj DEED → Obľúbené".
// ============================================================
import type { CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { IkonaHviezda } from "@/components/icons";
import { usePersonalizacia } from "@/lib/personalizacia";
import { tint } from "@/lib/ui";
import type { Oblubeny } from "@/types";

const GOLD = "var(--a-gold)";

export function OblubeneHviezda({ polozka, toast, style }: { polozka: Oblubeny; toast?: (m: string) => void; style?: CSSProperties }) {
  const { jeOblubene, toggleOblubene } = usePersonalizacia();
  const on = jeOblubene(polozka.refId);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggleOblubene(polozka); toast?.(on ? "Odobrané z obľúbených" : "Pridané do obľúbených ★"); }}
      aria-pressed={on} title={on ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
      style={{ position: "absolute", top: 10, right: 10, zIndex: 2, width: 34, height: 34, borderRadius: RADIUS.round, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: on ? GOLD : "rgba(8,11,18,.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 2px 8px rgba(0,0,0,.3)", ...style }}>
      <IkonaHviezda size={17} color={on ? "#3a2c05" : "#fff"} />
    </button>
  );
}

export function OblubeneBtn({ polozka, toast, style }: { polozka: Oblubeny; toast?: (m: string) => void; style?: CSSProperties }) {
  const { jeOblubene, toggleOblubene } = usePersonalizacia();
  const on = jeOblubene(polozka.refId);
  return (
    <button
      onClick={() => { toggleOblubene(polozka); toast?.(on ? "Odobrané z obľúbených" : "Pridané do obľúbených ★"); }}
      aria-pressed={on}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: SPACE.xs, height: 44, padding: `0 ${SPACE.md}px`, borderRadius: RADIUS.sm, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700,
        background: on ? tint(GOLD, .16) : "rgba(var(--glass-rgb),.05)", border: `1px solid ${on ? tint(GOLD, .5) : C.line}`, color: on ? GOLD : C.textSec, ...style }}>
      <IkonaHviezda size={17} color={on ? GOLD : C.textSec} /> {on ? "Uložené" : "Obľúbené"}
    </button>
  );
}
