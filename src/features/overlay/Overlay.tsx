// src/features/overlay/Overlay.tsx
// Počítadlo do streamu — pás, bublina, iskry, míľniky, bodka naživo.
// Všetky animácie sú CSS / Web Animations API (žiadny canvas) — kvôli CPU streamera.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { StavOverlay } from './zdroj';

type Props = {
  stav: StavOverlay;
  splitId: string;
  tema?: 'tmava' | 'svetla';      // tmavá = tmavý pás na SVETLÉ video; svetlá = svetlý pás na TMAVÉ video
  paleta?: 'aurora' | 'znacka';   // rozhodnutie zatiaľ otvorené
  orientacia?: 'sirka' | 'vyska'; // ?orientacia=vyska — zvislý stĺpec (OBS 420 × 640)
  strana?: 'vlavo' | 'vpravo';    // ?strana=vlavo — len pri 'vyska'; bublina a iskry idú vždy do obrazu
};

const TEMY = {
  tmava: {
    pas: 'rgba(8,10,16,.62)', okraj: 'rgba(255,255,255,.14)', text: '#ffffff', text2: 'rgba(255,255,255,.75)',
    tien: '0 2px 6px rgba(0,0,0,.85)', zliabok: 'rgba(255,255,255,.18)', live: '#3FA66B', liveOff: 'rgba(255,255,255,.35)', pulz: 'ovPulzD',
  },
  svetla: {
    pas: 'rgba(255,255,255,.72)', okraj: 'rgba(0,0,0,.10)', text: '#10131a', text2: 'rgba(16,19,26,.75)',
    tien: '0 1px 2px rgba(255,255,255,.7)', zliabok: 'rgba(0,0,0,.12)', live: '#2E7D52', liveOff: 'rgba(0,0,0,.30)', pulz: 'ovPulzL',
  },
} as const;

const PALETY = {
  aurora: { vypln: 'linear-gradient(90deg,#5B9BFF,#8B7CFF 55%,#43E0C8)', pilulka: 'linear-gradient(135deg,#5B9BFF 0%,#8B7CFF 52%,#43E0C8 118%)', ziara: '0 0 16px rgba(116,166,255,.55)', iskry: ['#5B9BFF', '#8B7CFF', '#43E0C8', '#B7ADFF', '#ffffff'] },
  znacka: { vypln: 'linear-gradient(90deg,#2E9E62,#3FA66B 45%,#E8B64A)', pilulka: 'linear-gradient(135deg,#2E9E62 0%,#3FA66B 45%,#D9A43A 110%)', ziara: '0 0 16px rgba(232,182,74,.5)', iskry: ['#3FA66B', '#6CCB8F', '#E8B64A', '#F5D37E', '#ffffff'] },
} as const;

const TRVANIE_BUBLINY = 4500;
const VYPADOK_PO = 30_000;
const PRUZINA = 'cubic-bezier(.34,1.45,.5,1)'; // mierny prekmit a dosadnutie

const KEYFRAMES = `
@keyframes ovLesk{from{transform:translateX(-120%)}to{transform:translateX(320%)}}
@keyframes ovLeskV{from{transform:translateY(120%)}to{transform:translateY(-320%)}}
@keyframes ovPulzD{0%{box-shadow:0 0 0 0 rgba(63,166,107,.75)}100%{box-shadow:0 0 0 8px rgba(63,166,107,0)}}
@keyframes ovPulzL{0%{box-shadow:0 0 0 0 rgba(46,125,82,.6)}100%{box-shadow:0 0 0 8px rgba(46,125,82,0)}}`;

const fmt = (n: number) => Math.round(n).toLocaleString('sk-SK');

