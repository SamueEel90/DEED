// ============================================================
// POČÍTADLO DO STREAMU — stránka /overlay/:splitId
//
// Tu sa berú dáta a drží sa posledný stav; samotný vzhľad kreslí <Overlay>.
// Rozdelené zámerne: vzhľad sa ladí často, spôsob získavania dát takmer nikdy.
//
// Pravidlá, ktoré sa nesmú porušiť:
//   · pri výpadku ostáva POSLEDNÝ STAV — v strede streamu nesmie svietiť
//     chybová hláška ani prázdna obrazovka; jediné, čo sa zmení, je bodka
//     „naživo", ktorá po 30 sekundách zošedne (rieši si to <Overlay> sám)
//   · len na čítanie, verejné, bez prihlásenia
//
// Parametre: ?tema=svetla · ?demo=1 (kŕmi sa samo) · ?paleta=aurora
// ============================================================
import { useEffect, useState } from "react";
import Overlay from "./Overlay";
import { nacitajStav, type StavOverlay } from "./zdroj";

const OBNOVA_MS = 10_000;   // záloha, kým nie je realtime
const DEMO_MS = 5_000;      // ako často si demo vymyslí dar

export function OverlayStranka({ splitId }: { splitId: string }) {
  const params = new URLSearchParams(window.location.search);
  const jeDemo = params.get("demo") === "1";
  const tema = params.get("tema") === "svetla" ? "svetla" : "tmava";
  // paleta je zatiaľ otvorené rozhodnutie — dá sa prepnúť v odkaze a porovnať
  const paleta = params.get("paleta") === "aurora" ? "aurora" : "znacka";
  // na výšku = zvislý stĺpec pri okraji obrazovky (OBS 420 × 640)
  const orientacia = params.get("orientacia") === "vyska" ? "vyska" : "sirka";
  const strana = params.get("strana") === "vlavo" ? "vlavo" : "vpravo";
  const [stav, setStav] = useState<StavOverlay | null>(null);

  useEffect(() => {
    let zive = true;
    const tik = async () => {
      const novy = await nacitajStav(splitId, jeDemo);
      // nič neprišlo → držíme, čo máme; obrazovka sa nesmie vyprázdniť
      if (zive && novy) setStav(novy);
    };
    void tik();
    const id = setInterval(tik, jeDemo ? DEMO_MS : OBNOVA_MS);
    // zmena snímky v inom tabe toho istého prehliadača (náhľad v appke)
    const naStorage = () => { void tik(); };
    window.addEventListener("storage", naStorage);
    return () => { zive = false; clearInterval(id); window.removeEventListener("storage", naStorage); };
  }, [splitId, jeDemo]);

  // Kým neprišlo nič, nekreslíme chybu — len tichý rám, nech je vidieť,
  // že zdroj je v OBS správne vložený a čaká na prvý dar.
  if (!stav) return <Cakanie jeDemo={jeDemo} svetla={tema === "svetla"} />;

  return <Overlay stav={stav} splitId={splitId} tema={tema} paleta={paleta} orientacia={orientacia} strana={strana} />;
}

function Cakanie({ jeDemo, svetla }: { jeDemo: boolean; svetla: boolean }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, margin: "0 8px",
      padding: "18px 22px", borderRadius: 20, opacity: .55,
      background: svetla ? "rgba(255,255,255,.72)" : "rgba(8,10,16,.62)",
      border: `1px solid ${svetla ? "rgba(0,0,0,.10)" : "rgba(255,255,255,.14)"}`,
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      color: svetla ? "#10131a" : "#fff",
      textShadow: svetla ? "0 1px 2px rgba(255,255,255,.7)" : "0 2px 6px rgba(0,0,0,.85)",
      fontFamily: "'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif" }}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>DEED · počítadlo zbierky</div>
      <div style={{ fontSize: 13, marginTop: 2 }}>
        čaká sa na prvé dáta{jeDemo ? "" : " — na skúšku pridaj do odkazu ?demo=1"}
      </div>
    </div>
  );
}

/** /overlay/<splitId> → splitId (alebo null, ak sme inde) */
export function splitZCesty(cesta: string): string | null {
  const m = cesta.match(/^\/overlay\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
