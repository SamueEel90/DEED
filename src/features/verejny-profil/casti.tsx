// KARTA 43 · spoločné časti troch verejných profilov (Kronika · Výklad · Pirát).
// Farby z tokenov správy charity (.sc-tokeny + data-stit) — tie isté ako v prototypoch.
// Len transform/opacity, ťukacie plochy od 44 px, žiadne emoji, slovenský formát čísel.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { pressable } from "@/components/pressable";
import { StitObr } from "@/components/stit";
import type { StitLevel } from "@/components/stit";
import { LOKALITY, eur, pct, type Lokalita, type Mesto, type TestOznam, type TestPraca, type TestProfil, type TestSkutok, type TestZbierka } from "@/lib/testProfily";
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

export const karta: CSSProperties = { background: "var(--card)", border: "1px solid var(--cardBd)", borderRadius: 16 };
export const nadpisSekcie: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink4)", textTransform: "uppercase" };

// ---------------- lokalita: „Si v Prešove ⌄" (prototyp v4 Pirát) ----------------
export function LokalitaPrepinac({ lok, onLok, domace, sidlo }: { lok: Lokalita; onLok: (l: Lokalita) => void; domace: Mesto; sidlo?: Mesto }) {
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
        style={{ height: 44, padding: "0 16px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#1D211B", whiteSpace: "nowrap" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3F6E2A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg>
        {text}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B5D53" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: `rotate(${otv ? 180 : 0}deg)`, transition: "transform .3s ease" }}><path d="m6 9 6 6 6-6" /></svg>
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

export function IkonaPin() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
}
export function IkonaSipka({ smer = "vpravo" }: { smer?: "vpravo" | "vlavo" }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={smer === "vpravo" ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} /></svg>;
}
export function IkonaZdielat() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3m0 0 4 4m-4-4L8 7" /><path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" /></svg>;
}
export function IkonaHladat() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}

