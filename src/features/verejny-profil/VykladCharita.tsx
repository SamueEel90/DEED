// KARTA 45 · Svetlo pomoci · Výklad 1 : 1 podľa „Svetlo - Vyklad.dc.html" (rovnaké dáta ako Kronika, iné podanie).
// PC (≥ 1200): veľká titulka 380 px (logo, meno, veta, štít na fotke) · Naživo + Od začiatku · lepkavé záložky
//   Darovať · Zbierky · Iskry · Oznamy a práca · História · O nás (ťuk skočí na sekciu) · obsah vľavo, vpravo
//   lepkavý stĺpec 420 px (Tipy + modul + plagát Hľadáme ľudí celý).
// Mobil a tablet (< 1200): titulka 300 px, Naživo, záložky, Darovať ako prvá sekcia, plagát zbalený.
// Pôvodný Vyklad.tsx ostáva Pekárni (firma).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { eur, pct, tvar, type Lokalita, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { DOK, LokalitaPrepinac, PlagatPrace, PribehText, StitCare, StitOkno, nazovStitu, useDomaceMesto } from "./casti";
import { PodporaProfilu } from "./PodporaProfilu";
import { GRAD, PRUH, MalaZbierka, OznamKarta, RokyOs, ZIskier, bgF, sekciaNadpis, stZb, useCharitaData } from "./charitaCasti";

