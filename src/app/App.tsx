import { useState, useEffect, useMemo, useRef, lazy, Suspense, type CSSProperties } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import { C } from "@/theme";
import { GaleriaContext, ScrollContext, ScrollElContext, ViacContext, StrankaAkcieContext, UpgradeContext, UpgradePanel, Lightbox, DychajucePozadie, MotivContext, PortalContext, LayoutContext, DeedToaster, FeedSkeleton, PullToRefresh } from "@/shared";
import type { StrankaAkcie } from "@/components/context";
import { TabBar, ViacSheet, PridatFAB, nacitajTaby, ulozTaby, VSETKY_MODULY } from "@/components/TabBar";
import { Sidebar } from "@/components/Sidebar";
import { useSession } from "@/lib/session";
import { resolveSession, subscribeAuth, zaistiSession } from "@/lib/auth";
import { USE_SUPABASE } from "@/lib/supabase";
import type { TypUctu } from "@/types";
import { useNotifikacieRealtime, repo } from "@/data";
import { precitajDeepLink, druhNaModul } from "@/lib/deeplink";
import { modulZCesty, pushModul, replaceModul, sledujModulZUrl, useVrstva } from "@/lib/urlnav";
import { toast, BadgeSheet, SplitLanding } from "@/shared";
import { IntroPruvodca } from "@/components/intro";
import { TipProvider } from "@/components/tooltip";
import { NoveHeslo } from "@/features/registracia/AuthPage";
import { subscribeRecovery } from "@/lib/auth";
import { PouzivatelProvider } from "@/lib/pouzivatel";
import { PersonalizaciaProvider } from "@/lib/personalizacia";
import { LokalitaProvider } from "@/lib/lokalita";
import { QueryProvider } from "@/app/QueryProvider";
import { Registracia } from "@/features/registracia/Registracia";
import { RetazPodstranka } from "@/features/retaz/RetazPodstranka";

// Code-splitting: každý modul = vlastný chunk, načíta sa až pri otvorení
// (initial load = shell + prvý modul namiesto jedného veľkého bundle).
const ModulGood = lazy(() => import("@/features/good/Good"));
const ModulHelp = lazy(() => import("@/features/help/Help"));
const ModulCharita = lazy(() => import("@/features/charita/Charita"));
const ModulNabozenstvo = lazy(() => import("@/features/nabozenstvo/Nabozenstvo"));
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
export type ModulId = "good" | "help" | "charita" | "nabozenstvo" | "profil" | "vyzva" | "mapa" | "top";

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
    // rAF-throttle: pri ťahaní okna max 1 setState na frame (bez neho re-renderuje
    // App + všetkých ~30 konzumentov useLayout() na KAŽDÝ resize event)
    let raf = 0;
    const onR = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setS({ w: window.innerWidth, h: window.innerHeight });
      });
    };
    window.addEventListener("resize", onR);
    return () => { window.removeEventListener("resize", onR); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return s;
}
export function useSirka(): number {
  return useOkno().w;
}

const pageBase: CSSProperties = {
  // výšku rieši trieda .deed-app (100dvh + vh fallback) — nie inset:0, aby spodok
  // sadol na VIDITEĽNÝ okraj (iOS: inset:0 siaha pod home indicator → sheet/CTA spadne mimo)
  position: "fixed", top: 0, left: 0, right: 0, overflow: "hidden", isolation: "isolate",
  background: "var(--page-grad)", transition: "background .35s ease",
  fontFamily: FONT, color: C.text,
};

