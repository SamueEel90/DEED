// KARTA 55 · E — Správa zbierky → záložka Príbeh.
// 1 krátky text do feedu (počítadlo riadkov, najviac 3) · 2 celý príbeh (6 000 znakov) · 3 fotky a video s popisom (GaleriaEditor)
// 4 citát (veta, meno, vzťah, súhlas povinný, ak je citát) · 5 priebeh (+ Pridať zápis, darcovia dostanú upozornenie)
// 6 Príbeh týždňa (zapnutie vypne iný). Ukladá sa samo ako koncept; na stránke až po „Zverejniť príbeh".
// Mobil: 6 riadkov s číslom (zelené = vyplnené), ťuk otvorí krok.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RichTextInput } from "@/components/richtext";
import { cistyText, sanitizujHtml } from "@/lib/richtext";
import { pridajOznamDarcom } from "@/lib/oznamyDarcom";
import { najdiTestProfil, prazdnaCharita, type TestZbierka } from "@/lib/testProfily";
import { registra } from "@/lib/udajeRegistra";
import {
  pribehNaUpravu, pribehZbierky, ulozKonceptPribehu, zverejniPribeh, zmenPriebeh, nacitajPribeh, jeNacitany, orgPribehu,
  useZmenyPribehov, PRIBEH_ZNAKOV, PRIBEH_RIADKOV, type Pribeh, type ZapisPriebehu,
} from "@/lib/pribehZbierky";
import type { MediumZbierky } from "@/lib/novaZbierka";
import { SvetlusikKarta } from "@/components/SvetlusikInfo";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { PribehZbierky } from "@/features/verejny-profil/PribehZbierky";
import { GaleriaEditor, TextovePolia, NASTROJE } from "./obsahZbierky";
import { kartaK, nadpisK, textK, obrysK, zelenyK } from "./spravaCasti";
import type { ZbierkaNaSpravu } from "./SpravaZbierky";

const pole: CSSProperties = { width: "100%", minHeight: 48, padding: "0 14px", borderRadius: 12, border: "1px solid #CFC9BC", background: "var(--field, var(--card))", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, boxSizing: "border-box" };
// OPRAVY 455: poradie krokov · „Ako to zatiaľ ide“ (živé zhrnutie) · Priebeh hneď pod ním · „Ďalšie fotky k príbehu“
const KROKY = ["Krátky text do feedu", "Ako to zatiaľ ide", "Priebeh", "Ďalšie fotky k príbehu", "Citát"] as const; // OPRAVY 461: Príbeh týždňa ide automaticky
const dnes = () => new Date().toISOString().slice(0, 10);
const datumKratko = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const datumSk = (iso: string) => { const d = new Date(iso); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
const podlaDatumu = (l: ZapisPriebehu[]) => [...l].sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));
type Novy = { id: string | null; datum: string; nadpis: string; text: string; media: MediumZbierky[] };
const prazdnyZapis = (): Novy => ({ id: null, datum: dnes(), nadpis: "", text: "", media: [] });

/** OPRAVY 455 (0): najprv načítať zo servera — editor sa neukáže prázdny a nič neprepíše */
export function PribehEditor(props: { z: ZbierkaNaSpravu; mobil: boolean; toast: (m: string) => void }) {
  const { z } = props;
  useZmenyPribehov();
  const [chybaN, setChybaN] = useState<string | null>(null);
  const [skus, setSkus] = useState(0);
  useEffect(() => { let ziva = true; setChybaN(null); void nacitajPribeh(z.id).then((e) => { if (ziva && e) setChybaN(e); }); return () => { ziva = false; }; }, [z.id, skus]);
  if (chybaN) return <section style={kartaK}><SvetlusikKarta chyba>{chybaN}</SvetlusikKarta><button type="button" onClick={() => setSkus((x) => x + 1)} style={zelenyK}>Skúsiť znova</button></section>;
  if (!jeNacitany(z.id)) return <section style={kartaK}><span style={textK}>Načítava sa príbeh…</span></section>;
  return <PribehEditorObsah key={z.id} {...props} />;
}

