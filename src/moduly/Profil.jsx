import { useState } from "react";
import { C, GRAD } from "../theme";

/*
  ============================================================
  MODUL PROFIL — port z deed_prototype.html
  profil (karma, úrovne) → peňaženka / moje skutky / štatistiky
  / priatelia / nastavenia
  ============================================================
*/

export default function ModulProfil({ wide }) {
  const [screen, setScreen] = useState("profil"); // profil | wallet | sub
  const [subNazov, setSubNazov] = useState(null);
  const [hlaska, setHlaska] = useState(null);

  const toast = (m) => { setHlaska(m); setTimeout(() => setHlaska((x) => (x === m ? null : x)), 2300); };
  const sub = (n) => { setSubNazov(n); setScreen("sub"); };
  const obal = (el) => wide ? <div style={{ maxWidth: 620, margin: "0 auto" }}>{el}</div> : el;

  return (
    <div style={{ minHeight: "100%" }}>
      {screen === "profil" && obal(<ProfilHlavny toast={toast} naWallet={() => setScreen("wallet")} naSub={sub} />)}
      {screen === "wallet" && obal(<Penazenka toast={toast} onBack={() => setScreen("profil")} />)}
      {screen === "sub" && obal(<SubScreen nazov={subNazov} toast={toast} onBack={() => setScreen("profil")} />)}

      {hlaska && (
        <div style={{ position: "absolute", bottom: 92, left: "50%", transform: "translateX(-50%)", background: "rgba(11,15,26,.72)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(52,211,153,.35)", color: "#C9F2E2", padding: "11px 18px", borderRadius: 30, fontSize: 12.5, fontWeight: 600, zIndex: 100, width: "max-content", maxWidth: "88%", textAlign: "center", animation: "fadeUp .3s ease", boxShadow: "0 10px 34px rgba(0,0,0,.45), 0 0 24px rgba(67,224,200,.12)" }}>
          {hlaska}
        </div>
      )}
    </div>
  );
}

