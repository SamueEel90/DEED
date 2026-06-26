import { C } from "@/theme";
import { Hlavicka, Zdielanie } from "@/shared";
import { FUN } from "./mock";

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
  return (
    <div style={{ paddingBottom: 24 }}>
      <Hlavicka title="Fun zóna" onBack={onBack} titleColor="#E7C766" />
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #F0C75A, #F0A85E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "0 8px 26px rgba(240,168,94,.35)" }}>😄</div>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Keď sa AI sekne</div>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5, maxWidth: 340 }}>AI nie je dokonalá. Tu sú jej najväčšie prešľapy v hodnotení. Pobav sa, zdieľaj — a AI sa z toho učí.</div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 11.5, color: "#F4D684", lineHeight: 1.5, margin: "16px 0 6px", padding: "11px 13px", borderRadius: 12, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.28)" }}>
          ⚠ Oddelený kôš — tieto hodnotenia sa <b>nerátajú</b> do reálnej karmy ani dát. Omylná odmena sa dá kedykoľvek stiahnuť späť.
        </div>

        {FUN.map((f, i) => (
          <div key={i} style={{ background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 16, padding: 14, marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "rgba(var(--glass-rgb),.06)" }}>{f.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.textTer }}>Užívateľ spravil:</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{f.trik}</div>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(240,199,90,.08)", border: "1px solid rgba(240,199,90,.25)" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: "#F4D684", letterSpacing: ".3px" }}>🤖 AI HODNOTENIE</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4, lineHeight: 1.35 }}>„{f.verdikt}"</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#3DD68C" }}>{f.odmena}</span>
                <span style={{ fontSize: 10, color: C.textTer }}>· {f.riadky} riadky vo feede 😅</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 11, color: C.greenL }}>✓ {f.fix}</span>
              <span onClick={() => toast?.("😂 +1")} style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: C.textSec, cursor: "pointer" }}>😂 {f.lol.toLocaleString("sk")}</span>
              <span onClick={() => toast?.("Zdieľané — virálny efekt 🚀")} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#74A6FF", cursor: "pointer" }}><Zdielanie size={15} color="#74A6FF" /> Zdieľať</span>
            </div>
          </div>
        ))}

        <div style={{ textAlign: "center", fontSize: 11.5, color: C.textTer, lineHeight: 1.5, marginTop: 18 }}>Ojebal si systém? <b style={{ color: "#74A6FF" }}>Zdieľaj svoj úlovok</b> — pobavíš ľudí a AI sa zlepší.</div>
      </div>
    </div>
  );
}
