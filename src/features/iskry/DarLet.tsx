import React, { useEffect, useRef } from 'react';

// KARTA 41 · DarLet z odovzdania (kod/DarLet.tsx) — bez zmeny letu. Doplnené len voliteľné polohy (start, ciel, iskry),
// aby sedeli pri inej výške obrazovky ako 390 × 844 (PC, tablet); bez nich platia pôvodné čísla.
// DarLet — cudzí dar letí od tlačidla Darovať do živého pásu. Nesú ho dvaja Svetlúšikovia (sprite svetlusik-let.png).
// Pravidlá: len transform/opacity (Web Animations API), naraz 1 let (rad rieši rodič, viď useDarRad),
// prefers-reduced-motion → bez letu (zavolá onKoniec hneď), meno len so súhlasom, dar do 2 € bez sumy.
// Umiestnenie: rodič je position:relative obal obrazovky Iskry; DarLet sedí pri Darovať (right:70, bottom:230).
// Ciel letu (-110, -392) je stred pásu pod filtrami pri 390 × 844 — pri inom rozložení zmeň CIEL.

export type Dar = { suma: number; meno?: string | null; zbierka?: string; autor?: string; moj?: boolean };
// moj: môj vlastný dar → meno „Vy · ďakujeme", letí hneď po zaplatení (predbehne rad), ten istý let.
const CIEL = { x: -104, y: -350 }; // dopad = zastavenie v páse, ďalej nestúpa
const eur = (n: number) => new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 2 }).format(n) + ' €';
export const darHlavne = (d: Dar) => (d.suma > 2 ? `+${eur(d.suma)} · ` : 'Dar · ') + (d.meno || 'anonymne');
export const darKam = (d: Dar) => d.zbierka || `pre ${d.autor}`;
const obmedzit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Svetlusik({ zrkadlo, spRef }: { zrkadlo?: boolean; spRef: React.RefObject<HTMLSpanElement> }) {
  return (
    <>
      <span style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,196,92,.55),rgba(255,196,92,0) 66%)' }} />
      <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: zrkadlo ? 'scaleX(-1)' : undefined }}>
        <span ref={spRef} style={{ position: 'absolute', left: 0, top: 0, width: 340, height: 34, background: 'url(/svetlusik-let.png) 0 0/100% 100% no-repeat' }} />
      </span>
    </>
  );
}

