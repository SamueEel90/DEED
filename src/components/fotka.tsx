// ============================================================
// FOTKA OBSAHU — fotka si nesie vlastný pomer strán, appka ju neťahá.
// Pravidlo: pomer sa nechá tak, ako ho má, len sa zrareže, ak je mimo
// rozsahu (príliš široká panoráma alebo príliš vysoký portrét) — vtedy
// sa oreže od kraja, nikdy sa needeformuje. Žiadne sivé pásy.
// ============================================================
import { useState, type CSSProperties } from "react";
import { RADIUS } from "@/theme";
import { CelaGaleria } from "@/components/celaGaleria";

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

// ---- PREHLIADAČ FOTIEK — OPRAVY 261: tá istá galéria na celú obrazovku ako v celej appke ----
export function PrehliadacFotiek({ fotky, start = 0, onClose }: { fotky: string[]; start?: number; onClose: () => void }) {
  return <CelaGaleria media={fotky.map((src) => ({ typ: "foto" as const, src }))} start={Math.min(start, fotky.length - 1)} onClose={onClose} />;
}
