// ============================================================
// KARTA 57 F · 0070 — Štatistika Editora oznámení (len tím DEED, menu Viac → TÍM DEED).
// Ktoré typy a šablóny sa používajú, v ktorom sektore a mesiaci, koľko sa tlačí a sťahuje.
// Dáta len zo servera (editor_prehlad), nič vymyslené.
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { nacitajPrehladEditora, type RiadokPrehladu } from "@/lib/editorStat";

const OBDOBIA: [string, number | null][] = [["Tento mesiac", 0], ["3 mesiace", 2], ["Rok", 11], ["Všetko", null]];
const TYP_T: Record<string, string> = { parte: "Parte", svadba: "Svadba", jubileum: "Jubileum", blahozelanie: "Blahoželanie" };
const SEKTOR_T: Record<string, string> = { farnost: "Farnosť", pohrebnictvo: "Pohrebníctvo", charita: "Charita", "—": "neuvedené" };
const MES = ["január", "február", "marec", "apríl", "máj", "jún", "júl", "august", "september", "október", "november", "december"];
const mesiacT = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MES[mm - 1] ?? m} ${y}`; };
const odDatum = (spat: number | null) => { if (spat == null) return null; const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - spat); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };
type Suc = { vytvorene: number; doplnene: number; tlac: number; obrazky: number; s_qr: number; pri_zbierke: number };
const nula = (): Suc => ({ vytvorene: 0, doplnene: 0, tlac: 0, obrazky: 0, s_qr: 0, pri_zbierke: 0 });
const pripocitaj = (a: Suc, r: RiadokPrehladu) => { a.vytvorene += r.vytvorene; a.doplnene += r.doplnene; a.tlac += r.tlac; a.obrazky += r.obrazky; a.s_qr += r.s_qr; a.pri_zbierke += r.pri_zbierke; };
function skupina(l: RiadokPrehladu[], kluc: (r: RiadokPrehladu) => string) {
  const m = new Map<string, Suc>();
  l.forEach((r) => { const k = kluc(r); const a = m.get(k) ?? nula(); pripocitaj(a, r); m.set(k, a); });
  return [...m.entries()];
}

const karta: CSSProperties = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 };
const th: CSSProperties = { textAlign: "right", padding: "6px 8px", fontSize: 12, fontWeight: 800, color: "var(--ink3)", whiteSpace: "nowrap" };
const td: CSSProperties = { textAlign: "right", padding: "8px 8px", fontSize: 14, fontVariantNumeric: "tabular-nums", borderTop: "1px solid var(--cardBd)" };

function Tabulka({ nadpis, prvy, riadky }: { nadpis: string; prvy: string; riadky: [string, Suc][] }) {
  return (
    <section style={karta}>
      <b style={{ fontSize: 16 }}>{nadpis}</b>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead><tr><th style={{ ...th, textAlign: "left" }}>{prvy}</th><th style={th}>Vytvorené</th><th style={th}>Doplnené</th><th style={th}>Tlač</th><th style={th}>Obrázok</th><th style={th}>S QR</th><th style={th}>Pri zbierke</th></tr></thead>
          <tbody>{riadky.map(([k, s]) => (
            <tr key={k}><td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{k}</td><td style={td}>{s.vytvorene}</td><td style={td}>{s.doplnene}</td><td style={td}>{s.tlac}</td><td style={td}>{s.obrazky}</td><td style={td}>{s.s_qr}</td><td style={td}>{s.pri_zbierke}</td></tr>))}
          </tbody>
        </table>
      </div>
    </section>);
}

export function PrehladEditora({ onZavri, nacitaj = nacitajPrehladEditora }: { onZavri: () => void; /** zdroj dát (test) */ nacitaj?: (od: string | null) => Promise<RiadokPrehladu[]> }) {
  const [ob, setOb] = useState(2);
  const [stav, setStav] = useState<{ ob: number; riadky: RiadokPrehladu[] | null; chyba: string }>({ ob: -1, riadky: null, chyba: "" });
  useEffect(() => {
    let ziva = true;
    nacitaj(odDatum(OBDOBIA[ob][1])).then((r) => { if (ziva) setStav({ ob, riadky: r, chyba: "" }); }, (e: unknown) => { if (ziva) setStav({ ob, riadky: null, chyba: e instanceof Error ? e.message : "Prehľad sa nepodarilo načítať." }); });
    return () => { ziva = false; };
  }, [ob, nacitaj]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  const l = stav.ob === ob ? stav.riadky : null;
  const spolu = nula(); (l ?? []).forEach((r) => pripocitaj(spolu, r));
  const sablony = l ? skupina(l, (r) => `${TYP_T[r.typ] ?? r.typ} · ${r.sablona}`).sort((a, b) => b[1].vytvorene - a[1].vytvorene || b[1].tlac - a[1].tlac) : [];
  const typy = l ? skupina(l, (r) => TYP_T[r.typ] ?? r.typ).sort((a, b) => b[1].vytvorene - a[1].vytvorene) : [];
  const sektory = l ? skupina(l, (r) => SEKTOR_T[r.sektor] ?? r.sektor).sort((a, b) => b[1].vytvorene - a[1].vytvorene) : [];
  const mesiace = l ? skupina(l, (r) => r.mesiac).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([k, s]) => [mesiacT(k), s] as [string, Suc]) : [];
  return createPortal(
    <div className="sc-tokeny" role="dialog" aria-modal="true" aria-label="Štatistika editora oznámení" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "calc(10px + env(safe-area-inset-top, 0px)) 16px 10px", borderBottom: "1px solid var(--cardBd)" }}>
        <button type="button" onClick={onZavri} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>‹ Späť</button>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 18 }}>Štatistika editora oznámení</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>len pre tím DEED</span></span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div role="radiogroup" aria-label="Obdobie" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", alignSelf: "flex-start", flexWrap: "wrap" }}>
            {OBDOBIA.map(([t], i) => { const on = ob === i; return <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setOb(i)} style={{ minHeight: 44, padding: "0 14px", border: "none", borderRadius: 9, background: on ? "var(--seg, var(--card))" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, color: on ? "var(--ink)" : "var(--ink3)" }}>{t}</button>; })}
          </div>
          {stav.chyba && stav.ob === ob && <span role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", border: "1.5px solid #C9A24A", fontSize: 14.5, fontWeight: 800 }}>{stav.chyba}</span>}
          {!l && !stav.chyba && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Načítavam…</span>}
          {l && !l.length && <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Za toto obdobie zatiaľ žiadne záznamy.</span>}
          {l && l.length > 0 && <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              {([["Vytvorené", spolu.vytvorene], ["Doplnené", spolu.doplnene], ["Tlač", spolu.tlac], ["Stiahnutý obrázok", spolu.obrazky], ["S QR", spolu.s_qr], ["Pri zbierke", spolu.pri_zbierke]] as [string, number][]).map(([t, v]) => (
                <div key={t} style={{ padding: "10px 12px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>{t}</span><b style={{ fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{v}</b>
                </div>))}
            </div>
            <Tabulka nadpis="Šablóny" prvy="Typ · šablóna" riadky={sablony} />
            <Tabulka nadpis="Typy oznámení" prvy="Typ" riadky={typy} />
            <Tabulka nadpis="Podľa sektora" prvy="Sektor" riadky={sektory} />
            <Tabulka nadpis="Podľa mesiaca" prvy="Mesiac" riadky={mesiace} />
          </>}
        </div>
      </div>
    </div>, document.body);
}