// ===================== APP SHELL =====================
export default function App() {
  const { w } = useOkno();
  const wide = w >= 760; // tablet/desktop → viacstĺpcové feedy
  const desktop = w >= 1180; // plný „dashboard" — bočná navigácia + plná šírka
  // context hodnota sa mení LEN pri preklopení stupňa — resize medzi breakpointami
  // nere-renderuje ~30 konzumentov useLayout() (w v kontexte nikto nečítal)
  const layout = useMemo(() => ({ wide, desktop }), [wide, desktop]);

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
      // PWA: systémová lišta (theme-color) sleduje motív appky (--c-bg svetlý/tmavý)
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", svetly ? "#F1ECE1" : "#14110B");
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
              <TipProvider>
              <LayoutContext.Provider value={layout}>
                {/* pozadie sa montuje RAZ vnútri appky (Screens) — druhá kópia tu bola len duplicitná GPU záťaž */}
                <div className="deed-app" style={{ ...pageBase, display: "flex", justifyContent: "center", alignItems: "stretch" }}>
                  <div ref={setPortalEl} style={{ position: "relative", width: "100%", maxWidth: desktop ? undefined : wide ? 1180 : 560, height: "100%", background: C.bg }}>
                    <Screens wide={wide} desktop={desktop} />
                  </div>
                </div>
                <DeedToaster />
              </LayoutContext.Provider>
              </TipProvider>
            </PortalContext.Provider>
          </MotivContext.Provider>
        </MotionConfig>
      </LazyMotion>
    </QueryProvider>
  );
}

