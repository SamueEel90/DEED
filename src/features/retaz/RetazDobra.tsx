import { useState } from "react";
import { C, GRAD, GRAD_ZELENY } from "@/theme";
import { Modal, QrVizual, IkonaFajka, IkonaDoska, Lupa, Zdielanie, tint } from "@/shared";
import type { RetazMode, RetazKrok, RetazVysledok } from "@/types";
import { useRetazZiadosti } from "@/data";

/*
  ============================================================
  REŤAZ DOBRA (D+R) — §9
  ============================================================
  User pošle vopred určenú časť (%) toho, čo dostane za skutok,
  ďalej na žiadosť. Tá istá logika = honorár split pre tvorcov.

  • Cesta A (skutok): po vyhodnotení významného skutku → ponuka
    D+R → % → výber žiadosti → zverejnené s D+R + QR.
  • Cesta B (tvorca): Peňaženka → „Nastav reťaz na honorár" →
    % + komu → QR s reťazou na zdieľanie (pod video, knihu).

  Pravidlá: % sa pri vzniku ZAFIXUJE (nemenné, záväzok). Reťazová
  časť je oddelená od voľnej (user ju nevyberie pre seba). Generuje
  Generosity Score — NIE nové DEED tokeny. QR = odkaz na skutok.
  ============================================================
*/

// žiadosti, na ktoré možno poslať reťazovú časť (Help/Charita) — presunuté do ./mock.
export { ZIADOSTI } from "./mock";