// onPas: zavolá sa tesne pred dopadom (2,9 s) → pás ukáže dar 5 s. onKoniec: let skončil → rodič pustí ďalší z radu.
export type PolohaLetu = { start?: { right: number; bottom: number }; ciel?: { x: number; y: number }; iskry?: { left: number; top: number } };
export function DarLet({ dar, onPas, onKoniec, poloha }: { dar: Dar; onPas: (d: Dar) => void; onKoniec: () => void; poloha?: PolohaLetu }) {
  const C = poloha?.ciel ?? CIEL, S = poloha?.start ?? { right: 70, bottom: 230 }, IS = poloha?.iskry ?? { left: 135, top: 228 };
  const root = useRef<HTMLDivElement>(null), a = useRef<HTMLDivElement>(null), b = useRef<HTMLDivElement>(null);
  const spA = useRef<HTMLSpanElement>(null), spB = useRef<HTMLSpanElement>(null), isk = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (obmedzit()) { onPas(dar); const t = setTimeout(onKoniec, 1500); return () => clearTimeout(t); }
    const loop = [
      ...[spA, spB].map((r, k) => r.current!.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-100%)' }],
        { duration: 480, iterations: Infinity, easing: 'steps(10)', delay: k * 140 })),        // mávanie (len horné krídla — sú v zábere)
      ...[a, b].map((r, k) => r.current!.animate([{ transform: 'translateY(0) rotate(-5deg)' }, { transform: 'translateY(-4px) rotate(5deg)' }],
        { duration: 640, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: k * 320 })), // hojdanie pri nesení
    ];
    const let_ = root.current!.animate([
      { opacity: 0, transform: 'translate(0,0) scale(.8)', offset: 0 },
      { opacity: 1, transform: 'translate(0,-24px) scale(1)', offset: .12, easing: 'cubic-bezier(.45,0,.35,1)' },
      { opacity: 1, transform: `translate(${C.x + 4}px,${C.y}px) scale(.95)`, offset: .75, easing: 'ease-in' },
      { opacity: 0, transform: `translate(${C.x}px,${C.y}px) scale(.6)`, offset: 1 },
    ], { duration: 3400, easing: 'cubic-bezier(.3,0,.3,1)' });
    const t = setTimeout(() => {
      Array.from(isk.current!.children).forEach((c, k) => {
        const u = k / 8 * Math.PI * 2 + .3, r = 14 + (k % 2) * 10;
        (c as HTMLElement).animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(u) * r}px,${Math.sin(u) * r * .6}px) scale(.3)`, opacity: 0 }],
          { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)' });
      });
      onPas(dar);
    }, 2900);
    let_.onfinish = () => { loop.forEach(x => x.cancel()); onKoniec(); };
    return () => { clearTimeout(t); let_.cancel(); loop.forEach(x => x.cancel()); };
  }, [dar]); // eslint-disable-line react-hooks/exhaustive-deps

  const svet: React.CSSProperties = { position: 'absolute', top: -26, width: 34, height: 34 };
  return (
    <>
      <div ref={root} style={{ position: 'absolute', right: S.right, bottom: S.bottom, opacity: 0, pointerEvents: 'none', zIndex: 20 }}>
        <div style={{ minWidth: 132, maxWidth: 190, padding: '8px 12px', borderRadius: 12, background: '#2F5E3A',
          boxShadow: '0 0 0 1px rgba(255,210,122,.6),0 0 16px rgba(255,196,92,.35),0 6px 18px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{darHlavne(dar)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#D6E8CB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{darKam(dar)}</span>
        </div>
        <div ref={a} style={{ ...svet, left: -18 }}><Svetlusik zrkadlo spRef={spA} /></div>
        <div ref={b} style={{ ...svet, right: -18 }}><Svetlusik spRef={spB} /></div>
      </div>
      {/* iskry v páse — absolútne nad stredom pásu (v prototype left:135, top:186 v obrazovke) */}
      <div ref={isk} style={{ position: 'absolute', left: IS.left, top: IS.top, width: 0, height: 0, pointerEvents: 'none', zIndex: 21 }}>
        {Array.from({ length: 8 }).map((_, k) => (
          <span key={k} style={{ position: 'absolute', left: -2, top: -2, width: 4, height: 4, borderRadius: '50%', background: '#FFE3A3',
            boxShadow: '0 0 6px 2px rgba(255,196,92,.7)', opacity: 0 }} />
        ))}
      </div>
    </>
  );
}

// Rad: naraz 1 let; keď čaká viac ako 3, zhrnú sa do pásu („+12 darov za minútu") a nelietajú.
export function useDarRad(onZhrnutie: (n: number) => void) {
  const [aktualny, setAktualny] = React.useState<Dar | null>(null);
  const rad = useRef<Dar[]>([]);
  const pridaj = (d: Dar) => {
    if (!aktualny && rad.current.length === 0) { setAktualny(d); return; }
    rad.current.push(d);
    if (rad.current.length > 3) { onZhrnutie(rad.current.length); rad.current = []; }
  };
  const pridajMoj = (d: Dar) => { const m = { ...d, moj: true, meno: 'Vy · ďakujeme' }; if (!aktualny) setAktualny(m); else rad.current.unshift(m); };
  const dalsi = () => setAktualny(rad.current.shift() ?? null);
  return { aktualny, pridaj, pridajMoj, dalsi };
}
// Použitie:
// const { aktualny, pridaj, dalsi } = useDarRad(n => pas.ukaz(`+${n} ${n >= 5 ? 'darov' : 'dary'} za minútu`));
// {aktualny && <DarLet key={aktualny.id} dar={aktualny} onPas={d => pas.ukaz(darHlavne(d), darKam(d))} onKoniec={dalsi} />}
// Pás: ukáže dar 5 s (crossfade opacity 220 ms), potom späť „DNES V ISKRÁCH · suma · N. dar".