function PribehEditorObsah({ z, mobil }: { z: ZbierkaNaSpravu; mobil: boolean; toast: (m: string) => void }) {
  useZmenyPribehov();
  const org = z.stranka || orgPribehu(z.id);
  const start = pribehNaUpravu(z.id);
  const [p, setP] = useState<Pribeh>(() => ({ ...start.pribeh, priebeh: podlaDatumu(start.pribeh.priebeh) }));
  const [zmenene, setZmenene] = useState(false);
  const [ulozStav, setUlozStav] = useState<"ok" | "uklada" | string>("ok");
  const [krok, setKrok] = useState<number | null>(null);
  const [nahlad, setNahlad] = useState(false);
  const [riadky, setRiadky] = useState(0);
  const [novy, setNovy] = useState<Novy>(prazdnyZapis);
  const [chybaZapis, setChybaZapis] = useState<string | null>(null);
  const [zverejnene, setZverejnene] = useState(false);
  const [posiela, setPosiela] = useState(false);
  // OPRAVY 474: zápis — chyba nadpisu až pri podržaní, výsledok na mieste formulára (nie toast)
  const [nadpisChyba, setNadpisChyba] = useState(false);
  const [hotovoZapis, setHotovoZapis] = useState<{ t: string; s: string } | null>(null);
  const stav = pribehNaUpravu(z.id);
  const casovac = useRef<number>();
  const vrchKroku = useRef<HTMLButtonElement>(null);
  const priebehRef = useRef<HTMLElement>(null);
  useEffect(() => { if (krok !== null) vrchKroku.current?.scrollIntoView({ block: "start" }); }, [krok]);
  const uloz = async (x: Pribeh) => { setUlozStav("uklada"); const e = await ulozKonceptPribehu(z.id, org, x); setUlozStav(e ?? "ok"); return e; };
  // koncept sa ukladá sám (0,8 s bez písania); pri chybe ostane v appke a skúsi sa znova pri ďalšej zmene alebo tlačidlom
  useEffect(() => {
    if (!zmenene) return;
    window.clearTimeout(casovac.current);
    casovac.current = window.setTimeout(() => { void uloz(p); }, 800);
    return () => window.clearTimeout(casovac.current);
  }, [p, zmenene]); // eslint-disable-line react-hooks/exhaustive-deps
  const uprav = (patch: Partial<Pribeh>) => { setP((x) => ({ ...x, ...patch })); setZmenene(true); setZverejnene(false); };

  const vyplnene = [
    !!p.kratky.trim(), !!cistyText(p.text).trim(), p.priebeh.length > 0, p.media.length > 0,
    !!p.citat.text.trim() && p.citat.suhlas,
  ];
  const citatBezSuhlasu = !!p.citat.text.trim() && !p.citat.suhlas;
  const dlhyKratky = riadky > PRIBEH_RIADKOV;
  const mozeZverejnit = !!p.kratky.trim() && !!cistyText(p.text).trim() && !citatBezSuhlasu && !dlhyKratky && (zmenene || stav.koncept || !stav.zverejneny);
  const dovodNezverejnit = !p.kratky.trim() ? "Doplňte krátky text do feedu." : !cistyText(p.text).trim() ? "Doplňte, ako to zatiaľ ide." : citatBezSuhlasu ? "Citát potrebuje súhlas človeka." : dlhyKratky ? "Krátky text je dlhší ako 3 riadky." : null;
  // (7) Zverejniť podržaním — posiela upozornenie darcom; výsledok na mieste tlačidla
  const zverejni = async () => {
    if (posiela) return;
    window.clearTimeout(casovac.current);
    setPosiela(true);
    const e = (await uloz(p)) ?? (await zverejniPribeh(z.id, org));
    setPosiela(false);
    if (e) { setUlozStav(e); return; }
    pridajOznamDarcom({ zbierkaId: z.id, typ: "sprava", text: p.kratky });
    setZmenene(false); setZverejnene(true);
  };
  // (3) Priebeh: zvolený dátum, najnovší hore, ťuk = upraviť, zmazať podržaním
  const ulozZapis = async () => {
    if (!novy.nadpis.trim()) { setNadpisChyba(true); return; }
    setNadpisChyba(false);
    const zapis: ZapisPriebehu = { id: novy.id ?? `zp-${Date.now()}`, datum: novy.datum || dnes(), nadpis: novy.nadpis.trim(), text: novy.text, ...(novy.media.length ? { media: novy.media } : {}) };
    const zoznam = podlaDatumu(novy.id ? p.priebeh.map((r) => (r.id === novy.id ? zapis : r)) : [zapis, ...p.priebeh]);
    window.clearTimeout(casovac.current);
    if (zmenene) { const e = await uloz(p); if (e) { setChybaZapis(e); return; } }
    const r = await zmenPriebeh(z.id, org, zoznam);
    if ("chyba" in r) { setChybaZapis(r.chyba); return; }
    setChybaZapis(null);
    setP((x) => ({ ...x, priebeh: zoznam }));
    if (r.naStranke && !novy.id) pridajOznamDarcom({ zbierkaId: z.id, typ: "sprava", text: `<p><b>${zapis.nadpis}</b></p>${zapis.text}` });
    setNovy(prazdnyZapis());
    setHotovoZapis(novy.id
      ? (r.naStranke ? { t: "Zmeny sú na stránke ✓", s: "Darcom sa nové upozornenie neposiela." } : { t: "Zmeny sú v príbehu ✓", s: "Na stránke budú po zverejnení príbehu (dole)." })
      : (r.naStranke ? { t: "Zápis je na stránke ✓", s: "Darcovia dostali upozornenie. Je navrchu v zozname nižšie." } : { t: "Zápis je v príbehu ✓", s: "Na stránke bude po zverejnení príbehu (dole)." }));
  };
  const zmazZapis = async (id: string) => {
    const zoznam = p.priebeh.filter((r) => r.id !== id);
    const r = await zmenPriebeh(z.id, org, zoznam);
    if ("chyba" in r) { setChybaZapis(r.chyba); return; }
    setP((x) => ({ ...x, priebeh: zoznam })); setNovy(prazdnyZapis());
    setHotovoZapis(r.naStranke ? { t: "Zápis je zmazaný ✓", s: "Zo stránky zmizol. Darcom sa nič neposiela." } : { t: "Zápis je zmazaný ✓", s: "Z príbehu zmizol." });
  };
  const naPriebeh = () => { if (mobil) setKrok(2); else priebehRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const telo = (i: number): ReactNode => {
    if (i === 0) return <>
      <span style={textK}>Ukáže sa vo feede pod fotkou a hore v príbehu tučne. Najviac 3 riadky. Nový riadok ostane aj na stránke.</span>
      <RichTextInput vzhlad="sprava" value={p.kratky} onChange={(h) => uprav({ kratky: cistyText(h) })} nastroje={[]} minH={90} chybaRam={dlhyKratky}
        ariaLabel="Krátky text do feedu" tvrdyLimit={320} onRiadky={setRiadky} />
      <span style={{ fontSize: 13, fontWeight: 800, color: dlhyKratky ? "#A34A2A" : "var(--green)" }}>{riadky} z {PRIBEH_RIADKOV} riadkov{dlhyKratky ? " · skráťte ho, vo feede sa neukáže celý" : ""}</span>
    </>;
    if (i === 1) return <>
      <span style={textK}>Krátko, čo sa odvtedy deje. Prepíšte vždy, keď sa niečo zmení. Jednotlivé udalosti s dátumom pridáte nižšie v{" "}
        <button type="button" onClick={naPriebeh} style={{ border: "none", background: "none", padding: 0, minHeight: 32, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: 800, color: "var(--green)" }}>Priebehu ↓</button></span>
      <RichTextInput vzhlad="sprava" value={p.text} onChange={(h) => uprav({ text: h })} nastroje={NASTROJE} minH={200}
        ariaLabel="Ako to zatiaľ ide" tvrdyLimit={PRIBEH_ZNAKOV} />
    </>;
    if (i === 2) { const naStranke = stav.zverejneny; return <>
      <span style={textK}>Čo sa stalo, s dátumom. {naStranke ? "Zápis sa zverejní hneď a darcovia dostanú upozornenie." : "Na stránke bude po zverejnení príbehu."} Ťuknutím na zápis ho upravíte.</span>
      {hotovoZapis && !novy.id
        ? <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 16, background: "var(--gSoft)", border: "1.5px solid var(--gBd)" }}>
            <b style={{ fontSize: 16, color: "var(--gInk)" }}>{hotovoZapis.t}</b>
            <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink)" }}>{hotovoZapis.s}</span>
            <button type="button" onClick={() => setHotovoZapis(null)} style={{ ...obrysK, alignSelf: "flex-start" }}>+ Napísať ďalší zápis</button>
          </div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 16, border: novy.id ? "2px solid var(--green)" : "1px dashed var(--cardBd)" }}>
        {novy.id && <b style={{ fontSize: 14, color: "var(--gInk)" }}>Upravujete zápis z {datumSk(novy.datum)}</b>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
          <input type="date" max={dnes()} style={{ ...pole, flex: "0 0 170px", width: "auto" }} value={novy.datum} onChange={(e) => setNovy({ ...novy, datum: e.target.value > dnes() ? dnes() : e.target.value })} aria-label="Dátum" />
          <span style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 6 }}>
            <input style={{ ...pole, ...(nadpisChyba ? { border: "2px solid #B3402A" } : {}) }} value={novy.nadpis} onChange={(e) => { setNovy({ ...novy, nadpis: e.target.value }); if (e.target.value.trim()) setNadpisChyba(false); }} placeholder="Čo sa stalo, napríklad Krov stojí" aria-label="Nadpis zápisu" aria-invalid={nadpisChyba || undefined} maxLength={80} />
            {nadpisChyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#B3402A" }}>Napíšte sem, čo sa stalo. Potom znova podržte tlačidlo.</span>}
          </span>
        </div>
        <TextovePolia popis={novy.text} popis2="" onPopis={(h) => setNovy((x) => ({ ...x, text: h }))} onPopis2={() => {}} ph={mobil} bezPokracovania
          nadpis1="Text zápisu" popis1="Pár viet pre darcov. Na stránke sa dlhý text skráti s … viac." />
        <GaleriaEditor media={novy.media} onMedia={(m) => setNovy((x) => ({ ...x, media: m }))} ph={mobil} max={4} bezVidea bezHlavnej nadpis="Fotky k zápisu · nepovinné" dovetok="" />
        {chybaZapis && <SvetlusikKarta chyba>{chybaZapis}</SvetlusikKarta>}
        {novy.id
          ? <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" onClick={() => { setNovy(prazdnyZapis()); setNadpisChyba(false); }} style={obrysK}>Zrušiť úpravu</button>
                <span style={{ flex: "1 1 240px" }}><PodrzTlacidlo label="Podržte a uložte zmeny" trvanie={1500} onConfirm={() => void ulozZapis()} /></span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--cardBd)" }}>
                <span style={{ flex: "1 1 200px", fontSize: 13.5, color: "var(--ink3)" }}>Zápis už nechcete? {naStranke ? "Zmizne zo stránky." : "Zmizne z príbehu."}</span>
                <span style={{ flex: "0 1 260px" }}><PodrzTlacidlo label="Podržte a zmažte zápis" farba="cervena" obrys vyska={48} trvanie={1500} onConfirm={() => void zmazZapis(novy.id!)} /></span>
              </div>
            </>
          : <PodrzTlacidlo label={naStranke ? "Podržte a zverejnite zápis" : "Podržte a pridajte do príbehu"} trvanie={1500} onConfirm={() => void ulozZapis()} />}
      </div>}
      {p.priebeh.map((r, j) => (
        <button key={r.id} type="button" onClick={() => { setHotovoZapis(null); setNadpisChyba(false); setNovy({ id: r.id, datum: r.datum, nadpis: r.nadpis, text: r.text, media: r.media ?? [] }); }} aria-label={`Upraviť zápis ${r.nadpis}`}
          style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0 6px 14px", border: "none", borderLeft: `3px solid ${j === 0 ? "var(--gold)" : "var(--cardBd)"}`, background: "transparent", textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: j === 0 ? "var(--gold)" : "var(--ink3)" }}>{datumSk(r.datum)}</span>
          <b style={{ fontSize: 15 }}>{r.nadpis}</b>
          {cistyText(r.text) && <span className="ftext" style={textK} dangerouslySetInnerHTML={{ __html: sanitizujHtml(r.text) }} />}
          {!!r.media?.length && <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{r.media.filter((m) => m.typ === "foto").map((m) => <img key={m.id} src={m.src} alt={m.popis ?? ""} style={{ width: 72, height: 54, borderRadius: 8, objectFit: "cover", display: "block" }} />)}</span>}
        </button>))}
    </>; }
    if (i === 3) return <GaleriaEditor media={p.media} onMedia={(m) => uprav({ media: m })} ph={false} bezHlavnej nadpis="" dovetok="">
      <span style={textK}>Doplnkové fotky. Hlavná fotka je vždy titulná fotka zbierky. Pod fotkou môžete napísať popis.</span></GaleriaEditor>;
    return <>
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
      {citatBezSuhlasu && <SvetlusikKarta chyba>Bez súhlasu sa príbeh s citátom nedá zverejniť. Súhlas zaškrtnite, alebo citát vymažte.</SvetlusikKarta>}
    </>;
  };

  // OPRAVY 474: hlavička = len stav + Náhľad; zverejnenie je dole v páse
  const datumZv = stav.zverejneny ? (pribehZbierky(z.id)?.zverejnene ? datumKratko(pribehZbierky(z.id)!.zverejnene!) : "") : "";
  const nezverejnene = zmenene || stav.koncept;
  const [bodka, stavText] = !stav.zverejneny && !nezverejnene ? ["var(--ink4, #A6A395)", "Príbeh zatiaľ nemáte. Je dobrovoľný."]
    : nezverejnene ? ["#D4A72C", stav.zverejneny ? `Na stránke je verzia${datumZv ? ` z ${datumZv}` : ""}. Máte nezverejnené zmeny, zverejníte ich dole.` : "Príbeh ešte nie je na stránke. Zverejníte ho dole."]
    : ["#4B7A35", `Zverejnený${datumZv ? ` ${datumZv}` : ""}. Všetko je na stránke.`];
  const ulozenie = ulozStav === "uklada" ? <span style={{ fontSize: 13, color: "var(--ink3)" }}>Ukladá sa…</span>
    : ulozStav !== "ok" ? <SvetlusikKarta chyba><span style={{ display: "flex", flexDirection: "column", gap: 8 }}>{ulozStav}<button type="button" onClick={() => void uloz(p)} style={{ ...zelenyK, alignSelf: "flex-start" }}>Skúsiť znova</button></span></SvetlusikKarta>
    : zmenene ? <span style={{ fontSize: 13, color: "var(--gInk)", fontWeight: 700 }}>Uložené ✓</span> : null;
  const nahladTl = <button type="button" onClick={() => setNahlad(true)} disabled={!p.kratky.trim() && !cistyText(p.text).trim()} style={{ ...obrysK, alignSelf: "auto" }}>Náhľad</button>;
  const hlavicka = (
    <section style={{ ...kartaK, gap: 10 }}>
      <span style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <b style={nadpisK}>Príbeh zbierky</b>
          <span style={{ display: "flex", alignItems: "flex-start", gap: 8, ...textK }}><span aria-hidden="true" style={{ flex: "none", width: 10, height: 10, marginTop: 5, borderRadius: "50%", background: bodka }} />{stavText}</span>
          {ulozenie}
        </span>
        {nahladTl}
      </span>
    </section>);
  // OPRAVY 474 (2): pás dole — nezverejnené zmeny + Náhľad + Podržte a zverejnite príbeh (dôvod namiesto tlačidla); výsledok na tom istom mieste
  const pas = zverejnene
    ? <div role="status" style={{ position: "sticky", bottom: 0, zIndex: 5, padding: "14px 16px", borderRadius: 16, background: "var(--gSoft)", border: "1.5px solid var(--gBd)", fontSize: 15.5, fontWeight: 800, color: "var(--gInk)", boxShadow: "0 -6px 18px rgba(0,0,0,.08)" }}>Zverejnené ✓ · darcovia dostali upozornenie</div>
    : nezverejnene ? <div style={{ position: "sticky", bottom: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 16px", borderRadius: 16, background: "var(--card)", border: "1.5px solid #D4A72C", boxShadow: "0 -6px 18px rgba(0,0,0,.12)" }}>
        <span style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><b style={{ fontSize: 15.5 }}>Máte nezverejnené zmeny v príbehu</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Darcovia ich uvidia až po zverejnení.</span></span>
        {nahladTl}
        {mozeZverejnit
          ? <span style={{ flex: "1 1 260px" }}><PodrzTlacidlo label={posiela ? "Zverejňuje sa…" : "Podržte a zverejnite príbeh"} trvanie={1500} disabled={posiela} onConfirm={() => void zverejni()} /></span>
          : dovodNezverejnit && <span style={{ flex: "1 1 260px" }}><SvetlusikKarta chyba>{dovodNezverejnit}</SvetlusikKarta></span>}
      </div> : null;

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
      {hlavicka}{pas}{prehlad}
    </>;
    return <>
      {hlavicka}
      <section style={{ ...kartaK, padding: 8, gap: 0 }}>
        {KROKY.map((t, i) => (
          <button key={t} type="button" onClick={() => setKrok(i)} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "0 12px", border: "none", borderTop: i ? "1px solid var(--cardBd)" : "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", textAlign: "left" }}>
            {cislo(i)}<span style={{ flex: 1 }}>{t}</span><span aria-hidden="true" style={{ color: "var(--ink3)" }}>›</span>
          </button>))}
      </section>
      {pas}{prehlad}
    </>;
  }
  return <>
    {hlavicka}
    {KROKY.map((t, i) => (
      <section key={t} ref={i === 2 ? priebehRef : undefined} style={{ ...kartaK, scrollMarginTop: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{cislo(i)}<b style={nadpisK}>{t}</b></span>
        {telo(i)}
      </section>))}
    {pas}{prehlad}
  </>;
}

/** Náhľad = tá istá stránka Príbeh, akú uvidí darca (s konceptom) · OPRAVY 476 (b): titulná fotka = hlavná fotka zbierky ako po zverejnení */
function NahladPribehu({ z, org, p, onZavri }: { z: ZbierkaNaSpravu; org: string; p: Pribeh; onZavri: () => void }) {
  // OPRAVY 403: charita bez testovacieho profilu = jej prázdny profil s menom z registra
  const profil = najdiTestProfil(org) ?? prazdnaCharita(org, registra(org).nazov || undefined);
  const tz: TestZbierka = profil.zbierky.find((x) => x.id === z.id || (z.id.startsWith("ukazka-strecha") && x.id === "z-strecha-horvath"))
    ?? { id: z.id, nazov: z.nazov, popis: cistyText(z.popis ?? ""), popisHtml: `${z.popis ?? ""}${z.popis2 ?? ""}`, mesto: profil.mesto, foto: z.media?.find((m) => m.typ === "foto")?.src ?? "", vs: z.vs, vyzbierane: z.vyzbierane, ciel: z.ciel || undefined, ludia: z.darcovia, stav: z.ukoncena ? "ukoncena" : z.dlha ? "dlhodoba" : "bezi" };
  return (
    <div role="dialog" aria-label="Náhľad príbehu" style={{ position: "fixed", inset: 0, zIndex: 400, background: "var(--bg)" }}>
      <PribehZbierky profil={profil} z={tz} p={p} spatText="Zavrieť náhľad" onBack={onZavri} />
    </div>);
}
