// DEED · Úvod (onboarding) — HOTOVÝ KÓD 1 : 1 z prototypu prototypy/Uvitanie.dc.html. Neprepisovať, len zapojiť.
// Potrebuje: uvitanie.css, /svetlusik-let.png (10 snímok vedľa seba), /odznaky/{bronze,silver,gold,platinum,legend}.png (nové orezané štíty z balíka).
// Farby = premenné appky (--bg, --card, --cardBd, --ink, --ink2, --ink3, --gSoft, --gBd, --gInk, --green, --btn). Rozmer plochy 390 × 844 (škáluj obalom).
import { DeedZnacka } from "@/components/DeedZnacka";
import { useEffect, useRef, useState } from 'react';
import './uvitanie.css';

const TEXTY: [string, string][] = [
  ['Skutky, nie reči', 'DEEDGOOD je miesto pre dobré skutky. Bez hádok v komentároch: reaguješ činom. Pomôžeš, daruješ alebo zdieľaš, darovať môžeš už od 0,10 €.'],
  ['Pomoc začína za rohom', 'Vidíš, čo sa deje v tvojej štvrti, v meste aj na celom Slovensku. Okruh si zmeníš jedným ťuknutím.'],
  ['Dôvera sa buduje skutkami', 'Zbierky overuje charita, overovatelia, komunita a náš tím. Peniaze idú priamo žiadateľovi, bez zdržania a nikdy cez účty DEED+. Za každý skutok ti rastie karma a štít, od Bronzového po Legendu.'],
];
const STITY: [string, string][] = [['bronze', 'Bronzový'], ['silver', 'Strieborný'], ['gold', 'Zlatý'], ['platinum', 'Platinový'], ['legend', 'Legenda']];
// Svetlúšik: 1. obrazovka po fázach (0 skrytý · 1 Pomôžeš · 2 Daruješ · 3 Zdieľaš · 4 stred + radosť · 5 vznáša sa)
const FAZY = [{ x: 78, y: 352, s: 0, a: 'none' }, { x: 78, y: 352, s: .8, a: 'uvHover 2.4s ease-in-out infinite' }, { x: 198, y: 352, s: .8, a: 'uvHover 2.4s ease-in-out infinite' }, { x: 315, y: 352, s: .8, a: 'uvHover 2.4s ease-in-out infinite' }, { x: 195, y: 262, s: 1, a: 'uvJoy 1.2s cubic-bezier(.45,0,.25,1) both' }, { x: 195, y: 262, s: 1, a: 'uvHover 4.5s ease-in-out infinite' }];
const POZ = [null, { x: 195, y: 268, s: .72, a: 'uvOrbit 6s linear infinite' }, { x: 272, y: 172, s: .78, a: 'uvHover 4s ease-in-out infinite' }];
const vibruj = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* iOS */ } };
const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...s });