// ---------------- pruh postupu ----------------
export function Pruh({ vyzbierane, ciel, vyska = 6 }: { vyzbierane: number; ciel?: number; vyska?: number }) {
  const p = pct(vyzbierane, ciel);
  return (
    <div style={{ height: vyska, borderRadius: 999, background: "var(--track)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${ciel ? p : 100}%`, borderRadius: 999, background: "var(--green)", transformOrigin: "left center" }} />
    </div>
  );
}

// ---------------- karta zbierky ----------------
export function ZbierkaKarta({ z, velka, onOtvor, podMnou }: { z: TestZbierka; velka?: boolean; onOtvor?: () => void; podMnou?: ReactNode }) {
  return (
    <div style={{ ...karta, overflow: "hidden" }}>
      <div style={{ display: velka ? "grid" : "block", gridTemplateColumns: velka ? "minmax(0,1fr) minmax(0,1.1fr)" : undefined }}>
        {velka && <div style={{ position: "relative", minHeight: 200, background: `center/cover no-repeat url("${z.foto}")` }}>
          {z.konciDni != null && <Stitok text={`KONČÍ O ${z.konciDni} DNÍ`} silny />}
        </div>}
        <div style={{ padding: velka ? 20 : 14, display: "grid", gap: 8 }}>
          {!velka && <div style={nadpisSekcie}>{z.stav === "dlhodoba" ? "Dlhodobá" : z.stav === "ukoncena" ? `Doložené · ${z.doklady ?? 0} doklady` : z.konciDni != null ? `Končí o ${z.konciDni} dní` : z.mesto}</div>}
          <div style={{ fontSize: velka ? 22 : 15, fontWeight: 800, lineHeight: 1.25, color: "var(--ink)" }}>{z.nazov}</div>
          {velka && <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{z.popis}</div>}
          <div style={{ display: "grid", gap: 6 }}>
            <Pruh vyzbierane={z.vyzbierane} ciel={z.ciel} />
            <div style={{ fontSize: velka ? 15 : 13, color: "var(--ink2)" }}>
              <b style={{ color: "var(--ink)", fontSize: velka ? 19 : 15 }}>{eur(z.vyzbierane)}</b>
              {z.ciel ? ` z ${eur(z.ciel)}` : " zatiaľ"} · {z.ludia} ľudí
            </div>
          </div>
          {z.dorovnanie && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{z.dorovnanie}</div>}
          {z.spravaDarcom && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)", fontStyle: "italic" }}>„{z.spravaDarcom}"</div>}
          {onOtvor && <button {...pressable()} onClick={onOtvor}
            style={{ minHeight: 44, borderRadius: 12, border: "none", background: "var(--green)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            Pozrieť a podporiť
          </button>}
          {podMnou}
        </div>
      </div>
    </div>
  );
}

export function Stitok({ text, silny }: { text: string; silny?: boolean }) {
  return <span style={{ position: "absolute", top: 12, left: 12, padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: ".05em", background: silny ? "rgba(20,17,11,.8)" : "var(--card)", color: silny ? "#F4EFE4" : "var(--ink2)" }}>{text}</span>;
}

// ---------------- karta skutku ----------------
export function SkutokKarta({ s, podMnou }: { s: TestSkutok; podMnou?: ReactNode }) {
  return (
    <div style={{ ...karta, overflow: "hidden", display: "grid", gap: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "92px minmax(0,1fr)", gap: 12, padding: 12, alignItems: "center" }}>
        <div style={{ height: 72, borderRadius: 12, background: `center/cover no-repeat url("${s.foto}")` }} />
        <div style={{ display: "grid", gap: 4 }}>
          <div style={nadpisSekcie}>{s.kedy} · {s.mesto}</div>
          <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, color: "var(--ink)" }}>{s.nazov}</div>
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>{s.popis}{s.dobrovolnici ? ` · ${s.dobrovolnici} dobrovoľníkov` : ""}</div>
        </div>
      </div>
      {podMnou && <div style={{ padding: "0 12px 12px" }}>{podMnou}</div>}
    </div>
  );
}

// ---------------- oznam a práca ----------------
export function OznamRiadok({ o }: { o: TestOznam }) {
  return (
    <div style={{ ...karta, display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 12, padding: 14, alignItems: "start" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{o.den}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>{o.mesiac}</div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ ...nadpisSekcie, color: o.druh === "vyzva" ? "var(--green)" : "var(--ink4)" }}>{o.stitok}</div>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, color: "var(--ink)" }}>{o.nadpis}</div>
        <div style={{ fontSize: 13, color: "var(--ink3)" }}>{o.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button {...pressable()} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--gBd)", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{o.tlacidlo}</button>
          <span style={{ fontSize: 13, color: "var(--ink4)" }}>{o.pod}</span>
        </div>
      </div>
    </div>
  );
}

