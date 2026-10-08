// ============================================================
// KARTA 56F · OPRAVY 165 — Správa farnosti → Omše a kalendár (prototyp „Sprava farnosti - prvy prichod", PC).
// Týždeň · Mesiac · Rozvrh omší, úprava dňa vpravo, Čo uvidia ľudia, Vytlačiť na nástenku, Pripnúť týždeň do Prehľadu.
// Kalendár začína prázdny. Dáta: lib/kalendarFarnosti (účet farnosti).
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { OnlineOmseKarta } from "./PrihovorKarta";
import { pridajPrispevok, vlastnePrispevky, type VieraFeedItem } from "@/features/viera/mock";
import {
  useKalendar, zmenKalendar, zmenKostol, zmazVlastnu, novyKostol, omseDna, polozkyDna, maZmenu, druhPolozky, jeObrad, casKodu,
  dniTyzdna, rozsahTyzdna, iso, dvt, pekny, minuty, CAS_OK, normCas, dokonciCas, casNeexistuje, posunTyzdna, kostolKal, DRUHY, SKUPINY_OMSI, VEREJNE_VOLBY, VLASTNE_PREFIX,
  DNI_K, DNI_D, MES_G, MES_N, nazovOmse, type KalKostol, type KalendarFarnosti, type PolozkaDna, type Skupina, type Verej,
} from "@/lib/kalendarFarnosti";

