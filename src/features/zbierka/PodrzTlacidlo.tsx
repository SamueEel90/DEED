import React, { useRef, useState } from 'react';

// „Podrž a zaplať" — potvrdenie podržaním 0,9 s. Ťuknutie len ukáže nápovedu.
// Plnenie = transform:scaleX (žiadny layout). Vibrácie fungujú len na Androide.
// OPRAVY 474: farba má zálohu — --gGrad/--goldGrad sú len v .deed-platba a .vp; mimo nich bolo tlačidlo biely text bez podkladu.
type Props = { label: string; onConfirm: () => void; /** OPRAVY 434: červená = zrušenie / zmazanie */ farba?: 'zelena' | 'zlata' | 'cervena'; disabled?: boolean; onHint?: () => void; trvanie?: number;
  /** OPRAVY 474: obrys (menej dôležitá akcia, napr. Podržte a zmažte zápis) — rám a text vo farbe, plnenie priesvitné */ obrys?: boolean; vyska?: number };

const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };

export default function PodrzTlacidlo({ label, onConfirm, farba = 'zelena', disabled, onHint, trvanie = 900, obrys, vyska = 56 }: Props) {
  const plna = farba === 'zlata' ? '#8A6A1C' : farba === 'cervena' ? '#B3402A' : '#4B7A35';
  const fill = useRef<HTMLSpanElement>(null), raf = useRef(0), p = useRef(0), holding = useRef(false);
  const [pressed, setPressed] = useState(false);

  const loop = (last: number) => (now: number) => {
    const dt = now - last;
    p.current = holding.current ? Math.min(1, p.current + dt / trvanie) : Math.max(0, p.current - dt / 300);
    if (fill.current) fill.current.style.transform = `scaleX(${p.current})`;
    if (p.current >= 1) { holding.current = false; p.current = 0; setPressed(false); if (fill.current) fill.current.style.transform = 'scaleX(0)'; buzz([10, 40, 16]); onConfirm(); return; }
    if (p.current <= 0 && !holding.current) return;
    raf.current = requestAnimationFrame(loop(now));
  };
  const down = () => { if (disabled) return; holding.current = true; setPressed(true); buzz(6); cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(loop(performance.now())); };
  const up = () => { if (!holding.current) return; holding.current = false; setPressed(false); };

  return (
    <button
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); down(); }} onPointerUp={up} onPointerCancel={up}
      onClick={() => { if (p.current === 0) { onHint?.(); buzz(4); } }}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      style={{ position: 'relative', overflow: 'hidden', width: '100%', minHeight: vyska, borderRadius: 16, border: obrys ? `2px solid ${plna}` : 'none', color: obrys ? plna : '#fff', fontSize: obrys ? 15 : 16.5, fontWeight: 800, fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
        background: obrys ? 'transparent' : farba === 'zlata' ? 'var(--goldGrad, linear-gradient(90deg,#8A6A1C,#C9A24A))' : farba === 'cervena' ? 'linear-gradient(90deg,#A34A2A,#C8664A)' : 'var(--gGrad, linear-gradient(90deg,#4B7A35,#8DB866))', fontVariantNumeric: 'tabular-nums', touchAction: 'none', userSelect: 'none',
        transform: `scale(${pressed ? 0.98 : 1})`, transition: 'transform .15s ease', opacity: disabled ? 0.45 : 1 }}>
      <span ref={fill} style={{ position: 'absolute', inset: 0, background: obrys ? `color-mix(in srgb, ${plna} 22%, transparent)` : farba === 'zlata' ? '#6B5214' : farba === 'cervena' ? '#6E2A14' : '#2F5620', transformOrigin: '0 50%', transform: 'scaleX(0)' }} />
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}
// Nápoveda pri ťuknutí: „Dar sa nedá vrátiť, preto platbu potvrdíš podržaním tlačidla." (firma: „Potvrdíte podržaním tlačidla.")
