// KARTA 45 · Svetlo pomoci · Pirát 1 : 1 podľa „Svetlo - Pirat.dc.html" (rovnaké dáta ako Kronika, iné podanie).
// ZMENA 4. 10.: plynulý posun bez scroll-snap a bez bodiek. Na celú výšku len prvá obrazovka (Kto sme), ostatné sekcie podľa obsahu
// (PC: Kam treba najviac a Teraz treba aspoň 720 px). Poradie: Kto sme · Kam treba najviac · Teraz treba · Z Iskier · Ďalšie zbierky · Hľadáme ľudí (len mobil) · Čo sme dokázali · Overenie.
// PC (≥ 1200): text vľavo na tmavom prechode cez fotku, modul stále vpravo (440 px).
// Mobil a tablet: fotka hore (36–52 %), text na pevnej ploche pod ňou, žiadne vnorené rolovanie. Darovanie =
//   zelený pás „Darovať · {vybrané} ⌃" nad dolnou lištou → hárok zdola (86 %) s Tipmi a modulom.
// Pôvodný Pirat.tsx ostáva tvorcovi (Martin Konaľ).
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { eur, tvar, type Lokalita, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { DOK, LokalitaPrepinac, PlagatPrace, PrepinacPodania, klikKarta, PribehText, StitCare, StitOkno, kovText, nazovStitu, useDomaceMesto, usePodanie, vMeste } from "./casti";
import { PodporaProfilu } from "./PodporaProfilu";
import { GRAD, PRUH, MalaZbierka, OznamKarta, ZIskier, bgF, useCharitaData } from "./charitaCasti";

const PC = "(min-width: 1200px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const tlTmave: CSSProperties = { height: 44, border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none" };
/** prvá obrazovka (Kto sme) na celú výšku; ostatné sekcie majú výšku podľa obsahu */
const prva: CSSProperties = { position: "relative", height: "100%", flex: "none", overflow: "hidden" };
const sekcia: CSSProperties = { position: "relative", flex: "none", overflow: "hidden" };
const velkyNadpis = (fs: number, extra?: CSSProperties): CSSProperties => ({ fontSize: fs, lineHeight: 1, letterSpacing: "-.02em", alignSelf: "flex-start", ...kovText, ...extra });
const btnZ: CSSProperties = { border: "none", cursor: "pointer", fontWeight: 800, color: "#fff", background: GRAD, fontFamily: "inherit" };

