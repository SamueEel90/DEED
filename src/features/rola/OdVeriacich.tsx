// ============================================================
// KARTA 57 D — Správa farnosti → Od veriacich (farár).
// Poradie: Úmysly na omšu · len pre vás → OPRAVY 310: Čo môžu veriaci pridávať (Nastaviť ›) → Čaká na vaše schválenie → Pridali veriaci v skupinách.
// Ťuk na príspevok: oprava nadpisu a textu („Opravené ✓", veriaci dostane správu), parte/svadba/jubileum
// z editora farár len maže. Mazanie len podržaním. Označiť viac: všetko · staršie ako 30 dní · skupinu.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { nacitajSelfAdd, ulozSelfAdd } from "@/features/viera/UserOznamy";
import { DRUHY_FARNIKA, CEZ_EDITOR, KAM_DRUHU, nacitajSmie, ulozSmie, stupen, rozhodniOdFarnikov, type Stupen, type SmieFarnika, odFarnikov, upravOdFarnika, zmazOdFarnika, zmazOdFarnikov, nastavenieOdVeriacich, ulozNastavenieOdVeriacich, useOdFarnikov, useCerstveOdFarnikov, pocetNahl, pocetSus, vyprsal, type DruhFarnika, type PolozkaFarnika } from "@/lib/odFarnikov";
import { TextOznamu } from "./OznamyFarnosti";
import { PodrzZmaz, useHromadnyVyber, TlacidloVyberu, ListaVyberu, OznacitSkupinu, PolickoVyberu, PasVyberu } from "@/components/HromadnyVyber";
import { cistyText } from "./obsahZbierky";
import { UmyslyFarara } from "./UmyslyFarara";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { relCas } from "@/lib/darcovia";
import { cielSpravyPre, zrusCielSpravy } from "@/lib/mojeStranky";
import { zvyrazniOznam } from "@/features/verejny-profil/NastenkaFarnosti";

