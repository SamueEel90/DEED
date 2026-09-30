// KARTA 21 · Moje skutky — zoznam po mesiacoch, filtre 3 × 2, hľadanie, (ročný súhrn na zdieľanie je v Štatistikách, karta 27),
// prázdny stav = tá istá obrazovka s ukážkami. Pridať skutok = spoločný komponent (otvorPridatSkutok).
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { useLayout } from "@/components/context";
import { Svetlusik } from "@/features/zbierka/Svetlusik";
import { Harok } from "@/features/zbierka/Zdielat";
import { DeedQr } from "@/components/deedqr";
import { spracujFotku } from "@/lib/obrazok";
import { useSession } from "@/lib/session";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { mojeSkutky, useZmenySkutkov, upravSkutok, karmaSkutkov, normalizuj, type MojSkutok, type StavSkutku, type Oblast } from "@/lib/mojeSkutky";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { PruhySkutkov } from "@/features/skutok/Pruhy";
import { MOJA_KARMA } from "./mock";
import { ZAUJEM_OBLAST, type Oblast as OblastStitu } from "@/lib/stityOblasti";
import { useT, tTeraz, type T } from "@/i18n";
import { usePrekladObsahu } from "@/i18n/obsah";
import "@/styles/platba.css";

const Mes = (t: T, m: number) => { const x = t.mesiac(m); return x[0].toUpperCase() + x.slice(1); };
const OK = "M20 6 9 17l-5-5", WAIT = "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", AI = "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z", NO = "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z";
const ST: Record<StavSkutku, [string, string, string, string, string]> = {
  mesto: ["skutky.stav.mesto", "var(--gSoft)", "var(--gBd)", "var(--gInk)", OK],
  ok: ["skutky.stav.ok", "var(--gSoft)", "var(--gBd)", "var(--green)", OK],
  ai: ["skutky.stav.ai", "var(--field)", "var(--cardBd)", "var(--ink2)", AI],
  nam: ["skutky.stav.nam", "var(--bSoft)", "var(--bBd)", "var(--blue)", WAIT],
  ja: ["skutky.stav.ja", "var(--goldBg)", "var(--goldBd)", "var(--gold)", NO],
};
type Filter = "vsetky" | "ok" | "mesto" | "ai" | "nam" | "ja";
const FILTRE: [Filter, string][] = [["vsetky", "skutky.filter.vsetky"], ["ok", "skutky.filter.ok"], ["mesto", "skutky.filter.mesto"], ["ai", "skutky.filter.ai"], ["nam", "skutky.filter.nam"], ["ja", "skutky.filter.ja"]];
const PREJDE: Record<Filter, (x: MojSkutok) => boolean> = { vsetky: () => true, ok: (x) => x.stav === "ok" || x.stav === "mesto", mesto: (x) => x.stav === "mesto", ai: (x) => x.stav === "ai", nam: (x) => x.stav === "nam", ja: (x) => x.stav === "ja" };
const MOT: [string, string][] = [
  ["skutky.mot1.t", "skutky.mot1.s"],
  ["skutky.mot2.t", "skutky.mot2.s"],
  ["skutky.mot3.t", "skutky.mot3.s"],
];
const UKAZKY: [string, string, string, Oblast][] = [
  ["skutky.ukazka1.t", "skutky.ukazka1.s", "linear-gradient(135deg,#B9C7CF,#7E97A8)", "Pomoc"],
  ["skutky.ukazka2.t", "skutky.ukazka2.s", "linear-gradient(135deg,#E2D7BF,#C9B27B)", "Šport"],
  ["skutky.ukazka3.t", "skutky.ukazka3.s", "linear-gradient(135deg,#9DB38A,#5F7F5A)", "Príroda"],
];
/** len pre čítačku obrazovky */
const SR: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };
const lbl: CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" };
const karta: CSSProperties = { borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" };
const Ik = ({ d, s = 16, w = 2.4, c = "currentColor" }: { d: string; s?: number; w?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const datumTxt = (tr: T, t: number) => {
  const d = new Date(t), dnes = new Date(); const rozdiel = Math.floor((new Date(dnes.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (rozdiel === 0) return tr("skutky.dnes"); if (rozdiel === 1) return tr("skutky.vcera");
  if (rozdiel < 7) { const w = new Intl.DateTimeFormat(tr.locale, { weekday: "long" }).format(d); return w[0].toUpperCase() + w.slice(1); }
  return tr.datum(d);
};
/** oblasť skutku (dáta sú po slovensky) → text v jazyku appky */
const oblastTxt = (t: T, o: string) => t(`skutky.oblast.${o}`);

export function MojeSkutky21({ onBack, oblastStitu }: { onBack: () => void; /** z detailu oblasti v Karma a štíty */ oblastStitu?: OblastStitu }) {
  const [len, setLen] = useState<OblastStitu | undefined>(oblastStitu);
  useZmenySkutkov();
  const t = useT();
  const pr = usePrekladObsahu();
  const { desktop } = useLayout();
  const session = useSession() as { demo?: boolean } | null;
  const nast = useNastaveniaAppky();
  const vsetky = mojeSkutky();
  const [f, setF] = useState<Filter>("vsetky");
  const [hlad, setHlad] = useState(false);
  const [q, setQ] = useState("");
  const [otv, setOtv] = useState<string | null>(null);
  const [mesOtv, setMesOtv] = useState<number | null>(null);
  const [rok, setRok] = useState<number | null>(null);
  const [m, setM] = useState(0);
  const [retazPre, setRetazPre] = useState<MojSkutok | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const doplnitPre = useRef<string | null>(null);

  const d = new Date(), R = d.getFullYear(), M = d.getMonth();
  const prazdne = vsetky.length === 0;
  const ukazky = prazdne && nast.ukazky;

  useEffect(() => { if (!ukazky) return; const t = setInterval(() => setM((x) => (x + 1) % MOT.length), 4200); return () => clearInterval(t); }, [ukazky]);

  const hladane = useMemo(() => { const n = normalizuj(q); return (x: MojSkutok) => (!len || ZAUJEM_OBLAST[x.oblast] === len) && (!n || normalizuj(`${x.nazov} ${x.oblast} ${x.miesto}`).includes(n)); }, [q, len]);
  const zoznam = vsetky.filter(PREJDE[f]).filter(hladane);
  const tentoRok = vsetky.filter((x) => new Date(x.datum).getFullYear() === R);
  const tentoMes = tentoRok.filter((x) => new Date(x.datum).getMonth() === M);
  const karma = session?.demo ? MOJA_KARMA + karmaSkutkov(vsetky.filter((x) => x.id.startsWith("m"))) : karmaSkutkov(vsetky);
  const vRoku = (r: number, mes: number) => zoznam.filter((x) => { const t = new Date(x.datum); return t.getFullYear() === r && t.getMonth() === mes; });
  const roky = [...new Set(vsetky.map((x) => new Date(x.datum).getFullYear()))].filter((r) => r < R).sort((a, b) => b - a);

  const doplnFotku = async (files: FileList | null) => {
    const file = files?.[0], id = doplnitPre.current; if (!file || !id) return;
    try {
      const src = await spracujFotku(file, { pomer: null, maxSirka: 1568 });
      const s = vsetky.find((x) => x.id === id);
      upravSkutok(id, { fotky: [src, ...(s?.fotky ?? [])], det: tTeraz()("skutky.fotkaDoplnenaDet") });
      toast(tTeraz()("skutky.fotkaDoplnena"));
    } catch (e) { toast(e instanceof Error ? e.message : tTeraz()("skutky.fotkaChyba")); }
  };

  const riadok = (k: MojSkutok, i: number) => {
    const S = ST[k.stav], o = otv === k.id, foto = k.fotky[0];
    const img: CSSProperties = foto ? { background: `center/cover no-repeat url(${foto})` } : { background: k.grad || "var(--seg)" };
    const karmaT = k.karma == null ? t("skutky.karmaPoKontrole") : k.karma === 0 ? t("skutky.bezKarmy") : t("skutky.plusKarmy", { n: k.karma });
    return (
      <div key={k.id} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <button type="button" onClick={() => setOtv(o ? null : k.id)} aria-expanded={o}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 64, border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, flex: "none", ...img }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pr.p(k.nazov)}</span>
          <span role="img" aria-label={t(S[0])} style={{ width: 10, height: 10, borderRadius: "50%", flex: "none", background: S[3] }} />
          <span aria-hidden="true" style={{ display: "flex", flex: "none", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d="M6 9l6 6 6-6" /></span>
        </button>
        {o && <div className="pf-rise" style={{ padding: "0 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span aria-hidden="true" style={{ height: 180, borderRadius: 14, ...img }} />
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>{datumTxt(t, k.datum)} · {oblastTxt(t, k.oblast)} · {pr.p(k.miesto)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ flex: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 9, fontSize: 13, fontWeight: 800, background: S[1], border: `1px solid ${S[2]}`, color: S[3] }}><Ik d={S[4]} s={14} />{t(S[0])}</span>
            <span style={{ marginLeft: "auto", fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap", color: k.stav === "ai" ? "var(--ink4)" : "var(--gInk)" }}>{karmaT}</span>
          </div>
          {k.ucastnici?.length ? <div style={{ fontSize: 13, color: "var(--ink2)" }}>{t("skutky.sTebou", { n: k.ucastnici.length })}</div> : null}
          <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{pr.p(k.det)}</div>
          {k.stav === "ai" && <button type="button" onClick={() => { doplnitPre.current = k.id; fotoRef.current?.click(); }} style={{ alignSelf: "flex-start", whiteSpace: "nowrap", height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--bBd)", background: "var(--bSoft)", fontSize: 14, fontWeight: 700, color: "var(--blue)", cursor: "pointer", fontFamily: "inherit" }}>{t("skutky.doplnitFotku")}</button>}
          {(k.stav === "ok" || k.stav === "mesto") && !k.osobny && <button type="button" onClick={() => setRetazPre(k)} style={{ alignSelf: "flex-start", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7, height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--gBd)", background: "var(--gSoft)", fontSize: 14, fontWeight: 700, color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit" }}><Ik d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" s={15} w={2} />{t("skutky.retaz")}</button>}
        </div>}
      </div>);
  };
  const mesiacRiadok = (r: number, mes: number, zoz: MojSkutok[]) => {
    const kluc = r * 12 + mes, o = mesOtv === kluc;
    return (
      <div key={kluc} style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
        <button type="button" onClick={() => setMesOtv(o ? null : kluc)} aria-expanded={o} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 56, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)", textAlign: "left" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 }}>{Mes(t, mes)}</span>
          <span style={{ fontSize: 13.5, color: "var(--ink3)", whiteSpace: "nowrap" }}>{t("sp.skutkov", { n: zoz.length })}</span>
          <span aria-hidden="true" style={{ display: "flex", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d="M6 9l6 6 6-6" /></span>
        </button>
        {o && <div style={{ borderTop: "1px solid var(--cardBd)" }}>{zoz.map(riadok)}{pr.odkaz && <div style={{ display: "flex", padding: "2px 0 8px" }}>{pr.odkaz}</div>}</div>}
      </div>);
  };

  // ---- obsah ----
  let obsah: ReactNode;
  if (rok != null) {
    const mesiace = Array.from({ length: 12 }, (_, i) => 11 - i).map((mes) => [mes, vRoku(rok, mes)] as const).filter(([, z]) => z.length);
    obsah = <>
      {mesiace.map(([mes, z]) => mesiacRiadok(rok, mes, z))}
      {!mesiace.length && <div style={{ fontSize: 14, color: "var(--ink3)", textAlign: "center", padding: 20 }}>{t("skutky.nicSmeNenasli")}</div>}
    </>;
  } else {
    const aktualne = zoznam.filter((x) => { const t = new Date(x.datum); return t.getFullYear() === R && t.getMonth() === M; });
    const starsie = Array.from({ length: M }, (_, i) => M - 1 - i).map((mes) => [mes, vRoku(R, mes)] as const).filter(([, z]) => z.length);
    obsah = <>
      <div style={{ ...karta, borderRadius: 18, display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {([[t.cislo(tentoRok.length), t("skutky.stat.skutkov"), "var(--ink)"], [t.cislo(tentoMes.length), t("skutky.stat.tentoMesiac"), "var(--ink)"], [t.cislo(karma), t("skutky.stat.karma"), "var(--gInk)"]] as const).map(([n, l, c], i) => (
          <div key={l} style={{ padding: "12px 4px", textAlign: "center", borderLeft: i ? "1px solid var(--cardBd)" : "none" }}><div style={{ fontSize: 20, fontWeight: 800, color: c, whiteSpace: "nowrap" }}>{n}</div><div style={{ fontSize: 12.5, color: "var(--ink3)" }}>{l}</div></div>))}
      </div>
      {ukazky && <>
        <div style={{ borderRadius: 20, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <Svetlusik size={52} />
          <span style={{ flex: 1, minWidth: 0 }} aria-live="polite"><span key={m} className="pf-rise" style={{ display: "block", minHeight: 40, fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{t(MOT[m][0])}</span><span style={{ display: "block", minHeight: 36, fontSize: 13, lineHeight: 1.45, color: "var(--ink2)", marginTop: 3 }}>{t(MOT[m][1])}</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink3)" }}>{t("skutky.ukazkyInfo")}</span>
          <button type="button" onClick={() => zmenNastavenia({ ukazky: false })} style={{ flex: "none", border: "none", background: "transparent", fontSize: 13.5, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "12px 0 12px 10px", fontFamily: "inherit" }}>{t("skutky.skrytUkazky")}</button></div>
      </>}
      <div role="group" aria-label={t("skutky.filter")} style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {FILTRE.map(([k, n]) => { const on = f === k; return (
          <button type="button" key={k} aria-pressed={on} onClick={() => setF(k)} style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", height: 44, padding: "0 6px", borderRadius: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            background: on ? "var(--ink)" : "var(--card)", border: `1.5px solid ${on ? "var(--ink)" : "var(--cardBd)"}`, color: on ? "var(--bg)" : "var(--ink2)" }}>{t(n)}</button>); })}
      </div>
      {f === "ja" && !prazdne && (() => {
        const ja = tentoMes.filter((x) => x.stav === "ja");
        const skup = ja.reduce<Record<string, number>>((a, x) => ({ ...a, [x.oblast]: (a[x.oblast] || 0) + 1 }), {});
        return <div style={{ borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gold)" }}>{t("skutky.dennikTento")}</div>
          {Object.entries(skup).map(([o, n]) => <div key={o} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}><span style={{ flex: 1, fontWeight: 700 }}>{oblastTxt(t, o)}</span><span style={{ color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>{t("skutky.krat", { n })}</span></div>)}
          {!ja.length && <div style={{ fontSize: 14, color: "var(--ink2)" }}>{t("skutky.tentoMesiacNic")}</div>}
        </div>;
      })()}
      {ukazky ? <>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 6 }}><h2 style={lbl}>{t("skutky.inspiracia")}</h2>
          <button type="button" onClick={() => zmenNastavenia({ ukazky: false })} style={{ border: "none", background: "transparent", fontSize: 13.5, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "12px 0 12px 8px", fontFamily: "inherit" }}>{t("skutky.skrytUkazky")}</button></div>
        {UKAZKY.map(([nz, s, img, o]) => (
          <div key={nz} style={{ position: "relative", overflow: "hidden", borderRadius: 18, background: "var(--card)", border: "1.5px dashed var(--cardBd)", padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <span aria-hidden="true" style={{ position: "absolute", top: 10, right: -30, width: 110, transform: "rotate(35deg)", background: "var(--seg)", color: "var(--ink3)", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textAlign: "center", padding: "3px 0" }}>{t("skutky.ukazka")}</span>
            <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 12, flex: "none", background: img, opacity: 0.7 }} />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", opacity: 0.85 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800, lineHeight: 1.3, paddingRight: 28 }}><span style={SR}>{t("skutky.ukazkaSr")}</span>{t(nz)}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{t(s)}</span></span>
              <button type="button" onClick={() => otvorPridatSkutok({ start: "solo", oblast: o })} style={{ marginTop: 8, height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--gBd)", background: "var(--gSoft)", fontSize: 14, fontWeight: 700, color: "var(--gInk)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>{t("skutky.urobimPodobny")}</button></span>
          </div>))}
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink4)", textAlign: "center" }}>{t("skutky.ukazkyPozn")}</div>
      </> : <>
        <h2 style={lbl}>{R} · {t.mesiac(M).toUpperCase()}{prazdne ? ` · ${t("skutky.zatialPrazdne")}` : ""}</h2>
        {aktualne.length > 0 ? <><div style={{ ...karta, padding: "0 12px" }}>{aktualne.map(riadok)}</div>{pr.odkaz}</>
          : <div style={{ ...karta, padding: "16px 14px", fontSize: 14, color: "var(--ink3)" }}>{prazdne ? t("skutky.prvySkutok") : q ? t("skutky.nicSmeNenasli") : t("skutky.mesiacNic")}</div>}
        {starsie.map(([mes, z]) => mesiacRiadok(R, mes, z))}
        {roky.some((r) => zoznam.some((x) => new Date(x.datum).getFullYear() === r)) && <h2 style={{ ...lbl, marginTop: 4 }}>{t("skutky.starsieRoky")}</h2>}
        {roky.map((r) => { const z = zoznam.filter((x) => new Date(x.datum).getFullYear() === r); if (!z.length) return null; const akcii = z.filter((x) => x.stav !== "ja").length, sukr = z.filter((x) => x.stav === "ja").length; return (
          <button type="button" key={r} onClick={() => { setRok(r); setMesOtv(null); }} style={{ ...karta, borderRadius: 18, display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", width: 56 }}>{r}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{t("sp.skutkov", { n: z.length })}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{t("skutky.rokSuhrn", { akcii, sukr })}</span></span>
            <span style={{ display: "flex", color: "var(--ink3)" }}><Ik d="M9 6l6 6-6 6" /></span>
          </button>); })}
        {!prazdne && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center", padding: "0 12px" }}>{t("skutky.overovaniePozn")}</div>}
      </>}
    </>;
  }

  const fabBottom = desktop ? 24 : "calc(96px + env(safe-area-inset-bottom, 0px))";
  return (
    <div className="deed-platba" style={{ minHeight: "100%", color: "var(--ink)" }}>
      <div style={{ padding: `4px 16px ${desktop ? "24px" : "calc(110px + env(safe-area-inset-bottom, 0px))"}`, display: "flex", flexDirection: "column", gap: 14, maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52 }}>
          <SpatTlacidlo onClick={rok != null ? () => setRok(null) : onBack} />
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{rok != null ? t("skutky.titulRok", { rok: String(rok) }) : t("skutky.titul")}</h1>
          <button type="button" onClick={() => { setHlad(!hlad); setQ(""); }} aria-label={t("skutky.hladat")} aria-expanded={hlad} style={{ marginLeft: "auto", marginRight: -6, width: 44, height: 44, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink2)" }}>
            <Ik d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" s={21} w={2.2} /></button>
        </div>
        {hlad && <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("skutky.hladatPole")} aria-label={t("skutky.hladatPole")} className="pf-rise"
          style={{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />}
        {len && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 4px 14px", borderRadius: 13, background: "var(--gSoft)", border: "1px solid var(--gBd)", color: "var(--gInk)", fontSize: 14, fontWeight: 700 }}>
          <span style={{ flex: 1 }}>{t("skutky.lenOblast", { oblast: len })}</span>
          <button type="button" onClick={() => setLen(undefined)} style={{ minHeight: 40, padding: "0 12px", border: "none", background: "none", boxShadow: "none", fontSize: 14, fontWeight: 800, color: "var(--gInk)", fontFamily: "inherit", cursor: "pointer" }}>{t("skutky.zobrazitVsetky")}</button></div>}
        {obsah}
        {/* dole: banner akcie / ohláseného skutku + Pridať skutok (jediný vstup) — lepí sa na spodok stĺpca */}
        <div style={{ position: "sticky", bottom: fabBottom, zIndex: 41, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, pointerEvents: "none", marginTop: 8 }}>
          <PruhySkutkov />
          <button type="button" onClick={() => otvorPridatSkutok()} style={{ alignSelf: "flex-end", pointerEvents: "auto", display: "flex", alignItems: "center", gap: 8, height: 58, padding: "0 22px 0 18px", borderRadius: 29, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(75,122,53,.35)", fontFamily: "inherit" }}>
            <Ik d="M12 5v14M5 12h14" s={22} w={2.6} />{t("skutky.pridat")}</button>
        </div>
      </div>
      <input ref={fotoRef} type="file" accept="image/*" hidden onChange={(e) => { void doplnFotku(e.target.files); e.target.value = ""; }} />

      {retazPre && <Harok onClose={() => setRetazPre(null)} hlavicka={<h2 style={{ flex: 1, margin: 0, fontSize: 19, fontWeight: 800 }}>{t("skutky.retaz")}</h2>}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{pr.p(retazPre.nazov)}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{retazPre.retaz
          ? <>{t("skutky.retazZapecatena")} <b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{t("skutky.retazPct", { pct: retazPre.retaz.pct })}</b> {t("skutky.retazIdeNa", { zbierka: retazPre.retaz.zbierka.nazov })}</>
          : t("skutky.retazNema")}</div>
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><DeedQr data={`https://deed.sk/s/${retazPre.id}`} size={200} retaz={!!retazPre.retaz} delenie={retazPre.retaz ? t("skutky.retazDelenie", { pct: retazPre.retaz.pct }) : null} /></div>
        <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.45, textAlign: "center" }}>{t("skutky.retazQrPozn")}</div>
      </Harok>}
    </div>
  );
}
