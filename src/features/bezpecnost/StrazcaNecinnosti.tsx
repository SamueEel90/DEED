// ============================================================
// OPRAVY 466 doplnok · strážca nečinnosti (Martin 21. 10.): na KAŽDOM počítači (nie v mobile), bez ohľadu na spôsob prihlásenia.
// 15 minút bez pohybu myši, klávesnice či posunu (vo všetkých kartách appky naraz) → okno „Ste tu ešte?“ s odpočtom 60 s.
// Pokračovať = ostávate prihlásený. Bez odpovede appka odhlási a na prihlásení povie prečo.
// Rozpísané sa nestratí: koncepty sa ukladajú priebežne (koncept.ts a uloženia v Správe ~0,5 s po písaní),
// po 15 minútach nečinnosti nič neuložené nečaká a odhlásenie koncepty nemaže.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "@/lib/auth";
import { nazovZariadenia } from "@/lib/zariadenia";

export const NECINNOST_MIN = 15;
export const ODPOCET_S = 60;
const KLUC = "deed.aktivita";
const DOVOD = "deed.odhlasenyNecinnost";
const posledna = () => { try { return Number(localStorage.getItem(KLUC)) || 0; } catch { return 0; } };
const zapis = (t: number) => { try { localStorage.setItem(KLUC, String(t)); } catch { /* LS */ } };
/** prihlasovacia obrazovka: bol človek odhlásený pre nečinnosť? (raz) */
export function odhlasenyPreNecinnost(): boolean {
  try { const v = sessionStorage.getItem(DOVOD) === "1"; sessionStorage.removeItem(DOVOD); return v; } catch { return false; }
}

export function StrazcaNecinnosti() {
  const pc = nazovZariadenia().typ === "pocitac";
  const [okno, setOkno] = useState<number | null>(null); // koniec odpočtu (ms)
  const [teraz, setTeraz] = useState(() => Date.now());
  const moja = useRef(Date.now());
  const oknoRef = useRef<number | null>(null);
  useEffect(() => { oknoRef.current = okno; }, [okno]);
  useEffect(() => {
    if (!pc) return;
    moja.current = Date.now(); zapis(moja.current);
    let zapisane = moja.current;
    const pohyb = () => { if (oknoRef.current !== null) return; /* kým je okno, treba ťuknúť Pokračovať */ const t = Date.now(); moja.current = t; if (t - zapisane > 5000) { zapisane = t; zapis(t); } };
    const udalosti = ["pointermove", "pointerdown", "keydown", "wheel", "scroll", "touchstart"] as const;
    udalosti.forEach((u) => window.addEventListener(u, pohyb, { passive: true, capture: true }));
    const t = window.setInterval(() => setTeraz(Date.now()), 1000);
    return () => { udalosti.forEach((u) => window.removeEventListener(u, pohyb, { capture: true })); window.clearInterval(t); };
  }, [pc]);
  // nečinnosť = od posledného pohybu v ktorejkoľvek karte appky
  const aktivita = Math.max(moja.current, posledna());
  useEffect(() => {
    if (!pc) return;
    if (okno === null && teraz - aktivita >= NECINNOST_MIN * 60000) setOkno(Date.now() + ODPOCET_S * 1000);
    else if (okno !== null && posledna() > okno - ODPOCET_S * 1000) setOkno(null); // v inej karte ťukli Pokračovať
    else if (okno !== null && teraz >= okno) {
      setOkno(null);
      try { sessionStorage.setItem(DOVOD, "1"); } catch { /* SS */ }
      void signOut();
    }
  }, [teraz]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pc || okno === null) return null;
  const zostava = Math.max(0, Math.ceil((okno - teraz) / 1000));
  const pokracuj = () => { const t = Date.now(); moja.current = t; zapis(t); setOkno(null); };
  return createPortal(
    <div className="sprava-charity" role="alertdialog" aria-modal="true" aria-label="Ste tu ešte?"
      style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(14,12,8,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(100%, 440px)", borderRadius: 22, background: "var(--bg)", color: "var(--ink)", padding: 24, display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <b style={{ fontSize: 22 }}>Ste tu ešte?</b>
        <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>
          {NECINNOST_MIN} minút sa tu nič nedialo. Z bezpečnosti vás o <b style={{ color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{zostava} s</b> odhlásime. Rozpísané ostane uložené.</span>
        <button type="button" autoFocus onClick={pokracuj} style={{ minHeight: 52, border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Pokračovať</button>
      </div>
    </div>, document.body);
}
