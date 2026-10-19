// ============================================================
// OPRAVY 411 · Správa charity → Kalendár (od Zadarmo) = mesiac ako v kalendári Viery, bez omší.
// Plní sa sám z toho, čo charita vytvorí: akcie (Oznamy, 407) · dobrovoľníctvo (406) · koniec zbierok ·
// uzávierky pracovných ponúk (408). Nič sa nezadáva zvlášť, ťuk na položku otvorí jej správu.
// ============================================================
import { useEffect, useState, type CSSProperties } from "react";
import { DNI_K, MES_G, MES_N, dvt } from "@/lib/kalendarFarnosti";
import { oznamyStranky, nacitajOznamyStranky, useZmenyOznamovCharity } from "@/lib/oznamyNove";
import { useBrigady } from "@/lib/brigady";
import { zbierkyStrankyZPamate, useZmenyZbierok, type SpustenaZbierka } from "@/lib/novaZbierka";
import { useOznamy } from "@/lib/oznamy";

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const sipka: CSSProperties = { width: 44, height: 44, flex: "none", borderRadius: "50%", border: "1px solid var(--cardBd)", background: "var(--field)", cursor: "pointer", fontSize: 18, color: "var(--ink)", boxShadow: "none" };
const spatTl: CSSProperties = { alignSelf: "center", marginTop: 2, minHeight: 32, padding: "0 12px", borderRadius: 16, border: "1px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "var(--gInk)", boxShadow: "none" };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DEN = 86400000;

type Druh = "akcia" | "brigada" | "zbierka" | "ponuka";
const DRUH: Record<Druh, [string, string]> = { akcia: ["akcia", "var(--gInk)"], brigada: ["dobrovoľníctvo", "var(--blue)"], zbierka: ["koniec zbierky", "var(--gold)"], ponuka: ["uzávierka ponuky", "var(--cRed)"] };
type Polozka = { id: string; den: string; cas: string; t: string; druh: Druh; tap: () => void };

/** plánovaný koniec zbierky charity: dlhodobá = spustenie + mesiace, krátkodobá = 30 dní */
function koniecZbierky(z: SpustenaZbierka): Date {
  const d = new Date(z.spustena);
  if (z.typ === "dlha" && z.mesiace) d.setMonth(d.getMonth() + z.mesiace); else d.setTime(d.getTime() + 30 * DEN);
  return d;
}

export function KalendarCharity({ strankaId, mobil, onAkcia, onBrigady, onZbierka, onPonuky }: {
  strankaId: string; mobil: boolean; onAkcia: (id: string) => void; onBrigady: () => void; onZbierka: (z: SpustenaZbierka) => void; onPonuky: () => void;
}) {
  useZmenyOznamovCharity(); useZmenyZbierok();
  useEffect(() => { void nacitajOznamyStranky(strankaId); }, [strankaId]);
  const brigady = useBrigady(strankaId);
  const ponuky = useOznamy(`stranka:${strankaId}`, "inzerat");
  const [mesOff, setMesOff] = useState(0);
  const [den, setDen] = useState<string | null>(null);
  const dnes = iso(new Date());

  const vsetky: Polozka[] = [
    ...oznamyStranky(strankaId).filter((o) => o.druh === "verejny" && !o.zrusene && o.datum)
      .map((o) => ({ id: o.id, den: o.datum!, cas: o.cas ?? "", t: o.nadpis, druh: "akcia" as const, tap: () => onAkcia(o.id) })),
    ...brigady.filter((b) => b.dat).map((b) => ({ id: b.id, den: b.dat, cas: b.cas, t: b.t, druh: "brigada" as const, tap: onBrigady })),
    ...zbierkyStrankyZPamate(strankaId).filter((z) => !z.stav || z.stav === "aktivna")
      .map((z) => ({ id: z.id, den: iso(koniecZbierky(z)), cas: "", t: z.nazov || "Zbierka", druh: "zbierka" as const, tap: () => onZbierka(z) })),
    ...ponuky.filter((o) => !o.obsadene && o.ponuka?.uzavierka)
      .map((o) => ({ id: o.id, den: iso(new Date(o.ponuka!.uzavierka!)), cas: "", t: o.nadpis, druh: "ponuka" as const, tap: onPonuky })),
  ].sort((a, b) => a.den.localeCompare(b.den) || a.cas.localeCompare(b.cas));
  const naDen = (k: string) => vsetky.filter((p) => p.den === k);

  const m1 = (() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth() + mesOff, 1); })();
  const nDni = new Date(m1.getFullYear(), m1.getMonth() + 1, 0).getDate();
  const vyber = den ? naDen(den) : vsetky.filter((p) => p.den >= dnes).slice(0, 8);
  const dD = den ? new Date(`${den}T12:00:00`) : null;

  const riadok = (p: Polozka, i: number) => (
    <button key={`${p.druh}-${p.id}`} type="button" onClick={p.tap} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--ink)", width: "100%" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 15, overflowWrap: "anywhere" }}>{p.t}</b>
        <span style={{ fontSize: 13, fontWeight: 700, color: DRUH[p.druh][1] }}>{[den ? "" : `${new Date(`${p.den}T12:00:00`).getDate()}. ${MES_G[new Date(`${p.den}T12:00:00`).getMonth()]}`, p.cas, DRUH[p.druh][0]].filter(Boolean).join(" · ")}</span>
      </span>
      <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>›</span>
    </button>);

  return (
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "minmax(0,1.6fr) minmax(280px,1fr)", gap: 16, alignItems: "start", maxWidth: 1100 }}>
      <section style={{ ...karta, padding: mobil ? "12px 10px" : "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => { setMesOff((o) => o - 1); setDen(null); }} aria-label="Predchádzajúci mesiac" style={sipka}>‹</button>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <b style={{ fontSize: 18 }}>{MES_N[m1.getMonth()]} {m1.getFullYear()}</b>
            {mesOff !== 0 && <button type="button" onClick={() => { setMesOff(0); setDen(null); }} style={spatTl}>Späť na tento mesiac</button>}
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>Plní sa sám z toho, čo vytvoríte · ťuknite na deň</span>
          </span>
          <button type="button" onClick={() => { setMesOff((o) => o + 1); setDen(null); }} aria-label="Ďalší mesiac" style={sipka}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: mobil ? 4 : 6 }}>
          {DNI_K.map((d) => <span key={d} style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--ink3)" }}>{d}</span>)}
          {Array.from({ length: dvt(m1) }, (_, i) => <span key={`p${i}`} />)}
          {Array.from({ length: nDni }, (_, i) => {
            const d = new Date(m1.getFullYear(), m1.getMonth(), i + 1), key = iso(d), sel = den === key, jeDnes = key === dnes, px = naDen(key);
            return (
              <button key={key} type="button" onClick={() => setDen(sel ? null : key)} aria-pressed={sel} aria-label={`${d.getDate()}. ${MES_G[d.getMonth()]}${px.length ? ` · ${px.length}` : ""}`}
                style={{ minHeight: mobil ? 56 : 74, minWidth: 0, padding: mobil ? "4px 4px" : "6px 7px", borderRadius: 12, border: sel ? "2px solid var(--green)" : jeDnes ? "2px solid var(--ink)" : "1px solid var(--cardBd)", background: px.length ? "var(--field)" : "transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, overflow: "hidden", boxShadow: "none" }}>
                <b style={{ fontSize: 13.5, color: jeDnes ? "var(--ink)" : "var(--ink2)" }}>{i + 1}</b>
                {mobil ? <span style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{px.slice(0, 4).map((p) => <span key={`${p.druh}-${p.id}`} style={{ width: 7, height: 7, borderRadius: "50%", background: DRUH[p.druh][1] }} />)}</span>
                  : px.slice(0, 2).map((p) => <span key={`${p.druh}-${p.id}`} style={{ maxWidth: "100%", fontSize: 11.5, fontWeight: 700, lineHeight: 1.3, color: DRUH[p.druh][1], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.cas ? `${p.cas} ` : ""}{p.t}</span>)}
                {!mobil && px.length > 2 && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>+{px.length - 2}</span>}
              </button>);
          })}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5 }}>
          {(Object.keys(DRUH) as Druh[]).map((k) => <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink3)" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: DRUH[k][1] }} />{DRUH[k][0]}</span>)}
        </div>
      </section>
      <section style={{ ...karta, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 16 }}>{dD ? `${DNI_K[dvt(dD)]} ${dD.getDate()}. ${MES_G[dD.getMonth()]}` : "Najbližšie"}</b>
        {vyber.length ? vyber.map(riadok)
          : <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink3)", paddingTop: 6 }}>{den ? "V tento deň nič." : "Zatiaľ nič. Akcie, dobrovoľníctvo, koniec zbierok a uzávierky pracovných ponúk sa sem zapíšu samy."}</span>}
      </section>
    </div>);
}
