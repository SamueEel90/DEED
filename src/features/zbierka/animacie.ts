// DEED · animácie platobného modulu — HOTOVÝ KÓD, prevzatý 1 : 1 z prototypu (Platba - dorovnanie firmy v2).
// Použi presne takto. Len Web Animations API (transform / opacity), elementy sa po dolete samy odstránia.
// Predpoklad: v CSS je animacie.css (@keyframes sprite atď.) a obrázok /svetlusik-let.png (10 snímok vedľa seba).

const tichy = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const vibruj = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* iOS nevibruje */ } };

/** Malý letiaci Svetlúšik (sprite). size 1 = 40 px. */
function svetlusikEl(size = 1) {
  const b = document.createElement('span');
  Object.assign(b.style, { position: 'absolute', left: '0', top: '0', width: '0', height: '0', pointerEvents: 'none', zIndex: '50' });
  const z = Math.round(40 * size);
  b.innerHTML = `<span style="position:absolute;left:${-z / 2}px;top:${-z / 2}px;width:${z}px;height:${z}px;overflow:hidden"><span style="position:absolute;left:0;top:0;width:${z * 10}px;height:${z}px;background:url(/svetlusik-let.png) 0 0/100% 100% no-repeat;animation:sprite .4s steps(10) infinite"></span></span>`;
  return b;
}
function zablysk(root: HTMLElement, x: number, y: number, r = 20, dur = 500) {
  const f = document.createElement('span');
  Object.assign(f.style, { position: 'absolute', left: '0', top: '0', width: r * 2 + 'px', height: r * 2 + 'px', margin: `-${r}px 0 0 -${r}px`, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,231,163,.9),rgba(246,183,60,0) 70%)', pointerEvents: 'none', zIndex: '50' });
  root.appendChild(f);
  f.animate([{ transform: `translate(${x}px,${y}px) scale(.4)`, opacity: 1 }, { transform: `translate(${x}px,${y}px) scale(1.4)`, opacity: 0 }], { duration: dur, easing: 'ease-out' }).onfinish = () => f.remove();
}

/**
 * MIKRODAR — svetielko vyletí z dlaždice k sume/pruhu zbierky, zablysne sa a vyskočí štítok „+100 DEED".
 * root = obal obrazovky (position: relative; overflow: hidden) · from = dlaždica · to = element na konci pruhu ([data-bar-end]).
 * Vráti Promise, ktorý sa splní po dolete (vtedy navýš sumu zbierky počítadlom).
 */
