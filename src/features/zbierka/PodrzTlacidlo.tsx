import React, { useRef, useState } from 'react';

// „Podrž a zaplať" — potvrdenie podržaním 0,9 s. Ťuknutie len ukáže nápovedu.
// Plnenie = transform:scaleX (žiadny layout). Vibrácie fungujú len na Androide.
type Props = { label: string; onConfirm: () => void; farba?: 'zelena' | 'zlata'; disabled?: boolean; onHint?: () => void; trvanie?: number };

const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch {} };

export default function PodrzTlacidlo({ label, onConfirm, farba = 'zelena', disabled, onHint, trvanie = 900 }: Props) {
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
      onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
      onClick={() => { if (p.current === 0) { onHint?.(); buzz(4); } }}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      style={{ position: 'relative', overflow: 'hidden', width: '100%', height: 54, borderRadius: 16, border: 'none', color: '#fff', fontSize: 16.5, fontWeight: 800,
        background: farba === 'zlata' ? 'var(--goldGrad)' : 'var(--gGrad)', fontVariantNumeric: 'tabular-nums', touchAction: 'manipulation', userSelect: 'none',
        transform: `scale(${pressed ? 0.98 : 1})`, transition: 'transform .15s ease', opacity: disabled ? 0.45 : 1 }}>
      <span ref={fill} style={{ position: 'absolute', inset: 0, background: farba === 'zlata' ? '#6B5214' : '#2F5620', transformOrigin: '0 50%', transform: 'scaleX(0)' }} />
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}
// Nápoveda pri ťuknutí: „Dar sa nedá vrátiť, preto platbu potvrdíš podržaním tlačidla." (firma: „Potvrdíte podržaním tlačidla.")
