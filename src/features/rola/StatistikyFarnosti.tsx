// ============================================================
// OPRAVY 345 — Správa farnosti → Nástroje a štatistiky → Štatistiky (podľa Štatistík charity, bez štítu, sektorov,
// dokladov načas a Dorovnané partnermi). Obdobie Dnes · 7 dní · 30 dní · Rok, „Dary cez DEED+.“
// 8 rámcov, PODĽA ZBIEROK, PODĽA MESIACOV. Len skutočné čísla — čo appka ešte nevie spočítať, má „—“ a vetu.
// Zdroje: Hlavná (dary bez riadkov omší), Zvončeková (uzavreté omše + bežiaca), ďalšie zbierky farnosti, príspevky veriacich.
// ============================================================
import { useState, type CSSProperties } from "react";
import { darcoviaPre, identitaDarcu, useZmenyDarov, type DarRiadok } from "@/lib/darcovia";
import { useZvoncekOkno } from "@/lib/zvoncekOmse";
import { zbierkyStrankyZPamate } from "@/lib/novaZbierka";
import { odFarnikov, useOdFarnikov } from "@/lib/odFarnikov";
import { sumaEur } from "@/lib/suma";
import { NADPIS_SEKCIE } from "./KartaNastavenia";

const OBD = ["Dnes", "7 dní", "30 dní", "Rok"];
const OBD_T = ["za dnes", "za 7 dní", "za 30 dní", "od januára"];
const MES = ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"];
function zaciatok(ob: number): number {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return [t.getTime(), Date.now() - 7 * 864e5, Date.now() - 30 * 864e5, new Date(new Date().getFullYear(), 0, 1).getTime()][ob];
}
const eur = (n: number) => sumaEur(n);
const darov = (n: number) => `${n} ${n === 1 ? "dar" : n >= 2 && n <= 4 ? "dary" : "darov"}`;
const kicker: CSSProperties = { ...NADPIS_SEKCIE, paddingTop: 6 };

/** jeden dar so sumou a časom (omša = súčet omše, darov = počet darov v nej) */
type Polozka = { cas: number; suma: number; darov: number; zdroj: "hlavna" | "zvoncek" | "dalsie"; kto?: string };