export function letSvetielko(root: HTMLElement, from: HTMLElement, to: HTMLElement, stitok?: string, dur = 650): Promise<void> {
  return new Promise((done) => {
    const P = root.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const x0 = a.left + a.width / 2 - P.left, y0 = a.top + a.height / 2 - P.top, x1 = b.left - P.left, y1 = b.top - P.top;
    if (tichy()) { done(); return; }
    const dot = svetlusikEl(1.1);
    root.appendChild(dot);
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 60;
    dot.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1, offset: .1 },
      { transform: `translate(${mx}px,${my}px) scale(1)`, offset: .55 },
      { transform: `translate(${x1}px,${y1}px) scale(.5)`, opacity: .9 },
    ], { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = () => {
      dot.remove();
      zablysk(root, x1, y1, 20, 500);
      done();
      if (!stitok) return;
      const l = document.createElement('span');
      l.textContent = stitok;
      Object.assign(l.style, { position: 'absolute', left: '0', top: '0', fontSize: '12.5px', fontWeight: '800', color: /DEED|EURC/.test(stitok) ? 'var(--blue)' : 'var(--green)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: '50' });
      root.appendChild(l);
      l.animate([{ transform: `translate(${x1 - 30}px,${y1 - 14}px)`, opacity: 0 }, { transform: `translate(${x1 - 30}px,${y1 - 30}px)`, opacity: 1, offset: .3 }, { transform: `translate(${x1 - 30}px,${y1 - 44}px)`, opacity: 0 }], { duration: 1100, easing: 'ease-out' }).onfinish = () => l.remove();
    };
  });
}

/**
 * ROJ po dare — z maskota (Svetlúšik na poďakovaní) letí 1 svetlúšik za každé celé € (najviac 40) na koniec pruhu.
 * Vráti čas v ms, kedy dolete posledný.
 */
export function roj(root: HTMLElement, from: HTMLElement, to: HTMLElement, eur: number, dur = 620): number {
  const count = Math.max(1, Math.min(40, Math.floor(eur)));
  if (tichy()) return 0;
  const P = root.getBoundingClientRect(), a = from.getBoundingClientRect();
  const x0 = a.left + a.width / 2 - P.left, y0 = a.top + a.height / 2 - P.top;
  const stagger = count > 1 ? Math.min(70, 800 / (count - 1)) : 0;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const b = to.getBoundingClientRect();
      const x1 = b.left - P.left - Math.random() * 40, y1 = b.top - P.top + (Math.random() - 0.5) * 6;
      const sx = x0 + (Math.random() - 0.5) * 36, sy = y0 + (Math.random() - 0.5) * 30;
      const mx = (sx + x1) / 2 + (Math.random() - 0.5) * 120, my = Math.min(sy, y1) - 30 - Math.random() * 70;
      const el = svetlusikEl(count > 1 ? 0.75 + Math.random() * 0.45 : 1.1);
      root.appendChild(el);
      el.animate([
        { transform: `translate(${sx}px,${sy}px) scale(.3)`, opacity: 0 },
        { transform: `translate(${sx}px,${sy - 10}px) scale(1)`, opacity: 1, offset: .12 },
        { transform: `translate(${mx}px,${my}px) scale(1)`, offset: .55 },
        { transform: `translate(${x1}px,${y1}px) scale(.35)`, opacity: .85 },
      ], { duration: dur + Math.random() * 180, easing: 'cubic-bezier(.45,0,.25,1)' }).onfinish = () => { el.remove(); zablysk(root, x1, y1, 15, 420); };
    }, i * stagger);
  }
  return (count - 1) * stagger + dur + 180;
}

/** POČÍTADLO — suma naskakuje od from po to (ease-out cubic). onFrame dostane aktuálnu hodnotu. Vráti funkciu na zrušenie. */
export function pocitadlo(from: number, to: number, dur: number, onFrame: (v: number) => void): () => void {
  if (tichy()) { onFrame(to); return () => {}; }
  let raf = 0; const t0 = performance.now();
  const step = (t: number) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); onFrame(from + (to - from) * e); if (p < 1) raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/** VÝMENA OBSAHU (výhody registrácie každých 3,4 s, posledný dar, hláška): odchod hore, zmena, príchod zdola. */
export function vymen(el: HTMLElement, zmen: () => void) {
  if (tichy()) { zmen(); return; }
  const out = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' });
  out.onfinish = () => { zmen(); out.cancel(); el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'ease-out' }); };
}

/** VYSUNUTIE / ZASUNUTIE (tempo darov na auto miestach, oznámenia). */
export const vysun = (el: HTMLElement) => { if (!tichy()) el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: 'ease-out' }); };
export const zasun = (el: HTMLElement) => tichy() ? Promise.resolve() : el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 350, easing: 'ease-in', fill: 'forwards' }).finished.then(() => {});

/** HÁROK zdola (mobil) / na stred (tablet, PC). */
export const otvorHarok = (el: HTMLElement, naStred = false) => { if (!tichy()) el.animate(naStred ? [{ opacity: 0, transform: 'translate(-50%,-48%) scale(.97)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }] : [{ transform: 'translateY(100%)' }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' }); };

/** Nová hodnota v zozname (darca navrch, suma pri majiteľovi zbierky). */
export const zvyrazni = (el: HTMLElement) => { if (!tichy()) el.animate([{ transform: 'scale(1.18)', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'ease-out' }); };
export const novyRiadok = (el: HTMLElement) => { if (!tichy()) el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' }); };
