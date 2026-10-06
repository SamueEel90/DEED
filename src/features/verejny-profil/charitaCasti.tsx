// KARTA 45 · spoločné dáta a diely pre Výklad a Pirát charity (rovnaké dáta ako Kronika, iné podanie).
// Dáta: testProfily.ts (Svetlo pomoci). Iskry z lib/iskry (2 cesty: Iskry · Zbierky).
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { eur, tvar, vLokalite, type Lokalita, type Mesto, type TestProfil, type TestZbierka, jeFarnost } from "@/lib/testProfily";
import { ISKRY_CFG, iskraViditelna, iskryVsetky, useZmenyIskier, zbierkaIskry, type Iskra } from "@/lib/iskry";
import { otvorIskry } from "@/features/iskry/otvor";
import { MESIACE, kovText } from "./casti";

export const GRAD = "linear-gradient(135deg,#4B7A35,#6E9F4E)";
export const PRUH = "linear-gradient(90deg,#4B7A35,#8DB866)";
const ZLATA = "#F6C453";
export const bgF = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
const poradieDatumu = (m: string, d: string) => MESIACE.indexOf(m) * 100 + (parseInt(d, 10) || 0);
const dokladov = (n: number) => tvar(n, ["DOKLAD", "DOKLADY", "DOKLADOV"]);

export interface PolCh { id: string; typ: "zb" | "sk" | "is" | "oz"; d: string; m: string; rok: number; nazov: string; s: string; q?: string; dok?: string; foto: string; zbierka?: TestZbierka; /** KARTA 50 · farnosť nedokladá */ bezDokladov?: boolean }
export interface OznCh { id: string; den: string; mes: string; dBg: string; st: string; stc: string; n: string; s: string; btn: string; pocet: string; druh?: "vyzva" | "akcia" | "oznam" }

