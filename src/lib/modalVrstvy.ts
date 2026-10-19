// ============================================================
// OPRAVY 387 · otvorený detail (zbierka, parte, adresár, platba …) = skutočný dialóg:
//  · všetko mimo najvrchnejšej vrstvy je inert (klik ani Tab sa pod ňu nedostane, čítačka ju nevidí),
//  · zameranie sa pri otvorení presunie do vrstvy, po zavretí sa vráti, odkiaľ prišlo.
// Vrstva = [role=dialog][aria-modal=true] s position: fixed a z-index ≥ 1000 (detaily a okná nad stránkou).
// Nižšie vrstvy (verejný profil 70) nechávajú spodnú lištu appky ovládateľnú, tých sa to netýka.
// Hlášky nad všetkým (toasty, „Nepodarilo sa · Skúsiť znova“, „Podržte tlačidlo“) ostávajú živé.
// ============================================================
const VZDY = "[data-sonner-toaster], .chyba-pri-tuku, .podrzte-napoveda";
let inertne: Element[] = [];
let aktivna: HTMLElement | null = null;
let aktivnaZ = 0;
/** prvok nad vrstvou (galéria, výber fotiek, písanie …) — ostáva živý, nič ho nezakryje */
const nad = (e: Element) => { const cs = getComputedStyle(e); return cs.position === "fixed" && cs.display !== "none" && (Number(cs.zIndex) || 0) > aktivnaZ; };
/** kde bolo zameranie pred otvorením vrstvy — po jej zavretí sa tam vráti */
const predtym = new WeakMap<HTMLElement, HTMLElement>();
let naplanovane = false;

function najvrchnejsia(): HTMLElement | null {
  let top: HTMLElement | null = null, topZ = -1;
  document.querySelectorAll<HTMLElement>("[role='dialog'][aria-modal='true']").forEach((d) => {
    const cs = getComputedStyle(d);
    if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
    const z = Number(cs.zIndex) || 0;
    if (z >= 1000 && z >= topZ) { top = d; topZ = z; }
  });
  return top;
}

function zneziv(dialog: HTMLElement) {
  const daj = (s: Element) => {
    if (s.matches(VZDY) || s.tagName === "SCRIPT" || s.tagName === "STYLE" || nad(s)) return;
    if (s.querySelector(VZDY)) { Array.from(s.children).forEach(daj); return; }
    if (!s.hasAttribute("inert")) { s.setAttribute("inert", ""); inertne.push(s); }
  };
  for (let n: Element = dialog; n.parentElement && n !== document.body; n = n.parentElement) {
    Array.from(n.parentElement.children).forEach((s) => { if (s !== n) daj(s); });
  }
}

function prepocitaj() {
  naplanovane = false;
  const d = najvrchnejsia();
  if (!d && !aktivna) return;
  inertne.forEach((e) => e.removeAttribute("inert"));
  inertne = [];
  const bola = aktivna;
  aktivna = d;
  aktivnaZ = d ? Number(getComputedStyle(d).zIndex) || 0 : 0;
  const vrat = bola && !bola.isConnected ? predtym.get(bola) : undefined; // vrstva sa zavrela
  if (d) zneziv(d); // aj pri tej istej vrstve — medzitým mohlo pribudnúť niečo nové mimo nej
  if (d === bola) return;
  if (vrat?.isConnected && (!d || d.contains(vrat))) { vrat.focus({ preventScroll: true }); return; }
  if (d && !d.contains(document.activeElement)) {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) predtym.set(d, document.activeElement);
    if (!d.hasAttribute("tabindex")) d.setAttribute("tabindex", "-1");
    d.focus({ preventScroll: true });
  }
}

/** Esc zavrie len najvrchnejšiu vrstvu (doteraz počúvali Esc všetky vrstvy naraz a zavreli sa spolu) */
function zavriEsc(e: KeyboardEvent) {
  if (e.key !== "Escape" || !aktivna?.isConnected) return;
  if (Array.from(document.body.children).some((x) => x !== aktivna && !x.contains(aktivna) && nad(x))) return; // nad vrstvou je ešte niečo (galéria) — Esc patrí tomu
  const tl = Array.from(aktivna.querySelectorAll<HTMLButtonElement>("button")).find((x) => {
    if (x.closest("[role='dialog'][aria-modal='true']") !== aktivna || x.disabled) return false;
    const n = (x.getAttribute("aria-label") || x.textContent || "").trim();
    return /^(zavrieť|‹\s*späť|späť)/i.test(n);
  });
  if (!tl) return;
  e.stopImmediatePropagation(); e.preventDefault();
  tl.click();
}

export function sledujVrstvy() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  window.addEventListener("keydown", zavriEsc, true);
  new MutationObserver(() => { if (!naplanovane) { naplanovane = true; requestAnimationFrame(prepocitaj); } })
    .observe(document.body, { childList: true, subtree: true });
}
