// ============================================================
// DEED · SWIPE-BACK — iOS-style gesto „potiahni z ľavej hrany → späť".
// Obalí detailovú obrazovku; ťah začatý pri ľavej hrane posúva obsah
// a po prekročení prahu (alebo švihu) zavolá onBack. Vertikálny scroll
// neruší — gesto sa aktivuje len štartom v hrane + horizontálnym smerom.
// ============================================================
import { useRef, useState, type ReactNode } from "react";

const HRANA = 28;   // px od ľavej hrany, kde gesto začína
const PRAH = 90;    // px ťahu = späť
const SVIH_MS = 260; // rýchly švih = späť aj pri kratšom ťahu

export function SwipeBack({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; t: number; aktivny: boolean } | null>(null);

  const zaciatok = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, t: Date.now(), aktivny: t.clientX <= HRANA };
  };
  const pohyb = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s || !s.aktivny) return;
    const t = e.touches[0];
    const dX = t.clientX - s.x, dY = t.clientY - s.y;
    if (Math.abs(dY) > Math.abs(dX) * 1.2 && dX < 24) { s.aktivny = false; setDx(0); return; } // vertikálny scroll → vzdaj sa gesta
    setDx(Math.max(0, dX));
  };
  const koniec = () => {
    const s = start.current;
    start.current = null;
    if (!s || !s.aktivny) { setDx(0); return; }
    const svih = Date.now() - s.t < SVIH_MS && dx > 36;
    if ((dx > PRAH || svih) && onBack) onBack();
    setDx(0);
  };

  return (
    <div
      onTouchStart={zaciatok} onTouchMove={pohyb} onTouchEnd={koniec} onTouchCancel={koniec}
      style={{ transform: dx ? `translateX(${dx * 0.6}px)` : undefined, transition: dx ? "none" : "transform .25s cubic-bezier(.22,.9,.3,1)", willChange: dx ? "transform" : undefined }}
    >
      {children}
    </div>
  );
}
