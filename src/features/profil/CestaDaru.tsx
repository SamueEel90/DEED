// KARTA 28 · Cesta môjho daru — reťaz dobra na mape (d3-geo + world-atlas 110m, Natural Earth, bez dlaždíc, offline).
// Slovensko | Európa | Svet · svetielko preletí zastávku po zastávke · 3 čísla · zastávky · zdieľanie · najdlhšie reťaze.
// Bez mien a súm. Animácie len opacity/transform; prefers-reduced-motion = všetko hneď.
import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { toast } from "@/components/toast";
import { MOJA_CESTA, suhrn, rebricek, type Zastavka } from "@/lib/cestaDaru";
import { useT, type T } from "@/i18n";
import { zdielajCanvas, ramObrazka } from "@/lib/zdielajObrazok";
import { ObrazovkaSprava } from "./Bezpecnost24";
import "@/styles/platba.css";

type Pohlad = "sk" | "eu" | "svet";
const POCET: Record<Pohlad, number> = { sk: 3, eu: 7, svet: 99 };
const W = 358, H = 340;
const KRAJINY = { fill: "#EAE5DA", stroke: "#CFC8BA" }, SK = { fill: "#DCE3D0", stroke: "#A9C08F" };

// ---- mapa sveta (načíta sa raz, z vlastného servera) ----
let svetCache: FeatureCollection | null = null;
let svetSlub: Promise<FeatureCollection> | null = null;
function nacitajSvet(): Promise<FeatureCollection> {
  if (svetCache) return Promise.resolve(svetCache);
  svetSlub ??= fetch("/mapa/countries-110m.json").then((r) => r.json()).then((t: Topology<{ countries: GeometryCollection }>) => {
    svetCache = feature(t, t.objects.countries) as unknown as FeatureCollection; return svetCache;
  });
  return svetSlub;
}
export function useSvet() {
  const [s, setS] = useState<FeatureCollection | null>(svetCache);
  useEffect(() => { if (!s) nacitajSvet().then(setS).catch(() => {}); }, [s]);
  return s;
}
const slovensko = (s: FeatureCollection) => s.features.find((f) => String(f.id) === "703") as Feature<Geometry>;

function projekcia(p: Pohlad, svet: FeatureCollection, z: Zastavka[], w = W, h = H, okraj = { x: 30, t: 30, b: 66 }): GeoProjection {
  const proj = p === "svet" ? geoNaturalEarth1() : geoMercator();
  const euBox = { type: "MultiPoint" as const, coordinates: [[8, 45], [25, 45], [8, 55], [25, 55]] };
  const body = { type: "MultiPoint" as const, coordinates: z.map((x) => x.lonlat) };
  proj.fitExtent([[okraj.x, okraj.t], [w - okraj.x, h - okraj.b]], p === "sk" ? slovensko(svet) : p === "eu" ? euBox : body);
  return proj;
}
/** typ zastávky a dátum „12. 6." z mock dát → text podľa jazyka (KARTA 31) */
const TYP: Record<string, string> = { "tvoj dar za skutok": "cesta.typ.tvojDarZaSkutok", "dar za skutok": "cesta.typ.darZaSkutok", "dar na zbierku": "cesta.typ.darNaZbierku" };
const typT = (typ: string, t: T) => (TYP[typ] ? t(TYP[typ]) : typ);
const datumT = (d: string, t: T) => { const m = /^(\d{1,2})\. (\d{1,2})\.$/.exec(d); return m ? t.datum(new Date(new Date().getFullYear(), +m[2] - 1, +m[1])) : d; };
const znizPohyb = () => typeof window !== "undefined" && (!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("obmedz-anim"));