export interface KostolF { nazov: string; adresa?: string }
type Tab = 0 | 1 | 2;

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const tlZ: CSSProperties = { minHeight: 48, padding: "0 20px", border: "none", borderRadius: 14, background: "#4B7A35", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none" };
const sipka: CSSProperties = { width: 44, height: 44, flex: "none", borderRadius: "50%", border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink)", boxShadow: "none" };
const spatTl: CSSProperties = { alignSelf: "center", marginTop: 2, minHeight: 32, padding: "0 12px", borderRadius: 16, border: "1px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" };
const xTl: CSSProperties = { width: 40, height: 40, flex: "none", borderRadius: "50%", border: "none", background: "var(--cRedBg)", color: "#fff", cursor: "pointer", fontSize: 19, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, boxShadow: "none" };
const ZLATA = "#C9A24A";
const CHYBA_CASU = "Takýto čas neexistuje. Píšte hodiny:minúty, napríklad 6:15 alebo 18:30. Po odídení z poľa sa vráti predošlý čas.";
const GRUPY: Skupina[] = ["Bohoslužby", "Modlitby", "Obrady", "Vaše vlastné"];
const novyId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const vSvetle = () => !document.documentElement.classList.contains("dark");

/** čas: ťuk označí, prepíše sa; opravuje sa sám (56H §2); zlý alebo prázdny sa po odídení vráti na predošlý */
function CasPole({ value, onCommit, onChyba, velky, label = "Čas, ťuknite a prepíšte", farba }: { value: string; onCommit: (v: string) => void; onChyba?: (zly: boolean) => void; velky?: boolean; label?: string; farba?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const zly = draft != null && casNeexistuje(draft);
  useEffect(() => { onChyba?.(zly); }, [zly]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input value={draft ?? value} inputMode="numeric" maxLength={5} aria-label={label} aria-invalid={zly || undefined}
      onFocus={(e) => { const el = e.target; setTimeout(() => { try { el.select(); } catch { /* */ } }, 0); }}
      onChange={(e) => setDraft(normCas(e.target.value))}
      onBlur={() => { const d = draft == null ? null : dokonciCas(draft); if (d != null && CAS_OK(d)) onCommit(pekny(d)); setDraft(null); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      style={{ width: 84, height: 44, flex: "none", padding: "0 6px", boxSizing: "border-box", textAlign: "center", borderRadius: 12, border: `${zly ? 2 : 1}px solid ${zly ? "var(--cRed)" : "var(--cardBd)"}`, background: velky ? "var(--card)" : "var(--field)", fontFamily: "inherit", fontSize: velky ? 17 : 15, fontWeight: velky ? 800 : 700, color: farba ?? "var(--ink)", fontVariantNumeric: "tabular-nums", outline: "none" }} />);
}

/** položky dňa zoradené podľa času (omše z rozvrhu + pridané) */
interface Riadok { t: string; s: string; zrusena?: boolean; zmena?: boolean; obrad?: boolean; extra?: boolean; meno?: string; kat?: Verej; typ?: string }
function riadkyDna(k: KalKostol, d: Date): Riadok[] {
  return [
    ...omseDna(k, d).map((o): Riadok => ({ t: o.zrusena ? o.vzor : o.t, s: o.zrusena ? "zrušená" : o.posunuta ? "posunutá" : "", zrusena: o.zrusena, zmena: o.zrusena || o.posunuta })),
    ...polozkyDna(k, d).map((p): Riadok => { const x = druhPolozky(p.typ); return { t: p.t, s: x.kratko, meno: p.m.trim(), obrad: x.skupina === "Obrady", extra: true, kat: x.kat, typ: p.typ }; }),
  ].sort((a, b) => minuty(a.t) - minuty(b.t));
}


/** KARTA 56G §3: oznam ZMENA OMŠE — v Oznamoch do konca toho dňa.
 *  Notifikácia sledujúcim: PLACEBO — karta 56G (sledovanie stránky ešte nemá tabuľku). */
function poslatZmenuOmse(strankaId: string, meno: string, veta: string, d: Date) {
  const teraz = Date.now(), koniec = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  pridajPrispevok(strankaId, { id: `naboz-zmena-${teraz}`, comp: "data", typ: "skutok", modul: "charity", kat: "Komunita", ntyp: "oznam", skore: 6, typSituacie: "normal", dni: 0, podpora: 0,
    farnostId: strankaId, cirkev: "", komunita: meno, overena: true, nazov: veta, tag: "Zmena omše", popis: "poslané sledujúcim · zmizne po tomto dni",
    vytvorene: teraz, platnostDni: Math.max(0.01, (koniec - teraz) / 864e5) });
}

/** KARTA 56F/56G · Týždeň: 7 riadkov, šípky ‹ ›, ťuk na deň — v Omšiach aj pripnutý v Prehľade (jeden vzhľad) */
export function TyzdenKarta({ k, off, setOff, den, onDen, mobil, kostolV = "", pozn = true }: { k: KalKostol; off: number; setOff: (o: number) => void; den: string | null; onDen: (key: string) => void; mobil: boolean; kostolV?: string; pozn?: boolean }) {
  const dnes = iso(new Date());
  const tyzT = `${off === 0 ? "Tento týždeň" : off === 1 ? "Budúci týždeň" : off === -1 ? "Minulý týždeň" : "Týždeň"} · ${rozsahTyzdna(off)}`;
  const chip = (r: Riadok, i: number) => (
    <span key={i} style={{ height: 36, padding: "0 12px", borderRadius: 10, background: r.obrad ? "rgba(201,162,74,.14)" : "var(--field)", border: `1px solid ${r.obrad ? ZLATA : r.extra ? "var(--green)" : r.zmena ? "var(--cRed)" : "var(--cardBd)"}`, display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 800, color: r.zrusena ? "var(--cRed)" : "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
      <span style={{ textDecoration: r.zrusena ? "line-through" : "none" }}>{r.t}</span>
      {(r.s || r.meno) && <span style={{ fontWeight: 600, fontSize: 13 }}>{[r.s, r.meno].filter(Boolean).join(" · ")}</span>}
    </span>);
  return (
    <section style={{ ...karta, padding: mobil ? "12px 12px" : "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={() => setOff(off - 1)} aria-label="Predchádzajúci týždeň" style={sipka}>‹</button>
        <span style={{ flex: 1, minWidth: 0, textAlign: "center", display: "flex", flexDirection: "column" }}>
          <b style={{ fontSize: mobil ? 16 : 18 }}>{tyzT}</b>
          {off !== 0 && <button type="button" onClick={() => setOff(0)} style={spatTl}>Späť na tento týždeň</button>}
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{mobil ? "Ťuknite na deň · pridáte omšu, pohreb, krst…" : "Ťuknite na deň · vpravo pridáte omšu, pohreb, krst…"}{kostolV}</span>
        </span>
        <button type="button" onClick={() => setOff(off + 1)} aria-label="Ďalší týždeň" style={sipka}>›</button>
      </div>
      {dniTyzdna(off).map((d) => {
        const key = iso(d), sel = den === key, jeDnes = key === dnes, r = riadkyDna(k, d);
        return (
          <button key={key} type="button" onClick={() => onDen(key)} aria-pressed={sel} style={{ minHeight: 64, padding: "10px 14px", borderRadius: 16, border: sel ? "2px solid var(--green)" : jeDnes ? "2px solid var(--ink)" : "1px solid var(--cardBd)", background: sel ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <span style={{ width: mobil ? 64 : 84, flex: "none", display: "flex", flexDirection: "column" }}>
              <b style={{ fontSize: 17, color: "var(--ink)" }}>{d.getDate()}. {d.getMonth() + 1}.</b>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: jeDnes ? "var(--gInk)" : "var(--ink3)" }}>{DNI_K[dvt(d)]}{jeDnes ? " · dnes" : ""}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>{r.map(chip)}</span>
            <span aria-hidden="true" style={{ flex: "none", fontSize: 20, color: "var(--ink3)" }}>›</span>
          </button>);
      })}
      {pozn && <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Farár, ktorý plánuje po týždňoch: prejde 7 riadkov a hotovo. Celý mesiac je v záložke Mesiac.</span>}
    </section>);
}

export function OmseKalendar({ strankaId, meno, kostoly, mobil, tel = false, toast, start }: { strankaId: string; meno: string; kostoly: KostolF[]; mobil: boolean;
  /** KARTA 57 B.3: telefón = len Týždeň (bez Mesiac/Rozvrh, Pripnúť, plagátu a Kostolov — tie sú v dlaždici Filiálky); ťuk na deň posunie na jeho detail */
  tel?: boolean; toast: (m: string) => void;
  /** KARTA 56G: otvoriť týždeň s úpravou dňa (ťuk na deň v Prehľade) alebo len tento týždeň (Zmena omše z + Pridať) */
  start?: { den?: string } }) {
  const kal = useKalendar(strankaId);
  const [tab, setTab] = useState<Tab>(0);
  const [kI, setKI] = useState(0);
  const kKey = String(kI);
  const k: KalKostol = kal.kostoly[kKey] ?? novyKostol();
  const viac = kostoly.length > 1;
  const kostolV = viac ? ` · ${kostoly[kI]?.nazov ?? ""}` : "";
  const zmenK = (f: (x: KalKostol) => KalKostol) => zmenKostol(strankaId, kKey, f);
  const [tyzOff, setTyzOff] = useState(() => (start?.den ? posunTyzdna(start.den) : 0));
  const [mesOff, setMesOff] = useState(0);
  const [den, setDen] = useState<string | null>(start?.den ?? null);
  const [panel, setPanel] = useState<"ver" | "tl" | null>(null);
  const [hlaska, setHlaska] = useState<{ k: string; t: string } | null>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const ukaz = (kk: string, t: string, ms = 2400) => { setHlaska({ k: kk, t }); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setHlaska(null), ms); };
  const dnes = iso(new Date());

  // ---------- Týždeň (ten istý komponent aj v Prehľade, KARTA 56G §1) ----------
  const denRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (tel && start?.den) window.setTimeout(() => denRef.current?.scrollIntoView({ block: "start" }), 120); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const naDenTel = (key: string) => { setDen(key); window.setTimeout(() => denRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); };
  const tyzden = <TyzdenKarta k={k} off={tyzOff} setOff={(o) => { setTyzOff(o); setDen(null); }} den={den} onDen={tel ? naDenTel : setDen} mobil={mobil} kostolV={kostolV} pozn={!tel} />;

  // ---------- Mesiac ----------
  const m1 = (() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth() + mesOff, 1); })();
  const nDni = new Date(m1.getFullYear(), m1.getMonth() + 1, 0).getDate();
  const mesiac = (
    <section style={{ ...karta, padding: mobil ? "12px 10px" : "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={() => { setMesOff((o) => o - 1); setDen(null); }} aria-label="Predchádzajúci mesiac" style={sipka}>‹</button>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <b style={{ fontSize: 18 }}>{MES_N[m1.getMonth()]} {m1.getFullYear()}{kostolV}</b>
          {mesOff !== 0 && <button type="button" onClick={() => { setMesOff(0); setDen(null); }} style={spatTl}>Späť na tento mesiac</button>}
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{mobil ? "Ťuknite na deň · pridáte omšu, pohreb, krst…" : "Ťuknite na deň · vpravo pridáte omšu, pohreb, krst…"}</span>
        </span>
        <button type="button" onClick={() => { setMesOff((o) => o + 1); setDen(null); }} aria-label="Ďalší mesiac" style={sipka}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: mobil ? 4 : 6 }}>
        {DNI_K.map((d) => <span key={d} style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{d}</span>)}
        {Array.from({ length: dvt(m1) }, (_, i) => <span key={`p${i}`} />)}
        {Array.from({ length: nDni }, (_, i) => {
          const d = new Date(m1.getFullYear(), m1.getMonth(), i + 1), key = iso(d), sel = den === key, jeDnes = key === dnes;
          const om = omseDna(k, d), px = polozkyDna(k, d);
          const zel = [...om.filter((o) => !o.zrusena).map((o) => ({ t: o.t, s: "" })), ...px.filter((p) => !jeObrad(p.typ)).map((p) => ({ t: p.t, s: p.typ === "omsa" ? "" : druhPolozky(p.typ).kratko }))]
            .sort((a, b) => minuty(a.t) - minuty(b.t)).map((x) => (x.s ? `${x.t} ${x.s}` : x.t)).join("\n");
          const zlt = px.filter((p) => jeObrad(p.typ)).sort((a, b) => minuty(a.t) - minuty(b.t)).map((p) => `${p.t} ${druhPolozky(p.typ).kratko}${p.m.trim() ? `\n${p.m.trim()}` : ""}`).join("\n");
          const zm = maZmenu(k, d);
          return (
            <button key={key} type="button" onClick={() => setDen(key)} aria-pressed={sel} aria-label={`${d.getDate()}. ${MES_G[d.getMonth()]}`} style={{ minHeight: mobil ? 64 : 78, minWidth: 0, padding: mobil ? "4px 4px" : "6px 7px", borderRadius: 12, border: sel ? "2px solid var(--green)" : jeDnes ? "2px solid var(--ink)" : "1px solid var(--cardBd)", background: sel ? "var(--gSoft)" : "var(--field)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, textAlign: "left", fontFamily: "inherit", boxShadow: "none", overflow: "hidden" }}>
              <b style={{ fontSize: 13.5, color: jeDnes ? "var(--ink)" : "var(--ink2)" }}>{i + 1}</b>
              <span style={{ fontSize: mobil ? 10.5 : 12, fontWeight: 700, lineHeight: 1.35, color: zm ? "var(--cRed)" : "var(--gInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "pre-line" }}>{zel || (om.length ? "zrušené" : "")}</span>
              {zlt && <span style={{ fontSize: mobil ? 10.5 : 11.5, fontWeight: 800, lineHeight: 1.3, color: ZLATA, whiteSpace: "pre-line" }}>{zlt}</span>}
            </button>);
        })}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--ink3)" }}>
        <span>zelený čas = omša podľa vzoru, modlitba</span><span style={{ color: "var(--cRed)" }}>červený = zmena len v ten deň</span>
        <span style={{ color: ZLATA }}>zlatý = pohreb, sobáš, krst, udalosť</span><span>ťuk na deň = upraviť deň</span>
      </div>
    </section>);

  // ---------- Rozvrh omší ----------
  const [zle, setZle] = useState<Record<string, boolean>>({});
  const [vzDen, setVzDen] = useState(0);
  const [kopT, setKopT] = useState<string | null>(null);
  const casyRiadky = SKUPINY_OMSI.map(([g, t]) => {
    const chyba = [0, 1, 2].some((j) => zle[`c${g}${j}`]);
    return (
      <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 56, borderTop: "1px solid var(--cardBd)", paddingTop: 6, paddingBottom: chyba ? 6 : 0 }}>
        <b style={{ width: mobil ? "100%" : 130, fontSize: 14.5 }}>{t}</b>
        {[0, 1, 2].map((j) => <CasPole key={j} value={k.casy[g]?.[j] ?? ""} label={`${t}, ${j + 1}. čas · ťuknite a prepíšte`}
          onChyba={(z) => setZle((o) => (o[`c${g}${j}`] === z ? o : { ...o, [`c${g}${j}`]: z }))}
          onCommit={(v) => zmenK((x) => ({ ...x, casy: x.casy.map((r, gi) => (gi === g ? r.map((c, ji) => (ji === j ? v : c)) : r)) }))} />)}
        {chyba && <span role="alert" style={{ flexBasis: "100%", paddingLeft: mobil ? 0 : 138, fontSize: 12.5, fontWeight: 700, color: "var(--cRed)" }}>{CHYBA_CASU}</span>}
      </div>);
  });
  const casyDna = (wd: number) => (k.vzor[wd] ?? []).map((kod) => casKodu(k, kod)).filter((t) => t !== "—").sort((a, b) => minuty(a) - minuty(b));
  const tog = (kod: number) => zmenK((x) => { const a = x.vzor[vzDen] ?? []; return { ...x, vzor: { ...x.vzor, [vzDen]: a.includes(kod) ? a.filter((y) => y !== kod) : [...a, kod] } }; });
  const kop = (ciele: number[], kto: string) => { zmenK((x) => { const n = { ...x.vzor }; ciele.forEach((w) => { n[w] = [...(x.vzor[vzDen] ?? [])]; }); return { ...x, vzor: n }; }); setKopT(kto); window.setTimeout(() => setKopT(null), 1800); };
  const casVzoru = vSvetle() ? "#A34A2A" : "#E08A7A";
  const rozvrh = (
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <b style={{ fontSize: 15 }}>1 · Časy omší{kostolV}</b>
      {!k.casyOk ? <>
        <span style={{ fontSize: 13, color: "var(--ink3)", marginTop: -6 }}>Tri časy pre každú omšu. Ťuknite a prepíšte, napríklad na 6:15. V týždennom vzore potom pri každom dni ťuknete, ktoré časy platia.</span>
        {casyRiadky}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 6 }}>
          <button type="button" onClick={() => zmenK((x) => ({ ...x, casyOk: true }))} style={tlZ}>Uložiť časy</button>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>Potom pri každom dni vyberiete, ktoré časy platia.</span>
        </div>
      </> : <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)" }}>
        <span style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 14.5, color: "var(--gInk)" }}>Časy uložené ✓</b>
          <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>{SKUPINY_OMSI.map(([g, , kr]) => `${kr.charAt(0).toUpperCase()}${kr.slice(1)} ${k.casy[g].join(" · ")}`).join("   |   ")}</span>
        </span>
        <button type="button" onClick={() => zmenK((x) => ({ ...x, casyOk: false }))} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>Zmeniť časy</button>
      </div>}
      <b style={{ fontSize: 15, paddingTop: 10 }}>2 · Týždenný vzor (opakuje sa)</b>
      {!k.casyOk ? <span style={{ padding: "12px 14px", borderRadius: 14, border: "1.5px dashed var(--cardBd)", fontSize: 14.5, color: "var(--ink3)" }}>Najprv vyššie uložte časy. Potom tu vyberiete dni.</span> : <>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>1. Ťuknite na deň · 2. ťuknite časy · 3. prípadne skopírujte. Pod každým dňom hneď vidíte jeho omše.</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 6 }}>
          {DNI_K.map((x, wd) => { const on = wd === vzDen, cs = casyDna(wd); return (
            <button key={x} type="button" onClick={() => setVzDen(wd)} aria-pressed={on} style={{ minHeight: 58, minWidth: 0, padding: "8px 2px", borderRadius: 14, border: `2px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, boxShadow: "none" }}>
              <b style={{ fontSize: 16, color: on || wd === 6 ? "var(--gInk)" : "var(--ink)" }}>{x}</b>
              <span style={{ fontSize: 11.5, lineHeight: 1.35, fontWeight: 800, color: cs.length ? casVzoru : "var(--ink3)", whiteSpace: "pre-line", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{cs.length ? cs.join("\n") : "bez omše"}</span>
            </button>); })}
        </div>
        <div style={{ borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--field)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ fontSize: 16 }}>{DNI_D[vzDen]} · ťuknite časy, ktoré platia</b>
          {SKUPINY_OMSI.map(([g, , kr]) => (
            <div key={g} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{kr.toLocaleUpperCase("sk-SK")}</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[0, 1, 2].map((j) => { const kod = g * 10 + j, on = (k.vzor[vzDen] ?? []).includes(kod); return (
                  <button key={j} type="button" onClick={() => tog(kod)} aria-pressed={on} style={{ minHeight: 48, minWidth: 72, padding: "0 12px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "#4B7A35" : "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: on ? 800 : 600, color: on ? "#fff" : "var(--ink)", fontVariantNumeric: "tabular-nums", boxShadow: "none" }}>{on ? "✓ " : ""}{casKodu(k, kod)}</button>); })}
              </div>
            </div>))}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 6, borderTop: "1px solid var(--cardBd)" }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ROVNAKO AJ V</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button type="button" onClick={() => kop([0, 1, 2, 3, 4].filter((w) => w !== vzDen), "vs")} style={{ minHeight: 44, padding: "0 14px", borderRadius: 14, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" }}>{kopT === "vs" ? "Skopírované ✓" : "Všedné dni (Po – Pi)"}</button>
              {DNI_K.map((x, wd) => wd === vzDen ? null : (
                <button key={x} type="button" onClick={() => kop([wd], String(wd))} style={{ minHeight: 44, minWidth: 48, padding: "0 10px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>{kopT === String(wd) ? `${x} ✓` : x}</button>))}
            </div>
          </div>
        </div>
        <button type="button" onClick={() => ukaz("vzor", "ok", 6000)} style={{ ...tlZ, width: "100%", height: 52, background: hlaska?.k === "vzor" ? "#3F6E2A" : "#4B7A35", fontSize: 16 }}>{hlaska?.k === "vzor" ? "Uložené ✓ · omše sú v kalendári" : "Uložiť a vygenerovať omše"}</button>
        {hlaska?.k === "vzor" && <button type="button" onClick={() => { setTab(0); setTyzOff(0); setDen(null); setHlaska(null); }} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>Pozrieť omše v kalendári na tento týždeň ›</button>}
      </>}
      <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Zbierka na najbližšiu omšu sa otvára sama na celý týždeň podľa nedeľných omší (jeden účet farnosti).</span>
    </section>);
  const celyTyzden = tab === 2 && k.casyOk && den == null && (
    <section style={{ ...karta, border: "2px solid var(--green)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
      <b style={{ fontSize: 16, paddingBottom: 6 }}>Celý týždeň</b>
      {DNI_K.map((x, wd) => { const c = casyDna(wd); return (
        <div key={x} style={{ display: "flex", gap: 12, padding: "7px 0", borderTop: "1px solid var(--cardBd)", fontSize: 15 }}>
          <b style={{ flex: "none", width: 32, color: wd === 6 ? "var(--gInk)" : "var(--ink)" }}>{x}</b>
          <span style={{ flex: 1, minWidth: 0, fontWeight: 700, color: c.length ? casVzoru : "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{c.length ? c.join(" · ") : "bez omše"}</span>
        </div>); })}
      <span style={{ fontSize: 12.5, color: "var(--ink3)", paddingTop: 8 }}>Mení sa hneď, ako ťuknete na čas.</span>
    </section>);

  // ---------- Úprava dňa ----------
  const [pdV, setPdV] = useState("");
  const [vlIn, setVlIn] = useState("");
  const [vlOk, setVlOk] = useState(false);
  const [zlyDen, setZlyDen] = useState<Record<string, boolean>>({});
  const dD = den ? new Date(Number(den.slice(0, 4)), Number(den.slice(5, 7)) - 1, Number(den.slice(8, 10))) : null;
  const pridajPolozku = (typ: string) => { if (!den) return; const x = druhPolozky(typ); zmenK((y) => ({ ...y, extra: { ...y.extra, [den]: [...(y.extra[den] ?? []), { id: novyId(), typ, t: x.cas, m: "" }] } })); };
  const poslatZmenu = (veta: string, d: Date) => { poslatZmenuOmse(strankaId, meno, veta, d); toast("Poslané · oznam je aj v Oznamoch"); };
  const zmenPolozku = (id: string, p: Partial<PolozkaDna>) => { if (!den) return; zmenK((y) => ({ ...y, extra: { ...y.extra, [den]: (y.extra[den] ?? []).map((q) => (q.id === id ? { ...q, ...p } : q)) } })); };
  const denPanel = den && dD && (
    <section aria-label="Úprava dňa" style={{ ...karta, border: "2px solid var(--green)", padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b style={{ flex: 1, fontSize: 16 }}>{DNI_K[dvt(dD)]} {dD.getDate()}. {MES_G[dD.getMonth()]} · {kostoly[kI]?.nazov ?? "Váš kostol"}</b>
        <button type="button" onClick={() => setDen(null)} aria-label="Zavrieť" style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink2)", boxShadow: "none" }}>×</button>
      </div>
      {omseDna(k, dD).map((o) => { const ak = `${den}|${o.kod}`, odp = k.odpovede?.[ak], zmena = o.zrusena || o.posunuta;
        const bezOdp = (y: KalKostol) => { const n = { ...(y.odpovede ?? {}) }; delete n[ak]; return n; };
        const vetaZmeny = `${DNI_K[dvt(dD)]} ${dD.getDate()}. ${dD.getMonth() + 1}. · ${o.zrusena ? `omša o ${o.vzor} nebude.` : `omša bude o ${o.t} namiesto ${o.vzor}.`}`;
        return (
        <div key={o.kod} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ padding: "8px 10px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--field)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {o.zrusena
              ? <button type="button" onClick={() => zmenK((y) => ({ ...y, odpovede: bezOdp(y), zrus: { ...y.zrus, [den]: (y.zrus[den] ?? []).filter((q) => q !== o.kod) } }))} style={{ height: 40, flex: "none", padding: "0 12px", borderRadius: 12, border: "1.5px solid var(--gBd)", background: "transparent", color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, boxShadow: "none" }}>Obnoviť</button>
              : <button type="button" onClick={() => zmenK((y) => ({ ...y, odpovede: bezOdp(y), zrus: { ...y.zrus, [den]: [...(y.zrus[den] ?? []), o.kod] } }))} aria-label="Zrušiť túto omšu len v tento deň" title="Zrušiť túto omšu len v tento deň" style={xTl}>×</button>}
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1, opacity: o.zrusena ? 0.55 : 1 }}>
              <span style={{ fontSize: 14.5, fontWeight: 800 }}>Omša · {nazovOmse(o.kod)}</span>
              <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{o.zrusena ? "zrušená len v tento deň" : o.posunuta ? `posunutá z ${o.vzor} len v tento deň` : "podľa vzoru"}</span>
            </span>
            <CasPole velky value={o.t} farba={o.zrusena || o.posunuta ? "var(--cRed)" : undefined} onChyba={(z) => setZlyDen((x) => (x[`o${o.kod}`] === z ? x : { ...x, [`o${o.kod}`]: z }))}
              onCommit={(v) => { if (v === o.t) return; zmenK((y) => ({ ...y, odpovede: bezOdp(y), posun: { ...y.posun, [den]: { ...(y.posun[den] ?? {}), [o.kod]: v } } })); }} />
            {zlyDen[`o${o.kod}`] && <span role="alert" style={{ flexBasis: "100%", fontSize: 12.5, fontWeight: 700, color: "var(--cRed)" }}>{CHYBA_CASU}</span>}
          </div>
          {/* KARTA 56G §3: pri zmene omše otázka hneď pod ňou — nič sa nepošle samo */}
          {zmena && !odp && <div role="group" aria-label="Poslať oznam veriacim?" style={{ padding: "12px 14px", borderRadius: 14, border: `1.5px solid ${ZLATA}`, background: "var(--goldBg)", display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ fontSize: 15 }}>Poslať oznam veriacim?</b>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{vetaZmeny}</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink2)" }}>Príde tým, čo farnosť sledujú, a ukáže sa v Oznamoch. Po tomto dni sám zmizne.</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => { poslatZmenu(vetaZmeny, dD); zmenK((y) => ({ ...y, odpovede: { ...(y.odpovede ?? {}), [ak]: "ano" } })); }} style={{ ...tlZ, minHeight: 44, padding: "0 16px", fontSize: 14.5, borderRadius: 12 }}>Áno, poslať</button>
              <button type="button" onClick={() => zmenK((y) => ({ ...y, odpovede: { ...(y.odpovede ?? {}), [ak]: "nie" } }))} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Nie, neposielať</button>
            </div>
          </div>}
          {zmena && odp && <span role="status" style={{ fontSize: 13, fontWeight: 800, color: odp === "ano" ? "var(--gInk)" : "var(--ink3)", paddingLeft: 4 }}>{odp === "ano" ? "Poslané ✓ · veriaci dostali oznam, je aj v Oznamoch" : "Zmenené len v kalendári · oznam sa neposlal"}</span>}
        </div>); })}
      {polozkyDna(k, dD).map((p) => { const x = druhPolozky(p.typ), ob = x.skupina === "Obrady"; return (
        <div key={p.id} style={{ padding: "8px 10px", borderRadius: 14, border: `1px solid ${ob ? ZLATA : "var(--cardBd)"}`, background: "var(--field)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => zmenK((y) => ({ ...y, extra: { ...y.extra, [den]: (y.extra[den] ?? []).filter((q) => q.id !== p.id) } }))} aria-label={`Zmazať ${x.nazov}`} title={`Zmazať ${x.nazov}`} style={xTl}>×</button>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: ob ? ZLATA : "var(--gInk)" }}>{x.nazov}</span>
            <CasPole velky value={p.t} onChyba={(z) => setZlyDen((q) => (q[p.id] === z ? q : { ...q, [p.id]: z }))} onCommit={(v) => zmenPolozku(p.id, { t: v })} />
          </div>
          {zlyDen[p.id] && <span role="alert" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--cRed)" }}>{CHYBA_CASU}</span>}
          <input value={p.m} onChange={(e) => zmenPolozku(p.id, { m: e.target.value.slice(0, 80) })} placeholder={x.ph} aria-label="Meno"
            style={{ width: "100%", boxSizing: "border-box", height: 46, padding: "0 12px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)", fontFamily: "inherit", fontSize: 15.5, fontWeight: 700, outline: "none" }} />
          <span style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{ob ? "Meno uvidia ľudia v kalendári farnosti." : "len v tento deň"}</span>
        </div>); })}
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingTop: 4 }}>PRIDAŤ DO TOHTO DŇA</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={pdV} onChange={(e) => setPdV(e.target.value)} aria-label="Čo pridať" style={{ flex: 1, minWidth: 0, height: 48, padding: "0 12px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
          <option value="">Vyberte, čo pridať…</option>
          {GRUPY.map((g) => { const o = g === "Vaše vlastné" ? kal.vlastne.map((n) => ({ k: VLASTNE_PREFIX + n, nazov: n })) : DRUHY.filter((x) => x.skupina === g); return o.length ? (
            <optgroup key={g} label={g}>{o.map((x) => <option key={x.k} value={x.k}>{x.nazov}</option>)}</optgroup>) : null; })}
          <option value="nove">+ Napísať vlastné…</option>
        </select>
        {pdV && pdV !== "nove" && <button type="button" onClick={() => { pridajPolozku(pdV); setPdV(""); }} style={{ ...tlZ, flex: "none", height: 48, minHeight: 48, padding: "0 18px", fontSize: 15, borderRadius: 12, whiteSpace: "nowrap" }}>Pridať</button>}
      </div>
      {pdV === "nove" && <div style={{ display: "flex", gap: 8 }}>
        <input value={vlIn} onChange={(e) => setVlIn(e.target.value.slice(0, 40))} placeholder="napr. Mládežnícka svätá omša" aria-label="Vlastná položka"
          style={{ flex: 1, minWidth: 0, height: 46, padding: "0 12px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none" }} />
        {vlIn.trim() && <button type="button" onClick={() => {
          const n = vlIn.trim(); zmenKalendar(strankaId, (s) => (s.vlastne.includes(n) ? s : { ...s, vlastne: [...s.vlastne, n] }));
          pridajPolozku(VLASTNE_PREFIX + n); setVlIn(""); setPdV(""); setVlOk(true); window.setTimeout(() => setVlOk(false), 2500);
        }} style={{ ...tlZ, flex: "none", height: 46, minHeight: 46, padding: "0 14px", fontSize: 14.5, borderRadius: 12, whiteSpace: "nowrap" }}>Pridať a zapamätať</button>}
      </div>}
      {vlOk && <span role="status" style={{ fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>Pridané a zapamätané ✓ · nabudúce ho nájdete v ponuke</span>}
      {kal.vlastne.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800 }}>Pomýlili ste sa? Ťuknite na červený krížik a položka zmizne z ponuky.</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {kal.vlastne.map((n) => (
            <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 4px 0 12px", borderRadius: 20, border: "1px solid var(--cardBd)", background: "var(--card)", fontSize: 13.5, fontWeight: 700 }}>{n}
              <button type="button" onClick={() => { zmazVlastnu(strankaId, n); if (pdV === VLASTNE_PREFIX + n) setPdV(""); }} aria-label={`Vymazať zo zoznamu: ${n}`} style={{ ...xTl, width: 32, height: 32, fontSize: 15 }}>×</button>
            </span>))}
        </div>
      </div>}
      <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Červený krížik zruší omšu len v tento deň, vzor ostáva. Čas ťuknite a prepíšte. Pohreb, sobáš a krst sa ukážu v kalendári farnosti podľa toho, čo zapnete v „Čo uvidia ľudia na stránke“.</span>
    </section>);

  // ---------- Kostoly ----------
  const kostolyKarta = (
    <section style={{ ...karta, padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 15, fontWeight: 800, paddingBottom: 4 }}>Kostoly farnosti</span>
      {kostoly.map((x, i) => { const on = i === kI; return (
        <button key={x.nazov + i} type="button" onClick={() => { setKI(i); setDen(null); }} aria-pressed={on} style={{ padding: "12px 14px", margin: "0 -8px", borderRadius: 14, border: `2px solid ${on ? "var(--green)" : "transparent"}`, background: on ? "var(--gSoft)" : "transparent", cursor: viac ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 2, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><b style={{ fontSize: 14.5, color: "var(--ink)" }}>{x.nazov}</b>
            {on && viac && <span style={{ height: 22, padding: "0 8px", borderRadius: 7, background: "#4B7A35", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", display: "flex", alignItems: "center" }}>UPRAVUJETE</span>}</span>
          <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{x.adresa || "adresa z registrácie"}</span>
        </button>); })}
      {/* PLACEBO — karta 56F: pridanie filiálky ešte nemá formulár */}
      <button type="button" onClick={() => toast("Pripravujeme")} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>+ Pridať kostol</button>
    </section>);

  // ---------- Čo uvidia ľudia · Plagát · Pripnúť ----------
  const VJ = kal.verejne;
  const verPanel = panel === "ver" && (
    <section style={{ ...karta, borderRadius: 18, border: "2px solid var(--green)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ flex: 1, minWidth: 200, fontSize: 17 }}>Čo uvidia ľudia na stránke farnosti</b>
        {hlaska?.k === "ver" && <span role="status" style={{ fontSize: 13.5, fontWeight: 800, color: "var(--gInk)" }}>Uložené ✓</span>}
        <button type="button" onClick={() => setPanel(null)} style={{ ...tlZ, minHeight: 44, padding: "0 16px", fontSize: 14.5, borderRadius: 12 }}>Hotovo</button>
      </div>
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Zaškrtnuté sa ukáže ľuďom na stránke aj na vytlačenom plagáte. Ostatné vidíte len vy.</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 6 }}>
        {VEREJNE_VOLBY.map(([kk, t]) => { const on = !!VJ[kk]; return (
          <button key={kk} type="button" role="checkbox" aria-checked={on} onClick={() => { zmenKalendar(strankaId, (s) => ({ ...s, verejne: { ...s.verejne, [kk]: !on } })); ukaz("ver", "ok", 2200); }}
            style={{ minHeight: 50, padding: "0 12px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", boxShadow: "none" }}>
            <span style={{ width: 26, height: 26, flex: "none", borderRadius: 8, border: `2px solid ${on ? "var(--green)" : "#A8A396"}`, background: on ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>}
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{t}</span>
          </button>); })}
      </div>
    </section>);
  const plagatDni = plagatTyzdna(k, VJ, tyzOff);
  const plagatOzn = panel === "tl" ? oznamyNaPlagat(strankaId) : [];
  const plagatRef = useRef<HTMLDivElement>(null);
  const tlac = () => {
    const el = plagatRef.current; if (!el) return;
    const f = document.createElement("iframe"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"; document.body.appendChild(f);
    const d = f.contentDocument; if (!d) return;
    d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Bohoslužby</title><style>@page{size:A4;margin:12mm}body{margin:0;font-family:"Plus Jakarta Sans",-apple-system,"Segoe UI",sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${el.outerHTML}</body></html>`); d.close();
    window.setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); window.setTimeout(() => f.remove(), 1500); }, 500);
    ukaz("tl", "ok", 4000);
  };
  const tlTit = rozsahTyzdna(tyzOff, true);
  const tlPanel = panel === "tl" && (
    <section style={{ ...karta, borderRadius: 18, border: "2px solid var(--green)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b style={{ flex: 1, minWidth: 200, fontSize: 17 }}>Plagát na nástenku · {tlTit}</b>
        <button type="button" onClick={() => setPanel(null)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink2)", boxShadow: "none" }}>Zavrieť</button>
        <button type="button" onClick={tlac} style={{ ...tlZ, minHeight: 48, fontSize: 15, borderRadius: 12 }}>Vytlačiť</button>
      </div>
      {hlaska?.k === "tl" && <span role="status" style={{ fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>Otvorila sa tlač. Vyberte tlačiareň alebo „Uložiť ako PDF“.</span>}
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Je to týždeň, ktorý máte otvorený. Iný týždeň vyberiete šípkami ‹ › nižšie. Na plagáte sú vaše platné oznamy a omše podľa „Čo uvidia ľudia“.</span>
      <div style={{ display: "flex", justifyContent: "center", padding: 14, borderRadius: 14, background: "var(--field)" }}>
        <div ref={plagatRef} style={{ width: 560, maxWidth: "100%", boxSizing: "border-box", background: "#fff", color: "#1A1A1A", padding: mobil ? "22px 18px" : "34px 36px", display: "flex", flexDirection: "column", gap: 14, fontFamily: "'Plus Jakarta Sans',-apple-system,'Segoe UI',sans-serif" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center", paddingBottom: 12, borderBottom: "2px solid #1A1A1A" }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".14em", color: "#555" }}>{meno}</span>
            <b style={{ fontSize: 30, lineHeight: 1.1 }}>Bohoslužby</b>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{tlTit}</span>
          </div>
          {plagatOzn.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: "2px solid #1A1A1A" }}>
            <b style={{ fontSize: 13, letterSpacing: ".12em", color: "#555" }}>OZNAMY</b>
            {plagatOzn.map((o) => <div key={o.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>{o.t}</b>{o.s && <span style={{ fontSize: 14, lineHeight: 1.45, color: "#333", whiteSpace: "pre-line" }}>{o.s}</span>}</div>)}
          </div>}
          {plagatDni.map((d) => (
            <div key={d.key} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 12, padding: "8px 0", borderBottom: "1px solid #D8D4CA" }}>
              <div style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 17 }}>{d.w}</b><span style={{ fontSize: 13, color: "#555" }}>{d.dt}</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {d.o.map((x, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <b style={{ width: 52, flex: "none", fontSize: 17, fontVariantNumeric: "tabular-nums", color: x.z ? "#A3341F" : "#1A1A1A", textDecoration: x.z ? "line-through" : "none" }}>{x.t}</b>
                    <span style={{ fontSize: 15, lineHeight: 1.35, color: x.z ? "#A3341F" : "#1A1A1A" }}>{x.s}</span>
                  </div>))}
                {!d.o.length && <span style={{ fontSize: 15, color: "#888" }}>—</span>}
              </div>
            </div>))}
          <span style={{ fontSize: 12, color: "#777", textAlign: "center", paddingTop: 4 }}>{kostoly[kI]?.nazov ?? "Váš kostol"} · zmeny sledujte na stránke farnosti v appke DEED</span>
        </div>
      </div>
    </section>);
  const pinTl = (
    <button type="button" onClick={() => { const on = !kal.pin; zmenKalendar(strankaId, (s) => ({ ...s, pin: on })); ukaz("pin", on ? "Hotovo · týždeň uvidíte v Prehľade na boku" : "Odopnuté · z Prehľadu zmizol", 3000); }} aria-pressed={kal.pin}
      style={{ flex: "none", minHeight: 48, padding: "0 14px", borderRadius: 12, border: "1.5px solid var(--blue)", background: "color-mix(in srgb, var(--blue) 14%, transparent)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--blue)", whiteSpace: "nowrap", boxShadow: "none" }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7" /></svg>
      {kal.pin ? "Pripnuté v Prehľade ✓" : "Pripnúť týždeň do Prehľadu"}
    </button>);
  const taby = (
    <div role="tablist" aria-label="Zobrazenie" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)" }}>
      {(["Týždeň", "Mesiac", "Rozvrh omší"] as const).map((t, i) => { const on = tab === i; return (
        <button key={t} type="button" role="tab" aria-selected={on} onClick={() => { setTab(i as Tab); setDen(null); }} style={{ minHeight: 44, padding: mobil ? "0 10px" : "0 16px", border: "none", borderRadius: 9, background: on ? "var(--seg)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none", whiteSpace: "nowrap" }}>{t}</button>); })}
    </div>);
  const ikTl = (on: boolean, d: ReactNode, t: string, onClick: () => void) => (
    <button type="button" onClick={onClick} aria-expanded={on} style={{ minHeight: 48, padding: "0 16px", borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)", boxShadow: "none" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>{t}
    </button>);

  const lavy = tab === 0 || tel ? tyzden : tab === 1 ? mesiac : rozvrh;
  const pravy = <>{denPanel}{celyTyzden}{kostolyKarta}</>;
  if (tel) return <>
    {viac && <div style={{ flex: "none", display: "flex", gap: 8, flexWrap: "wrap" }}>
      {kostoly.map((x, i) => { const on = i === kI; return <button key={x.nazov + i} type="button" onClick={() => { setKI(i); setDen(null); }} aria-pressed={on} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 600, color: "var(--ink)", boxShadow: "none" }}>{x.nazov}</button>; })}
    </div>}
    {tyzden}
    <div ref={denRef} style={{ flex: "none", display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 76 }}>{den && denPanel}</div>
    {celyTyzden}
    <OnlineOmseKarta strankaId={strankaId} mobil />
  </>;
  return <>
    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, flexWrap: mobil ? "wrap" : "nowrap" }}>
      {!mobil && <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 22, fontWeight: 800 }}>Omše a kalendár</span><span style={{ display: "block", fontSize: 13.5, color: "var(--ink3)" }}>Vzor nastavíte raz, kalendár ho opakuje. Ťuk na deň zmení len ten deň.</span></span>}
      {taby}{pinTl}
    </div>
    <div style={{ flex: "none", display: "flex", gap: 10, flexWrap: "wrap" }}>
      {ikTl(panel === "ver", <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>, "Čo uvidia ľudia na stránke", () => setPanel((p) => (p === "ver" ? null : "ver")))}
      {ikTl(panel === "tl", <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" />, "Vytlačiť na nástenku", () => setPanel((p) => (p === "tl" ? null : "tl")))}
    </div>
    {verPanel}{tlPanel}
    {hlaska?.k === "pin" && <div role="status" style={{ flex: "none", alignSelf: "flex-end", padding: "8px 12px", borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 13.5, fontWeight: 800, color: "var(--gInk)" }}>{hlaska.t}</div>}
    {viac && <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", paddingRight: 4 }}>UPRAVUJETE</span>
      {kostoly.map((x, i) => { const on = i === kI; return <button key={x.nazov + i} type="button" onClick={() => { setKI(i); setDen(null); }} aria-pressed={on} style={{ minHeight: 44, padding: "0 16px", borderRadius: 12, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: on ? 800 : 600, color: "var(--ink)", boxShadow: "none" }}>{x.nazov}</button>; })}
    </div>}
    <OnlineOmseKarta strankaId={strankaId} mobil={mobil} />
    {mobil ? <>{den && denPanel}{lavy}{celyTyzden}{kostolyKarta}</> : (
      <div style={{ flex: "none", display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{lavy}</div>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>{pravy}</div>
      </div>)}
  </>;
}

/** plagát / verejný výpis týždňa — len zaškrtnuté v „Čo uvidia ľudia" */
interface PlagatRiadok { t: string; s: string; z: boolean }
/** štítok oznamu (zoznam v Oznamoch, plagát na nástenku) */
export function stitokOznamu(it: VieraFeedItem): string {
  if (it.tag === "Zmena omše") return "ZMENA OMŠE";
  if (it.ntyp === "udalost") return "UDALOSŤ";
  if (it.smutocny || it.ukat === "pohreb") return "PARTE";
  if (it.ukat === "svadba") return "SVADBA";
  if (it.tag === "Jubileum") return "JUBILEUM";
  return "OZNAM";
}
/** KARTA 56H §1: platné oznamy na plagát — najviac 8, s textom */
export function oznamyNaPlagat(strankaId: string) {
  return vlastnePrispevky(strankaId).slice(0, 8).map((x) => { const st = stitokOznamu(x); return { id: x.id, t: (st === "OZNAM" || st === "ZMENA OMŠE" ? "" : `${st.charAt(0)}${st.slice(1).toLowerCase()} · `) + (x.nazov ?? ""), s: x.popis ?? "" }; });
}

export function plagatTyzdna(k: KalKostol, VJ: KalendarFarnosti["verejne"], off: number) {
  return dniTyzdna(off).map((d) => {
    const o: PlagatRiadok[] = [
      ...(VJ.omse ? omseDna(k, d).filter((x) => VJ.zmeny || !x.zrusena).map((x) => ({ t: x.zrusena ? x.vzor : x.t, s: x.zrusena ? "zrušená" : x.posunuta ? "svätá omša · posunutá" : "svätá omša", z: x.zrusena })) : []),
      ...polozkyDna(k, d).filter((p) => VJ[druhPolozky(p.typ).kat]).map((p) => {
        const x = druhPolozky(p.typ);
        const sMenom = x.kat !== "omse" || VJ.umysel;
        return { t: p.t, s: x.kratko + (p.m.trim() && sMenom ? ` · ${p.m.trim()}` : ""), z: false };
      }),
    ].sort((a, b) => minuty(a.t) - minuty(b.t));
    return { key: iso(d), w: DNI_D[dvt(d)], dt: `${d.getDate()}. ${MES_G[d.getMonth()]}`, o };
  });
}

/** KARTA 56G §1: pripnutý týždeň v Prehľade = ten istý Týždeň ako v Omšiach; ťuk na deň otvorí jeho úpravu */
export function TyzdenVPrehlade({ strankaId, onDen, mobil }: { strankaId: string; onDen: (key: string) => void; mobil: boolean }) {
  const kal = useKalendar(strankaId);
  const [off, setOff] = useState(0);
  if (!kal.pin) return null;
  return <TyzdenKarta k={kostolKal(strankaId)} off={off} setOff={setOff} den={null} onDen={onDen} mobil={mobil} pozn={false} />;
}
