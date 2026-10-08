// KARTA 55 · D — Pirát v2 „celé obrazovky, história ako cesta", 1 : 1 podľa „Svetlo - Pirat v2.dc.html".
// PC sekcie po 820 px: 1 titulka (meno 112 px, štít, Naživo vpravo hore; „Posuň ⌄" zmazané, OPRAVY 155/6) · 2 Teraz (hlavná zbierka, ťuk na celú plochu) ·
//   3 Kam poslať (4 stĺpce, vybraný flex 2,4, modul hneď vedľa v stĺpci 420 px s vlastným posunom) ·
//   4 Naša cesta (prerušovaná zlatá krivka, zastávky = posledné skutky a ukončené zbierky + DNES) · 5 Ďalšie teraz (karty 2a) · 6 Videá z Iskier.
// Mobil: rovnaké sekcie pod sebou; Kam poslať = 4 pásy (vybraný 220 px), modul pod nimi zmenšený (B, bod 151/3); cesta zvislá.
import { useOtvorHlavnuZQr } from "./otvor";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { eur, pct, tvar, jeFarnost, type Lokalita, type TestProfil, type TestSektor, type TestZbierka, type TestPraca } from "@/lib/testProfily";
import { druhF, type Druh } from "@/lib/druhy";
import { PracaKarta } from "@/components/PracaKarta";
import { DOK, StitCare, StitOkno, klikKarta, nazovStitu, useDomaceMesto } from "./casti";
import { ModulProfilu } from "./ModulProfilu";
import { type PolCh, ZIskier, bgF, useCharitaData } from "./charitaCasti";

