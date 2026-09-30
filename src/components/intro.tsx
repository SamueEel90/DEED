// ============================================================
// DEED · Úvod (karta 17) — pri prvom spustení (raz, flag deed.intro.v1)
// + „Ako DEED+ funguje" z menu Viac (kedykoľvek).
// Obsah je hotový kód dizajnéra <Uvitanie> (plocha 390 × 844) — tu je len obal:
// väčší displej → plocha v strede, menší → celá plocha zmenšená cez transform.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { Uvitanie } from "@/features/uvod/Uvitanie";
import "@/styles/platba.css";

const W = 390, H = 844;

export function IntroPruvodca({ onClose }: { onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mierka, setMierka] = useState(1);

  // dialóg: focus dnu + restore po zatvorení; Escape zatvára
  useEffect(() => {
    const predtym = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); predtym?.focus?.(); };
  }, [onClose]);

  // plocha sa len zmenšuje (nikdy nezväčšuje) — vnútorné čísla ostávajú
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const prepocitaj = () => setMierka(Math.min(1, el.clientWidth / W, el.clientHeight / H));
    prepocitaj();
    const ro = new ResizeObserver(prepocitaj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label="Ako DEED+ funguje" tabIndex={-1} className="deed-platba"
      style={{ position: "absolute", inset: 0, zIndex: 95, background: "var(--bg)", display: "grid", placeItems: "center", overflow: "hidden", outline: "none" }}>
      <div style={{ width: W * mierka, height: H * mierka }}>
        <div style={{ width: W, height: H, transform: `scale(${mierka})`, transformOrigin: "0 0" }}>
          <Uvitanie onHotovo={onClose} />
        </div>
      </div>
    </div>
  );
}
