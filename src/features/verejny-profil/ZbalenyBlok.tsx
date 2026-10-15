// ============================================================
// OPRAVY 245 · stránka farnosti na mobile a tablete na výšku: blok zbalený na jeden riadok
// (nadpis, riadok súhrnu, okrúhla šípka ⌄). Celý riadok je ťuk, otvorených môže byť viac naraz.
// Na konci rozbaleného bloku „Zbaliť ⌃“ — blok pod ním ostane presne pod prstom.
// Prototypy: „Farnost nastenka - mobil zbalene“, „Farnost - Kronika mobil zbalene“.
// ============================================================
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";

/** otvorené bloky stránky — po načítaní je všetko zbalené */
/** OPRAVY 292 (7): s kľúčom si zariadenie pamätá, ktoré bloky boli naposledy otvorené (localStorage, len toto zariadenie) */
export function useZbaleneBloky(pamat?: string) {
  const [otv, setOtv] = useState<ReadonlySet<string>>(() => {
    if (!pamat) return new Set();
    try { const l = JSON.parse(localStorage.getItem(pamat) ?? "[]"); return new Set(Array.isArray(l) ? l.filter((x): x is string => typeof x === "string") : []); } catch { return new Set(); }
  });
  const uloz = (n: ReadonlySet<string>) => { if (pamat) try { localStorage.setItem(pamat, JSON.stringify([...n])); } catch { /* LS */ } return n; };
  const prepni = (id: string) => setOtv((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return uloz(n); });
  const otvor = (id: string) => setOtv((s) => (s.has(id) ? s : uloz(new Set(s).add(id))));
  return { otv, prepni, otvor };
}

/** najbližší rodič, ktorý sa posúva (celá obrazovka profilu alebo stránka) */
function posuvac(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

const SIPKA = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

export function ZbalenyBlok({ blok, nadpis, suhrn, otvoreny, onPrepni, kronika, ikona, sipkaBg, styl, children }: {
  blok: string; nadpis: ReactNode; suhrn: string; otvoreny: boolean; onPrepni: () => void;
  /** Kronika a Moderné: šípka 40 px na karte; Nástenka: 44 px s rámom */ kronika?: boolean;
  /** KARTA 65 Moderné: ikona bloku vľavo od nadpisu, pozadie šípky */ ikona?: ReactNode; sipkaBg?: string; styl: CSSProperties; children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const zbal = () => {
    const el = ref.current;
    if (!el) { onPrepni(); return; }
    const sc = posuvac(el), dalsi = el.nextElementSibling as HTMLElement | null;
    sc.style.overflowAnchor = "none";
    const pred = dalsi ? dalsi.getBoundingClientRect().top : 0;
    flushSync(onPrepni);
    if (dalsi) sc.scrollTop += dalsi.getBoundingClientRect().top - pred;
    else if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  };
  const s = kronika ? 40 : 44;
  return (
    <section ref={ref} data-blok={blok} style={{ display: "flex", flexDirection: "column", scrollMarginTop: 16, minWidth: 0, ...styl }}>
      <button type="button" aria-expanded={otvoreny} onClick={onPrepni}
        style={{ display: "flex", alignItems: "center", gap: kronika ? 12 : 14, minHeight: ikona ? 48 : kronika ? 52 : 56, padding: 0, border: "none", background: "transparent", color: "var(--nf-ink)", fontFamily: "inherit", textAlign: "left", cursor: "pointer", boxShadow: "none" }}>
        {ikona}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: ikona ? 2 : kronika ? 6 : 5 }}>
          {nadpis}
          {suhrn && <span style={{ fontSize: kronika ? 13.5 : 15, fontWeight: 400, color: "var(--nf-ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{suhrn}</span>}
        </span>
        <span aria-hidden="true" style={{ flex: "none", width: s, height: s, boxSizing: "border-box", borderRadius: "50%", background: sipkaBg ?? (kronika ? "var(--nf-karta)" : "transparent"), border: kronika ? "none" : "1.5px solid var(--nf-linka)", color: "var(--nf-ink)", display: "flex", alignItems: "center", justifyContent: "center", transform: `rotate(${otvoreny ? 180 : 0}deg)`, transition: "transform .2s ease" }}>{SIPKA}</span>
      </button>
      {otvoreny && <>
        {children}
        <button type="button" onClick={zbal} style={{ minHeight: 48, marginTop: 4, borderRadius: 12, border: "1.5px solid var(--nf-zelena)", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Zbaliť ⌃</button>
      </>}
    </section>);
}