export function PracaRiadok({ p }: { p: TestPraca }) {
  return (
    <div style={{ ...karta, display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 12, padding: 14, alignItems: "start" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{p.den}</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>{p.mesiac}</div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div style={nadpisSekcie}>Hľadáme · {p.druh === "brigadnik" ? "brigádnik" : "zamestnanec"}</div>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3, color: "var(--ink)" }}>{p.nazov}</div>
        <div style={{ fontSize: 13, color: "var(--ink3)" }}>{p.text}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button {...pressable()} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Mám záujem</button>
          <span style={{ fontSize: 13, color: "var(--ink4)" }}>{p.pod}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------- naživo ----------------
export function NazivoBlok({ profil, lok, domace }: { profil: TestProfil; lok: Lokalita; domace: Mesto }) {
  const mesto = lok === "Celé Slovensko" ? null : lok;
  const d = profil.darcovia.filter((x) => !mesto || x.mesto === mesto);
  const prvy = d[0] ?? profil.darcovia[0];
  const dnes = d.reduce((s, x) => s + (x.suma ?? 0), 0);
  return (
    <div style={{ ...karta, padding: 14, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--green)" }} />
        <span style={{ ...nadpisSekcie, color: "var(--green)" }}>Naživo</span>
        <b style={{ fontSize: 14, color: "var(--ink)" }}>Dnes {eur(dnes)} od {d.length || profil.darcovia.length} ľudí</b>
      </div>
      {prvy && <div style={{ fontSize: 13, color: "var(--ink2)" }}>
        {prvy.suma != null && <b style={{ color: "var(--green)" }}>+{eur(prvy.suma)} </b>}
        <b style={{ color: "var(--ink)" }}>{prvy.meno}</b> · {prvy.naCo} · {prvy.pred}
      </div>}
      <div style={{ fontSize: 12, color: "var(--ink4)" }}>Zoradené podľa času, nie podľa sumy.</div>
      {lok === "Celé Slovensko" && <div style={{ fontSize: 12, color: "var(--ink4)" }}>Najskôr {domace}, potom ostatné mestá.</div>}
    </div>
  );
}

// ---------------- overenie (vždy) ----------------
export function Overenie({ p }: { p: TestProfil }) {
  const riadky: [string, string][] = [["Sídlo", p.sidlo], ["IČO", p.ico], ["Transparentný účet", p.ucet], ["Kontakt", p.kontakt]];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {riadky.map(([k, v]) => (
        <div key={k} style={{ display: "grid", gap: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink4)" }}>{k}</div>
          <div style={{ fontSize: 13, color: "var(--ink2)", wordBreak: "break-word" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

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
export function StitOkno({ p, onClose }: { p: TestProfil; onClose: () => void }) {
  const [zobraz, setZobraz] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setZobraz(true)); return () => cancelAnimationFrame(r); }, []);
  const zavri = () => { setZobraz(false); setTimeout(onClose, 250); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  return (
    <PortalVp stit={p.stit}>
      <div onClick={zavri} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(10,8,5,.6)", opacity: zobraz ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-label="Štít DEED+ CARE" style={{ position: "fixed", left: "50%", top: "50%", zIndex: 81, width: "min(460px, calc(100% - 32px))", transform: `translate(-50%, -50%) scale(${zobraz ? 1 : 0.92})`, opacity: zobraz ? 1 : 0, transition: "opacity .25s ease, transform .25s ease", borderRadius: 28, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "0 30px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.5)", padding: "28px 30px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        <button type="button" onClick={zavri} aria-label="Zavrieť" style={{ position: "absolute", right: 14, top: 14, width: 44, height: 44, border: "none", borderRadius: 22, background: "rgba(0,0,0,.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ color: "var(--cuInk)" }}><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <StitCare key={zobraz ? "o" : "z"} stit={p.stit} w={150} h={184} lesk={zobraz} tien="drop-shadow(0 10px 16px rgba(60,40,10,.35))" />
        <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--cuInk2)" }}>ŠTÍT DEED+ CARE</span>
          <b style={{ fontSize: 26, color: "var(--cuInk)" }}>{nazovStitu(p.stit)}</b>
        </span>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--cuInk2)", textWrap: "pretty", maxWidth: 360 } as CSSProperties}>Úroveň dôvery. Rastie s tým, ako {p.typ === "charita" ? "charita" : p.typ === "firma" ? "firma" : "tvorca"} dokladá, na čo išli peniaze.</span>
        <div style={{ alignSelf: "stretch", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, padding: "14px 0", borderTop: "1px solid rgba(0,0,0,.14)", borderBottom: "1px solid rgba(0,0,0,.14)" }}>
          {p.stitCisla.map(([v, t]) => (
            <span key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <b style={{ fontSize: 22, color: "var(--cuInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b>
              <span style={{ fontSize: 12.5, color: "var(--cuInk2)" }}>{t}</span>
            </span>
          ))}
        </div>
        <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 14, fontWeight: 800, color: "var(--cuInk)", minHeight: 44, display: "flex", alignItems: "center" }}>Ako sa štít získava</a>
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
