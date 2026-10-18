// ============================================================
// OPRAVY 321 · PRAVIDLO: čo sa rozbalí, musí mať Zbaliť ⌃ (pri dlhom texte aj dole na konci).
// Po zbalení ostane človek pri tom istom bloku (bod 245): ak by začiatok bloku ušiel nad obrazovku, posunie sa naň.
// ============================================================
import type { CSSProperties } from "react";

/** zbalí a nechá človeka pri tom istom bloku (najbližší [data-zbal] / [data-blok], inak rodič tlačidla) */
export function zbalNaMieste(od: Element | null, zbal: () => void) {
  const k = od?.closest("[data-zbal],[data-blok]") ?? od?.parentElement ?? null;
  zbal();
  requestAnimationFrame(() => { if (k && k.getBoundingClientRect().top < 0) k.scrollIntoView({ block: "start" }); });
}
/** tlačidlo Zbaliť ⌃ (farba odkazu stránky farnosti; mimo nej sa dá zmeniť cez styl) */
export function TlZbalit({ onZbal, text = "Zbaliť ⌃", styl }: { onZbal: () => void; text?: string; styl?: CSSProperties }) {
  return <button type="button" onClick={(e) => zbalNaMieste(e.currentTarget, onZbal)}
    style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--nf-gInk, var(--green))", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "none", ...styl }}>{text}</button>;
}
