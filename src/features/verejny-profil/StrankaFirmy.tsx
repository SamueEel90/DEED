// KARTA 46 · stránka firmy (B2B) · Pekáreň Dobrota 1 : 1 podľa „B2B - Pekaren Dobrota.dc.html" (nahrádza Výklad Pekárne).
// Firma nepredáva reklamu, ukazuje, že pomáha tam, kde predáva. PC (≥ 1200): obsah vľavo, vpravo lepkavý stĺpec 400 px.
// Mobil a tablet: všetko pod sebou. Poradie: Titulka · DOROVNALI SME · NAŽIVO · POMÁHAME V REGIÓNOCH (región človeka prvý)
// · TERAZ DOROVNÁVAME · STENA VĎAKY · NAŠI ĽUDIA POMÁHAJÚ · KÚP A POMÔŽ · FOND DOBROTY (ModulProfilu bez dorovnania)
// · HĽADÁME ĽUDÍ (zbalený aj na PC, „Mzda") · O FIRME. Prázdna sekcia sa neukáže.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { eur, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { otvorIskry } from "@/features/iskry/otvor";
import { toast } from "@/shared";
import { DOK, PortalVp, StitCare, klikKarta, nazovStitu, useDomaceMesto } from "./casti";
import { ModulProfilu } from "./ModulProfilu";
import { GRAD, PRUH, bgF } from "./charitaCasti";

const PC = "(min-width: 1200px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const tlTmave: CSSProperties = { height: 44, border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" };
const PLAGAT = "linear-gradient(160deg,#2C5576 0%,#3D6B8E 60%,#4F7FA3 100%)";
const bgX = (f: string) => (f.startsWith("url(") ? f : bgF(f));

function Nadpis({ t, s }: { t: string; s?: string }) {
  return <span style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", paddingTop: 10 }}><b style={{ fontSize: 12, letterSpacing: ".1em", color: "var(--acc)" }}>{t}</b>{s && <span style={{ fontSize: 13, color: "var(--ink3)" }}>{s}</span>}</span>;
}

