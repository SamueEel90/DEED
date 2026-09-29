// OPRAVY 44–45 · Zamestnávateľ je v PROFILE (dlaždica + menu), nie v Nastaveniach. Karta 24 · 2i + PRAVIDLA-APPKY „Firma a zamestnanec".
// Viac firiem naraz (čipy) · Pracovný QR · oznámenia od firmy · akcie, školenia a smeny + Navrhnúť firemnú akciu ·
// moje odmeny · benefity · firemné hodiny (VTO) · skutky mimo firmy (Neukázať / Anonymne / S menom) · čo firma vidí.
import { DeedZnacka } from "@/components/DeedZnacka";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { usePouzivatel } from "@/lib/pouzivatel";
import { poziadaj, potvrd, pozvi, odmietni, odpoj, useVazbyOsoby, type Vazba } from "@/lib/zamestnanci";
import { dataFirmy, useMojaFirma, vybavOznam, navrhniAkciu, firmaPodlaKodu, MIN_ROZPAD, type FirmaVolba, type FirmaAkcia } from "@/lib/mojaFirma";
import { FIRMY_ADRESAR, type FirmaAdresar } from "@/features/rola/mock";
import { Harok } from "@/features/zbierka/Zdielat";
import { toast } from "@/components/toast";
import { SpatTlacidlo } from "@/components/cesta";
import { DeedQr } from "@/components/deedqr";
import { ObrazovkaSprava } from "./Bezpecnost24";
import { NastKarta, IK, oddelovac } from "./nastUi";
import { lbl, pozn, Ik, hladPole, btn, bezDiakritiky } from "./JazykUdaje";
import { tokenQr } from "./MojQr";
import "@/styles/platba.css";
import { useT, tTeraz } from "@/i18n";

export const IK_BUDOVA = "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4";
const IK_QR = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z";
const ZLATA = "#C9A24A";
const PERIODA = 15;
const coskoro = () => toast(tTeraz()("firma.coskoro"));
const datum = (ms: number) => tTeraz().datum(ms, true);
const firmaPodla = (nazov: string) => FIRMY_ADRESAR.find((f) => f.nazov === nazov);
const h = (x: number) => `${tTeraz().cislo(x)} h`;
const riadokBtn = { width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 68, padding: "12px 18px", border: "none", boxShadow: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--d-ink, var(--ink))" } as const;
const tx = (t: ReactNode, s?: ReactNode) => <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{t}</span>{s && <span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "var(--d-ink3, var(--ink3))", marginTop: 2 }}>{s}</span>}</span>;
const Sipka = () => <Ik d="M9 6l6 6-6 6" s={16} w={2.4} c="var(--d-ink3, var(--ink3))" />;
const Nadpis = ({ children }: { children: ReactNode }) => <h2 style={lbl}>{children}</h2>;

