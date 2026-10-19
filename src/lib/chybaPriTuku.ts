// ============================================================
// OPRAVY 382 · reakcia alebo nahlásenie, ktoré server odmietol: pri tlačidle „Nepodarilo sa · Skúsiť znova“
// Miesto = tlačidlo, ktorým človek ťukol (posledný ťuk). Ťuk na hlášku zopakuje akciu. Zmizne po 6 s alebo pri posune.
// ============================================================
let posledny: Element | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (t && !t.closest(".chyba-pri-tuku")) posledny = t.closest("button, a, [role='button']") ?? t;
  }, true);
}

export function ukazChybuPriTuku(znova?: () => void, text = "Nepodarilo sa · Skúsiť znova"): void {
  if (typeof document === "undefined") return;
  const el = posledny?.isConnected ? posledny : null;
  const r = el?.getBoundingClientRect();
  const vh = window.innerHeight, vw = window.innerWidth;
  const sirka = Math.min(Math.max(r?.width ?? 0, 240), vw - 16);
  const lavo = r ? Math.max(8, Math.min(r.left, vw - sirka - 8)) : (vw - sirka) / 2;
  const hore = r ? (r.bottom + 6 + 48 < vh ? r.bottom + 6 : Math.max(8, r.top - 54)) : vh - 80;
  document.querySelectorAll(".chyba-pri-tuku").forEach((x) => x.remove());
  const d = document.createElement(znova ? "button" : "div");
  d.className = "chyba-pri-tuku";
  d.setAttribute("role", "alert");
  if (znova) (d as HTMLButtonElement).type = "button";
  d.textContent = text;
  Object.assign(d.style, { top: `${hore}px`, left: `${lavo}px`, width: `${sirka}px` });
  document.body.appendChild(d);
  let t = 0;
  const zrus = () => { window.clearTimeout(t); window.removeEventListener("scroll", zrus, true); d.remove(); };
  if (znova) d.addEventListener("click", () => { zrus(); znova(); });
  t = window.setTimeout(zrus, 6000);
  window.setTimeout(() => { if (d.isConnected) window.addEventListener("scroll", zrus, true); }, 400);
}
