// KARTA 55 · E — Správa zbierky → záložka Príbeh.
// 1 krátky text do feedu (počítadlo riadkov, najviac 3) · 2 celý príbeh (6 000 znakov) · 3 fotky a video s popisom (GaleriaEditor)
// 4 citát (veta, meno, vzťah, súhlas povinný, ak je citát) · 5 priebeh (+ Pridať zápis, darcovia dostanú upozornenie)
// 6 Príbeh týždňa (zapnutie vypne iný). Ukladá sa samo ako koncept; na stránke až po „Zverejniť príbeh".
// Mobil: 6 riadkov s číslom (zelené = vyplnené), ťuk otvorí krok.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RichTextInput } from "@/components/richtext";
import { cistyText } from "@/lib/richtext";
import { pridajOznamDarcom } from "@/lib/oznamyDarcom";
import { najdiTestProfil, type TestZbierka } from "@/lib/testProfily";
import {
  pribehNaUpravu, ulozKonceptPribehu, zverejniPribeh, pridajZapisPriebehu, jePribehTyzdna, nastavPribehTyzdna, orgPribehu,
  useZmenyPribehov, PRIBEH_ZNAKOV, PRIBEH_RIADKOV, type Pribeh,
} from "@/lib/pribehZbierky";
import { PribehZbierky } from "@/features/verejny-profil/PribehZbierky";
import { GaleriaEditor, NASTROJE, pozn } from "./obsahZbierky";
import { kartaK, nadpisK, textK, obrysK, zelenyK } from "./spravaCasti";
import type { ZbierkaNaSpravu } from "./SpravaZbierky";

const pole: CSSProperties = { width: "100%", minHeight: 48, padding: "0 14px", borderRadius: 12, border: "1px solid #CFC9BC", background: "var(--field, var(--card))", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, boxSizing: "border-box" };
const KROKY = ["Krátky text do feedu", "Celý príbeh", "Fotky a video", "Citát", "Priebeh", "Príbeh týždňa"] as const;
const dnes = () => new Date().toISOString().slice(0, 10);
const datumSk = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

