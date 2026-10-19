// ============================================================
// OPRAVY 345 — Správa farnosti → Nástroje a štatistiky → Štatistiky (podľa Štatistík charity, bez štítu, sektorov,
// dokladov načas a Dorovnané partnermi). Obdobie Dnes · 7 dní · 30 dní · Rok, „Dary cez DEED+.“
// 8 rámcov, PODĽA ZBIEROK, PODĽA MESIACOV. Len skutočné čísla — počty darcov, sledujúcich a podiel zo zbierok rodiny
// dáva server (0107); kým ich nedá, je pod nadpisom „—“ bez vety (odpovede 18. 10.).
// Zdroje: Hlavná (dary bez riadkov omší), Zvončeková (uzavreté omše + bežiaca), ďalšie zbierky farnosti, príspevky veriacich.
// ============================================================
import { useState, type CSSProperties } from "react";
import { darcoviaPre, identitaDarcu, useZmenyDarov, type DarRiadok } from "@/lib/darcovia";
import { useZvoncekOkno } from "@/lib/zvoncekOmse";
import { zbierkyStrankyZPamate, useZmenyZbierok } from "@/lib/novaZbierka";
import { skutkyStrankyZPamate, useZmenySkutkovStranky } from "@/lib/skutkyStranky";
import { skutkyOrg, useZmenySkutkov } from "@/lib/mojeSkutky";
import { odFarnikov, useOdFarnikov } from "@/lib/odFarnikov";
import { sumaEur } from "@/lib/suma";
import { NADPIS_SEKCIE } from "./KartaNastavenia";
import { textovePdf, stiahniBlob, type RiadokPdf } from "@/lib/textovePdf";
import { useStatistikyFarnosti, statistikyFarnosti } from "@/lib/statistikyFarnosti";

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
type Polozka = { cas: number; suma: number; darov: number; zdroj: "hlavna" | "zvoncek" | "dalsie"; kto?: string; zbierka?: string };

/** všetky dary farnosti (Hlavná bez riadkov omší, zvončeková po omšiach + bežiaca, ďalšie zbierky farnosti; nie zbierky rodiny) */
export function useDaryFarnosti(strankaId: string): Polozka[] {
  useZmenyDarov();
  const zv = useZvoncekOkno(strankaId);
  const hlavna = darcoviaPre(`${strankaId}-centralna`).filter((r) => !r.omsa);
  const dalsie = zbierkyStrankyZPamate(strankaId).filter((z) => !z.farnost || z.farnost.druh === "farnost");
  const kto = (r: DarRiadok) => (r.registrovany && (r.meno || r.moj) ? `m:${r.moj ? "ja" : identitaDarcu(r, undefined, "viera")}` : `d:${r.id}`);
  return [
    ...hlavna.map((r) => ({ cas: r.cas, suma: r.suma, darov: 1, zdroj: "hlavna" as const, kto: kto(r) })),
    ...zv.uzavrete.map((o) => ({ cas: new Date(`${o.den}T12:00:00`).getTime(), suma: o.suma, darov: o.darov, zdroj: "zvoncek" as const })),
    ...zv.dary.map((r) => ({ cas: r.cas, suma: r.suma, darov: 1, zdroj: "zvoncek" as const, kto: kto(r) })),
    ...dalsie.flatMap((z) => darcoviaPre(z.id).map((r) => ({ cas: r.cas, suma: r.suma, darov: 1, zdroj: "dalsie" as const, kto: kto(r), zbierka: z.nazov || "Zbierka farnosti" }))),
  ];
}

/** OPRAVY 423: všetky dary charity — každá jej zbierka z databázy (centrálna, sektory, ďalšie) */
function useDaryCharity(strankaId: string): Polozka[] {
  useZmenyDarov(); useZmenyZbierok();
  return zbierkyStrankyZPamate(strankaId).flatMap((z) => darcoviaPre(z.id).filter((r) => !r.omsa).map((r) => ({ cas: r.cas, suma: r.suma, darov: 1, zdroj: "dalsie" as const, zbierka: z.id })));
}

