// ============================================================
// OPRAVY 386 · krátky ťuk na „Podržte …“ nesmie byť ticho: na mieste prsta sa ukáže „Podržte tlačidlo“.
// Jedno miesto pre celú appku: každé tlačidlo, ktorého text alebo aria-label začína „Podrž…“.
// Krátky ťuk = pustené do 400 ms bez posunu prsta (podržanie trvá v appke vždy aspoň 0,9 s, takže sa nič nevykonalo).
// ============================================================
const ZACIATOK = /^\s*podrž/i;
let start: { x: number; y: number; t: number; el: Element } | null = null;

const jePodrzte = (el: Element) => ZACIATOK.test(el.getAttribute("aria-label") || el.textContent || "");

function ukaz(x: number, y: number) {
  document.querySelectorAll(".podrzte-napoveda").forEach((n) => n.remove());
  const d = document.createElement("div");
  d.className = "podrzte-napoveda";
  d.setAttribute("role", "status");
  d.textContent = "Podržte tlačidlo";
  document.body.appendChild(d);
  const w = d.offsetWidth, h = d.offsetHeight, vw = window.innerWidth;
  const hore = y - h - 22 > 8 ? y - h - 22 : y + 26;
  Object.assign(d.style, { left: `${Math.max(8, Math.min(x - w / 2, vw - w - 8))}px`, top: `${hore}px` });
  window.setTimeout(() => d.classList.add("podrzte-napoveda--prec"), 1400);
  window.setTimeout(() => d.remove(), 1700);
}

export function sledujPodrzte() {
  if (typeof document === "undefined") return;
  document.addEventListener("pointerdown", (e) => {
    const b = e.target instanceof Element ? e.target.closest("button, [role='button']") : null;
    start = b && !(b as HTMLButtonElement).disabled && jePodrzte(b) ? { x: e.clientX, y: e.clientY, t: performance.now(), el: b } : null;
  }, true);
  document.addEventListener("pointerup", (e) => {
    const s = start; start = null;
    if (!s || !s.el.isConnected || !jePodrzte(s.el)) return;
    if (performance.now() - s.t < 400 && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 12) ukaz(e.clientX, e.clientY);
  }, true);
  document.addEventListener("pointercancel", () => { start = null; }, true);
}
