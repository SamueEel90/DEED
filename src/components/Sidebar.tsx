import { pressable } from "@/components/pressable";
import { IkonaMenu, IkonaPenazenka } from "@/components/icons";
import { Znacka } from "@/components/znacka";
import { useMotiv } from "@/components/context";
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
  useMotiv(); // prekresliť logo pri zmene témy
  // OPRAVY 91: podľa prototypu „Sprava charity PC" — 104 px, pozadie --panel, pravý okraj v linke štítu, ikony vo farbe štítu
  return (
    <nav aria-label="Hlavné moduly" className="sc-tokeny sc-side" style={{ width: 104, flex: "0 0 auto", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "14px 0", background: "var(--panel)", borderRight: "1px solid var(--accLine)", zIndex: 20 }}>
      {/* logo — nové QR logo (klik → QR na celú obrazovku) */}
      <div style={{ flex: "none", display: "flex", justifyContent: "center", marginBottom: 6 }}>
        <Znacka size={56} logoQr />
      </div>

      {/* navigácia modulov */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1, overflowY: "auto", minHeight: 0, width: "100%" }}>
        {moduly.map((m) => <SideTab key={m.id} m={m} on={aktivny === m.id} onClick={() => onModul(m.id)} />)}
      </div>

      {/* dole — Peňaženka · Viac */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--accLine)", width: "100%" }}>
        {onPenazenka && <SideTab m={{ id: "penazenka", nazov: "Peňaženka", ikona: <IkonaPenazenka /> } as Modul} on={false} onClick={onPenazenka} />}
        <SideTab m={{ id: "viac", nazov: "Viac", ikona: <IkonaMenu /> } as Modul} on={false} onClick={onViac} />
      </div>
    </nav>
  );
}

function SideTab({ m, on, onClick }: { m: Modul; on: boolean; onClick: () => void }) {
  // aktívna: 96 px, --gSoft, rámik 1.5px --gBd bez spodného, zaoblené len hore; neaktívna 88 px
  return (
    <div {...pressable(onClick, m.nazov)} aria-current={on ? "page" : undefined} style={{
      flex: "none", width: on ? 96 : 88, minHeight: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer",
      padding: on ? "8px 0" : "6px 0", borderRadius: on ? "20px 20px 0 0" : 0,
      background: on ? "var(--gSoft)" : "transparent", border: on ? "1.5px solid var(--gBd)" : "1.5px solid transparent", borderBottom: "none",
      color: on ? "var(--gInk)" : "var(--ink2)",
    }}>
      <span className="sc-side-ik" style={{ display: "flex", color: "var(--acc)" }}>{m.ikona}</span>
      <span style={{ fontSize: 13, fontWeight: on ? 800 : 600, textAlign: "center", lineHeight: 1.2 }}>{m.nazov}</span>
    </div>
  );
}
