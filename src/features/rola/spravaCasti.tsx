// KARTA 48 · spoločné diely Správy zbierky a Správy centrálnej a sektorov (1 : 1 podľa prototypov).
// Hlavička „Ukladá sa samo", pás dorovnania, záložky, Stav, Ako budú ľudia darovať, Zapečatené, QR na plagát, Štatistiky.
import { useState, type CSSProperties, type ReactNode } from "react";
import { DeedQr } from "@/components/deedqr";
import { kopiruj } from "@/lib/zdielanie";
import { SADY, SADY_EURC } from "@/lib/novaZbierka";
import { stiahniPlagat } from "@/lib/plagatPdf";
import { menoBezMena, useSektorDarcu } from "@/lib/darcovia";
import type { ProfilStranky } from "@/lib/profilStranky";
import { RAMY } from "./titulka";

export const kartaK: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12, minWidth: 0 };
export const nadpisK: CSSProperties = { fontSize: 16, fontWeight: 800, color: "var(--ink)" };
export const textK: CSSProperties = { fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" };
export const drobneK: CSSProperties = { fontSize: 12.5, color: "var(--ink3)" };
export const obrysK: CSSProperties = { minHeight: 48, padding: "0 18px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink2)", alignSelf: "flex-start", boxShadow: "none" };
export const zelenyK: CSSProperties = { minHeight: 48, padding: "0 20px", borderRadius: 14, border: "none", background: "linear-gradient(90deg,#4B7A35,#8DB866)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#fff", boxShadow: "none" };
const fmt = (n: number) => n.toLocaleString("sk-SK", { maximumFractionDigits: 2 });

export function SpatZbierky({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ alignSelf: "flex-start", minHeight: 44, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", whiteSpace: "nowrap", boxShadow: "none" }}>‹ Zbierky</button>;
}
/** „Ukladá sa samo" — zmeny sa uložia 600 ms po poslednej úprave */
export function UkladaSa({ dovetok }: { dovetok?: string }) {
  return <span role="status" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4B7A35" }} />Ukladá sa samo{dovetok ? ` · ${dovetok}` : ""}</span>;
}

/** pás „Pekáreň Dobrota dorovnáva 1 : 1 ›" */
export function DorovnaniePas({ ini, firma, pomer, pod, onClick }: { ini: string; firma: string; pomer: string; pod: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: "100%", borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: onClick ? "pointer" : "default", textAlign: "left", color: "var(--ink)", fontFamily: "inherit", boxShadow: "none" }}>
      <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, background: "var(--field)", border: "1px solid var(--goldBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>{ini}</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14.5 }}>{firma} dorovnáva {pomer}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{pod}</span></span>
      <span aria-hidden="true" style={{ fontSize: 14, fontWeight: 800, color: "var(--gold)" }}>›</span>
    </button>);
}

