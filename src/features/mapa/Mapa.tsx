import { useState } from "react";
import { C, GRAD } from "@/theme";
import { ModulHlavicka, IkonaPin, Toast } from "@/shared";
import { Zvoncek } from "@/features/notifikacie/Notifikacie";
import { FEED_CFG } from "@/lib/feed";
import { UROVNE, POCTY_KM, POCTY_UROVEN } from "./mock";

/*
  ============================================================
  MODUL MAPA (§15) — primárne nastavovač rádiusu pre feed
  ============================================================
  Štvrť = posuvník 1–5 km (default 2). Mesto/okres/kraj/krajina =
  admin hranice (OSM). GPS banner len keď je poloha vypnutá.
  Mení LEN zobrazenie (čo vidíš vo feede / na nástenke) — nie
  karmu/odmenu. Body skutkov na mape = budúcnosť.
  ============================================================
*/

export default function ModulMapa({ wide }: { wide?: boolean }) {
  const [hlaska, setHlaska] = useState<string | null>(null);
  const toast = (m: string) => { setHlaska(m); setTimeout(() => setHlaska((x) => (x === m ? null : x)), 2300); };
  const [uroven, setUroven] = useState("stvrt");
  const [km, setKm] = useState(2);
  const [gps, setGps] = useState(false); // demo: GPS vypnuté → banner

  const jeStvrt = uroven === "stvrt";
  const [skutky, udalosti] = jeStvrt ? POCTY_KM[km] : POCTY_UROVEN[uroven];
  const kruh = jeStvrt ? 64 + km * 26 : ({ mesto: 150, okres: 188, kraj: 216, krajina: 248 } as Record<string, number>)[uroven];
  const obal = (el: React.ReactNode) => wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el;

  return (
    <div style={{ minHeight: "100%", paddingBottom: 14 }}>
      <ModulHlavicka title="Mapa" right={<Zvoncek color={C.textSec} toast={toast} />} />
      {obal(
        <div style={{ padding: "12px 16px" }}>
          {/* GPS banner — len keď je poloha vypnutá */}
          {!gps && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(240,168,94,.1)", border: "1px solid rgba(240,168,94,.35)", borderRadius: 13, padding: "11px 13px", marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>⚠</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#F0A85E" }}>Poloha (GPS) je vypnutá</div>
                <div style={{ fontSize: 11, color: C.textTer }}>Zapni ju pre presnejší okruh okolo teba</div>
              </div>
              <span onClick={() => { setGps(true); toast("Poloha zapnutá (demo)"); }} style={{ flex: "none", fontSize: 11.5, fontWeight: 700, color: "#fff", background: "rgba(240,168,94,.85)", borderRadius: 10, padding: "7px 12px", cursor: "pointer" }}>Zapnúť</span>
            </div>
          )}

          {/* mapový podklad + kruh rádiusu */}
          <div style={{ position: "relative", height: 280, borderRadius: 18, overflow: "hidden", background: "linear-gradient(160deg, #0f1626, #0a0f1c)", border: `1px solid ${C.line}` }}>
            {/* faux ulice */}
            {[18, 42, 70, 88].map((t, i) => <div key={"h" + i} style={{ position: "absolute", left: 0, right: 0, top: `${t}%`, height: 1, background: "rgba(255,255,255,.05)" }} />)}
            {[24, 55, 78].map((l, i) => <div key={"v" + i} style={{ position: "absolute", top: 0, bottom: 0, left: `${l}%`, width: 1, background: "rgba(255,255,255,.05)" }} />)}
            <div style={{ position: "absolute", top: "30%", left: "-5%", width: "120%", height: 2, background: "rgba(91,155,255,.18)", transform: "rotate(-18deg)" }} />
            {/* kruh rádiusu */}
            <div style={{ position: "absolute", top: "50%", left: "50%", width: kruh, height: kruh, transform: "translate(-50%,-50%)", borderRadius: "50%", border: "2px solid rgba(91,155,255,.7)", background: "radial-gradient(circle, rgba(91,155,255,.16), rgba(91,155,255,.04) 70%)", boxShadow: "0 0 40px rgba(91,124,255,.25)", transition: "width .35s ease, height .35s ease" }} />
            {/* pin „Ty" */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "rgba(0,0,0,.5)", padding: "2px 8px", borderRadius: 10 }}>Ty</span>
              <IkonaPin size={26} color="#74A6FF" />
            </div>
          </div>

          {/* úrovne okruhu */}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            {UROVNE.map(([id, label]) => {
              const on = uroven === id;
              return <span key={id} onClick={() => setUroven(id)} style={{ flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 11, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer",
                background: on ? "rgba(91,155,255,.16)" : C.surface2, border: `1px solid ${on ? "rgba(116,166,255,.5)" : C.line}`, color: on ? "#74A6FF" : C.textSec }}>{label}</span>;
            })}
          </div>

          {/* posuvník (len štvrť) alebo popis admin hranice */}
          {jeStvrt ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12.5, color: C.textSec }}>Veľkosť okruhu (štvrť)</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#74A6FF" }}>{km} km</span>
              </div>
              <input type="range" min={1} max={5} step={1} value={km} onChange={(e) => setKm(+e.target.value)} style={{ width: "100%", marginTop: 8, accentColor: "#5B9BFF" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textTer }}>
                {[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 14px" }}>
              <IkonaPin size={18} color="#74A6FF" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{FEED_CFG.radiusy[uroven].label}</div>
                <div style={{ fontSize: 11, color: C.textTer }}>Administratívna hranica (OSM) · vyšší prah významnosti</div>
              </div>
            </div>
          )}

          {/* info chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, padding: "11px 13px", borderRadius: 13, background: "rgba(31,191,143,.08)", border: "1px solid rgba(31,191,143,.22)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", flex: "none", background: "#2BBd8C", animation: "pulse 1.6s infinite" }} />
            <span style={{ fontSize: 12.5, color: C.textSec }}>V tomto okruhu: <b style={{ color: C.text }}>{skutky.toLocaleString("sk")}</b> skutkov · <b style={{ color: C.text }}>{udalosti.toLocaleString("sk")}</b> udalostí</span>
          </div>
          <div style={{ fontSize: 10.5, color: C.textTer, margin: "8px 2px 0", lineHeight: 1.5 }}>Mení len, čo vidíš vo feede a na nástenke — nie karmu ani odmeny. Body skutkov na mape pribudnú neskôr.</div>

          <button onClick={() => toast(`Rádius nastavený: ${jeStvrt ? km + " km · štvrť" : FEED_CFG.radiusy[uroven].label}`)}
            style={{ width: "100%", height: 50, borderRadius: 14, marginTop: 14, border: "none", background: GRAD, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 8px 26px rgba(99,134,255,.32)" }}>
            Použiť rádius
          </button>
        </div>
      )}
      {hlaska && <Toast text={hlaska} />}
    </div>
  );
}
