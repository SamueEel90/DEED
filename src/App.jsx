import { useState, useEffect } from "react";
import { C } from "./theme";
import { GaleriaContext, Lightbox, DychajucePozadie, MotivContext } from "./shared";
import { TabBar, ViacSheet, nacitajTaby, ulozTaby, VSETKY_MODULY } from "./TabBar";
import ModulGood from "./moduly/Good";
import ModulHelp from "./moduly/Help";
import ModulCharita from "./moduly/Charita";
import ModulProfil from "./moduly/Profil";
import ModulPlaceholder from "./moduly/Placeholder";
import ModulAktivity from "./moduly/Aktivity";
import ModulAdmin from "./moduly/Admin";

/*
  ============================================================
  DEED Aura — reálna aplikácia (responzívna na všetkých zariadeniach)
  ============================================================
  - Appka vypĺňa celú obrazovku a prispôsobuje sa: mobil → 1 stĺpec,
    tablet/desktop → viacstĺpcové feedy.
  - Na DESKTOPE je navrchu prepínač náhľadu: 📱 Mobil · 📲 Tablet · 💻 Laptop
    — appka beží naživo v ráme zvoleného zariadenia.
  - Spodné menu = plávajúci glass dock, user si ho poskladá cez
    "Viac → Upraviť menu" (ukladá sa do localStorage).
  - Investorský "kokpit" je v module Admin (dock → Viac → Admin).
  ============================================================
*/

const FONT = "'Manrope', -apple-system, 'Segoe UI', Arial, sans-serif";

// aktuálne rozmery okna → responzívne rozhodovanie o rozložení
export function useOkno() {
  const [s, setS] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1024,
    h: typeof window !== "undefined" ? window.innerHeight : 768,
  }));
  useEffect(() => {
    const onR = () => setS({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return s;
}
export function useSirka() { return useOkno().w; }

const pageBase = {
  position: "fixed", inset: 0, overflow: "hidden", isolation: "isolate",
  background: "var(--page-grad)", transition: "background .35s ease",
  fontFamily: FONT, color: C.text,
};

// ===================== APP SHELL =====================
export default function App() {
  const { w, h } = useOkno();
  const desktop = w >= 1024;
  const wide = w >= 760;
  const [nahlad, setNahlad] = useState("laptop"); // 📱 mobil | 📲 tablet | 💻 laptop (len desktop)

  // motív (svetlý / tmavý) — prepína triedu .light na <html>, ukladá sa
  const [svetly, setSvetly] = useState(() => {
    try { return localStorage.getItem("deed.motiv") === "svetly"; } catch { return false; }
  });
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("light", svetly);
      localStorage.setItem("deed.motiv", svetly ? "svetly" : "tmavy");
    } catch { /* private mode */ }
  }, [svetly]);
  const motiv = { svetly, prepni: () => setSvetly((s) => !s) };

  let inner;
  // --- reálny mobil / tablet: appka na celú obrazovku, bez prepínača ---
  if (!desktop) {
    inner = (
      <div style={{ ...pageBase, display: "flex", justifyContent: "center", alignItems: "stretch" }}>
        <DychajucePozadie />
        <div style={{ position: "relative", width: "100%", maxWidth: wide ? 1180 : 560, height: "100%", background: C.bg }}>
          <Screens wide={wide} />
        </div>
      </div>
    );
  } else {
    // --- desktop: prepínač náhľadu zariadenia + appka naživo v ráme ---
    inner = (
      <div style={{ ...pageBase, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <DychajucePozadie />
        <DeviceToggle device={nahlad} onChange={setNahlad} />
        <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px 18px" }}>
          <DevicePreview device={nahlad} vyska={h} />
        </div>
      </div>
    );
  }

  return <MotivContext.Provider value={motiv}>{inner}</MotivContext.Provider>;
}

// ---- PREPÍNAČ NÁHĽADU (desktop) ----
function DeviceToggle({ device, onChange }) {
  const moznosti = [["mobil", "📱 Mobil"], ["tablet", "📲 Tablet"], ["laptop", "💻 Laptop"]];
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: "16px 0 14px", flexWrap: "wrap" }}>
      {moznosti.map(([k, t]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: "9px 20px", borderRadius: 22, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          fontWeight: device === k ? 800 : 500,
          border: `1px solid ${device === k ? "rgba(116,166,255,.55)" : C.line}`,
          background: device === k ? "linear-gradient(135deg, rgba(91,155,255,.22), rgba(139,124,255,.16))" : "rgba(var(--glass-rgb),.05)",
          boxShadow: device === k ? "0 6px 20px rgba(91,124,255,.25)" : "none",
          color: device === k ? C.text : C.textSec,
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          transition: "all .2s ease",
        }}>{t}</button>
      ))}
    </div>
  );
}