// Míľniky sa ukážu raz — pamätajú sa per split + zbierka, prežijú reštart overlayu.
const kluc = (splitId: string, nazov: string) => `deed-overlay-milniky:${splitId}:${nazov}`;
const citajMilniky = (k: string): number[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const ulozMilnik = (k: string, p: number) => { try { localStorage.setItem(k, JSON.stringify([...citajMilniky(k), p])); } catch { /* OBS bez storage — nevadí */ } };
/** Pre demo: po dosiahnutí cieľa zavolaj pred návratom na začiatok. */
export const vymazMilniky = (splitId: string, nazov: string) => { try { localStorage.removeItem(kluc(splitId, nazov)); } catch { /* */ } };

export default function Overlay({ stav, splitId, tema = 'tmava', paleta = 'znacka', orientacia = 'sirka', strana = 'vpravo' }: Props) {
  const T = TEMY[tema];
  const P = PALETY[paleta];
  const V = orientacia === 'vyska';
  const R = strana === 'vpravo';

  const pasRef = useRef<HTMLDivElement>(null);
  const sumaRef = useRef<HTMLSpanElement>(null);
  const darcaRef = useRef<HTMLDivElement>(null);
  const vyplnRef = useRef<HTMLDivElement>(null);
  const hlavaRef = useRef<HTMLDivElement>(null);
  const bublinyRef = useRef<HTMLDivElement>(null);

  const [zobrazene, setZobrazene] = useState(stav.vyzbierane);
  const [teraz, setTeraz] = useState(Date.now());
  const predosla = useRef({ pecat: stav.pecat, vyzbierane: stav.vyzbierane, nazov: stav.nazov });
  const rafRef = useRef(0);

  // 1) Priehľadné pozadie — appkový index.css kreslí telu vlastné.
  useLayoutEffect(() => {
    const h = document.documentElement, b = document.body;
    const povodne = [h.style.background, b.style.background];
    h.style.background = 'transparent';
    b.style.background = 'transparent';
    const st = document.createElement('style');
    st.textContent = KEYFRAMES;
    document.head.appendChild(st);
    return () => { h.style.background = povodne[0]; b.style.background = povodne[1]; st.remove(); };
  }, []);

  // Hodiny pre bodku naživo (1× za sekundu stačí).
  useEffect(() => { const id = setInterval(() => setTeraz(Date.now()), 1000); return () => clearInterval(id); }, []);

  // Zmena zbierky (kaskáda / demo reset) — bez oslavy, len plynulé napočítanie.
  useEffect(() => {
    if (predosla.current.nazov !== stav.nazov) {
      predosla.current = { pecat: stav.pecat, vyzbierane: stav.vyzbierane, nazov: stav.nazov };
      napocitaj(stav.vyzbierane);
    }
  }, [stav.nazov]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nový dar.
  useEffect(() => {
    const pred = predosla.current;
    if (stav.pecat === pred.pecat || stav.nazov !== pred.nazov) return;
    const z = pred.vyzbierane;
    predosla.current = { pecat: stav.pecat, vyzbierane: stav.vyzbierane, nazov: stav.nazov };
    napocitaj(stav.vyzbierane);

    const suma = stav.poslednaSuma ?? Math.max(0, stav.vyzbierane - z);
    const velky = suma >= 20;
    if (stav.poslednyDarca) bublina(`+${fmt(suma)} €`, `${stav.poslednyDarca} — ďakujeme ♥`);
    iskry(velky ? 26 : 12, velky, 650);
    zvyrazni(velky);

    // Míľniky — každý raz.
    const k = kluc(splitId, stav.nazov), uz = citajMilniky(k);
    const pomer = stav.vyzbierane / stav.ciel;
    if (pomer >= 1 && !uz.includes(100)) {
      ulozMilnik(k, 100);
      setTimeout(oslava, 1300);
    } else {
      const m = [75, 50].find((p) => pomer >= p / 100 && !uz.includes(p));
      if (m) { ulozMilnik(k, m); setTimeout(() => milnik(m), 2600); }
    }
  }, [stav.pecat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function napocitaj(na: number) {
    cancelAnimationFrame(rafRef.current);
    const od = zobrazeneRef.current, t0 = performance.now(), dur = 1100;
    const krok = (t: number) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      setZobrazene(od + (na - od) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(krok);
    };
    rafRef.current = requestAnimationFrame(krok);
  }
  const zobrazeneRef = useRef(zobrazene);
  zobrazeneRef.current = zobrazene;

  function zvyrazni(velky: boolean) {
    pasRef.current?.animate([
      { boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
      { boxShadow: `0 0 0 ${velky ? 3 : 2}px rgba(255,255,255,.45), 0 0 ${velky ? 50 : 28}px rgba(255,255,255,.25)`, offset: 0.25 },
      { boxShadow: '0 0 0 0 rgba(255,255,255,0)' },
    ], { duration: 1600, easing: 'cubic-bezier(.2,.8,.2,1)' });
    sumaRef.current?.animate([{ transform: 'scale(1)' }, { transform: `scale(${velky ? 1.09 : 1.05})`, offset: 0.3 }, { transform: 'scale(1)' }], { duration: 900, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    darcaRef.current?.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 150, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  }

  // Bublina — druhá nahradí prvú, nestohujú sa.
  function bublina(pilulkaText: string, text: string) {
    const box = bublinyRef.current; if (!box) return;
    Array.from(box.children).forEach((c) => {
      c.getAnimations().forEach((a) => a.cancel());
      c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px) scale(.96)' }], { duration: 220, fill: 'forwards', easing: 'ease-in' }).onfinish = () => c.remove();
    });
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute', left: '0', bottom: '6px', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '100%',
      padding: '8px 18px 8px 8px', borderRadius: '99px', background: T.pas, border: `1px solid ${T.okraj}`,
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: T.text, textShadow: T.tien,
      fontSize: '20px', fontWeight: '700', whiteSpace: 'nowrap',
    });
    const pil = document.createElement('span');
    Object.assign(pil.style, { display: 'flex', alignItems: 'center', flex: 'none', height: '38px', padding: '0 14px', borderRadius: '99px', background: P.pilulka, color: '#fff', fontWeight: '800', fontSize: '19px', textShadow: '0 1px 2px rgba(0,0,0,.35)' });
    pil.textContent = pilulkaText;
    const t = document.createElement('span');
    Object.assign(t.style, { overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '0' });
    t.textContent = text;
    if (V) {
      // zvislá verzia: bublina pri stĺpci, vo výške konca pruhu, zalamuje sa
      Object.assign(el.style, {
        left: R ? 'auto' : '0', right: R ? '0' : 'auto', bottom: 'auto', flexDirection: 'column',
        alignItems: R ? 'flex-end' : 'flex-start', gap: '6px', padding: '10px 14px 12px', borderRadius: '18px',
        whiteSpace: 'normal', maxWidth: '240px', fontSize: '18px', lineHeight: '1.3', textAlign: R ? 'right' : 'left',
      });
      const h = hlavaRef.current;
      let top = box.offsetHeight / 2 - 50;
      if (h) top = h.getBoundingClientRect().top - box.getBoundingClientRect().top - 50;
      el.style.top = `${Math.max(0, Math.min(box.offsetHeight - 120, top))}px`;
    }
    el.append(pil, t);
    box.appendChild(el);
    const inX = V ? (R ? 24 : -24) : 0, inY = V ? 0 : 22;
    el.animate([{ opacity: 0, transform: `translate(${inX}px,${inY}px) scale(.92)` }, { opacity: 1, transform: `translate(${-inX / 8}px,${-inY / 7}px) scale(1.01)`, offset: 0.6 }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    pil.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.14)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 560, delay: 220, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
    el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-18px)' }], { duration: 500, delay: TRVANIE_BUBLINY - 500, easing: 'ease-in', fill: 'forwards' }).onfinish = () => el.remove();
  }

  // Iskry z konca pruhu — DOM + WAAPI, po dobehnutí sa odstránia.
  function iskry(n: number, velky: boolean, oneskorenie: number) {
    setTimeout(() => {
      const h = hlavaRef.current; if (!h) return;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span'), srdce = i % 4 === 0, c = P.iskry[i % P.iskry.length];
        Object.assign(s.style, srdce
          ? { position: 'absolute', left: '0', top: '0', fontSize: velky ? '17px' : '14px', color: c, lineHeight: '1', textShadow: '0 1px 3px rgba(0,0,0,.4)' }
          : { position: 'absolute', left: '0', top: '0', width: velky ? '6px' : '5px', height: velky ? '6px' : '5px', borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` });
        if (srdce) s.textContent = '♥';
        h.appendChild(s);
        const zaklad = V ? (R ? Math.PI : 0) : -Math.PI / 2; // do obrazu
        const a = zaklad + (Math.random() - 0.5) * 2.2, d = (velky ? 60 : 40) + Math.random() * (velky ? 80 : 50);
        s.animate([
          { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
          { transform: `translate(-50%,-50%) translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(1)`, opacity: 0.95, offset: 0.55 },
          { transform: `translate(-50%,-50%) translate(${Math.cos(a) * d * 1.15}px,${Math.sin(a) * d * 1.15 + 24}px) scale(.6)`, opacity: 0 },
        ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.15,.7,.3,1)' }).onfinish = () => s.remove();
      }
    }, oneskorenie);
  }

  function milnik(p: number) {
    bublina(`${p} %`, p === 50 ? 'Polovica je tu — ďakujeme všetkým' : 'Tri štvrtiny — ďakujeme všetkým');
    iskry(16, false, 300);
  }

  function oslava() {
    bublina('100 %', 'Cieľ splnený — ďakujeme ♥');
    iskry(40, true, 200);
    iskry(34, true, 700);
    vyplnRef.current?.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.7)' }, { filter: 'brightness(1)' }], { duration: 700, iterations: 3 });
  }

  const pct = Math.min(100, (stav.vyzbierane / stav.ciel) * 100);
  const pctText = Math.floor((zobrazene / stav.ciel) * 100);
  const chyba = stav.ciel - zobrazene;
  const nazivo = teraz - stav.naposledy < VYPADOK_PO;
  const pruhPrechod = `1.3s ${PRUZINA}`;
  const zostatok = chyba <= 0 ? 'cieľ splnený' : `do cieľa chýba ${fmt(chyba)} €`;
  const bodka = { width: 9, height: 9, borderRadius: '50%', flex: 'none', background: nazivo ? T.live : T.liveOff, animation: nazivo ? `${T.pulz} 1.8s ease-out infinite` : 'none', transition: 'background .4s ease' } as const;

  if (V) {
    // ---- ZVISLÁ VERZIA: stĺpec 160 px pri okraji + 250 px priestor pre bublinu smerom do obrazu ----
    return (
      <div style={{ position: 'relative', width: '100%', height: '100vh', minHeight: 480, fontFamily: "'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif", WebkitFontSmoothing: 'antialiased' }}>
        <div ref={bublinyRef} style={{ position: 'absolute', top: 0, bottom: 0, [R ? 'right' : 'left']: 170, width: 250, pointerEvents: 'none' }} />
        <div ref={pasRef} style={{
          position: 'absolute', top: 0, bottom: 0, [R ? 'right' : 'left']: 0, width: 160, borderRadius: 20, boxSizing: 'border-box',
          background: T.pas, border: `1px solid ${T.okraj}`, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          padding: '16px 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', textShadow: T.tien }}>
            <span style={bodka} />
            <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, color: T.text2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{stav.nazov}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textShadow: T.tien, whiteSpace: 'nowrap' }}>
            <span ref={sumaRef} style={{ display: 'inline-block', fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.05, color: T.text, fontVariantNumeric: 'tabular-nums' }}>{fmt(zobrazene)} €</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text2 }}>z {fmt(stav.ciel)} €</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{pctText} %</span>
          </div>
          <div style={{ position: 'relative', flex: 1, minHeight: 60, width: 14, borderRadius: 14, background: T.zliabok }}>
            <div ref={vyplnRef} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${pct}%`, minHeight: 14, borderRadius: 14, background: P.vypln.replace('90deg', '0deg'), boxShadow: P.ziara, transition: `height ${pruhPrechod}`, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%', background: 'linear-gradient(0deg,rgba(255,255,255,0),rgba(255,255,255,.5),rgba(255,255,255,0))', animation: 'ovLeskV 3.2s ease-in-out infinite' }} />
            </div>
            <div ref={hlavaRef} style={{ position: 'absolute', left: '50%', bottom: `${pct}%`, width: 0, height: 0, transition: `bottom ${pruhPrechod}` }} />
          </div>
          {stav.poslednyDarca && (
            <div ref={darcaRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%', textShadow: T.tien }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.text2, letterSpacing: '.06em' }}>POSLEDNÝ DAR</span>
              <span style={{ maxWidth: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 15, fontWeight: 800, color: T.text }}>{stav.poslednyDarca}</span>
              {stav.poslednaSuma != null && <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{fmt(stav.poslednaSuma)} €</span>}
            </div>
          )}
          <div style={{ width: '100%', paddingTop: 8, borderTop: `1px solid ${T.okraj}`, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, color: T.text2, textShadow: T.tien, fontVariantNumeric: 'tabular-nums' }}>{zostatok}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', minHeight: 200, fontFamily: "'Plus Jakarta Sans', -apple-system, 'Segoe UI', sans-serif", WebkitFontSmoothing: 'antialiased', overflow: 'visible' }}>
      <div ref={bublinyRef} style={{ position: 'absolute', left: 0, right: 0, bottom: 126, height: 74, pointerEvents: 'none' }} />

      <div ref={pasRef} style={{
        position: 'absolute', left: 0, right: 0, bottom: 26, height: 100, borderRadius: 20,
        background: T.pas, border: `1px solid ${T.okraj}`, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        padding: '13px 22px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 15, fontWeight: 700, color: T.text2, textShadow: T.tien }}>
              <span style={bodka} />
              {/* pri užšom okne sa ako prvý skracuje názov */}
              <span style={{ minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{stav.nazov}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 3, whiteSpace: 'nowrap', textShadow: T.tien }}>
              <span ref={sumaRef} style={{ display: 'inline-block', flex: 'none', fontSize: 38, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, color: T.text, fontVariantNumeric: 'tabular-nums', transformOrigin: '0 70%' }}>{fmt(zobrazene)} €</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.text2, flex: 'none' }}>z {fmt(stav.ciel)} €</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: T.text2, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>· {pctText} %</span>
            </div>
          </div>
          {stav.poslednyDarca && (
            <div ref={darcaRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, textShadow: T.tien, flex: '0 1 auto', minWidth: 0, maxWidth: '45%' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: T.text2, letterSpacing: '.06em' }}>POSLEDNÝ DAR</span>
              <span style={{ display: 'flex', maxWidth: '100%', whiteSpace: 'nowrap', fontSize: 18, fontWeight: 800, color: T.text }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{stav.poslednyDarca}</span>
                {stav.poslednaSuma != null && <span style={{ flex: 'none' }}>&nbsp;· {fmt(stav.poslednaSuma)} €</span>}
              </span>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', height: 12, borderRadius: 12, background: T.zliabok }}>
          <div ref={vyplnRef} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, minWidth: 12, borderRadius: 12, background: P.vypln, boxShadow: P.ziara, transition: `width ${pruhPrechod}`, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%', background: 'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.5),rgba(255,255,255,0))', animation: 'ovLesk 3.2s ease-in-out infinite' }} />
          </div>
          <div ref={hlavaRef} style={{ position: 'absolute', top: '50%', left: `${pct}%`, width: 0, height: 0, transition: `left ${pruhPrechod}` }} />
        </div>
      </div>

      <div style={{
        position: 'absolute', right: 14, bottom: 0, padding: '2px 10px 3px', borderRadius: '0 0 10px 10px',
        background: T.pas, border: `1px solid ${T.okraj}`, borderTop: 'none', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        fontSize: 14, fontWeight: 700, color: T.text2, textShadow: T.tien, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      }}>
        {zostatok}
      </div>
    </div>
  );
}