export function StrankaFirmy({ profil, onDetail, onBack }: { profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void }) {
  const pc = usePc();
  const b = profil.b2b!;
  const domace = useDomaceMesto(profil);
  const stit = profil.stit.toLowerCase();
  const [stitOtv, setStitOtv] = useState(false);
  const [mod, setMod] = useState<number | null>(null);
  const [pOtv, setPOtv] = useState<Record<string, boolean>>({});
  const [live, setLive] = useState(0), [liveOp, setLiveOp] = useState(1);
  const dlRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let t2: number | undefined;
    const t = window.setInterval(() => { setLiveOp(0); t2 = window.setTimeout(() => { setLive((x) => x + 1); setLiveOp(1); }, 320); }, 5000);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, []);
  const [ls, lt] = b.live[live % b.live.length];
  const regiony = [...b.regiony].sort((a, c) => Number(c.mesto === domace) - Number(a.mesto === domace));
  const fond = [profil.centralna, ...profil.sektory];
  const zbal = () => { setMod(null); requestAnimationFrame(() => dlRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const detailZb = (id?: string) => { const z = profil.zbierky.find((x) => x.id === id); if (z) onDetail(z); };
  const kopiruj = () => { try { void navigator.clipboard?.writeText(b.kup.kod); } catch { /* clipboard */ } toast("Kód skopírovaný"); };

  const stitTl = (w: number, h: number, sw: number, sh: number) => (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít firmy · ${nazovStitu(profil.stit)} · podrobnosti a overenie`} style={{ position: "relative", flex: "none", width: w, height: h, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "radial-gradient(circle,var(--kov2) 0%,rgba(0,0,0,0) 62%)", opacity: 0.55 }} />
      <StitCare stit={profil.stit} w={sw} h={sh} lesk firma />
    </button>
  );
  const titulka = (
    <div style={{ position: "relative", height: pc ? 340 : 290, background: bgF(profil.titulka) }}>
      <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,.05) 35%,rgba(10,8,5,${pc ? ".88" : ".9"}) 100%)` }} />
      <div style={{ position: "absolute", left: pc ? 32 : 12, right: pc ? 32 : 12, top: pc ? 20 : "max(12px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: pc ? 10 : 8 }}>
        <button type="button" onClick={onBack} aria-label="Späť" style={{ ...tlTmave, padding: "0 14px 0 8px", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "inherit" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť</button>
        <span style={{ flex: 1 }} />
        <button type="button" aria-label="Zdieľať · QR" style={{ ...tlTmave, width: 44 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg></button>
      </div>
      {pc
        ? <div style={{ position: "absolute", left: 32, right: 32, bottom: 26, display: "flex", alignItems: "flex-end", gap: 22 }}>
            <span style={{ flex: "none", width: 104, height: 104, borderRadius: 30, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800, color: "#6B4A1E", boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>{profil.iniciala}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, color: "#fff" }}>
              <b style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-.02em" }}>{b.kratko}</b>
              <span style={{ fontSize: 17, lineHeight: 1.45, opacity: 0.92 }}>{profil.veta}</span>
            </span>
            {stitTl(108, 128, 100, 120)}
          </div>
        : <div style={{ position: "absolute", left: 16, right: 12, bottom: 14, display: "flex", alignItems: "flex-end", gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, color: "#fff" }}>
              <b style={{ fontSize: 28, lineHeight: 1.1 }}>{b.kratko}</b>
              <span style={{ fontSize: 14, lineHeight: 1.4, opacity: 0.92 }}>{b.vetaMob}</span>
            </span>
            {stitTl(80, 96, 76, 92)}
          </div>}
    </div>
  );

  const dorovnali = (
    <div style={{ borderRadius: 20, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--gold)", animation: "vpPulz 1.6s ease infinite" }} /><b style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--gold)", whiteSpace: "nowrap" }}>DOROVNALI SME · NAŽIVO</b></span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}><b style={{ fontSize: pc ? 46 : 36, lineHeight: 1, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{b.dorSum}</b><span style={{ fontSize: 14, color: "var(--ink2)", whiteSpace: "nowrap" }}>tento rok · každý dar 1&nbsp;:&nbsp;1</span></span>
      <span aria-live="polite" style={{ fontSize: 13.5, color: "var(--ink2)", opacity: liveOp, transition: "opacity .3s" }}><b style={{ color: "var(--gold)" }}>{ls}</b> {lt}</span>
      <span style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, borderTop: "1px solid var(--goldBd)", paddingTop: 8 }}>
        {b.dorCisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 17, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{t}</span></span>)}
      </span>
    </div>
  );
  const regionyEl = regiony.length > 0 && <>
    <Nadpis t="POMÁHAME V REGIÓNOCH" s={pc ? "kde predávame, tam vraciame" : undefined} />
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${pc ? 3 : 1},minmax(0,1fr))`, gap: 12 }}>
      {regiony.map((r) => {
        const tvoj = r.mesto === domace;
        return (
          <article key={r.mesto} style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: "var(--card)", border: tvoj ? "2px solid var(--acc)" : "1px solid var(--cardBd)", display: "flex", flexDirection: "column" }}>
            <span style={{ position: "relative", display: "block", height: 110, background: bgX(r.foto) }}>
              <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,0) 30%,rgba(10,8,5,.8) 100%)" }} />
              <b style={{ position: "absolute", left: 14, bottom: 10, fontSize: 22, color: "#fff" }}>{r.mesto}</b>
              {tvoj && <span style={{ position: "absolute", right: 10, top: 10, height: 26, padding: "0 10px", borderRadius: 13, background: "#fff", color: "#1D211B", fontSize: 11, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>TVOJ REGIÓN</span>}
            </span>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums" }}><b style={{ fontSize: 20 }}>{r.suma}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{r.zbierok}</span></span>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink2)" }}>{r.kto}</span>
            </div>
          </article>);
      })}
    </div>
  </>;
  const dorZb = b.dorZb.length > 0 && <>
    <Nadpis t="TERAZ DOROVNÁVAME" s={pc ? "tvoj dar sa zdvojnásobí" : undefined} />
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${pc ? 2 : 1},minmax(0,1fr))`, gap: 12 }}>
      {b.dorZb.map((z) => (
        <article key={z.nazov} {...klikKarta(() => detailZb(z.zbierkaId), z.nazov)} style={{ borderRadius: 22, overflow: "hidden", background: "var(--card)", border: "1px solid var(--goldBd)", display: "flex", flexDirection: "column", cursor: "pointer" }}>
          <span style={{ position: "relative", display: "block", height: 150, background: bgX(z.foto) }}>
            <span style={{ position: "absolute", left: 12, top: 12, height: 28, padding: "0 11px", borderRadius: 14, background: "#F6C453", color: "#1D211B", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>DOROVNÁVAME 1 : 1</span>
          </span>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{z.st}</span>
            <b style={{ fontSize: 18, lineHeight: 1.25 }}>{z.nazov}</b>
            <span style={{ display: "block", height: 7, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, z.vyzbierane / z.ciel)})` }} /></span>
            <span style={{ fontSize: 13.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}><b style={{ color: "var(--ink)", fontSize: 16 }}>{eur(z.vyzbierane)}</b> z {eur(z.ciel)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>Pekáreň pridá rovnakú sumu · ešte {z.este}</span>
          </div>
        </article>))}
    </div>
  </>;
  const [vw, vh] = pc ? [170, 300] : [140, 248];
  const vdaka = b.vdaka.length > 0 && <>
    <Nadpis t="STENA VĎAKY" s={pc ? "charity ďakujú vlastnými slovami" : undefined} />
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
      {b.vdaka.map((v) => (
        <button key={v.q} type="button" onClick={() => (v.iskraId ? otvorIskry(v.iskraId) : undefined)} aria-label={`Poďakovanie: ${v.q}`} style={{ position: "relative", flex: "none", width: vw, height: vh, borderRadius: 18, overflow: "hidden", background: bgX(v.foto), cursor: "pointer", border: "none", padding: 0, textAlign: "left" }}>
          <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.3) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 45%,rgba(0,0,0,.88) 100%)" }} />
          <span style={{ position: "absolute", left: 8, top: 8, height: 24, padding: "0 9px", borderRadius: 12, background: "#F6C453", color: "#1D211B", fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>ĎAKUJEME FIRME</span>
          <span style={{ position: "absolute", left: "50%", top: "40%", width: 40, height: 40, margin: "-20px 0 0 -20px", borderRadius: "50%", background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
          <span style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 3, color: "#fff" }}><b style={{ fontSize: 13.5, lineHeight: 1.3 }}>„{v.q}“</b><span style={{ fontSize: 11.5, opacity: 0.85 }}>{v.kto}</span></span>
        </button>))}
    </div>
  </>;
  const ludia = <>
    <Nadpis t="NAŠI ĽUDIA POMÁHAJÚ" />
    <div style={{ borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "14px 16px", display: "flex", flexDirection: "column" }}>
      <span style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, paddingBottom: 10 }}>
        {b.zamCisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 20, fontVariantNumeric: "tabular-nums" }}>{v}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{t}</span></span>)}
      </span>
      {b.zamSk.map((k) => (
        <div key={k.nazov} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid var(--cardBd)" }}>
          <span style={{ flex: "none", width: 52, height: 52, borderRadius: 14, background: bgX(k.foto) }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--green)" }}>SKUTOK · {k.mesto}</span><b style={{ fontSize: 14.5, lineHeight: 1.3 }}>{k.nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{k.kto}</span></span>
        </div>))}
      <span style={{ fontSize: 12, color: "var(--ink3)", paddingTop: 6 }}>Mená len so súhlasom S menom. Ostatní sú v číslach.</span>
    </div>
  </>;
  const onas = <>
    <Nadpis t="O FIRME" />
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 18px", borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)" }}>{b.onas}</span>
      {b.fakty.map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--cardBd)" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{k}</span><span style={{ fontSize: 13.5, fontWeight: 800, textAlign: "right" }}>{v}</span></div>)}
    </div>
  </>;
  const kup = (
    <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: "linear-gradient(135deg,#3A2A14 0%,#6B4A1E 100%)", color: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "#F6D77A" }}>KÚP A POMÔŽ</span>
      <b style={{ fontSize: 22, lineHeight: 1.2 }}>{b.kup.nadpis}</b>
      <span style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.9 }}>{b.kup.text}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ height: 48, padding: "0 18px", borderRadius: 14, border: "2px dashed #F6D77A", display: "flex", alignItems: "center", fontSize: 20, fontWeight: 800, letterSpacing: ".08em", color: "#F6D77A" }}>{b.kup.kod}</span>
        <button type="button" onClick={kopiruj} style={{ height: 48, padding: "0 16px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "#3A2A14", boxShadow: "none", fontFamily: "inherit" }}>Kopírovať kód</button>
      </span>
      <button type="button" style={{ alignSelf: "flex-start", minHeight: 44, margin: "-10px 0", padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 800, color: "#F6D77A", fontFamily: "inherit" }}>{b.kup.web} ›</button>
      <span style={{ fontSize: 12.5, opacity: 0.8 }}>{b.kup.predajne}</span>
    </div>
  );
  const fondEl = <>
    <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: pc ? 0 : 6 }}>FOND DOBROTY · DARUJ S NAMI</span>
    <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)" }}>{b.fondText}</span>
    <div ref={dlRef} style={{ scrollMarginTop: 56, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
      {fond.map((d, i) => {
        const on = mod === i;
        return (
          <button key={d.id} type="button" onClick={() => setMod(on ? null : i)} aria-expanded={on} style={{ position: "relative", height: pc ? 112 : 100, padding: 0, borderRadius: 18, border: on ? `3px solid var(--h${i})` : "1px solid var(--cardBd)", background: bgF(d.foto), overflow: "hidden", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: `var(--h${i})`, zIndex: 1 }} />
            <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,0) 25%,rgba(10,8,5,.85) 100%)" }} />
            <span style={{ position: "relative", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, color: "#fff" }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", opacity: 0.85 }}>{i ? `SEKTOR ${i}` : "FOND DOBROTY"}</span>
              <b style={{ fontSize: 15, lineHeight: 1.2 }}>{d.nazov}</b>
              <span style={{ fontSize: 12, opacity: 0.9 }}>{d.mesiac != null ? `${eur(d.mesiac)} tento mesiac` : ""}</span>
            </span>
          </button>);
      })}
    </div>
    {mod != null && fond[mod] && <ModulProfilu key={fond[mod].id} profil={profil} sektor={fond[mod]} poradie={mod} mestoV="" onZbal={zbal} dorovnanie={false}
      meno={b.kratko} typ={mod ? `SEKTOR ${mod}` : "FOND DOBROTY"} typ2={mod ? "peniaze idú len na túto tému" : "rozdelíme ich charitám v regiónoch"} info={b.fondInfo} />}
  </>;
  const prace = b.praca.length > 0 && <>
    <Nadpis t="HĽADÁME ĽUDÍ" />
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {b.praca.map((j) => {
        const on = !!pOtv[j.id];
        return (
          <article key={j.id} style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: PLAGAT, color: "#fff", display: "flex", flexDirection: "column" }}>
            <button type="button" onClick={() => setPOtv((o) => ({ ...o, [j.id]: !on }))} aria-expanded={on} style={{ minHeight: 64, padding: "12px 10px 12px 16px", border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", textAlign: "left", color: "#fff", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", opacity: 0.85 }}>{j.stitok} · {j.pod}</span><b style={{ fontSize: 17, lineHeight: 1.2 }}>{j.nazov}</b></span>
              <span style={{ flex: "none", width: 36, height: 36, borderRadius: 18, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: `rotate(${on ? 180 : 0}deg)`, transition: "transform .25s ease" }}><path d="M6 9l6 6 6-6" /></svg></span>
            </button>
            {on && <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.92 }}>{j.opis}</span>
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "4px 12px", fontSize: 13.5, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.22)", borderBottom: "1px solid rgba(255,255,255,.22)" }}>
                <span style={{ opacity: 0.75 }}>Kde</span><b>{j.kde}</b><span style={{ opacity: 0.75 }}>Kedy</span><b>{j.kedy}</b><span style={{ opacity: 0.75 }}>Mzda</span><b>{j.odmena}</b>
              </div>
              <button type="button" style={{ alignSelf: "flex-start", height: 46, padding: "0 20px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#2C5576", boxShadow: "none", fontFamily: "inherit" }}>Mám záujem</button>
            </div>}
          </article>);
      })}
    </div>
  </>;
  const okno = stitOtv && <OknoStituFirmy profil={profil} mobil={!pc} onClose={() => setStitOtv(false)} />;
  const kov = <span style={{ display: "block", height: "var(--mH)", background: "var(--metal)" }} />;

  if (pc) return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto" }}>
      {titulka}{kov}
      <div style={{ padding: "24px 32px 120px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 400px", gap: 32, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {dorovnali}{regionyEl}{dorZb}{vdaka}{ludia}{onas}
        </div>
        <aside style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {kup}{fondEl}{prace}
        </aside>
      </div>
      {okno}
    </div>
  );
  return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {titulka}{kov}
      <div style={{ padding: `16px 16px ${DOK + 24}px`, display: "flex", flexDirection: "column", gap: 12 }}>
        {dorovnali}{regionyEl}{dorZb}{vdaka}{ludia}{kup}
        <span style={{ display: "block", paddingTop: 6 }} />
        {fondEl}{prace}{onas}
      </div>
      {okno}
    </div>
  );
}

/** okno štítu firmy: PC v strede, mobil zdola; štít s leskom, čísla a štítky (na titulke žiadne štítky) */
function OknoStituFirmy({ profil, mobil, onClose }: { profil: TestProfil; mobil: boolean; onClose: () => void }) {
  const b = profil.b2b!;
  const [zobraz, setZobraz] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setZobraz(true)); return () => cancelAnimationFrame(r); }, []);
  const zavri = () => { setZobraz(false); window.setTimeout(onClose, 250); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") zavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  const karta: CSSProperties = { borderRadius: 28, background: "var(--cuBg)", border: "1.5px solid var(--cuBd)", boxShadow: "0 30px 80px rgba(0,0,0,.5)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", opacity: zobraz ? 1 : 0, zIndex: 81 };
  return (
    <PortalVp stit={profil.stit}>
      <div onClick={zavri} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(10,8,5,.6)", opacity: zobraz ? 1 : 0, transition: "opacity .25s ease" }} />
      <div role="dialog" aria-label="Štít firmy" style={mobil
        ? { ...karta, position: "fixed", left: 12, right: 12, bottom: 12, maxHeight: "calc(100% - 24px)", overflowY: "auto", transform: `translateY(${zobraz ? 0 : 40}px)`, transition: "opacity .25s ease, transform .3s ease" }
        : { ...karta, position: "fixed", left: "50%", top: "50%", width: "min(460px, calc(100% - 32px))", transform: `translate(-50%, -50%) scale(${zobraz ? 1 : 0.92})`, transition: "opacity .25s ease, transform .3s ease" }}>
        <button type="button" onClick={zavri} aria-label="Zavrieť" style={{ position: "absolute", right: 12, top: 12, width: 44, height: 44, border: "none", borderRadius: 22, background: "rgba(0,0,0,.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ color: "var(--cuInk)" }}><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <StitCare key={zobraz ? "o" : "z"} stit={profil.stit} w={120} h={146} lesk={zobraz} firma />
        <b style={{ fontSize: 22, color: "var(--cuInk)" }}>{nazovStitu(profil.stit)} štít firmy</b>
        <div style={{ alignSelf: "stretch", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, padding: "10px 0", borderTop: "1px solid rgba(0,0,0,.14)", borderBottom: "1px solid rgba(0,0,0,.14)" }}>
          {b.stitCisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><b style={{ fontSize: 19, color: "var(--cuInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12, color: "var(--cuInk2)" }}>{t}</span></span>)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
          {b.stitky.map((c) => <span key={c} style={{ height: 28, padding: "0 11px", borderRadius: 14, border: "1px solid var(--cuBd)", display: "flex", alignItems: "center", fontSize: 12.5, fontWeight: 800, color: "var(--cuInk)" }}>{c}</span>)}
        </div>
      </div>
    </PortalVp>
  );
}