// ---- RÁM ZARIADENIA s naživo bežiacou appkou (desktop náhľad) ----
function DevicePreview({ device, vyska }) {
  const ziara = "0 34px 90px rgba(0,0,0,.6), 0 0 80px rgba(91,123,255,.12), 0 0 0 1px rgba(255,255,255,.06)";

  // 💻 Laptop = okno prehliadača na plnú šírku
  if (device === "laptop") {
    const H = Math.max(520, Math.min(vyska - 110, 900));
    return (
      <div style={{ width: "100%", maxWidth: 1180, height: H, display: "flex", flexDirection: "column" }}>
        <div style={{ borderRadius: 16, overflow: "hidden", background: C.bg, boxShadow: ziara, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", background: "rgba(var(--glass-rgb),.05)", borderBottom: `1px solid ${C.line}`, flex: "0 0 auto" }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((f) => <span key={f} style={{ width: 11, height: 11, borderRadius: "50%", background: f, flex: "0 0 auto" }} />)}
            <span style={{ flex: 1, maxWidth: 460, margin: "0 auto", background: "rgba(var(--glass-rgb),.06)", border: `1px solid ${C.line}`, borderRadius: 9, padding: "5px 14px", fontSize: 12, color: C.textSec, textAlign: "center" }}>🔒 deed-help.vercel.app</span>
            <span style={{ width: 47, flex: "0 0 auto" }} />
          </div>
          <div style={{ flex: 1, position: "relative", minHeight: 0, color: C.text }}>
            <Screens wide />
          </div>
        </div>
      </div>
    );
  }

  // 📱 telefón / 📲 tablet
  const tablet = device === "tablet";
  const H = Math.max(520, Math.min(vyska - 120, tablet ? 1000 : 900));
  return (
    <div style={{ maxWidth: "100%" }}>
      <div style={{
        width: tablet ? 768 : 430, maxWidth: "100%",
        borderRadius: tablet ? 36 : 42, padding: tablet ? 14 : 11,
        background: "linear-gradient(160deg, #2B3040 0%, #161A26 55%, #1E2330 100%)",
        boxShadow: ziara,
      }}>
        <div style={{ borderRadius: tablet ? 24 : 32, overflow: "hidden", position: "relative", background: C.bg, height: H, color: C.text }}>
          {tablet
            ? <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 9, height: 9, background: "#000", borderRadius: "50%", border: "1px solid rgba(255,255,255,.15)", zIndex: 100 }} />
            : <div style={{ position: "absolute", top: 9, left: "50%", transform: "translateX(-50%)", width: 116, height: 24, background: "#000", borderRadius: 16, zIndex: 100, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)" }} />}
          <div style={{ height: "100%", position: "relative" }}>
            <Screens wide={tablet} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== MODULÁRNY ROUTER APPKY =====================
export function Screens({ wide, preview }) {
  const [modul, setModul] = useState("good");
  const [taby, setTaby] = useState(nacitajTaby);
  const [viac, setViac] = useState(false);
  const [galeria, setGaleria] = useState(null); // {fotky, index}

  useEffect(() => { if (!preview) ulozTaby(taby); }, [taby, preview]);

  const otvorGaleriu = (fotky, index = 0) => setGaleria({ fotky, index });

  // v náhľade (Admin → ukážka zariadenia) skry samotný Admin, nech sa appka nezacyklí
  const moduly = preview ? VSETKY_MODULY.filter((m) => m.id !== "admin") : VSETKY_MODULY;
  const prepni = (m) => { if (preview && m === "admin") return; setModul(m); };

  return (
    <GaleriaContext.Provider value={otvorGaleriu}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", isolation: "isolate", background: C.bg }}>
        {/* dýchajúce pozadie vnútri appky (z-index -1 = pod obsahom) */}
        <DychajucePozadie silne />

        {/* obsah aktívneho modulu — scroll vo vnútri, miesto pre plávajúci dock */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: 96 }}>
          {modul === "good" && <ModulGood wide={wide} otvorModul={prepni} />}
          {modul === "help" && <ModulHelp wide={wide} />}
          {modul === "charita" && <ModulCharita wide={wide} otvorModul={prepni} />}
          {modul === "profil" && <ModulProfil wide={wide} />}
          {modul === "vyzva" && <ModulAktivity wide={wide} />}
          {modul === "admin" && <ModulAdmin wide={wide} />}
          {["mapa", "top"].includes(modul) && <ModulPlaceholder id={modul} />}
        </div>

        {/* plávajúci glass dock — na šírke vycentrovaný a zúžený */}
        <TabBar taby={taby} aktivny={modul} wide={wide} onModul={prepni} onViac={() => setViac(true)} />

        {viac && (
          <ViacSheet taby={taby} setTaby={setTaby} aktivny={modul} moduly={moduly}
            onModul={(m) => { prepni(m); setViac(false); }}
            onClose={() => setViac(false)} />
        )}

        {/* fullscreen galéria fotiek so swipovaním */}
        {galeria && <Lightbox fotky={galeria.fotky} index={galeria.index} onClose={() => setGaleria(null)} />}
      </div>
    </GaleriaContext.Provider>
  );
}
