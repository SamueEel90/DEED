// DEED · hotové komponenty s animáciami — MIKRODAR dlaždica a POĎAKOVANIE po dare (svetlý hárok).
// Vzhľad a časovanie 1 : 1 z prototypu. Farby = premenné z farby.css. Potrebuje animacie.ts + animacie.css.
import { useEffect, useRef, useState } from 'react';
import { letSvetielko, roj, pocitadlo, vibruj } from './animacie';

/* ───────── MIKRODAR (DEED / EURC dlaždica) — klik a hneď odíde ─────────
   Použitie:
   <MikrodarDlazdica suma={100} jednotka="DeeD" eur={1} najcastejsie root={obrazovkaRef} ciel={koniecPruhuRef}
     onOdoslane={async () => await api.mikrodar(zbierkaId, 100, 'DEED')} onDoleteli={(eur) => navysSumu(eur)} />
   ciel = element na konci pruhu karty stavu (data-bar-end). */
type MikroProps = { suma: number | string; jednotka: 'DeeD' | 'EURC'; eur: number; najcastejsie?: boolean;
  root: React.RefObject<HTMLElement>; ciel: React.RefObject<HTMLElement>; blokovane?: boolean;
  onOdoslane: () => Promise<void> | void; onDoleteli: (eur: number) => void; };
