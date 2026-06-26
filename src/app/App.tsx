import { useState, useEffect, useRef, lazy, Suspense, type CSSProperties } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { C } from "@/theme";
import { GaleriaContext, ScrollContext, ViacContext, StrankaAkcieContext, Lightbox, DychajucePozadie, MotivContext, PortalContext, DeedToaster, FeedSkeleton } from "@/shared";
import type { StrankaAkcie } from "@/components/context";
import { TabBar, ViacSheet, PridatFAB, nacitajTaby, ulozTaby, VSETKY_MODULY } from "@/components/TabBar";
import { useSession } from "@/lib/session";
import { PouzivatelProvider } from "@/lib/pouzivatel";
import { QueryProvider } from "@/app/QueryProvider";
import { Registracia } from "@/features/registracia/Registracia";

// Code-splitting: každý modul = vlastný chunk, načíta sa až pri otvorení
// (initial load = shell + prvý modul namiesto jedného veľkého bundle).
const ModulGood = lazy(() => import("@/features/good/Good"));
const ModulHelp = lazy(() => import("@/features/help/Help"));
const ModulCharita = lazy(() => import("@/features/charita/Charita"));
const ModulProfil = lazy(() => import("@/features/profil/Profil"));
const ModulAktivity = lazy(() => import("@/features/aktivity/Aktivity"));
const ModulMapa = lazy(() => import("@/features/mapa/Mapa"));
const ModulTop = lazy(() => import("@/features/top/Top"));

/*
  ============================================================
  DEED Aura — reálna aplikácia (responzívna na všetkých zariadeniach)
  ============================================================
  - Appka vypĺňa celú obrazovku a prispôsobuje sa: mobil → 1 stĺpec,
    tablet/desktop → viacstĺpcové feedy (centrovaný stĺpec do ~1180 px).
  - Spodné menu = plávajúci glass dock, user si ho poskladá cez
    "Viac → Upraviť menu" (ukladá sa do localStorage).
  ============================================================
*/

const FONT = "'Plus Jakarta Sans', -apple-system, 'Segoe UI', Arial, sans-serif";

/** ID modulov, ktoré appka routuje. */
export type ModulId = "good" | "help" | "charita" | "profil" | "vyzva" | "mapa" | "top";

interface RozmeryOkna {
  w: number;
  h: number;
}

