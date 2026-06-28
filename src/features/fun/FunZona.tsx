import { C, SPACE, RADIUS } from "@/theme";
import { Hlavicka, Zdielanie, obalSiroky, useLayout, pressable } from "@/shared";
import { useFun } from "@/data";

/*
  ============================================================
  FUN ZÓNA (§13.2) — vystavuje absurdné AI omyly v hodnotení
  ============================================================
  Zábava + učenie + akvizícia. Oddelený kôš — neráta sa do reálnej
  karmy/dát, omylná odmena sa dá stiahnuť späť. Virálny efekt:
  niekto „ojebe" systém → zdieľa → reklama → AI sa učí.
  ============================================================
*/

interface FunZonaProps {
  onBack?: () => void;
  toast?: (msg: string) => void;
}

export function FunZona({ onBack, toast }: FunZonaProps) {
  const { data: FUN = [] } = useFun();
  const { wide, desktop } = useLayout();
  return (
    <div style={{ paddingBottom: SPACE.lg }}>
      <Hlavicka title="Fun zóna" onBack={onBack} titleColor="var(--a-gold)" />
      {obalSiroky(
      <div style={{ padding: `${SPACE.gutter}px ${SPACE.md}px` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.xs, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: RADIUS.round, background: "linear-gradient(135deg, #F0C75A, #F0A85E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "0 8px 26px rgba(240,168,94,.35)" }}>😄</div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Keď sa AI sekne</div>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5, maxWidth: 340 }}>AI nie je dokonalá. Tu sú jej najväčšie prešľapy v hodnotení. Pobav sa, zdieľaj — a AI sa z toho učí.</div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: SPACE.xs, fontSize: 11.5, color: "var(--a-gold)", lineHeight: 1.5, margin: `${SPACE.md}px 0 ${SPACE.xs}px`, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.28)" }}>
          ⚠ Oddelený kôš — tieto hodnotenia sa <b>nerátajú</b> do reálnej karmy ani dát. Omylná odmena sa dá kedykoľvek stiahnuť späť.
        </div>

        {FUN.map((f, i) => (
          <div key={i} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RADIUS.md, padding: SPACE.gutter, marginTop: SPACE.sm }}>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.sm }}>
              <span style={{ width: 40, height: 40, borderRadius: RADIUS.sm, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(var(--glass-rgb),.06)" }}>{f.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.textTer }}>Užívateľ spravil:</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{f.trik}</div>
              </div>
            </div>
            <div style={{ marginTop: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.sm}px`, borderRadius: RADIUS.sm, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.25)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--a-gold)", letterSpacing: ".3px" }}>🤖 AI HODNOTENIE</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: SPACE.xxs, lineHeight: 1.35 }}>„{f.verdikt}"</div>
              <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.xs }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--a-green)" }}>{f.odmena}</span>
                <span style={{ fontSize: 10, color: C.textTer }}>· {f.riadky} riadky vo feede 😅</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: SPACE.xs, marginTop: SPACE.sm }}>
              <span style={{ fontSize: 11, color: C.greenL }}>✓ {f.fix}</span>
              <span {...pressable(() => toast?.("😂 +1"), "Pobavilo ma")} style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.textSec, cursor: "pointer" }}>😂 {f.lol.toLocaleString("sk")}</span>
              <span {...pressable(() => toast?.("Zdieľané — virálny efekt 🚀"), "Zdieľať úlovok")} style={{ display: "flex", alignItems: "center", gap: SPACE.xs, fontSize: 12, fontWeight: 700, color: "var(--a-info)", cursor: "pointer" }}><Zdielanie size={15} color="var(--a-info)" /> Zdieľať</span>
            </div>
          </div>
        ))}

        <div style={{ textAlign: "center", fontSize: 11.5, color: C.textTer, lineHeight: 1.5, marginTop: SPACE.md }}>Ojebal si systém? <b style={{ color: "var(--a-info)" }}>Zdieľaj svoj úlovok</b> — pobavíš ľudí a AI sa zlepší.</div>
      </div>,
      { wide, desktop, max: 560, maxDesktop: 640 })}
    </div>
  );
}