/** OPRAVY 310: Povolené · Po schválení · Zakázané */
function Stupne({ v, on, moz = STUPNE, label }: { v: Stupen | null; on: (s: Stupen) => void; moz?: [Stupen, string][]; label: string }) {
  return <div role="radiogroup" aria-label={label} style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "var(--btn)", flexWrap: "wrap" }}>
    {moz.map(([k, t]) => { const a = v === k; return <button key={k} type="button" role="radio" aria-checked={a} onClick={() => on(k)} style={{ flex: "1 1 auto", minHeight: 44, padding: "0 12px", border: "none", borderRadius: 9, background: a ? (k === "zakazane" ? "#7A3B2A" : k === "schvalenie" ? "#8A6A1C" : "#4B7A35") : "transparent", color: a ? "#fff" : "var(--ink2)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "none", whiteSpace: "nowrap" }}>{t}</button>; })}
  </div>;
}

/** OPRAVY 310 · B: Čo môžu veriaci pridávať — 3 stupne pri každej kategórii, hore všetko naraz; ukladá sa pri farnosti na serveri */
function NastavitPravidla({ strankaId, mobil, toast, onSpat }: { strankaId: string; mobil: boolean; toast: (m: string) => void; onSpat: () => void }) {
  const [m, setM] = useState<Record<DruhFarnika, Stupen>>(() => { const sm = nacitajSmie(strankaId); return Object.fromEntries(PORADIE.map((k) => [k, stupen(sm, k)])) as Record<DruhFarnika, Stupen>; });
  const [upoz, setUpoz] = useState(() => nastavenieOdVeriacich(strankaId).upozornit);
  const vsetky = PORADIE.map((k) => m[k]), rovnake = PORADIE.filter((k) => k !== "umysel").every((k) => m[k] === m.parte) && (m.umysel === m.parte || (m.parte === "schvalenie" && m.umysel === "povolene"));
  const naraz = (st: Stupen) => setM(Object.fromEntries(PORADIE.map((k) => [k, k === "umysel" && st === "schvalenie" ? "povolene" : st])) as Record<DruhFarnika, Stupen>);
  const uloz = () => {
    const sm: SmieFarnika = Object.fromEntries(PORADIE.map((k) => [k, m[k]])) as SmieFarnika;
    ulozSmie(strankaId, sm);
    ulozSelfAdd(strankaId, { on: vsetky.some((x) => x !== "zakazane"), poplatok: 0 }); // poplatok za oznam zrušený
    ulozNastavenieOdVeriacich(strankaId, { upozornit: upoz });
    toast("Uložené ✓ Veriaci to uvidia hneď.");
    onSpat();
  };
  const kartaS: CSSProperties = { ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "12px 14px" : "16px 20px", display: "flex", flexDirection: "column", gap: 12 };
  return <>
    <button type="button" onClick={onSpat} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--green)", boxShadow: "none" }}>‹ Späť na Od veriacich</button>
    <b style={{ fontSize: 22 }}>Čo môžu veriaci pridávať</b>
    <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)" }}>Po schválení = príspevok sa ukáže až keď ho zverejníte. Pošleme vám upozornenie.</span>
    <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink2)", padding: "12px 14px", borderRadius: 14, background: "var(--panel)", border: "1px solid var(--cardBd)" }}>Pridávať môžu <b style={{ color: "var(--ink)" }}>len registrovaní v DEED+ s overeným menom</b>. Pod každým príspevkom je meno autora, aspoň krstné meno a iniciála (Martin K.). Anonymne sa zverejniť nedá, okrem prosby o modlitbu („Bohu známy veriaci“). Pri probléme vieme autora dohľadať.</span>
    <section style={kartaS}>
      <b style={{ fontSize: 16 }}>Všetko naraz</b>
      <Stupne v={rovnake ? m.parte : null} on={naraz} label="Všetko naraz" />
      {!rovnake && <span style={{ fontSize: 13, color: "var(--ink3)" }}>Teraz rôzne podľa kategórie</span>}
    </section>
    <section style={{ ...kartaS, gap: 0 }}>
      {PORADIE.map((k, i) => { const d = DRUHY_FARNIKA.find((x) => x.k === k)!; return (
        <div key={k} style={{ display: "flex", flexDirection: mobil ? "column" : "row", alignItems: mobil ? "stretch" : "center", gap: mobil ? 8 : 16, padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{d.t}</b><span style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink3)" }}>{KAM_DRUHU[k]}</span></span>
          <span style={{ flex: "none", minWidth: mobil ? 0 : 330 }}><Stupne v={m[k]} on={(st) => setM((x) => ({ ...x, [k]: st }))} moz={k === "umysel" ? STUPNE.filter(([x]) => x !== "schvalenie") : STUPNE} label={d.t} /></span>
        </div>); })}
    </section>
    <section style={kartaS}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* OPRAVY 315: naostro — server pošle upozornenie (0097, spúšťač na odfarnikov; vypnuté = odfnast.upozornit false) */}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>Upozorniť ma na nový príspevok</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Príde vám správa, keď veriaci niečo pridá, nahlási alebo čaká na schválenie.</span></span>
        <Prepinac on={upoz} onClick={() => setUpoz(!upoz)} label="Upozorniť ma na nový príspevok" />
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gInk)" }}>Poplatok za oznam zrušený. Všetko je zadarmo.</span>
    </section>
    <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label="Podržte a uložte" trvanie={1200} onConfirm={uloz} /></div>
  </>;
}