export function Uvitanie({ onHotovo }: { onHotovo: () => void }) {
  const [i, setI] = useState(0), [ph, setPh] = useState(0), [sh, setSh] = useState(0), [koniec, setKoniec] = useState(false);
  const t = useRef<number[]>([]), px = useRef<number | null>(null);
  const zrus = () => { t.current.forEach(clearTimeout); t.current = []; };
  const seq1 = () => { zrus(); setPh(0); [350, 1650, 2950, 4250, 5700].forEach((ms, k) => t.current.push(window.setTimeout(() => setPh(k + 1), ms))); };
  const seq3 = () => { zrus(); setSh(0); [1, 2, 3, 4].forEach((k) => t.current.push(window.setTimeout(() => setSh(k), 1500 * k + 300))); };
  useEffect(() => { if (i === 0) seq1(); if (i === 2) seq3(); return zrus; }, [i]);
  const go = (n: number) => { if (n < 0 || n > 2 || koniec) return; vibruj(5); setI(n); };
  const hotovo = () => { vibruj([8, 40, 12]); setKoniec(true); window.setTimeout(onHotovo, 900); };
  const b = koniec ? { x: 195, y: -140, s: .5, a: 'none' } : i === 0 ? FAZY[ph] : POZ[i]!;
  const hop = i === 0 && ph >= 2 && ph <= 4 ? `${ph % 2 ? 'uvHopA' : 'uvHopB'} 1.05s cubic-bezier(.3,0,.4,1)` : 'none';
  const puff = i === 0 && ph >= 1 && ph <= 4 ? `${ph % 2 ? 'uvPuffA' : 'uvPuffB'} ${ph === 1 ? '.7s' : '1.05s'} ease-out both` : 'none';
  const legenda = i === 2 && sh === 4 && !koniec;
  const cip = (k: number): React.CSSProperties => ({ opacity: ph >= k + 1 ? 1 : 0, transform: ph >= k + 1 ? 'none' : 'translateY(10px) scale(.9)', transition: 'opacity .4s ease .9s, transform .55s cubic-bezier(.34,1.5,.5,1) .9s' });
  const cipS: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--cardBd)', fontSize: 14, fontWeight: 700 };
  const ikona = (d: React.ReactNode, c = 'var(--green)') => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
  const pill = (txt: string, l: number, tp: number, d: number) => <span style={abs({ left: l, top: tp, padding: '3px 9px', borderRadius: 9, background: 'var(--bg)', border: '1px solid var(--gBd)', fontSize: 11.5, fontWeight: 800, color: 'var(--gInk)', opacity: 0, animation: `uvRise .4s ease-out ${d}s forwards` })}>{txt}</span>;
  const iskra = (l: number, tp: number, w: number, dur: number, d: number) => <span style={abs({ left: l, top: tp, width: w, height: w, borderRadius: '50%', background: '#F6B73C', opacity: .2, animation: `uvTwinkle ${dur}s ease-in-out ${d}s infinite` })} />;

  return (
    <div className="uv" style={{ position: 'relative', width: 390, height: 844, overflow: 'hidden', background: 'var(--bg)', touchAction: 'pan-y', userSelect: 'none' }}
      onPointerDown={(e) => (px.current = e.clientX)}
      onPointerUp={(e) => { if (px.current == null) return; const dx = e.clientX - px.current; px.current = null; if (dx < -50 && i < 2) go(i + 1); else if (dx > 50) go(i - 1); }}>
      <div style={abs({ top: 58, right: 22, zIndex: 6, opacity: koniec ? 0 : 1, transition: 'opacity .3s ease' })}>
        <button onClick={hotovo} style={{ border: 'none', background: 'none', padding: '12px 8px', fontSize: 15, fontWeight: 700, color: 'var(--ink3)', cursor: 'pointer' }}>Preskočiť</button>
      </div>
      <div style={abs({ inset: 0, opacity: koniec ? 0 : 1, transition: 'opacity .5s ease' })}>
        <div style={abs({ left: 0, top: 0, width: 1170, height: '100%', display: 'flex', transform: `translateX(${-i * 390}px)`, transition: 'transform .6s cubic-bezier(.45,0,.25,1)' })}>
          {/* 1 · Skutky, nie reči */}
          <div style={{ position: 'relative', width: 390, flex: 'none', height: '100%' }}>
            <div style={abs({ left: 0, right: 0, top: 118, height: 300 })}>
              {i === 0 && ph === 5 && (
                <button onClick={seq1} aria-label="Prehrať znova" style={abs({ right: 22, top: -4, display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 12px', borderRadius: 22, border: '1px solid var(--cardBd)', background: 'var(--card)', fontSize: 13, fontWeight: 700, color: 'var(--ink3)', cursor: 'pointer', animation: 'uvFadeIn .4s ease-out both' })}>
                  {ikona(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>, 'currentColor')}Prehrať znova</button>)}
              <div style={abs({ inset: 0, opacity: ph >= 4 ? 1 : 0, transition: 'opacity .8s ease' })}>
                <div style={abs({ left: '50%', top: 40, width: 240, height: 240, marginLeft: -120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,231,163,.75) 0%,rgba(246,183,60,.28) 38%,rgba(246,183,60,0) 70%)', animation: 'uvGlow 3.2s ease-in-out infinite' })} />
              </div>
              {i === 0 && (
                <div style={abs({ left: 0, right: 0, bottom: -6, display: 'flex', justifyContent: 'center', gap: 10 })}>
                  <div style={{ ...cipS, ...cip(0) }}>{ikona(<path d="M7 10v11H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7" />)}Pomôžeš</div>
                  <div style={{ ...cipS, background: 'var(--gSoft)', border: '1px solid var(--gBd)', fontWeight: 800, color: 'var(--gInk)', ...cip(1) }}>{ikona(<path d="M12 21s-7-4.4-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z" />, 'currentColor')}Daruješ</div>
                  <div style={{ ...cipS, ...cip(2) }}>{ikona(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></>)}Zdieľaš</div>
                </div>)}
            </div>
          </div>
          {/* 2 · Pomoc začína za rohom */}
          <div style={{ position: 'relative', width: 390, flex: 'none', height: '100%' }}>
            <div style={abs({ left: 0, right: 0, top: 118, height: 300 })}>
              {i === 1 && (
                <div style={abs({ left: '50%', top: 150, width: 0, height: 0 })}>
                  <div style={abs({ left: -150, top: -150, width: 300, height: 300, borderRadius: '50%', border: '1.5px dashed var(--gBd)', opacity: 0, animation: 'uvRingIn .7s cubic-bezier(.2,.8,.2,1) .5s forwards' })} />
                  <div style={abs({ left: -100, top: -100, width: 200, height: 200, borderRadius: '50%', border: '1.5px solid var(--gBd)', background: 'rgba(220,227,208,.35)', opacity: 0, animation: 'uvRingIn .7s cubic-bezier(.2,.8,.2,1) .3s forwards' })} />
                  <div style={abs({ left: -52, top: -52, width: 104, height: 104, borderRadius: '50%', background: 'var(--gSoft)', border: '1.5px solid var(--gBd)', opacity: 0, animation: 'uvRingIn .7s cubic-bezier(.2,.8,.2,1) .1s forwards' })} />
                  {pill('štvrť', -26, -66, .7)}{pill('mesto', -28, -113, .9)}{pill('Slovensko', -40, -163, 1.1)}
                  {iskra(78, 40, 9, 2.4, 1.2)}{iskra(-96, 12, 8, 2.8, 1.6)}{iskra(-40, 112, 9, 2.2, 2)}{iskra(112, -92, 7, 3, 1.4)}{iskra(-138, -44, 7, 2.6, 2.3)}{iskra(30, 128, 8, 2.5, 1.9)}
                </div>)}
            </div>
          </div>
          {/* 3 · Dôvera sa buduje skutkami */}
          <div style={{ position: 'relative', width: 390, flex: 'none', height: '100%' }}>
            <div style={abs({ left: 0, right: 0, top: 118, height: 300 })}>
              {i === 2 && (<>
                <div style={abs({ left: '50%', top: 30, width: 200, height: 200, marginLeft: -100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,231,163,.55) 0%,rgba(246,183,60,.15) 45%,rgba(246,183,60,0) 70%)', animation: 'uvGlow 3.6s ease-in-out infinite' })} />
                <div style={abs({ left: '50%', top: 48, width: 140, height: 164, marginLeft: -70 })}>
                  {STITY.map(([f], k) => <img key={f} src={`/odznaky/${f}.png`} alt="" style={abs({ inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: sh === k ? 1 : 0, transform: sh === k ? (k === 4 ? 'scale(1.4) translateY(4px)' : 'scale(1)') : 'scale(.88)', transition: 'opacity .5s ease, transform .8s cubic-bezier(.34,1.4,.5,1)' })} />)}
                </div>
                <div style={abs({ left: 0, right: 0, top: 238, display: 'flex', justifyContent: 'center', gap: 14 })}>
                  {STITY.map(([f, n], k) => (
                    <div key={f} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 52, opacity: sh === 4 ? 0 : sh === k ? 1 : .35, transform: sh === k ? 'scale(1.12)' : 'scale(.9)', transition: 'opacity .4s ease, transform .4s ease' }}>
                      <img src={`/odznaky/${f}.png`} alt="" style={{ width: 28, height: 32, objectFit: 'contain' }} />
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink2)', whiteSpace: 'nowrap' }}>{n}</span>
                    </div>))}
                </div>
              </>)}
            </div>
          </div>
        </div>

        {/* Svetlúšik — jeden, prelieta medzi obrazovkami */}
        <div style={abs({ left: 0, top: 0, width: 0, height: 0, zIndex: 4, transform: `translate(${b.x}px,${b.y}px) scale(${b.s})`, transition: 'transform 1.05s cubic-bezier(.45,0,.55,1)' })}>
          <div style={{ animation: hop }}>
            <div style={{ animation: b.a }}>
              <div style={abs({ left: -60, top: -60, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,231,163,.8) 0%,rgba(246,183,60,0) 65%)', animation: 'uvGlow 1.8s ease-in-out infinite' })} />
              <div style={abs({ left: -46, top: -46, width: 92, height: 92, overflow: 'hidden' })}>
                <div style={abs({ left: 0, top: 0, width: 920, height: 92, background: 'url(/svetlusik-let.png) 0 0/100% 100% no-repeat', animation: 'uvSprite .55s steps(10) infinite' })} />
              </div>
            </div>
          </div>
          <span style={abs({ left: -22, top: 30, width: 44, height: 16, borderRadius: 12, background: '#FBF8F1', boxShadow: '-13px -4px 0 -3px #FBF8F1,12px -6px 0 -2px #FBF8F1,0 4px 10px rgba(120,110,90,.18)', opacity: 0, animation: puff })} />
          {i === 0 && ph === 4 && [0, 60, 120, 180, 240, 300].map((a, k) => (
            <span key={a} style={abs({ left: Math.round(Math.cos(a * Math.PI / 180) * 58), top: Math.round(Math.sin(a * Math.PI / 180) * 58), width: 16, height: 16, margin: '-8px 0 0 -8px', borderRadius: '50%', background: 'radial-gradient(circle,#FFE7A3,rgba(246,183,60,0) 70%)', animation: `uvSpark 1s ease-out ${(0.25 + k * 0.05).toFixed(2)}s both` })} />))}
        </div>

        <div style={abs({ left: 0, right: 0, top: 452, padding: '0 32px', textAlign: 'center', opacity: legenda ? 0 : 1, transition: 'opacity .6s ease' })}>
          <div key={i} style={{ animation: 'uvFadeIn .5s ease-out both' }}>
            <div style={{ fontSize: 29, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.02em', textWrap: 'balance' } as React.CSSProperties}>{TEXTY[i][0]}</div>
            <div style={{ marginTop: 14, fontSize: 16, lineHeight: 1.6, color: 'var(--ink2)', textWrap: 'pretty' } as React.CSSProperties}>{TEXTY[i][1]}</div>
            {i === 0 && <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: 'var(--ink3)' }}><DeedZnacka /> je skrátený názov DEEDGOOD. DeeD je mena, ktorú dostávaš za skutky.</div>}
          </div>
        </div>
        {legenda && (
          <div style={abs({ left: 0, right: 0, top: 470, padding: '0 32px', textAlign: 'center', animation: 'uvFadeIn .8s cubic-bezier(.2,.8,.2,1) .5s both' })}>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.02em', color: '#876712' }}>Staň sa legendou.</div>
            <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.55, color: 'var(--ink2)' }}>Tvoja karma rastie len z tvojich skutkov.</div>
          </div>)}

        <div style={abs({ left: 0, right: 0, bottom: 30, padding: '0 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 })}>
          <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
            {[0, 1, 2].map((k) => <span key={k} style={{ width: 12, height: 12, borderRadius: '50%', background: '#D0CABD' }} />)}
            <span style={abs({ left: 0, top: 0, width: 12, height: 12, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 4px rgba(78,125,55,.18)', transform: `translateX(${i * 22}px)`, transition: 'transform .45s cubic-bezier(.45,0,.25,1)' })} />
          </div>
          <div style={{ width: '100%', display: 'flex', gap: 12 }}>
            {i > 0 && <button onClick={() => go(i - 1)} style={{ flex: 1, height: 58, borderRadius: 18, border: '1px solid var(--cardBd)', background: 'var(--btn)', fontSize: 17, fontWeight: 700, color: 'var(--ink2)', cursor: 'pointer' }}>Späť</button>}
            <button onClick={() => (i === 2 ? hotovo() : go(i + 1))} style={{ flex: 1.4, height: 58, borderRadius: 18, border: 'none', background: 'linear-gradient(90deg,#4B7A35,#8DB866)', fontSize: 17, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 10px 24px rgba(75,122,53,.28)' }}>{i === 2 ? 'Poďme na to' : 'Ďalej'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