// aktuálne rozmery okna → responzívne rozhodovanie o rozložení
export function useOkno(): RozmeryOkna {
  const [s, setS] = useState<RozmeryOkna>(() => ({
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
export function useSirka(): number {
  return useOkno().w;
}

const pageBase: CSSProperties = {
  position: "fixed", inset: 0, overflow: "hidden", isolation: "isolate",
  background: "var(--page-grad)", transition: "background .35s ease",
  fontFamily: FONT, color: C.text,
};

// ===================== APP SHELL =====================
export default function App() {
  const { w } = useOkno();
  const wide = w >= 760; // tablet/desktop → viacstĺpcové feedy

  // portal-host = vycentrovaný stĺpec appky (pre prípadné portály v stĺpci)
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  // motív — SVETLÝ je primárny (default). Tmavý = trieda .dark na <html>.
  // :root je svetlý → prvé vykreslenie je svetlé bez dark-flashu.
  const [svetly, setSvetly] = useState<boolean>(() => {
    try { return localStorage.getItem("deed.motiv") !== "tmavy"; } catch { return true; }
  });
  useEffect(() => {
    try {
      document.documentElement.classList.toggle("dark", !svetly);
      localStorage.setItem("deed.motiv", svetly ? "svetly" : "tmavy");
    } catch { /* private mode */ }
  }, [svetly]);
  const motiv = { svetly, prepni: () => setSvetly((s) => !s) };

  // appka na celú obrazovku — na šírke centrovaný stĺpec do 1180 px
  return (
    <QueryProvider>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <MotivContext.Provider value={motiv}>
            <PortalContext.Provider value={portalEl}>
              <div style={{ ...pageBase, display: "flex", justifyContent: "center", alignItems: "stretch" }}>
                <DychajucePozadie />
                <div ref={setPortalEl} style={{ position: "relative", width: "100%", maxWidth: wide ? 1180 : 560, height: "100%", background: C.bg }}>
                  <Screens wide={wide} />
                </div>
              </div>
              <DeedToaster />
            </PortalContext.Provider>
          </MotivContext.Provider>
        </MotionConfig>
      </LazyMotion>
    </QueryProvider>
  );
}

// ===================== MODULÁRNY ROUTER APPKY =====================
export function Screens({ wide }: { wide?: boolean }) {
  const session = useSession();
  const [modul, setModul] = useState<ModulId>("good");
  const [taby, setTaby] = useState<string[]>(nacitajTaby);
  const [viac, setViac] = useState(false);
  const [galeria, setGaleria] = useState<{ fotky: string[]; index: number } | null>(null);
  const [walletReq, setWalletReq] = useState(0); // ☰ → Peňaženka: otvor peňaženku v Profile
  const [akcie, setAkcie] = useState<StrankaAkcie>({}); // kontextové akcie aktuálneho modulu (Pridať / Ukáž talent / Nástenka)
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ulozTaby(taby); }, [taby]);

  // §1 — bez prihlásenia zobraz registráciu;
  // po dokončení flow zavolá setSession → useSession re-renderuje → appka.
  if (!session) {
    return <Registracia onHotovo={() => {}} />;
  }

  const otvorGaleriu = (fotky: string[], index = 0) => setGaleria({ fotky, index });
  // moduly cez ScrollContext odscrollujú appku hore (napr. pri otvorení detailu)
  const scrollHore = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const moduly = VSETKY_MODULY;
  const prepni = (m: string) => setModul(m as ModulId);

  return (
   <PouzivatelProvider session={session}>
    <GaleriaContext.Provider value={otvorGaleriu}>
     <ScrollContext.Provider value={scrollHore}>
      <ViacContext.Provider value={() => setViac(true)}>
      <StrankaAkcieContext.Provider value={setAkcie}>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", isolation: "isolate", background: C.bg }}>
        {/* dýchajúce pozadie vnútri appky (z-index -1 = pod obsahom) */}
        <DychajucePozadie silne />

        {/* obsah aktívneho modulu — scroll vo vnútri, miesto pre plávajúci dock + „+ Pridať" FAB (vrch ~130px) */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, paddingBottom: 140 }}>
          <Suspense fallback={<FeedSkeleton count={4} />}>
            {modul === "good" && <ModulGood wide={wide} otvorModul={prepni} />}
            {modul === "help" && <ModulHelp wide={wide} />}
            {modul === "charita" && <ModulCharita wide={wide} otvorModul={prepni} />}
            {modul === "profil" && <ModulProfil wide={wide} walletReq={walletReq} />}
            {modul === "vyzva" && <ModulAktivity wide={wide} />}
            {modul === "mapa" && <ModulMapa wide={wide} />}
            {modul === "top" && <ModulTop wide={wide} />}
          </Suspense>
        </div>

        {/* plávajúci glass dock — na šírke vycentrovaný a zúžený */}
        <TabBar taby={taby} aktivny={modul} wide={wide} onModul={prepni} />

        {/* plávajúce „+ Pridať" — primárna akcia stránky, sticky nad dokom */}
        {akcie.pridat && <PridatFAB akcia={akcie.pridat} wide={wide} />}

        {viac && (
          <ViacSheet taby={taby} setTaby={setTaby} aktivny={modul} moduly={moduly} strankaAkcie={akcie.extra} strankaFiltre={akcie.filtre}
            onModul={(m: string) => { prepni(m); setViac(false); }}
            onPenazenka={() => { prepni("profil"); setWalletReq((n) => n + 1); setViac(false); }}
            onClose={() => setViac(false)} />
        )}

        {/* fullscreen galéria fotiek so swipovaním */}
        {galeria && <Lightbox fotky={galeria.fotky} index={galeria.index} onClose={() => setGaleria(null)} />}
      </div>
      </StrankaAkcieContext.Provider>
      </ViacContext.Provider>
     </ScrollContext.Provider>
    </GaleriaContext.Provider>
   </PouzivatelProvider>
  );
}
