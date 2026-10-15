// ============================================================
// KARTA 65 · Moderné — tretí vzhľad verejnej stránky farnosti (titulka cez celú šírku · dlaždice).
// Tie isté dáta, bloky a ťuky ako Nástenka; tu sú len kúsky podoby (dlaždica, nadpis s ikonou, pás so šípkami, lišta).
// Prototypy: Farnost - Moderne PC / PC svetla / tablet / mobil.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { IkonaDokument, IkonaHodiny, IkonaHviezda, IkonaInstitucia, IkonaKalendar, IkonaMegafon, IkonaSrdceLine, IkonaTerc, IkonaUsmev, IkonaZachrana } from "@/components/icons";

const INK = "var(--nf-ink)", INK3 = "var(--nf-ink3)", KARTA = "var(--nf-karta)", LINKA = "var(--nf-linka)";

/** ikony blokov (štýl lucide, čiara vo farbe línií) */
function Svg({ s, children }: { s: number; children: ReactNode }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>{children}</svg>;
}
export type MBlokId = "zbierky" | "ozn" | "vyp" | "mod" | "pom" | "prid" | "tes" | "spom" | "ver" | "deti" | "kostoly" | "omse" | "urad";
function ikona(id: MBlokId, s: number): ReactNode {
  switch (id) {
    case "zbierky": return <IkonaTerc size={s} />;
    case "ozn": return <IkonaMegafon size={s} />;
    case "vyp": return <Svg s={s}><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" /></Svg>;
    case "mod": return <IkonaSrdceLine size={s} />;
    case "pom": return <IkonaZachrana size={s} />;
    case "prid": return <IkonaKalendar size={s} />;
    case "tes": return <IkonaHviezda size={s} />;
    case "spom": return <Svg s={s}><path d="M12 3v18M7.5 8.5h9" /></Svg>;
    case "ver": return <Svg s={s}><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" /></Svg>;
    case "deti": return <IkonaUsmev size={s} />;
    case "kostoly": return <IkonaInstitucia size={s} />;
    case "omse": return <IkonaHodiny size={s} />;
    case "urad": return <IkonaDokument size={s} />;
  }
}
/** ikona bloku v tmavom štvorci (PC 46, mobil 38) */
export function MIkona({ id, maly }: { id: MBlokId; maly?: boolean }) {
  const s = maly ? 38 : 46;
  return <span aria-hidden="true" style={{ flex: "none", width: s, height: s, borderRadius: maly ? 11 : 14, background: "var(--md-ikona)", color: "var(--nf-linia)", display: "flex", alignItems: "center", justifyContent: "center" }}>{ikona(id, maly ? 20 : 24)}</span>;
}

/** šípky ‹ › (do boku) alebo ˄ ˅ (dole v bloku) — 52 px, ďalej vo farbe línií */
export function Sipky({ text, zvisle, onPosun, maly }: { text?: string; zvisle?: boolean; onPosun: (smer: 1 | -1) => void; maly?: boolean }) {
  const s = maly ? 44 : 52;
  const b: CSSProperties = { width: s, height: s, flex: "none", borderRadius: "50%", fontFamily: "inherit", fontSize: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, boxShadow: "none" };
  return (
    <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 10 }}>
      {text && <span style={{ fontSize: 15, fontWeight: 700, color: INK3 }}>{text}</span>}
      <button type="button" aria-label={zvisle ? "Vyššie" : "Späť"} onClick={() => onPosun(-1)} style={{ ...b, border: "1.5px solid var(--nf-linka)", background: KARTA, color: INK, fontWeight: 700 }}>{zvisle ? "˄" : "‹"}</button>
      <button type="button" aria-label={zvisle ? "Nižšie" : "Ďalej"} onClick={() => onPosun(1)} style={{ ...b, border: "none", background: "var(--nf-linia)", color: "var(--md-naLinii)", fontWeight: 800 }}>{zvisle ? "˅" : "›"}</button>
    </span>);
}
/** posun pásu o jednu kartu (scroll-snap) */
export function usePas<T extends HTMLElement = HTMLDivElement>(zvisle?: boolean): [RefObject<T>, (smer: 1 | -1) => void] {
  const ref = useRef<T>(null);
  const posun = (smer: 1 | -1) => {
    const el = ref.current, k = el?.firstElementChild as HTMLElement | null;
    if (!el) return;
    const krok = k ? (zvisle ? k.offsetHeight : k.offsetWidth) + 14 : (zvisle ? el.clientHeight : el.clientWidth) * 0.8;
    el.scrollBy(zvisle ? { top: smer * krok, behavior: "smooth" } : { left: smer * krok, behavior: "smooth" });
  };
  return [ref, posun];
}
/** vodorovný pás kariet so scroll-snap; posledná karta vykúka · OPRAVY 303: natívne posúvanie (proximity, pan-x), žiadny vlastný ťah */
export function PasX({ pasRef, gap = 16, children }: { pasRef: RefObject<HTMLDivElement>; gap?: number; children: ReactNode }) {
  return <div ref={pasRef} className="md-pas" style={{ display: "flex", gap, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity", touchAction: "pan-x", scrollbarWidth: "none", overscrollBehaviorX: "contain", paddingBottom: 2, minWidth: 0 }}>{children}</div>;
}
/** šírka karty v pase: n kariet na šírku pri medzere g */
export const sirkaKarty = (n: number, g = 16): CSSProperties => ({ flex: "none", width: `calc((100% - ${Math.floor(n) * g}px) / ${n})`, scrollSnapAlign: "start", minWidth: 0 });

/** nadpis bloku: ikona, biely nadpis 30 px, pod ním sivá veta; vpravo šípky alebo odkaz */
export function MNadpis({ id, t, popis, vpravo, maly }: { id: MBlokId; t: string; popis?: string; vpravo?: ReactNode; maly?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: maly ? 12 : 20, flexWrap: maly ? "wrap" : "nowrap" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 14 }}><MIkona id={id} /><b style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 800, letterSpacing: "-.025em", color: INK }}>{t}</b></span>
        {popis && <span style={{ fontSize: 16, paddingLeft: 60, lineHeight: 1.4, color: INK3, textWrap: "pretty" } as CSSProperties}>{popis}</span>}
      </span>
      {vpravo}
    </div>);
}