const PC = "(min-width: 1200px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const TABY = ["Darovať", "Zbierky", "Iskry", "Oznamy a práca", "História", "O nás"];
const tlTmave: CSSProperties = { height: 44, border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" };

export function VykladCharita({ profil, onDetail, onBack, prepinac }: { profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void; prepinac?: ReactNode }) {
  const pc = usePc();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [tab, setTab] = useState(0);
  const [stitOtv, setStitOtv] = useState(false);
  const d = useCharitaData(profil, lok, domace);
  const scRef = useRef<HTMLDivElement | null>(null);
  const sek = useRef<(HTMLElement | null)[]>([]);
  const stit = profil.stit.toLowerCase();

  const skoc = (i: number) => {
    setTab(i);
    const box = scRef.current, el = sek.current[i];
    if (!box || !el) return;
    box.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 70), behavior: "smooth" });
  };
  const kotva = (i: number) => (el: HTMLElement | null) => { sek.current[i] = el; };

  // ---- titulka ----
  const horna = (
    <div style={{ position: "absolute", left: pc ? 32 : 12, right: pc ? 32 : 12, top: pc ? 20 : "max(12px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: pc ? 10 : 8 }}>
      {pc
        ? <button type="button" onClick={onBack} aria-label="Späť" style={{ ...tlTmave, padding: "0 14px 0 8px", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť</button>
        : <button type="button" onClick={onBack} aria-label="Späť" style={{ ...tlTmave, width: 44 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>}
      <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} sidlo={profil.mesto} tmavy />
      <span style={{ flex: 1 }} />
      <button type="button" aria-label="Zdieľať · QR" style={{ ...tlTmave, width: 44 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg></button>
    </div>
  );
  const stitTl = (w: number, h: number, sw: number, sh: number) => (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)} · podrobnosti a overenie`} style={{ position: "relative", flex: "none", width: w, height: h, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "radial-gradient(circle,var(--kov2) 0%,rgba(0,0,0,0) 62%)", opacity: 0.55 }} />
      <StitCare stit={profil.stit} w={sw} h={sh} lesk />
    </button>
  );
  const titulka = (
    <div style={{ position: "relative", height: pc ? 380 : 300, background: bgF(profil.titulka) }}>
      <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(10,8,5,.5) 0%,rgba(10,8,5,.05) 35%,rgba(10,8,5,${pc ? ".85" : ".88"}) 100%)` }} />
      {horna}
      {pc
        ? <div style={{ position: "absolute", left: 32, right: 32, bottom: 28, display: "flex", alignItems: "flex-end", gap: 22 }}>
            <span style={{ flex: "none", width: 108, height: 108, borderRadius: 30, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "#3F6E2A", boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>{profil.iniciala}</span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, color: "#fff" }}>
              <b style={{ fontSize: 46, lineHeight: 1.05, letterSpacing: "-.02em" }}>{profil.meno}</b>
              <span style={{ fontSize: 17, lineHeight: 1.45, opacity: 0.92, maxWidth: 720 }}>{profil.veta}</span>
            </span>
            {stitTl(112, 132, 104, 128)}
          </div>
        : <div style={{ position: "absolute", left: 16, right: 12, bottom: 16, display: "flex", alignItems: "flex-end", gap: 12 }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, color: "#fff" }}>
              <b style={{ fontSize: 27, lineHeight: 1.1 }}>{profil.meno}</b>
              <span style={{ fontSize: 14, lineHeight: 1.4, opacity: 0.92 }}>{profil.veta.split(/(?<=\.)\s/)[0]}</span>
            </span>
            {stitTl(80, 96, 84, 102)}
          </div>}
    </div>
  );
  const kov = <span style={{ display: "block", height: "var(--mH)", background: "var(--metal)" }} />;

  // ---- Naživo + Od začiatku ----
  const bodka = <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)", animation: "vpPulz 1.6s ease infinite", flex: "none" }} />;
  const nazivo = (
    <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{bodka}<b style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--green)" }}>NAŽIVO</b><b style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", paddingLeft: 4, whiteSpace: "nowrap" }}>Dnes {eur(d.dnes)} od {tvar(d.darcovia.length, ["človeka", "ľudí", "ľudí"])}</b></span>
      {d.ld && <span aria-live="polite" style={{ display: "flex", alignItems: "baseline", gap: 8, opacity: d.liveOp, transition: "opacity .3s", minWidth: 0 }}>
        {d.ld.suma != null && <b style={{ flex: "none", fontSize: 14, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>+{eur(d.ld.suma)}</b>}
        <span style={{ flex: "none", fontSize: 14, fontWeight: 700 }}>{d.ld.meno}</span>
        <span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.ld.naCo} · {d.ld.pred}</span>
      </span>}
    </span>
  );
  const celkom = (fs: number) => (
    <span style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {profil.cisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: fs, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{t}</span></span>)}
    </span>
  );
  const odZac = <b style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--acc)" }}>OD ZAČIATKU · {profil.odRoku}</b>;
  const pas = pc
    ? <div style={{ padding: "14px 32px", display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 24, alignItems: "center", borderBottom: "1px solid var(--cardBd)" }}>
        {nazivo}
        <span style={{ display: "flex", flexDirection: "column", gap: 4, borderLeft: "1px solid var(--cardBd)", paddingLeft: 24 }}>{odZac}{celkom(18)}</span>
      </div>
    : <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6, borderBottom: "1px solid var(--cardBd)" }}>{nazivo}</div>;

  // ---- lepkavé záložky ----
  const taby = (
    <div role="tablist" aria-label="Sekcie profilu" style={{ position: "sticky", top: 0, zIndex: 6, background: "var(--bg)", borderBottom: "1px solid var(--cardBd)", display: "flex", gap: 2, overflowX: "auto", padding: pc ? "0 24px" : "0 8px" }}>
      {TABY.map((t, i) => {
        const on = tab === i;
        return <button key={t} type="button" role="tab" aria-selected={on} onClick={() => skoc(i)} style={{ flex: "none", height: 52, padding: "0 14px", border: "none", borderBottom: `3px solid ${on ? "var(--acc)" : "transparent"}`, background: "transparent", boxShadow: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14.5, fontWeight: on ? 800 : 600, color: on ? "var(--ink)" : "var(--ink3)", fontFamily: "inherit" }}>{t}</button>;
      })}
    </div>
  );

  // ---- zbierky ----
  const v = d.velka;
  const velka = v && (
    <article style={{ display: "grid", gridTemplateColumns: pc ? "minmax(0,1fr) minmax(0,1.1fr)" : "1fr", borderRadius: 24, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <span style={{ position: "relative", display: "block", minHeight: pc ? 300 : 190, background: bgF(v.foto) }}>
        {v.konciDni != null && <span style={{ position: "absolute", left: 12, top: 12, height: 28, padding: "0 11px", borderRadius: 14, background: "#8E3B2F", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>KONČÍ O {tvar(v.konciDni, ["DEŇ", "DNI", "DNÍ"])}</span>}
      </span>
      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{stZb(v)}</span>
        <b style={{ fontSize: 21, lineHeight: 1.2 }}>{v.nazov}</b>
        {v.pribeh ? <PribehText text={v.pribeh} /> : <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{v.popis}</span>}
        {v.ciel != null && <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(v.vyzbierane, v.ciel) / 100})` }} /></span>}
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><b style={{ fontSize: 19 }}>{eur(v.vyzbierane)}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{v.ciel ? `z ${eur(v.ciel)} · ` : ""}{v.ludia} ľudí</span></span>
        {v.dorovnanie && <span style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>{v.dorovnanie}</span>}
        <button type="button" onClick={() => onDetail(v)} style={{ alignSelf: "flex-start", height: 48, padding: "0 22px", border: "none", borderRadius: 14, background: GRAD, cursor: "pointer", fontSize: 15.5, fontWeight: 800, color: "#fff", fontFamily: "inherit" }}>Pozrieť a darovať</button>
      </div>
    </article>
  );
  const zbierky = (<>
    <span ref={kotva(1)} style={sekciaNadpis}>ZBIERKY · AKTUÁLNE</span>
    {velka}
    {d.male.length > 0 && <div style={{ display: "grid", gridTemplateColumns: `repeat(${pc ? 2 : 1},minmax(0,1fr))`, gap: 12 }}>{d.male.map((z) => <MalaZbierka key={z.id} z={z} onDetail={onDetail} />)}</div>}
  </>);
  const iskry = <><span ref={kotva(2)} /><ZIskier profil={profil} cesty={d.iskryCesty} w={pc ? 140 : 116} h={pc ? 248 : 206} wVs={112} /></>;
  const oznamy = d.oznamy.length > 0 && <>
    <span ref={kotva(3)} style={sekciaNadpis}>OZNAMY</span>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${pc ? 2 : 1},minmax(0,1fr))`, gap: 12 }}>{d.oznamy.map((o) => <OznamKarta key={o.id} o={o} />)}</div>
  </>;
  const historia = (<>
    <span ref={kotva(4)} style={sekciaNadpis}>HISTÓRIA · ROKY</span>
    {!pc && <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "12px 14px", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>{odZac}{celkom(17)}</div>}
    <RokyOs roky={d.roky} onDetail={onDetail} />
  </>);
  const fakty: [string, string][] = [["Sídlo", profil.sidlo], ["IČO", profil.ico], ["Transparentný účet", profil.ucet], ["Kontakt", profil.kontakt]];
  const onas = (<>
    <span ref={kotva(5)} style={sekciaNadpis}>O NÁS</span>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 18px", borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      {profil.onas && <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties}>{profil.onas.text}</span>}
      {fakty.map(([k, val]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--cardBd)" }}><span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{k}</span><span style={{ fontSize: 13.5, fontWeight: 800, textAlign: "right", overflowWrap: "anywhere" }}>{val}</span></div>)}
    </div>
  </>);
  const okno = stitOtv && <StitOkno p={profil} v6 mobil={!pc} onClose={() => setStitOtv(false)} />;

  if (pc) return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <div ref={scRef} style={{ height: "100%", overflowY: "auto", position: "relative" }}>
        {titulka}{kov}{pas}
        {prepinac && <div style={{ padding: "12px 32px 0" }}>{prepinac}</div>}
        {taby}
        <div style={{ padding: "26px 32px 120px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 420px", gap: 32, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <span ref={kotva(0)} />
            {zbierky}{iskry}{oznamy}{historia}{onas}
          </div>
          <aside style={{ position: "sticky", top: 76, display: "flex", flexDirection: "column", gap: 12 }}>
            <PodporaProfilu profil={profil} lok={lok} domace={domace} rez="pc" vyska={118} />
            <PlagatPrace praca={profil.praca} />
          </aside>
        </div>
      </div>
      {okno}
    </div>
  );

  return (
    <div ref={scRef} className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      {titulka}{kov}{pas}
      {prepinac && <div style={{ padding: "12px 16px 0" }}>{prepinac}</div>}
      {taby}
      <div style={{ padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: 14 }}>
        <span ref={kotva(0)} />
        <PodporaProfilu profil={profil} lok={lok} domace={domace} rez="mob" nadpis="DAROVAŤ · TIPY NA PRAVIDELNÝ DAR" vyska={104} />
        <PlagatPrace praca={profil.praca} zbaleny />
        {zbierky}{iskry}{oznamy}{historia}{onas}
      </div>
      <div style={{ height: DOK + 24 }} />
      {okno}
    </div>
  );
}
