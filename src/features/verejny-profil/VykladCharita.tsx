// KARTA 55 · C — Výklad v3 „noviny vo výklade" (príbehy predávajú), 1 : 1 podľa „Svetlo - Vyklad v3.dc.html".
// PC (≥ 1200): titulka (fotka 62 %, logo 100, meno 56, štít) + vpravo Tento týždeň u nás → kovová čiara →
//   vľavo Príbeh týždňa + Ďalšie príbehy · vpravo sticky 420 px Naživo, Podporiť (4 dlaždice + modul) →
//   pás Hľadáme ľudí → Čo sme dokázali (filtre, mriežka 4) → Videá z Iskier.
// Mobil a tablet: titulka 360 → Tento týždeň → Príbeh týždňa → Podporiť (modul zmenšený, B) → Ďalšie príbehy →
//   Hľadáme ľudí → Čo sme dokázali (riadky s fotkou 92 px) → Videá z Iskier. Bez veľkých rokov (to je Kronika).
import { useOtvorHlavnuZQr } from "./otvor";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { eur, pct, tvar, jeFarnost, type Lokalita, type TestProfil, type TestSektor, type TestZbierka } from "@/lib/testProfily";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { druhF, druhT, type Druh } from "@/lib/druhy";
import { PracaKarta } from "@/components/PracaKarta";
import { DOK, LokalitaPrepinac, StitCare, StitOkno, klikKarta, nazovStitu, useDomaceMesto } from "./casti";
import { ModulProfilu } from "./ModulProfilu";
import { type PolCh, ZIskier, bgF, useCharitaData } from "./charitaCasti";