export function StatistikyFarnosti({ strankaId, mobil, charita = false }: { strankaId: string; mobil: boolean; /** OPRAVY 423: Štatistiky charity (bez Zvončeka, omší a podielu rodiny) */ charita?: boolean }) {
  useOdFarnikov(); useZmenySkutkovStranky(); useZmenySkutkov();
  const [ob, setOb] = useState(2);
  const od = zaciatok(ob);
  const daryF = useDaryFarnosti(strankaId), daryCh = useDaryCharity(strankaId);
  const vsetko = charita ? daryCh : daryF;
  const v = vsetko.filter((x) => x.cas >= od);
  const suma = v.reduce((a, x) => a + x.suma, 0), pocet = v.reduce((a, x) => a + x.darov, 0);
  const srv = useStatistikyFarnosti(strankaId, od);
  const prispevky = odFarnikov(strankaId).filter((x) => x.k !== "umysel" && !x.stav && x.cas >= od).length;
  // OPRAVY 423: skutky charity zverejnené za obdobie (server 0133, inak zo Správy na tomto zariadení)
  const skutky = charita ? (skutkyStrankyZPamate(strankaId) ?? skutkyOrg(strankaId)).filter((s) => !s.stiahnuty && (s.datum || 0) >= od).length : 0;
  const ramce: [string, string, string][] = [
    ["Vyzbierané", eur(suma), OBD_T[ob]],
    ["Počet darov", String(pocet), OBD_T[ob]],
    ["Priemerný dar", pocet ? eur(suma / pocet) : "—", pocet ? OBD_T[ob] : "zatiaľ žiadne dary"],
    ["Noví darcovia", srv ? String(srv.noviDarcovia) : "—", srv ? OBD_T[ob] : ""],
    ["Pravidelná podpora", srv?.pravidelna != null ? String(srv.pravidelna) : "—", srv?.pravidelna != null ? (charita ? "zapnutá na centrálnej zbierke" : "zapnutá na hlavnej zbierke") : ""],
    ["Darcovia spolu", srv ? String(srv.darciaSpolu) : "—", srv ? "od začiatku" : ""],
    ["Sledujúci", srv ? String(srv.sledujuci) : "—", srv ? `+${srv.sledujuciNovi30} za 30 dní` : ""],
    charita ? ["Skutky", String(skutky), `${OBD_T[ob]} · zverejnené`] : ["Príspevky od veriacich", String(prispevky), `${OBD_T[ob]} · na stránke`],
  ];
  const zSumy = (z: Polozka["zdroj"]) => v.filter((x) => x.zdroj === z).reduce((a, x) => a + x.suma, 0);
  const zPocet = (z: Polozka["zdroj"]) => v.filter((x) => x.zdroj === z).reduce((a, x) => a + x.darov, 0);
  const zbierkyCh = zbierkyStrankyZPamate(strankaId);
  const zbierky: [string, string, string][] = charita ? zbierkyCh.map((z) => { const x = v.filter((d) => d.zbierka === z.id); return [z.nazov || "Zbierka", darov(x.length), eur(x.reduce((a, d) => a + d.suma, 0))]; }) : [
    ["Hlavná zbierka", `stála, aj mesačne · ${darov(zPocet("hlavna"))}`, eur(zSumy("hlavna"))],
    ["Zvončeková zbierka", `pri omšiach · ${darov(zPocet("zvoncek"))}`, eur(zSumy("zvoncek"))],
    ["Ďalšie zbierky farnosti", `oprava, misie, lavice · ${darov(zPocet("dalsie"))}`, eur(zSumy("dalsie"))],
    ["Podiel farnosti zo zbierok rodiny", "pohreb, svadba · len podiel, nie sumy rodiny", srv ? eur(srv.podielRodiny) : "—"],
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
    {zbierky.length === 0 ? <section style={{ ...karta, padding: "14px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Zatiaľ nemáte žiadnu zbierku.</section> :
    <section style={{ ...karta, padding: mobil ? "4px 14px" : "6px 20px" }}>
      {zbierky.map(([t, s, h], i) => (
        <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
          <b style={{ flex: "none", fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>{h}</b>
        </div>))}
    </section>}
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

// ============================================================
// OPRAVY 346 · Ľudia → Sledujúci: len počty, nikdy mená (farár nesmie nikoho naháňať)
// ============================================================
export function SledujuciFarnosti({ strankaId, kostoly, pocty, mobil }: { strankaId: string; kostoly: { id: string; nazov: string }[]; pocty: Record<string, number> | null; mobil: boolean }) {
  const [od] = useState(() => Date.now() - 30 * 864e5);
  const srv = useStatistikyFarnosti(strankaId, od);
  const ramec = (k: string, h: string, d: string) => (
    <div key={k} style={{ minWidth: 0, padding: "12px 14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
      <b style={{ fontSize: 24, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>{h}</b>
      <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, color: "var(--ink3)" }}>{d}</span>
    </div>);
  return <>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
      {ramec("Sledujú farnosť", srv ? String(srv.sledujuci) : "—", "")}
      {ramec("Noví za 30 dní", srv ? String(srv.sledujuciNovi30) : "—", "")}
    </div>
    <span style={kicker}>PODĽA KOSTOLOV</span>
    <section style={{ borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "4px 14px" : "6px 20px" }}>
      {kostoly.map((m, i) => (
        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <b style={{ flex: 1, minWidth: 0, fontSize: 14.5 }}>{m.nazov}</b>
          <b style={{ flex: "none", fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>{pocty ? pocty[m.id] ?? 0 : "…"}</b>
        </div>))}
    </section>
  </>;
}

// ============================================================
// OPRAVY 346 · Nástroje → Ročný výpis: rok (len roky s dátami), čo obsahuje, Stiahnuť PDF s odozvou na tlačidle
// ============================================================
export function RocnyVypis({ strankaId, meno, mobil, prispela }: { strankaId: string; meno: string; mobil: boolean;
  /** dary farnosti iným (doklad č.) */ prispela: { nazov: string; kto: string; cas: number; suma: number; vs?: string | number }[] }) {
  const vsetko = useDaryFarnosti(strankaId);
  const roky = [...new Set([...vsetko.map((x) => new Date(x.cas).getFullYear()), ...prispela.map((x) => new Date(x.cas).getFullYear())])].sort((a, b) => b - a);
  const [rok, setRok] = useState<number | null>(null);
  const r = rok ?? roky[0] ?? null;
  const [stav, setStav] = useState<"" | "busy" | "ok" | "chyba">("");
  const stiahni = async () => {
    if (r == null || stav === "busy") return;
    setStav("busy");
    try {
      await new Promise((ok) => window.setTimeout(ok, 50)); // prekreslenie „Pripravujem výpis …“
      const v = vsetko.filter((x) => new Date(x.cas).getFullYear() === r), pr = prispela.filter((x) => new Date(x.cas).getFullYear() === r);
      const spolu = v.reduce((a, x) => a + x.suma, 0), pocet = v.reduce((a, x) => a + x.darov, 0);
      const darcovia = new Set(v.filter((x) => x.kto).map((x) => x.kto)).size;
      const srv = await statistikyFarnosti(strankaId, new Date(r, 0, 1).getTime(), new Date(r + 1, 0, 1).getTime()); // podiel zo zbierok rodiny za rok (0107)
      const sum = (f: (x: Polozka) => boolean) => eur(v.filter(f).reduce((a, x) => a + x.suma, 0));
      const dalsie = [...new Set(v.filter((x) => x.zdroj === "dalsie").map((x) => x.zbierka ?? ""))];
      const riadky: RiadokPdf[] = [
        { t: `Ročný výpis ${r}`, tucne: true, velkost: 20 },
        { t: meno, tucne: true, velkost: 13, medzera: 4 },
        { t: `Dary cez DEED+ · vytvorené ${new Date().toLocaleDateString("sk-SK")}`, velkost: 10, medzera: 2 },
        { t: "VYZBIERANÉ PODĽA ZBIEROK", tucne: true, medzera: 14 },
        { t: "Hlavná zbierka", v: sum((x) => x.zdroj === "hlavna") },
        { t: "Zvončeková zbierka (pri omšiach)", v: sum((x) => x.zdroj === "zvoncek") },
        ...dalsie.map((z) => ({ t: z, v: sum((x) => x.zdroj === "dalsie" && x.zbierka === z) })),
        { t: "Spolu", v: eur(spolu), tucne: true },
        { t: "VYZBIERANÉ PODĽA MESIACOV", tucne: true, medzera: 14 },
        ...MES.map((m, i) => ({ t: `${m} ${r}`, v: sum((x) => new Date(x.cas).getMonth() === i) })),
        { t: "POČET DAROV A DARCOV", tucne: true, medzera: 14 },
        { t: "Počet darov", v: String(pocet) },
        { t: "Darcovia (registrovaní podľa mena, ostatní podľa darov)", v: String(darcovia + v.filter((x) => !x.kto).length) },
        // riadok bez údaja sa nevypíše (odpovede 18. 10.)
        ...(srv ? [{ t: "PODIEL FARNOSTI ZO ZBIEROK RODINY", tucne: true, medzera: 14 }, { t: "Pohreb, svadba · len podiel farnosti", v: eur(srv.podielRodiny) }] : []),
        { t: "DARY FARNOSTI INÝM", tucne: true, medzera: 14 },
        ...(pr.length ? pr.map((x) => ({ t: `${new Date(x.cas).toLocaleDateString("sk-SK")} · ${x.nazov} · ${x.kto}${x.vs ? ` · doklad č. ${x.vs}` : ""}`, v: eur(x.suma) })) : [{ t: "Žiadne." }]),
      ];
      stiahniBlob(textovePdf(riadky), `Rocny vypis ${r}.pdf`);
      setStav("ok");
    } catch { setStav("chyba"); }
  };
  const karta: CSSProperties = { borderRadius: mobil ? 18 : 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: mobil ? "14px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 12 };
  if (r == null) return <section style={karta}><b style={{ fontSize: 16 }}>Zatiaľ žiadne dary</b><span style={{ fontSize: 14, color: "var(--ink2)" }}>Výpis sa dá stiahnuť za rok, v ktorom farnosť dostala dar.</span></section>;
  return <section style={karta}>
    <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ROK</span>
    <div role="radiogroup" aria-label="Rok výpisu" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {roky.map((y) => { const on = y === r; return <button key={y} type="button" role="radio" aria-checked={on} onClick={() => { setRok(y); setStav(""); }} style={{ minHeight: 44, minWidth: 72, padding: "0 16px", borderRadius: 12, border: on ? "2px solid var(--green)" : "1.5px solid var(--cardBd)", background: on ? "var(--gSoft)" : "transparent", color: on ? "var(--gInk)" : "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, boxShadow: "none" }}>{y}</button>; })}
    </div>
    <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>VÝPIS OBSAHUJE</span>
    <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4, fontSize: 14.5, lineHeight: 1.45, color: "var(--ink)" }}>
      <li>Vyzbierané podľa zbierok a mesiacov</li><li>Počet darov a darcov</li><li>Podiel farnosti zo zbierok rodiny</li><li>Dary farnosti iným (s číslom dokladu)</li>
    </ul>
    {stav === "chyba" && <span role="alert" style={{ fontSize: 14, fontWeight: 700, color: "var(--cRed)" }}>Nepodarilo sa · <button type="button" onClick={() => void stiahni()} style={{ padding: 0, border: "none", background: "transparent", color: "var(--cRed)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, textDecoration: "underline", cursor: "pointer" }}>Skúsiť znova</button></span>}
    <button type="button" aria-busy={stav === "busy"} onClick={() => void stiahni()} style={{ alignSelf: "flex-start", minHeight: 52, padding: "0 22px", border: "none", borderRadius: 14, background: stav === "ok" ? "var(--green)" : "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" }}>
      {stav === "busy" ? "Pripravujem výpis …" : stav === "ok" ? `Stiahnuté ✓ · Ročný výpis ${r}.pdf` : "Stiahnuť PDF"}</button>
  </section>;
}
