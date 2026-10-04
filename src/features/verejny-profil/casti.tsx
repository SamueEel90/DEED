// KARTA 43 · spoločné časti troch verejných profilov (Kronika · Výklad · Pirát).
// Farby z tokenov správy charity (.sc-tokeny + data-stit) — tie isté ako v prototypoch.
// Len transform/opacity, ťukacie plochy od 44 px, žiadne emoji, slovenský formát čísel.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { StitLevel } from "@/components/stit";
import { LOKALITY, type Lokalita, type Mesto, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { useLokalita } from "@/lib/lokalita";
import { useLayout } from "@/components/context";
import "@/styles/verejnyProfil.css";
import { vrstvaProfiluPripoj } from "./otvor";

export const MOBIL = "(max-width: 759px)";
export function useMobil(): boolean {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBIL).matches);
  useEffect(() => {
    const q = window.matchMedia(MOBIL), f = () => setM(q.matches);
    q.addEventListener("change", f); return () => q.removeEventListener("change", f);
  }, []);
  return m;
}

/** mesto človeka: ak appka hlási jedno z troch miest, profil sa otvorí v ňom, inak v meste profilu */
export function useDomaceMesto(profil: TestProfil): Mesto {
  const { mesto } = useLokalita();
  return (["Trenčín", "Prešov", "Bratislava"] as Mesto[]).find((m) => m === mesto) ?? profil.mesto;
}

