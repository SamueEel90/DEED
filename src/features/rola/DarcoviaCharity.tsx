// ============================================================
// OPRAVY 405 (charita) · Správa charity → Ľudia → Darcovia a sumy + Sledujúci (ako Viera 349, 362, 345).
// Darcovia: hore Poďakovať darcom (Všetkým darcom · každá zbierka) → Oznámenia darcov (server 0106/0130),
// pod tým Darcovia · N: 1 človek = 1 riadok so súčtom (charita vidí sumy; verejne podľa Viditeľnosť súm).
// Bez mena = „Anonymný darca“ (každý zvlášť). Reťaz dobra a dorovnanie teraz nie — riadky firiem sa vynechajú.
// Sledujúci: len počty, bez mien (server 0107 statistiky_farnosti).
// ============================================================
import { useState, type CSSProperties } from "react";
import { zbierkyStrankyZPamate } from "@/lib/novaZbierka";
import { darcoviaPre, identitaDarcu, useZmenyDarov, type DarRiadok } from "@/lib/darcovia";
import { useStatistikyFarnosti } from "@/lib/statistikyFarnosti";
import { sumaEur } from "@/lib/suma";
import { PodakovatDarcom } from "./PodakovatDarcom";
import { NADPIS_SEKCIE } from "./KartaNastavenia";

const kicker: CSSProperties = { ...NADPIS_SEKCIE, paddingTop: 6 };
const darcov = (n: number) => (n === 1 ? "1 dar" : n < 5 ? `${n} dary` : `${n} darov`);

type Darca = { k: string; meno: string; suma: number; pocet: number; cas: number; zbierky: string[] };

export function DarcoviaCharity({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  useZmenyDarov();
  const zb = zbierkyStrankyZPamate(strankaId);
  const vsetky: { r: DarRiadok; z: string }[] = zb.flatMap((z) => darcoviaPre(z.id).filter((r) => !r.firma && !r.omsa).map((r) => ({ r, z: z.nazov || "Zbierka" })));
  // 1 človek = 1 riadok: registrovaný s menom podľa mena; bez mena každý dar zvlášť (nevieme, či je to ten istý človek)
  const mapa = new Map<string, Darca>();
  for (const { r, z } of vsetky) {
    const meno = identitaDarcu(r, undefined, "ine");
    const k = r.registrovany && r.verzia !== 4 ? `m:${meno}` : `a:${r.id}`;
    const d = mapa.get(k) ?? { k, meno, suma: 0, pocet: 0, cas: 0, zbierky: [] };
    d.suma += r.suma; d.pocet += 1; d.cas = Math.max(d.cas, r.cas);
    if (!d.zbierky.includes(z)) d.zbierky.push(z);
    mapa.set(k, d);
  }
  const darcovia = [...mapa.values()].sort((a, b) => b.cas - a.cas);
  const spolu = darcovia.reduce((a, d) => a + d.suma, 0);
  const ciele: [string, string][] = [["vsetci", "Všetkým darcom"], ...zb.map((z) => [z.id, z.nazov || "Zbierka"] as [string, string])];
  const [viac, setViac] = useState(false);
  const ukaz = viac ? darcovia : darcovia.slice(0, 50);
  const karta: CSSProperties = { borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "4px 14px" : "6px 20px" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      {darcovia.length > 0 && <PodakovatDarcom strankaId={strankaId} mobil={mobil} ciele={ciele} od="od charity" />}
      {darcovia.length > 0 && <span style={kicker}>DARCOVIA · {darcovia.length} · SPOLU {sumaEur(spolu)}</span>}
      {darcovia.length ? <section style={karta}>
        {ukaz.map((d, i) => (
          <div key={d.k} style={{ display: "flex", alignItems: "center", gap: mobil ? 10 : 12, minHeight: mobil ? 58 : 60, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontSize: mobil ? 14 : 14.5, overflowWrap: "anywhere" }}>{d.meno}</b>
              <span style={{ fontSize: mobil ? 12 : 12.5, color: "var(--ink3)" }}>{[darcov(d.pocet), d.zbierky.join(", ")].join(" · ")}</span>
            </span>
            <b style={{ flex: "none", fontSize: mobil ? 13.5 : 14, fontVariantNumeric: "tabular-nums" }}>{sumaEur(d.suma)}</b>
          </div>))}
        {darcovia.length > ukaz.length && <button type="button" onClick={() => setViac(true)} style={{ width: "100%", minHeight: 48, border: "none", borderTop: "1px solid var(--cardBd)", background: "transparent", color: "var(--gInk)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Ukázať všetkých · {darcovia.length}</button>}
      </section>
        : <section style={{ ...karta, padding: "14px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ žiadne dary.</section>}
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
