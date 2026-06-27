// ============================================================
// DEED · Upgrade (pasívny → aktívny)
// Pasívny divák-darca smie PREZERAŤ a PRISPIEVAŤ (FIAT/karta/SMS) všade,
// ale NESMIE nič vytvárať/pridávať. Create vstupy ostávajú viditeľné, no
// po kliku otvoria tento panel „Staň sa aktívnym" (konverzia, nie tvrdé skrytie).
//
//  • useTvorbaGate() → { mozeTvorit, gate } — `gate(akcia)` vráti onClick,
//    ktorý buď spustí akciu (ak smie tvoriť), alebo otvorí upgrade panel.
//  • <UpgradePanel> — spodný sheet s CTA „Stať sa aktívnym".
// ============================================================
import { useCallback } from "react";
import { C, GRAD } from "@/theme";
import { tint } from "@/lib/ui";
import { usePouzivatel } from "@/lib/pouzivatel";
import { useUpgrade } from "@/components/context";
import { Sheet } from "@/components/sheet";
import { SipHore, IkonaPlus, IkonaPlay, IkonaPenazenka, IkonaPohar } from "@/components/icons";

/** Obalí create akciu: ak používateľ smie tvoriť → spustí ju, inak → upgrade panel. */
export function useTvorbaGate() {
  const { mozeTvorit } = usePouzivatel();
  const upgrade = useUpgrade();
  const gate = useCallback(
    (akcia?: () => void) => () => {
      if (mozeTvorit) akcia?.();
      else upgrade();
    },
    [mozeTvorit, upgrade]
  );
  return { mozeTvorit, gate };
}

const btnPrimary = {
  width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
  background: GRAD, color: "#fff", fontWeight: 700, fontSize: 15.5,
  cursor: "pointer", fontFamily: "inherit",
  boxShadow: "0 8px 26px rgba(78,122,62,.3), inset 0 1px 0 rgba(255,255,255,.22)",
} as const;

/** Panel „Staň sa aktívnym" — otvorí ho create akcia alebo DEED platba pri pasívnom účte. */
export function UpgradePanel({ onClose, onAktivovat }: { onClose?: () => void; onAktivovat?: () => void }) {
  const vyhody = [
    { Ikona: IkonaPlus, col: "var(--a-green)", t: "Pridávaj skutky, žiadosti a zbierky" },
    { Ikona: IkonaPlay, col: "var(--a-info)", t: "Komentuj a ukáž svoj talent" },
    { Ikona: IkonaPenazenka, col: "var(--a-teal)", t: "Prispievaj aj v DEED z peňaženky" },
    { Ikona: IkonaPohar, col: "var(--a-gold)", t: "Získavaj karmu, úrovne a odmeny" },
  ];
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "2px 2px 6px" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 28px rgba(78,122,62,.35)" }}>
          <SipHore size={28} color="#fff" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 14 }}>Toto je pre aktívnych členov</div>
        <div style={{ fontSize: 13.5, color: C.textSec, marginTop: 7, lineHeight: 1.55, maxWidth: 320 }}>
          Ako pasívny môžeš všetko prezerať a prispieť v EUR či SMS. Na DEED a vytváranie obsahu sa staň aktívnym — zadarmo a kedykoľvek, bez straty doterajšieho.
        </div>
      </div>

      <div style={{ margin: "16px 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {vyhody.map((v) => (
          <div key={v.t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 13, background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}` }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: tint(v.col, 0.14), border: `1px solid ${tint(v.col, 0.26)}` }}>
              <v.Ikona size={18} color={v.col} />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text, textAlign: "left" }}>{v.t}</span>
          </div>
        ))}
      </div>

      <button onClick={onAktivovat} style={btnPrimary}>Stať sa aktívnym</button>
      <button onClick={onClose} style={{ width: "100%", padding: "13px 0", marginTop: 10, borderRadius: 14, background: "transparent", color: C.textSec, border: "none", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" }}>
        Teraz nie
      </button>
    </Sheet>
  );
}
