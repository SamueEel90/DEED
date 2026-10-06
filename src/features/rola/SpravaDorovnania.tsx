// ============================================================
// KARTA 49 · Správa charity → Dorovnanie daru (pohľad charity), 1 : 1 podľa „Sprava charity - Dorovnanie daru".
// Od koho prijímate · sekcie ČAKÁ NA VÁS / BEŽÍ / UKONČENÉ · detail (PC vpravo sticky 460 px, mobil cez celú obrazovku).
// Príjem potvrdzuje charita vždy; mimo DEED sa nikdy nespustí samo. Odmietnuť len do 24 h (s dôvodom, vidí ho len DEED),
// Neprišli až po 24 h. Vrátenie zvyšku = vlastný doklad D-, VS = číslo vratného dokladu, nikdy číslo zbierky.
// Zlatá = len dorovnanie. Postup firmy je karta 11 (DorovnanieFirmy.tsx).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  useDorovnania, stavCharity, vycerpane, zostatok, automatOd, daSaOdmietnut, hodinDoKoncaOdmietnutia, potvrdPlatbu, spustiDorovnanie,
  odmietniDorovnanie, peniazeNeprisli, ukonciDorovnanie, vratZvysok, upozorniFirmu, obmedzenieDorovnania, ulozObmedzenie, naplnTestovacieDorovnania,
  ODVETVIA_OBMEDZENIA, REGISTER_FIRIEM, type Dorovnanie, type StavCharity,
} from "@/lib/dorovnanie";
import { darcoviaPre, relCas } from "@/lib/darcovia";
import { cisloObjektu } from "@/lib/cisloObjektu";
import { rovnakaFirma, nazovFirmy } from "@/lib/firma";
import { nacitajStav, ulozStav } from "@/lib/zbierkaSprava";
import { nacitajDoklad } from "@/lib/doklad";
import { TESTOVACIA } from "@/lib/testovacia";
import { RichTextInput } from "@/components/richtext";
import { cistyText } from "@/lib/richtext";
import { predvyplnOznam } from "./NovyOznam";

