// ============================================================
// DEED · URL navigácia — ľahká synchronizácia bez react-routera.
//
// Dve úrovne:
//  1) MODUL — /m/{id}. Prepnutie modulu pushne históriu, popstate/refresh
//     modul obnoví. Browser Back/Forward tak prepína moduly.
//  2) VRSTVA — detail/overlay (sheet, galéria, pod-obrazovka modulu).
//     Otvorenie pushne „sentinel" záznam do histórie; Back zatvorí
//     NAJVRCHNEJŠIU otvorenú vrstvu (Android vzor) namiesto opustenia appky.
//     Zatvorenie cez UI (✕/šípka/swipe) sentinel z histórie potichu odstráni.
//
// Jeden globálny popstate listener koordinuje obe úrovne — vrstvy majú
// prednosť pred prepnutím modulu.
// ============================================================
import { useEffect, useRef } from "react";

type Vrstva = { id: number; zatvor: () => void };

const vrstvy: Vrstva[] = [];
let sentinelSeq = 0;
let ignorujPop = 0; // tiché history.back() z UI-zatvorenia nesmie spustiť handler
let modulListener: ((modul: string | null) => void) | null = null;
let listenerInit = false;

function initListener() {
  if (listenerInit || typeof window === "undefined") return;
  listenerInit = true;
  window.addEventListener("popstate", () => {
    if (ignorujPop > 0) { ignorujPop--; return; }
    const top = vrstvy.pop();
    if (top) { top.zatvor(); return; } // Back zatvára vrstvu, modul nemení
    modulListener?.(modulZCesty(window.location.pathname));
  });
}

/** /m/{id}[/...] → id modulu (alebo null). */
export function modulZCesty(cesta: string): string | null {
  const m = cesta.match(/^\/m\/([a-z]+)/);
  return m ? m[1] : null;
}

/** Jediný odberateľ zmien modulu z histórie (App Screens). Vracia unsubscribe. */
export function sledujModulZUrl(fn: (modul: string | null) => void): () => void {
  initListener();
  modulListener = fn;
  return () => { if (modulListener === fn) modulListener = null; };
}

export function pushModul(id: string): void {
  try { window.history.pushState({ deedModul: id }, "", `/m/${id}`); } catch { /* sandbox */ }
}

/** Normalizácia bez nového záznamu (boot, deep-link po spracovaní). */
export function replaceModul(id: string): void {
  try { window.history.replaceState({ deedModul: id }, "", `/m/${id}`); } catch { /* sandbox */ }
}

/**
 * Vrstva pre históriu: kým je `otvorene`, Back ju zatvorí (zavolá `zatvor`).
 * `sufix` je kozmetický doplnok URL (/m/good/detail) — refresh na ňom obnoví
 * len modul (pod-obrazovka sa nereštauruje, to je vedomé v1 zjednodušenie).
 *
 * Pozn.: pri prepnutí modulu ponad otvorenú vrstvu ostane v histórii
 * osirelý sentinel (= jeden Back navyše) — bezpečné, bez rozbitia poradia.
 */
export function useVrstva(otvorene: boolean, zatvor: () => void, sufix?: string): void {
  const zatvorRef = useRef(zatvor);
  zatvorRef.current = zatvor;
  useEffect(() => {
    if (!otvorene || typeof window === "undefined") return;
    initListener();
    const id = ++sentinelSeq;
    vrstvy.push({ id, zatvor: () => zatvorRef.current() });
    const zaklad = window.location.pathname.match(/^\/m\/[a-z]+/)?.[0];
    try {
      window.history.pushState({ deedVrstva: id }, "", sufix && zaklad ? `${zaklad}/${sufix}` : undefined);
    } catch { /* sandbox */ }
    return () => {
      const i = vrstvy.findIndex((v) => v.id === id);
      if (i < 0) return; // zatvorené Backom — handler už sentinel spracoval
      vrstvy.splice(i, 1);
      // sentinel odstráň len ak sme stále navrchu histórie (inak ho medzitým
      // prekryl push modulu — back() by zrušil ČERSTVÚ navigáciu)
      const st = window.history.state as { deedVrstva?: number } | null;
      if (st?.deedVrstva === id) {
        ignorujPop++;
        try { window.history.back(); } catch { ignorujPop--; }
      }
    };
  }, [otvorene]); // eslint-disable-line react-hooks/exhaustive-deps
}