export function PribehEditor({ z, mobil, toast }: { z: ZbierkaNaSpravu; mobil: boolean; toast: (m: string) => void }) {
  useZmenyPribehov();
  const org = orgPribehu(z.id);
  const start = pribehNaUpravu(z.id);
  const [p, setP] = useState<Pribeh>(start.pribeh);
  const [zmenene, setZmenene] = useState(false);
  const [krok, setKrok] = useState<number | null>(null);
  const [nahlad, setNahlad] = useState(false);
  const [riadky, setRiadky] = useState(0);
  const [znaky, setZnaky] = useState(0);
  const [novy, setNovy] = useState({ datum: dnes(), nadpis: "", text: "" });
  const stav = pribehNaUpravu(z.id);
  // koncept sa ukladá sám (pamäť hneď, databáza po 0,8 s bez písania)
  const casovac = useRef<number>();
  const vrchKroku = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (krok !== null) vrchKroku.current?.scrollIntoView({ block: "start" }); }, [krok]);
  useEffect(() => {
    if (!zmenene) return;
    window.clearTimeout(casovac.current);
    casovac.current = window.setTimeout(() => ulozKonceptPribehu(z.id, org, p), 800);
    return () => window.clearTimeout(casovac.current);
  }, [p, zmenene, z.id, org]);
  const uprav = (patch: Partial<Pribeh>) => { setP((x) => ({ ...x, ...patch })); setZmenene(true); };

  const vyplnene = [
    !!p.kratky.trim(), !!cistyText(p.text).trim(), p.media.length > 0,
    !!p.citat.text.trim() && p.citat.suhlas, p.priebeh.length > 0, jePribehTyzdna(z.id, org),
  ];
  const citatBezSuhlasu = !!p.citat.text.trim() && !p.citat.suhlas;
  const dlhyKratky = riadky > PRIBEH_RIADKOV;
  const mozeZverejnit = !!p.kratky.trim() && !!cistyText(p.text).trim() && !citatBezSuhlasu && !dlhyKratky && (zmenene || stav.koncept || !stav.zverejneny);
  const zverejni = () => {
    window.clearTimeout(casovac.current);
    ulozKonceptPribehu(z.id, org, p); zverejniPribeh(z.id, org); setZmenene(false);
    toast("Príbeh je zverejnený");
  };
  const pridajZapis = () => {
    if (!novy.nadpis.trim()) return;
    const zapis = { id: `zp-${Date.now()}`, datum: novy.datum || dnes(), nadpis: novy.nadpis.trim(), text: novy.text.trim() };
    window.clearTimeout(casovac.current);
    if (zmenene) ulozKonceptPribehu(z.id, org, p);
    const naStranke = pridajZapisPriebehu(z.id, org, zapis);
    setP((x) => ({ ...x, priebeh: [zapis, ...x.priebeh] }));
    if (naStranke) pridajOznamDarcom({ zbierkaId: z.id, typ: "sprava", text: `${zapis.nadpis}. ${zapis.text}`.trim() });
    setNovy({ datum: dnes(), nadpis: "", text: "" });
    toast(naStranke ? "Zápis je na stránke. Darcovia dostali upozornenie." : "Zápis je v koncepte. Darcovia dostanú upozornenie pri ďalšom zápise po zverejnení.");
  };
  const tyzdna = jePribehTyzdna(z.id, org);
  const prepniTyzdna = () => {
    const vyp = nastavPribehTyzdna(z.id, org, !tyzdna);
    toast(!tyzdna ? (vyp ? "Príbeh týždňa je teraz tento. Pri inej zbierke sa vypol." : "Príbeh týždňa je zapnutý") : "Príbeh týždňa je vypnutý");
  };

  const telo = (i: number): ReactNode => {
    if (i === 0) return <>
      <span style={textK}>Ukáže sa vo feede pod fotkou a hore v príbehu tučne. Najviac 3 riadky.</span>
      <RichTextInput vzhlad="sprava" value={p.kratky} onChange={(h) => uprav({ kratky: cistyText(h) })} nastroje={[]} minH={90} chybaRam={dlhyKratky}
        ariaLabel="Krátky text do feedu" tvrdyLimit={320} onRiadky={setRiadky} />
      <span style={{ fontSize: 13, fontWeight: 800, color: dlhyKratky ? "#A34A2A" : "var(--green)" }}>{riadky} z {PRIBEH_RIADKOV} riadkov{dlhyKratky ? " · skráťte ho, vo feede sa neukáže celý" : ""}</span>
    </>;
    if (i === 1) return <>
      <span style={textK}>Celý prípad: čo sa stalo, komu pomáhate, na čo presne idú peniaze a dokedy.</span>
      <RichTextInput vzhlad="sprava" value={p.text} onChange={(h) => uprav({ text: h })} nastroje={NASTROJE} minH={220}
        ariaLabel="Celý príbeh" tvrdyLimit={PRIBEH_ZNAKOV} onZnaky={setZnaky} />
      <span style={{ ...pozn, fontWeight: 800, alignSelf: "flex-end" }}>{znaky.toLocaleString("sk-SK")} / {PRIBEH_ZNAKOV.toLocaleString("sk-SK")}</span>
    </>;
    if (i === 2) return <GaleriaEditor media={p.media} onMedia={(m) => uprav({ media: m })} ph={false} nadpis="Fotky a video" dovetok=" Pod fotkou môžete napísať popis." />;
    if (i === 3) return <>
      <span style={textK}>Nepovinné. Jedna veta človeka, ktorému pomáhate.</span>
      <input style={pole} value={p.citat.text} onChange={(e) => uprav({ citat: { ...p.citat, text: e.target.value } })} placeholder="Veta" aria-label="Citát" maxLength={200} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input style={{ ...pole, flex: "1 1 180px", width: "auto" }} value={p.citat.meno} onChange={(e) => uprav({ citat: { ...p.citat, meno: e.target.value } })} placeholder="Meno" aria-label="Meno" maxLength={60} />
        <input style={{ ...pole, flex: "1 1 140px", width: "auto" }} value={p.citat.vztah} onChange={(e) => uprav({ citat: { ...p.citat, vztah: e.target.value } })} placeholder="Vzťah, napríklad mama" aria-label="Vzťah" maxLength={40} />
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, minHeight: 44, cursor: "pointer", fontSize: 14.5, lineHeight: 1.45, color: "var(--ink)" }}>
        <input type="checkbox" checked={p.citat.suhlas} onChange={(e) => uprav({ citat: { ...p.citat, suhlas: e.target.checked } })} style={{ width: 22, height: 22, marginTop: 1, accentColor: "#4B7A35", flex: "none" }} />
        <span>Tento človek súhlasí so zverejnením citátu aj mena.</span>
      </label>
      {citatBezSuhlasu && <span style={{ fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>Bez súhlasu sa príbeh s citátom nedá zverejniť. Súhlas zaškrtnite, alebo citát vymažte.</span>}
    </>;
    if (i === 4) return <>
      <span style={textK}>Čo sa odvtedy stalo. Najnovší zápis je navrchu. Keď je príbeh zverejnený, darcovia dostanú upozornenie.</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, border: "1px dashed var(--cardBd)" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input type="date" style={{ ...pole, flex: "0 0 170px", width: "auto" }} value={novy.datum} onChange={(e) => setNovy({ ...novy, datum: e.target.value })} aria-label="Dátum" />
          <input style={{ ...pole, flex: "1 1 200px", width: "auto" }} value={novy.nadpis} onChange={(e) => setNovy({ ...novy, nadpis: e.target.value })} placeholder="Čo sa stalo, napríklad Krov stojí" aria-label="Nadpis zápisu" maxLength={80} />
        </div>
        <textarea style={{ ...pole, minHeight: 90, padding: "12px 14px", resize: "vertical", lineHeight: 1.5 }} value={novy.text} onChange={(e) => setNovy({ ...novy, text: e.target.value })} placeholder="Pár viet pre darcov" aria-label="Text zápisu" maxLength={400} />
        <button type="button" onClick={pridajZapis} disabled={!novy.nadpis.trim()} style={{ ...obrysK, opacity: novy.nadpis.trim() ? 1 : .5 }}>+ Pridať zápis</button>
      </div>
      {p.priebeh.map((r, j) => (
        <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 14, borderLeft: `3px solid ${j === 0 ? "var(--gold)" : "var(--cardBd)"}` }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: j === 0 ? "var(--gold)" : "var(--ink3)" }}>{datumSk(r.datum)}</span>
          <b style={{ fontSize: 15 }}>{r.nadpis}</b>
          {r.text && <span style={textK}>{r.text}</span>}
        </div>))}
    </>;
    return <>
      <span style={textK}>Jeden príbeh navrchu profilu organizácie. Zapnutie tu vypne Príbeh týždňa pri inej zbierke.</span>
      <button type="button" role="switch" aria-checked={tyzdna} onClick={prepniTyzdna}
        style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", boxShadow: "none", alignSelf: "flex-start" }}>
        <span style={{ width: 52, height: 30, borderRadius: 15, background: tyzdna ? "#4B7A35" : "var(--track)", position: "relative", flex: "none" }}>
          <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", transform: `translateX(${tyzdna ? 22 : 0}px)`, transition: "transform .2s ease" }} />
        </span>
        {tyzdna ? "Príbeh týždňa je zapnutý" : "Príbeh týždňa je vypnutý"}
      </button>
    </>;
  };

  const stavText = zmenene || stav.koncept ? (stav.zverejneny ? "Koncept sa ukladá sám. Zmeny sa na stránke ukážu po zverejnení." : "Koncept sa ukladá sám. Na stránke sa ukáže po zverejnení.") : stav.zverejneny ? "Príbeh je zverejnený." : "Príbeh zatiaľ nemáte. Je dobrovoľný.";
  const hlavicka = (
    <section style={{ ...kartaK, flexDirection: mobil ? "column" : "row", alignItems: mobil ? "stretch" : "center", justifyContent: "space-between" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <b style={nadpisK}>Príbeh zbierky</b>
        <span style={textK}>{stavText}</span>
      </span>
      <span style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: "none" }}>
        <button type="button" onClick={() => setNahlad(true)} disabled={!p.kratky.trim() && !cistyText(p.text).trim()} style={{ ...obrysK, alignSelf: "auto" }}>Náhľad</button>
        <button type="button" onClick={zverejni} disabled={!mozeZverejnit} style={{ ...zelenyK, opacity: mozeZverejnit ? 1 : .5, cursor: mozeZverejnit ? "pointer" : "default" }}>Zverejniť príbeh</button>
      </span>
    </section>);

  const cislo = (i: number) => (
    <span style={{ width: 32, height: 32, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, background: vyplnene[i] ? "#4B7A35" : "var(--btn)", color: vyplnene[i] ? "#fff" : "var(--ink2)" }}>{i + 1}</span>);

  const prehlad = nahlad ? createPortal(<NahladPribehu z={z} org={org} p={p} onZavri={() => setNahlad(false)} />, document.body) : null;

  if (mobil) {
    if (krok !== null) return <>
      <button ref={vrchKroku} type="button" onClick={() => setKrok(null)} style={{ ...obrysK, border: "none", background: "var(--btn)", alignSelf: "stretch", textAlign: "left" }}>‹ Späť na kroky</button>
      <section style={kartaK}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{cislo(krok)}<b style={nadpisK}>{KROKY[krok]}</b></span>
        {telo(krok)}
      </section>
      {hlavicka}{prehlad}
    </>;
    return <>
      {hlavicka}
      <section style={{ ...kartaK, padding: 8, gap: 0 }}>
        {KROKY.map((t, i) => (
          <button key={t} type="button" onClick={() => setKrok(i)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "0 12px", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", textAlign: "left", boxShadow: "none" }}>
            {cislo(i)}<span style={{ flex: 1 }}>{t}</span><span aria-hidden="true" style={{ color: "var(--ink3)" }}>›</span>
          </button>))}
      </section>
      {prehlad}
    </>;
  }
  return <>
    {hlavicka}
    {KROKY.map((t, i) => (
      <section key={t} style={kartaK}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{cislo(i)}<b style={nadpisK}>{t}</b></span>
        {telo(i)}
      </section>))}
    {prehlad}
  </>;
}

/** Náhľad = tá istá stránka Príbeh, akú uvidí darca (s konceptom) */
function NahladPribehu({ z, org, p, onZavri }: { z: ZbierkaNaSpravu; org: string; p: Pribeh; onZavri: () => void }) {
  const profil = najdiTestProfil(org) ?? najdiTestProfil("svetlo");
  if (!profil) return null;
  const tz: TestZbierka = profil.zbierky.find((x) => x.id === z.id || (z.id.startsWith("ukazka-strecha") && x.id === "z-strecha-horvath"))
    ?? { id: z.id, nazov: z.nazov, popis: cistyText(z.popis ?? ""), mesto: "Trenčín", foto: p.media.find((m) => m.typ === "foto")?.src ?? "", vyzbierane: z.vyzbierane, ciel: z.ciel || undefined, ludia: z.darcovia, stav: z.ukoncena ? "ukoncena" : z.dlha ? "dlhodoba" : "bezi" };
  return (
    <div role="dialog" aria-label="Náhľad príbehu" style={{ position: "fixed", inset: 0, zIndex: 400, background: "var(--bg)" }}>
      <PribehZbierky profil={profil} z={tz} p={p} spatText="Zavrieť náhľad" onBack={onZavri} />
    </div>);
}
