// ============================================================
// OPRAVY 297 (Martin 15. 10.) — videné oznamy a akcie sa zbalia (Nástenka, Moderné, Kronika, Klasika; PC aj mobil).
//  · videné = rozklikol ho (ťuk kdekoľvek do karty: viac, Prídem, fotka …), alebo bol celý na obrazovke aspoň 2 s;
//  · pamätá tento prehliadač / telefón (localStorage, aj bez prihlásenia); iné zariadenie = všetko znova celé;
//  · zbalí sa až pri ďalšej návšteve — stav sa číta raz pri otvorení stránky (snímka), nikdy pod prstom;
//  · zmenený obsah (iný podpis) sa znova rozbalí so štítkom ZMENENÉ, nový pri ďalšej návšteve so štítkom NOVÉ.
// Použitie: <VideneKontext.Provider value={useVidenePocas(stránka)}> … <Videne id podpis kratke={…}>celá karta</Videne>.
// ============================================================
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type StavVidene = "plne" | "nove" | "zmenene" | "videne";
type Mapa = Record<string, string>;
const KLUC = (stranka: string) => `deed.videne.${stranka}`;
const MAX = 600;

function citaj(stranka: string): Mapa {
  try { const m = JSON.parse(localStorage.getItem(KLUC(stranka)) || "{}"); return m && typeof m === "object" ? m as Mapa : {}; } catch { return {}; }
}
function zapis(stranka: string, m: Mapa) {
  try {
    const k = Object.keys(m);
    if (k.length > MAX) k.slice(0, k.length - MAX).forEach((x) => { if (x !== "__n") delete m[x]; }); // najstaršie preč
    localStorage.setItem(KLUC(stranka), JSON.stringify(m));
  } catch { /* LS */ }
}

/** krátky podpis obsahu — zmena textu, času, miesta alebo fotky = iný podpis (ZMENENÉ) */
export function podpis(...casti: unknown[]): string {
  const s = casti.map((x) => (x == null ? "" : String(x))).join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export interface Videnia { stav: (id: string, p: string) => StavVidene; oznac: (id: string, p: string) => void }
export const VideneKontext = createContext<Videnia | null>(null);

/** snímka pri otvorení stránky; „nové“ len ak tu človek už bol (prvá návšteva = všetko celé bez štítkov) */
export function useVidenePocas(stranka: string): Videnia {
  const [v] = useState<Videnia>(() => {
    const snimka = citaj(stranka), bol = snimka.__n === "1";
    zapis(stranka, { ...snimka, __n: "1" });
    return {
      stav: (id, p) => (!(id in snimka) ? (bol ? "nove" : "plne") : snimka[id] !== p ? "zmenene" : "videne"),
      oznac: (id, p) => { const m = citaj(stranka); if (m[id] !== p) { m[id] = p; zapis(stranka, m); } },
    };
  });
  return v;
}
/** zoradí: neprečítané (celé) hore, videné (zbalené) pod nimi; inak poradie ostáva */
export function zoradVidene<T>(v: Videnia | null, l: T[], kluc: (x: T) => [string, string]): T[] {
  if (!v) return l;
  return [...l.filter((x) => v.stav(...kluc(x)) !== "videne"), ...l.filter((x) => v.stav(...kluc(x)) === "videne")];
}

let css = false;
function pridajCss() {
  if (css || typeof document === "undefined") return;
  css = true;
  const s = document.createElement("style");
  s.textContent = ".vid-kratko .vid-skry{display:none!important}.vid-kratko{cursor:pointer}";
  document.head.appendChild(s);
}

/** karta, ktorá sa po videní zbalí. Bez `kratke` sa zbalí tá istá karta (časti s class „vid-skry“ sa skryjú). */
export function Videne({ id, podpis: p, kratke, children, styl }: { id: string; podpis: string; children: ReactNode;
  /** iný vzhľad zbalenej (riadok oznamu); `otvor` ju rozbalí na mieste */ kratke?: (otvor: () => void) => ReactNode; styl?: CSSProperties }) {
  const v = useContext(VideneKontext);
  const stav = v ? v.stav(id, p) : "plne";
  const [otv, setOtv] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const zbalena = stav === "videne" && !otv;
  pridajCss();
  useEffect(() => { // celá karta na obrazovke aspoň 2 s = videná (zbalí sa až pri ďalšej návšteve)
    const el = ref.current;
    if (!v || !el || stav === "videne" || typeof IntersectionObserver === "undefined") return;
    let t = 0;
    const io = new IntersectionObserver(([e]) => {
      const vh = e.rootBounds?.height ?? window.innerHeight;
      const cela = e.intersectionRatio >= 0.97 || (e.boundingClientRect.height > vh * 0.9 && e.intersectionRect.height >= vh * 0.85);
      if (cela && !t) t = window.setTimeout(() => v.oznac(id, p), 2000);
      if (!cela && t) { window.clearTimeout(t); t = 0; }
    }, { threshold: [0, 0.25, 0.5, 0.75, 0.85, 0.9, 0.97, 1] });
    io.observe(el);
    return () => { io.disconnect(); if (t) window.clearTimeout(t); };
  }, [v, id, p, stav]);
  const otvor = () => { setOtv(true); v?.oznac(id, p); };
  if (zbalena && kratke) return <>{kratke(otvor)}</>;
  const stitok = stav === "nove" ? "NOVÉ" : stav === "zmenene" ? "ZMENENÉ" : null;
  return (
    <div ref={ref} className={zbalena ? "vid-kratko" : undefined} style={{ position: "relative", minWidth: 0, display: "grid", ...styl }}
      onClickCapture={(e) => {
        if (!zbalena) { v?.oznac(id, p); return; }
        if ((e.target as HTMLElement).closest("button,a,input,select,textarea")) return; // Prídem, fotka … fungujú aj na zbalenej
        e.preventDefault(); otvor();
      }}>
      {children}
      {stitok && <span style={{ position: "absolute", top: 10, right: 10, zIndex: 2, height: 24, padding: "0 10px", borderRadius: 12, background: stav === "nove" ? "#4B7A35" : "#B8862B", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center", pointerEvents: "none" }}>{stitok}</span>}
    </div>);
}
