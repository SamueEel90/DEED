import React from 'react';

// Svetlúšik = sprite z videa intra: svetlusik-let.png, 10 záberov vedľa seba (1 mávnutie, priehľadné pozadie).
// Kým nebude vektor od ilustrátora, používa sa len tento obrázok. Máva IBA hornými krídlami (je to v zábere).
// Kedy sa objaví (vždy rovnako): čaká s tebou (spracovanie) · zanesie svetielko (roj do ukazovateľa) · ukáže karmu.
export function Svetlusik({ size = 120, rychlost = 0.6, ziara = true }: { size?: number; rychlost?: number; ziara?: boolean }) {
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {ziara && <div style={{ position: 'absolute', inset: -size / 6, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,196,92,.45),rgba(255,196,92,0) 66%)' }} />}
      <div style={{ position: 'relative', width: size, height: size, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: size * 10, height: size, background: 'url(/svetlusik-let.png) 0 0/100% 100% no-repeat', animation: `svetlusikSprite ${rychlost}s steps(10) infinite` }} />
      </div>
    </div>
  );
}

// Roj: za každé celé euro jeden malý svetlúšik, najviac 40. Letí z maskota na koniec ukazovateľa zbierky.
// Len Web Animations API (transform/opacity), elementy sa po dolete odstránia.
export function roj(root: HTMLElement, from: HTMLElement, to: HTMLElement, eur: number) {
  const n = Math.max(1, Math.min(40, Math.floor(eur)));
  const R = root.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2 - R.left, y0 = a.top + a.height / 2 - R.top, x1 = b.left - R.left, y1 = b.top - R.top;
  const stagger = n > 1 ? Math.min(70, 800 / (n - 1)) : 0;
  for (let i = 0; i < n; i++) {
    const s = 0.55 + Math.random() * 0.5, z = Math.round(40 * s);
    const el = document.createElement('span');
    el.innerHTML = `<span style="position:absolute;left:${-z / 2}px;top:${-z / 2}px;width:${z}px;height:${z}px;overflow:hidden"><span style="position:absolute;left:0;top:0;width:${z * 10}px;height:${z}px;background:url(/svetlusik-let.png) 0 0/100% 100% no-repeat;animation:svetlusikSprite .4s steps(10) infinite"></span></span>`;
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', zIndex: '5' });
    root.appendChild(el);
    const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 120, my = Math.min(y0, y1) - 40 - Math.random() * 80;
    el.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.3)`, opacity: 0 },
      { transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${mx}px,${my}px) scale(1)`, offset: 0.55 },
      { transform: `translate(${x1}px,${y1}px) scale(.35)`, opacity: 0.2 },
    ], { duration: 700, delay: i * stagger, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' }).onfinish = () => el.remove();
  }
  return (n - 1) * stagger + 700; // ms do doletu posledného → potom posunúť ukazovateľ
}
