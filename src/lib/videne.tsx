// ============================================================
// OPRAVY 297 (Martin 15. 10.) — videné oznamy a akcie sa zbalia (Nástenka, Moderné, Kronika, Klasika; PC aj mobil).
//  · videné = rozklikol ho (ťuk kdekoľvek do karty: viac, Prídem, fotka …), alebo bol celý na obrazovke aspoň 2 s;
//  · neprihlásený: pamätá len tento prehliadač / telefón (localStorage); iné zariadenie = všetko znova celé;
//  · prihlásený (doplnok 297): videné sa ukladá k účtu (moje_data, 0084b) — mobil aj PC vedia to isté;
//    pri prihlásení sa videné zo zariadenia zlúči s účtom (zjednotenie, pri rozdiele platí zariadenie);
//  · zbalí sa až pri ďalšej návšteve — stav sa číta raz pri otvorení stránky (snímka), nikdy pod prstom;
//  · zmenený obsah (iný podpis) sa znova rozbalí so štítkom ZMENENÉ, nový pri ďalšej návšteve so štítkom NOVÉ.
// Použitie: <VideneKontext.Provider value={useVidenePocas(stránka)}> … <Videne id podpis kratke={…}>celá karta</Videne>.
// ============================================================
import { zaregistrujKluc, zmenene } from "./mojeData";
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type StavVidene = "plne" | "nove" | "zmenene" | "videne";
type Mapa = Record<string, string>;
const KLUC = (stranka: string) => `deed.videne.${stranka.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 68)}`; // kľúč moje_data (0084b)
const MAX = 600;

// OPRAVY 333: keď sa do localStorage zapísať nedá (plné úložisko, súkromné okno), videné drží pamäť appky —
// opakovaná návšteva bez znovunačítania sa zbalí aj tak; do účtu sa vtedy nič neposiela (prázdne by účet zmazalo)
const pamat = new Map<string, Mapa>();
function citaj(stranka: string): Mapa {
  const z = pamat.get(KLUC(stranka));
  try { const m = JSON.parse(localStorage.getItem(KLUC(stranka)) || "{}"); return m && typeof m === "object" ? { ...z, ...m as Mapa } : { ...z }; } catch { return { ...z }; }
}
function zapis(stranka: string, m: Mapa) {
  const k = Object.keys(m);
  if (k.length > MAX) k.slice(0, k.length - MAX).forEach((x) => { if (x !== "__n") delete m[x]; }); // najstaršie preč
  pamat.set(KLUC(stranka), m);
  try { localStorage.setItem(KLUC(stranka), JSON.stringify(m)); } catch { return; }
  zmenene(KLUC(stranka)); // prihlásený → do účtu
}
/** zlúčenie zariadenia s účtom: všetko videné z oboch; pri inom podpise platí zariadenie */
function zluc(lokal: unknown, ucet: unknown): Mapa {
  const o = (x: unknown) => (x && typeof x === "object" ? x as Mapa : {});
  const m = { ...o(ucet), ...o(lokal) };
  if (o(ucet).__n === "1") m.__n = "1";
  return m;
}
const registrovane = new Set<string>();
function doUctu(stranka: string) {
  const k = KLUC(stranka);
  if (registrovane.has(k)) return;
  registrovane.add(k);
  zaregistrujKluc(k, () => {}, zluc, true); // snímka stránky sa nemení (zbalí sa až pri ďalšej návšteve)
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

/** snímka pri otvorení stránky; „nové“ len ak tu človek už bol (prvá návšteva = všetko celé bez štítkov)
 *  OPRAVY 333: `vypnute` (náhľad zo Správy) — nič nečíta ani nezapisuje, všetko celé ako u nového veriaceho;
 *  iná stránka v tom istom komponente = nová snímka (predtým ostávala snímka a zápis prvej stránky) */
export function useVidenePocas(stranka: string, vypnute = false): Videnia | null {
  const [v, setV] = useState<{ k: string; v: Videnia | null }>(() => ({ k: `${vypnute}|${stranka}`, v: vypnute ? null : snimka(stranka) }));
  if (v.k !== `${vypnute}|${stranka}`) { const n = { k: `${vypnute}|${stranka}`, v: vypnute ? null : snimka(stranka) }; setV(n); return n.v; }
  return v.v;
}
function snimka(stranka: string): Videnia {
  doUctu(stranka); // už synchronizovaný účet sa zlúči hneď (pred snímkou)
  const s = citaj(stranka), bol = s.__n === "1";
  zapis(stranka, { ...s, __n: "1" });
  return {
    stav: (id, p) => (!(id in s) ? (bol ? "nove" : "plne") : s[id] !== p ? "zmenene" : "videne"),
    oznac: (id, p) => { const m = citaj(stranka); if (m[id] !== p) { m[id] = p; zapis(stranka, m); } },
  };
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
