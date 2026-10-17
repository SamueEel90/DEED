// ============================================================
// KARTA 56D §6 · Správa zbierky farnosti po zapečatení (aj zbierky pre veriacich, OPRAVY 161).
// Smie zmeniť rýchle sumy, ukončiť a (farár, OPRAVY 222 B) vložiť vlastné peniaze. Pôvodne: zmeniť rýchle sumy (EUR aj EURC, „Uložené ✓") a ukončiť (podržať → „Zbierka je ukončená").
// Záložky Štatistiky · Rýchle sumy · Ukončenie. Darcovia len menami, bez súm (sektor Viera: Bohu známy veriaci).
// OPRAVY 314: Štatistiky · Upraviť zbierku (text, fotky, rýchle sumy — „Uložené ✓“ pri poli, pás dole) · Ukončenie a poďakovanie
// (poďakovanie v tom istom TextovePolia + fotky ako to dopadlo, Poslať darcom Áno · Nie, Uložiť poďakovanie / Podržte a ukončite s poďakovaním).
// Prototyp „Sprava farnosti - prvy prichod" → Zbierky → ťuk na zbierku.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { SADY, SADY_EURC, upravZbierku, ukonciZbierku, cielCislo, type SpustenaZbierka } from "@/lib/novaZbierka";
import { darcoviaPre, identitaDarcu, relCas, useZmenyDarov } from "@/lib/darcovia";
import { usePouzivatel } from "@/lib/pouzivatel";
import { kartaK, nadpisK, textK, useZmenaSum, useUkladanie, UlozenePri, PasUlozene } from "./spravaCasti";
import { TextovePolia, GaleriaEditor, cistyText } from "./obsahZbierky";
import { AnoNie } from "@/components/AnoNie";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { nacitajStav, ulozStavIsto, useZmenySpravy, type StavZbierky, type PodakovanieZbierky } from "@/lib/zbierkaSprava";
import { pridajOznamDarcom } from "@/lib/oznamyDarcom";
import { PodrzZmaz } from "@/components/HromadnyVyber";
import { VlastnePeniaze } from "./VlastnePeniaze";
import { SumyPriDarcoch } from "./SumyPriDarcoch";
import { sumaEur } from "@/lib/suma";
import { PostupZbierky } from "./PostupZbierky";

const eur = (n: number) => `${sumaEur(n)}`;
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

