// ============================================================
// DEED · OBNOVA FEEDOV — pull-to-refresh + infinite scroll (dávkovanie)
// ------------------------------------------------------------
// PullToRefresh — potiahnutie nadol na vrchu scroll kontajnera (dotyk)
//   → refetch aktívnych react-query dopytov. Indikátor rastie s ťahom,
//   obsah sa nehýbe (bezpečné pre sticky hlavičky).
// useDavkovanie — IntersectionObserver sentinel: renderuj prvých N kariet,
//   ďalšia dávka sa pridá až keď sa user приblíži ku koncu (IG-style feed).
// ============================================================
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { C, RADIUS } from "@/theme";

const PRAH = 74; // px ťahu, po ktorom pustenie spustí obnovu

export function PullToRefresh({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const qc = useQueryClient();
  const [tah, setTah] = useState(0);          // aktuálny ťah v px (0 = skryté)
  const [obnovujem, setObnovujem] = useState(false);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const zaciatok = (e: TouchEvent) => {
      // ťah sa počíta len keď je scroll ÚPLNE hore (inak normálne scrolluješ)
      start.current = el.scrollTop <= 0 ? e.touches[0].clientY : null;
    };
    const pohyb = (e: TouchEvent) => {
      if (start.current == null) return;
      const d = e.touches[0].clientY - start.current;
      if (d <= 0) { setTah(0); return; }
      // odpor — ťah rastie pomalšie než prst (prirodzený pocit)
      setTah(Math.min(120, d * 0.45));
    };
    const koniec = () => {
      if (start.current == null) return;
      start.current = null;
      setTah((t) => {
        if (t >= PRAH) {
          setObnovujem(true);
          qc.refetchQueries({ type: "active" }).finally(() => { setObnovujem(false); });
          return PRAH; // drž indikátor počas obnovy
        }
        return 0;
      });
    };

    el.addEventListener("touchstart", zaciatok, { passive: true });
    el.addEventListener("touchmove", pohyb, { passive: true });
    el.addEventListener("touchend", koniec);
    return () => {
      el.removeEventListener("touchstart", zaciatok);
      el.removeEventListener("touchmove", pohyb);
      el.removeEventListener("touchend", koniec);
    };
  }, [scrollRef, qc]);

  useEffect(() => { if (!obnovujem) setTah(0); }, [obnovujem]);

  const videt = tah > 6 || obnovujem;
  if (!videt) return null;
  const pct = Math.min(1, tah / PRAH);
  return (
    <div aria-live="polite" style={{ position: "absolute", top: 10 + tah * 0.3, left: 0, right: 0, display: "flex", justifyContent: "center", zIndex: 60, pointerEvents: "none" }}>
      <span style={{
        width: 34, height: 34, borderRadius: RADIUS.round, display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(var(--panel-rgb),.9)", border: `1px solid ${C.line}`, boxShadow: "0 6px 18px rgba(0,0,0,.25)",
        transform: `rotate(${pct * 270}deg) scale(${.6 + pct * .4})`, transition: obnovujem ? "none" : "transform .05s linear",
        animation: obnovujem ? "tocenie 0.9s linear infinite" : "none",
      }}>
        <span style={{ width: 18, height: 18, borderRadius: RADIUS.round, border: "2.5px solid transparent", borderTopColor: "transparent", background: `conic-gradient(from 0deg, transparent ${100 - pct * 100}%, ${pct >= 1 || obnovujem ? "var(--a-green)" : "var(--c-textTer)"} 0) border-box`, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", display: "block" }} />
      </span>
    </div>
  );
}

// ---- INFINITE SCROLL — dávkovanie zoznamu kariet ----
// Vráti orezaný zoznam + sentinel; keď sentinel vojde do viewportu,
// pridá sa ďalšia dávka. `key` reset (napr. zmena filtra) → začne odznova.
export function useDavkovanie<T>(polozky: T[], davka = 12): { zobraz: T[]; sentinel: ReactNode } {
  const [limit, setLimit] = useState(davka);
  const ref = useRef<HTMLDivElement>(null);
  const hotovo = limit >= polozky.length;

  // menej položiek než limit (zmena filtra) → zmrsti limit späť na dávku
  useEffect(() => { if (polozky.length <= davka && limit !== davka) setLimit(davka); }, [polozky.length, davka]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hotovo) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((zaznamy) => {
      if (zaznamy[0].isIntersecting) setLimit((l) => l + davka);
    }, { rootMargin: "600px" }); // načítaj v predstihu — user nikdy nevidí "koniec"
    io.observe(el);
    return () => io.disconnect();
  }, [hotovo, davka, limit]);

  return {
    zobraz: hotovo ? polozky : polozky.slice(0, limit),
    sentinel: hotovo ? null : <div ref={ref} aria-hidden style={{ height: 1 }} />,
  };
}