function Logo({ nazov, velke }: { nazov: string; velke?: boolean }) {
  const f: FirmaAdresar | undefined = firmaPodla(nazov);
  const s = velke ? 52 : 34;
  const [zle, setZle] = useState(false);
  return f?.logo && !zle
    ? <img src={f.logo} alt="" onError={() => setZle(true)} style={{ width: s, height: s, borderRadius: velke ? 12 : 10, objectFit: "cover", flex: "none", background: "#fff" }} />
    : <span aria-hidden="true" style={{ width: s, height: s, borderRadius: velke ? 12 : 10, background: velke ? "#fff" : "var(--sek-oBg)", color: "var(--sek-o)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: velke ? 16 : 12, fontWeight: 800, flex: "none" }}>{f?.iniciacky ?? nazov.slice(0, 2).toUpperCase()}</span>;
}
const FirmaKarta = ({ nazov, pod, children }: { nazov: string; pod: ReactNode; children?: ReactNode }) => (
  <div style={{ padding: "16px 18px", borderRadius: 20, background: "var(--goldBg)", border: "1px solid var(--sek-oBd)", boxShadow: "var(--d-hl, none)", display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Logo nazov={nazov} velke />
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 17, fontWeight: 800, color: "var(--d-ink, var(--ink))" }}>{nazov}</span><span style={{ display: "block", fontSize: 13.5, lineHeight: 1.45, color: "var(--d-ink2, var(--ink2))", marginTop: 2 }}>{pod}</span></span>
    </div>
    {children}
  </div>);
const STITOK_KLUC: Record<FirmaAkcia["stitok"] | "platené", string> = { prihlásený: "firma.stitok.prihlaseny", povinné: "firma.stitok.povinne", potvrdené: "firma.stitok.potvrdene", navrhnuté: "firma.stitok.navrhnute", platené: "firma.stitok.platene" };
const Stitok = ({ t }: { t: FirmaAkcia["stitok"] | "platené" }) => {
  const tr = useT();
  const f = t === "povinné" || t === "navrhnuté" ? "o" : t === "potvrdené" ? "b" : "g";
  return <span style={{ padding: "3px 9px", borderRadius: 8, background: `var(--sek-${f}Bg)`, color: `var(--sek-${f})`, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", flex: "none" }}>{tr(STITOK_KLUC[t] ?? t)}</span>;
};
// mesiac v dátach je slovenská skratka (OKT) — v inom jazyku sa ukáže podľa Intl
const MES_SK = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];
const Datum = ({ d, m: mSk }: { d: number; m: string }) => { const tr = useT(); const i = MES_SK.indexOf(mSk); const m = tr.jazyk === "sk" || i < 0 ? mSk : tr.mesiac(i, true).toUpperCase(); return <span style={{ width: 40, flex: "none", textAlign: "center", lineHeight: 1.1 }}><span style={{ display: "block", fontSize: 18, fontWeight: 800 }}>{d || "–"}</span><span style={{ display: "block", fontSize: 11, fontWeight: 800, color: "var(--d-ink3, var(--ink3))", letterSpacing: ".04em" }}>{m}</span></span>; };

// =====================================================================
export function Zamestnavatel({ onBack, desktop }: { onBack: () => void; desktop?: boolean }) {
  const t = useT();
  const ja = usePouzivatel();
  const osoba = ja.celeMeno;
  const vazby = useVazbyOsoby(osoba);
  const [vyber, setVyber] = useState<string | "nova" | null>(null);
  const akt: Vazba | undefined = vyber === "nova" ? undefined : vazby.find((v) => v.firma === vyber) ?? vazby[0];

  return (
    <div className="deed-platba" style={{ padding: "0 16px 30px", display: "flex", flexDirection: "column", gap: 16, color: "var(--d-ink, var(--ink))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56 }}>
        {!desktop && <SpatTlacidlo onClick={onBack} />}
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{t("firma.titul")}</h1>
      </div>
      {vazby.length > 0 && (
        <div role="tablist" aria-label={t("firma.mojeFirmy")} style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -16px", padding: "0 16px 2px", scrollbarWidth: "none" }}>
          {vazby.map((v) => { const on = akt?.firma === v.firma; return (
            <button key={v.firma} type="button" role="tab" aria-selected={on} onClick={() => setVyber(v.firma)}
              style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 14px 0 6px", borderRadius: 14, flex: "none", border: `1px solid ${on ? "var(--sek-oBd)" : "var(--d-cardBd, var(--cardBd))"}`, boxShadow: "none", background: on ? "var(--goldBg)" : "var(--d-card, var(--card))", color: "var(--d-ink, var(--ink))", fontSize: 14.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>
              <Logo nazov={v.firma} />{v.firma}{v.stav !== "potvrdeny" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--sek-o)" }} aria-label={t("firma.caka")} />}</button>); })}
          <button type="button" role="tab" aria-selected={vyber === "nova"} onClick={() => setVyber("nova")}
            style={{ minHeight: 44, padding: "0 14px", borderRadius: 14, flex: "none", border: `1px dashed ${vyber === "nova" ? "var(--sek-g)" : "var(--d-cardBd, var(--cardBd))"}`, boxShadow: "none", background: "transparent", color: "var(--sek-g)", fontSize: 14.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>{t("firma.dalsia")}</button>
        </div>)}
      {!akt && <Pripojit osoba={osoba} maFirmy={vazby.length > 0} onHotovo={(f) => setVyber(f)} />}
      {akt?.stav === "pozvany" && <Pozvanka v={akt} osoba={osoba} />}
      {akt?.stav === "ziadost" && <>
        <FirmaKarta nazov={akt.firma} pod={t("firma.ziadostPoslana")} />
        <button type="button" onClick={() => { odpoj(akt.firma, osoba); setVyber(null); toast(t("firma.ziadostZrusena")); }} style={btn(false)}>{t("firma.zrusitZiadost")}</button>
        {import.meta.env.DEV && <button type="button" onClick={() => potvrd(akt.firma, osoba)} style={{ ...btn(false), minHeight: 44, fontSize: 13, fontWeight: 700 }}>{t("firma.ukazkaPotvrdila")}</button>}
      </>}
      {akt?.stav === "potvrdeny" && <Prepojeny v={akt} osoba={osoba} onOdpojene={() => setVyber(null)} />}
    </div>
  );
}

// ---------------- nepripojený: pozvánka / nájdi firmu / kód / QR ----------------
function Pozvanka({ v, osoba }: { v: Vazba; osoba: string }) {
  const t = useT();
  return (<div>
    <Nadpis>{t("firma.pozvanka")}</Nadpis>
    <FirmaKarta nazov={v.firma} pod={t("firma.pozyva")}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button type="button" onClick={() => { odmietni(v.firma, osoba); toast(t("firma.odmietnuta")); }} style={btn(false)}>{t("firma.odmietnut")}</button>
        <button type="button" onClick={() => { potvrd(v.firma, osoba); toast(t("firma.prepojeneS", { firma: v.firma })); }} style={btn(true)}>{t("firma.prijat")}</button>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--d-ink3, var(--ink3))" }}>{t("firma.nepoznas")}</div>
    </FirmaKarta>
  </div>);
}

function Pripojit({ osoba, maFirmy, onHotovo }: { osoba: string; maFirmy: boolean; onHotovo: (firma: string) => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [kod, setKod] = useState("");
  const [skener, setSkener] = useState(false);
  const qq = bezDiakritiky(q.trim()), qCisla = q.replace(/\D/g, "");
  const vysledky = qq.length >= 2 ? FIRMY_ADRESAR.filter((f) => bezDiakritiky(f.nazov).includes(qq) || (qCisla.length >= 3 && (f.ico ?? "").replace(/\s/g, "").includes(qCisla))) : [];
  const kodOk = kod.replace(/-/g, "").length >= 6;
  const ziadaj = (firma: string) => { poziadaj(firma, osoba); onHotovo(firma); };
  const pripoj = (k: string) => {
    const f = firmaPodlaKodu(k, FIRMY_ADRESAR.map((x) => x.nazov));
    if (!f) { toast(t("firma.kodNepozname")); return; }
    setKod(""); ziadaj(f);
  };
  return (<>
    <div style={{ fontSize: 15, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))", padding: "0 6px" }}>{maFirmy ? t("firma.uvodDalsia") : t("firma.uvod")}</div>
    {!maFirmy && <div>
      <Nadpis>{t("firma.coZiskas")}</Nadpis>
      <NastKarta k="o" style={{ padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: "var(--sek-o)", display: "flex", marginTop: 1 }}><Ik d={IK.gift} /></span>
        <span style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>{t("firma.zalezi")}</span>
      </NastKarta>
    </div>}
    <div>
      <Nadpis>{t("firma.najdi")}</Nadpis>
      {hladPole(q, setQ, t("firma.najdiPh"))}
      {vysledky.length > 0 && <NastKarta k="b" style={{ marginTop: 10 }}>
        {vysledky.map((f, i) => (
          <div key={f.nazov} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 68, padding: "12px 18px", borderTop: i ? oddelovac : "none" }}>
            <Logo nazov={f.nazov} />
            {tx(f.nazov, t("firma.ico", { mesto: f.mesto, ico: f.ico ?? "" }))}
            <button type="button" onClick={() => ziadaj(f.nazov)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--sek-bBd)", boxShadow: "none", background: "var(--sek-bBg)", color: "var(--sek-b)", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", flex: "none" }}>{t("firma.poziadat")}</button>
          </div>))}
      </NastKarta>}
      {qq.length >= 2 && !vysledky.length && <div style={{ ...pozn, marginTop: 10 }}>{t("firma.nenasli.a")} <DeedZnacka />{t("firma.nenasli.b")}</div>}
    </div>
    <div aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 700, color: "var(--d-ink3, var(--ink3))" }}><span style={{ flex: 1, height: 1, background: "var(--d-sep, var(--cardBd))" }} />{t("firma.alebo")}<span style={{ flex: 1, height: 1, background: "var(--d-sep, var(--cardBd))" }} /></div>
    <div>
      <Nadpis>{t("firma.kod")}</Nadpis>
      <input value={kod} onChange={(e) => setKod(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12))} placeholder={t("firma.kodPh")} aria-label={t("firma.kodAria")} autoComplete="off"
        style={{ width: "100%", height: 52, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 17, fontWeight: 700, letterSpacing: ".06em", color: "var(--d-ink, var(--ink))", outline: "none", fontFamily: "inherit" }} />
      <div style={{ ...pozn, marginTop: 8 }}>{t("firma.kodPozn")}</div>
    </div>
    <button type="button" disabled={!kodOk} onClick={() => pripoj(kod)} style={btn(true, kodOk)}>{t("firma.pripojit")}</button>
    <button type="button" onClick={() => setSkener(true)} style={{ ...btn(false), display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Ik d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10" />{t("firma.naskenovat")}</button>
    {import.meta.env.DEV && <button type="button" onClick={() => { const f = maFirmy ? "Kaviareň Pod Hradom" : "Pekáreň Dobrota"; pozvi(f, osoba); onHotovo(f); }} style={{ ...btn(false), minHeight: 44, fontSize: 13, fontWeight: 700 }}>{t("firma.ukazkaPozvanka")}</button>}
    {skener && <SkenerFirmy onClose={() => setSkener(false)} onKod={(k) => { setSkener(false); setKod(k); pripoj(k); }} />}
  </>);
}

// ---------------- prepojený ----------------
const VIDI = ["firma.vidi.1", "firma.vidi.2", "firma.vidi.3", "firma.vidi.4", "firma.vidi.5"];
const NEVIDI = ["firma.nevidi.1", "firma.nevidi.2", "firma.nevidi.3", "firma.nevidi.4", "firma.nevidi.5"];

function Prepojeny({ v, osoba, onOdpojene }: { v: Vazba; osoba: string; onOdpojene: () => void }) {
  const t = useT();
  const n = useNastaveniaAppky();
  const st = useMojaFirma();
  const d = dataFirmy(v.firma);
  const [qr, setQr] = useState(false);
  const [hodiny, setHodiny] = useState(false);
  const [navrh, setNavrh] = useState(false);
  const [benefit, setBenefit] = useState<number | null>(null);
  const oznamy = d.oznamy.filter((o) => !st.vybavene.includes(o.id));
  const akcie = [...d.akcie, ...(st.navrhy[v.firma] ?? [])];
  const odpojit = () => { odpoj(v.firma, osoba); onOdpojene(); toast(t("firma.odpojene")); };

  return (<>
    <FirmaKarta nazov={v.firma} pod={t("firma.prepojeneOd", { datum: datum(v.potvrdene ?? v.kedy) })} />
    <button type="button" onClick={() => setQr(true)} style={{ ...riadokBtn, borderRadius: 20, border: "1px solid var(--sek-oBd)", background: "var(--d-card, var(--card))", boxShadow: "var(--d-hl, none)" }}>
      <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 12, border: `2.5px solid ${ZLATA}`, background: "#fff", color: "#1D211B", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK_QR} s={30} w={2} /></span>
      {tx(t("firma.pracovnyQr"), t("firma.pracovnyQrS"))}<Sipka />
    </button>

    {oznamy.length > 0 && <div>
      <Nadpis>{t("firma.oznamenia")}</Nadpis>
      <NastKarta k="o">
        {oznamy.map((o, i) => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "12px 18px", borderTop: i ? oddelovac : "none" }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", flex: "none", background: o.typ === "kontrola" ? "var(--sek-o)" : "var(--sek-g)" }} />
            {tx(o.t, o.s)}
            {o.typ === "kontrola" && <span style={{ display: "flex", gap: 6, flex: "none" }}>
              <button type="button" onClick={() => { vybavOznam(o.id); toast(t("firma.overene")); }} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "none", boxShadow: "none", background: "var(--gGrad)", color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>{t("firma.ano")}</button>
              <button type="button" onClick={odpojit} style={{ minHeight: 44, padding: "0 12px", borderRadius: 12, border: "1px solid var(--d-cardBd, var(--cardBd))", boxShadow: "none", background: "var(--btn)", color: "var(--d-ink, var(--ink))", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>{t("firma.uzNie")}</button>
            </span>}
          </div>))}
      </NastKarta>
    </div>}

    <div>
      <Nadpis>{t("firma.akcie")}</Nadpis>
      {akcie.length > 0 && <NastKarta k="b">
        {akcie.map((a, i) => (
          <div key={`${a.t}-${i}`} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, padding: "12px 18px 12px 12px", borderTop: i ? oddelovac : "none" }}>
            <Datum d={a.d} m={a.m} />{tx(a.t, a.s)}<Stitok t={a.stitok} />
          </div>))}
      </NastKarta>}
      <button type="button" onClick={() => setNavrh(true)} style={{ width: "100%", marginTop: 10, minHeight: 52, borderRadius: 16, border: "1.5px dashed var(--sek-gBd)", boxShadow: "none", background: "transparent", color: "var(--sek-g)", fontSize: 15.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>{t("firma.navrhnut")}</button>
      <div style={{ ...pozn, marginTop: 8 }}>{t("firma.navrhPozn")}</div>
    </div>

    {d.odmeny.length > 0 && <div>
      <Nadpis>{t("firma.odmeny")}</Nadpis>
      <NastKarta k="g">
        {d.odmeny.map((o, i) => (
          <div key={o.za} style={{ padding: "14px 18px", borderTop: i ? oddelovac : "none", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>{tx(o.za, `${o.kedy} · ${o.zdroj}`)}<b style={{ fontSize: 15, color: "var(--sek-g)", whiteSpace: "nowrap" }}>{o.hodnota}</b></div>
            {o.vdaka && <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--field)", fontSize: 13.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}>{o.vdaka}</div>}
          </div>))}
      </NastKarta>
    </div>}

    <div>
      <Nadpis>{t("firma.benefity")}</Nadpis>
      {d.benefity.length > 0 ? <NastKarta k="o">
        {d.benefity.map((b, i) => (
          <button key={b.t} type="button" onClick={() => setBenefit(i)} style={{ ...riadokBtn, borderTop: i ? oddelovac : "none" }}>
            <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 11, background: "var(--sek-oBg)", color: "var(--sek-o)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ik d={IK.gift} s={19} w={2} /></span>
            {tx(b.t, b.s)}<Sipka /></button>))}
      </NastKarta> : <div style={pozn}>{t("firma.benefityZiadne")}</div>}
      <div style={{ ...pozn, marginTop: 8 }}>{t("firma.benefityPozn")}</div>
    </div>

    {d.vto && <div>
      <Nadpis>{t("firma.vto")}</Nadpis>
      <NastKarta k="g">
        <div style={{ padding: "16px 18px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><b style={{ fontSize: 16 }}>{t("firma.plateneVolno")}</b><span style={{ fontSize: 14.5, color: "var(--d-ink2, var(--ink2))" }}>{t("firma.zostava")} <b style={{ color: "var(--d-ink, var(--ink))", fontSize: 16 }}>{h(d.vto.spolu - d.vto.vyuzite)}</b> {t("firma.zo", { h: h(d.vto.spolu) })}</span></div>
          <Pruh podiel={(d.vto.spolu - d.vto.vyuzite) / d.vto.spolu} />
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))", marginTop: 10 }}>{t("firma.vtoPopis")}</div>
        </div>
        <button type="button" onClick={() => setHodiny(true)} style={{ ...riadokBtn, borderTop: oddelovac }}>{tx(t("firma.mojeHodiny"), t("firma.mojeHodinyS"))}<Sipka /></button>
        <div style={{ padding: "0 18px 14px", fontSize: 12.5, lineHeight: 1.5, color: "var(--d-ink3, var(--ink3))" }}>{t("firma.vtoPozn")}</div>
      </NastKarta>
    </div>}

    <div>
      <Nadpis>{t("firma.mimo")}</Nadpis>
      <NastKarta k="b" style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <b style={{ fontSize: 16 }} id="predvolba-nadpis">{t("firma.predvolene")}</b>
        <VolbaFirma v={n.firmaPredvolba} set={(x) => zmenNastavenia({ firmaPredvolba: x })} labelId="predvolba-nadpis" />
        <div aria-live="polite" style={{ fontSize: 14, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}>{t(`firma.volbaVeta.${n.firmaPredvolba}`)}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--d-ink3, var(--ink3))" }}>{t("firma.mimoPozn")}</div>
      </NastKarta>
    </div>

    <div>
      <Nadpis>{t("firma.coVidi")}</Nadpis>
      <NastKarta k="b" style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        {VIDI.map((k) => <div key={k} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45, color: "var(--d-ink2, var(--ink2))" }}><span style={{ color: "var(--sek-g)", display: "flex", marginTop: 2 }}><Ik d={IK.check} s={16} w={2.6} /></span><span><span className="sr-only">{t("firma.vidiSr")}</span>{t(k, { n: MIN_ROZPAD })}</span></div>)}
        <div style={{ height: 1, background: "var(--d-sep, var(--cardBd))", margin: "4px 0" }} />
        {NEVIDI.map((k) => <div key={k} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.45, color: "var(--d-ink2, var(--ink2))" }}><span style={{ color: "var(--sek-r)", display: "flex", marginTop: 2 }}><Ik d="M6 6l12 12M18 6 6 18" s={16} w={2.6} /></span><span><span className="sr-only">{t("firma.nevidiSr")}</span>{t(k)}</span></div>)}
      </NastKarta>
    </div>
    <button type="button" onClick={odpojit} style={btn(false)}>{t("firma.odpojit")}</button>
    <div style={pozn}>{t("firma.odpojitPozn")}</div>

    {qr && <PracovnyQr firma={v.firma} onClose={() => setQr(false)} />}
    {hodiny && d.vto && <MojeFiremneHodiny firma={v.firma} onBack={() => setHodiny(false)} />}
    {navrh && <NavrhAkcie firma={v.firma} onClose={() => setNavrh(false)} />}
    {benefit !== null && d.benefity[benefit] && <Harok onClose={() => setBenefit(null)} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{d.benefity[benefit].t}</span>}>
      <div style={{ fontSize: 13.5, color: "var(--d-ink3, var(--ink3))" }}>{d.benefity[benefit].s}</div>
      <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--d-ink2, var(--ink2))" }}>{d.benefity[benefit].detail}</div>
    </Harok>}
  </>);
}

/** Neukázať / Anonymne / S menom — spoločný prvok (predvoľba tu, riadok Firma v náhľade skutku) */
export function VolbaFirma({ v, set, labelId }: { v: FirmaVolba; set: (x: FirmaVolba) => void; labelId?: string }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-labelledby={labelId} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--seg)" }}>
      {(["neukazat", "anonym", "meno"] as FirmaVolba[]).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={v === k} onClick={() => set(k)} className={v === k ? "seg-on" : undefined}
          style={{ minHeight: 44, padding: "4px 6px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", ...(v === k ? {} : { background: "transparent", color: "var(--d-ink3, var(--ink3))", boxShadow: "none" }) }}>{t(`firma.volba.${k}`)}</button>))}
    </div>);
}

