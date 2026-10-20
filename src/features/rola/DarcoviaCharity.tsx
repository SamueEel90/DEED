// ============================================================
// OPRAVY 405 (charita) · Správa charity → Ľudia → Darcovia + Sledujúci (ako Viera 349, 362, 345).
// OPRAVY 452: obrazovka „Darcovia“ — bez Poďakovať darcom a bez + Nová zbierka.
// 1 účet = 1 riadok (meno, ktoré darca vybral · počet darov · suma · posledný dar), najnovší hore; ťuk = jeho dary.
// Anonymné dary (bez účtu alebo bez mena) = jeden riadok dole, nikdy sa nepripočítajú k menovanému (server 0148).
// Sledujúci: len počty, bez mien (server 0107 statistiky_farnosti).
// ============================================================
import { useState, type CSSProperties } from "react";
import { useZmenyDarov } from "@/lib/darcovia";
import { useDarcoviaStranky, type DarcaStranky } from "@/lib/darcoviaStranky";
import { useStatistikyFarnosti } from "@/lib/statistikyFarnosti";
import { sumaEur } from "@/lib/suma";
import { NADPIS_SEKCIE } from "./KartaNastavenia";

const kicker: CSSProperties = { ...NADPIS_SEKCIE, paddingTop: 6 };
const darov = (n: number) => (n === 1 ? "1 dar" : n < 5 ? `${n} dary` : `${n} darov`);
const darcoviaT = (n: number) => (n === 1 ? "1 darca s menom" : n < 5 ? `${n} darcovia s menom` : `${n} darcov s menom`);
const anonT = (n: number) => (n === 1 ? "1 anonymný dar" : n < 5 ? `${n} anonymné dary` : `${n} anonymných darov`);
const datum = (ms: number) => { const d = new Date(ms); const r = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""; return `${d.getDate()}. ${d.getMonth() + 1}.${r}`; };

export function DarcoviaCharity({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  const zmena = useZmenyDarov();
  const q = useDarcoviaStranky(strankaId, zmena);
  const [otv, setOtv] = useState<string | null>(null);
  const [viac, setViac] = useState(false);
  const karta: CSSProperties = { borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "4px 14px" : "6px 20px" };
  if (q.isPending) return <section style={{ ...karta, padding: "14px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Načítavam darcov…</section>;
  if (q.isError) return (
    <section role="alert" style={{ ...karta, padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10, border: "1.5px solid #8E2F1E" }}>
      <span style={{ fontSize: 14.5, color: "var(--ink)" }}>Darcov sa nepodarilo načítať.</span>
      <button type="button" onClick={() => void q.refetch()} style={{ alignSelf: "flex-start", minHeight: 44, padding: "0 16px", borderRadius: 12, border: "none", background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Skúsiť znova</button>
    </section>);
  const { menovani, anonymne } = q.data;
  const nAnon = anonymne?.dary.length ?? 0;
  if (!menovani.length && !nAnon) return <section style={{ ...karta, padding: "14px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ žiadne dary.</section>;
  const ukaz = viac ? menovani : menovani.slice(0, 50);
  const riadky: DarcaStranky[] = [...ukaz, ...(anonymne && (viac || menovani.length <= 50) ? [anonymne] : [])];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, maxWidth: 760 }}>
      <span style={kicker}>{[menovani.length ? darcoviaT(menovani.length) : "", nAnon ? anonT(nAnon) : ""].filter(Boolean).join(" · ").toUpperCase()}</span>
      <section style={karta}>
        {riadky.map((d, i) => {
          const on = otv === d.k;
          return (
            <div key={d.k} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
              <button type="button" onClick={() => setOtv(on ? null : d.k)} aria-expanded={on}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: mobil ? 10 : 12, minHeight: mobil ? 58 : 60, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--ink)" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: mobil ? 14 : 14.5, overflowWrap: "anywhere", color: d.k === "anonymne" ? "var(--ink2)" : "var(--ink)" }}>{d.meno}</b>
                  <span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{`${darov(d.dary.length)} · posledný ${datum(d.posledny)}`}</span>
                </span>
                <b style={{ flex: "none", fontSize: mobil ? 13.5 : 14, fontVariantNumeric: "tabular-nums" }}>{sumaEur(d.suma)}</b>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", transform: on ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="M9 6l6 6-6 6" /></svg>
              </button>
              {on && <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: "0 0 10px", padding: "2px 12px", borderRadius: 12, background: "var(--btn)" }}>
                {d.dary.map((x, j) => (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, borderTop: j ? "1px solid var(--cardBd)" : "none" }}>
                    <span style={{ flex: "none", width: mobil ? 64 : 80, fontSize: 13, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{datum(x.cas)}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--ink2)", overflowWrap: "anywhere" }}>{x.zbierka}</span>
                    <span style={{ flex: "none", fontSize: 13.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{sumaEur(x.eur)}</span>
                  </div>))}
              </div>}
            </div>);
        })}
        {menovani.length > ukaz.length && <button type="button" onClick={() => setViac(true)} style={{ width: "100%", minHeight: 48, border: "none", borderTop: "1px solid var(--cardBd)", background: "transparent", color: "var(--gInk)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>{`Ukázať všetkých (${menovani.length})`}</button>}
      </section>
    </div>);
}

export function SledujuciCharity({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  const [od] = useState(() => Date.now() - 30 * 864e5);
  const srv = useStatistikyFarnosti(strankaId, od);
  const ramec = (k: string, h: string) => (
    <div key={k} style={{ minWidth: 0, padding: mobil ? "12px 14px" : "14px 18px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
      <b style={{ fontSize: 24, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>{h}</b>
    </div>);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, maxWidth: 560 }}>
      {ramec("Sledujú charitu", srv ? String(srv.sledujuci) : "—")}
      {ramec("Noví za 30 dní", srv ? String(srv.sledujuciNovi30) : "—")}
    </div>);
}