export function StatistikyFarnosti({ strankaId, mobil }: { strankaId: string; mobil: boolean }) {
  useZmenyDarov(); useOdFarnikov();
  const [ob, setOb] = useState(2);
  const od = zaciatok(ob);
  const zv = useZvoncekOkno(strankaId);
  const hlavna = darcoviaPre(`${strankaId}-centralna`).filter((r) => !r.omsa);
  const dalsie = zbierkyStrankyZPamate(strankaId).filter((z) => !z.farnost || z.farnost.druh === "farnost");
  const kto = (r: DarRiadok) => (r.registrovany && (r.meno || r.moj) ? `m:${r.moj ? "ja" : identitaDarcu(r, undefined, "viera")}` : `d:${r.id}`);
  const vsetko: Polozka[] = [
    ...hlavna.map((r) => ({ cas: r.cas, suma: r.suma, darov: 1, zdroj: "hlavna" as const, kto: kto(r) })),
    ...zv.uzavrete.map((o) => ({ cas: new Date(`${o.den}T12:00:00`).getTime(), suma: o.suma, darov: o.darov, zdroj: "zvoncek" as const })),
    ...zv.dary.map((r) => ({ cas: r.cas, suma: r.suma, darov: 1, zdroj: "zvoncek" as const, kto: kto(r) })),
    ...dalsie.flatMap((z) => darcoviaPre(z.id).map((r) => ({ cas: r.cas, suma: r.suma, darov: 1, zdroj: "dalsie" as const, kto: kto(r) }))),
  ];
  const v = vsetko.filter((x) => x.cas >= od);
  const suma = v.reduce((a, x) => a + x.suma, 0), pocet = v.reduce((a, x) => a + x.darov, 0);
  // darcovia: registrovaní podľa mena, ostatní každý dar zvlášť (zvončeková omša má len súčet)
  const prvy = new Map<string, number>();
  vsetko.forEach((x) => { if (x.kto) prvy.set(x.kto, Math.min(prvy.get(x.kto) ?? Infinity, x.cas)); });
  const noviN = [...prvy.values()].filter((c) => c >= od).length;
  const prispevky = odFarnikov(strankaId).filter((x) => x.k !== "umysel" && !x.stav && x.cas >= od).length;
  const ramce: [string, string, string][] = [
    ["Vyzbierané", eur(suma), OBD_T[ob]],
    ["Počet darov", String(pocet), OBD_T[ob]],
    ["Priemerný dar", pocet ? eur(suma / pocet) : "—", pocet ? OBD_T[ob] : "zatiaľ žiadne dary"],
    ["Noví darcovia", String(noviN), OBD_T[ob]],
    ["Pravidelná podpora", "—", "zapnutá na hlavnej zbierke · počet pripravujeme"],
    ["Darcovia spolu", String(prvy.size), "od začiatku"],
    ["Sledujúci", "—", "počet pripravujeme"],
    ["Príspevky od veriacich", String(prispevky), `${OBD_T[ob]} · na stránke`],
  ];
  const zSumy = (z: Polozka["zdroj"]) => v.filter((x) => x.zdroj === z).reduce((a, x) => a + x.suma, 0);
  const zPocet = (z: Polozka["zdroj"]) => v.filter((x) => x.zdroj === z).reduce((a, x) => a + x.darov, 0);
  const zbierky: [string, string, string][] = [
    ["Hlavná zbierka", `stála, aj mesačne · ${darov(zPocet("hlavna"))}`, eur(zSumy("hlavna"))],
    ["Zvončeková zbierka", `pri omšiach · ${darov(zPocet("zvoncek"))}`, eur(zSumy("zvoncek"))],
    ["Ďalšie zbierky farnosti", `oprava, misie, lavice · ${darov(zPocet("dalsie"))}`, eur(zSumy("dalsie"))],
    ["Podiel farnosti zo zbierok rodiny", "pohreb, svadba · len podiel, nie sumy rodiny · pripravujeme", "—"],
  ];
  // graf: tento rok po mesiacoch
  const rok = new Date().getFullYear(), odRoka = new Date(rok, 0, 1).getTime();
  const mes = Array.from({ length: 12 }, () => 0);
  vsetko.filter((x) => x.cas >= odRoka).forEach((x) => { mes[new Date(x.cas).getMonth()] += x.suma; });
  const maxM = Math.max(...mes), maDary = maxM > 0;
  const [aktiv, setAktiv] = useState<number | null>(null);

  const karta: CSSProperties = { borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
  return <>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ flex: "1 1 200px", fontSize: 14, color: "var(--ink2)" }}>Dary cez DEED+.</span>
      <div role="tablist" aria-label="Obdobie" style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: "var(--btn)" }}>
        {OBD.map((t, i) => { const on = i === ob; return <button key={t} type="button" role="tab" aria-selected={on} onClick={() => setOb(i)} style={{ minHeight: 44, padding: "0 12px", border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: on ? 800 : 700, background: on ? "var(--field)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: "none" }}>{t}</button>; })}
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
      {ramce.map(([k, h, d]) => (
        <div key={k} style={{ minWidth: 0, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
          <b style={{ fontSize: 24, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", color: k === "Vyzbierané" ? "var(--gInk)" : "var(--ink)" }}>{h}</b>
          <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, color: "var(--ink3)" }}>{d}</span>
        </div>))}
    </div>
    <span style={kicker}>PODĽA ZBIEROK</span>
    <section style={{ ...karta, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {zbierky.map(([t, s, h], i) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
          <b style={{ flex: "none", fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>{h}</b>
        </div>))}
    </section>
    <span style={kicker}>PODĽA MESIACOV · {rok}</span>
    {!maDary ? <section style={{ ...karta, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
      <b style={{ fontSize: 15.5 }}>Zatiaľ žiadne dary</b>
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Graf po mesiacoch sa ukáže po prvom dare.</span>
    </section> : <section aria-label="Dary po mesiacoch" style={{ ...karta, padding: "16px 18px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div role="list" style={{ height: 180, display: "flex", alignItems: "flex-end", gap: mobil ? 4 : 10, borderBottom: "1px solid var(--cardBd)" }} onPointerLeave={() => setAktiv(null)}>
        {mes.map((m, i) => (
          <div key={i} role="listitem" aria-label={`${MES[i]} · ${eur(m)}`} onPointerEnter={() => setAktiv(i)} onPointerDown={() => setAktiv(i)} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "flex-end", opacity: aktiv == null || aktiv === i ? 1 : 0.55 }}>
            <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "4px 4px 0 0", background: "var(--green)", transformOrigin: "50% 100%", transform: `scaleY(${(m / maxM).toFixed(3)})` }} />
          </div>))}
      </div>
      <div aria-hidden="true" style={{ display: "flex", gap: mobil ? 4 : 10, fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>{MES.map((m) => <span key={m} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>{m}</span>)}</div>
      <span aria-live="polite" style={{ fontSize: 12.5, minHeight: 16, color: aktiv != null ? "var(--ink)" : "var(--ink3)", fontWeight: aktiv != null ? 700 : 400 }}>{aktiv != null ? `${MES[aktiv]} ${rok} · ${eur(mes[aktiv])}` : `Spolu ${eur(mes.reduce((a, x) => a + x, 0))} · ťuknite na stĺpec`}</span>
    </section>}
  </>;
}
