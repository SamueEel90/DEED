// ============================================================
// KARTA 56D §6 · Správa zbierky farnosti po zapečatení (aj zbierky pre veriacich, OPRAVY 161).
// Smie len 2 veci: zmeniť rýchle sumy (EUR aj EURC, „Uložené ✓") a ukončiť (podržať → „Zbierka je ukončená").
// Záložky Štatistiky · Rýchle sumy · Ukončenie. Darcovia len menami, bez súm (sektor Viera: Bohu známy darca).
// Prototyp „Sprava farnosti - prvy prichod" → Zbierky → ťuk na zbierku.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SADY, SADY_EURC, upravZbierku, ukonciZbierku, cielCislo, type SpustenaZbierka } from "@/lib/novaZbierka";
import { darcoviaPre, identitaDarcu, relCas, useZmenyDarov } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { kartaK, nadpisK, textK, useZmenaSum } from "./spravaCasti";

const eur = (n: number) => `${n.toLocaleString("sk-SK")} €`;
const cis = (n: number) => n.toLocaleString("sk-SK");

/** stav a štítok zbierky v zozname (AKTÍVNA · NEAKTÍVNA · ZRUŠENÁ; pri veriacich predpona druhu) */
export function stitokZbierkyF(z: SpustenaZbierka): [string, string] {
  const st: [string, string] = z.stav === "ukoncena" || z.stav === "vyuctovana" ? ["ZRUŠENÁ", "#6B6C62"] : ["AKTÍVNA", "#4B7A35"];
  const druh = z.farnost?.druh;
  const pre = druh === "pohreb" ? "POHREB · " : druh === "svadba" ? "SVADBA · " : druh === "ine" ? "INÉ · " : "";
  return [pre + st[0], st[1]];
}
/** KARTA 56E §2b: celé rozdelenie zbierky s overovateľom v jednom riadku (príjemca · s kým sa podelil · farnosť) */
export function rozdelenieZbierkyF(z: SpustenaZbierka): string {
  const f = z.farnost; if (!f || f.druh === "farnost") return "na účet hlavnej zbierky";
  const kto = f.druh === "pohreb" ? "rodine" : f.druh === "svadba" ? "snúbencom" : "príjemcovi";
  const p = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("sk-SK")} %`;
  const podiel = f.podiel ?? 0, dal = (f.podelit ?? []).reduce((a, x) => a + x.pct, 0);
  const zv = Math.round((100 - podiel - dal) * 10) / 10;
  return [`${kto} ${f.podelit?.length && zv === 0 ? "0 % · všetko darované" : p(zv)}`, ...(f.podelit ?? []).map((x) => `${x.nazov} ${p(x.pct)}`), `farnosti ${p(podiel)}`].join(" · ");
}
export const fotoZbierky = (z: SpustenaZbierka) => z.media.find((m) => m.typ === "foto")?.src;

export function SpravaZbierkyFarnosti({ stranka, z, mobil, toast, onSpat }: {
  stranka: string; z: SpustenaZbierka; mobil: boolean; toast: (m: string) => void; onSpat: () => void;
}) {
  useZmenyDarov();
  const ja = usePouzivatel();
  const [tab, setTab] = useState(0);
  const [sada, setSada] = useState(z.sada);
  const [sadaE, setSadaE] = useState(z.sadaE);
  // OPRAVY 171: pri bežiacej zbierke sa rýchle sumy menia len podržaním (ťuk = koncept)
  const zm = useZmenaSum(sada, sadaE, z.eurc, (p) => {
    setSada(p.sada); setSadaE(p.sadaE);
    void upravZbierku(stranka, z.id, { popis: z.popis, popis2: z.popis2, media: z.media, eurc: z.eurc, sada: p.sada, sadaE: p.sadaE })
      .catch((e: Error) => toast(e.message));
  });

  const dary = darcoviaPre(z.id);
  const suma = dary.reduce((a, r) => a + r.suma, 0);
  const darcov = new Set(dary.map((r) => (r.moj ? "ja" : r.id))).size;
  const ciel = z.cielTyp === "ciel" ? cielCislo(z) : 0;
  const [chip, chipBg] = stitokZbierkyF(z);
  const podiel = rozdelenieZbierkyF(z);
  const foto = fotoZbierky(z);
  const aktivna = z.stav !== "ukoncena" && z.stav !== "vyuctovana";

  // ---- ukončenie: podržať 1,5 s ----
  const [drz, setDrz] = useState(false);
  const [hotovo, setHotovo] = useState(false);
  const ukTm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(ukTm.current), []);
  const zacni = () => { setDrz(true); window.clearTimeout(ukTm.current); ukTm.current = window.setTimeout(() => { setDrz(false); void ukonciZbierku(stranka, z.id).then(() => setHotovo(true)).catch((e: Error) => toast(e.message)); }, 1500); };
  const pusti = () => { window.clearTimeout(ukTm.current); setDrz(false); };

  const volby = (sady: [string, number[]][], cur: number, set: (i: number) => void, mena: string) => (
    <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
      {sady.map(([t, a], i) => { const on = cur === i; return (
        <button key={t} type="button" role="radio" aria-checked={on} onClick={() => set(i)} style={{ minHeight: 62, padding: "8px 14px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", gap: 2, color: "var(--ink)", boxShadow: "none" }}>
          <b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{a.map(cis).join(" · ")} {mena}</span>
        </button>); })}
    </div>);
  const ramec = ([k, v, d]: [string, string, string]) => (
    <div key={k} style={{ minWidth: 0, padding: "10px 12px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
      <b style={{ fontSize: 21, fontVariantNumeric: "tabular-nums" }}>{v}</b>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>{d}</span>
    </div>);
  const tabSt = (on: boolean): CSSProperties => ({ flex: "none", height: 48, padding: "0 16px", border: "none", borderBottom: `3px solid ${on ? "var(--green)" : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: on ? "var(--ink)" : "var(--ink3)", whiteSpace: "nowrap", boxShadow: "none" });

  return (<>
    <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", flex: "none", height: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>‹ Späť na zbierky</button>
    <section style={{ flex: "none", borderRadius: 20, border: "1px solid var(--cardBd)", background: "var(--card)", display: "flex", alignItems: "center", gap: 16, padding: "12px 18px 12px 12px" }}>
      <span style={{ position: "relative", overflow: "hidden", flex: "none", width: 96, height: 64, borderRadius: 12, background: "var(--field)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--ink3)" }}>{foto ? <img src={foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : "bez fotky"}</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ alignSelf: "flex-start", height: 24, padding: "0 9px", borderRadius: 7, background: chipBg, color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>{chip}</span>
        <b style={{ fontSize: 20, lineHeight: 1.2 }}>{z.nazov || "Zbierka"}</b>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{ciel ? `${eur(suma)} z ${eur(ciel)}` : eur(suma)} · cez DEED · {podiel}</span>
      </span>
    </section>
    <div role="tablist" aria-label="Správa zbierky" style={{ flex: "none", display: "flex", gap: 4, borderBottom: "1px solid var(--cardBd)", overflowX: "auto" }}>
      {["Štatistiky", "Rýchle sumy", "Ukončenie"].map((t, i) => <button key={t} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)} style={tabSt(tab === i)}>{t}</button>)}
    </div>

    {tab === 0 && <>
      <section style={kartaK}>
        <div style={{ display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 10 }}>
          {ramec(["Vyzbierané", ciel ? `${eur(suma)} z ${eur(ciel)}` : eur(suma), "cez DEED"])}
          {ramec(["Darcov", cis(darcov), darcov ? "ľudí darovalo" : "zatiaľ nikto"])}
          {/* PLACEBO — karta 56D: dar zatiaľ nenesie, či prišiel cez rýchle tlačidlo alebo vlastnú sumu */}
          {ramec(["Cez rýchle tlačidlá", "—", "pripravujeme"])}
          {ramec(["Cez vlastnú sumu", "—", "pripravujeme"])}
        </div>
      </section>
      <section style={kartaK}>
        <span style={nadpisK}>Darcovia</span>
        {dary.length ? dary.slice(0, 20).map((r, i) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <b style={{ flex: 1, minWidth: 0, fontSize: 14.5 }}>{identitaDarcu(r, ja, "viera")}</b>
            <span style={{ flex: "none", fontSize: 13, color: "var(--ink3)" }}>{relCas(r.cas)}</span>
          </div>))
          : <span style={textK}>Zatiaľ žiadne dary. Mená sa ukážu bez súm, bez mena ako Bohu známy darca.</span>}
      </section>
    </>}

    {tab === 1 && <section style={kartaK}>
      <span style={textK}>Zbierka je zapečatená. Zmeniť sa dajú už len rýchle sumy, napríklad keď ste na začiatku dali príliš vysoké.</span>
      <span style={nadpisK}>Rýchle sumy v eurách</span>
      {volby(SADY, zm.nova.sada, (i) => zm.vyber({ sada: i }), "€")}
      {z.eurc && <>
        <span style={{ ...nadpisK, marginTop: 6 }}>Rýchle sumy v EURC</span>
        {volby(SADY_EURC, zm.nova.sadaE, (i) => zm.vyber({ sadaE: i }), "EURC")}
      </>}
      {zm.karta}
    </section>}

    {tab === 2 && (hotovo || !aktivna ? (
      // key: po podržaní sa karta vymení za novú, aby pustenie prsta nestlačilo „Hotovo" na tom istom mieste
      <section key="ukoncena" role="status" style={{ ...kartaK, background: "var(--gSoft)", border: "2px solid var(--green)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
          <b style={{ fontSize: 17 }}>Zbierka je ukončená</b>
        </span>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Dary sem už nechodia. Počítadlo ostáva na profile viditeľné.</span>
        <button type="button" onClick={onSpat} style={{ height: 52, border: "none", borderRadius: 15, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Hotovo · späť na zbierky</button>
      </section>
    ) : (
      <section key="ukoncit" style={kartaK}>
        <span style={nadpisK}>Ukončiť zbierku</span>
        <span style={textK}>Zbierka sa zastaví a dary sem prestanú chodiť. Počítadlo ostane na profile viditeľné aj po ukončení. Vrátiť to späť sa nedá.</span>
        <button type="button" onPointerDown={(e) => { e.preventDefault(); zacni(); }} onPointerUp={pusti} onPointerLeave={pusti} onPointerCancel={pusti} onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); zacni(); } }} onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") pusti(); }}
          style={{ position: "relative", height: 58, border: "none", borderRadius: 16, background: "#7A3A2C", overflow: "hidden", cursor: "pointer", touchAction: "none", userSelect: "none", fontFamily: "inherit" } as CSSProperties}>
          <span style={{ position: "absolute", inset: 0, background: "#A34A2A", transformOrigin: "0 50%", transform: `scaleX(${drz ? 1 : 0})`, transition: `transform ${drz ? "1.5s" : ".2s"} linear` }} />
          <span style={{ position: "relative", fontSize: 16, fontWeight: 800, color: "#fff" }}>{drz ? "Držte…" : "Podržte a ukončite"}</span>
        </button>
        <span style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>Držte prst na tlačidle, kým sa nenaplní.</span>
      </section>))}
  </>);
}