const karta: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
/** OPRAVY 310: poradie kategórií v nastavení (Deti a mládež veriaci zatiaľ pridávať nemôžu — v appke na to nie je formulár) */
const PORADIE: DruhFarnika[] = ["parte", "svadba", "ine", "modlitba", "oznam", "udalost", "fotky", "umysel"];
const STUPNE: [Stupen, string][] = [["povolene", "Povolené"], ["schvalenie", "Po schválení"], ["zakazane", "Zakázané"]];
const SKUPINY: [string, DruhFarnika[]][] = [
  ["PROSBY O MODLITBU", ["modlitba"]], ["UDALOSTI", ["udalost"]], ["KRÁTKE OZNAMY", ["oznam"]], ["FOTKY Z AKCIÍ", ["fotky"]], ["OZNÁMENIA · PARTE, SVADBY, JUBILEÁ", ["parte", "svadba", "ine"]],
];
const terazMs = () => Date.now();
const druhT = (k: DruhFarnika) => (DRUHY_FARNIKA.find((d) => d.k === k)?.t ?? "").toLocaleUpperCase("sk-SK");
const kedy = (cas: number) => { const d = new Date(cas); return `${d.getDate()}. ${d.getMonth() + 1}.`; };
const prispevkov = (n: number) => `${n} ${n === 1 ? "príspevok" : n >= 2 && n <= 4 ? "príspevky" : "príspevkov"}`;
const naHtml = (t: string) => t ? t.split("\n").map((r) => `<p>${r.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("") : "";

function Prepinac({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ flex: "none", width: 52, height: 44, border: "none", background: "transparent", padding: "7px 0", cursor: "pointer", boxShadow: "none" }}>
      <span style={{ display: "block", position: "relative", width: 52, height: 30, borderRadius: 15, background: on ? "#4B7A35" : "var(--track)" }}>
        <span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: 12, background: "#fff", transform: `translateX(${on ? 22 : 0}px)`, transition: "transform .2s ease" }} />
      </span>
    </button>);
}

/** oprava príspevku farárom: nadpis + text */
function Oprava({ x, strankaId }: { x: PolozkaFarnika; strankaId: string }) {
  const [t, setT] = useState(x.t);
  const [h, setH] = useState(() => naHtml(x.s));
  const [ok, setOk] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const zmena = t.trim() !== x.t || cistyText(h) !== x.s;
  const uloz = () => {
    if (!zmena || !t.trim()) return;
    upravOdFarnika(strankaId, x.id, { t: t.trim(), s: cistyText(h).slice(0, 600), upravil: true });
    setOk(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setOk(false), 2200);
  };
  return <>
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 14.5 }}>Nadpis</b>
      <input value={t} onChange={(e) => setT(e.target.value.slice(0, 80))} style={{ height: 48, padding: "0 14px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--cardBd)", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" }} /></label>
    <TextOznamu value={h} onChange={setH} label="Text" popis="Opravte preklep alebo údaj." />
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <button type="button" onClick={uloz} aria-disabled={!zmena} style={{ minHeight: 46, padding: "0 18px", border: "none", borderRadius: 12, background: ok ? "var(--gSoft)" : zmena ? "#4B7A35" : "#CFC9BC", color: ok ? "var(--gInk)" : zmena ? "#fff" : "#6B6C62", cursor: zmena ? "pointer" : "default", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, boxShadow: "none" }}>{ok ? "Opravené ✓" : "Uložiť opravu"}</button>
      <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Veriaci dostane správu, že ste jeho príspevok upravili.</span>
    </div>
  </>;
}

export function OdVeriacich({ strankaId, meno, mobil, toast }: { strankaId: string; /** názov farnosti (podpis správy veriacemu) */ meno: string; mobil: boolean; toast: (m: string) => void }) {
  useOdFarnikov(); useCerstveOdFarnikov(strankaId);
  const vsetko = odFarnikov(strankaId);
  const L = vsetko.filter((x) => x.k !== "umysel" && !x.stav); // OPRAVY 310: čakajúce a nezverejnené zvlášť
  const C = vsetko.filter((x) => x.stav === "caka").sort((a, b) => a.cas - b.cas);
  const nast = nastavenieOdVeriacich(strankaId);
  // D.5: farár otvoril Od veriacich → nové príspevky a úmysly sú videné
  useEffect(() => { ulozNastavenieOdVeriacich(strankaId, { videne: terazMs() }); }, [strankaId]);
  // OPRAVY 315: z upozornenia v zvončeku — príspevok zvýraznený (nahlásený v Pridali veriaci sa rozbalí)
  const [zv] = useState(() => cielSpravyPre(strankaId)?.zvyrazni ?? null);
  const [otv, setOtv] = useState<string | null>(() => (zv && odFarnikov(strankaId).some((x) => x.id === zv && x.k !== "umysel" && !x.stav) ? zv : null));
  useEffect(() => { zrusCielSpravy(); if (zv) return zvyrazniOznam(zv); }, [zv]);
  // OPRAVY 263: ten istý hromadný výber ako v Správe oznamov
  const hv = useHromadnyVyber(), selM = hv.zap, vyb = hv.vyb;
  const [nastOtv, setNastOtv] = useState(false);
  const smieF = nacitajSmie(strankaId), self = nacitajSelfAdd(strankaId);
  const st = DRUHY_FARNIKA.map((d) => (self.on ? stupen(smieF, d.k) : "zakazane"));
  const prepniVyb = hv.prepni;
  // OPRAVY 310: Čaká na vaše schválenie — Pozrieť · Zamietnuť · Zverejniť, Vybrať viac
  const [pozriC, setPozriC] = useState<string | null>(null);
  const [vybC, setVybC] = useState<Set<string> | null>(null);
  const rozhodni = (ids: string[], zverejnit: boolean) => { rozhodniOdFarnikov(strankaId, ids, zverejnit); setVybC(null); toast(zverejnit ? (ids.length === 1 ? "Zverejnené ✓ Veriaci dostane správu." : `Zverejnené ${ids.length} ✓`) : (ids.length === 1 ? "Nezverejnené. Veriaci dostane správu." : `Nezverejnené ${ids.length}`)); };
  if (nastOtv) return <NastavitPravidla strankaId={strankaId} mobil={mobil} toast={toast} onSpat={() => setNastOtv(false)} />;
  const tlC: CSSProperties = { minHeight: 44, padding: "0 14px", borderRadius: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "none" };
  const riadokC = (x: PolozkaFarnika, i: number) => { const v = vybC?.has(x.id) ?? false, o = pozriC === x.id; return (
    <div key={x.id} data-oz={x.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderTop: i ? "1px solid var(--goldBd)" : "none" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {vybC && <button type="button" role="checkbox" aria-checked={v} onClick={() => setVybC((s0) => { const n = new Set(s0); if (n.has(x.id)) n.delete(x.id); else n.add(x.id); return n; })} style={{ flex: "none", width: 44, height: 44, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}><PolickoVyberu on={v} /></button>}
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{druhT(x.k)} · {x.kto} · {relCas(x.cas)}</span>
          <b style={{ fontSize: 15.5 }}>{x.t || DRUHY_FARNIKA.find((d) => d.k === x.k)?.t}</b>
        </span>
      </div>
      {o && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {x.obr ? <img src={x.obr} alt="" style={{ width: "100%", maxWidth: 280, borderRadius: 8, display: "block" }} /> : x.s ? <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "pre-line" }}>{x.s}</span> : null}
        {x.fotky?.length && !x.obr ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>{x.fotky.slice(0, 8).map((f, j) => <img key={j} src={f} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10, display: "block" }} />)}</div> : null}
      </div>}
      {!vybC && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setPozriC(o ? null : x.id)} aria-expanded={o} style={{ ...tlC, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)" }}>{o ? "Zbaliť ⌃" : "Pozrieť"}</button>
        <button type="button" onClick={() => rozhodni([x.id], false)} style={{ ...tlC, border: "1.5px solid #A34A2A", background: "transparent", color: "#A34A2A" }}>Zamietnuť</button>
        <button type="button" onClick={() => rozhodni([x.id], true)} style={{ ...tlC, border: "none", background: "#4B7A35", color: "#fff" }}>Zverejniť</button>
      </div>}
    </div>); };


  const riadok = (x: PolozkaFarnika, i: number) => {
    const o = otv === x.id && !selM, on = vyb.has(x.id), ed = CEZ_EDITOR.includes(x.k);
    return (
      <div key={x.id} data-oz={x.id} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <button type="button" onClick={() => (selM ? prepniVyb(x.id) : setOtv(o ? null : x.id))} aria-expanded={selM ? undefined : o} aria-pressed={selM ? on : undefined}
          style={{ width: "100%", minHeight: 62, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          {selM && <PolickoVyberu on={on} />}
          <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 11, fontWeight: 800, color: "var(--gInk)", whiteSpace: "nowrap", maxWidth: mobil ? 110 : undefined, overflow: "hidden", textOverflow: "ellipsis" }}>{druhT(x.k)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 14.5 }}>{x.t}</b>
            <span style={{ fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[x.s, x.kto, kedy(x.cas), x.upravil ? "upravil farár" : "", vyprsal(x, terazMs()) ? "už nie je na stránke" : ""].filter(Boolean).join(" · ")}</span>
            {pocetNahl(x) > 0 && <span style={{ alignSelf: "flex-start", marginTop: 2, padding: "2px 8px", borderRadius: 7, background: "var(--cRedBg)", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em" }}>NAHLÁSENÉ · {pocetNahl(x)}×</span>}
            {x.k === "parte" && pocetSus(x) > 0 && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>sústrasť prejavilo {pocetSus(x)} · rodine ide súhrn raz denne</span>}
          </span>
          {!selM && <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{o ? "⌃" : "⌄"}</span>}
        </button>
        {o && <div style={{ padding: "0 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {ed ? <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Oznámenie z editora (parte, svadba, jubileum) upravuje ten, kto ho pridal. Vy ho môžete zmazať.</span>
            : <Oprava key={x.id} x={x} strankaId={strankaId} />}
          {x.fotky?.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>{x.fotky.slice(0, 8).map((f, j) => <img key={j} src={f} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10, display: "block" }} />)}</div> : null}
          <div><PodrzZmaz onZmaz={() => { zmazOdFarnika(strankaId, x.id); setOtv(null); toast("Zmazané."); }} /></div>
        </div>}
      </div>);
  };

  const skupiny = SKUPINY.map(([nad, ks]) => [nad, L.filter((x) => ks.includes(x.k))] as const).filter(([, l]) => l.length);

  return <>
    {/* D.1 · OPRAVY 176: úmysly hore — povinnosť farára, na stránku nejdú */}
    <UmyslyFarara strankaId={strankaId} meno={meno} mobil={mobil} toast={toast} />

    {/* OPRAVY 310: Čo môžu veriaci pridávať — pod Úmyslami, hneď nad Pridali veriaci */}
    <button type="button" onClick={() => setNastOtv(true)} style={{ minHeight: 64, padding: "12px 16px", borderRadius: 18, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>Čo môžu veriaci pridávať</b>
        <span style={{ fontSize: 13, color: "var(--ink3)" }}>{st.filter((x) => x === "povolene").length} povolené · {st.filter((x) => x === "schvalenie").length} po vašom schválení{st.every((x) => x === "zakazane") ? " · nič" : ""} · upozornenia {nast.upozornit ? "zapnuté" : "vypnuté"}</span></span>
      <span style={{ flex: "none", fontSize: 14.5, fontWeight: 800, color: "var(--gInk)" }}>Nastaviť ›</span>
    </button>
    {C.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "#8A6A1C", padding: "4px 2px 0" }}>ČAKÁ NA VAŠE SCHVÁLENIE · {C.length}</span>
        {C.length > 1 && <button type="button" onClick={() => setVybC(vybC ? null : new Set())} style={{ ...tlC, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)" }}>{vybC ? "Zrušiť výber" : "Vybrať viac"}</button>}
      </div>
      <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px", background: "var(--goldBg)", border: "1.5px solid var(--goldBd)" }}>{C.map(riadokC)}</section>
      {vybC && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setVybC(new Set(C.map((x) => x.id)))} style={{ ...tlC, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)" }}>Označiť všetky</button>
        <span style={{ flex: 1 }} />
        <button type="button" disabled={!vybC.size} onClick={() => rozhodni([...vybC], false)} style={{ ...tlC, border: "1.5px solid #A34A2A", background: "transparent", color: "#A34A2A", opacity: vybC.size ? 1 : .45 }}>Zamietnuť · {vybC.size}</button>
        <button type="button" disabled={!vybC.size} onClick={() => rozhodni([...vybC], true)} style={{ ...tlC, border: "none", background: "#4B7A35", color: "#fff", opacity: vybC.size ? 1 : .45 }}>Zverejniť · {vybC.size}</button>
      </div>}
    </div>}

    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 6 }}>
      <b style={{ flex: 1, fontSize: 17 }}>Pridali veriaci · {L.length}</b>
      {L.length > 0 && <TlacidloVyberu v={hv} />}
    </div>
    <ListaVyberu v={hv} polozky={L.map((x) => ({ id: x.id, cas: x.cas }))} />
    {!L.length && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: "14px 20px", fontSize: 14, color: "var(--ink3)" }}>Zatiaľ nič. Čo veriaci pridajú, uvidíte tu a môžete to opraviť alebo zmazať.</section>}
    {skupiny.map(([nad, l]) => (
      <div key={nad} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "4px 2px 0" }}>{nad} · {l.length}</span>
          <OznacitSkupinu v={hv} ids={l.map((x) => x.id)} />
        </div>
        <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>{l.map(riadok)}</section>
      </div>))}
    <PasVyberu v={hv} dolu={mobil ? 104 : 12} pocet={prispevkov}
      onZmaz={(ids) => { zmazOdFarnikov(strankaId, ids); setOtv(null); return `${ids.length === 1 ? "1 príspevok je zmazaný" : ids.length < 5 ? `${ids.length} príspevky sú zmazané` : `${ids.length} príspevkov je zmazaných`} ✓`; }} />

  </>;
}