export function MikrodarDlazdica({ suma, jednotka, eur, najcastejsie, root, ciel, blokovane, onOdoslane, onDoleteli }: MikroProps) {
  const [odoslane, setOdoslane] = useState(false);
  const eurTxt = '≈ ' + eur.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const klik = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (odoslane || blokovane || !root.current || !ciel.current) return;
    vibruj(8); setOdoslane(true);
    const el = e.currentTarget;
    onOdoslane();                                   // platba ide hneď, bez okna
    await letSvetielko(root.current, el, ciel.current, `+${suma} ${jednotka}`);
    onDoleteli(eur);                                // tu navýš sumu zbierky (pocitadlo 600 ms)
    setTimeout(() => setOdoslane(false), 950);      // „Odoslané" spolu 1,6 s
  };
  const top = najcastejsie && !odoslane;
  return (
    <button onClick={klik} className="deed-anim" style={{ position: 'relative', height: 66, borderRadius: 16, cursor: 'pointer',
      background: odoslane ? 'var(--gSoft)' : najcastejsie ? 'var(--bCard)' : 'var(--card)',
      border: `1px solid ${odoslane ? 'var(--gBd)' : najcastejsie ? 'var(--bBd)' : 'var(--cardBd)'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      transition: 'background .3s ease, border-color .3s ease, transform .15s ease' }}
      onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(.96)')} onPointerUp={(e) => (e.currentTarget.style.transform = '')} onPointerLeave={(e) => (e.currentTarget.style.transform = '')}>
      {top && <span style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', padding: '2px 8px', borderRadius: 7, background: 'var(--blue)', color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', whiteSpace: 'nowrap' }}>NAJČASTEJŠIE</span>}
      {odoslane
        ? <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gInk)' }}>Odoslané</span>
        : <>
            <span style={{ fontSize: 20, fontWeight: 800, color: najcastejsie ? 'var(--blue)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{suma} <span style={{ fontSize: 11.5, fontWeight: 700 }}>{jednotka}</span></span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink3)' }}>{eurTxt}</span>
          </>}
    </button>
  );
}

/* ───────── POĎAKOVANIE PO DARE (obsah hárku v kroku Hotovo, svetlý režim) ─────────
   Poradie a časy presne ako prototyp:
   0 ms      Svetlúšik (128 px, sprite .55 s + let flyPath 5,5 s), „Ďakujeme, {meno}.", veľká suma
   350 ms    roj z maskota na koniec pruhu (1 svetlúšik / €, max 40)
   ~land     pruh sa posunie (krok 1) · +500 ms hláška a dorovnanie firmy (krok 2) · +400 ms karma (krok 3, len registrovaný)
   Tmavý režim = PoDare.tsx. */
type PodProps = { meno?: string; registrovany: boolean; eur: number; sumaTxt: string; dorovnanieTxt?: string; firma?: string;
  predPct: number; poPct: number; poTxt: string; poPctTxt: string; hlaska: string;
  karmaPridane?: number; karmaSpolu?: number; karmaDoDalsej?: number; karmaPostup?: number;
  kodPripisania?: string; onRegistrovat?: () => void; onHotovo: () => void; };
export function PodakovaniePoDare(p: PodProps) {
  const root = useRef<HTMLDivElement>(null), maskot = useRef<HTMLDivElement>(null), koniec = useRef<HTMLDivElement>(null);
  const [krok, setKrok] = useState(0), [karma, setKarma] = useState(p.karmaSpolu ? p.karmaSpolu - (p.karmaPridane || 0) : 0);
  useEffect(() => {
    const t: number[] = [];
    t.push(window.setTimeout(() => {
      if (!root.current || !maskot.current || !koniec.current) return;
      const land = 350 + roj(root.current, maskot.current, koniec.current, p.eur);
      t.push(window.setTimeout(() => setKrok(1), Math.max(450, land - 600)));
      t.push(window.setTimeout(() => setKrok(2), land - 100));
      if (p.registrovany && p.karmaPridane) t.push(window.setTimeout(() => { setKrok(3); pocitadlo(karma, p.karmaSpolu || 0, 700, (v) => setKarma(Math.round(v))); }, land + 300));
    }, 350));
    return () => t.forEach(clearTimeout);
  }, []);
  const fade = (vidno: boolean) => ({ opacity: vidno ? 1 : 0, transform: vidno ? 'none' : 'translateY(8px)', transition: 'opacity .4s ease, transform .5s cubic-bezier(.2,.8,.2,1)' });
  return (
    <div ref={root} className="deed-anim" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 6 }}>
        <div ref={maskot} style={{ animation: 'flyPath 5.5s ease-in-out infinite' }}>
          <div style={{ position: 'relative', width: 128, height: 128, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1280, height: 128, background: 'url(/svetlusik-let.png) 0 0/100% 100% no-repeat', animation: 'sprite .55s steps(10) infinite' }} />
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{p.registrovany && p.meno ? `Ďakujeme, ${p.meno}.` : 'Ďakujeme.'}</div>
        <div style={{ marginTop: 16, fontSize: 46, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{p.sumaTxt}</div>
        {p.dorovnanieTxt && <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink2)', ...fade(krok >= 2) }}>tvojich {p.sumaTxt} + <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{p.dorovnanieTxt} od {p.firma}</span></div>}
      </div>
      <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--card)', border: '1px solid var(--cardBd)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}><span>{p.poTxt}</span><span style={{ color: 'var(--green)' }}>{p.poPctTxt}</span></div>
        <div style={{ position: 'relative', height: 10, borderRadius: 10, background: 'var(--track)', overflow: 'hidden', marginTop: 8 }}>
          <div style={{ position: 'absolute', inset: 0, background: '#4B7A35', transformOrigin: '0 50%', transform: `scaleX(${krok >= 1 ? p.poPct : p.predPct})`, transition: 'transform .55s cubic-bezier(.34,1.3,.5,1)' }} />
        </div>
        <div style={{ position: 'relative', height: 0 }}><div ref={koniec} style={{ position: 'absolute', top: -5, left: `${p.predPct * 100}%`, width: 0, height: 0 }} /></div>
        <div style={{ marginTop: 10, fontSize: 15.5, fontWeight: 700, ...fade(krok >= 2) }}>{p.hlaska}</div>
      </div>
      {p.registrovany && p.karmaPridane != null && (
        <div style={{ padding: '14px 16px', borderRadius: 16, background: 'var(--kBg, var(--card))', border: '1px solid var(--kBd, var(--cardBd))', display: 'flex', alignItems: 'center', gap: 14, ...fade(krok >= 3) }}>
          <span style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: 'radial-gradient(circle,#FFE7A3 0%,#F6B73C 38%,rgba(246,183,60,0) 72%)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 15.5, fontWeight: 800 }}>Karma +{p.karmaPridane}</span><span style={{ fontSize: 12.5, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>spolu {karma.toLocaleString('sk-SK')}</span></div>
            <div style={{ position: 'relative', height: 6, borderRadius: 6, background: 'var(--cardBd)', overflow: 'hidden', marginTop: 7 }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#D9A93A,#F6B73C)', transformOrigin: '0 50%', transform: `scaleX(${krok >= 3 ? p.karmaPostup || 0 : 0})`, transition: 'transform .7s cubic-bezier(.34,1.3,.5,1)' }} /></div>
            {p.karmaDoDalsej != null && <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 5 }}>do ďalšej úrovne chýba {p.karmaDoDalsej.toLocaleString('sk-SK')}</div>}
          </div>
        </div>
      )}
      {!p.registrovany && (
        <div style={{ padding: 16, borderRadius: 16, background: 'var(--gCard)', border: '1px solid var(--gBd)', display: 'flex', flexDirection: 'column', gap: 6, ...fade(krok >= 2) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 26, height: 26, borderRadius: '50%', background: 'radial-gradient(circle,#FFE7A3 0%,#F6B73C 38%,rgba(246,183,60,0) 72%)' }} /><span style={{ fontSize: 15.5, fontWeight: 800 }}>Tvoj dar čaká na meno</span></div>
          <div style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--ink2)' }}>Za tento dar by si mal <b style={{ color: 'var(--gInk)' }}>+{Math.max(1, Math.round(p.eur))} karmy</b> a v zozname by stálo tvoje meno. Zatiaľ je tam Anonymný darca.</div>
          <button onClick={p.onRegistrovat} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 14, fontWeight: 800, color: 'var(--gInk)' }}>Zaregistrovať sa a pripísať dar ›</button>
          {p.kodPripisania && <div style={{ fontSize: 12.5, color: 'var(--ink2)' }}>Neskôr ho pripíšeš kódom z dokladu: <b style={{ fontVariantNumeric: 'tabular-nums' }}>{p.kodPripisania}</b></div>}
        </div>
      )}
      <button onClick={p.onHotovo} style={{ height: 54, borderRadius: 16, border: 'none', background: 'linear-gradient(90deg,#4B7A35,#8DB866)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>Hotovo</button>
    </div>
  );
}
