// ============================================================
// DEED · Intro sprievodca — 3 karty pri prvom spustení (raz,
// flag deed.intro.v1) + „Ako DEED funguje" z menu Viac (kedykoľvek).
// Vysvetľuje DNA appky: skutky bez komentárov · okruh a moduly ·
// dôvera/karma. Dialóg: Escape/Back zatvára, šípky listujú.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { C, GRAD, SPACE, RADIUS } from "@/theme";
import { Button } from "@/components/ui";
import { pressable } from "@/components/pressable";

const KARTY = [
  {
    emoji: "🌱",
    titul: "Skutky, nie reči",
    text: "DEED je miesto pre dobré skutky a pomoc — bez komentárov a hádok. Reaguješ činom: podporou, zdieľaním alebo darom (od 0,10 €).",
  },
  {
    emoji: "📍",
    titul: "Tvoje okolie aj celé Slovensko",
    text: "Okruh (štvrť → mesto → Slovensko) určuje, čo vidíš vo feede. Všetkých 8 modulov — Domov, Help, Charita, Aktivity, Náboženstvo, Mapa, Top a Profil — nájdeš v menu ☰ hore; päť obľúbených si pripneš do spodnej lišty.",
  },
  {
    emoji: "🛡️",
    titul: "Dôvera sa buduje skutkami",
    text: "Pravosť žiadostí overuje komunita (Overujem / Namietam) a doklady. Za overené skutky rastie tvoja karma — úrovne Bronze až Legend. Peniaze idú priamo prijímateľovi, platforma ich nikdy nedrží.",
  },
];

export function IntroPruvodca({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const posledna = i === KARTY.length - 1;
  const rootRef = useRef<HTMLDivElement>(null);

  // dialóg: focus dnu + restore po zatvorení; Escape zatvára, šípky listujú
  useEffect(() => {
    const predtym = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => predtym?.focus?.();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, KARTY.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const k = KARTY[i];
  return (
    <div ref={rootRef} role="dialog" aria-modal="true" aria-label="Ako DEED funguje" tabIndex={-1}
      style={{ position: "absolute", inset: 0, zIndex: 95, background: C.bg, display: "flex", flexDirection: "column", outline: "none", animation: "fadeUp .25s ease" }}>
      {/* preskočiť — vpravo hore */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: `${SPACE.md}px ${SPACE.md}px 0` }}>
        <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: C.textTer, padding: SPACE.xs }}>
          Preskočiť
        </button>
      </div>

      {/* karta */}
      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: `0 ${SPACE.xl}px`, maxWidth: 480, margin: "0 auto", animation: "fadeUp .3s ease" }}>
        <div aria-hidden style={{ width: 96, height: 96, borderRadius: RADIUS.round, background: "color-mix(in srgb, var(--a-green) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--a-green) 28%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: SPACE.lg }}>{k.emoji}</div>
        <h2 style={{ fontSize: 23, fontWeight: 800, margin: 0, letterSpacing: "-.01em" }}>{k.titul}</h2>
        <p style={{ fontSize: 14.5, color: C.textSec, lineHeight: 1.6, marginTop: SPACE.sm }}>{k.text}</p>
      </div>

      {/* bodky + akcie */}
      <div style={{ padding: `0 ${SPACE.lg}px calc(${SPACE.xl}px + env(safe-area-inset-bottom, 0px))`, maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: SPACE.xs, marginBottom: SPACE.md }}>
          {KARTY.map((_, x) => (
            <span key={x} {...pressable(() => setI(x), `Karta ${x + 1} z ${KARTY.length}`)} aria-current={x === i ? "true" : undefined}
              style={{ position: "relative", width: x === i ? 22 : 8, height: 8, borderRadius: 4, cursor: "pointer", transition: "all .25s ease", background: x === i ? GRAD : "rgba(var(--glass-rgb),.18)" }}>
              <span aria-hidden style={{ position: "absolute", inset: -6 }} />
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: SPACE.sm }}>
          {i > 0 && <Button variant="ghost" onClick={() => setI(i - 1)}>Späť</Button>}
          <Button variant="primary" onClick={() => (posledna ? onClose() : setI(i + 1))}>
            {posledna ? "Poďme na to" : "Ďalej"}
          </Button>
        </div>
      </div>
    </div>
  );
}