export function CestaDaru({ onBack }: { onBack: () => void }) {
  const t = useT();
  const svet = useSvet();
  const [p, setP] = useState<Pohlad>("eu");
  const [beh, setBeh] = useState(0); // prehrať znova
  const [ukaz, setUkaz] = useState(0); // počet zobrazených zastávok
  const [seg, setSeg] = useState(0); // počet zobrazených úsekov
  const [let_, setLet] = useState(0); // kde je svetielko
  const vsetky = MOJA_CESTA.zastavky;
  const z = useMemo(() => vsetky.slice(0, POCET[p]), [vsetky, p]);
  const s = suhrn(z), cela = suhrn(vsetky);

  const geo = useMemo(() => {
    if (!svet) return null;
    const proj = projekcia(p, svet, z);
    const path = geoPath(proj);
    return {
      krajiny: svet.features.map((f) => ({ d: path(f) ?? "", sk: String(f.id) === "703", id: String(f.id) })),
      xy: z.map((x) => proj(x.lonlat) ?? [0, 0]),
      useky: z.slice(1).map((x, i) => path({ type: "LineString", coordinates: [z[i].lonlat, x.lonlat] }) ?? ""),
    };
  }, [svet, p, z]);

  // svetielko zastávku po zastávke (1 s na úsek)
  useEffect(() => {
    if (!geo) return;
    if (znizPohyb()) { setUkaz(z.length); setSeg(z.length - 1); setLet(z.length - 1); return; }
    setUkaz(0); setSeg(0); setLet(0);
    const t: number[] = [];
    const krok = p === "sk" ? 900 : 700;
    t.push(window.setTimeout(() => setUkaz(1), 150));
    for (let i = 1; i < z.length; i++) {
      t.push(window.setTimeout(() => { setSeg(i); setLet(i); t.push(window.setTimeout(() => setUkaz(i + 1), 650)); }, 350 + i * (krok + 300)));
    }
    return () => t.forEach((x) => window.clearTimeout(x));
  }, [geo, beh, p, z.length]);

  const moja = { od: vsetky[0].mesto, kam: vsetky[vsetky.length - 1].mesto, zastavok: cela.zastavok, krajin: cela.krajin, km: cela.km };
  const zdielaj = async () => {
    if (!svet) return;
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
    const ctx = c.getContext("2d")!;
    await ramObrazka(ctx, 1080, 1350);
    ctx.fillStyle = "#876712"; ctx.font = "800 30px 'Plus Jakarta Sans', sans-serif"; ctx.fillText(t("cesta.nadpis"), 72, 110);
    ctx.fillStyle = "#1D211B"; ctx.font = "800 60px 'Plus Jakarta Sans', sans-serif"; ctx.fillText(`${moja.od} → ${moja.kam}`, 72, 186);
    // mapa celej cesty
    const mx = 72, my = 240, mw = 936, mh = 700;
    ctx.save(); ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 36); ctx.clip();
    ctx.fillStyle = "#DCE4E6"; ctx.fillRect(mx, my, mw, mh);
    ctx.translate(mx, my);
    const proj = projekcia("svet", svet, vsetky, mw, mh, { x: 60, t: 60, b: 60 });
    const path = geoPath(proj, ctx);
    svet.features.forEach((f) => { ctx.beginPath(); path(f); const sk = String(f.id) === "703"; ctx.fillStyle = sk ? SK.fill : KRAJINY.fill; ctx.fill(); ctx.strokeStyle = sk ? SK.stroke : KRAJINY.stroke; ctx.lineWidth = 1.2; ctx.stroke(); });
    ctx.setLineDash([2, 12]); ctx.lineCap = "round"; ctx.strokeStyle = "#4E7D37"; ctx.lineWidth = 5;
    for (let i = 1; i < vsetky.length; i++) { ctx.beginPath(); path({ type: "LineString", coordinates: [vsetky[i - 1].lonlat, vsetky[i].lonlat] }); ctx.stroke(); }
    ctx.setLineDash([]);
    vsetky.forEach((x, i) => { const [a, b] = proj(x.lonlat) ?? [0, 0]; ctx.beginPath(); ctx.arc(a, b, i ? 10 : 14, 0, Math.PI * 2); ctx.fillStyle = i ? "#4E7D37" : "#C9A24A"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke(); });
    ctx.restore();
    ctx.fillStyle = "#1D211B"; ctx.font = "800 54px 'Plus Jakarta Sans', sans-serif";
    const cisla: [string, string][] = [[t.cislo(cela.zastavok), t("cesta.zastavokSlovo", { n: cela.zastavok })], [t.cislo(cela.krajin), t("cesta.krajinSlovo", { n: cela.krajin })], [t.cislo(cela.km), "km"]];
    cisla.forEach(([h, l], i) => { const x = 72 + i * 312; ctx.fillStyle = "#1D211B"; ctx.font = "800 54px 'Plus Jakarta Sans', sans-serif"; ctx.fillText(h, x, 1030); ctx.fillStyle = "#4A4C43"; ctx.font = "600 28px 'Plus Jakarta Sans', sans-serif"; ctx.fillText(l, x, 1072); });
    const v = await zdielajCanvas(c, "cesta-mojho-daru.png", t("cesta.titul"));
    if (v === "stiahnute") toast(t("stat.obrazokStiahnuty"));
  };

  return (
    <ObrazovkaSprava titul={t("cesta.titul")} onBack={onBack}>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>{t("cesta.intro", { datum: datumT(MOJA_CESTA.zaciatok, t) })}</div>
      <div role="tablist" aria-label={t("cesta.priblizenie")} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
        {([["sk", t("cesta.slovensko")], ["eu", t("cesta.europa")], ["svet", t("cesta.svet")]] as [Pohlad, string][]).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={p === k} onClick={() => setP(k)} className={p === k ? "seg-on" : undefined}
            style={{ minHeight: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit", ...(p === k ? {} : { background: "transparent", color: "var(--ink3)", boxShadow: "none" }) }}>{l}</button>))}
      </div>
      <div role="img" aria-label={t("cesta.mapaAria", { mesta: z.map((x) => x.mesto).join(", ") })} style={{ position: "relative", height: 340, borderRadius: 22, overflow: "hidden", background: "#DCE4E6", border: "1px solid var(--cardBd)" }}>
        {geo && <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "100%" }} aria-hidden="true">
          <g>{geo.krajiny.map((k, i) => <path key={k.id + i} d={k.d} fill={k.sk ? SK.fill : KRAJINY.fill} stroke={k.sk ? SK.stroke : KRAJINY.stroke} strokeWidth={0.6} />)}</g>
          <g>{geo.useky.map((d, i) => <path key={i} d={d} fill="none" stroke="#4E7D37" strokeWidth={2.4} strokeLinecap="round" strokeDasharray="1 6" style={{ opacity: i < seg ? 1 : 0, transition: "opacity .6s ease" }} />)}</g>
          <g>{geo.xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i ? 4.5 : 6} fill={i ? "#4E7D37" : "#C9A24A"} stroke="#fff" strokeWidth={1.6}
            style={{ opacity: i < ukaz ? 1 : 0, transform: i < ukaz ? "none" : "scale(.3)", transformBox: "fill-box", transformOrigin: "center", transition: "opacity .35s ease, transform .45s cubic-bezier(.3,1.6,.5,1)" }} />)}</g>
          <g>{geo.xy.map(([x, y], i) => <text key={i} x={x + 8} y={y + 4} fontSize={10.5} fontWeight={800} fill="#1D211B" stroke="#EFEAE1" strokeWidth={3} paintOrder="stroke" style={{ opacity: i < ukaz ? 1 : 0, transition: "opacity .4s ease" }}>{z[i].mesto}</text>)}</g>
          {geo.xy[let_] && <g style={{ transform: `translate(${geo.xy[let_][0]}px,${geo.xy[let_][1]}px)`, transition: "transform 1s cubic-bezier(.45,0,.55,1)" }}>
            <circle r={11} fill="rgba(246,183,60,.45)" className="cd-ziara" /><circle r={4} fill="#F6B73C" /></g>}
        </svg>}
        {!geo && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, color: "var(--ink3)" }}>{t("cesta.nacitavam")}</div>}
        <button type="button" onClick={() => setBeh((x) => x + 1)} style={{ position: "absolute", right: 10, bottom: 10, display: "flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 14px", borderRadius: 22, border: "1px solid var(--cardBd)", background: "rgba(246,243,236,.94)", fontSize: 13.5, fontWeight: 700, color: "#4A4C43", cursor: "pointer", fontFamily: "inherit", boxShadow: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>{t("cesta.prehrat")}</button>
        <span style={{ position: "absolute", left: 10, bottom: 8, fontSize: 9.5, color: "#85867B" }}>Natural Earth</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        {([[t.cislo(s.zastavok), t("cesta.zastavokSlovo", { n: s.zastavok })], [t.cislo(s.krajin), t("cesta.krajinSlovo", { n: s.krajin })], [t.cislo(s.km), "km"]] as [string, string][]).map(([h, l], i) => (
          <div key={l} style={{ padding: "12px 4px", textAlign: "center", borderLeft: i ? "1px solid var(--cardBd)" : "none" }}><b style={{ display: "block", fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{h}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{l}</span></div>))}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px 8px" }}>{t("cesta.zastavky")}</div>
        <ol style={{ listStyle: "none", margin: 0, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px" }}>
          {z.map((x, i) => (
            <li key={x.mesto + i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: i ? "var(--gSoft)" : "#C9A24A", color: i ? "var(--gInk)" : "#fff" }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{x.mesto} · {x.krajina}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{typT(x.typ, t)}</span></span>
              <span style={{ flex: "none", fontSize: 12, color: "var(--ink3)" }}>{datumT(x.datum, t)}</span>
            </li>))}
        </ol>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 20, background: "linear-gradient(150deg,var(--gSoft) 0%,var(--goldBg) 100%)", border: "1px solid var(--goldBd)" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gold)" }}>{t("cesta.zdielajRetaz")}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{t("cesta.zdielajPopis")}</div>
        <button type="button" onClick={() => { void zdielaj(); }} style={{ minHeight: 50, borderRadius: 15, border: "none", fontSize: 15.5, fontWeight: 800, color: "#fff", cursor: "pointer", background: "var(--gGrad)", fontFamily: "inherit" }}>{t("cesta.zdielat")}</button>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)", padding: "0 2px 8px" }}>{t("cesta.najdlhsie")}</div>
        <ol style={{ listStyle: "none", margin: 0, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px", overflow: "hidden" }}>
          {rebricek(moja).map(({ r, poradie, moja: m }, i) => (
            <li key={r.od + r.kam} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderTop: i ? "1px solid var(--cardBd)" : "none", ...(m ? { background: "var(--gSoft)", margin: "0 -14px", padding: "0 14px" } : {}) }}>
              <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: "var(--goldBg)", color: "var(--gold)" }}>{poradie}</span>
              <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: "block", fontSize: 14.5 }}>{r.od} → {r.kam}{m ? t("cesta.tvoja") : ""}</b><span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{t("cesta.zastavok", { n: r.zastavok })} · {t("cesta.krajin", { n: r.krajin })}</span></span>
              <span style={{ flex: "none", fontSize: 13, fontWeight: 700, color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>{t.cislo(r.km)} km</span>
            </li>))}
        </ol>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)", padding: "8px 2px 0" }}>{t("cesta.sutazia")}</div>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)", padding: "0 2px" }}>{t("cesta.pataPopis")}</div>
    </ObrazovkaSprava>
  );
}

/** malá mapka do karty v Štatistikách — body celej cesty (bez krajín, rýchla) */
export function MiniMapka({ size = 72 }: { size?: number }) {
  const svet = useSvet();
  const z = MOJA_CESTA.zastavky;
  const g = useMemo(() => {
    if (!svet) return null;
    const proj = projekcia("svet", svet, z, size, size, { x: 10, t: 10, b: 10 });
    return z.map((x) => proj(x.lonlat) ?? [0, 0]);
  }, [svet, z, size]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: "block", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", flex: "none" }}>
      {g && g.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i ? 2.6 : 3.4} fill={i ? "#4E7D37" : "#C9A24A"} />)}
    </svg>);
}
