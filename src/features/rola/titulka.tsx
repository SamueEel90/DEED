// KARTA 33 · OPRAVY 107 — titulná fotka profilu (výrez + rám), jeden vzhľad pre Upraviť profil aj verejný profil.
import type { CSSProperties, ReactNode } from "react";
import type { RamFotky, TitulnaFotka } from "@/lib/profilStranky";

export const RAMY: { k: RamFotky; t: string; g: string }[] = [
  { k: "bez", t: "Bez rámu", g: "repeating-linear-gradient(45deg,#fff 0 4px,var(--card) 4px 8px)" },
  { k: "br", t: "Bronzový", g: "linear-gradient(135deg,#4A2A14 0%,#7A4A24 22%,#B97D45 45%,#E6B784 58%,#A86E3A 72%,#6A3E1E 88%,#3E2210 100%)" },
  { k: "bb", t: "Bordovo-bronzový", g: "linear-gradient(135deg,#4E1620 0%,#7A2430 26%,#B97D45 50%,#E6B784 62%,#9A6232 76%,#5E1A24 100%)" },
  { k: "zb", t: "Zeleno-bronzový", g: "linear-gradient(135deg,#1E3627 0%,#2F5A3C 26%,#B97D45 50%,#E6B784 62%,#9A6232 76%,#22402E 100%)" },
];
// ---------- titulná fotka: pomer 16 : 9 až 3 : 1, výrez ako čísla ----------
export const pomerFotky = (w: number, h: number) => (w && h ? Math.max(16 / 9, Math.min(3, w / h)) : 16 / 9);
/** poloha obrázka v ráme v % (rovnaká geometria ako OrezFotky → PC, tablet aj mobil vyzerajú rovnako) */
function geometria(c: TitulnaFotka, ar: number) {
  const r = c.w / c.h; // pomer obrázka
  const v = c.vyrez;
  if (v.rezim === "cela") {
    const w = Math.min(1, r / ar), h = (w / r) * ar; // šírka v % rámu, výška v % rámu
    return { w, h, l: (1 - w) / 2, t: (1 - h) / 2 };
  }
  const w = Math.max(1, r / ar) * v.zoom, h = (w / r) * ar;
  return { w, h, l: -(w - 1) * v.x, t: -(h - 1) * v.y };
}
export function Titulka({ cover, ram, radius = 14, prazdne, zony, bezStitu, style }: { cover: TitulnaFotka | null; ram: RamFotky; radius?: number; prazdne?: ReactNode; zony?: boolean; /** KARTA 56D §4: farnosť nemá štít — len miesto pre logo */ bezStitu?: boolean; style?: CSSProperties }) {
  const ar = cover ? pomerFotky(cover.w, cover.h) : 16 / 9;
  const g = cover && geometria(cover, ar);
  const ramG = RAMY.find((x) => x.k === ram && x.k !== "bez")?.g;
  return (
    <div style={{ position: "relative", aspectRatio: String(ar), borderRadius: radius, overflow: "hidden", background: cover ? cover.priemer : "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)", ...style }}>
      {cover && g && <img src={cover.src} alt="" draggable={false} style={{ position: "absolute", left: `${g.l * 100}%`, top: `${g.t * 100}%`, width: `${g.w * 100}%`, height: `${g.h * 100}%`, maxWidth: "none", display: "block" }} />}
      {!cover && prazdne}
      {ramG && <>
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", borderRadius: radius, padding: 9, background: ramG, WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.35)" }} />
        <span aria-hidden="true" style={{ position: "absolute", inset: 9, zIndex: 3, pointerEvents: "none", borderRadius: Math.max(4, radius - 9), boxShadow: "inset 0 0 8px rgba(0,0,0,.35)" }} />
      </>}
      {zony && <>
        <span aria-hidden="true" style={{ position: "absolute", zIndex: 4, left: 14, bottom: 12, width: 56, height: 56, borderRadius: 14, border: "1.5px dashed rgba(255,255,255,.8)", pointerEvents: "none" }} />
        {!bezStitu && <span aria-hidden="true" style={{ position: "absolute", zIndex: 4, right: 14, bottom: 12, width: 44, height: 52, borderRadius: 10, border: "1.5px dashed rgba(255,255,255,.8)", pointerEvents: "none" }} />}
      </>}
    </div>);
}