export function PiratCharita({ profil, onDetail, onBack, prepinac }: { profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void; prepinac?: ReactNode }) {
  const pc = usePc();
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [mod, setMod] = useState<number | null>(null);
  const [sh, setSh] = useState(false);
  const [stitOtv, setStitOtv] = useState(false);
  const [, setPodanie] = usePodanie();
  const d = useCharitaData(profil, lok, domace);
  const snapRef = useRef<HTMLDivElement | null>(null);
  const stit = profil.stit.toLowerCase();

  const meno = profil.meno.replace(/\s+o\.\s?z\.$/, "");
  const veta1 = profil.veta.split(/(?<=\.)\s/)[0];
  const rokov = new Date().getFullYear() - profil.odRoku;
  const zaRoky = `Za ${tvar(rokov, ["rok", "roky", "rokov"])} ${profil.cisla[0][0]} a ${profil.cisla[2][0]} skutkov`;
  const c = profil.centralna;
  const kam = (c.kam ?? "").replace("{m}", lok === "Celé Slovensko" ? "celom Slovensku" : vMeste(lok));
  const sekt = [c, ...profil.sektory];
  const otvorModul = (i: number) => { setMod(i); if (!pc) setSh(true); };
  const vybrane = mod != null ? sekt[mod]?.nazov : "vyber, na čo";


  // ---- spoločné kúsky ----
  const horna = (
    <div style={{ position: "absolute", left: pc ? 48 : 12, right: pc ? 48 : 12, top: pc ? 24 : "max(12px, env(safe-area-inset-top))", zIndex: 9, display: "flex", alignItems: "center", gap: pc ? 10 : 8 }}>
      {pc
        ? <button type="button" onClick={onBack} aria-label="Späť" style={{ ...tlTmave, padding: "0 14px 0 8px", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť</button>
        : <button type="button" onClick={onBack} aria-label="Späť" style={{ ...tlTmave, width: 44 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>}
      <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} sidlo={profil.mesto} tmavy />
      <span style={{ flex: 1 }} />
      <button type="button" aria-label="Zdieľať · QR" style={{ ...tlTmave, width: 44 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg></button>
    </div>
  );
  const stitTl = (w: number, h: number, sw: number, sh2: number, inset = -6, op = 0.55) => (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)}`} style={{ position: "relative", flex: "none", width: w, height: h, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ position: "absolute", inset, borderRadius: "50%", background: "radial-gradient(circle,var(--kov2) 0%,rgba(0,0,0,0) 62%)", opacity: op }} />
      <StitCare stit={profil.stit} w={sw} h={sh2} lesk />
    </button>
  );
  const bodka = <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)", animation: "vpPulz 1.6s ease infinite", flex: "none" }} />;
  const nazivo = (svetle: boolean) => (
    <div style={{ borderRadius: svetle ? 18 : 16, background: svetle ? "rgba(255,255,255,.1)" : "var(--card)", border: `1px solid ${svetle ? "rgba(255,255,255,.2)" : "var(--cardBd)"}`, padding: svetle ? "12px 16px" : "10px 12px", display: "flex", flexDirection: "column", gap: svetle ? 6 : 5, color: svetle ? "#fff" : "var(--ink)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{bodka}<b style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--green)" }}>NAŽIVO</b><b style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", paddingLeft: 4, whiteSpace: "nowrap" }}>Dnes {eur(d.dnes)} od {tvar(d.darcovia.length, ["človeka", "ľudí", "ľudí"])}</b></span>
      {d.ld && <span aria-live="polite" style={{ display: "flex", alignItems: "baseline", gap: 8, opacity: d.liveOp, transition: "opacity .3s", minWidth: 0 }}>
        {d.ld.suma != null && <b style={{ flex: "none", fontSize: 14, color: svetle ? "#A9D18A" : "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>+{eur(d.ld.suma)}</b>}
        <span style={{ flex: "none", fontSize: 14, fontWeight: 700 }}>{d.ld.meno}</span>
        <span style={{ fontSize: 13, color: svetle ? "rgba(255,255,255,.75)" : "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.ld.naCo} · {d.ld.pred}</span>
      </span>}
    </div>
  );
  const sekRiadky = (h: number, fs: number) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {profil.sektory.map((s, i) => (
        <button key={s.id} type="button" onClick={() => otvorModul(i + 1)} style={{ height: h, padding: "0 12px 0 0", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--card)", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
          <span style={{ flex: "none", width: 6, alignSelf: "stretch", background: `var(--h${i + 1})` }} />
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>SEKTOR {i + 1}</span><b style={{ fontSize: fs }}>{s.nazov}</b></span>
          <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{s.mesiac != null ? `${eur(s.mesiac)} tento mesiac` : ""}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>))}
    </div>
  );
  const celkomKarta = (fs: number, pad: string) => (
    <div style={{ padding: pad, borderRadius: pc ? 22 : 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <b style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--acc)" }}>OD ZAČIATKU · {profil.odRoku}</b>
      <span style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {profil.cisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: fs, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{t}</span></span>)}
      </span>
    </div>
  );
  const fakty: [string, string][] = [["Sídlo", profil.sidlo], ["IČO", profil.ico], ["Transparentný účet", profil.ucet], ["Kontakt", profil.kontakt]];
  const faktyEl = (fsK: number, fsV: number, pad: string) => fakty.map(([k, v]) => (
    <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: pad, borderTop: "1px solid var(--cardBd)" }}><span style={{ fontSize: fsK, fontWeight: 700, color: "var(--ink3)" }}>{k}</span><span style={{ fontSize: fsV, fontWeight: 800, textAlign: "right", overflowWrap: "anywhere" }}>{v}</span></div>));
  const kronika = (fs: string) => <button type="button" onClick={() => setPodanie("kronika")} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", fontSize: fs, fontWeight: 800, color: "var(--green)", fontFamily: "inherit" }}>{pc ? "Celá kronika so zbierkami a dokladmi ›" : "Celá kronika ›"}</button>;
  const v = d.velka;
  const okno = stitOtv && <StitOkno p={profil} v6 mobil={!pc} onClose={() => setStitOtv(false)} />;
  const podpora = (rez: "pc" | "mob", vys: number) => <PodporaProfilu profil={profil} lok={lok} domace={domace} rez={rez} vyska={vys} mod={mod} onMod={setMod} />;

  // ================= PC =================
  if (pc) {
    const tmavy = (foto: string, sila: [number, number, number], obsah: ReactNode, klik?: () => void, nazov?: string, celaVyska = false) => (
      <section {...(klik ? klikKarta(klik, nazov) : {})} style={{ ...(celaVyska ? prva : { ...sekcia, minHeight: 720 }), background: "#0E0C08", cursor: klik ? "pointer" : undefined }}>
        <span style={{ position: "absolute", inset: 0, background: bgF(foto) }} />
        <span style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,rgba(10,8,5,${sila[0]}) 0%,rgba(10,8,5,${sila[1]}) ${sila[2]}%,rgba(10,8,5,.1) 100%)` }} />
        {obsah}
      </section>);
    const svetla = (obsah: ReactNode, style?: CSSProperties) => (
      <section style={{ ...sekcia, background: "var(--bg)" }}><div style={{ position: "relative", padding: 56, display: "flex", flexDirection: "column", ...style }}>{obsah}</div></section>);
    return (
      <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", display: "flex", overflow: "hidden" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0, height: "100%" }}>
          <div ref={snapRef} style={{ position: "relative", height: "100%", overflowY: "auto", overscrollBehavior: "contain", display: "flex", flexDirection: "column" }}>
            {tmavy(profil.titulka, [0.92, 0.7, 45], <>
              {horna}
              <div style={{ position: "absolute", left: 56, bottom: 72, width: 560, display: "flex", flexDirection: "column", gap: 18, color: "#fff" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ width: 84, height: 84, borderRadius: 24, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#3F6E2A" }}>{profil.iniciala}</span>
                  {stitTl(84, 100, 84, 102, -6, 0.6)}
                </span>
                <b style={{ fontSize: 64, lineHeight: 1, letterSpacing: "-.03em" }}>{meno}</b>
                <span style={{ fontSize: 20, lineHeight: 1.45, opacity: 0.92 }}>{veta1} {zaRoky}, každé euro doložené.</span>
                {nazivo(true)}
                {prepinac}
                <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.8 }}>Posuň dole</span>
              </div>
            </>, undefined, undefined, true)}
            {tmavy(c.foto, [0.94, 0.72, 50],
              <div style={{ position: "absolute", left: 56, bottom: 64, width: 580, display: "flex", flexDirection: "column", gap: 14, color: "#fff" }}>
                <span style={{ alignSelf: "flex-start", height: 32, padding: "0 14px", borderRadius: 16, background: "#4B7A35", fontSize: 13, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>KAM TREBA NAJVIAC · CENTRÁLNA</span>
                <b style={{ fontSize: 52, lineHeight: 1.05, letterSpacing: "-.02em" }}>{c.nazov} {profil.menoGen ?? meno}</b>
                <span style={{ fontSize: 17, lineHeight: 1.55, opacity: 0.92 }}>{kam}</span>
                <span style={{ display: "flex", alignItems: "baseline", gap: 10, fontVariantNumeric: "tabular-nums" }}><b style={{ fontSize: 30 }}>{eur(c.mesiac ?? c.vyzbierane)}</b><span style={{ fontSize: 16, opacity: 0.85 }}>tento mesiac · {c.darcovia} ľudí pomohlo</span></span>
                <button type="button" onClick={() => otvorModul(0)} style={{ ...btnZ, alignSelf: "flex-start", height: 56, padding: "0 28px", borderRadius: 16, fontSize: 17 }}>Darovať na celú činnosť</button>
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "#F6D77A", paddingTop: 6 }}>ALEBO VYBER SEKTOR</span>
                {sekRiadky(52, 15.5)}
              </div>)}
            {v && tmavy(v.foto, [0.92, 0.65, 50],
              <div style={{ position: "absolute", left: 56, bottom: 72, width: 560, display: "flex", flexDirection: "column", gap: 14, color: "#fff" }}>
                <span style={{ alignSelf: "flex-start", height: 32, padding: "0 14px", borderRadius: 16, background: "#8E3B2F", fontSize: 13, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>TERAZ TREBA{v.konciDni != null ? ` · KONČÍ O ${tvar(v.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : ""}</span>
                <b style={{ fontSize: 52, lineHeight: 1.05, letterSpacing: "-.02em" }}>{v.nazov}</b>
                {v.pribeh ? <PribehText text={v.pribeh} fs={17} farba="rgba(255,255,255,.92)" odkaz="#A9D18A" /> : <span style={{ fontSize: 17, lineHeight: 1.55, opacity: 0.92 }}>{v.popis}</span>}
                {v.ciel != null && <span style={{ display: "block", height: 10, borderRadius: 5, background: "rgba(255,255,255,.2)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, v.vyzbierane / v.ciel)})` }} /></span>}
                <span style={{ display: "flex", alignItems: "baseline", gap: 10, fontVariantNumeric: "tabular-nums" }}><b style={{ fontSize: 30 }}>{eur(v.vyzbierane)}</b><span style={{ fontSize: 16, opacity: 0.85 }}>{v.ciel ? `z ${eur(v.ciel)} · ` : ""}{v.ludia} ľudí</span></span>
                {v.dorovnanie && <span style={{ fontSize: 15, fontWeight: 700, color: "#F6D77A" }}>{v.dorovnanie}</span>}
              </div>, () => onDetail(v), v.nazov)}
            {svetla(<><b style={velkyNadpis(52)}>Z Iskier</b><ZIskier profil={profil} cesty={d.iskryCesty} w={210} h={374} wVs={112} /></>, { gap: 20 })}
            {svetla(<>
              <b style={velkyNadpis(52)}>Ďalšie zbierky a oznamy</b>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>{d.male.map((z) => <MalaZbierka key={z.id} z={z} onDetail={onDetail} />)}</div>
              {d.oznamy.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>{d.oznamy.slice(0, 2).map((o) => <OznamKarta key={o.id} o={o} />)}</div>}
            </>, { gap: 16, overflow: "hidden" })}
            {svetla(<>
              <b style={velkyNadpis(52)}>Čo sme dokázali</b>
              {celkomKarta(30, "18px 20px")}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {d.roky.map((k) => (
                  <div key={k.t} {...klikKarta(() => setPodanie("kronika"), `Rok ${k.t} v kronike`)} style={{ display: "flex", alignItems: "baseline", gap: 24, padding: "16px 0", borderTop: "1px solid var(--cardBd)", cursor: "pointer" }}>
                    <b style={{ flex: "none", width: 150, fontSize: 44, lineHeight: 1, fontVariantNumeric: "tabular-nums", ...kovText }}>{k.t}</b>
                    <span style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>{k.sum.map(([val, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 19, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{val}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t}</span></span>)}</span>
                  </div>))}
              </div>
              {kronika("15px")}
            </>, { gap: 18 })}
            <section style={{ ...sekcia, background: "var(--bg)" }}>
              <div style={{ position: "relative", padding: 56, display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: 40, alignItems: "center" }}>
                {stitTl(240, 290, 230, 280, -10, 0.5)}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <b style={velkyNadpis(52)}>Overenie</b>
                  <b style={{ fontSize: 24 }}>{nazovStitu(profil.stit)} štít · 99 % doložené</b>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 18px", borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
                    {profil.onas && <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties}>{profil.onas.text}</span>}
                    {faktyEl(13, 13.5, "8px 0")}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        <aside style={{ width: 440, flex: "none", overflowY: "auto", background: "var(--panel)", borderLeft: "1px solid var(--accLine)", padding: "22px 22px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          <b style={{ fontSize: 22 }}>Darovať {profil.menoDat ?? meno}</b>
          {podpora("pc", 118)}
          <PlagatPrace praca={profil.praca} />
        </aside>
        {okno}
      </div>
    );
  }

  // ================= MOBIL a TABLET =================
  const foto = (f: string, vys: string | number, stitok?: ReactNode) => (<>
    <div style={{ position: "relative", flex: "none", height: typeof vys === "number" ? vys : `calc((100% - ${DOK}px) * ${parseFloat(vys) / 100})`, background: bgF(f) }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.45) 0%,rgba(10,8,5,0) 35%)" }} />
      {stitok}
    </div>
    <span style={{ display: "block", flex: "none", height: "var(--mH)", background: "var(--metal)" }} />
  </>);
  const stitok = (t: string, farba: string, bottom: number) => <span style={{ position: "absolute", left: 16, bottom, height: 30, padding: "0 12px", borderRadius: 15, background: farba, color: "#fff", fontSize: 12, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{t}</span>;
  const spodok = DOK + 70; // nad zeleným pásom a dolnou lištou appky
  const obr = (obsah: ReactNode, klik?: () => void, nazov?: string, celaVyska = false) => <section {...(klik ? klikKarta(klik, nazov) : {})} style={{ ...(celaVyska ? prva : sekcia), background: "var(--bg)", cursor: klik ? "pointer" : undefined }}><div style={celaVyska ? { position: "absolute", inset: 0, display: "flex", flexDirection: "column" } : { position: "relative", display: "flex", flexDirection: "column" }}>{obsah}</div></section>;
  const textPlocha = (obsah: ReactNode, pad = "16px 18px", gap = 9, ov: "hidden" | "visible" = "hidden", dole = 24) => <div style={{ flex: 1, minHeight: 0, padding: pad, paddingBottom: dole, display: "flex", flexDirection: "column", gap, overflow: ov }}>{obsah}</div>;
  const plocha = (obsah: ReactNode, gap = 12, dole = 24) => <div style={{ position: "relative", padding: `32px 16px ${dole}px`, display: "flex", flexDirection: "column", gap, overflow: "hidden" }}>{obsah}</div>;
  const [p1, p2] = profil.praca;

  return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <div ref={snapRef} style={{ position: "absolute", inset: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column" }}>
        {obr(<>
          {foto(profil.titulka, "52%")}
          {textPlocha(<>
            <span style={{ display: "flex", alignItems: "center", gap: 12, marginTop: -62, position: "relative" }}>
              <span style={{ width: 72, height: 72, borderRadius: 22, background: "#fff", border: "3px solid var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#3F6E2A", boxShadow: "0 8px 20px rgba(0,0,0,.3)" }}>{profil.iniciala}</span>
              <span style={{ flex: 1 }} />
              {stitTl(76, 92, 76, 92)}
            </span>
            <b style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: "-.02em" }}>{meno}</b>
            <span style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink2)" }}>{veta1} {zaRoky}.</span>
            {nazivo(false)}
          </>, "16px 18px", 9, "visible", spodok)}
        </>, undefined, undefined, true)}
        {obr(<>
          {foto(c.foto, 240, stitok("KAM TREBA NAJVIAC", "#4B7A35", 12))}
          {textPlocha(<>
            <b style={{ fontSize: 24, lineHeight: 1.1 }}>{c.nazov}</b>
            <span style={{ flex: "none", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden", fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" } as CSSProperties}>{kam}</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums" }}><b style={{ fontSize: 20 }}>{eur(c.mesiac ?? c.vyzbierane)}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>tento mesiac</span></span>
            <button type="button" onClick={() => otvorModul(0)} style={{ ...btnZ, flex: "none", height: 48, borderRadius: 14, fontSize: 15.5 }}>Darovať na celú činnosť</button>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 2 }}>ALEBO SEKTOR</span>
            {sekRiadky(44, 14)}
          </>, "14px 16px", 8)}
        </>)}
        {v && obr(<>
          {foto(v.foto, 280, stitok(`TERAZ TREBA${v.konciDni != null ? ` · KONČÍ O ${tvar(v.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : ""}`, "#8E3B2F", 14))}
          {textPlocha(<>
            <b style={{ fontSize: 25, lineHeight: 1.15 }}>{v.nazov}</b>
            <span style={{ flex: "none", display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 3, overflow: "hidden", fontSize: 14, lineHeight: 1.45, color: "var(--ink2)" } as CSSProperties}>{v.pribeh ?? v.popis}</span>
            {v.ciel != null && <span style={{ display: "block", flex: "none", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, v.vyzbierane / v.ciel)})` }} /></span>}
            <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums" }}><b style={{ fontSize: 21 }}>{eur(v.vyzbierane)}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{v.ciel ? `z ${eur(v.ciel)} · ` : ""}{v.ludia} ľudí</span></span>
            {v.dorovnanie && <span style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>{v.dorovnanie}</span>}
          </>)}
        </>, () => onDetail(v), v.nazov)}
        <section style={{ ...sekcia, background: "var(--bg)" }}>{plocha(<><b style={velkyNadpis(34)}>Z Iskier</b><ZIskier profil={profil} cesty={d.iskryCesty} w={150} h={268} wVs={112} /></>)}</section>
        <section style={{ ...sekcia, background: "var(--bg)" }}>{plocha(<>
          <b style={velkyNadpis(30, { lineHeight: 1.05 })}>Ďalšie zbierky</b>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{d.male.map((z) => <MalaZbierka key={z.id} z={z} onDetail={onDetail} t={64} />)}</div>
          {d.oznamy.length > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 4 }}>NAJBLIŽŠIE</span>}
          {d.oznamy.slice(0, 2).map((o) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--cardBd)" }}>
              <span style={{ flex: "none", width: 44, height: 50, borderRadius: 12, background: o.dBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}><b style={{ fontSize: 17, lineHeight: 1 }}>{o.den}</b><span style={{ fontSize: 9.5, fontWeight: 800 }}>{o.mes}</span></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: o.stc }}>{o.st}</span><b style={{ fontSize: 14, lineHeight: 1.25 }}>{o.n}</b></span>
            </div>))}
        </>, 10)}</section>
        {p1 && <section style={{ ...sekcia, background: "var(--bg)" }}>{plocha(<>
          <b style={{ fontSize: 30, lineHeight: 1.05, color: "var(--blue)" }}>Hľadáme ľudí</b>
          <article style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: "linear-gradient(160deg,#2C5576 0%,#3D6B8E 60%,#4F7FA3 100%)", color: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ alignSelf: "flex-start", height: 26, padding: "0 10px", borderRadius: 13, background: "#fff", color: "#2C5576", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>{p1.stitok}</span>
            <b style={{ fontSize: 24, lineHeight: 1.15 }}>{p1.nazov}</b>
            <span style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.92 }}>{p1.opis}</span>
            <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "4px 12px", fontSize: 13.5, padding: "8px 0", borderTop: "1px solid rgba(255,255,255,.22)", borderBottom: "1px solid rgba(255,255,255,.22)" }}>
              <span style={{ opacity: 0.75 }}>Kde</span><b>{p1.kde}</b><span style={{ opacity: 0.75 }}>Kedy</span><b>{p1.kedy}</b><span style={{ opacity: 0.75 }}>Odmena</span><b>{p1.odmena}</b>
            </div>
            <button type="button" style={{ height: 46, border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#2C5576", boxShadow: "none", fontFamily: "inherit" }}>Mám záujem</button>
          </article>
          {p2 && <button type="button" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: "1.5px solid var(--blue)", background: "transparent", boxShadow: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--blue)" }}>{p2.stitok} · {p2.mesto.toLocaleUpperCase("sk-SK")}</span><b style={{ fontSize: 15 }}>{p2.nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{p2.kedy} · {p2.odmena}</span></span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg></button>}
        </>, 10)}</section>}
        <section style={{ ...sekcia, background: "var(--bg)" }}>{plocha(<>
          <b style={velkyNadpis(30, { lineHeight: 1.05 })}>Čo sme dokázali</b>
          {celkomKarta(19, "12px 14px")}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {d.roky.map((k) => (
              <div key={k.t} {...klikKarta(() => setPodanie("kronika"), `Rok ${k.t} v kronike`)} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "10px 0", borderTop: "1px solid var(--cardBd)", cursor: "pointer", minHeight: 44 }}>
                <b style={{ flex: "none", width: 80, fontSize: 30, lineHeight: 1, fontVariantNumeric: "tabular-nums", ...kovText }}>{k.t}</b>
                <span style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>{k.sum.map(([val, t]) => <span key={t} style={{ fontSize: 12, color: "var(--ink3)" }}><b style={{ fontSize: 14, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{val}</b> {t}</span>)}</span>
              </div>))}
          </div>
          {kronika("14px")}
        </>)}</section>
        <section style={{ ...sekcia, background: "var(--bg)" }}>
          <div style={{ position: "relative", padding: `32px 18px ${prepinac ? 24 : spodok}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", overflow: "hidden" }}>
            {stitTl(150, 180, 144, 176, -10, 0.5)}
            <b style={{ fontSize: 24 }}>{nazovStitu(profil.stit)} štít · 99 % doložené</b>
            <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>IČO, transparentný účet a štatutár overení. Ťukni na štít.</span>
            <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", textAlign: "left" }}>{faktyEl(12.5, 13, "8px 0")}</div>
          </div>
        </section>
        {prepinac && <section style={{ ...sekcia, background: "var(--bg)" }}>{plocha(<PrepinacPodania pas />, 12, spodok)}</section>}
      </div>
      {horna}

      <button type="button" onClick={() => setSh(true)} aria-haspopup="dialog" style={{ position: "absolute", left: 14, right: 14, bottom: DOK - 8, zIndex: 20, height: 56, border: "none", borderRadius: 18, background: "var(--gGrad, linear-gradient(90deg,#4B7A35,#8DB866))", boxShadow: "0 10px 26px rgba(0,0,0,.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16.5, fontWeight: 800, color: "#fff", fontFamily: "inherit" }}>
        Darovať · {vybrane}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
      </button>
      <div onClick={() => setSh(false)} style={{ position: "absolute", inset: 0, zIndex: 25, background: "rgba(10,8,5,.55)", opacity: sh ? 1 : 0, pointerEvents: sh ? "auto" : "none", transition: "opacity .25s ease" }} />
      <div role="dialog" aria-label="Darovať" aria-hidden={!sh} style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 26, height: "86%", borderRadius: "26px 26px 0 0", background: "var(--bg)", boxShadow: "0 -20px 50px rgba(0,0,0,.4)", transform: `translateY(${sh ? "0%" : "105%"})`, transition: "transform .32s cubic-bezier(.2,.8,.2,1)", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "center", padding: "8px 8px 4px 18px" }}>
          <b style={{ flex: 1, fontSize: 17 }}>Darovať {profil.menoDat ?? meno}</b>
          <button type="button" onClick={() => setSh(false)} aria-label="Zavrieť" style={{ width: 44, height: 44, border: "none", borderRadius: 22, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: `6px 16px ${DOK + 24}px`, display: "flex", flexDirection: "column", gap: 12 }}>
          {podpora("mob", 100)}
        </div>
      </div>
      {okno}
    </div>
  );
}