// ===================== MODULÁRNY ROUTER APPKY =====================
export function Screens({ wide, desktop }: { wide?: boolean; desktop?: boolean }) {
  const session = useSession();
  // deep-link zachyť SYNCHRÓNNE pri prvom renderi — URL normalizácia (nižšie) by ho prepísala
  const [dl] = useState(() => precitajDeepLink());
  // modul z URL (/m/{id}) → refresh/priamy link drží obrazovku; inak Domov
  const [modul, setModul] = useState<ModulId>(() => {
    const m = typeof window !== "undefined" ? modulZCesty(window.location.pathname) : null;
    return m && VSETKY_MODULY.some((x) => x.id === m) ? (m as ModulId) : "good";
  });
  const [taby, setTaby] = useState<string[]>(nacitajTaby);
  const [viac, setViac] = useState(false);
  const [galeria, setGaleria] = useState<{ fotky: string[]; index: number } | null>(null);
  const [walletReq, setWalletReq] = useState(0); // ☰ → Peňaženka: otvor peňaženku v Profile
  const [akcie, setAkcie] = useState<StrankaAkcie>({}); // kontextové akcie aktuálneho modulu (Pridať / Ukáž talent / Nástenka)
  const [upgradeOpen, setUpgradeOpen] = useState(false); // pasívny → „Staň sa aktívnym" panel
  const [aktivacia, setAktivacia] = useState(false); // overlay aktívnej registrácie (upgrade)
  const [intro, setIntro] = useState(false); // prvé spustenie — 3-kartový sprievodca
  const [akoFunguje, setAkoFunguje] = useState(false); // „Ako DEED funguje" z menu Viac
  const [obnovaHesla, setObnovaHesla] = useState(false); // PASSWORD_RECOVERY z emailového odkazu
  const scrollRef = useRef<HTMLDivElement>(null);
  // auth-boot: kým sa Supabase Auth ↔ app-session zladí, drž splash (žiadny flash zlej session)
  const [booting, setBooting] = useState<boolean>(USE_SUPABASE);
  const [resumeInfo, setResumeInfo] = useState<{ authId: string; typ?: TypUctu; stav?: string } | null>(null);
  const [dlHotovo, setDlHotovo] = useState(false); // deep-link už spracovaný?
  const [badgeSheet, setBadgeSheet] = useState<string | null>(null); // odznak z deep-linku (/badge)
  const [splitSheet, setSplitSheet] = useState<string | null>(null); // split QR z deep-linku (/split) → živá kópia príspevku
  const [chainSheet, setChainSheet] = useState<string | null>(null); // reťaz tvorcu z deep-linku (/chain) → verejná podstránka (§5.3)
  const [dlDetail, setDlDetail] = useState<{ modul: ModulId; ref: string } | null>(null); // deep-link → presný detail

  useEffect(() => { ulozTaby(taby); }, [taby]);
  useNotifikacieRealtime(); // Fáza E — live oznámenia (INSERT do notifikacia → obnova zoznamu)

  // URL ↔ modul: boot normalizácia (/ → /m/good) + popstate (Back/Forward prepína moduly).
  // Ak čaká deep-link, normalizáciu odloží deep-link effect (inak by slug prepísala).
  useEffect(() => {
    if (!dl) replaceModul(modul);
    return sledujModulZUrl((m) => {
      if (m && VSETKY_MODULY.some((x) => x.id === m)) setModul(m as ModulId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // overlaye Screens = vrstvy histórie (Back ich zatvára namiesto opustenia appky)
  useVrstva(viac, () => setViac(false));
  useVrstva(!!galeria, () => setGaleria(null));
  useVrstva(upgradeOpen, () => setUpgradeOpen(false));
  useVrstva(aktivacia, () => setAktivacia(false));
  useVrstva(!!badgeSheet, () => setBadgeSheet(null));
  useVrstva(!!splitSheet, () => setSplitSheet(null));
  useVrstva(!!chainSheet, () => setChainSheet(null));
  useVrstva(intro || akoFunguje, () => { setIntro(false); setAkoFunguje(false); });

  // prvé spustenie: po prihlásení/registrácii ukáž intro sprievodcu (raz)
  useEffect(() => {
    if (!session) return;
    try { if (!localStorage.getItem("deed.intro.v1")) setIntro(true); } catch { /* private mode */ }
  }, [session]);

  // obnova hesla: klik na odkaz z emailu → Supabase PASSWORD_RECOVERY → obrazovka nového hesla
  useEffect(() => subscribeRecovery(() => setObnovaHesla(true)), []);

  // Deep-link (Fáza 1): naskenovaný QR otvoril appku na /c|/@|/o|/r/... → resolvni slug
  // a skoč na správny modul. Spracuj až keď je session (inak počkaj na prihlásenie,
  // nech sa slug nestratí pred registráciou).
  useEffect(() => {
    if (dlHotovo || !session) return;
    if (!dl) { setDlHotovo(true); return; }
    let alive = true;
    repo.qr.resolve(dl.slug)
      .then((ciel) => {
        if (!alive) return;
        let cielModul: ModulId = modul;
        if (ciel) {
          if (ciel.objekt_druh === "badge") setBadgeSheet(ciel.objekt_ref);   // odznak → shift-binding sheet
          else if (ciel.objekt_druh === "split") setSplitSheet(ciel.objekt_ref); // split QR → živá kópia príspevku
          else if (ciel.objekt_druh === "chain") setChainSheet(ciel.objekt_ref); // reťaz tvorcu → verejná podstránka (§5.3)
          else {
            cielModul = druhNaModul(ciel.objekt_druh);
            setModul(cielModul);
            // skutok/žiadosť → otvor rovno detail položky (nie len modul)
            if (ciel.objekt_druh === "case") setDlDetail({ modul: cielModul, ref: ciel.objekt_ref });
          }
          toast("Otváram odkaz");
        }
        replaceModul(cielModul); // slug z URL preč, história normalizovaná na /m/{modul}
        setDlHotovo(true);
      })
      .catch(() => { if (alive) { replaceModul(modul); setDlHotovo(true); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlHotovo, session]);

  // §1 (Fáza 5) — pri štarte zladiť reálny Supabase Auth s localStorage app-session:
  //  · authed + ucet 'hotovo' → resolveSession setSession → appka
  //  · authed bez dokončeného účtu → resume onboarding
  //  · stale real session bez Supabase auth → vyčistí sa
  // Demo session sa nediera. Bez Supabase (USE_SUPABASE=false) sa celé preskočí.
  useEffect(() => {
    if (!USE_SUPABASE) { setBooting(false); return; }
    let alive = true;
    resolveSession()
      .then((r) => {
        if (!alive) return;
        setResumeInfo(r.kind === "resume" ? { authId: r.authId, typ: r.typ, stav: r.stav } : null);
        setBooting(false);
        // po reconciliation zaisti aspoň anon session pre osobné DB funkcie
        // (obľúbené/RSVP/správy/peňaženka) — no-op ak už reálna session je.
        void zaistiSession();
      })
      .catch(() => { if (alive) setBooting(false); });
    const unsub = subscribeAuth(() => { if (alive) setResumeInfo(null); }); // SIGNED_OUT → clearSession už emitol
    return () => { alive = false; unsub(); };
  }, []);

  // splash počas auth-boot reconciliation
  if (booting) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, background: "var(--page-grad)", border: `1px solid ${C.line}`, color: C.textSec, fontWeight: 800, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          D<span style={{ position: "absolute", top: 8, right: 11, fontSize: 11 }}>+</span>
        </span>
      </div>
    );
  }

  // obnova hesla z emailového odkazu — má prednosť (funguje aj bez app-session)
  if (obnovaHesla) {
    return <NoveHeslo onDone={() => setObnovaHesla(false)} />;
  }

  // §1 — bez prihlásenia zobraz registráciu (príp. resume rozrobeného onboardingu);
  // po dokončení flow zavolá setSession → useSession re-renderuje → appka.
  if (!session) {
    return <Registracia onHotovo={() => {}} resume={resumeInfo ?? undefined} />;
  }

  const otvorGaleriu = (fotky: string[], index = 0) => setGaleria({ fotky, index });
  // moduly cez ScrollContext odscrollujú appku hore (napr. pri otvorení detailu)
  const scrollHore = () => { if (scrollRef.current) scrollRef.current.scrollTop = 0; };

  const moduly = VSETKY_MODULY;
  // prepnutie modulu = nový záznam v histórii (Back/Forward prepína moduly, URL zdieľateľná)
  const prepni = (m: string) => { if (m !== modul) pushModul(m); setModul(m as ModulId); };
  const zavriIntro = () => {
    try { localStorage.setItem("deed.intro.v1", "1"); } catch { /* private mode */ }
    setIntro(false); setAkoFunguje(false);
  };

  return (
   <PouzivatelProvider session={session}>
    <PersonalizaciaProvider>
    <LokalitaProvider>
    <GaleriaContext.Provider value={otvorGaleriu}>
     <ScrollContext.Provider value={scrollHore}>
     <ScrollElContext.Provider value={scrollRef}>
      <ViacContext.Provider value={() => setViac(true)}>
      <UpgradeContext.Provider value={() => setUpgradeOpen(true)}>
      <StrankaAkcieContext.Provider value={setAkcie}>
      <div style={{ height: "100%", display: "flex", flexDirection: desktop ? "row" : "column", position: "relative", overflow: "hidden", isolation: "isolate", background: C.bg }}>
        {/* dýchajúce pozadie vnútri appky (z-index -1 = pod obsahom) */}
        <DychajucePozadie silne />

        {/* pull-to-refresh — potiahnutie nadol na vrchu feedu obnoví aktívne dopyty (mobil, dotyk) */}
        <PullToRefresh scrollRef={scrollRef} />

        {/* desktop: ľavá bočná navigácia (nahrádza spodný dok) */}
        {desktop && <Sidebar moduly={moduly} aktivny={modul} onModul={prepni} onViac={() => setViac(true)} onPenazenka={() => { prepni("profil"); setWalletReq((n) => n + 1); }} />}

        {/* obsah aktívneho modulu — scroll vo vnútri. Mobil/tablet: miesto pre dok + FAB (~168px); desktop: len odsadenie pre FAB.
            role="main" (nie <main>) — ref je zdieľaný ako HTMLDivElement (ScrollEl/PullToRefresh) */}
        <div role="main" ref={scrollRef} style={{ flex: 1, minWidth: 0, overflowY: "auto", minHeight: 0, paddingBottom: desktop ? 40 : 168 }}>
          <Suspense fallback={<FeedSkeleton count={4} />}>
            {modul === "good" && <ModulGood wide={wide} otvorModul={prepni} otvorId={dlDetail?.modul === "good" ? dlDetail.ref : undefined} onOtvorene={() => setDlDetail(null)} />}
            {modul === "help" && <ModulHelp wide={wide} />}
            {modul === "charita" && <ModulCharita wide={wide} otvorModul={prepni} />}
            {modul === "nabozenstvo" && <ModulNabozenstvo wide={wide} otvorModul={prepni} />}
            {modul === "profil" && <ModulProfil wide={wide} walletReq={walletReq} />}
            {modul === "vyzva" && <ModulAktivity wide={wide} />}
            {modul === "mapa" && <ModulMapa wide={wide} />}
            {modul === "top" && <ModulTop wide={wide} />}
          </Suspense>
        </div>

        {/* plávajúci glass dock — moduly (len mobil/tablet; desktop má bočný panel) */}
        {!desktop && <TabBar taby={taby} aktivny={modul} wide={wide} onModul={prepni} />}

        {/* plávajúce „+ Pridať" — primárna akcia stránky (ostáva aj na desktope, vpravo dole) */}
        {akcie.pridat && <PridatFAB akcia={akcie.pridat} wide={wide} desktop={desktop} />}

        {viac && (
          <ViacSheet taby={taby} setTaby={setTaby} aktivny={modul} moduly={moduly} strankaAkcie={akcie.extra} strankaFiltre={akcie.filtre}
            onModul={(m: string) => { prepni(m); setViac(false); }}
            onPenazenka={() => { prepni("profil"); setWalletReq((n) => n + 1); setViac(false); }}
            onAko={() => { setViac(false); setAkoFunguje(true); }}
            onClose={() => setViac(false)} />
        )}

        {/* intro sprievodca — prvé spustenie (raz) alebo „Ako DEED funguje" z menu */}
        {(intro || akoFunguje) && <IntroPruvodca onClose={zavriIntro} />}

        {/* fullscreen galéria fotiek so swipovaním */}
        {galeria && <Lightbox fotky={galeria.fotky} index={galeria.index} onClose={() => setGaleria(null)} />}

        {/* odznak (shift-binding) — otvorené po naskenovaní /badge/{slug} */}
        {badgeSheet && <BadgeSheet badgeId={badgeSheet} onClose={() => setBadgeSheet(null)} toast={toast} />}

        {/* split QR — živá „kópia príspevku" po naskenovaní /split/{slug} */}
        {splitSheet && <SplitLanding splitId={splitSheet} onClose={() => setSplitSheet(null)} toast={toast} />}

        {/* reťaz tvorcu — verejná podstránka (jedna aktívna zbierka) po naskenovaní /chain/{slug} */}
        {chainSheet && <RetazPodstranka onClose={() => setChainSheet(null)} toast={toast} />}

        {/* pasívny → upgrade panel „Staň sa aktívnym" */}
        {upgradeOpen && (
          <UpgradePanel
            onClose={() => setUpgradeOpen(false)}
            onAktivovat={() => { setUpgradeOpen(false); setAktivacia(true); }}
          />
        )}

        {/* overlay aktívnej registrácie (po kliku „Stať sa aktívnym") */}
        {aktivacia && (
          <div style={{ position: "absolute", inset: 0, zIndex: 80, background: C.bg }}>
            <Registracia start="aktivny" onHotovo={() => setAktivacia(false)} />
          </div>
        )}
      </div>
      </StrankaAkcieContext.Provider>
      </UpgradeContext.Provider>
      </ViacContext.Provider>
     </ScrollElContext.Provider>
     </ScrollContext.Provider>
    </GaleriaContext.Provider>
    </LokalitaProvider>
    </PersonalizaciaProvider>
   </PouzivatelProvider>
  );
}