// ---------------- lokalita: „Si v Prešove ⌄" (prototyp v4 Pirát) ----------------
export function LokalitaPrepinac({ lok, onLok, domace, sidlo, tmavy }: { lok: Lokalita; onLok: (l: Lokalita) => void; domace: Mesto; sidlo?: Mesto; /** Kronika v6: tmavé polopriehľadné tlačidlo na titulke */ tmavy?: boolean }) {
  const [otv, setOtv] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!otv) return;
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOtv(false); };
    document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f);
  }, [otv]);
  const text = lok === "Celé Slovensko" ? "Celé Slovensko" : `Si v ${vMeste(lok)}`;
  const pod = (l: Lokalita) => l === "Celé Slovensko" ? "všetky pobočky spolu" : l === domace ? "podľa tvojej polohy" : l === sidlo ? "sídlo organizácie" : "pobočka";
  const poradie: Lokalita[] = [domace, ...LOKALITY.filter((l) => l !== domace && l !== "Celé Slovensko"), "Celé Slovensko"];
  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button type="button" onClick={() => setOtv((o) => !o)} aria-expanded={otv}
        style={tmavy
          ? { height: 44, padding: "0 14px", border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }
          : { height: 44, padding: "0 16px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#1D211B", whiteSpace: "nowrap" }}>
        {!tmavy && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3F6E2A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg>}
        {text}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tmavy ? "#fff" : "#5B5D53"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .3s ease" }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {otv && (
        <span role="menu" style={{ position: "absolute", left: 0, top: 52, zIndex: 40, width: 260, padding: 6, borderRadius: 16, background: "#fff", boxShadow: "0 18px 40px rgba(0,0,0,.35)", display: "flex", flexDirection: "column" }}>
          {poradie.map((l) => (
            <button key={l} type="button" role="menuitem" onClick={() => { onLok(l); setOtv(false); }}
              style={{ height: 48, padding: "0 12px", border: "none", borderRadius: 11, background: l === lok ? "#EEF3E7" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", textAlign: "left" }}>
              <b style={{ fontSize: 14.5, color: "#1D211B" }}>{l}</b>
              <span style={{ fontSize: 12, color: "#5B5D53" }}>{pod(l)}</span>
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
/** „Prešov" → „Prešove" (len tri testovacie mestá) */
export const vMeste = (m: Mesto): string => ({ "Trenčín": "Trenčíne", "Prešov": "Prešove", "Bratislava": "Bratislave" })[m];

// ---------------- štít CARE s leskom (prototypy v2 / v3 / v4) ----------------
export const stitSrc = (stit: string) => `/stity/care/${stit.toLowerCase()}.webp`;
export function StitCare({ stit, w, h, lesk, tien = "drop-shadow(0 8px 12px rgba(0,0,0,.4))" }: { stit: string; w: number; h: number; lesk?: boolean; tien?: string }) {
  const src = stitSrc(stit);
  const maska: CSSProperties = { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" };
  return (
    <span role="img" aria-label={`Štít DEED+ CARE · ${nazovStitu(stit)}`} style={{ position: "relative", width: w, height: h, display: "block" }}>
      <img src={src} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", filter: tien }} />
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", ...maska }}>
        {lesk && <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "100%", background: "linear-gradient(105deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.8) 50%,rgba(255,255,255,0) 65%)", transform: "translateX(-130%)", animation: "vpLesk 1.5s ease .4s 1 both" }} />}
      </span>
    </span>
  );
}

// ---------------- okno štítu (prototyp: karta --cuBg, 460 px, štít s leskom) ----------------
export function StitOkno({ p, onClose, v6, mobil }: { p: TestProfil; onClose: () => void;
  /** OPRAVY 137/139 (Kronika v6): štítky, „· 99 % doložené" a overenie (sídlo, IČO, účet, kontakt) sú v okne; mobil = hárok zdola */
  v6?: boolean; mobil?: boolean }) {
  const [zobraz, setZobraz] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setZobraz(true)); return () => cancelAnimationFrame(r); }, []);
  const zavri = () => { setZobraz(false); setTimeout(onClose, 250); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  return (
    <PortalVp stit={p.stit}>
      <div onClick={zavri} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(10,8,5,.6)", opacity: zobraz ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-label="Štít DEED+ CARE" style={v6 && mobil
        ? { position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 81, maxHeight: "calc(100% - 24px)", overflowY: "auto", transform: `translateY(${zobraz ? 0 : 40}px)`, opacity: zobraz ? 1 : 0, transition: "opacity .25s ease, transform .3s ease", borderRadius: 28, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "0 20px 60px rgba(0,0,0,.5)", padding: "22px 20px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }
        : { position: "fixed", left: "50%", top: "50%", zIndex: 81, width: v6 ? "min(480px, calc(100% - 32px))" : "min(460px, calc(100% - 32px))", maxHeight: "calc(100% - 32px)", overflowY: "auto", transform: `translate(-50%, -50%) scale(${zobraz ? 1 : 0.92})`, opacity: zobraz ? 1 : 0, transition: "opacity .25s ease, transform .25s ease", borderRadius: 28, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "0 30px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.5)", padding: v6 ? "26px 30px 22px" : "28px 30px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: v6 ? 12 : 14, textAlign: "center" }}>
        <button type="button" onClick={zavri} aria-label="Zavrieť" style={{ position: "absolute", right: 14, top: 14, width: 44, height: 44, border: "none", borderRadius: 22, background: "rgba(0,0,0,.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ color: "var(--cuInk)" }}><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {v6
          ? <StitCare key={zobraz ? "o" : "z"} stit={p.stit} w={mobil ? 96 : 130} h={mobil ? 118 : 160} lesk={zobraz} />
          : <StitCare key={zobraz ? "o" : "z"} stit={p.stit} w={150} h={184} lesk={zobraz} tien="drop-shadow(0 10px 16px rgba(60,40,10,.35))" />}
        {v6 ? <>
          {!mobil && <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--cuInk2)" }}>ŠTÍT DEED+ CARE</span>}
          <b style={{ fontSize: mobil ? 21 : 26, color: "var(--cuInk)" }}>{nazovStitu(p.stit)} · {p.stitCisla[0][0]} doložené</b>
        </> : <>
        <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--cuInk2)" }}>ŠTÍT DEED+ CARE</span>
          <b style={{ fontSize: 26, color: "var(--cuInk)" }}>{nazovStitu(p.stit)}</b>
        </span>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--cuInk2)", textWrap: "pretty", maxWidth: 360 } as CSSProperties}>Úroveň dôvery. Rastie s tým, ako {p.typ === "charita" ? "charita" : p.typ === "firma" ? "firma" : "tvorca"} dokladá, na čo išli peniaze.</span>
        </>}
        <div style={{ alignSelf: "stretch", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, padding: "14px 0", borderTop: "1px solid rgba(0,0,0,.14)", borderBottom: "1px solid rgba(0,0,0,.14)" }}>
          {p.stitCisla.map(([v, t]) => (
            <span key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <b style={{ fontSize: 22, color: "var(--cuInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b>
              <span style={{ fontSize: 12.5, color: "var(--cuInk2)" }}>{t}</span>
            </span>
          ))}
        </div>
        {v6 && <>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
            {[[...new Set(p.zbierky.map((z) => z.mesto))].join(" · "), `od ${p.odRoku}`, p.typ === "charita" ? "Overená organizácia" : p.typ === "firma" ? "Overená firma" : "Overený tvorca"].map((c) => (
              <span key={c} style={{ height: mobil ? 28 : 30, padding: mobil ? "0 11px" : "0 12px", borderRadius: 15, border: "1px solid var(--cuBd)", display: "flex", alignItems: "center", fontSize: mobil ? 12.5 : 13, fontWeight: 800, color: "var(--cuInk)" }}>{c}</span>))}
          </div>
          <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", textAlign: "left" }}>
            {([["Sídlo", p.sidlo], ["IČO", p.ico], ["Transparentný účet", p.ucet], ["Kontakt", p.kontakt]] as [string, string][]).map(([k, v]) => (
              <div key={k} style={mobil ? { display: "flex", flexDirection: "column", gap: 1, padding: "6px 0", borderTop: "1px solid rgba(0,0,0,.12)" } : { display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderTop: "1px solid rgba(0,0,0,.12)" }}>
                <span style={{ fontSize: mobil ? 11.5 : 12.5, fontWeight: 700, color: "var(--cuInk2)" }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--cuInk)", textAlign: mobil ? "left" : "right" }}>{v}</span>
              </div>))}
          </div>
        </>}
        {!(v6 && mobil) && <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, fontWeight: 800, color: "var(--cuInk)", minHeight: 44, display: "flex", alignItems: "center" }}>Ako sa štít získava</a>}
      </div>
    </PortalVp>
  );
}

/** okná profilu (štít, hárok) idú cez portál nad celú appku — nad ľavé menu aj dok — s farbami profilu */
export function PortalVp({ stit, children }: { stit: string; children: ReactNode }) {
  return createPortal(<div className="vp sc-tokeny" data-stit={stit.toLowerCase()} style={{ background: "transparent" }}>{children}</div>, document.body);
}

// ---------------- vrstva profilu vnútri appky (ľavé menu na PC aj dok na mobile ostávajú) ----------------
/** výška, ktorú na mobile zaberá plávajúci dok appky (dok je nad vrstvou) */
export const DOK = 96;
export function VrstvaProfilu({ children }: { children: ReactNode }) {
  const { desktop } = useLayout();
  useEffect(() => vrstvaProfiluPripoj(), []); // kým je profil na obrazovke, plávajúce „+" stránky sa skryje
  return <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: desktop ? 104 : 0, zIndex: 30, overflowY: "auto", WebkitOverflowScrolling: "touch" } as CSSProperties}>{children}</div>;
}

/** text s kovovým prechodom podľa štítu (Teraz, roky) */
export const kovText: CSSProperties = { background: "var(--metal)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
/** porovnanie bez diakritiky (hľadanie v kronike) */
export const norm = (x?: string) => (x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const MESIACE = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];
export const nazovStitu = (s: string): string => ({ Bronze: "Bronzový", Silver: "Strieborný", Gold: "Zlatý", Platinum: "Platinový", Legend: "Legenda" })[s] ?? s;

// ---------------- prevod testovacej zbierky na ZbierkaData (detail) ----------------
import type { ZbierkaData } from "@/features/zbierka/ZbierkaModul";
export function naZbierkaData(z: TestZbierka, profil: TestProfil): ZbierkaData {
  return {
    id: z.id, nazov: z.nazov, popis: z.popis, overena: true,
    media: [{ typ: "foto", src: z.foto }],
    vyzbierane: z.vyzbierane, ciel: z.ciel, ludia: z.ludia,
    organizacia: {
      meno: z.zodpoveda ?? profil.meno, typ: "charita", mesto: z.mesto,
      veta: profil.veta, cisla: [], stit: (profil.stit as StitLevel),
    },
  };
}
