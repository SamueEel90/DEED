import { useState, useEffect } from "react";
import { C } from "./theme";
import { GaleriaContext, Lightbox, DychajucePozadie } from "./shared";
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
    tablet/desktop → viacstĺpcové feedy + appka v okne.
  - Spodné menu = plávajúci glass dock, user si ho poskladá cez
    "Viac → Upraviť menu" (ukladá sa do localStorage).
  - Všetok investorský "kokpit" (pitch, štatistiky, náhľad zariadení)
    je presunutý do modulu Admin (dock → Viac → Admin).
  - Mock dáta — žiadne reálne platby, KYC ani blockchain.
  ============================================================
*/

const FONT = "'Manrope', -apple-system, 'Segoe UI', Arial, sans-serif";

// aktuálna šírka okna → responzívne rozhodovanie o rozložení
export function useSirka() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return w;
}

// ===================== APP SHELL =====================
export default function App() {
  const sirka = useSirka();
  const wide = sirka >= 760;   // tablet + desktop → viacstĺpcové layouty
  const desktop = sirka >= 1024;

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden", isolation: "isolate",
      background: "radial-gradient(1300px 700px at 50% -12%, #121A2E 0%, #080B14 52%, #04060C 100%)",
      display: "flex", justifyContent: "center", alignItems: "stretch",
      fontFamily: FONT, color: C.text,
    }}>
      {/* dýchajúce aurora pozadie za celou plochou (na desktope „rám" okolo okna appky) */}
      <DychajucePozadie />

      <div style={{
        position: "relative", width: "100%",
        maxWidth: wide ? 1180 : 560,
        height: "100%", background: C.bg,
        boxShadow: desktop ? "0 0 0 1px rgba(255,255,255,.06), 0 30px 90px rgba(0,0,0,.55)" : "none",
      }}>
        <Screens wide={wide} />
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