const Pruh = ({ podiel }: { podiel: number }) => (
  <div aria-hidden="true" style={{ height: 8, borderRadius: 4, background: "var(--d-trackOff, var(--track))", overflow: "hidden", marginTop: 10 }}>
    <div style={{ height: "100%", background: "var(--sek-g)", transformOrigin: "left", transform: `scaleX(${Math.max(0, Math.min(1, podiel))})` }} /></div>);

// ---------------- Navrhnúť firemnú akciu ----------------
function NavrhAkcie({ firma, onClose }: { firma: string; onClose: () => void }) {
  const [t, setT] = useState("");
  const [kedy, setKedy] = useState("");
  const [pozn2, setPozn] = useState("");
  const tr = useT();
  const ok = t.trim().length >= 3 && !!kedy;
  const pole = { width: "100%", height: 52, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--d-ink, var(--ink))", outline: "none", fontFamily: "inherit" } as const;
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{tr("firma.navrhnut")}</span>}
      paticka={<button type="button" disabled={!ok} onClick={() => { navrhniAkciu(firma, { t: t.trim(), kedy }); toast(tr("firma.navrh.poslany")); onClose(); }} style={{ ...btn(true, ok), flex: 1 }}>{tr("firma.navrh.poslat")}</button>}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--d-ink2, var(--ink2))" }}>{tr("firma.navrh.co")}
        <input value={t} onChange={(e) => setT(e.target.value)} maxLength={60} placeholder={tr("firma.navrh.coPh")} style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--d-ink2, var(--ink2))" }}>{tr("firma.navrh.kedy")}
        <input type="date" value={kedy} onChange={(e) => setKedy(e.target.value)} style={pole} /></label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--d-ink2, var(--ink2))" }}>{tr("firma.navrh.preFirmu")}
        <textarea value={pozn2} onChange={(e) => setPozn(e.target.value)} rows={3} placeholder={tr("firma.navrh.preFirmuPh")} style={{ ...pole, height: "auto", padding: "12px 14px", resize: "vertical" }} /></label>
      <div style={pozn}>{tr("firma.navrh.pozn", { firma })}</div>
    </Harok>
  );
}

