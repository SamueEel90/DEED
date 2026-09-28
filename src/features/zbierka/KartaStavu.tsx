// KARTA 04 · Karta stavu zbierky — s cieľom (suma, %, pruh) alebo bez cieľa (míľniky, posledný dar).
// Všetko z reálnych dát (základ zbierky + živé dary). Animácie len transform/opacity.
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useDarcovia, identitaDarcu, DARCOVIA_CFG, type DarRiadok } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { ludiaPomohli } from "./hlasky";
import { TempoDarov, type TempoRezim } from "./Tempo";

// míľniky: počíta systém sám, nikto ich nenastavuje
const MILNIKY = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
export function milnikyPre(suma: number): { dosiahnuty: number | null; dalsi: number } {
  let dosiahnuty: number | null = null;
  for (const m of MILNIKY) { if (suma >= m) dosiahnuty = m; else return { dosiahnuty, dalsi: m }; }
  const nad = Math.floor(suma / 100000) * 100000; // ďalej každých 100 000 €
  return { dosiahnuty: nad, dalsi: nad + 100000 };
}

const eur = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: n % 1 ? 2 : 0 })} €`;
const dnesOd = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** suma v zozname len keď ju darca povolil a je nad 2 € (≤ 2 € nikdy) */
const sumaDaru = (r: DarRiadok) => (r.firma || (r.registrovany && r.zobrazSumu)) && r.suma > DARCOVIA_CFG.prahSumy ? eur(r.suma) : null;

/** počítadlo naskakuje k novej hodnote (~0,7 s) */
function usePocitadlo(ciel: number): number {
  const [hodnota, setHodnota] = useState(ciel);
  const odkial = useRef(ciel);
  useEffect(() => {
    const start = odkial.current;
    if (start === ciel) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { odkial.current = ciel; setHodnota(ciel); return; }
    const t0 = performance.now(); let raf = 0;
    const krok = (t: number) => {
      const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3);
      const v = start + (ciel - start) * e;
      odkial.current = v; setHodnota(p >= 1 ? ciel : Math.round(v * 100) / 100);
      if (p < 1) raf = requestAnimationFrame(krok);
    };
    raf = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(raf);
  }, [ciel]);
  return hodnota;
}

/** pruh cez transform: scaleX — pri prvom vykreslení rastie od 0 */
function Pruh({ podiel, vyska, blik, koniec }: { podiel: number; vyska: number; blik?: number; koniec?: RefObject<HTMLDivElement> }) {
  const [p, setP] = useState(0);
  useEffect(() => { const r = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, podiel)))); return () => cancelAnimationFrame(r); }, [podiel]);
  return (
    <>
    <div style={{ height: vyska, borderRadius: 10, background: "var(--track)", overflow: "hidden" }}>
      <div key={blik} className={`zb-pruh${blik ? " zb-blik" : ""}`}
        style={{ height: "100%", borderRadius: 10, background: "linear-gradient(90deg, #4B7A35, #8DB866)", transformOrigin: "0 50%", transform: `scaleX(${p})` }} />
    </div>
    {/* koniec pruhu — sem letí svetielko pri mikrodare (animacie.ts, [data-bar-end]) */}
    <div style={{ position: "relative", height: 0 }}><div ref={koniec} data-bar-end style={{ position: "absolute", top: -vyska / 2, left: `${Math.max(0, Math.min(1, podiel)) * 100}%`, width: 0, height: 0 }} /></div>
    </>
  );
}

function Ludia({ pocet }: { pocet: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: "var(--ink3)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      <span style={{ flex: 1 }}>{ludiaPomohli(pocet)}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontWeight: 700 }}>
        <span className="zb-pulz" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />
        rastie naživo
      </span>
    </div>
  );
}

export function KartaStavu({ refId, zaklad, ciel, ludiaZaklad, tempo = false, koniecPruhu }: {
  refId: string;
  tempo?: TempoRezim;    // karta 05 — vnútri karty pod pruhom
  koniecPruhu?: RefObject<HTMLDivElement>;
  zaklad: number;        // vyzbierané mimo zoznamu živých darov (z dát zbierky)
  ciel?: number | null;  // bez cieľa → míľniky
  ludiaZaklad: number;
}) {
  const dary = useDarcovia(refId);
  const ja = usePouzivatel();
  const suma = zaklad + dary.reduce((a, r) => a + r.suma, 0);
  const ludia = ludiaZaklad + dary.length;
  const zobrazena = usePocitadlo(suma);
  const maCiel = ciel != null && ciel > 0;

  // míľnik: pri dosiahnutí pruh zablikne naplnený, potom sa plní k ďalšiemu
  const { dosiahnuty, dalsi } = milnikyPre(suma);
  const predosly = useRef(dosiahnuty);
  const [oslava, setOslava] = useState(0);
  useEffect(() => {
    if (dosiahnuty !== predosly.current && (dosiahnuty ?? 0) > (predosly.current ?? 0)) {
      setOslava(Date.now());
      const t = setTimeout(() => setOslava(0), 900);
      predosly.current = dosiahnuty;
      return () => clearTimeout(t);
    }
    predosly.current = dosiahnuty;
  }, [dosiahnuty]);

  const karta: CSSProperties = { margin: "0 0 12px", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: maCiel ? "18px 18px 14px" : "16px 18px 14px" };
  const velka: CSSProperties = { fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: "var(--ink)" };

  if (maCiel) {
    const pct = Math.floor((suma / ciel!) * 100);
    return (
      <div style={karta}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
          <span style={velka} data-zb-suma={refId}>{eur(zobrazena)}</span>
          <span style={{ fontSize: 14, color: "var(--ink3)" }}>z {eur(ciel!)}</span>
          <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 800, color: "var(--green)", fontVariantNumeric: "tabular-nums" }}>{pct} %</span>
        </div>
        <Pruh podiel={suma / ciel!} vyska={10} koniec={koniecPruhu} />
        <TempoDarov refId={refId} rezim={tempo} />
        <Ludia pocet={ludia} />
      </div>
    );
  }

  const dnes = dary.filter((r) => r.cas >= dnesOd()).reduce((a, r) => a + r.suma, 0);
  const posledny = dary[0];
  const zakladMilnika = oslava ? 1 : suma / dalsi;
  return (
    <div style={karta}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>Vyzbierané</div>
      <div style={{ ...velka, marginTop: 2 }} data-zb-suma={refId}>{eur(zobrazena)}</div>
      {dnes > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", marginTop: 4 }}>dnes +{eur(dnes)}</div>}
      <div style={{ marginTop: 12 }}><Pruh podiel={zakladMilnika} vyska={6} blik={oslava || undefined} koniec={koniecPruhu} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>
        <span>{dosiahnuty ? `míľnik ${eur(dosiahnuty)} dosiahnutý` : "prvý míľnik"}</span>
        <span>ďalší míľnik <span style={{ color: "var(--green)" }}>{eur(dalsi)}</span></span>
      </div>
      {posledny && (
        <div key={posledny.id} className="zb-novy" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, background: "var(--bg)", border: "1px solid var(--cardBd)", borderRadius: 12, padding: "8px 12px" }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", flex: "none" }}>POSLEDNÝ DAR</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{identitaDarcu(posledny, ja)}</span>
          {sumaDaru(posledny) && <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)", flex: "none", fontVariantNumeric: "tabular-nums" }}>{sumaDaru(posledny)}</span>}
        </div>
      )}
      <TempoDarov refId={refId} rezim={tempo} />
      <Ludia pocet={ludia} />
    </div>
  );
}