/** dlaždica bloku: --nf-papier, radius 28 (mobil 22), hore pás 3 px vo farbe línií */
export function MDlazdica({ blok, span, pozadie, children, styl }: { blok: string; span: number; pozadie?: string; children: ReactNode; styl?: CSSProperties }) {
  return (
    <section data-blok={blok} style={{ gridColumn: span ? `span ${span}` : undefined, padding: 28, borderRadius: 28, background: pozadie ?? "var(--nf-papier)", borderTop: "3px solid var(--nf-linia)", display: "flex", flexDirection: "column", gap: 16, minWidth: 0, scrollMarginTop: 84, ...styl }}>{children}</section>);
}

/** lišta blokov pod titulkou (PC, prilepená hore): ťuk = posun na blok, aktívny čip vo farbe línií; na konci zelené + */
export function MLista({ bloky, onBlok, plus }: { bloky: { id: string; t: string }[]; onBlok: (id: string) => void; plus?: ReactNode }) {
  const [akt, setAkt] = useState(bloky[0]?.id ?? "");
  const kl = bloky.map((b) => b.id).join("|");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = kl.split("|").map((id) => document.querySelector(`[data-blok="${id}"]`)).filter((e): e is Element => !!e);
    const io = new IntersectionObserver((en) => { const v = en.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setAkt(v.target.getAttribute("data-blok") ?? ""); }, { rootMargin: "-90px 0px -55% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [kl]);
  return (
    <nav aria-label="Skok na blok" style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 16, padding: "12px clamp(24px,3.4vw,48px)", background: "var(--nf-bg)", borderBottom: `1px solid ${LINKA}` }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {bloky.map((b) => { const on = akt === b.id; return (
          <button key={b.id} type="button" aria-current={on ? "true" : undefined} onClick={() => { setAkt(b.id); onBlok(b.id); }}
            style={{ minHeight: 44, padding: "0 16px", borderRadius: 22, border: on ? "1px solid var(--nf-linia)" : `1px solid ${LINKA}`, background: on ? "var(--nf-linia)" : "transparent", color: on ? "var(--md-naLinii)" : "var(--nf-ink2)", fontFamily: "inherit", fontSize: 14.5, fontWeight: on ? 800 : 700, cursor: "pointer", boxShadow: "none" }}>{b.t}</button>); })}
      </div>
      {plus}
    </nav>);
}

/** šírka okna aspoň w px (PC 1440 vs. tablet na šírku) */
export function useAspon(w: number): boolean {
  const q = `(min-width: ${w}px)`;
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia?.(q).matches);
  useEffect(() => { const mq = window.matchMedia?.(q); if (!mq) return; const f = () => setM(mq.matches); f(); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]);
  return !!m;
}
