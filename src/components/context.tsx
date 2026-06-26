import { createContext, useContext } from "react";

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
