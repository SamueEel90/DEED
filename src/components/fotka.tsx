// ============================================================
// FOTKA OBSAHU — fotka si nesie vlastný pomer strán, appka ju neťahá.
// Pravidlo: pomer sa nechá tak, ako ho má, len sa zrareže, ak je mimo
// rozsahu (príliš široká panoráma alebo príliš vysoký portrét) — vtedy
// sa oreže od kraja, nikdy sa needeformuje. Žiadne sivé pásy.
// ============================================================
import { useState, type CSSProperties } from "react";
import { C, SPACE, RADIUS } from "@/theme";
import { Sheet } from "@/components/sheet";
import { pressable } from "@/components/pressable";

export const FOTKA_CFG = {
  /** najširší povolený pomer (panoráma sa oreže na tento) */
  maxPomer: 16 / 9,
  /** najvyšší povolený pomer (portrét sa oreže na 4:5) */
  minPomer: 4 / 5,
};

export function FotkaObsahu({ src, alt = "", maxVyska = 420, radius = 0, cela = false, style }: {
  src: string; alt?: string; maxVyska?: number; radius?: number;
  /** plagát — celá fotka sa musí vidieť, nič sa neoreže (text je v nej) */
  cela?: boolean; style?: CSSProperties;
}) {
  const [pomer, setPomer] = useState<number | null>(null);
  const clamp = pomer ? Math.min(FOTKA_CFG.maxPomer, Math.max(FOTKA_CFG.minPomer, pomer)) : FOTKA_CFG.maxPomer;
  const zmer = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget;
    if (el.naturalWidth && el.naturalHeight) setPomer(el.naturalWidth / el.naturalHeight);
  };
  // plagát: celý, nič sa neoreže — výška je stropom, šírka sa dopočíta a obrázok sa vycentruje
  if (cela) return (
    <span style={{ display: "block", textAlign: "center", background: "rgba(var(--glass-rgb),.06)" }}>
      <img src={src} alt={alt} onLoad={zmer}
        style={{ maxWidth: "100%", maxHeight: Math.max(maxVyska, 520), width: "auto", display: "inline-block", verticalAlign: "top", borderRadius: radius || undefined, ...style }} />
    </span>
  );
  return (
    <img src={src} alt={alt} onLoad={zmer}
      style={{
        width: "100%", aspectRatio: String(clamp), maxHeight: maxVyska,
        objectFit: "cover", display: "block",
        borderRadius: radius || undefined, background: "rgba(var(--glass-rgb),.06)",
        ...style,
      }} />
  );
}

/** malá miniatúra — vždy štvorcová plocha, fotka vyplní a oreže sa od kraja */
export function Miniatura({ src, sirka = 92, vyska = 58, onClick }: { src: string; sirka?: number; vyska?: number; onClick?: () => void }) {
  return (
    <img src={src} alt="" onClick={onClick}
      style={{ flex: "none", width: sirka, height: vyska, objectFit: "cover", borderRadius: RADIUS.xs, display: "block", cursor: onClick ? "pointer" : undefined, background: "rgba(var(--glass-rgb),.06)" }} />
  );
}

// ---- PREHLIADAČ FOTIEK — klik na fotku ju otvorí na celú, šípky prepínajú ----
export function PrehliadacFotiek({ fotky, start = 0, onClose }: { fotky: string[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(Math.min(start, fotky.length - 1));
  const posun = (o: number) => setI((x) => (x + o + fotky.length) % fotky.length);
  const sip: CSSProperties = {
    width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", fontFamily: "inherit",
    background: "rgba(var(--glass-rgb),.12)", color: C.text, fontSize: 20, lineHeight: "44px", padding: 0, flex: "none",
  };
  return (
    <Sheet onClose={onClose} label="Fotka">
      <img src={fotky[i]} alt="" style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", display: "block", borderRadius: RADIUS.sm, background: "rgba(var(--glass-rgb),.06)" }} />
      {fotky.length > 1 && (<>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.md, marginTop: SPACE.sm }}>
          <button type="button" onClick={() => posun(-1)} aria-label="Predchádzajúca fotka" style={sip}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textSec, minWidth: 54, textAlign: "center" }}>{i + 1} / {fotky.length}</span>
          <button type="button" onClick={() => posun(1)} aria-label="Ďalšia fotka" style={sip}>›</button>
        </div>
        <div style={{ display: "flex", gap: SPACE.xxs, justifyContent: "center", marginTop: SPACE.xs, flexWrap: "wrap" }}>
          {fotky.map((f, x) => (
            <span key={x} {...pressable(() => setI(x), `Fotka ${x + 1}`)}
              style={{ display: "block", borderRadius: RADIUS.xs, overflow: "hidden", cursor: "pointer", border: `2px solid ${x === i ? "var(--a-green)" : "transparent"}`, boxSizing: "border-box" }}>
              <Miniatura src={f} sirka={72} vyska={48} />
            </span>
          ))}
        </div>
      </>)}
      <button type="button" onClick={onClose}
        style={{ width: "100%", height: 46, marginTop: SPACE.md, borderRadius: RADIUS.sm, border: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, background: "transparent", color: C.textSec }}>
        Zavrieť
      </button>
    </Sheet>
  );
}