const norm = (s?: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

interface RetazDobraSheetProps {
  odmena?: number;
  mode?: RetazMode;
  titulOdkaz?: string;
  odkaz?: string;
  onClose?: () => void;
  onDone?: (vysledok: RetazVysledok) => void;
  toast?: (msg: string) => void;
}

// ---- bottom-sheet tok: nastav % + vyber žiadosť → zverejnené + QR D+R ----
// mode: "skutok" (Cesta A) | "honorar" (Cesta B)
export function RetazDobraSheet({ odmena = 130, mode = "skutok", titulOdkaz = "Skutok", odkaz = "https://deed.app/s/120042", onClose, onDone, toast }: RetazDobraSheetProps) {
  const { data: ZIADOSTI = [] } = useRetazZiadosti();
  const honorar = mode === "honorar";
  const [krok, setKrok] = useState<RetazKrok>("nastav"); // nastav | hotovo
  const [pct, setPct] = useState(30);
  const [zid, setZid] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const reazSuma = Math.round((odmena * pct) / 100);
  const ziadost = ZIADOSTI.find((z) => z.id === zid);
  const zoznam = q ? ZIADOSTI.filter((z) => norm(z.nazov + " " + z.lok).includes(norm(q))) : ZIADOSTI;
  const gener = reazSuma > 0 ? Math.round(reazSuma / 2) + 5 : pct + 5; // Generosity Score (placeholder; NIE nové DEED)

  const inpS: React.CSSProperties = { width: "100%", padding: "11px 13px 11px 38px", borderRadius: 12, background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit" };

  // ---- KROK 1: nastav % + vyber žiadosť ----
  if (krok === "nastav") {
    return (
      <Modal onClose={onClose}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: tint("#1FBF8F", .16), color: "#2BD49B", fontSize: 18 }}>♻</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Reťaz dobra</div>
            <div style={{ fontSize: 11.5, color: C.textTer }}>{honorar ? "Nastav reťaz na svoj honorár" : "Podeľ sa o časť odmeny za skutok"}</div>
          </div>
        </div>

        {/* % posuvník */}
        <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 4px" }}>
          {honorar ? "KOĽKO Z HONORÁRU POSLAŤ ĎALEJ" : "KOĽKO POSLAŤ ĎALEJ"}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: "#2BD49B" }}>{pct}%</span>
          {!honorar && <span style={{ fontSize: 12.5, color: C.textSec }}>≈ <b style={{ color: C.text }}>{reazSuma} DEED</b> z {odmena} DEED</span>}
          {honorar && <span style={{ fontSize: 12.5, color: C.textSec }}>z každého budúceho honoráru</span>}
        </div>
        <input type="range" min={5} max={90} step={5} value={pct} onChange={(e) => setPct(+e.target.value)}
          style={{ width: "100%", marginTop: 10, accentColor: "#1FBF8F" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textTer }}>
          <span>5 %</span><span>90 %</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: C.gold, marginTop: 8, lineHeight: 1.4 }}>
          🔒 % sa po potvrdení <b>zamkne</b> — je to záväzok, nedá sa znížiť.
        </div>

        {/* výber žiadosti */}
        <div style={{ fontSize: 11.5, letterSpacing: ".4px", color: C.textTer, fontWeight: 700, margin: "16px 0 8px" }}>KOMU — žiadosť (Help / Charita)</div>
        <div style={{ position: "relative", marginBottom: 10 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Lupa size={16} color={C.textTer} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vyhľadať žiadosť…" style={inpS} />
        </div>
        <div style={{ maxHeight: 188, overflowY: "auto", margin: "0 -2px" }}>
          {zoznam.map((z) => {
            const on = zid === z.id;
            return (
              <div key={z.id} onClick={() => setZid(z.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 11px", borderRadius: 12, marginBottom: 7, cursor: "pointer",
                background: on ? tint(z.col, .12) : "rgba(var(--glass-rgb),.04)", border: `1px solid ${on ? tint(z.col, .5) : C.line}` }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: tint(z.col, .15) }}>{z.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                    {z.nazov}
                    {z.odpor && <span style={{ fontSize: 8.5, fontWeight: 800, color: "#2BD49B", background: "rgba(31,191,143,.14)", borderRadius: 6, padding: "1px 6px" }}>ODPORÚČANÉ</span>}
                    {z.overena && <span style={{ fontSize: 8.5, fontWeight: 800, color: "#5BA8F0", background: "rgba(91,168,240,.14)", borderRadius: 6, padding: "1px 6px" }}>✓ OVERENÁ</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textTer, marginTop: 2 }}>{z.zdroj} · {z.lok}</div>
                </div>
                {on && <IkonaFajka size={16} color={z.col} />}
              </div>
            );
          })}
          {/* naskenovať QR žiadosti */}
          <div onClick={() => toast?.("Naskenuj QR žiadosti (demo)")} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 11px", borderRadius: 12, cursor: "pointer", border: `1px dashed ${C.line}`, color: C.textSec }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(var(--glass-rgb),.05)" }}><IkonaDoska size={16} color={C.textTer} /></span>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Naskenovať QR žiadosti</div>
          </div>
        </div>

        <button onClick={() => ziadost && setKrok("hotovo")} disabled={!ziadost}
          style={{ width: "100%", height: 50, borderRadius: 14, border: "none", marginTop: 14, fontWeight: 700, fontSize: 15, fontFamily: "inherit",
            background: ziadost ? GRAD_ZELENY : "rgba(var(--glass-rgb),.06)", color: ziadost ? "#fff" : C.textTer, cursor: ziadost ? "pointer" : "not-allowed",
            boxShadow: ziadost ? "0 8px 26px rgba(31,191,143,.32)" : "none" }}>
          {honorar ? "Vygenerovať QR reťaze · % sa zafixuje" : "Potvrdiť — % sa zafixuje"}
        </button>
      </Modal>
    );
  }

  // ---- KROK 2: zverejnené + QR D+R ----
  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "2px 0 8px" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(31,191,143,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}><IkonaFajka size={28} color="#2BD49B" /></div>
        <div style={{ fontSize: 17, fontWeight: 800, textAlign: "center" }}>{honorar ? "Reťaz na honorár nastavená" : "Skutok zverejnený s Reťazou dobra"}</div>
      </div>

      {/* zhrnutie */}
      <div style={{ background: "rgba(var(--glass-rgb),.05)", border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 14px", marginTop: 4 }}>
        <Row k={honorar ? "Honorár" : "Tvoja odmena"} v={honorar ? "každý budúci príjem" : `${odmena} DEED`} />
        <Row k="Ide ďalej (zamknuté)" v={`${pct}%${honorar ? "" : ` · ${reazSuma} DEED`}`} accent="#2BD49B" />
        <Row k="Príjemca" v={ziadost?.nazov} />
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, fontSize: 13, fontWeight: 800 }}>
          <span>Generosity Score</span><span style={{ color: C.gold }}>+{gener}</span>
        </div>
      </div>

      {/* QR D+R */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, marginTop: 14 }}>
        <div style={{ position: "relative" }}>
          <QrVizual data={odkaz + "·dr" + pct} size={150} />
          <span style={{ position: "absolute", top: -8, right: -8, fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 20, background: GRAD_ZELENY, color: "#06281d", boxShadow: "0 4px 12px rgba(31,191,143,.4)" }}>D+R {pct}%</span>
        </div>
        <div style={{ fontSize: 12, color: C.textSec, textAlign: "center" }}>{pct}% ide ďalej → <b style={{ color: C.text }}>{ziadost?.nazov}</b><br /><span style={{ fontSize: 10.5, color: C.textTer }}>skén → vidíš príjemcu · QR = odkaz na skutok</span></div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, color: C.textTer, marginTop: 12, lineHeight: 1.4, background: "rgba(31,191,143,.06)", border: "1px solid rgba(31,191,143,.18)", borderRadius: 10, padding: "9px 11px" }}>
        ♻ Reťazová časť sa akumuluje oddelene (zamknutá) a odošle sa pri prahu 1000 DEED alebo uzávierke 30 dní. Generuje Generosity Score, nie nové DEED.
      </div>

      <button onClick={() => { toast?.(honorar ? "Reťaz na honorár aktívna — QR pripravený na zdieľanie" : "Skutok + reťaz zverejnené · QR zdieľané"); onDone?.({ pct, reazSuma, ziadost, gener }); onClose?.(); }}
        style={{ width: "100%", height: 50, borderRadius: 14, border: "none", marginTop: 14, fontWeight: 700, fontSize: 15, fontFamily: "inherit", background: GRAD, color: "#fff", cursor: "pointer", boxShadow: "0 8px 26px rgba(99,134,255,.32)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
        <Zdielanie size={18} color="#fff" /> {honorar ? "Zdieľať QR reťaze" : "Zdieľať skutok + QR"}
      </button>
    </Modal>
  );
}

interface RowProps {
  k: React.ReactNode;
  v: React.ReactNode;
  accent?: string;
}

function Row({ k, v, accent }: RowProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 12.5, borderBottom: `1px solid ${C.line2}` }}>
      <span style={{ color: C.textTer, flex: "none" }}>{k}</span>
      <span style={{ fontWeight: 600, color: accent || C.text, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
    </div>
  );
}