/** dáta charity v meste človeka — rovnaké pre Výklad aj Pirát */
export function useCharitaData(profil: TestProfil, lok: Lokalita, domace: Mesto) {
  useZmenyIskier();
  const sk = lok === "Celé Slovensko";
  const zbierky = vLokalite(profil.zbierky, lok, domace);
  const bezice = zbierky.filter((z) => z.stav !== "ukoncena");
  const darcovia = sk ? profil.darcovia : profil.darcovia.filter((d) => d.mesto === lok);
  const dnes = darcovia.reduce((s, d) => s + (d.suma ?? 0), 0);
  const [live, setLive] = useState(0);
  const [liveOp, setLiveOp] = useState(1);
  useEffect(() => {
    let t2: number | undefined;
    const t = window.setInterval(() => { setLiveOp(0); t2 = window.setTimeout(() => { setLive((x) => x + 1); setLiveOp(1); }, 320); }, 5000);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, []);
  const ld = darcovia.length ? darcovia[live % darcovia.length] : null;
  const oznamy: OznCh[] = vLokalite(profil.oznamy, lok, domace).map((o) => ({
    id: o.id, den: o.den, mes: o.mesiac, druh: o.druh,
    dBg: o.druh === "vyzva" ? "#8E3B2F" : o.druh === "akcia" ? "#2F5E3A" : "#876712",
    st: o.stitok, stc: o.druh === "vyzva" ? "var(--red)" : o.druh === "akcia" ? "var(--green)" : "var(--gold)",
    n: o.nadpis, s: o.text, btn: o.tlacidlo, pocet: o.pod,
  })).sort((a, b) => poradieDatumu(a.mes, a.den) - poradieDatumu(b.mes, b.den));
  const pol: PolCh[] = [
    ...vLokalite(profil.skutky, lok, domace).filter((s) => s.rok).map((s): PolCh => ({ id: s.id, typ: "sk", d: s.d!, m: s.m!, rok: s.rok!, nazov: s.nazov, s: `${s.popis}${s.dobrovolnici ? ` · ${s.dobrovolnici} dobrovoľníkov` : ""}`, foto: s.foto })),
    ...zbierky.filter((z) => z.stav === "ukoncena" && z.rok).map((z): PolCh => ({ id: z.id, typ: "zb", d: z.d!, m: z.m!, rok: z.rok!, nazov: z.nazov, s: `${eur(z.vyzbierane)} · od ${z.ludia} darcov`, q: z.spravaDarcom, dok: z.doklady ? dokladov(z.doklady) : undefined, foto: z.foto, zbierka: z })),
    ...vLokalite(profil.kronika ?? [], lok, domace).map((k): PolCh => ({ ...k })),
  ].sort((a, b) => b.rok - a.rok || poradieDatumu(b.m, b.d) - poradieDatumu(a.m, a.d)).map((p) => (jeFarnost(profil) ? { ...p, bezDokladov: true, dok: undefined } : p));
  const roky = (profil.roky ?? []).map((r) => ({ ...r, t: String(r.rok), pol: pol.filter((p) => p.rok === r.rok) }));
  const mojeIskry = iskryVsetky().filter((v) => v.autor === profil.meno && iskraViditelna(v));
  const iskryCesty: Iskra[][] = [mojeIskry.filter((v) => v.druh !== ISKRY_CFG.druhZbierky), mojeIskry.filter((v) => v.druh === ISKRY_CFG.druhZbierky)];
  return { bezice, velka: bezice[0], male: bezice.slice(1, 3), darcovia, dnes, ld, liveOp, oznamy, roky, iskryCesty };
}

export const stZb = (z: TestZbierka) => [z.mesto.toLocaleUpperCase("sk-SK"), z.stav === "dlhodoba" ? "DLHODOBÁ" : z.cast ? z.cast.toLocaleUpperCase("sk-SK") : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : null].filter(Boolean).join(" · ");

/** popis Iskry na karte (názov, riadok pod ním, štítok a farby štítku) */
export function iskraPopis(v: Iskra) {
  const d = zbierkaIskry(v);
  const nazov = d && v.zb?.typ !== "firme" ? d.z.nazov : v.zb?.typ === "firme" && d?.firma ? `${d.firma.meno.replace(/\s+s\.\s?r\.\s?o\.$/, "")} pomohla` : v.popis.split(/(?<=\.)\s/)[0];
  const m = !v.zb ? `${v.iskry.toLocaleString("sk-SK")} iskier`
    : v.zb.typ === "dakujeme" && d ? (d.z.doklady ? `doložené · ${tvar(d.z.doklady, ["doklad", "doklady", "dokladov"])}` : `doložené · ${eur(d.z.vyzbierane)}`)
    : v.zb.typ === "firme" ? `dorovnanie · ${d?.z.nazov ?? ""}`
    : d ? (d.z.ciel ? `${eur(d.z.vyzbierane)} z ${eur(d.z.ciel)}` : eur(d.z.vyzbierane)) : "";
  const st = v.zb ? v.zb.stitok.toLocaleUpperCase("sk-SK") : (ISKRY_CFG.druhy[v.druh] ?? "").toLocaleUpperCase("sk-SK");
  const sBg = !v.zb ? "rgba(0,0,0,.55)" : v.zb.typ !== "vyzva" ? ZLATA : v.zb.stitok === "Priebeh" ? "#fff" : "#4B7A35";
  const sC = !v.zb ? "#fff" : v.zb.typ === "vyzva" && v.zb.stitok !== "Priebeh" ? "#fff" : "#1D211B";
  return { nazov, m, st, sBg, sC };
}

export function KartaIskry({ v, w, h }: { v: Iskra; w: number; h: number }) {
  const { nazov, m, st, sBg, sC } = iskraPopis(v);
  return (
    <button type="button" onClick={() => otvorIskry(v.id)} aria-label={`Iskra: ${nazov}`} style={{ position: "relative", flex: "none", width: w, height: h, borderRadius: 18, overflow: "hidden", background: v.bg, cursor: "pointer", border: "none", padding: 0, textAlign: "left" }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 50%,rgba(0,0,0,.85) 100%)" }} />
      <span style={{ position: "absolute", left: 8, top: 8, height: 24, padding: "0 9px", borderRadius: 12, background: sBg, color: sC, fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{st}</span>
      <span style={{ position: "absolute", left: "50%", top: "42%", width: 40, height: 40, margin: "-20px 0 0 -20px", borderRadius: "50%", background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
      <span style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 2, color: "#fff" }}>
        <b style={{ fontSize: 13.5, lineHeight: 1.25 }}>{nazov}</b>
        <span style={{ fontSize: 11.5, opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>{m}</span>
      </span>
    </button>);
}

/** prepínač 2 ciest Iskier (Iskry · Zbierky) */
export function IskryTaby({ isk, onIsk, fs = 14.5 }: { isk: number; onIsk: (i: number) => void; fs?: number }) {
  return (
    <div role="tablist" aria-label="Iskry" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 4, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      {([["Iskry", "skutky · talenty · rady"], ["Zbierky", "výzvy · ďakujeme"]] as const).map(([t, s], i) => {
        const on = isk === i;
        return <button key={t} type="button" role="tab" aria-selected={on} onClick={() => onIsk(i)} style={{ minHeight: 48, padding: "6px 10px", border: "none", borderRadius: 12, background: on ? "var(--ink)" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: on ? "var(--bg)" : "var(--ink2)", fontFamily: "inherit" }}>
          <b style={{ fontSize: fs }}>{t}</b><span style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.85 }}>{s}</span></button>;
      })}
    </div>);
}

/** karta „Všetky … ›" na konci radu videí: mobil a tablet nikdy, PC (≥ 1200) len keď rad pretečie (scrollWidth > clientWidth).
 *  navyse = šírka karty + medzera (pri meraní sa odpočíta, keď už karta v rade je). */
export function useVsetkyNaKonci(navyse: number, zmena: unknown) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ukaz, setUkaz] = useState(false);
  const ukazRef = useRef(false);
  ukazRef.current = ukaz;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const q = window.matchMedia("(min-width: 1200px)");
    const f = () => setUkaz(q.matches && el.scrollWidth - (ukazRef.current ? navyse : 0) > el.clientWidth + 1);
    f();
    const ro = new ResizeObserver(f); ro.observe(el);
    q.addEventListener("change", f);
    return () => { ro.disconnect(); q.removeEventListener("change", f); };
  }, [navyse, zmena]);
  return [ref, ukaz] as const;
}

