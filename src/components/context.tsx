import { createContext, useContext, useEffect, type ReactNode } from "react";

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
