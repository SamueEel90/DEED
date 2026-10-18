// ============================================================
// OPRAVY 359 · po zmazaní podržaním: krátko zelená hláška tam, kde položka bola
// Miesto = prvok [data-oz="{id}"], inak posledný ťuk mimo okna (tlačidlo, ktorým sa detail otvoril).
// Hláška je nad stránkou (fixed), zmizne po 2,6 s alebo pri posune stránky. Bez Reactu — funguje v každom rozložení.
// ============================================================
let posledny: Element | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (t && !t.closest('[role="dialog"]')) posledny = t.closest("[data-oz], button, a") ?? t;
  }, true);
}

export const ZMAZANY_PRISPEVOK = "Príspevok je zmazaný";

/** volať hneď po zmazaní, ešte pred zavretím detailu (miesto sa zmeria, kým je na stránke) */
export function ukazZmazane(id: string | null, text = ZMAZANY_PRISPEVOK): void {
  if (typeof document === "undefined") return;
  const oz = id ? [...document.querySelectorAll(`[data-oz="${CSS.escape(id)}"]`)].find((x) => x.getBoundingClientRect().width > 0) : undefined;
  const el = oz ?? (posledny?.isConnected ? posledny : null);
  const r = el?.getBoundingClientRect();
  const vh = window.innerHeight, vw = window.innerWidth;
  const v = 52;
  const sirka = r && r.width > 0 ? Math.min(r.width, vw - 16) : Math.min(420, vw - 32);
  const lavo = r && r.width > 0 ? Math.max(8, Math.min(r.left, vw - sirka - 8)) : (vw - sirka) / 2;
  const hore = r && r.height > 0 ? Math.max(8, Math.min(r.top + Math.min(r.height, v) / 2 - v / 2, vh - v - 8)) : vh - v - 24;
  document.querySelectorAll(".zmazane-miesto").forEach((x) => x.remove());
  const d = document.createElement("div");
  d.className = "zmazane-miesto";
  d.setAttribute("role", "status");
  d.textContent = text;
  Object.assign(d.style, { top: `${hore}px`, left: `${lavo}px`, width: `${sirka}px`, minHeight: `${v}px` });
  document.body.appendChild(d);
  let t = 0;
  const zrus = () => { window.clearTimeout(t); window.removeEventListener("scroll", zrus, true); window.removeEventListener("resize", zrus); d.remove(); };
  t = window.setTimeout(zrus, 2600);
  // posun stránky (napr. návrat na blok po zavretí detailu) až o chvíľu — inak by hláška hneď zmizla
  window.setTimeout(() => { if (d.isConnected) { window.addEventListener("scroll", zrus, true); window.addEventListener("resize", zrus); } }, 700);
}
