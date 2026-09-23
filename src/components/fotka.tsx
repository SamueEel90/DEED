// ============================================================
// FOTKA OBSAHU — fotka si nesie vlastný pomer strán, appka ju neťahá.
// Pravidlo: pomer sa nechá tak, ako ho má, len sa zrareže, ak je mimo
// rozsahu (príliš široká panoráma alebo príliš vysoký portrét) — vtedy
// sa oreže od kraja, nikdy sa needeformuje. Žiadne sivé pásy.
// ============================================================
import { useState, type CSSProperties } from "react";
import { RADIUS } from "@/theme";

export const FOTKA_CFG = {
  /** najširší povolený pomer (panoráma sa oreže na tento) */
  maxPomer: 16 / 9,
  /** najvyšší povolený pomer (portrét sa oreže na 4:5) */
  minPomer: 4 / 5,
};

export function FotkaObsahu({ src, alt = "", maxVyska = 420, radius = 0, style }: {
  src: string; alt?: string; maxVyska?: number; radius?: number; style?: CSSProperties;
}) {
  const [pomer, setPomer] = useState<number | null>(null);
  const clamp = pomer ? Math.min(FOTKA_CFG.maxPomer, Math.max(FOTKA_CFG.minPomer, pomer)) : FOTKA_CFG.maxPomer;
  return (
    <img src={src} alt={alt}
      onLoad={(e) => {
        const el = e.currentTarget;
        if (el.naturalWidth && el.naturalHeight) setPomer(el.naturalWidth / el.naturalHeight);
      }}
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