export function SpravaZbierkyFarnosti({ stranka, z, mobil, toast, onSpat, menoStranky }: {
  stranka: string; z: SpustenaZbierka; mobil: boolean; toast: (m: string) => void; onSpat: () => void; /** názov farnosti (Potvrdené · … od Farnosti …) */ menoStranky?: string;
}) {
  useZmenyDarov();
  const ja = usePouzivatel();
  const [tab, setTab] = useState(0);
  // OPRAVY 314: Upraviť zbierku — text, fotky a rýchle sumy sa ukladajú samy, pri poli „Uložené ✓“
  const u = useUkladanie();
  const [ob, setOb] = useState({ popis: z.popis, popis2: z.popis2, media: z.media, eurc: z.eurc, sada: z.sada, sadaE: z.sadaE });
  const obRef = useRef(ob);
  const polia = useRef(new Set<string>());
  const prvy = useRef(true);
  useEffect(() => { obRef.current = ob; }, [ob]);
  useEffect(() => {
    if (prvy.current) { prvy.current = false; return; }
    const t = window.setTimeout(() => { const pl = [...polia.current]; polia.current.clear(); u.sleduj(pl, upravZbierku(stranka, z.id, ob), () => upravZbierku(stranka, z.id, obRef.current)); }, 600);
    return () => window.clearTimeout(t);
  }, [ob]); // eslint-disable-line react-hooks/exhaustive-deps
  const zmenOb = (p: Partial<typeof ob>, pole: string) => { polia.current.add(pole); setOb((x) => ({ ...x, ...p })); };
  // OPRAVY 171: pri bežiacej zbierke sa rýchle sumy menia len podržaním (ťuk = koncept)
  const zm = useZmenaSum(ob.sada, ob.sadaE, ob.eurc, (p) => zmenOb({ sada: p.sada, sadaE: p.sadaE }, "sumy"));

  const dary = darcoviaPre(z.id);
  const suma = dary.reduce((a, r) => a + r.suma, 0);
  const darcov = new Set(dary.map((r) => (r.moj ? "ja" : r.id))).size;
  const ciel = z.cielTyp === "ciel" ? cielCislo(z) : 0;
  const [chip, chipBg] = stitokZbierkyF(z);
  const podiel = rozdelenieZbierkyF(z);
  const foto = fotoZbierky(z);
  const aktivna = z.stav !== "ukoncena" && z.stav !== "vyuctovana";
  const zbFarnosti = (z.farnost?.druh ?? "farnost") === "farnost";

  // ---- OPRAVY 314: Ukončenie a poďakovanie — poďakovanie je v správe zbierky (zbierka_sprava, 0083b), na stránke pri ukončenej zbierke ----
  useZmenySpravy();
  const [hotovo, setHotovo] = useState(false);
  const stav0 = (): StavZbierky => nacitajStav(z.id) ?? { stav: aktivna ? "aktivna" : "ukoncena", koniec: z.koniec ?? new Date().toISOString(), predlzenia: 0, lehota: "30", text: "", fotky: [], doklady: [], spravy: [] };
  const ulozeneDak = nacitajStav(z.id)?.podakovanie;
  const [dak, setDak] = useState<PodakovanieZbierky>(() => ulozeneDak ?? { popis: "", popis2: "", media: [] });
  const [poslat, setPoslat] = useState(true);
  const [dakSprava, setDakSprava] = useState<{ ok: boolean; t: string } | null>(null);
  const [dakUklada, setDakUklada] = useState(false);
  const zmenDak = (p: Partial<PodakovanieZbierky>) => { setDakSprava(null); setDak((x) => ({ ...x, ...p })); };
  const plneDak = !!cistyText(dak.popis) || !!cistyText(dak.popis2) || dak.media.length > 0;
  // Martin 15. 10.: ukončená zbierka s poďakovaním je na stránke, kým ju farár nezmaže (v Archíve ostáva)
  const naStranke = !aktivna && !!ulozeneDak?.ulozene && !ulozeneDak.zmazane;
  const zmazZoStranky = async () => {
    const st = stav0(); if (!st.podakovanie) return;
    const e = await ulozStavIsto(z.id, { ...st, podakovanie: { ...st.podakovanie, zmazane: new Date().toISOString() } });
    setDakSprava(e ? { ok: false, t: `Neuložilo sa. ${e}` } : { ok: true, t: "Zbierka už nie je na stránke farnosti ✓ V Archíve ostáva aj s poďakovaním." });
  };
  const opakDak = useRef<(() => void) | null>(null);
  const [dakZnova, setDakZnova] = useState(true);
  const ulozDak = async (ukoncit: boolean) => {
    if (dakUklada) return;
    opakDak.current = () => { void ulozDak(ukoncit); }; setDakZnova(true);
    if (!plneDak && !ukoncit) { opakDak.current = null; setDakZnova(false); setDakSprava({ ok: false, t: "Poďakovanie je prázdne. Napíšte poďakovanie alebo pridajte fotky." }); return; }
    setDakUklada(true); setDakSprava(null);
    const st = stav0(), teraz = new Date().toISOString();
    const posli = plneDak && poslat && !st.podakovanie?.poslane;
    if (plneDak) {
      const e = await ulozStavIsto(z.id, { ...st, podakovanie: { ...dak, ulozene: teraz, poslane: st.podakovanie?.poslane ?? (posli ? teraz : undefined), zmazane: st.podakovanie?.zmazane } });
      if (e) { setDakUklada(false); setDakSprava({ ok: false, t: `Neuložilo sa. ${e}` }); return; }
      // upozornenie každému darcovi (raz) — oznam_darcom (0081b)
      if (posli) pridajOznamDarcom({ zbierkaId: z.id, typ: "vysledok", text: `Poďakovanie · ${z.nazov || "zbierka"}: ${cistyText(dak.popis || dak.popis2).slice(0, 300)}` });
    }
    if (ukoncit) {
      try { await ukonciZbierku(stranka, z.id); setHotovo(true); } catch (e) { setDakSprava({ ok: false, t: e instanceof Error ? e.message : "Zbierku sa nepodarilo ukončiť." }); }
    } else setDakSprava({ ok: true, t: `Poďakovanie je uložené ✓${aktivna ? " Na stránke sa ukáže, keď zbierku ukončíte." : ulozeneDak?.zmazane ? "" : " Je na stránke farnosti pri zbierke."}${posli ? " Darcovia dostali upozornenie." : ""}` });
    setDakUklada(false);
  };

  // OPRAVY 314: menšie karty (výška ~48 px), tri vedľa seba
  const volby = (sady: [string, number[]][], cur: number, set: (i: number) => void, mena: string, od = 0, label = "Rýchle sumy") => (
    <div role="radiogroup" aria-label={label} style={{ display: "grid", gridTemplateColumns: `repeat(${sady.length},minmax(0,1fr))`, gap: 8 }}>
      {sady.map(([t, a], i0) => { const i = i0 + od, on = cur === i; return (
        <button key={t} type="button" role="radio" aria-checked={on} onClick={() => set(i)} style={{ minHeight: 48, minWidth: 0, padding: "6px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, color: "var(--ink)", boxShadow: "none",
          border: on ? "1.5px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--card)" }}>
          <b style={{ fontSize: 13.5 }}>{t}{on ? " ✓" : ""}</b><span style={{ fontSize: 12, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.map(cis).join(" · ")}{mena === "€" ? " €" : ""}</span>
        </button>); })}
    </div>);
  const ramec = ([k, v, d]: [string, string, string]) => (
    <div key={k} style={{ minWidth: 0, padding: "10px 12px", borderRadius: 14, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink3)" }}>{k}</span>
      <b style={{ fontSize: 21, fontVariantNumeric: "tabular-nums" }}>{v}</b>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink3)" }}>{d}</span>
    </div>);
  const tabSt = (on: boolean): CSSProperties => ({ flex: "none", height: 48, padding: "0 16px", border: "none", borderBottom: `3px solid ${on ? "var(--green)" : "transparent"}`, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: on ? "var(--ink)" : "var(--ink3)", whiteSpace: "nowrap", boxShadow: "none" });
  const poslane = ulozeneDak?.poslane;
  const datumK = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

  return (<>
    <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", flex: "none", height: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>‹ Späť na zbierky</button>
    <section style={{ flex: "none", borderRadius: 20, border: "1px solid var(--cardBd)", background: "var(--card)", display: "flex", alignItems: "center", gap: 16, padding: "12px 18px 12px 12px" }}>
      <span style={{ position: "relative", overflow: "hidden", flex: "none", width: 96, height: 64, borderRadius: 12, background: "var(--field)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--ink3)" }}>{foto ? <img src={foto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : "bez fotky"}</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ alignSelf: "flex-start", height: 24, padding: "0 9px", borderRadius: 7, background: chipBg, color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", display: "flex", alignItems: "center" }}>{chip}</span>
        <b style={{ fontSize: 20, lineHeight: 1.2 }}>{z.nazov || "Zbierka"}</b>
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{ciel ? `${eur(suma)} z ${eur(ciel)}` : eur(suma)} · cez DEED+ · {podiel}</span>
      </span>
    </section>
    <div role="tablist" aria-label="Správa zbierky" style={{ flex: "none", display: "flex", gap: 4, borderBottom: "1px solid var(--cardBd)", overflowX: "auto" }}>
      {/* OPRAVY 332: Ako to pokračuje — len zbierka farnosti (rodiny nie, Hlavná má vlastnú Správu) */}
      {([[0, "Štatistiky"], [1, "Upraviť zbierku"], ...(zbFarnosti ? [[3, "Ako to pokračuje"]] : []), [2, "Ukončenie a poďakovanie"]] as [number, string][]).map(([i, t]) => <button key={t} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)} style={tabSt(tab === i)}>{t}</button>)}
    </div>

    {tab === 0 && <>
      {/* OPRAVY 222 · B: vlastné peniaze do vlastnej zbierky (len farár, zbierka s vlastným účtom) */}
      {aktivna && (z.farnost?.druh ?? "farnost") === "farnost" && !!z.ucet && <VlastnePeniaze stranka={stranka} menoStranky={menoStranky ?? "Farnosť"} refId={z.id} toast={toast} />}
      <section style={kartaK}>
        {/* OPRAVY 311: len skutočné súčty zo servera; Cez rýchle tlačidlá / vlastnú sumu skryté, kým dar nenesie, odkiaľ prišiel */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          {ramec(["Vyzbierané", ciel ? `${eur(suma)} z ${eur(ciel)}` : eur(suma), "cez DEED+"])}
          {ramec(["Darcov", cis(darcov), darcov ? "ľudí darovalo" : "zatiaľ nikto"])}
        </div>
      </section>
      {/* Martin 13. 10.: sumy pri darcoch zapína farár (len zbierka farnosti; súkromné nikdy) */}
      {(z.farnost?.druh ?? "farnost") === "farnost" && <section style={kartaK}><SumyPriDarcoch stranka={stranka} kluc={z.id} /></section>}
      <section style={kartaK}>
        <span style={nadpisK}>Darcovia</span>
        {dary.length ? dary.slice(0, 20).map((r, i) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 48, borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
            <b style={{ flex: 1, minWidth: 0, fontSize: 14.5 }}>{identitaDarcu(r, ja, "viera")}</b>
            <span style={{ flex: "none", fontSize: 13, color: "var(--ink3)" }}>{relCas(r.cas)}</span>
          </div>))
          : <span style={textK}>Zatiaľ žiadne dary. Mená sa ukážu bez súm, bez mena ako Bohu známy veriaci.</span>}
      </section>
    </>}

    {/* OPRAVY 314 (A): Upraviť zbierku — tie isté TextovePolia a GaleriaEditor ako pri tvorbe */}
    {tab === 1 && <>
      <span style={{ ...textK, padding: "0 2px" }}>Zbierka je zapečatená: cieľ a účet sa nemenia. Text, fotky a rýchle sumy môžete upravovať kedykoľvek.</span>
      <section style={kartaK}>
        <span style={nadpisK}>Text pre darcov</span>
        <TextovePolia popis={ob.popis} popis2={ob.popis2} onPopis={(h) => zmenOb({ popis: h }, "text")} onPopis2={(h) => zmenOb({ popis2: h }, "text")} ph={mobil} popisHlavneho="Toto ľudia uvidia pri zbierke hneď. Najviac 12 riadkov." />
        <UlozenePri u={u} pole="text" />
      </section>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <GaleriaEditor media={ob.media} onMedia={(m) => zmenOb({ media: m }, "fotky")} ph={mobil} nadpis="Fotky" popisNapoveda="Popis (nepovinné)" dovetok=" Prvá fotka je hlavná. Pod fotku môžete napísať popis." />
        <UlozenePri u={u} pole="fotky" style={{ paddingRight: 8 }} />
      </div>
      <section style={kartaK}>
        <span style={nadpisK}>Rýchle sumy v eurách</span>
        {volby(SADY, zm.nova.sada, (i) => zm.vyber({ sada: i }), "€", 0, "Rýchle sumy v eurách")}
        {ob.eurc && <>
          <span style={{ ...nadpisK, marginTop: 6 }}>Rýchle sumy v EURC</span>
          {/* KARTA 57C §5: zbierka rodiny (pohreb, svadba, iné) — EURC len Drobné a Stredné, bez Mikro */}
          {(z.farnost?.druh ?? "farnost") === "farnost" ? volby(SADY_EURC, zm.nova.sadaE, (i) => zm.vyber({ sadaE: i }), "EURC", 0, "Rýchle sumy v EURC") : volby(SADY_EURC.slice(1), zm.nova.sadaE, (i) => zm.vyber({ sadaE: i }), "EURC", 1, "Rýchle sumy v EURC")}
        </>}
        {zm.karta}
        <UlozenePri u={u} pole="sumy" />
      </section>
      <PasUlozene u={u} onSpat={onSpat} mobil={mobil} />
    </>}

    {tab === 3 && zbFarnosti && <PostupZbierky z={z} aktivna={aktivna} mobil={mobil} />}

    {/* OPRAVY 314 (B): Ukončenie a poďakovanie */}
    {tab === 2 && (hotovo ? (
      // key: po podržaní sa karta vymení za novú, aby pustenie prsta nestlačilo „Hotovo" na tom istom mieste
      <section key="ukoncena" role="status" style={{ ...kartaK, background: "var(--gSoft)", border: "2px solid var(--green)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
          <b style={{ fontSize: 17 }}>Zbierka je ukončená</b>
        </span>
        <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>{plneDak ? "Dary sem už nechodia. Na stránke farnosti je zbierka s vaším poďakovaním." : "Dary sem už nechodia. Počítadlo ostáva na profile viditeľné. Poďakovanie môžete doplniť neskôr z Archívu."}</span>
        <button type="button" onClick={onSpat} style={{ height: 52, border: "none", borderRadius: 15, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Hotovo · späť na zbierky</button>
      </section>
    ) : (
      <section key="podakovanie" style={{ ...kartaK, gap: 16 }}>
        <b style={{ fontSize: 22, letterSpacing: "-.02em" }}>Poďakujte darcom</b>
        <span style={textK}>{aktivna ? "Napíšte, na čo ste peniaze použili, a pridajte fotky. Ukáže sa na stránke pri ukončenej zbierke." : `Zbierka je ukončená${z.koniec ? ` ${datumK(z.koniec)}` : ""}. Napíšte, na čo ste peniaze použili, a pridajte fotky. Ukáže sa na stránke pri zbierke.`}</span>
        <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--field)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><span style={{ fontSize: 14, color: "var(--ink3)" }}>Vyzbierané</span><b>{eur(suma)} · {darcov} {darcov === 1 ? "darca" : darcov >= 2 && darcov <= 4 ? "darcovia" : "darcov"}</b></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={nadpisK}>Na čo sme peniaze použili · čo sme urobili · komu ďakujeme</span>
          <TextovePolia popis={dak.popis} popis2={dak.popis2} onPopis={(h) => zmenDak({ popis: h })} onPopis2={(h) => zmenDak({ popis2: h })} ph={mobil}
            popisHlavneho="Najviac 12 riadkov, ľudia ho uvidia hneď." placeholder="Ďakujeme. Za vaše dary sme kúpili…"
            nadpis2="Pokračovanie" popis2Text="Čo všetko sme urobili, komu ďakujeme — ľuďom, firmám, sponzorom. Ukáže sa po „… viac“." placeholder2="Ukáže sa po „… viac“." />
        </div>
        <GaleriaEditor media={dak.media} onMedia={(m) => zmenDak({ media: m })} ph={mobil} bezVidea nadpis="Fotky · ako to dopadlo" popisNapoveda="Popis (nepovinné)" dovetok="" />
        {poslane ? <span style={{ fontSize: 14, fontWeight: 700, color: "var(--gInk)" }}>Darcom sme poslali upozornenie {datumK(poslane)}.</span>
          : <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", minHeight: 52 }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>Poslať poďakovanie darcom</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>každý darca dostane upozornenie</span></span>
            <AnoNie value={poslat} onChange={setPoslat} label="Poslať poďakovanie darcom" />
          </div>}
        {dakSprava?.ok && <span role="status" style={{ padding: "12px 14px", borderRadius: 14, fontSize: 14.5, fontWeight: 800, lineHeight: 1.45, background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--gInk)" }}>{dakSprava.t}</span>}
        {/* OPRAVY 335: chyba priamo nad tlačidlami (na mobile aj okno) */}
        <ChybaPriTlacidle text={dakSprava && !dakSprava.ok ? dakSprava.t.replace(/^Neuložilo sa\.\s*/, "") : null} uklada={dakUklada} onZnova={dakZnova ? () => opakDak.current?.() : undefined} />
        {aktivna ? <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "1fr 1fr", gap: 10, alignItems: "stretch" }}>
          <button type="button" disabled={dakUklada} onClick={() => void ulozDak(false)} style={{ minHeight: 60, padding: "6px 14px", borderRadius: 16, border: "1.5px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, boxShadow: "none" }}>
            <b style={{ fontSize: 15 }}>Uložiť poďakovanie</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>zbierka beží ďalej</span></button>
          <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={plneDak ? "Podržte a ukončite s poďakovaním" : "Podržte a ukončite"} trvanie={1500} disabled={dakUklada} onConfirm={() => { void ulozDak(true); }} /></div>
        </div> : <button type="button" disabled={dakUklada} onClick={() => void ulozDak(false)} style={{ minHeight: 56, border: "none", borderRadius: 16, background: "var(--green)", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#fff", boxShadow: "none" }}>Uložiť poďakovanie</button>}
        {naStranke && <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--cardBd)" }}>
          <b style={{ fontSize: 15 }}>Zbierka je na stránke farnosti s poďakovaním</b>
          <span style={textK}>Nechajte ju tam, koľko chcete. Keď ju zmažete zo stránky, v Archíve ostane aj s poďakovaním.</span>
          <div><PodrzZmaz label="Podržte a zmažte zo stránky" onZmaz={() => { void zmazZoStranky(); }} /></div>
        </div>}
        <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)" }}>{aktivna ? "Ukončenie sa nedá vrátiť: dary sem prestanú chodiť, počítadlo ostane na stránke. " : ""}Poďakovanie sa dá doplniť aj neskôr, keď už je zbierka v Archíve (napríklad keď je oprava hotová).</span>
      </section>))}
  </>);
}
