import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";

// ============================================================
// GALÉRIA — kontext: ktorýkoľvek modul otvorí fullscreen prezeranie
// ============================================================
export const GaleriaContext = createContext<(fotky: string[], index?: number) => void>(() => {});
export const useGaleria = () => useContext(GaleriaContext);

// ============================================================
// SCROLL — kontext: ktorýkoľvek modul vie odscrollovať appku hore
// (scroll-kontajner žije v App; pri prepnutí obrazovky → naň zavoláme scrollHore)
// ============================================================
export const ScrollContext = createContext<() => void>(() => {});
export const useScrollHore = () => useContext(ScrollContext);

// ref na samotný scroll ELEMENT (App ho napĺňa) — pre virtualizáciu feedov
// (VirtualList potrebuje scroll kontajner) a pull-to-refresh.
export const ScrollElContext = createContext<RefObject<HTMLDivElement | null> | null>(null);
export const useScrollEl = () => useContext(ScrollElContext);

// ============================================================
// PAMÄŤ SCROLLU — drop-in náhrada za `useEffect(() => scrollHore(), [screen])`.
// Zapamätá si scroll pozíciu KAŽDEJ obrazovky (feed / detail / …) a pri návrate
// ju obnoví — takže „Späť" z príspevku vráti používateľa presne tam, kde skončil,
// nie hore. Nová obrazovka bez uloženej pozície = hore (0), ako doteraz.
//   · jeden trvalý scroll listener ukladá pozíciu pod PRÁVE aktívnu obrazovku (cez ref,
//     aby closure nezostarol a neprepísal cudziu obrazovku),
//   · pri zmene obrazovky obnoví cieľ cez rAF-retry (~600 ms), lebo ScreenSwitch
//     má `mode="wait"` crossfade → obsah sa mountne až po dohraní exitu (inak by sa
//     scrollTop orezal na 0, kým je kontajner ešte prázdny/nízky).
export function useScrollPamat(screen: string) {
  const scrollEl = useScrollEl();
  const pozicie = useRef<Record<string, number>>({});
  const screenRef = useRef(screen);
  const predch = useRef<string | null>(null);
  screenRef.current = screen; // vždy aktuálna obrazovka pre listener nižšie

  // jeden trvalý listener — priebežne ukladá scrollTop pod aktuálnu obrazovku
  useEffect(() => {
    const el = scrollEl?.current;
    if (!el) return;
    const onScroll = () => { pozicie.current[screenRef.current] = el.scrollTop; };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollEl]);

  // pri zmene obrazovky obnov uloženú pozíciu (default 0 = hore)
  useEffect(() => {
    const el = scrollEl?.current;
    if (!el || predch.current === screen) return;
    predch.current = screen;
    const ciel = pozicie.current[screen] ?? 0;
    let raf = 0;
    const start = performance.now();
    const uprav = () => {
      el.scrollTop = ciel;
      // obsah novej obrazovky sa ešte dopĺňa (crossfade/mount) → skúšaj, kým „nesadne"
      if (Math.abs(el.scrollTop - ciel) > 2 && performance.now() - start < 600) raf = requestAnimationFrame(uprav);
    };
    uprav();
    return () => cancelAnimationFrame(raf);
  }, [screen, scrollEl]);
}

// ============================================================
// MENU „VIAC" — kontext: hamburger (☰) vľavo hore otvára sheet modulov
// (predtým bolo „Viac" tlačidlo v spodnom doku)
// ============================================================
export const ViacContext = createContext<() => void>(() => {});
export const useViac = () => useContext(ViacContext);

// ---- MOTÍV (svetlý / tmavý režim) ----
export const MotivContext = createContext<{ svetly: boolean; prepni: () => void }>({ svetly: false, prepni: () => {} });
export const useMotiv = () => useContext(MotivContext);

// ============================================================
// LAYOUT — responzívne stupne (jeden resize listener v App):
//   · wide    ≥ 760  → tablet/desktop (viacstĺpcové feedy, 16:9 médiá)
//   · desktop ≥ 1180 → plný „dashboard" (bočná navigácia, plná šírka,
//                       bočné panely, stĺpce na doménu)
// Moduly čítajú cez useLayout() namiesto pretláčania ďalšieho propu.
// Hodnota sa mení LEN pri preklopení stupňa (nie pri každom px resize) —
// surové rozmery okna (w/h) čítaj cez useOkno()/useSirka() v App.tsx.
// ============================================================
export interface LayoutInfo { wide: boolean; desktop: boolean; }
export const LayoutContext = createContext<LayoutInfo>({ wide: true, desktop: false });
export const useLayout = () => useContext(LayoutContext);

// ============================================================
// PORTAL — vycentrovaný stĺpec appky (maxWidth 1180/560). Sheety (Vaul)
// musia portálovať SEM, nie do document.body — inak na desktope „ujdú"
// cez celý viewport namiesto telefónneho rámca. App naplní ref.
// ============================================================
export const PortalContext = createContext<HTMLElement | null>(null);
export const usePortalEl = () => useContext(PortalContext);

// ============================================================
// UPGRADE (pasívny → aktívny) — kontext: ktorýkoľvek create vstup vie vyžiadať
// upgrade panel „Staň sa aktívnym". Hodnotu napĺňa App shell (Screens).
// Pasívny divák-darca smie prezerať + prispievať, ale NIE vytvárať (mozeTvorit=false).
// ============================================================
export const UpgradeContext = createContext<() => void>(() => {});
export const useUpgrade = () => useContext(UpgradeContext);

// ============================================================
// AKCIE STRÁNKY — kontextové akcie aktuálneho modulu (Pridať, Ukáž talent, Nástenka…)
// Modul si ich zaregistruje hookom; App shell ich vykreslí mimo obsahu:
//   · `pridat` = plávajúce „+ Pridať" tlačidlo (sticky, nad spodným dokom)
//   · `extra`  = sekcia „Na tejto stránke" v menu (☰)
// Vďaka tomu sú špeciálne možnosti dole/v menu a vrch stránky ostáva čistý (§14).
// ============================================================
export type StrankaAkcia = { id: string; label: string; popis?: string; ikona?: ReactNode; onClick: () => void };
// `filtre` = voliteľné JSX filtre stránky vykreslené v ☰ menu (sekcia „Na tejto stránke").
export type StrankaAkcie = { pridat?: StrankaAkcia; extra?: StrankaAkcia[]; filtre?: ReactNode };
export const StrankaAkcieContext = createContext<(a: StrankaAkcie) => void>(() => {});
/** Modul zaregistruje svoje kontextové akcie (a pri odchode ich vyčistí). Deps drž stabilné (zvyčajne []). */
export function useStrankaAkcie(builder: () => StrankaAkcie, deps: unknown[] = []) {
  const set = useContext(StrankaAkcieContext);
  useEffect(() => {
    set(builder());
    return () => set({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
