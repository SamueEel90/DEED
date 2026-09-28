// KARTA 05 · Tempo darov — 5 dielov zľava doprava, aktuálny sa plní a pulzuje. Len transform/opacity.
import { useEffect, useRef, useState } from "react";
import { STUPNE, tempoStupen, useDevTempo, type Stupen } from "./tempoStupen";

export type TempoRezim = "vzdy" | "auto" | false;
const FARBA = ["var(--tempo1)", "var(--tempo2)", "var(--tempo3)", "var(--tempo4)", "var(--tempo5)"];
const PULZ = [1.6, 1.3, 1.0, 0.75, 0.55];
const SKRYT_PO_MS = 15 * 60 * 1000; // auto miesta: skryť až po 15 min na Priemernej

const darov = (n: number) => `${n} ${n === 1 ? "dar" : n >= 2 && n <= 4 ? "dary" : "darov"}`;

/** auto: objaví sa od Silnej, skryje sa až po 15 min na Priemernej (nie hneď, aby neblikalo) */
function useViditelnost(rezim: TempoRezim, stupen: Stupen): boolean {
  const [vidno, setVidno] = useState(rezim === "vzdy" || (rezim === "auto" && stupen >= 1));
  useEffect(() => {
    if (rezim !== "auto") { setVidno(rezim === "vzdy"); return; }
    if (stupen >= 1) { setVidno(true); return; }
    const t = setTimeout(() => setVidno(false), SKRYT_PO_MS);
    return () => clearTimeout(t);
  }, [rezim, stupen]);
  return vidno;
}

export function TempoDarov({ refId, rezim, cezTvorcu }: { refId: string; rezim: TempoRezim; cezTvorcu?: string }) {
  useDevTempo(); // DEV: prekreslenie pri zmene simulovaného stupňa
  const t = tempoStupen(refId, cezTvorcu);
  const vidno = useViditelnost(rezim, t.stupen);

  // objavenie / skrytie — ostane namontované počas odchodu (0,35 s)
  const [namontovane, setNamontovane] = useState(vidno);
  useEffect(() => {
    if (vidno) { setNamontovane(true); return; }
    const x = setTimeout(() => setNamontovane(false), 350);
    return () => clearTimeout(x);
  }, [vidno]);

  // pokles: posledný potvrdený diel pomaly zhasne
  const predosly = useRef(t.stupen);
  const [zhasina, setZhasina] = useState<{ diel: number; k: number } | null>(null);
  useEffect(() => {
    if (t.stupen < predosly.current) setZhasina({ diel: t.stupen, k: Date.now() });
    predosly.current = t.stupen;
  }, [t.stupen]);

  if (!rezim || !namontovane) return null;
  const f = FARBA[t.stupen];
  return (
    <div className={vidno ? "zb-tempo-in" : "zb-tempo-out"} style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--cardBd)" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>TEMPO DAROV</span>
        <span style={{ fontSize: 15, fontWeight: 800, color: f }}>{STUPNE[t.stupen]}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
        {STUPNE.map((_, i) => {
          const aktualny = i === t.stupen, dosiahnuty = i < t.stupen;
          return (
            <div key={i} style={{ position: "relative", height: 15, borderRadius: 6, overflow: "hidden", boxSizing: "border-box",
              border: `1.5px solid ${aktualny || dosiahnuty ? FARBA[i] : "var(--cardBd)"}`, background: dosiahnuty ? FARBA[i] : "transparent" }}>
              {aktualny && (
                <div className="zb-tempo-diel" style={{ position: "absolute", inset: 0, background: f, transformOrigin: "0 50%",
                  transform: `scaleX(${t.stupen === 4 ? 1 : Math.max(0.12, Math.min(1, t.postup))})`, animationDuration: `${PULZ[t.stupen]}s` }} />
              )}
              {aktualny && zhasina?.diel === i && <div key={zhasina.k} className="zb-tempo-zhasni" style={{ position: "absolute", inset: 0, background: f }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginTop: 5 }}>
        {STUPNE.map((n, i) => (
          <span key={n} style={{ fontSize: 10.5, fontWeight: 700, textAlign: "center", lineHeight: 1.2,
            color: i === t.stupen ? f : i < t.stupen ? "var(--ink2)" : "var(--ink4)" }}>{n}</span>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink2)" }}>
        {darov(t.darov5min)} za posledných 5 min · {t.stupen === 4 ? "najvyšší stupeň" : `do stupňa ${STUPNE[t.stupen + 1]} ešte ${t.doDalsieho}`}
      </div>
    </div>
  );
}