const eur = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("sk-SK")} €`;
const den = (t: number) => { const d = new Date(t); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const denK = (t: number) => { const d = new Date(t); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const ini = (f: string) => { const w = f.split(/\s+/).filter((x) => x && !/\./.test(x)); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? "?").slice(0, 2)).toUpperCase(); };
const pomerT = (p: number) => (p >= 1 ? `1 : ${p.toLocaleString("sk-SK")}` : `+${Math.round(p * 100)} %`);
const CH: Record<StavCharity, [string, string, string]> = {
  potvrdene: ["SPUSTITE DOROVNANIE", "#8A6A1C", "#fff"], cakaMimo: ["POTVRĎTE PRÍJEM", "#8A6A1C", "#fff"], cakaDeed: ["POTVRĎTE PRÍJEM", "#8A6A1C", "#fff"], vratit: ["VRÁŤTE ZVYŠOK", "#8A6A1C", "#fff"],
  bezi: ["BEŽÍ", "#4B7A35", "#fff"], minute: ["ROZPOČET MINUTÝ", "var(--btn)", "var(--ink2)"], kon: ["UKONČENÉ", "var(--btn)", "var(--ink2)"], odm: ["ODMIETNUTÉ", "var(--btn)", "var(--ink2)"],
};
const SEKCIE: [string, StavCharity[]][] = [["ČAKÁ NA VÁS", ["potvrdene", "cakaMimo", "cakaDeed", "vratit"]], ["BEŽÍ", ["bezi"]], ["UKONČENÉ", ["minute", "kon", "odm"]]];
const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1.5px solid var(--goldBd)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 };
const kartaS: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 };
const txt: CSSProperties = { fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" };
const tlZ: CSSProperties = { minHeight: 48, padding: "0 18px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", boxShadow: "none" };
const tlO: CSSProperties = { minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" };
const tlR: CSSProperties = { ...tlO, border: "1.5px solid var(--red)", color: "var(--red)" };

function info(d: Dorovnanie, st: StavCharity): string {
  if (st === "cakaMimo" || st === "cakaDeed" || st === "potvrdene") return `spustí sa po prijatí platby · ${pomerT(d.pomer)} · ${d.lenZamestnanci ? "len zamestnancom firmy" : "každému darcovi"}`;
  if (st === "bezi") return `dorovnáva do ${den(d.do)}${d.stropDaru ? ` · najviac ${eur(d.stropDaru)} k jednému daru` : ""}`;
  if (st === "vratit") return d.odmietnutie ? "dorovnanie ste odmietli" : `zbierka skončila ${den(d.pozastavene ?? d.do)}`;
  return konT(d) ?? `skončilo ${den(d.ukoncene ?? d.do)}`;
}
function konT(d: Dorovnanie): string | null {
  if (d.neprisli) return "peniaze neprišli · firme sme dali vedieť";
  if (d.vratenie?.kedy) return d.vratenie.cez === "deed" ? `zvyšok vrátený cez DEED ${den(d.vratenie.kedy)}` : "zvyšok vrátený mimo DEED · doklad o úhrade priložený";
  if (d.stav === "vycerpane") return `rozpočet minutý ${den(d.ukoncene ?? d.do)}`;
  return null;
}
function suhrn(d: Dorovnanie, st: StavCharity): string {
  const min = vycerpane(d);
  if (st === "potvrdene") return `${eur(d.strop)} · peniaze prišli · spustite`;
  if (st === "cakaMimo") return `${eur(d.strop)} · prevod mimo DEED · potvrďte príjem`;
  if (st === "cakaDeed") { const a = automatOd(d); return `${eur(d.strop)} · cez DEED · potvrďte${a ? `, inak sa spustí samo ${den(a)}` : ""}`; }
  if (st === "vratit") return `zvyšok ${eur(d.vratenie?.suma ?? 0)} vrátiť do ${den(d.vratenie?.do ?? Date.now())}`;
  if (st === "bezi") return `${eur(min)} z ${eur(d.strop)} · ${pomerT(d.pomer)} · do ${den(d.do)}`;
  return `${eur(min)} z ${eur(d.strop)} · ${konT(d) ?? (d.odmietnutie ? "odmietnuté" : `skončilo ${den(d.ukoncene ?? d.do)}`)}`;
}
const uhradaT = (d: Dorovnanie) => `${d.uhrada === "mimo" ? "prevod mimo DEED" : d.kanal === "karta" ? "kartou cez DEED" : d.kanal === "krypto" ? "EURC cez DEED" : "SEPA cez DEED"} · ${d.stav === "potvrdene" && d.zaplatene ? `potvrdené ${den(d.zaplatene)}` : den(d.oznamene ?? d.zapecatene)}`;

/** Ako chodili dary: 7 dní pred dorovnaním + dni počas (najviac 14 posledných) — dary ľudí a diel firmy */
function statistika(d: Dorovnanie) {
  const DEN = 86400000, ludia = d.zaznamy.reduce((a, z) => a + z.dar, 0), firma = vycerpane(d);
  const koniec = Math.min(Date.now(), d.ukoncene ?? d.pozastavene ?? Date.now(), d.do);
  const odDen = Math.floor(d.od / DEN), doDen = Math.floor(koniec / DEN);
  const dniPocas = Math.max(1, Math.min(14, doDen - odDen + 1)), zacDen = doDen - dniPocas + 1;
  const pocas = Array.from({ length: dniPocas }, (_, i) => { const dd = zacDen + i; const zz = d.zaznamy.filter((z) => Math.floor(z.kedy / DEN) === dd); return { l: zz.reduce((a, z) => a + z.dar, 0), f: zz.reduce((a, z) => a + z.dorovnane, 0) }; });
  const realPred = Array.from({ length: 7 }, (_, i) => darcoviaPre(d.ciel).filter((r) => Math.floor(r.cas / DEN) === odDen - 7 + i).reduce((a, r) => a + r.suma, 0));
  const avgP = ludia / Math.max(1, pocas.length);
  const pred = realPred.some((v) => v > 0) || !TESTOVACIA ? realPred : [0.5, 0.65, 0.45, 0.6, 0.55, 0.7, 0.5].map((v) => avgP * v); // TESTOVACIE: bez dát pred
  const max = Math.max(1, ...pred, ...pocas.map((p) => p.l + p.f)), H = 90, k = H / max;
  const stl = [...pred.map((v) => ({ hf: 0, hl: Math.max(2, Math.round(v * k)), lc: "var(--gBd)", rl: "3px 3px 0 0" })), ...pocas.map((p) => ({ hf: Math.round(p.f * k), hl: Math.round(p.l * k), lc: "var(--green)", rl: p.f ? "0" : "3px 3px 0 0" }))];
  const priem = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  return { ludia, firma, stl, pred: `${Math.round(priem(pred)).toLocaleString("sk-SK")} €`, pocas: `${Math.round(priem(pocas.map((p) => p.l))).toLocaleString("sk-SK")} €` };
}

export function SpravaDorovnania({ entita, hlavnyUcet, mobil, toast, onZbierky, onOznamy, testCiele, nadpis = true }: {
  entita: string; hlavnyUcet: string; mobil: boolean; toast: (m: string) => void; onZbierky: () => void; onOznamy?: () => void;
  /** v Správe stránky je nadpis „Dorovnanie daru" už v hlavičke */
  nadpis?: boolean;
  /** TESTOVACIE: id zbierok pre ukážkové dorovnania podľa prototypu */
  testCiele?: Parameters<typeof naplnTestovacieDorovnania>[1];
}) {
  useEffect(() => { if (TESTOVACIA && testCiele) naplnTestovacieDorovnania(entita, testCiele); }, [entita]); // eslint-disable-line react-hooks/exhaustive-deps
  const L = useDorovnania(entita);
  const [sel, setSel] = useState<string | null>(null);
  const [selM, setSelM] = useState<string | null>(null);
  const prvy = SEKCIE.flatMap(([, sts], i) => L.filter((d) => sts.includes(stavCharity(d))).sort((a, b) => i === 0 ? (a.oznamene ?? a.zapecatene) - (b.oznamene ?? b.zapecatene) : 0))[0];
  const aktivny = L.find((d) => d.id === sel) ?? prvy ?? null;

  // ---- od koho prijímate ----
  const [obm, setObm] = useState(() => obmedzenieDorovnania(entita));
  const zmenObm = (o: typeof obm) => { setObm(o); ulozObmedzenie(entita, o); };
  const [q, setQ] = useState("");
  const qq = q.trim().toLowerCase();
  const navrhy = qq.length < 2 ? [] : REGISTER_FIRIEM.filter((f) => !obm.firmy.some((u) => rovnakaFirma(u, f.ucet)) && f.nazov.toLowerCase().includes(qq)).slice(0, 4);
  const obmPopis = obm.zapnute
    ? `Neprijímate od ${obm.odvetvia.length ? `${obm.odvetvia.length} ${obm.odvetvia.length === 1 ? "odvetvia" : "odvetví"}` : "žiadneho odvetvia"}${obm.firmy.length ? ` a ${obm.firmy.length} ${obm.firmy.length === 1 ? "firmy" : "firiem"}` : ""}. Ostatné firmy môžu dorovnávať.`
    : "Dorovnávať môže každá firma s IČO. Do 24 hodín od jej platby môžete dorovnanie odmietnuť.";
  const odKoho = (
    <section style={{ ...kartaS, padding: mobil ? "16px" : "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ flex: 1, minWidth: 160, fontSize: 15 }}>Od koho prijímate dorovnanie</b>
        <div role="radiogroup" aria-label="Od koho prijímate dorovnanie" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)" }}>
          {([["Od všetkých firiem", false], ["Obmedziť", true]] as const).map(([t, v]) => { const on = obm.zapnute === v; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => zmenObm({ ...obm, zapnute: v })} style={{ minHeight: 44, padding: "0 14px", border: "none", borderRadius: 11, background: on ? "var(--card)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)", whiteSpace: "nowrap", boxShadow: "none" }}>{t}</button>); })}
        </div>
      </div>
      <span style={{ ...txt, color: "var(--ink3)" }}>{obmPopis}</span>
      {obm.zapnute && <>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--cardBd)" }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>NEPRIJÍMAŤ OD ODVETVÍ</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ODVETVIA_OBMEDZENIA.map((t) => { const on = obm.odvetvia.includes(t); return (
              <button key={t} type="button" aria-pressed={on} onClick={() => zmenObm({ ...obm, odvetvia: on ? obm.odvetvia.filter((x) => x !== t) : [...obm.odvetvia, t] })} style={{ minHeight: 44, padding: "0 14px", borderRadius: 22, border: `1.5px solid ${on ? "var(--red)" : "var(--cardBd)"}`, background: on ? "transparent" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: on ? "var(--red)" : "var(--ink2)", boxShadow: "none" }}>{t}</button>); })}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 10, borderTop: "1px solid var(--cardBd)" }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>NEPRIJÍMAŤ OD FIRIEM</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zadajte názov alebo IČO firmy" aria-label="Hľadať firmu" style={{ height: 48, padding: "0 14px", borderRadius: 13, border: "1.5px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", fontFamily: "inherit", fontSize: 14, outline: "none" }} />
          {navrhy.map((f) => (
            <button key={f.ucet} type="button" onClick={() => { zmenObm({ ...obm, firmy: [...obm.firmy, f.ucet] }); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "0 12px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}><b style={{ fontSize: 14 }}>{f.nazov}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{f.odvetvie} · {f.mesto}</span></span>
              <span style={{ flex: "none", fontSize: 13.5, fontWeight: 800, color: "var(--red)" }}>Nechcem</span>
            </button>))}
          {obm.firmy.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {obm.firmy.map((m) => <button key={m} type="button" onClick={() => zmenObm({ ...obm, firmy: obm.firmy.filter((x) => x !== m) })} aria-label={`Odobrať ${nazovFirmy(m)}`} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 8px 0 14px", borderRadius: 22, border: "1.5px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "var(--ink)", boxShadow: "none" }}>{nazovFirmy(m)}<span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 12, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "var(--ink2)" }}>×</span></button>)}
          </div>}
        </div>
        <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Týmto firmám sa pri vašich zbierkach dorovnanie neponúkne. Firma nevidí, že ste ju obmedzili.</span>
      </>}
    </section>);

  // ---- zoznam ----
  const riadok = (d: Dorovnanie) => {
    const st = stavCharity(d), min = vycerpane(d);
    const c = st === "bezi" && d.strop && min / d.strop >= 0.8 ? ["MÍŇA SA", "#8A6A1C", "#fff"] : CH[st];
    const chip = <span style={{ flex: "none", alignSelf: mobil ? "flex-start" : undefined, height: 24, padding: "0 9px", borderRadius: 12, background: c[1], color: c[2], fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{c[0]}</span>;
    const vybrany = !mobil && aktivny?.id === d.id;
    return (
      <button key={d.id} type="button" onClick={() => (mobil ? setSelM(d.id) : setSel(d.id))} aria-pressed={!mobil ? vybrany : undefined} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 18, background: "var(--card)", border: vybrany ? "2px solid var(--goldBd)" : "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
        <span style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", background: d.firmaLogo ? `url('${d.firmaLogo}') center/cover no-repeat var(--goldBg)` : "var(--goldBg)", border: "1px solid var(--goldBd)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>{d.firmaLogo ? "" : ini(d.firma)}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{(d.cielNazov + (d.lenZamestnanci ? " · len zamestnanci" : "")).toLocaleUpperCase("sk-SK")}</span>
          <b style={{ fontSize: 16, lineHeight: 1.25 }}>{d.firma}</b>
          <span style={{ height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", background: "var(--gold)", transformOrigin: "left", transform: `scaleX(${d.strop ? Math.min(1, min / d.strop) : 0})`, transition: "transform .9s ease" }} /></span>
          <span style={{ fontSize: 13, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{suhrn(d, st)}</span>
          {mobil && chip}
        </span>
        {!mobil && chip}
        <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>
      </button>);
  };
  // čaká na vás: najstaršie (najnaliehavejšie) hore; ostatné najnovšie hore
  const sekcie = SEKCIE.map(([t, sts], i) => [t, L.filter((d) => sts.includes(stavCharity(d))).sort((a, b) => i === 0 ? (a.oznamene ?? a.zapecatene) - (b.oznamene ?? b.zapecatene) : 0)] as const).filter(([, p]) => p.length);
  const zoznam = (<>
    {L.length === 0 && <section style={{ ...kartaS, padding: "24px 22px", gap: 8 }}>
      <b style={{ fontSize: 17 }}>Zatiaľ žiadne dorovnanie</b>
      <span style={{ ...txt, color: "var(--ink3)" }}>Firma si vyberie vašu zbierku, nastaví podmienky, uhradí rozpočet a zapečatí ho. Vy len potvrdíte, že peniaze prišli na účet.</span>
    </section>}
    {odKoho}
    {sekcie.map(([t, p]) => <div key={t} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: 8 }}>{t}</span>
      {p.map(riadok)}
    </div>)}
  </>);

  const hlavicka = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={onZbierky} style={{ minHeight: 44, padding: "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>‹ Zbierky</button>
        {nadpis && <b style={{ fontSize: 22 }}>Dorovnanie daru</b>}
      </div>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink3)", maxWidth: 720 }}>Firmy pridávajú k darom ľudí svoj diel. Peniaze sú vopred na vašom účte a podmienky sú zapečatené, nemení ich nikto.</span>
    </>);

  const dM = selM ? L.find((d) => d.id === selM) ?? null : null;
  if (mobil) return (<>
    {hlavicka}
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{zoznam}</div>
    {dM && createPortal(
      <div className="sprava-charity" role="dialog" aria-modal="true" aria-label={`Dorovnanie ${dM.firma}`} style={{ position: "fixed", inset: 0, zIndex: 85, background: "var(--bg)", color: "var(--ink)", overflowY: "auto", WebkitOverflowScrolling: "touch" } as CSSProperties}>
        <div style={{ padding: "max(14px, env(safe-area-inset-top)) 16px 120px", display: "flex", flexDirection: "column", gap: 12 }}>
          <button type="button" onClick={() => setSelM(null)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>‹ Dorovnanie daru</button>
          <Detail key={dM.id} d={dM} entita={entita} hlavnyUcet={hlavnyUcet} toast={toast} onOznamy={onOznamy} />
        </div>
      </div>, document.body)}
  </>);
  return (<>
    {hlavicka}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 460px", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>{zoznam}</div>
      {aktivny && <div style={{ position: "sticky", top: 12 }}><Detail key={aktivny.id} d={aktivny} entita={entita} hlavnyUcet={hlavnyUcet} toast={toast} onOznamy={onOznamy} /></div>}
    </div>
  </>);
}

function Detail({ d, entita, hlavnyUcet, toast, onOznamy }: { d: Dorovnanie; entita: string; hlavnyUcet: string; toast: (m: string) => void; onOznamy?: () => void }) {
  const st = stavCharity(d), min = vycerpane(d), ost = zostatok(d);
  const caka = st === "cakaMimo" || st === "cakaDeed" || st === "potvrdene";
  const do24 = daSaOdmietnut(d);
  const [odm, setOdm] = useState(false);
  const [dovod, setDovod] = useState("");
  const [dovodE, setDovodE] = useState(false);
  const [vr, setVr] = useState<null | "deed" | "mimo">(null);
  const [doklad, setDoklad] = useState<{ nazov: string; src: string } | null>(null);
  const [dkE, setDkE] = useState(false);
  const [drz, setDrz] = useState(false);
  const [uk, setUk] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const zbC = cisloObjektu("Z", d.ciel);
  const vs = d.vratenie ? `D-${d.vratenie.vs.slice(0, 3)} ${d.vratenie.vs.slice(3, 6)} ${d.vratenie.vs.slice(6, 9)} ${d.vratenie.vs.slice(9)}` : "";
  const okno = do24 ? `Odmietnuť môžete do 24 hodín od oznámenia platby, ešte ${hodinDoKoncaOdmietnutia(d)} h.` : "Ak peniaze ani po 24 hodinách neprišli, ťuknite na Neprišli.";
  const zacni = () => { setDrz(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => { setDrz(false); if (vratZvysok(entita, d.id, "deed")) toast(`Vrátené ${eur(d.vratenie?.suma ?? 0)}. Firma dostane potvrdenie o vrátení.`); }, 900); };
  const pusti = () => { window.clearTimeout(tm.current); setDrz(false); };

  const potvrdenie = (cez: boolean) => (
    <section style={karta}>
      <b style={{ fontSize: 16 }}>Prišli peniaze na účet?</b>
      <span style={txt}>{cez
        ? `Firma poslala ${eur(d.strop)} cez DEED. Keď peniaze uvidíte na účte, potvrďte. Ak nič nepotvrdíte, dorovnanie sa spustí samo ${den(automatOd(d) ?? Date.now())}.`
        : `Firma oznámila prevod ${eur(d.strop)} na váš účet ${hlavnyUcet}, mimo DEED. Prevod môže trvať do 1 pracovného dňa. Túto platbu nevidíme, preto sa dorovnanie samo nespustí.`}</span>
      {!odm ? <>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { potvrdPlatbu(entita, d.id); }} style={tlZ}>Peniaze prišli</button>
          {do24 ? <button type="button" onClick={() => setOdm(true)} style={tlR}>Odmietnuť</button>
            : <button type="button" onClick={() => { if (peniazeNeprisli(entita, d.id)) toast(cez ? "Firme sme dali vedieť. Platbu preverí DEED+." : "Firme sme dali vedieť."); }} style={tlO}>Neprišli</button>}
        </div>
        <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{okno}</span>
      </> : <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 10, borderTop: "1px solid var(--cardBd)" }}>
        <b style={{ fontSize: 15 }}>Odmietnuť dorovnanie od {d.firma}?</b>
        <span style={txt}>Pri zbierke sa firma neukáže. Peniaze, ktoré poslala ({eur(d.strop)}), jej vrátite.</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>Dôvod · vidí ho len DEED, firma nie</span>
        <div style={{ borderRadius: 14, outline: dovodE ? "1.5px solid var(--red)" : "none" }}>
          <RichTextInput vzhlad="sprava" value={dovod} onChange={(h) => { setDovod(h); setDovodE(false); }} minH={84} placeholder="Napríklad: firma sa nehodí k našej činnosti" ariaLabel="Dôvod odmietnutia" nastroje={["bold", "italic", "insertUnorderedList", "diktovat"]} />
        </div>
        {dovodE && <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>Napíšte dôvod, prečo dorovnanie odmietate.</span>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { if (!cistyText(dovod).trim()) { setDovodE(true); return; } if (odmietniDorovnanie(entita, d.id, cistyText(dovod))) setOdm(false); else toast("Odmietnuť sa dá len do 24 hodín od oznámenia platby."); }} style={{ ...tlZ, background: "var(--red)" }}>Odmietnuť</button>
          <button type="button" onClick={() => setOdm(false)} style={tlO}>Späť</button>
        </div>
      </div>}
    </section>);

  const riadokSum = (k: string, v: string) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--cardBd)", fontSize: 14 }}><span style={{ color: "var(--ink3)" }}>{k}</span><b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}</b></div>;
  const vratenie = d.vratenie && (
    <section style={karta}>
      <b style={{ fontSize: 16 }}>Vráťte firme zvyšok {eur(d.vratenie.suma)}</b>
      <span style={txt}>{d.odmietnutie ? `Dorovnanie ste odmietli, firme vrátite celú sumu ${eur(d.vratenie.suma)}.` : `Z rozpočtu ostalo ${eur(d.vratenie.suma)} a firme sa vráti.`} Termín: {den(d.vratenie.do)}.</span>
      {!vr && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setVr("deed")} style={tlZ}>Vrátiť cez DEED</button>
        <button type="button" onClick={() => setVr("mimo")} style={tlO}>Poslal som mimo DEED</button>
      </div>}
      {vr === "deed" && <>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {riadokSum("Komu", d.firma)}{riadokSum("Suma", eur(d.vratenie.suma))}{riadokSum("Odkiaľ", "účet organizácie · SEPA")}{riadokSum("Variabilný symbol", vs)}
        </div>
        <span style={txt}>Po platbe sa prípad uzavrie sám. Firma dostane potvrdenie o vrátení. Vrátenie sa nepočíta do vyzbieraného.</span>
        <button type="button" onPointerDown={zacni} onPointerUp={pusti} onPointerLeave={pusti} onPointerCancel={pusti}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }} onContextMenu={(e) => e.preventDefault()}
          style={{ position: "relative", overflow: "hidden", minHeight: 52, border: "none", borderRadius: 14, background: "#3F6E2A", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", userSelect: "none", touchAction: "none", boxShadow: "none" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "#6E9F4E", transformOrigin: "left", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? ".9s" : ".2s"} linear` }} />
          <span style={{ position: "relative" }}>Podrž a vráť {eur(d.vratenie.suma)}</span>
        </button>
        <button type="button" onClick={() => setVr(null)} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "var(--ink3)", boxShadow: "none" }}>‹ Späť</button>
      </>}
      {vr === "mimo" && <>
        <span style={txt}>Pri prevode uveďte variabilný symbol {vs}, nie číslo zbierky. Potom priložte doklad o úhrade: výpis z banky alebo potvrdenie platby, kde je vidieť sumu a účet firmy. Bez neho sa prípad neuzavrie.</span>
        <label style={{ minHeight: 52, padding: "0 16px", borderRadius: 14, border: `1.5px dashed ${doklad ? "var(--gBd)" : "var(--cardBd)"}`, background: "var(--field)", cursor: "pointer", fontSize: 14.5, fontWeight: 700, color: doklad ? "var(--gInk)" : "var(--ink2)", display: "flex", alignItems: "center" }}>
          {doklad ? `Doklad o úhrade priložený · ${doklad.nazov}` : "Priložiť doklad o úhrade (foto alebo PDF)"}
          <input type="file" accept="image/*,application/pdf,.pdf" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setDoklad({ nazov: f.name, src: await nacitajDoklad(f) }); setDkE(false); } catch (er) { toast((er as Error).message); } }} />
        </label>
        {dkE && <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>Najprv priložte doklad o úhrade.</span>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => { if (!doklad) { setDkE(true); return; } if (vratZvysok(entita, d.id, "mimo", doklad.src)) toast("Prípad je uzavretý. Firma dostane potvrdenie o vrátení."); }} style={tlZ}>Odoslať a uzavrieť</button>
          <button type="button" onClick={() => setVr(null)} style={tlO}>Späť</button>
        </div>
      </>}
    </section>);

  const st8 = st === "bezi" && d.strop && min / d.strop >= 0.8;
  const stat = d.zaznamy.length > 0 ? statistika(d) : null;
  const posl = [...d.zaznamy].sort((a, b) => b.kedy - a.kedy).slice(0, 3);
  const podm: [string, string][] = [["Pomer", `${pomerT(d.pomer)} · z 20 € bude ${eur(20 + 20 * d.pomer)}`], ...(d.stropDaru ? [["Najviac k jednému daru", eur(d.stropDaru)] as [string, string]] : []), ["Rozpočet", eur(d.strop)],
    ["Dokedy", d.doVycerpania ? "kým sa minie" : `${den(d.do)} alebo kým sa minie`], ["Komu", d.lenZamestnanci ? "len zamestnancom firmy" : "každému darcovi"], ["Zvyšok", d.zvysok === "firme" ? "vráti sa firme" : "ostáva zbierke"], ["Úhrada", uhradaT(d)]];
  const podakovat = () => {
    predvyplnOznam({ nadpis: `Ďakujeme firme ${d.firma}`, text: `<p>${d.firma} pridala ${eur(min)} k ${d.zaznamy.length} darom pre zbierku ${d.cielNazov}. Ďakujeme.</p>`, zbierka: d.ciel });
    onOznamy?.();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <section style={{ borderRadius: 22, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ flex: "none", width: 52, height: 52, borderRadius: "50%", background: d.firmaLogo ? `url('${d.firmaLogo}') center/cover no-repeat var(--card)` : "var(--card)", border: "1px solid var(--goldBd)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>{d.firmaLogo ? "" : ini(d.firma)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--gold)" }}>DOROVNÁVA</span>
            <b style={{ fontSize: 18, lineHeight: 1.25 }}>{d.firma}</b>
            <span style={{ fontSize: 13, color: "var(--ink2)" }}>{d.cielNazov} · {zbC}</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "var(--ink2)" }}>minuté <b style={{ fontSize: 20, color: "var(--ink)" }}>{eur(min)}</b></span>
          <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{caka ? `rozpočet ${eur(d.strop)}` : `ostáva ${eur(ost)} z ${eur(d.strop)}`}</span>
        </div>
        <span style={{ height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", background: "var(--gold)", transformOrigin: "left", transform: `scaleX(${d.strop ? Math.min(1, min / d.strop) : 0})`, transition: "transform .9s ease" }} /></span>
        <span style={{ fontSize: 13, color: "var(--ink2)" }}>{info(d, st)}</span>
      </section>

      {st === "cakaMimo" && potvrdenie(false)}
      {st === "cakaDeed" && potvrdenie(true)}
      {st === "potvrdene" && <section style={karta}>
        <b style={{ fontSize: 16 }}>Peniaze sú na účte</b>
        <span style={txt}>Spustite dorovnanie. Od tej chvíle {d.firma} pridáva k darom ľudí podľa zapečatených podmienok.</span>
        <div><button type="button" onClick={() => spustiDorovnanie(entita, d.id)} style={tlZ}>Spustiť dorovnanie</button></div>
      </section>}
      {st === "vratit" && vratenie}
      {st8 && <section style={karta}>
        <b style={{ fontSize: 16 }}>Rozpočet sa míňa</b>
        <span style={txt}>{d.firma} ostáva {eur(ost)} z {eur(d.strop)}. Firma môže rozpočet doliať, podmienky ostanú rovnaké.</span>
        {d.upozornenaFirma ? <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}>Firma dostala upozornenie v appke aj e-mailom.</span>
          : <button type="button" onClick={() => upozorniFirmu(entita, d.id)} style={{ ...tlZ, alignSelf: "flex-start" }}>Dať firme vedieť</button>}
      </section>}
      {(st === "minute" || st === "kon") && min > 0 && <section style={{ ...karta, border: "1px solid var(--cardBd)" }}>
        <b style={{ fontSize: 16 }}>Poďakujte firme</b>
        <span style={txt}>{d.firma} pridala {eur(min)} k {d.zaznamy.length} darom. Poďakovanie v Oznamoch uvidia vaši sledujúci aj ľudia v okolí.</span>
        <button type="button" onClick={podakovat} style={{ alignSelf: "flex-start", minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--goldBd)", background: "var(--goldBg)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--gold)", boxShadow: "none" }}>Poďakovať v Oznamoch ›</button>
      </section>}

      {stat && <section style={kartaS}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 15 }}>Ako chodili dary</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>7 dní pred a počas</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {([[eur(stat.ludia), `dary ľudí · ${d.zaznamy.length} darov`, "var(--ink)"], [eur(stat.firma), "pridala firma", "var(--gold)"], [eur(stat.ludia + stat.firma), "spolu pre zbierku", "var(--ink)"]] as const).map(([v, k, c]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", minWidth: 0 }}><b style={{ fontSize: 18, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</b><span style={{ fontSize: 12, lineHeight: 1.35, color: "var(--ink3)" }}>{k}</span></div>))}
        </div>
        <div role="img" aria-label="Dary po dňoch, 7 dní pred dorovnaním a počas neho" style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 96 }}>
          {stat.stl.map((b, i) => <span key={i} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}><span style={{ height: b.hf, background: "var(--gold)", borderRadius: "3px 3px 0 0" }} /><span style={{ height: b.hl, background: b.lc, borderRadius: b.rl }} /></span>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}><span>pred</span><span style={{ color: "var(--gold)", fontWeight: 700 }}>od {denK(d.od)} dorovnáva</span><span>{st === "bezi" ? "dnes" : denK(Math.min(d.ukoncene ?? d.do, d.do))}</span></div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--ink2)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green)" }} />dary ľudí</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--gold)" }} />pridala firma</span>
        </div>
        <span style={{ paddingTop: 8, borderTop: "1px solid var(--cardBd)", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>Ľudia dávali za deň priemerne <b style={{ color: "var(--ink)" }}>{stat.pred}</b> pred dorovnaním a <b style={{ color: "var(--ink)" }}>{stat.pocas}</b> počas neho (bez dielu firmy).</span>
      </section>}

      <section style={{ ...kartaS, gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          <b style={{ fontSize: 15 }}>Zapečatené podmienky</b>
        </div>
        {podm.map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid var(--cardBd)", fontSize: 14 }}><span style={{ color: "var(--ink3)" }}>{k}</span><b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{v}</b></div>)}
        <span style={{ paddingTop: 8, fontSize: 12.5, color: "var(--ink3)" }}>Nemôžete ich zmeniť vy, firma ani my.</span>
      </section>

      {posl.length > 0 && <section style={{ ...kartaS, gap: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, paddingBottom: 6 }}><b style={{ fontSize: 15 }}>Posledné dorovnania</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{d.zaznamy.length} dorovnaných darov</span></div>
        {posl.map((z) => <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid var(--cardBd)" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{z.darca ?? "Anonymný darca"} · {eur(z.dar)}</span><span style={{ fontSize: 12, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{relCas(z.kedy)} · {cisloObjektu("D", z.id)}</span></span>
          <b style={{ flex: "none", fontSize: 14, color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>+ {eur(z.dorovnane)}</b>
        </div>)}
      </section>}

      {st === "bezi" && (!uk
        ? <button type="button" onClick={() => setUk(true)} style={{ ...tlR, minHeight: 52 }}>Ukončiť zbierku a dorovnanie</button>
        : <section style={{ ...kartaS, border: "1.5px solid var(--cardBd)", padding: "18px 20px", gap: 10 }}>
          <b style={{ fontSize: 16 }}>Ukončiť {d.cielNazov}?</b>
          <span style={txt}>Skončí zbierka aj dorovnanie. Firme vrátite celý nevyčerpaný zvyšok {eur(ost)}. Firma platila za dorovnanie darov, nie dar pre vás.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => { ukonciDorovnanie(entita, d.id); const z = nacitajStav(d.ciel); if (z && z.stav === "aktivna") ulozStav(d.ciel, { ...z, stav: "ukoncena", ukoncena: new Date().toISOString(), dovodUkoncenia: "Ukončené s dorovnaním" }); setUk(false); }} style={{ ...tlZ, background: "var(--red)" }}>Ukončiť</button>
            <button type="button" onClick={() => setUk(false)} style={tlO}>Späť</button>
          </div>
        </section>)}
    </div>);
}

/** okno pre staré miesta (Môj DEED organizácie) — tá istá správa v hárku cez celú obrazovku */
export function SpravaDorovnaniaOkno({ entita, hlavnyUcet, toast, onClose }: { entita: string; hlavnyUcet: string; toast: (m: string) => void; onClose: () => void }) {
  const [sirka, setSirka] = useState(() => window.innerWidth);
  useEffect(() => { const f = () => setSirka(window.innerWidth); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const obal: ReactNode = (
    <div className="sprava-charity" style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--bg)", color: "var(--ink)", overflowY: "auto" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "max(16px, env(safe-area-inset-top)) 16px 120px", display: "flex", flexDirection: "column", gap: 14 }}>
        <SpravaDorovnania entita={entita} hlavnyUcet={hlavnyUcet} mobil={sirka < 1024} toast={toast} onZbierky={onClose} />
      </div>
    </div>);
  return createPortal(obal, document.body);
}