// KARTA 55 · E: záložka Príbeh (index 4) sa ukazuje hneď za Nastavením; indexy ostatných ostávajú
export const TABY = ["Nastavenie", "Doklady", "Štatistiky", "Ukončenie", "Príbeh"] as const;
const PORADIE_TABOV = [0, 4, 1, 2, 3];
export function Taby({ akt, onTab, odsadenie = 12, skryte = [], pribeh = false }: { akt: number; onTab: (i: number) => void; odsadenie?: number; /** KARTA 50: farnosť bez záložky Doklady */ skryte?: number[]; /** KARTA 55: záložka Príbeh */ pribeh?: boolean }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--cardBd)", overflowX: "auto" }}>
      {PORADIE_TABOV.map((i) => { const t = TABY[i]; if (skryte.includes(i) || (i === 4 && !pribeh)) return null; const on = akt === i; return (
        <button key={t} type="button" role="tab" aria-selected={on} onClick={() => onTab(i)} style={{ flex: "none", height: 48, padding: `0 ${odsadenie}px`, border: "none", borderBottom: `3px solid ${on ? "var(--green)" : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>); })}
    </div>);
}

/** Stav zbierky / Tento mesiac: tri čísla + posledné dary */
export function CislaKarta({ nadpis, cisla, dary, children }: { nadpis: string; cisla: [string, string][]; dary: [string, string, string][]; children?: ReactNode }) {
  const sektor = useSektorDarcu();
  return (
    <section style={kartaK}>
      <span style={nadpisK}>{nadpis}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
        {cisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><b style={{ fontSize: 24, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={drobneK}>{t}</span></span>)}
      </div>
      {dary.length === 0 && <span style={drobneK}>Zatiaľ žiadne dary. Prvé sa ukážu tu, bez mena ako {menoBezMena(sektor)}.</span>}
      {dary.length > 0 && <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingBottom: 4 }}>POSLEDNÉ DARY</span>
        {dary.map(([m, k, s], i) => <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "8px 0", borderTop: "1px solid var(--cardBd)", fontSize: 14 }}><span style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{m}</span><span style={{ fontSize: 12.5, color: "var(--ink3)", textAlign: "right" }}>{k}</span><b style={{ color: "var(--gInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{s}</b></div>)}
      </div>}
      {children}
    </section>);
}

function Vyber<K extends string | number | boolean>({ moznosti, value, onChange, stlpce, vyska }: { moznosti: { k: K; t: string; s?: string }[]; value: K; onChange: (k: K) => void; stlpce: number; vyska: number }) {
  return (
    <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: `repeat(${stlpce},minmax(0,1fr))`, gap: 8 }}>
      {moznosti.map((o) => { const on = value === o.k; return (
        <button key={String(o.k)} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.k)} style={{ minHeight: vyska, borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "var(--ink)", fontFamily: "inherit", boxShadow: "none", padding: "0 6px" }}>
          <b style={{ fontSize: o.s ? 14.5 : 15 }}>{o.t}</b>{o.s && <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{o.s}</span>}
        </button>); })}
    </div>);
}
/** Ako budú ľudia darovať: rýchle sumy € · dary v EURC áno/nie · rýchle sumy EURC (rovnaký blok v každej správe) */
export function AkoDarovat({ sada, eurc, sadaE, onZmena, pravidelna }: { sada: number; eurc: boolean; sadaE: number; onZmena: (p: { sada?: number; eurc?: boolean; sadaE?: number }) => void; pravidelna?: boolean }) {
  return (
    <section style={kartaK}>
      <span style={nadpisK}>Ako budú ľudia darovať</span>
      <span style={{ fontSize: 14.5, fontWeight: 800 }}>Rýchle sumy pre darcov</span>
      <Vyber stlpce={3} vyska={62} value={sada} onChange={(k) => onZmena({ sada: k })} moznosti={SADY.map(([t, a], i) => ({ k: i, t, s: `${a.map(fmt).join(" · ")} €` }))} />
      <span style={drobneK}>Vlastnú sumu môže darca zadať vždy. Sumy pod 3 € idú len cez SEPA.{pravidelna ? " Tie isté sumy sa ponúknu aj pri pravidelnej podpore." : ""}</span>
      <span style={{ fontSize: 14.5, fontWeight: 800, paddingTop: 4 }}>Dary v kryptomene EURC</span>
      <Vyber stlpce={2} vyska={50} value={eurc} onChange={(k) => onZmena({ eurc: k })} moznosti={[{ k: true, t: "Áno" }, { k: false, t: "Nie" }]} />
      <span style={drobneK}>EURC je digitálne euro 1 : 1. V Nastaveniach stránky máte zvolené „podľa zbierky“.{pravidelna ? "" : " Sumy môžete meniť aj počas zbierky."}</span>
      {eurc && <>
        <span style={{ fontSize: 14.5, fontWeight: 800, paddingTop: 4 }}>Rýchle sumy v EURC</span>
        <Vyber stlpce={3} vyska={62} value={sadaE} onChange={(k) => onZmena({ sadaE: k })} moznosti={SADY_EURC.map(([t, a], i) => ({ k: i, t, s: `${a.map(fmt).join(" · ")} EURC` }))} />
      </>}
    </section>);
}

export const ZAMOK = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
/** Zapečatené pri spustení: cieľ, účel, účet, lehota — nedá sa zmeniť */
export function Zapecatene({ riadky }: { riadky: [string, string][] }) {
  return (
    <section style={kartaK}>
      <span style={nadpisK}>Zapečatené pri spustení</span>
      <span style={textK}>Darca vie, že dáva presne na to, čo videl. Nemôžete to zmeniť vy ani my.</span>
      {riadky.map(([k, v]) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--cardBd)" }}>
        <span style={{ color: "var(--ink3)", display: "flex" }}>{ZAMOK}</span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
        <b style={{ fontSize: 14, textAlign: "right" }}>{v}</b>
      </div>)}
    </section>);
}

/** QR na plagát a pokladničku + verejné číslo zbierky (ťuk = skopírovať) */
export function QrKarta({ nazov, slug, cislo, organizacia, toast, odkaz: odkazP, nadpis = "QR na plagát a pokladničku", popis = "Na profile je QR v module pri Zdieľať · QR. Tu je verzia na tlač.", stav }: {
  nazov: string; slug: string; cislo?: string; organizacia?: string; toast: (m: string) => void;
  /** OPRAVY 162 · QR farnosti: vlastný odkaz (jeden QR z registrácie), nadpis, veta a stav („Teraz vedie na …") */
  odkaz?: string; nadpis?: string; popis?: string; stav?: { t: string; zelena: boolean };
}) {
  const odkaz = odkazP ?? `https://deed.sk/z/${slug}`;
  const [pdf, setPdf] = useState(false);
  const [skop, setSkop] = useState(false);
  // KARTA 56D §5: tlačidlá ukážu výsledok na sebe
  const [hotovo, setHotovo] = useState<"pdf" | "odkaz" | null>(null);
  const ukaz = (k: "pdf" | "odkaz") => { setHotovo(k); window.setTimeout(() => setHotovo((x) => (x === k ? null : x)), 2200); };
  return (
    <section style={kartaK}>
      <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={nadpisK}>{nadpis}</span>
        {stav && <span style={{ height: 26, padding: "0 10px", borderRadius: 13, background: stav.zelena ? "var(--gSoft)" : "var(--field)", color: stav.zelena ? "var(--gInk)" : "var(--ink2)", border: "1px solid var(--cardBd)", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center" }}>{stav.t}</span>}</span>
      <span style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink3)", marginTop: -6 }}>{popis}</span>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: "none", width: 96, height: 96, borderRadius: 14, background: "#fff", padding: 6, boxSizing: "border-box", display: "flex" }}><DeedQr data={odkaz} size={84} variant="svetly" /></span>
        <span style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 8 }}>
          {cislo && <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button type="button" onClick={async () => { const ok = await kopiruj(cislo.replace(/^[A-Z]-/, "").replace(/\s/g, "")); if (ok) { setSkop(true); window.setTimeout(() => setSkop(false), 1600); } else toast("Číslo sa nepodarilo skopírovať"); }} aria-label={`Číslo zbierky ${cislo}, skopírovať`}
              style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: skop ? "var(--gInk)" : "var(--ink)", fontVariantNumeric: "tabular-nums", boxShadow: "none" }}>{skop ? "Skopírované ✓" : cislo}</button>
            <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Číslo zbierky = variabilný symbol · ťuk skopíruje</span>
          </span>}
          <span style={{ fontSize: 13.5, color: "var(--ink3)", overflowWrap: "anywhere" }}>{odkaz.replace(/^https:\/\//, "").replace(/\?qr=1$/, "")}</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" aria-busy={pdf} onClick={async () => { if (pdf) return; setPdf(true); try { await stiahniPlagat({ nazov, odkaz, cislo, organizacia }); ukaz("pdf"); } catch (e) { toast((e as Error).message); } finally { setPdf(false); } }} style={{ ...obrysK, ...(hotovo === "pdf" ? { borderColor: "var(--green)", color: "var(--gInk)" } : {}) }}>{hotovo === "pdf" ? "Stiahnuté ✓" : "Stiahnuť plagát (PDF)"}</button>
            <button type="button" onClick={async () => { const ok = await kopiruj(odkaz); if (ok) ukaz("odkaz"); else toast("Odkaz sa nepodarilo skopírovať"); }} style={{ ...obrysK, ...(hotovo === "odkaz" ? { borderColor: "var(--green)", color: "var(--gInk)" } : {}) }}>{hotovo === "odkaz" ? "Odkaz skopírovaný ✓" : "Kopírovať odkaz"}</button>
          </span>
        </span>
      </div>
    </section>);
}

// ---------------- Štatistiky (zatiaľ podľa programu: Zadarmo základ, vyššie rozmazané, P4 všetko) ----------------
export interface DataStatistik {
  obdobie: string;
  cez: [string, number, string][];
  split: [string, string, string, string][];
  darcovia: [string, string][];
  dary: [string, string, string][];
  dni: number[];
  od: string;
}
const FARBY_CEZ = ["var(--green)", "#C9A24A", "#3D6B8E", "var(--ink3)", "var(--ink3)"];
/** zatiaľ: P4 odkryje všetko; nižšie programy vidia len Darcovia (čísla) a Dary po dňoch */
export const STAT_VSETKO_OD = 4;
function Rozmazane({ on, children }: { on: boolean; children: ReactNode }) {
  if (!on) return <>{children}</>;
  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden="true" style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>{children}</div>
      <span style={{ position: "absolute", left: "50%", top: 40, transform: "translateX(-50%)", height: 32, padding: "0 14px", borderRadius: 16, background: "var(--bg)", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 800, color: "var(--ink2)", whiteSpace: "nowrap" }}>Celé štatistiky sú v programe P4</span>
    </div>);
}
export function Statistiky({ d, tier, mobil, toast }: { d: DataStatistik; tier: number; mobil: boolean; toast: (m: string) => void }) {
  const zamknute = tier < STAT_VSETKO_OD;
  const sektor = useSektorDarcu();
  const sum = d.cez.reduce((a, c) => a + c[1], 0) || 1, max = d.cez[0]?.[1] || 1, maxD = Math.max(1, ...d.dni);
  const cez = (
    <section style={kartaK}>
      <span style={nadpisK}>Cez koho prišli peniaze · {d.obdobie}</span>
      {d.cez.map(([n, v, s], i) => <div key={n} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 14 }}><b style={{ flex: 1, minWidth: 0 }}>{n}</b><span style={{ fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap" }}>{Math.round(v / sum * 100)} %</span><b style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmt(v)} €</b></span>
        <span style={{ display: "block", height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", background: FARBY_CEZ[i] ?? "var(--ink3)", transformOrigin: "0 50%", transform: `scaleX(${v / max})` }} /></span>
        <span style={drobneK}>{s}</span>
      </div>)}
    </section>);
  const split = (
    <section style={kartaK}>
      <span style={nadpisK}>Split · kto posiela časť ďalej</span>
      <span style={textK}>Kto nastavil, že časť jeho príjmu alebo skutku pôjde sem.</span>
      {d.split.map(([i, n, s, v]) => <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: "1px solid var(--cardBd)" }}>
        <span style={{ flex: "none", width: 40, height: 40, borderRadius: 12, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--ink2)" }}>{i}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 14.5 }}>{n}</b><span style={drobneK}>{s}</span></span>
        <b style={{ fontSize: 15, color: "var(--gInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b>
      </div>)}
    </section>);
  const darcovia = (
    <section style={kartaK}>
      <span style={nadpisK}>Darcovia</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
        {d.darcovia.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{v}</b><span style={drobneK}>{t}</span></span>)}
      </div>
      <Rozmazane on={zamknute}>
        <span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 0" }}>POSLEDNÉ DARY · ODKIAĽ</span>
        {d.dary.map(([m, k, s], i) => <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "7px 0", borderTop: "1px solid var(--cardBd)", fontSize: 14 }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b>{m}</b><span style={drobneK}>{k}</span></span>
          <b style={{ color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{s}</b>
        </div>)}
        {!d.dary.length && <span style={{ display: "block", fontSize: 13, color: "var(--ink3)", padding: "7px 0", borderTop: "1px solid var(--cardBd)" }}>Zatiaľ žiadne dary. Prvé sa ukážu tu, bez mena ako {menoBezMena(sektor)}.</span>}
        <span style={{ display: "block", fontSize: 12, color: "var(--ink3)", paddingTop: 6 }}>Mená len tých, ktorí ich dovolili ukázať. Ostatní sú {menoBezMena(sektor)}.</span>
      </Rozmazane>
    </section>);
  const dni = (
    <section style={kartaK}>
      <span style={nadpisK}>Dary po dňoch{d.dni.length >= 28 ? " · 30 dní" : ""}</span>
      <div role="img" aria-label="Počet darov po dňoch" style={{ height: 90, display: "flex", alignItems: "flex-end", gap: 3 }}>
        {d.dni.map((v, i) => <span key={i} style={{ flex: 1, height: 90, display: "flex", alignItems: "flex-end" }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 3, background: "var(--green)", opacity: .85, transformOrigin: "50% 100%", transform: `scaleY(${v / maxD})` }} /></span>)}
      </div>
      <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink3)" }}><span>{d.od}</span><span>dnes</span></span>
    </section>);
  const csv = <button type="button" aria-disabled={zamknute} onClick={() => { if (zamknute) return; toast("Prehľad v CSV pripraví server"); }} style={{ ...obrysK, opacity: zamknute ? 0.5 : 1 }}>Stiahnuť prehľad (CSV)</button>;
  const vlavo = <><Rozmazane on={zamknute}>{cez}</Rozmazane><Rozmazane on={zamknute}>{split}</Rozmazane></>;
  const vpravo = <>{darcovia}{dni}{csv}</>;
  if (mobil) return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{vpravo}{vlavo}</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{vlavo}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>{vpravo}</div>
    </div>);
}

const NAST_D = "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1";
/** OPRAVY 157: Nastavenia · aplikácie a účtu — v každej Správe hneď pod Verejný profil (nad Prehľadom) */
export function TlacidloNastavenia({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={on ? undefined : "sc-hov"} style={{ flex: "none", width: "100%", minHeight: 56, padding: "6px 14px", border: `1px solid ${on ? "var(--cuBd)" : "var(--cardBd)"}`, borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none", background: on ? "var(--accSoft)" : "var(--card)", color: on ? "var(--acc)" : "var(--ink)" }}>
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={NAST_D} /></svg>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: on ? 800 : 600 }}>Nastavenia</span><span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink3)" }}>aplikácie a účtu</span></span>
    </button>);
}

/** logo stránky v karte vľavo (charita, farnosť) — bez loga iniciály */
export function LogoKarty({ profil, inicialy, size }: { profil: ProfilStranky | null; inicialy: string; size: number }) {
  const logo = profil?.logo;
  const bg = !logo ? "var(--white)" : profil!.logoPozadie === "tmave" ? "#15171c" : profil!.logoPozadie === "priehladne" ? "transparent" : "#fff";
  // KARTA 56D §4: „Nemám logo" = iniciály s rámikom (rámik ako pri titulnej fotke)
  const znak = !logo && profil?.bezLoga ? (profil.inicialy ?? "").toUpperCase() : "";
  const ram = znak && profil?.ramLoga && profil.ramLoga !== "bez" ? RAMY.find((r) => r.k === profil.ramLoga)?.g : undefined;
  return (
    <span style={{ width: size, height: size, borderRadius: profil?.tvar === "kruh" ? "50%" : Math.round(size / 4), overflow: "hidden", background: ram ? `linear-gradient(#fff,#fff) padding-box, ${ram} border-box` : bg, border: ram ? "2px solid transparent" : "1px solid var(--cardBd)", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size / 3.1), fontWeight: 800, color: znak ? "#14110B" : "var(--gInk)", flex: "none" }}>
      {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : znak || inicialy}
    </span>);
}