const PC = "(min-width: 1200px)";
function usePc() {
  const [p, setP] = useState(() => typeof window !== "undefined" && window.matchMedia(PC).matches);
  useEffect(() => { const q = window.matchMedia(PC), f = () => setP(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return p;
}
const DRUH_TXT: Record<Druh, string> = { zbierka: "ZBIERKA", ziadost: "ŽIADOSŤ", skutok: "SKUTOK", ponuka: "PONUKA", akcia: "AKCIA", hladame: "HĽADÁME" };
const stitok = (t: string, bg: string, s: CSSProperties, h = 26) => <span style={{ position: "absolute", height: h, padding: "0 10px", borderRadius: 9, background: bg, color: "#fff", fontSize: h > 28 ? 13 : 11.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center", whiteSpace: "nowrap", ...s }}>{t}</span>;
/** krivka cez body (vodorovne / zvislo) — ako v prototype */
const krivka = (pts: [number, number][]) => pts.reduce((a, [x, y], i) => { if (!i) return `M${x} ${y}`; const [px, py] = pts[i - 1]; const mx = (px + x) / 2; return `${a} C${mx} ${py} ${mx} ${y} ${x} ${y}`; }, "");
const krivkaV = (pts: [number, number][]) => pts.reduce((a, [x, y], i) => { if (!i) return `M${x} ${y}`; const [px, py] = pts[i - 1]; const my = (py + y) / 2; return `${a} C${px} ${my} ${x} ${my} ${x} ${y}`; }, "");
const Y_PC = [380, 170, 360, 150, 340, 110];

export function PiratCharita({ profil, onDetail, onZaznam, onBack, odFarnikov, hore }: { /** KARTA 56I: sekcia Od veriacich (farnosť) */ odFarnikov?: ReactNode; /** KARTA 57 C.7–C.8 */ hore?: ReactNode; profil: TestProfil; onDetail: (z: TestZbierka) => void; onZaznam?: (p: PolCh) => void; onBack: () => void; onKronika?: () => void }) {
  const pc = usePc();
  const mob = !pc;
  const domace = useDomaceMesto(profil);
  const [lok] = useState<Lokalita>(domace);
  const [stitOtv, setStitOtv] = useState(false);
  const [sel, setSel] = useState(-1);
  useOtvorHlavnuZQr(profil.k, profil.typ === "farnost", () => setSel(0)); // OPRAVY 162
  const d = useCharitaData(profil, lok, domace);
  const stit = profil.stit.toLowerCase();
  const farnost = jeFarnost(profil);
  const meno = profil.meno.replace(/\s+o\.\s?z\.$/i, "");
  const hlavna = d.bezice.find((z) => z.pribehTyzdna) ?? d.bezice[0];

  // ---- 1 · titulka ----
  const bodka = <span style={{ width: 9, height: 9, borderRadius: 5, background: "var(--green)", animation: "vpPulz 1.6s ease infinite", flex: "none" }} />;
  const stitEl = (w: number, h: number) => farnost ? null : (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)} · podrobnosti a overenie`} style={{ width: w, height: h, padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", filter: "drop-shadow(0 10px 24px rgba(0,0,0,.5))" }}>
      <StitCare stit={profil.stit} w={w} h={h} lesk />
    </button>);
  const titulka = (
    <section style={{ position: "relative", height: pc ? 820 : "min(780px, 100dvh)", flex: "none", background: bgF(profil.titulka) }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.5) 0%,rgba(10,8,5,.05) 30%,rgba(10,8,5,.92) 100%)" }} />
      <div style={{ position: "absolute", left: pc ? 48 : 16, right: pc ? 48 : 16, top: pc ? 24 : "max(16px, env(safe-area-inset-top))", display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={onBack} aria-label="Späť" style={{ height: 44, padding: pc ? "0 14px 0 8px" : 0, width: pc ? undefined : 44, borderRadius: 14, border: "none", background: "rgba(10,8,5,.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer", fontFamily: "inherit", boxShadow: "none" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>{pc && "Späť"}</button>
        <span style={{ flex: 1 }} />
        <span style={{ height: 44, padding: "0 16px", borderRadius: 22, background: "rgba(10,8,5,.6)", display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color: "#fff" }}>{bodka}{pc ? `NAŽIVO · dnes ${eur(d.dnes)} od ${tvar(d.darcovia.length, ["človeka", "ľudí", "ľudí"])}` : `dnes ${eur(d.dnes)}`}</span>
      </div>
      <div style={{ position: "absolute", left: pc ? 48 : 20, right: pc ? 48 : 20, bottom: pc ? 56 : 24, display: "flex", alignItems: "flex-end", gap: pc ? 28 : 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: pc ? 18 : 14, flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <span style={{ width: pc ? 104 : 80, height: pc ? 104 : 80, borderRadius: pc ? 26 : 22, background: "#fff", color: "#3F6E2A", fontSize: pc ? 38 : 30, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{profil.iniciala}</span>
            {mob && stitEl(86, 104)}
          </span>
          <b style={{ fontSize: pc ? 112 : 60, lineHeight: 0.92, letterSpacing: "-.045em", color: "#fff" }}>{meno}</b>
          <span style={{ fontSize: pc ? 22 : 16, lineHeight: 1.4, color: "#E8E1D3", maxWidth: 620 }}>{profil.veta}</span>
        </div>
        {pc && <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flex: "none" }}>{stitEl(150, 176)}</div>}
      </div>
    </section>);

  // ---- 2 · Teraz (hlavná zbierka) ----
  const dorPill = (z: TestZbierka) => z.dorovnanie && !farnost && profil.dorovnaniePas ? (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: pc ? "7px 14px 7px 7px" : "5px 10px 5px 5px", borderRadius: 14, background: "var(--goldBg)", border: "1px solid var(--goldBd)", alignSelf: "flex-start" }}>
      <span style={{ width: pc ? 30 : 24, height: pc ? 30 : 24, borderRadius: 8, background: "#F2EBDD", color: "#8A6A1C", fontSize: pc ? 11 : 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{profil.dorovnaniePas.ini}</span>
      <span style={{ fontSize: pc ? 15 : 12.5, fontWeight: 700, color: "var(--gold)" }}>{z.dorovnanie}</span>
    </div>) : null;
  const teraz = hlavna && (() => {
    const z = hlavna, zF = z.zFirmy ?? 0, p = pct(z.vyzbierane, z.ciel), pF = z.ciel ? Math.min(100 - p, Math.round(zF / z.ciel * 100)) : 0, pL = Math.max(0, p - pF);
    const st = z.stav === "dlhodoba" ? "DLHODOBÁ" : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : null;
    return (
      <section {...klikKarta(() => onDetail(z), z.nazov)} style={{ height: pc ? 820 : undefined, display: "flex", flexDirection: pc ? "row" : "column", borderTop: "var(--mH) solid var(--acc)", cursor: "pointer" }}>
        <div style={{ position: "relative", flex: pc ? 1.35 : undefined, height: pc ? undefined : 360, background: bgF(z.foto), borderLeft: `8px solid ${druhF("zbierka")}` }}>
          {stitok("ZBIERKA", druhF("zbierka"), { top: pc ? 24 : 16, left: pc ? 24 : 16 }, pc ? 32 : 28)}
          {st && stitok(st, "var(--dr-stav)", { top: pc ? 24 : 16, right: pc ? 24 : 16 }, pc ? 32 : 28)}
        </div>
        <div style={{ flex: 1, padding: pc ? "64px 56px" : "22px 20px 28px", display: "flex", flexDirection: "column", justifyContent: "center", gap: pc ? 20 : 12 }}>
          <span style={{ fontSize: pc ? 14 : 12, fontWeight: 800, letterSpacing: ".14em", color: "var(--acc)" }}>{["TERAZ", z.mesto, pc ? z.cast : null].filter(Boolean).join(" · ").toLocaleUpperCase("sk-SK")}</span>
          <b style={{ fontSize: pc ? 58 : 32, lineHeight: 1.02, letterSpacing: "-.035em", textWrap: "pretty" } as CSSProperties}>{z.nazov}</b>
          {pc && <span style={{ fontSize: 18, lineHeight: 1.55, color: "var(--ink2)" }}>{z.popis}</span>}
          {dorPill(z)}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: pc ? 8 : 0 }}>
            <span style={{ fontSize: pc ? 22 : 16, color: "var(--ink3)" }}><b style={{ fontSize: pc ? 64 : 36, letterSpacing: "-.03em", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{eur(z.vyzbierane)}</b>{z.ciel ? `  z ${eur(z.ciel)}` : ""}</span>
            <div style={{ height: pc ? 10 : 8, borderRadius: 5, background: "var(--track)", overflow: "hidden", display: "flex" }}><div style={{ height: "100%", width: `${pL}%`, background: "#6E9B4F" }} />{pF > 0 && <div style={{ height: "100%", width: `${pF}%`, background: "#C9A24A" }} />}</div>
            {pc && <span style={{ fontSize: 15, color: "var(--ink3)" }}>{[tvar(z.ludia, ["človek", "ľudia", "ľudí"]), zF ? `${eur(zF)} pridala firma` : null].filter(Boolean).join(" · ")}</span>}
          </div>
          <b style={{ fontSize: pc ? 17 : 16, color: "var(--gInk)" }}>Pozrieť a darovať ›</b>
        </div>
      </section>);
  })();

  // ---- 3 · Kam poslať (4 sektory, modul hneď vedľa / pod) ----
  const sektory: TestSektor[] = [profil.centralna, ...profil.sektory].slice(0, 4);
  const stS = (s: TestSektor, i: number) => s.stitok ?? (i ? `SEKTOR ${i}` : "CELÁ ČINNOSŤ");
  const nS = (s: TestSektor, i: number) => (!i && !farnost ? "Kam treba najviac" : s.nazov);
  const sumaS = (s: TestSektor) => s.dlazdicaText ?? (s.mesiac != null ? `${eur(s.mesiac)} tento mesiac` : eur(s.vyzbierane));
  const modul = sel >= 0 && sektory[sel] && (
    <ModulProfilu key={sektory[sel].id} profil={profil} sektor={sektory[sel]} poradie={sel} mestoV="" onZbal={() => setSel(-1)} dorovnanie={!farnost}
      typ={sektory[sel].typ} typ2={sektory[sel].typ2} info={sektory[sel].info} hlavna={farnost && !sel} />);
  const kamPoslat = pc ? (
    <section style={{ height: 820, display: "flex", flexDirection: "column", padding: "48px 48px 40px", gap: 20, borderTop: "1px solid var(--cardBd)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}><b style={{ fontSize: 52, letterSpacing: "-.035em" }}>Kam poslať</b><span style={{ fontSize: 17, color: "var(--ink3)" }}>{farnost ? "farnosť alebo jedna zbierka · aj pravidelne" : "celá činnosť alebo jedna téma · aj pravidelne"}</span></div>
      <div style={{ flex: 1, display: "flex", gap: 14, minHeight: 0 }}>
        {sektory.map((s, i) => { const on = sel === i; return (
          <button key={s.id} type="button" data-hier={String(i)} aria-expanded={on} onClick={() => setSel(on ? -1 : i)} style={{ flex: on ? 2.4 : 1, minWidth: 0, position: "relative", borderRadius: 24, overflow: "hidden", background: bgF(s.foto), cursor: "pointer", outline: on ? "3px solid var(--hc)" : "none", outlineOffset: -3, transition: "flex .4s ease", border: "none", padding: 0, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.1) 30%,rgba(10,8,5,.9) 100%)" }} />
            <span style={{ position: "absolute", left: 0, right: 0, top: 0, height: 8, background: "var(--hcF)" }} />
            <span style={{ position: "absolute", left: 22, right: 22, bottom: 24, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", color: "#E8E1D3" }}>{stS(s, i)}</span>
              <b style={{ fontSize: 30, lineHeight: 1.05, letterSpacing: "-.02em", color: "#fff" }}>{nS(s, i)}</b>
              {on && s.popis && <span style={{ fontSize: 16, lineHeight: 1.5, color: "#F1ECE1", maxWidth: 520 }}>{s.popis}</span>}
              <span style={{ fontSize: 15, color: "#E8E1D3" }}>{sumaS(s)}</span>
              {on && <b style={{ fontSize: 15, color: "#fff", paddingTop: 4 }}>Modul je vedľa ›</b>}
            </span>
          </button>); })}
        {modul && <div data-hier={String(sel)} style={{ width: 420, flex: "none", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", borderRadius: 20 }}>{modul}</div>}
      </div>
    </section>
  ) : (
    <section style={{ display: "flex", flexDirection: "column", gap: 12, padding: "28px 16px 16px", borderTop: "1px solid var(--cardBd)" }}>
      <b style={{ fontSize: 34, letterSpacing: "-.03em" }}>Kam poslať</b>
      {sektory.map((s, i) => { const on = sel === i; return (
        <button key={s.id} type="button" data-hier={String(i)} aria-expanded={on} onClick={() => setSel(on ? -1 : i)} style={{ height: on ? 290 : 120, flex: "none", position: "relative", borderRadius: 20, overflow: "hidden", background: bgF(s.foto), cursor: "pointer", outline: on ? "3px solid var(--hc)" : "none", outlineOffset: -3, transition: "height .4s ease", border: "none", padding: 0, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
          <span style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(10,8,5,.88) 0%,rgba(10,8,5,.2) 100%)" }} />
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 7, background: "var(--hcF)" }} />
          <span style={{ position: "absolute", left: 20, right: 16, bottom: 14, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: "#E8E1D3" }}>{stS(s, i)}</span>
            <b style={{ fontSize: 22, color: "#fff" }}>{nS(s, i)}</b>
            {on && s.popis && <span style={{ fontSize: 14, lineHeight: 1.45, color: "#F1ECE1" }}>{s.popis}</span>}
            <span style={{ fontSize: 13.5, color: "#E8E1D3" }}>{sumaS(s)}</span>
          </span>
        </button>); })}
      {modul}
    </section>);

  // ---- 4 · Naša cesta: posledné skutky a ukončené zbierky + DNES (hlavná zbierka) ----
  const pol = d.roky.flatMap((r) => r.pol).filter((p) => p.typ !== "is").slice(0, 5).reverse();
  type Zast = { id: string; druh: Druh; kedy: string; t: string; v: string; foto: string; tap: () => void; dnes?: boolean };
  const zastavky: Zast[] = [
    ...pol.map((p): Zast => ({ id: p.id, druh: p.typ === "zb" ? "zbierka" : p.typ === "oz" ? "akcia" : "skutok", kedy: `${p.m} ${p.rok}`, t: p.nazov, v: p.s, foto: p.foto, tap: () => onZaznam?.(p) })),
    ...(hlavna ? [{ id: hlavna.id, druh: "zbierka" as Druh, kedy: "DNES", t: hlavna.nazov, v: `${eur(hlavna.vyzbierane)}${hlavna.ciel ? ` z ${eur(hlavna.ciel)}` : ""}`, foto: hlavna.foto, tap: () => onDetail(hlavna), dnes: true }] : []),
  ];
  const n = zastavky.length;
  const kruh = (z: Zast, dm: number) => <span style={{ flex: "none", width: dm, height: dm, borderRadius: "50%", background: bgF(z.foto), border: `4px solid ${druhF(z.druh)}`, boxShadow: "0 0 0 6px var(--bg), 0 10px 24px rgba(0,0,0,.5)" }} />;
  const popisZ = (z: Zast, al: "center" | "left" | "right") => (
    <span style={{ display: "flex", flexDirection: "column", alignItems: al === "center" ? "center" : al === "right" ? "flex-end" : "flex-start", gap: pc ? 5 : 2, textAlign: al, minWidth: 0 }}>
      {pc && <span style={{ height: 22, padding: "0 8px", borderRadius: 7, background: druhF(z.druh), color: "#fff", fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>{DRUH_TXT[z.druh]}</span>}
      <span style={{ fontSize: pc ? 13 : 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--acc)" }}>{z.kedy}</span>
      <b style={{ fontSize: pc ? 16 : 15, lineHeight: 1.25 }}>{z.t}</b>
      <span style={{ fontSize: pc ? 13 : 12.5, color: "var(--ink3)" }}>{z.v}</span>
    </span>);
  const cesta = n > 0 && (pc ? (() => {
    const pts = zastavky.map((_, i): [number, number] => [70 + (n > 1 ? i * (1110 / (n - 1)) : 0), i === n - 1 ? Y_PC[5] : Y_PC[i % 5]]);
    return (
      <section style={{ position: "relative", height: 820, padding: 48, borderTop: "1px solid var(--cardBd)", background: "radial-gradient(ellipse at 70% 40%,var(--card) 0%,var(--bg) 70%)", boxSizing: "border-box", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}><b style={{ fontSize: 52, letterSpacing: "-.035em" }}>{farnost ? "Cesta farnosti" : "Naša cesta"}</b><span style={{ fontSize: 17, color: "var(--ink3)" }}>{profil.cisla.slice(1).map(([v, t]) => `${v} ${t}`).join(", ")}</span></div>
        <svg width="1240" height="600" viewBox="0 0 1240 600" style={{ position: "absolute", left: 48, top: 170 }} fill="none" aria-hidden="true"><path d={krivka(pts)} stroke="#D9B65A" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" opacity=".9" /></svg>
        {zastavky.map((z, i) => { const dm = z.dnes ? 120 : 96; return (
          <button key={z.id} type="button" onClick={z.tap} style={{ position: "absolute", left: 48 + pts[i][0] - 100, top: 170 + pts[i][1] - dm / 2, width: 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", border: "none", background: "transparent", padding: 0, fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
            {kruh(z, dm)}{popisZ(z, "center")}
          </button>); })}
      </section>);
  })() : (() => {
    const pts = zastavky.map((_, i): [number, number] => [i % 2 ? 342 - 34 : 34, i * 150 + 34]);
    return (
      <section style={{ position: "relative", height: 100 + (n - 1) * 150 + 170, padding: "28px 16px", borderTop: "1px solid var(--cardBd)", background: "radial-gradient(ellipse at 50% 40%,var(--card) 0%,var(--bg) 70%)", boxSizing: "border-box", overflow: "hidden" }}>
        <b style={{ fontSize: 34, letterSpacing: "-.03em" }}>{farnost ? "Cesta farnosti" : "Naša cesta"}</b>
        <svg width="358" height={(n - 1) * 150 + 120} viewBox={`0 0 358 ${(n - 1) * 150 + 120}`} style={{ position: "absolute", left: 16, top: 100 }} fill="none" aria-hidden="true"><path d={krivkaV(pts)} stroke="#D9B65A" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 10" /></svg>
        {zastavky.map((z, i) => { const vpravo = i % 2 === 1, dm = z.dnes ? 84 : 68; return (
          <button key={z.id} type="button" onClick={z.tap} style={{ position: "absolute", left: 16, right: 16, top: 100 + i * 150 + 34 - dm / 2, display: "flex", flexDirection: vpravo ? "row-reverse" : "row", alignItems: "center", gap: 12, cursor: "pointer", border: "none", background: "transparent", padding: 0, fontFamily: "inherit", color: "var(--ink)", textAlign: vpravo ? "right" : "left", boxShadow: "none" }}>
            {kruh(z, dm)}<span style={{ maxWidth: 200, minWidth: 0 }}>{popisZ(z, vpravo ? "right" : "left")}</span>
          </button>); })}
      </section>);
  })());

  // ---- 5 · Ďalšie teraz (karty 2a): bežiace zbierky, súrne výzvy, akcie, hľadáme ----
  type Karta = { id: string; druh: Druh; t: string; meta: string; foto?: string; stav?: [string, string]; suma?: { v: number; ciel?: number }; tap?: () => void; /** OPRAVY 156/2: pracovná ponuka = modrá PracaKarta */ praca?: TestPraca };
  const karty: Karta[] = [
    ...d.bezice.filter((z) => z !== hlavna).map((z): Karta => ({ id: z.id, druh: "zbierka", t: z.nazov, meta: [z.mesto, z.stav === "dlhodoba" ? "dlhodobá" : z.kategoria ? z.kategoria.charAt(0) + z.kategoria.slice(1).toLocaleLowerCase("sk-SK") : z.cast].filter(Boolean).join(" · "), foto: z.foto, suma: { v: z.vyzbierane, ciel: z.ciel }, tap: () => onDetail(z) })),
    ...profil.oznamy.filter((o) => o.mesto === lok || lok === "Celé Slovensko").filter((o) => o.druh !== "oznam").map((o): Karta => ({ id: o.id, druh: o.druh === "vyzva" ? "hladame" : "akcia", t: o.nadpis, meta: `${o.text.split(" · ")[0]} · ${o.pod}`, foto: o.druh === "vyzva" ? profil.sektory[2]?.foto : profil.centralna.foto, stav: o.druh === "vyzva" ? ["SÚRNE", "var(--dr-surne)"] : undefined })),
    ...profil.praca.map((j): Karta => ({ id: j.id, druh: "hladame", t: j.nazov, meta: "", praca: j })),
  ].slice(0, 5);
  const karta = (k: Karta) => k.praca ? <PracaKarta key={k.id} j={k.praca} style={{ flex: mob ? "none" : undefined, width: mob ? 280 : undefined }} /> : (
    <div key={k.id} {...(k.tap ? klikKarta(k.tap, k.t) : {})} style={{ flex: mob ? "none" : undefined, width: mob ? 260 : undefined, borderRadius: 20, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", borderLeft: `5px solid ${druhF(k.druh)}`, display: "flex", flexDirection: "column", cursor: k.tap ? "pointer" : undefined }}>
      {k.foto && <div style={{ position: "relative", aspectRatio: "4/3", background: bgF(k.foto) }}>{stitok(DRUH_TXT[k.druh], druhF(k.druh), { top: 10, left: 10 })}{k.stav && stitok(k.stav[0], k.stav[1], { top: 10, right: 10 })}</div>}
      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
        {!k.foto && <span style={{ alignSelf: "flex-start", height: 26, padding: "0 10px", borderRadius: 9, background: druhF(k.druh), color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>{DRUH_TXT[k.druh]}</span>}
        <b style={{ fontSize: 17, lineHeight: 1.22, textWrap: "pretty" } as CSSProperties}>{k.t}</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{k.meta}</span>
        {k.suma && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {k.suma.ciel ? <div style={{ height: 7, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct(k.suma.v, k.suma.ciel)}%`, background: "#6E9B4F" }} /></div> : null}
          <span style={{ fontSize: 14 }}><b style={{ fontVariantNumeric: "tabular-nums" }}>{eur(k.suma.v)}</b> {k.suma.ciel ? <span style={{ color: "var(--ink3)" }}>z {eur(k.suma.ciel)}</span> : null}</span>
        </div>}
      </div>
    </div>);
  const dalsie = karty.length > 0 && (
    <section style={{ padding: pc ? 48 : "28px 16px", display: "flex", flexDirection: "column", gap: pc ? 20 : 12, borderTop: "1px solid var(--cardBd)" }}>
      <b style={{ fontSize: pc ? 44 : 30, letterSpacing: "-.03em" }}>Ďalšie teraz</b>
      <div style={pc ? { display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 14, alignItems: "start" } : { display: "flex", gap: 12, overflowX: "auto", alignItems: "flex-start", paddingBottom: 4 }}>{karty.map(karta)}</div>
    </section>);

  // ---- 6 · Videá z Iskier ----
  const iskry = (
    <section style={{ padding: pc ? "24px 48px 56px" : "8px 16px 0", display: "flex", flexDirection: "column", gap: pc ? 18 : 12 }}>
      <b style={{ fontSize: pc ? 44 : 30, letterSpacing: "-.03em" }}>Videá z Iskier</b>
      <ZIskier profil={profil} cesty={d.iskryCesty} w={pc ? 230 : 150} h={pc ? 408 : 266} wVs={pc ? 230 : 150} nadpis={false} />
    </section>);

  const okno = stitOtv && <StitOkno p={profil} v6 mobil={mob} onClose={() => setStitOtv(false)} />;
  const obsah: ReactNode = <>{titulka}{hore}{teraz}{kamPoslat}{odFarnikov}{cesta}{dalsie}{iskry}{mob && <div style={{ height: DOK + 24, flex: "none" }} />}</>;
  return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" } as CSSProperties}>
      {obsah}{okno}
    </div>);
}