// ---------------- Pracovný QR (celá obrazovka, biele pozadie) ----------------
function PracovnyQr({ firma, onClose }: { firma: string; onClose: () => void }) {
  const tr = useT();
  const ja = usePouzivatel();
  const [sek, setSek] = useState(PERIODA);
  const [okno, setOkno] = useState(() => Math.floor(Date.now() / (PERIODA * 1000)));
  const [blik, setBlik] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = window.setInterval(() => setSek((s) => {
      if (s > 1) return s - 1;
      setBlik(true);
      window.setTimeout(() => { setBlik(false); setOkno(Math.floor(Date.now() / (PERIODA * 1000))); }, 250);
      return PERIODA;
    }), 1000);
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    let zamok: { release: () => Promise<void> } | null = null;
    nav.wakeLock?.request("screen").then((l) => { zamok = l; }).catch(() => { /* nepodporované */ });
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && [...document.querySelectorAll('[aria-modal="true"]')].pop() === ref.current) onClose(); };
    window.addEventListener("keydown", k);
    return () => { window.clearInterval(t); zamok?.release().catch(() => {}); window.removeEventListener("keydown", k); };
  }, [onClose]);
  // pracovný QR = user + firma (rezim „praca:<firma>"); osobný Môj QR sa s firmou nikdy nespája
  const data = tokenQr(ja.ucetId || ja.celeMeno, `praca-${bezDiakritiky(firma).replace(/[^a-z0-9]+/g, "-")}`, okno);
  const velkost = Math.min(window.innerWidth - 48, window.innerHeight - 260, 460);
  return createPortal(
    <div ref={ref} onClick={onClose} role="dialog" aria-modal="true" aria-label={tr("firma.qr.aria", { firma })}
      style={{ position: "fixed", inset: 0, zIndex: 210, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, cursor: "zoom-out", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1D211B", animation: "zbFsIn .25s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo nazov={firma} /><b style={{ fontSize: 18 }}>{firmaPodla(firma)?.nazov ?? firma}</b></div>
      <div style={{ opacity: blik ? 0.15 : 1, transition: "opacity .25s ease", lineHeight: 0 }}><DeedQr data={data} bezOdznaku farba={ZLATA} size={velkost} /></div>
      <b style={{ fontSize: 17 }}>{tr("firma.qr.pracovny", { meno: ja.celeMeno })}</b>
      <div style={{ width: velkost, maxWidth: "80vw", height: 5, borderRadius: 3, background: "#EDE6D3", overflow: "hidden" }}>
        <div style={{ height: "100%", background: ZLATA, transformOrigin: "left", transform: `scaleX(${sek / PERIODA})`, transition: "transform 1s linear" }} /></div>
      <span style={{ fontSize: 15, color: "#4A4C43" }}>{tr("firma.qr.novyKod")} <b style={{ color: "#1D211B", fontVariantNumeric: "tabular-nums" }}>{tr("firma.qr.sek", { n: sek })}</b> {tr("firma.qr.zavries")}</span>
    </div>, document.body);
}

// ---------------- Moje firemné hodiny (VTO) ----------------
function MojeFiremneHodiny({ firma, onBack }: { firma: string; onBack: () => void }) {
  const t = useT();
  const ja = usePouzivatel();
  const vto = dataFirmy(firma).vto!;
  const zost = vto.spolu - vto.vyuzite;
  const mesto = ja.mesto && ja.mesto !== "—" ? ja.mesto : "tvojom meste";
  const STAV_KLUC: Record<string, string> = { "čaká na schválenie": "firma.hodiny.stav.caka", "schválené firmou": "firma.hodiny.stav.schvalene", vyplatené: "firma.hodiny.stav.vyplatene" };
  const stavF = (s: string) => (s === "vyplatené" ? "g" : s === "schválené firmou" ? "g" : "o");
  return (
    <ObrazovkaSprava titul={t("firma.mojeHodiny")} onBack={onBack}>
      <div style={{ padding: "16px 18px", borderRadius: 20, background: "var(--sek-gBg)", border: "1px solid var(--sek-gBd)", boxShadow: "var(--d-hl, none)" }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--sek-g)" }}>{t("firma.hodiny.rok", { firma, rok: String(vto.rok) })}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}><b style={{ fontSize: 34, fontVariantNumeric: "tabular-nums" }}>{h(zost)}</b><span style={{ fontSize: 15, color: "var(--d-ink2, var(--ink2))" }}>{t("firma.hodiny.zostavaZo", { h: h(vto.spolu) })}</span></div>
        <Pruh podiel={zost / vto.spolu} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--d-ink2, var(--ink2))", marginTop: 8 }}><span>{t("firma.hodiny.vyuzite", { h: h(vto.vyuzite) })}</span><span>{t("firma.hodiny.obnovi", { datum: vto.obnovi })}</span></div>
      </div>
      <div>
        <Nadpis>{t("firma.hodiny.prihlasene")}</Nadpis>
        <NastKarta k="g">{vto.prihlasene.map((a, i) => (
          <div key={a.t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, padding: "12px 18px 12px 12px", borderTop: i ? oddelovac : "none" }}><Datum d={a.d} m={a.m} />{tx(a.t, a.s)}<Stitok t="platené" /></div>))}
        </NastKarta>
      </div>
      <div>
        <Nadpis>{t("firma.hodiny.historia")}</Nadpis>
        <NastKarta k="g">{vto.historia.map((x, i) => (
          <div key={x.t + x.s} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "12px 18px", borderTop: i ? oddelovac : "none" }}>
            {tx(x.t, x.s)}
            <span style={{ textAlign: "right", flex: "none" }}><b style={{ display: "block", fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{h(x.h)}</b><span style={{ fontSize: 12.5, fontWeight: 800, color: `var(--sek-${stavF(x.stav)})` }}>{t(STAV_KLUC[x.stav] ?? x.stav)}</span></span>
          </div>))}
        </NastKarta>
        <div style={{ ...pozn, marginTop: 8 }}>{t("firma.hodiny.presne")}</div>
      </div>
      <div>
        <Nadpis>{t("firma.hodiny.kam")}</Nadpis>
        <NastKarta k="g" style={{ padding: "14px 18px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{vto.oblasti.map((o) => <span key={o} style={{ padding: "6px 12px", borderRadius: 11, background: "var(--sek-gBg)", border: "1px solid var(--sek-gBd)", color: "var(--sek-g)", fontSize: 14, fontWeight: 800 }}>{o}</span>)}</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--d-ink2, var(--ink2))" }}>{t("firma.hodiny.overene")}</div>
          <button type="button" onClick={coskoro} style={btn(true)}>{mesto === "tvojom meste" ? t("firma.hodiny.najstOkolie") : t("firma.hodiny.najstV", { mesto: t.jazyk === "sk" && mesto === "Trenčín" ? "Trenčíne" : mesto })}</button>
        </NastKarta>
      </div>
      <div>
        <Nadpis>{t("firma.hodiny.sukromne")}</Nadpis>
        <NastKarta k="b" style={{ padding: "14px 18px", fontSize: 14, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>
          {t("firma.hodiny.sukromneS")} <b style={{ color: "var(--d-ink, var(--ink))" }}>{t("firma.hodiny.oznacene", { n: vto.sukromne })}</b>
        </NastKarta>
      </div>
      <button type="button" onClick={coskoro} style={{ ...btn(false), display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Ik d={IK.download} />{t("firma.hodiny.pdf")}</button>
    </ObrazovkaSprava>
  );
}

/** firemný QR: text „DEED-FIRMA:<KÓD>" alebo samotný kód */
function SkenerFirmy({ onClose, onKod }: { onClose: () => void; onKod: (k: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const naKod = useRef(onKod);
  useEffect(() => { naKod.current = onKod; });
  const [chyba, setChyba] = useState(false);
  const t = useT();
  useEffect(() => {
    let stop: (() => void) | undefined, zrusene = false, hotovo = false;
    import("@zxing/browser").then(({ BrowserQRCodeReader }) => {
      if (zrusene) return;
      new BrowserQRCodeReader().decodeFromVideoDevice(undefined, video.current ?? undefined, (r, _e, c) => {
        stop = () => c.stop();
        if (!r || hotovo) return;
        hotovo = true; c.stop();
        naKod.current(r.getText().replace(/^DEED-FIRMA:/i, "").trim().toUpperCase());
      }).catch(() => setChyba(true));
    }).catch(() => setChyba(true));
    return () => { zrusene = true; try { stop?.(); } catch { /* už zastavené */ } };
  }, []);
  return (
    <Harok onClose={onClose} hlavicka={<span style={{ flex: 1, fontSize: 20, fontWeight: 800 }}>{t("firma.sken.titul")}</span>}>
      {chyba
        ? <div style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--d-ink2, var(--ink2))" }}>{t("firma.sken.chyba")}</div>
        : <><video ref={video} muted playsInline style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 18, background: "#000" }} />
          <div style={{ fontSize: 13.5, color: "var(--d-ink3, var(--ink3))", textAlign: "center" }}>{t("firma.sken.namier")}</div></>}
    </Harok>
  );
}