// ===================== PROFIL =====================
function ProfilHlavny({ toast, naWallet, naSub }) {
  const dlazdice = [
    ["Peňaženka", "1 240 DEED", "#13243a", "#5BA8F0", "€", naWallet],
    ["Karma a úrovne", "7 modulov", "#1a1430", "#A98BF0", "★", () => naSub("Karma a úrovne")],
    ["Moje skutky", "48 skutkov", "#0f2417", "#3DD68C", "✓", () => naSub("Moje skutky")],
    ["Štatistiky", "umiestnenie", "#0d2422", "#3DD6CE", "▦", () => naSub("Štatistiky a umiestnenie")],
    ["Priatelia", "nájdi známych", "#2a1f10", "#E7C766", "☺", () => naSub("Priatelia")],
    ["Nastavenia", "vzhľad, jazyk", "#1a1a22", "#9AA0A8", "⚙", () => naSub("Nastavenia")],
  ];

  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px" }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>Môj profil</span>
        <span onClick={() => naSub("Nastavenia")} style={{ fontSize: 18, color: C.textSec, cursor: "pointer" }}>⚙</span>
      </div>

      <div style={{ margin: "8px 16px 0", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#3A8DD6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, boxShadow: "0 0 0 2.5px rgba(240,199,90,.75), 0 0 22px rgba(240,199,90,.45)" }}>M</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Martin K.</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#2A1F10", border: "1px solid #C8A23A", color: "#E7C766", fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 9, marginTop: 6 }}>★ Gold · L7</div>
          <div style={{ marginTop: 6 }}>
            <span style={{ display: "inline-flex", fontSize: 9.5, color: "#3DD68C", background: "#0f2417", border: "1px solid #2E7D52", padding: "3px 8px", borderRadius: 7, marginRight: 8 }}>verejný</span>
            <span onClick={() => toast("Prepnuté na anonym (demo)")} style={{ fontSize: 9.5, color: "#5BA8F0", cursor: "pointer" }}>prepnúť na anonym</span>
          </div>
        </div>
      </div>

      <div style={{ margin: "14px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textTer }}>
          <span>Do ďalšej úrovne (Platinum)</span><span style={{ color: "#E7C766" }}>72 %</span>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,.07)", borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
          <div style={{ height: "100%", width: "72%", background: "linear-gradient(90deg, #F0C75A, #F09A5E)", borderRadius: 4, boxShadow: "0 0 12px rgba(240,199,90,.4)" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 16 }}>
        {dlazdice.map((d, i) => (
          <div key={i} onClick={d[5]} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, background: d[2], color: d[3] }}>{d[4]}</div>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginTop: 12 }}>{d[0]}</div>
            <div style={{ fontSize: 9.5, color: C.textTer, marginTop: 2 }}>{d[1]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== PEŇAŽENKA =====================
function Penazenka({ toast, onBack }) {
  const prevody = [
    ["Podpora · Jana N.", "-50", "#F2706F"],
    ["Odmena za skutok", "+177", "#3DD68C"],
    ["Kúpa kartou", "+500", "#3DD68C"],
    ["Podpora · Jozef M.", "-100", "#F2706F"],
  ];
  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
        <div onClick={onBack} style={spatBtn}>‹</div>
        <h3 style={{ fontSize: 15, margin: 0 }}>Peňaženka</h3>
      </div>
      <div style={{ padding: "0 16px" }}>
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(150deg, rgba(91,155,255,.22), rgba(139,124,255,.16) 55%, rgba(67,224,200,.13))", border: "1px solid rgba(116,166,255,.35)", borderRadius: 20, padding: 18, boxShadow: "0 14px 40px rgba(0,0,0,.35), 0 0 36px rgba(91,124,255,.14), inset 0 1px 0 rgba(255,255,255,.12)" }}>
          <div style={{ position: "absolute", top: -50, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,124,255,.3), transparent 70%)", filter: "blur(28px)", pointerEvents: "none" }} />
          <div style={{ fontSize: 12, color: "#A9BEDF" }}>Zostatok</div>
          <div style={{ marginTop: 4 }}><span style={{ fontSize: 30, fontWeight: 800 }}>1 240</span> <span style={{ color: "#74A6FF", fontWeight: 800 }}>DEED</span></div>
          <div style={{ fontSize: 10, color: "#8FA6CC", marginTop: 4 }}>≈ 62 € · Base L2 · ERC-4337</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {[["↑", "Poslať", "#0f2417", "#2E7D52", "#3DD68C", "Poslať DEED (demo)"],
            ["↓", "Prijať", "#13243a", "#2A5E8E", "#5BA8F0", "Prijať (demo)"],
            ["＋", "Kúpiť", "#1a1430", "#7A5BD8", "#A98BF0", "Kúpiť DEED (demo)"]].map((b, i) => (
            <div key={i} onClick={() => toast(b[5])} style={{ flex: 1, height: 58, borderRadius: 11, background: b[2], border: `1px solid ${b[3]}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: b[4] }}>{b[0]}</div>
              <div style={{ fontSize: 8.5, color: C.textTer, marginTop: 2 }}>{b[1]}</div>
            </div>
          ))}
        </div>

        <div style={sekciaLabel}>KÚPIŤ DEED</div>
        <div onClick={() => toast("Burza DEED/USDC (demo)")} style={subItem}><span>▣ Cez burzu (DEED/USDC)</span><span style={{ color: "#4A4F57" }}>›</span></div>
        <div onClick={() => toast("Platba kartou (demo)")} style={subItem}><span>▢ Platobnou kartou</span><span style={{ color: "#4A4F57" }}>›</span></div>

        <div style={sekciaLabel}>POSLEDNÉ PREVODY</div>
        {prevody.map((r, i) => (
          <div key={i} style={subItem}>
            <span><span style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", marginRight: 8, background: r[2] }} />{r[0]}</span>
            <span style={{ fontWeight: 700, color: r[2] }}>{r[1]} DEED</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== PODSTRÁNKY =====================
function SubScreen({ nazov, toast, onBack }) {
  let obsah;
  if (nazov === "Moje skutky") {
    obsah = [
      ["Celú noc sme hľadali nezvestného dôch…", "+177", "#5BA8F0"],
      ["Vyčistili sme čiernu skládku pri potoku…", "+84", "#3DD68C"],
      ["Odviezol som suseda na dialýzu", "+30", "#3DD6CE"],
      ["Naučil som babičku volať cez videohovor", "+20", "#5BA8F0"],
      ["Mesiac do práce na bicykli — 240 km", "+62", "#3DD68C"],
    ].map((r, i) => (
      <div key={i} style={subItem}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[0]}</span><span style={{ fontWeight: 700, color: r[2], flex: "none", marginLeft: 8 }}>{r[1]}</span></div>
    ));
  } else if (nazov === "Karma a úrovne") {
    obsah = [
      ["Celková karma", "Gold · L7", "#E7C766"],
      ["Komunita", "Silver", "#5BA8F0"],
      ["Príroda", "Gold", "#3DD68C"],
      ["Zdravie", "Bronze", "#3DD6CE"],
      ["Učenie", "Bronze", "#A98BF0"],
    ].map((r, i) => (
      <div key={i} style={subItem}><span>{r[0]}</span><span style={{ fontWeight: 700, color: r[2] }}>{r[1]}</span></div>
    ));
  } else if (nazov === "Nastavenia") {
    obsah = (
      <>
        <div style={subItem}><span>Vzhľad</span><span onClick={() => toast("Dark / Day — mení len podklad")} style={{ fontWeight: 700, color: "#5BA8F0", cursor: "pointer" }}>Dark ▾</span></div>
        <div style={subItem}><span>Jazyk</span><span style={{ fontWeight: 700 }}>SK ▾</span></div>
        <div style={subItem}><span>Profil</span><span style={{ fontWeight: 700, color: "#3DD68C" }}>Verejný ▾</span></div>
        <div style={subItem}><span>Notifikácie</span><span style={{ fontWeight: 700 }}>Zapnuté ▾</span></div>
      </>
    );
  } else if (nazov === "Priatelia") {
    obsah = (
      <>
        <button onClick={() => toast("Hľadám známych cez kontakty (demo)")} style={{ width: "100%", height: 50, borderRadius: 14, background: GRAD, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 26px rgba(99,134,255,.32)" }}>Nájsť známych cez kontakty</button>
        <div style={{ padding: "14px 2px", fontSize: 11, color: C.textTer, lineHeight: 1.5 }}>Čísla sa hashujú, GDPR súhlas, dá sa vypnúť.</div>
      </>
    );
  } else {
    obsah = [
      ["Celkové umiestnenie", "#412 v meste", "#E7C766"],
      ["Príroda", "#28 v štvrti", "#3DD68C"],
      ["Tento mesiac", "+9 skutkov", "#5BA8F0"],
      ["Celkovo darované", "840 €", "#3DD68C"],
    ].map((r, i) => (
      <div key={i} style={subItem}><span>{r[0]}</span><span style={{ fontWeight: 700, color: r[2] }}>{r[1]}</span></div>
    ));
  }

  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px 8px" }}>
        <div onClick={onBack} style={spatBtn}>‹</div>
        <h3 style={{ fontSize: 15, margin: 0 }}>{nazov}</h3>
      </div>
      <div style={{ padding: "0 16px" }}>{obsah}</div>
    </div>
  );
}

const spatBtn = { width: 30, height: 30, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 };
const subItem = { display: "flex", alignItems: "center", justifyContent: "space-between", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, marginBottom: 8, fontSize: 13 };
const sekciaLabel = { fontSize: 10, letterSpacing: ".5px", color: C.textTer, fontWeight: 700, margin: "18px 0 8px" };