const PC = "(min-width: 1200px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const tlTmave: CSSProperties = { height: 44, border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "none", fontFamily: "inherit" };
const stitok = (t: string, bg: string, mob = false, extra?: CSSProperties) =>
  <span style={{ position: "absolute", height: mob ? 26 : 30, padding: `0 ${mob ? 10 : 12}px`, borderRadius: mob ? 9 : 10, background: bg, color: "#fff", fontSize: mob ? 11.5 : 12.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap", ...extra }}>{t}</span>;
const pruh = (zLudi: number, zFirmy: number, h: number) => (
  <div style={{ height: h, borderRadius: h / 2, background: "var(--track)", overflow: "hidden", display: "flex" }}>
    <div style={{ height: "100%", width: `${zLudi}%`, background: "#6E9B4F" }} />
    {zFirmy > 0 && <div style={{ height: "100%", width: `${zFirmy}%`, background: "#C9A24A" }} />}
  </div>);
const stavZb = (z: TestZbierka) => z.stav === "dlhodoba" ? "DLHODOBÁ" : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : null;
const kdeZb = (z: TestZbierka) => [z.mesto, z.stav === "dlhodoba" ? "dlhodobá" : z.cast, z.kategoria].filter(Boolean).join(" · ").toLocaleUpperCase("sk-SK");
// oznam „Tento týždeň u nás": dátum vo farbe druhu, súrne #8E3B2F
const OZ_FARBA = { vyzva: ["#8E3B2F", "var(--red)"], akcia: [druhF("akcia"), druhT("akcia")], oznam: ["#3A342A", "var(--ink2)"] } as const;

export function VykladCharita({ profil, onDetail, onZaznam, onBack, odFarnikov }: { /** KARTA 56I: sekcia Od veriacich (farnosť) */ odFarnikov?: ReactNode; profil: TestProfil; onDetail: (z: TestZbierka) => void; onZaznam: (p: PolCh) => void; onBack: () => void }) {
  const pc = usePc();
  const mob = !pc;
  const domace = useDomaceMesto(profil);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [stitOtv, setStitOtv] = useState(false);
  const [sel, setSel] = useState(-1);
  useOtvorHlavnuZQr(profil.k, profil.typ === "farnost", () => setSel(0)); // OPRAVY 162
  const [filter, setFilter] = useState<"vsetko" | "skutok" | "zbierka" | "akcia">("vsetko");
  const d = useCharitaData(profil, lok, domace);
  const stit = profil.stit.toLowerCase();
  const farnost = jeFarnost(profil);
  const meno = profil.meno.replace(/\s+o\.\s?z\.$/i, "");

  // ---- titulka ----
  const horna = (
    <div style={{ position: "absolute", left: pc ? 36 : 16, right: pc ? 36 : 16, top: pc ? 22 : "max(14px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: pc ? 10 : 8 }}>
      <button type="button" onClick={onBack} aria-label="Späť" style={{ ...tlTmave, padding: pc ? "0 14px 0 8px" : 0, width: pc ? undefined : 44, gap: 4, fontSize: 14, fontWeight: 800, color: "#fff" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>{pc && "Späť"}</button>
      <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} sidlo={profil.mesto} tmavy />
    </div>);
  const stitTl = (w: number, h: number) => farnost ? null : (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)} · podrobnosti a overenie`} style={{ flex: "none", width: w, height: h, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer" }}>
      <StitCare stit={profil.stit} w={w} h={h} lesk />
    </button>);
  const logo = (s: number, r: number, fs: number) => <span style={{ flex: "none", width: s, height: s, borderRadius: r, background: "#fff", color: "#3F6E2A", fontSize: fs, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{profil.iniciala}</span>;
  const fotoTitulky = (
    <div style={{ position: "relative", flex: pc ? 1.6 : undefined, height: pc ? undefined : 360, background: bgF(profil.titulka) }}>
      <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(10,8,5,${pc ? ".45" : ".5"}) 0%,rgba(10,8,5,0) 30%,rgba(10,8,5,.9) 100%)` }} />
      {horna}
      {pc ? <div style={{ position: "absolute", left: 36, right: 36, bottom: 32, display: "flex", alignItems: "flex-end", gap: 20 }}>
          {logo(100, 24, 36)}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-.03em", color: "#fff" }}>{meno}</b>
            <span style={{ fontSize: 18, lineHeight: 1.45, color: "#E8E1D3" }}>{profil.veta}</span>
          </div>
          {stitTl(112, 132)}
        </div>
        : <div style={{ position: "absolute", left: 16, right: 16, bottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>{logo(72, 20, 26)}{stitTl(76, 90)}</div>
          <b style={{ fontSize: 34, lineHeight: 1.02, letterSpacing: "-.03em", color: "#fff" }}>{meno}</b>
          <span style={{ fontSize: 15, lineHeight: 1.45, color: "#E8E1D3" }}>{profil.veta.split(/(?<=\.)\s/)[0]}</span>
        </div>}
    </div>);
  const kov = <div style={{ height: "var(--mH)", background: "var(--metal)", flex: "none" }} />;

  // ---- Tento týždeň u nás ----
  const oznamy = d.oznamy.slice(0, 4);
  const oznamKarta = (o: typeof oznamy[number]) => {
    const [bg, c] = OZ_FARBA[o.druh ?? "oznam"];
    return (
      <div key={o.id} style={{ display: "flex", gap: mob ? 12 : 14, alignItems: "center", padding: mob ? 8 : 10, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <span style={{ width: mob ? 54 : 62, height: mob ? 60 : 70, flex: "none", borderRadius: mob ? 12 : 14, background: bg, color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><b style={{ fontSize: mob ? 21 : 24, lineHeight: 1 }}>{o.den}</b><span style={{ fontSize: mob ? 10.5 : 11.5, fontWeight: 800, letterSpacing: ".08em" }}>{o.mes}</span></span>
        <div style={{ display: "flex", flexDirection: "column", gap: mob ? 2 : 3, minWidth: 0 }}>
          <span style={{ fontSize: mob ? 10.5 : 11, fontWeight: 800, letterSpacing: ".08em", color: c }}>{o.st}</span>
          <b style={{ fontSize: mob ? 15 : 16, lineHeight: 1.25 }}>{o.n}</b>
          <span style={{ fontSize: mob ? 12 : 12.5, color: "var(--ink3)" }}>{o.s} · {o.pocet}</span>
        </div>
      </div>);
  };
  const tentoTyzden = oznamy.length > 0 && <>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><b style={{ fontSize: mob ? 22 : 24, letterSpacing: "-.02em" }}>Tento týždeň u nás</b>{pc && <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{tvar(oznamy.length, ["oznam", "oznamy", "oznamov"])}</span>}</div>
    {oznamy.map(oznamKarta)}
  </>;

  // ---- Príbeh týždňa a Ďalšie príbehy (bežiace zbierky) ----
  const tyzden = d.bezice.find((z) => z.pribehTyzdna) ?? d.bezice[0];
  const dalsie = d.bezice.filter((z) => z !== tyzden).slice(0, 4);
  const dorPill = (z: TestZbierka) => z.dorovnanie && !farnost && profil.dorovnaniePas ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 5px", borderRadius: 12, background: "var(--goldBg)", border: "1px solid var(--goldBd)", alignSelf: "flex-start" }}>
      <span style={{ width: mob ? 24 : 26, height: mob ? 24 : 26, borderRadius: 7, background: "#F2EBDD", color: "#8A6A1C", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{profil.dorovnaniePas.ini}</span>
      <span style={{ fontSize: mob ? 12.5 : 13.5, fontWeight: 700, color: "var(--gold)" }}>{z.dorovnanie}</span>
    </div>) : null;
  const citat = (z: TestZbierka, fs: number, fsKto: number) => z.citat && (
    <div style={{ padding: mob ? "2px 0 2px 14px" : "4px 0 4px 18px", borderLeft: `${mob ? 3 : 4}px solid var(--acc)`, display: "flex", flexDirection: "column", gap: mob ? 4 : 8 }}>
      <span style={{ fontSize: fs, lineHeight: 1.4, fontWeight: 700, fontStyle: "italic" }}>„{z.citat.text}“</span>
      <span style={{ fontSize: fsKto, color: "var(--ink3)" }}>{z.citat.kto}</span>
    </div>);
  const pribehTyzdna = tyzden && (() => {
    const z = tyzden, zF = z.zFirmy ?? 0, p = pct(z.vyzbierane, z.ciel), pF = z.ciel ? Math.min(100 - p, Math.round(zF / z.ciel * 100)) : 0, pL = Math.max(0, p - pF);
    const st = stavZb(z);
    const sumaRiadok = [tvar(z.ludia, ["človek", "ľudia", "ľudí"]), zF ? `${eur(zF)} pridala firma` : null, `zbierka ${cisloObjektu("Z", z.id)}`].filter(Boolean).join(" · ");
    return (
      <div {...klikKarta(() => onDetail(z), z.nazov)} style={{ borderRadius: mob ? 22 : 24, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", borderLeft: `${mob ? 5 : 6}px solid ${druhF("zbierka")}`, cursor: "pointer" }}>
        <div style={{ position: "relative", aspectRatio: mob ? "4/3" : "16/8", background: bgF(z.foto) }}>
          {stitok("ZBIERKA", druhF("zbierka"), mob, { top: mob ? 10 : 16, left: mob ? 10 : 16 })}
          {st && stitok(st, "var(--dr-stav)", mob, { top: mob ? 10 : 16, right: mob ? 10 : 16 })}
        </div>
        {pc ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 32, padding: "28px 32px 32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>{kdeZb(z)}</span>
              <b style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: "-.03em" }}>{z.nazov}</b>
              <span style={{ fontSize: 17, lineHeight: 1.65, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties}>{z.kratky ?? z.popis}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {citat(z, 22, 14)}{dorPill(z)}
              <span style={{ fontSize: 16, color: "var(--ink3)" }}><b style={{ fontSize: 38, letterSpacing: "-.03em", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(z.vyzbierane)}</b>{z.ciel ? `  z ${eur(z.ciel)}` : ""}</span>
              {pruh(pL, pF, 9)}
              <span style={{ fontSize: 14, color: "var(--ink3)" }}>{sumaRiadok}</span>
              <b style={{ fontSize: 16, color: "var(--gInk)" }}>Pozrieť a darovať ›</b>
            </div>
          </div>
          : <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            <b style={{ fontSize: 26, lineHeight: 1.08, letterSpacing: "-.025em" }}>{z.nazov}</b>
            <span style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ink2)" }}>{z.kratky ?? z.popis}</span>
            {citat(z, 17, 12.5)}{dorPill(z)}
            {pruh(pL, pF, 8)}
            <span style={{ fontSize: 15 }}><b style={{ fontSize: 24, fontVariantNumeric: "tabular-nums" }}>{eur(z.vyzbierane)}</b> <span style={{ color: "var(--ink3)" }}>{[z.ciel ? `z ${eur(z.ciel)}` : null, tvar(z.ludia, ["človek", "ľudia", "ľudí"])].filter(Boolean).join(" · ")}</span></span>
            <b style={{ fontSize: 15, color: "var(--gInk)" }}>Pozrieť a darovať ›</b>
          </div>}
      </div>);
  })();
  const dalsiPribeh = (z: TestZbierka) => {
    const p = pct(z.vyzbierane, z.ciel);
    const text = <>
      <span style={{ fontSize: mob ? 14.5 : 15.5, lineHeight: mob ? 1.55 : 1.6, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties}>{z.kratky ?? z.popis}</span>
      {z.citat && <span style={{ fontSize: mob ? 14 : 15, fontStyle: "italic", fontWeight: 700 }}>„{z.citat.text}“ {z.citat.kto}</span>}
      {z.ciel ? <div style={{ height: 7, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><div style={{ height: "100%", width: `${p}%`, background: "#6E9B4F" }} /></div> : null}
      <span style={{ fontSize: mob ? 14 : 14.5 }}><b style={{ fontVariantNumeric: "tabular-nums" }}>{eur(z.vyzbierane)}</b> <span style={{ color: "var(--ink3)" }}>{[z.ciel ? `z ${eur(z.ciel)}` : null, tvar(z.ludia, ["človek", "ľudia", "ľudí"])].filter(Boolean).join(" · ")}</span></span>
    </>;
    return (
      <div key={z.id} {...klikKarta(() => onDetail(z), z.nazov)} style={{ display: "flex", flexDirection: mob ? "column" : "row", borderRadius: mob ? 20 : 22, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", borderLeft: `5px solid ${druhF("zbierka")}`, cursor: "pointer" }}>
        <div style={{ position: "relative", width: mob ? undefined : 300, aspectRatio: mob ? "16/9" : undefined, flex: "none", background: bgF(z.foto) }}>{stitok("ZBIERKA", druhF("zbierka"), true, { top: 12, left: 12 })}</div>
        <div style={{ flex: 1, minWidth: 0, padding: mob ? "14px 16px 16px" : "22px 26px", display: "flex", flexDirection: "column", gap: mob ? 8 : 10 }}>
          {pc && <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>{kdeZb(z)}</span>}
          <b style={{ fontSize: mob ? 20 : 24, lineHeight: 1.15, letterSpacing: "-.02em" }}>{z.nazov}</b>
          {text}
        </div>
      </div>);
  };
  const kicker = (t: string, extra?: CSSProperties) => <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", ...extra }}>{t}</span>;

  // ---- Naživo + Podporiť (4 dlaždice + modul) ----
  const bodka = <span style={{ width: 9, height: 9, borderRadius: 5, background: "var(--green)", animation: "vpPulz 1.6s ease infinite", flex: "none" }} />;
  const nazivo = (
    <div style={{ borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{bodka}<b style={{ fontSize: 12, letterSpacing: ".1em", color: "var(--green)" }}>NAŽIVO</b><span style={{ flex: 1 }} /><b style={{ fontSize: 15, fontVariantNumeric: "tabular-nums" }}>Dnes {eur(d.dnes)} od {tvar(d.darcovia.length, ["človeka", "ľudí", "ľudí"])}</b></div>
      <span style={{ fontSize: 14, color: "var(--ink3)" }}><b style={{ color: "var(--acc)", letterSpacing: ".08em", fontSize: 12 }}>OD ZAČIATKU · {profil.odRoku}</b>{"  "}{profil.cisla.map(([v, t], i) => <span key={t}>{i ? " · " : ""}<b style={{ color: "var(--ink)" }}>{v}</b> {t}</span>)}</span>
    </div>);
  const sektory: TestSektor[] = [profil.centralna, ...profil.sektory].slice(0, 4);
  const dlazdice = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
      {sektory.map((s, i) => { const on = sel === i; return (
        <button key={s.id} type="button" data-hier={String(i)} aria-expanded={on} onClick={() => setSel(on ? -1 : i)} style={{ borderRadius: mob ? 16 : 18, overflow: "hidden", background: "var(--card)", border: `2px solid ${on ? "var(--hc)" : "var(--cardBd)"}`, cursor: "pointer", display: "flex", flexDirection: "column", padding: 0, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          <span style={{ display: "block", width: "100%", height: mob ? 66 : 80, background: bgF(s.foto), position: "relative" }}><span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, background: "var(--hcF)" }} /></span>
          <span style={{ padding: mob ? "8px 10px 10px" : "10px 12px 12px", display: "flex", flexDirection: "column", gap: mob ? 1 : 2 }}>
            <b style={{ fontSize: mob ? 14 : 15 }}>{s.nazov}</b>
            <span style={{ fontSize: mob ? 12 : 12.5, color: "var(--ink3)" }}>{s.dlazdicaText ?? (s.mesiac != null ? `${eur(s.mesiac)} tento mesiac` : eur(s.vyzbierane))}</span>
          </span>
        </button>); })}
    </div>);
  const modul = sel >= 0 && sektory[sel] && (
    <ModulProfilu key={sektory[sel].id} profil={profil} sektor={sektory[sel]} poradie={sel} mestoV="" onZbal={() => setSel(-1)} dorovnanie={!farnost}
      typ={sektory[sel].typ} typ2={sektory[sel].typ2} info={sektory[sel].info} hlavna={farnost && !sel} />);
  const podporit = <>
    {kicker(pc ? `PODPORIŤ ${meno.toLocaleUpperCase("sk-SK")} · AJ PRAVIDELNE` : "PODPORIŤ · AJ PRAVIDELNE", { paddingTop: mob ? 16 : 6 })}
    {dlazdice}{modul}
  </>;

  // ---- Hľadáme ľudí ----
  const prace = profil.praca;
  const praceNadpis = profil.pracaNadpis ? profil.pracaNadpis.charAt(0) + profil.pracaNadpis.slice(1).toLocaleLowerCase("sk-SK") : "Hľadáme ľudí";
  const praca = (j: typeof prace[number]) => <PracaKarta key={j.id} j={j} />; // OPRAVY 156/2
  const hladame = prace.length > 0 && (
    <div style={{ marginTop: mob ? 28 : 56, padding: mob ? "24px 16px" : "44px 40px", background: "var(--panel)", borderTop: "1px solid var(--cardBd)", borderBottom: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: mob ? 12 : 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}><b style={{ fontSize: mob ? 26 : 44, letterSpacing: mob ? "-.02em" : "-.03em" }}>{praceNadpis}</b>{pc && !farnost && <span style={{ fontSize: 16, color: "var(--ink3)" }}>{tvar(prace.length, ["ponuka", "ponuky", "ponúk"])} · prihlásiš sa jedným ťukom</span>}</div>
      <div style={mob ? { display: "flex", flexDirection: "column", gap: 12 } : { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 }}>{prace.map(praca)}</div>
    </div>);

  // ---- Čo sme dokázali (skutky, ukončené zbierky, akcie s 1 – 2 vetami) ----
  const pol = d.roky.flatMap((r) => r.pol).filter((p) => p.typ !== "is");
  const druhPol = (p: PolCh): Druh => (p.typ === "zb" ? "zbierka" : p.typ === "oz" ? "akcia" : "skutok");
  const coBolo = (p: PolCh) => p.typ === "sk" ? profil.skutky.find((s) => s.id === p.id)?.coSaStalo ?? p.s : p.q ?? p.s;
  const vedla = (p: PolCh) => p.typ === "sk" ? `${p.d} ${p.m.toLocaleLowerCase("sk-SK")} · ${p.s.split(" · ").slice(-1)[0]}` : p.q ? `${p.s}${p.dok ? ` · ${p.dok.toLocaleLowerCase("sk-SK")}` : ""}` : `${p.d} ${p.m.toLocaleLowerCase("sk-SK")}`;
  const wall = pol.filter((p) => filter === "vsetko" || druhPol(p) === filter).slice(0, 8);
  const FILTRE: [typeof filter, string][] = [["vsetko", "Všetko"], ["skutok", "Skutky"], ["zbierka", "Zbierky"], ["akcia", "Akcie"]];
  const pocet = (f: typeof filter) => Math.min(8, f === "vsetko" ? pol.length : pol.filter((p) => druhPol(p) === f).length);
  const filtre = (
    <div style={{ display: "flex", gap: 8, overflowX: mob ? "auto" : undefined }}>
      {FILTRE.map(([k, t]) => { const on = filter === k; return <button key={k} type="button" aria-pressed={on} onClick={() => setFilter(k)} style={{ flex: "none", height: 44, padding: `0 ${mob ? 15 : 16}px`, borderRadius: 22, border: `1.5px solid ${on ? "var(--ink)" : "var(--cardBd)"}`, background: on ? "var(--ink)" : "transparent", color: on ? "var(--bg)" : "var(--ink)", cursor: "pointer", fontSize: mob ? 14 : 14.5, fontWeight: 800, whiteSpace: "nowrap", fontFamily: "inherit", boxShadow: "none" }}>{t} · {pocet(k)}</button>; })}
    </div>);
  const wallKarta = (p: PolCh) => {
    const dr = druhPol(p);
    return mob ? (
      <div key={p.id} {...klikKarta(() => onZaznam(p), p.nazov)} style={{ display: "flex", gap: 12, padding: 10, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", borderLeft: `5px solid ${druhF(dr)}`, cursor: "pointer" }}>
        <span style={{ width: 92, height: 92, flex: "none", borderRadius: 12, background: bgF(p.foto) }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: druhT(dr) }}>{dr === "zbierka" ? "ZBIERKA" : dr === "akcia" ? "AKCIA" : "SKUTOK"}</span><b style={{ fontSize: 15, lineHeight: 1.22 }}>{p.nazov}</b><span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink2)" }}>{coBolo(p)}</span></div>
      </div>) : (
      <div key={p.id} {...klikKarta(() => onZaznam(p), p.nazov)} style={{ borderRadius: 20, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", borderLeft: `5px solid ${druhF(dr)}`, cursor: "pointer", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", aspectRatio: "4/3", background: bgF(p.foto) }}>{stitok(dr === "zbierka" ? "ZBIERKA" : dr === "akcia" ? "AKCIA" : "SKUTOK", druhF(dr), true, { top: 10, left: 10 })}</div>
        <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 17, lineHeight: 1.22 }}>{p.nazov}</b><span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{coBolo(p)}</span><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{vedla(p)}</span></div>
      </div>);
  };
  const dokazali = pol.length > 0 && (
    <div style={{ padding: mob ? "28px 16px 0" : "52px 40px 0", display: "flex", flexDirection: "column", gap: mob ? 12 : 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <b style={{ fontSize: mob ? 26 : 44, letterSpacing: mob ? "-.02em" : "-.03em" }}>Čo sme dokázali</b>
        {pc && !farnost && <span style={{ fontSize: 16, color: "var(--ink3)", paddingBottom: 8 }}>všetko doložené</span>}
        {pc && <><span style={{ flex: 1 }} />{filtre}</>}
      </div>
      {mob && filtre}
      <div style={mob ? { display: "flex", flexDirection: "column", gap: 12 } : { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14 }}>{wall.map(wallKarta)}</div>
    </div>);
  const iskry = (
    <div style={{ padding: mob ? "28px 16px 0" : "52px 40px 48px", display: "flex", flexDirection: "column", gap: 16 }}>
      <b style={{ fontSize: mob ? 26 : 32, letterSpacing: "-.02em" }}>Videá z Iskier</b>
      <ZIskier profil={profil} cesty={d.iskryCesty} w={mob ? 150 : 180} h={mob ? 266 : 320} wVs={mob ? 150 : 180} nadpis={false} />
    </div>);
  const okno = stitOtv && <StitOkno p={profil} v6 mobil={mob} onClose={() => setStitOtv(false)} />;
  const obal = (obsah: ReactNode) => (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" } as CSSProperties}>{obsah}{okno}</div>);

  if (pc) return obal(<>
    <div style={{ display: "flex", height: 540 }}>
      {fotoTitulky}
      <div style={{ flex: 1, minWidth: 0, padding: "28px 28px 20px", display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", borderLeft: "1px solid var(--cardBd)", overflowY: "auto" }}>{tentoTyzden}</div>
    </div>
    {kov}
    <div style={{ display: "flex", gap: 32, padding: "44px 40px 0", alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
        {pribehTyzdna && <>{kicker("PRÍBEH TÝŽDŇA", { fontSize: 13, letterSpacing: ".14em" })}{pribehTyzdna}</>}
        {dalsie.length > 0 && <><b style={{ fontSize: 32, letterSpacing: "-.02em" }}>Ďalšie príbehy</b>{dalsie.map(dalsiPribeh)}</>}
      </div>
      <aside style={{ width: 420, flex: "none", display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>{nazivo}{podporit}</aside>
    </div>
    {odFarnikov}{hladame}{dokazali}{iskry}
  </>);

  return obal(<>
    {fotoTitulky}{kov}
    <div style={{ padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
      {tentoTyzden}
      {pribehTyzdna && <>{kicker("PRÍBEH TÝŽDŇA", { letterSpacing: ".14em", paddingTop: 16 })}{pribehTyzdna}</>}
      {podporit}
      {dalsie.length > 0 && <><b style={{ fontSize: 26, letterSpacing: "-.02em", paddingTop: 18 }}>Ďalšie príbehy</b>{dalsie.map(dalsiPribeh)}</>}
    </div>
    {odFarnikov}{hladame}{dokazali}{iskry}
    <div style={{ height: DOK + 24 }} />
  </>);
}