/** Z ISKIER: nadpis, prepínač a vodorovný rad videí */
export function ZIskier({ profil, cesty, w, h, wVs, nadpis = true }: { profil: TestProfil; cesty: Iskra[][]; w: number; h: number; wVs: number; nadpis?: boolean }) {
  const [isk, setIsk] = useState(0);
  const tu = cesty[isk];
  const [radRef, vsetky] = useVsetkyNaKonci(wVs + 10, `${isk}:${tu.length}`);
  if (!cesty[0].length && !cesty[1].length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      {nadpis && <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>VIDEÁ Z ISKIER</span>}
      <IskryTaby isk={isk} onIsk={setIsk} />
      <div ref={radRef} style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {tu.map((v) => <KartaIskry key={v.id} v={v} w={w} h={h} />)}
        {tu.length > 0 && vsetky && <button type="button" onClick={() => otvorIskry(tu[0].id)} style={{ flex: "none", width: wVs, height: h, borderRadius: 18, border: "1.5px dashed var(--cardBd)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 10, fontSize: 13.5, fontWeight: 800, color: "var(--green)", cursor: "pointer", fontFamily: "inherit" }}>
          {isk ? "Všetky videá k zbierkam ›" : `Všetky Iskry ${profil.menoGen ?? profil.meno} ›`}</button>}
        {!tu.length && <span style={{ fontSize: 14, color: "var(--ink3)", padding: "6px 2px" }}>{isk ? "Zatiaľ tu nie je žiadne video k zbierkam." : "Zatiaľ tu nie je žiadna Iskra."}</span>}
      </div>
    </div>);
}

/** oznam: dátumová dlaždica, štítok, názov, text, tlačidlo */
export function OznamKarta({ o }: { o: OznCh }) {
  return (
    <article style={{ display: "flex", gap: 12, padding: 14, borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
      <span style={{ flex: "none", width: 56, height: 66, borderRadius: 14, background: o.dBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <b style={{ fontSize: 23, lineHeight: 1 }}>{o.den}</b><span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".06em" }}>{o.mes}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: o.stc }}>{o.st}</span>
        <b style={{ fontSize: 15, lineHeight: 1.25 }}>{o.n}</b>
        <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{o.s}</span>
        <button type="button" style={{ alignSelf: "flex-start", marginTop: 4, minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--green)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "var(--green)", fontFamily: "inherit" }}>{o.btn}</button>
      </span>
    </article>);
}

/** roky ako časová os (mobilná podoba kroniky): rozbalený len prvý rok */
export function RokyOs({ roky, onZaznam }: { roky: { t: string; sum: [string, string][]; pol: PolCh[] }[]; /** doplnky 4. 10.: ťuk na záznam = detail bez platby / Iskry */ onZaznam: (p: PolCh) => void }) {
  const [otv, setOtv] = useState<Record<string, boolean>>(() => (roky[0] ? { [roky[0].t]: true } : {}));
  return (<>
    {roky.map((k, i) => {
      const exp = !!otv[k.t];
      return (
        <section key={k.t} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button type="button" onClick={() => setOtv((o) => ({ ...o, [k.t]: !exp }))} aria-expanded={exp} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 0 12px", border: "none", borderBottom: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <b style={{ flex: 1, fontSize: i === 0 ? 52 : 38, lineHeight: 0.95, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums", ...kovText }}>{k.t}</b>
              <span style={{ flex: "none", width: 44, height: 44, borderRadius: 22, border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: `rotate(${exp ? 180 : 0}deg)`, transition: "transform .25s ease" }}><path d="M6 9l6 6 6-6" /></svg></span>
            </span>
            <span style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "6px 10px" }}>
              {k.sum.map(([v, t]) => <span key={t} style={{ fontSize: 12.5, color: "var(--ink3)" }}><b style={{ fontSize: 15, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v}</b> {t}</span>)}
            </span>
          </button>
          {exp && <div style={{ display: "flex", flexDirection: "column" }}>
            {k.pol.map((p) => {
              const chip = p.typ === "zb" ? (p.bezDokladov ? "UKONČENÁ" : p.q ? "UKONČENÁ · DOLOŽENÉ" : "UKONČENÁ · SPRÁVA SA PÍŠE") : p.typ === "is" ? "ISKRA" : p.typ === "oz" ? "AKCIA" : "SKUTOK";
              const chipC = p.typ === "zb" ? (p.q ? "var(--green)" : "var(--ink3)") : p.typ === "is" ? "var(--gold)" : p.typ === "oz" ? "var(--blue)" : "var(--green)";
              const klik = () => onZaznam(p);
              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "40px 14px minmax(0,1fr)", columnGap: 8 }}>
                  <span style={{ paddingTop: 16, display: "flex", flexDirection: "column", alignItems: "flex-end" }}><b style={{ fontSize: 16, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{p.d}</b><span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{p.m}</span></span>
                  <span style={{ position: "relative", display: "flex", justifyContent: "center" }}><span style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: "var(--accLine)" }} /><span style={{ position: "relative", marginTop: 20, width: 10, height: 10, borderRadius: "50%", background: "var(--bg)", border: "2px solid var(--acc)" }} /></span>
                  <div style={{ padding: "6px 0", minWidth: 0 }}>
                    <button type="button" onClick={klik} style={{ width: "100%", borderRadius: 16, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", padding: 0, cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
                      {p.typ === "zb" && <span style={{ display: "block", width: "100%", height: 110, background: bgF(p.foto) }} />}
                      <span style={{ padding: "11px 12px", display: "flex", gap: 10, alignItems: "center" }}>
                        {p.typ !== "zb" && <span style={{ flex: "none", width: 52, height: 52, borderRadius: 12, background: bgF(p.foto) }} />}
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: chipC }}>{chip}</span>
                          <b style={{ fontSize: 14.5, lineHeight: 1.3 }}>{p.nazov}</b>
                          <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{p.s}</span>
                          {p.typ === "zb" && <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green)" }}>{p.bezDokladov ? "Ako to dopadlo ›" : p.q ? "Správa a doklady ›" : "Priebežné doklady ›"}</span>}
                        </span>
                      </span>
                    </button>
                  </div>
                </div>);
            })}
            {!k.pol.length && <span style={{ fontSize: 14, color: "var(--ink3)", padding: "4px 0 0 62px" }}>V roku {k.t} nič také nie je.</span>}
          </div>}
        </section>);
    })}
  </>);
}

/** malá karta zbierky (fotka 80 px, štítok, názov, pruh, suma) */
export function MalaZbierka({ z, onDetail, t = 80 }: { z: TestZbierka; onDetail: (z: TestZbierka) => void; t?: number }) {
  return (
    <button type="button" onClick={() => onDetail(z)} style={{ display: "flex", gap: 12, alignItems: "center", padding: 10, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
      <span style={{ flex: "none", width: t, height: t, borderRadius: 14, background: bgF(z.foto) }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{stZb(z)}</span>
        <b style={{ fontSize: 15, lineHeight: 1.25 }}>{z.nazov}</b>
        {z.ciel != null && <span style={{ display: "block", height: 5, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, z.vyzbierane / z.ciel)})` }} /></span>}
        <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}><b style={{ color: "var(--ink)", fontSize: 14 }}>{eur(z.vyzbierane)}</b> {z.ciel ? `z ${eur(z.ciel)}` : `od ${z.ludia} ľudí`}</span>
      </span>
    </button>);
}

export const sekciaNadpis: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 8 };
