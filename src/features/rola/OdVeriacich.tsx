// ============================================================
// KARTA 57 D — Správa farnosti → Od veriacich (farár).
// Poradie: OPRAVY 324: Čo môžu veriaci pridávať (zlatá karta) → Úmysly na omšu · len pre vás → Čaká na vaše schválenie → Pridali veriaci v skupinách.
// Ťuk na príspevok: oprava nadpisu a textu („Opravené ✓", veriaci dostane správu), parte/svadba/jubileum
// z editora farár len maže. Mazanie len podržaním. Označiť viac: všetko · staršie ako 30 dní · skupinu.
// ============================================================
import { KartaNastavenia, NADPIS_SEKCIE, farbaStitku } from "./KartaNastavenia";
import { TlZbalit } from "@/features/verejny-profil/zbalit";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { nacitajSelfAdd, ulozSelfAddIsto } from "@/features/viera/UserOznamy";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";
import { DRUHY_FARNIKA, CEZ_EDITOR, KAM_DRUHU, nacitajSmie, ulozSmieIsto, stupen, rozhodniOdFarnikov, type Stupen, type SmieFarnika, odFarnikov, upravOdFarnika, ponechajOdFarnika, zmazOdFarnika, zmazOdFarnikov, nastavenieOdVeriacich, ulozNastavenieOdVeriacich, ulozNastavenieOdVeriacichIsto, useOdFarnikov, useCerstveOdFarnikov, pocetNahl, pocetSus, vyprsal, type DruhFarnika, type PolozkaFarnika } from "@/lib/odFarnikov";
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
function NastavitPravidla({ strankaId, mobil, toast, onSpat, fokus }: { strankaId: string; mobil: boolean; toast: (m: string) => void; onSpat: () => void; /** OPRAVY 324: otvorené z príspevku — tá kategória */ fokus?: DruhFarnika }) {
  // OPRAVY 324: z „Nechcem takéto príspevky“ — nastavenie sa otvorí na tej kategórii
  useEffect(() => { if (!fokus) return; const t = window.setTimeout(() => document.querySelector(`[data-kat="${fokus}"]`)?.scrollIntoView({ block: "center" }), 60); return () => window.clearTimeout(t); }, [fokus]);
  const [m, setM] = useState<Record<DruhFarnika, Stupen>>(() => { const sm = nacitajSmie(strankaId); return Object.fromEntries(PORADIE.map((k) => [k, stupen(sm, k)])) as Record<DruhFarnika, Stupen>; });
  const [upoz, setUpoz] = useState(() => nastavenieOdVeriacich(strankaId).upozornit);
  const vsetky = PORADIE.map((k) => m[k]), rovnake = PORADIE.filter((k) => k !== "umysel").every((k) => m[k] === m.parte) && (m.umysel === m.parte || (m.parte === "schvalenie" && m.umysel === "povolene"));
  const naraz = (st: Stupen) => setM(Object.fromEntries(PORADIE.map((k) => [k, k === "umysel" && st === "schvalenie" ? "povolene" : st])) as Record<DruhFarnika, Stupen>);
  // OPRAVY 335: uložené až keď je naozaj uložené; chyba nad tlačidlom Podržte a uložte
  const [chybaU, setChybaU] = useState<string | null>(null);
  const [uklada, setUklada] = useState(false);
  const uloz = async () => {
    if (uklada) return;
    setUklada(true); setChybaU(null);
    const sm: SmieFarnika = Object.fromEntries(PORADIE.map((k) => [k, m[k]])) as SmieFarnika;
    const e = await ulozSmieIsto(strankaId, sm)
      ?? await ulozSelfAddIsto(strankaId, { on: vsetky.some((x) => x !== "zakazane"), poplatok: 0 }) // poplatok za oznam zrušený
      ?? await ulozNastavenieOdVeriacichIsto(strankaId, { upozornit: upoz });
    setUklada(false);
    if (e) { setChybaU(e); return; }
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
        <div key={k} data-kat={k} style={{ display: "flex", flexDirection: mobil ? "column" : "row", alignItems: mobil ? "stretch" : "center", gap: mobil ? 8 : 16, padding: "12px 0", borderTop: i ? "1px solid var(--cardBd)" : "none", ...(fokus === k ? { margin: "0 -10px", padding: "12px 10px", borderRadius: 14, background: "var(--goldBg)", outline: "2px solid #C9A24A" } : {}) }}>
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
    <ChybaPriTlacidle text={chybaU} uklada={uklada} onZnova={() => { void uloz(); }} />
    <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={uklada ? "Ukladá sa…" : "Podržte a uložte"} trvanie={1200} onConfirm={() => { void uloz(); }} /></div>
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
/** OPRAVY 339: príspevok má čo ukázať okrem nadpisu (text, fotky, kedy, kde) */
const maNavyse = (x: PolozkaFarnika) => !!(x.s?.trim() || x.text?.trim() || x.obr || x.fotky?.length || x.f?.datum || x.f?.kde?.trim());
const kedyKde = (x: PolozkaFarnika) => {
  const d = x.f?.datum && /^\d{4}-\d{2}-\d{2}/.test(x.f.datum) ? new Date(`${x.f.datum.slice(0, 10)}T12:00:00`) : null;
  return [d ? `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` : "", x.f?.cas?.trim() ?? "", x.f?.kde?.trim() ?? ""].filter(Boolean).join(" · ");
};
/** OPRAVY 339: celý príspevok tak, ako bude na stránke (kategória, autor, nadpis, kedy a kde, text, fotky) */
function CelyPrispevok({ x }: { x: PolozkaFarnika }) {
  const kk = kedyKde(x), text = x.s?.trim() || x.text?.trim() || "";
  return <div style={{ padding: "14px 16px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 8 }}>
    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{druhT(x.k)} · {x.anon ? "bez mena" : x.kto}</span>
    {x.t && <b style={{ fontSize: 18, lineHeight: 1.3, overflowWrap: "anywhere" }}>{x.t}</b>}
    {kk && <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink2)" }}>{kk}</span>}
    {text && <span style={{ fontSize: 15, lineHeight: 1.55, color: "var(--ink)", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{text}</span>}
    {x.obr && <img src={x.obr} alt="" style={{ width: "100%", maxWidth: 420, borderRadius: 10, display: "block" }} />}
    {x.fotky?.length && !x.obr ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 6 }}>{x.fotky.slice(0, 12).map((f, j) => <img key={j} src={f} alt="" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, display: "block" }} />)}</div> : null}
  </div>;
}
const casNahl = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. o ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
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
function Oprava({ x, strankaId, pred }: { x: PolozkaFarnika; strankaId: string; /** OPRAVY 339: V poriadku · ponechať pred Uložiť opravu */ pred?: ReactNode }) {
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
      {pred}
      {/* OPRAVY 339: Uložiť opravu až po zmene textu — dovtedy veta, nie sivé tlačidlo */}
      {ok ? <span role="status" style={{ minHeight: 46, padding: "0 18px", borderRadius: 12, background: "var(--gSoft)", color: "var(--gInk)", fontSize: 14.5, fontWeight: 800, display: "flex", alignItems: "center" }}>Opravené ✓</span>
        : zmena ? <button type="button" onClick={uloz} style={{ minHeight: 46, padding: "0 18px", border: "none", borderRadius: 12, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, boxShadow: "none" }}>Uložiť opravu</button>
        : <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink3)" }}>Najprv upravte text, potom ho uložíte.</span>}
      <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Veriaci dostane správu, že ste jeho príspevok upravili.</span>
    </div>
  </>;
}

/** OPRAVY 344: dlaždice Od veriacich — každá časť zvlášť (detail na celú obrazovku) */
export type CastOdVeriacich = "umysly" | "caka" | "pridali" | "nahlasene" | "smie";
export function OdVeriacich({ strankaId, meno, mobil, toast, cast, onSpat }: { strankaId: string; /** názov farnosti (podpis správy veriacemu) */ meno: string; mobil: boolean; toast: (m: string) => void;
  /** OPRAVY 344: len jedna časť (dlaždica); bez = celé ako doteraz */ cast?: CastOdVeriacich; /** z „Čo môžu veriaci pridávať“ späť na dlaždice */ onSpat?: () => void }) {
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
  const [nastOtv, setNastOtv] = useState<DruhFarnika | true | false>(false); // OPRAVY 324: true = celé nastavenie, druh = otvorené na tej kategórii
  const smieF = nacitajSmie(strankaId), self = nacitajSelfAdd(strankaId);
  const st = DRUHY_FARNIKA.map((d) => (self.on ? stupen(smieF, d.k) : "zakazane"));
  const prepniVyb = hv.prepni;
  // OPRAVY 310: Čaká na vaše schválenie — Pozrieť · Zamietnuť · Zverejniť, Vybrať viac
  const [pozriC, setPozriC] = useState<string | null>(null);
  const [vybC, setVybC] = useState<Set<string> | null>(null);
  const rozhodni = (ids: string[], zverejnit: boolean) => { rozhodniOdFarnikov(strankaId, ids, zverejnit); setVybC(null); toast(zverejnit ? (ids.length === 1 ? "Zverejnené ✓ Veriaci dostane správu." : `Zverejnené ${ids.length} ✓`) : (ids.length === 1 ? "Nezverejnené. Veriaci dostane správu." : `Nezverejnené ${ids.length}`)); };
  if (nastOtv) return <NastavitPravidla strankaId={strankaId} mobil={mobil} toast={toast} onSpat={() => setNastOtv(false)} fokus={nastOtv === true ? undefined : nastOtv} />;
  // OPRAVY 324: pri každom príspevku — vypnúť takéto príspevky priamo v nastavení tej kategórie
  const nechcem = (k: DruhFarnika) => <button type="button" onClick={() => setNastOtv(k)} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--gInk)", boxShadow: "none", textAlign: "left" }}>Nechcem takéto príspevky › Nastaviť</button>;
  const tlC: CSSProperties = { minHeight: 44, padding: "0 14px", borderRadius: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "none" };
  // OPRAVY 339: po Zbaliť ostane príspevok na obrazovke (nič neodskočí preč)
  const drzNaMieste = (id: string) => requestAnimationFrame(() => document.querySelector(`[data-oz="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" }));
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
        <CelyPrispevok x={x} />
        {nechcem(x.k)}
      </div>}
      {!vybC && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {maNavyse(x) && <button type="button" onClick={() => { if (o) { setPozriC(null); drzNaMieste(x.id); } else setPozriC(x.id); }} aria-expanded={o} style={{ ...tlC, border: "1px solid var(--cardBd)", background: "var(--card)", color: "var(--ink)" }}>{o ? "Zbaliť ⌃" : "Pozrieť"}</button>}
        <button type="button" onClick={() => rozhodni([x.id], false)} style={{ ...tlC, border: "1.5px solid #A34A2A", background: "transparent", color: "#A34A2A" }}>Zamietnuť</button>
        <button type="button" onClick={() => rozhodni([x.id], true)} style={{ ...tlC, border: "none", background: "#4B7A35", color: "#fff" }}>Zverejniť</button>
      </div>}
    </div>); };


  const riadok = (x: PolozkaFarnika, i: number) => {
    const o = otv === x.id && !selM, on = vyb.has(x.id), ed = CEZ_EDITOR.includes(x.k), nahl = pocetNahl(x) > 0;
    // OPRAVY 339: V poriadku · ponechať — štítok zmizne, kto nahlásil, dostane správu (0105)
    const ponechat = <button type="button" onClick={() => { ponechajOdFarnika(strankaId, x.id); toast("Ponechané ✓ Kto príspevok nahlásil, dostane správu."); }}
      style={{ minHeight: 46, padding: "0 18px", border: "none", borderRadius: 12, background: "#4B7A35", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, boxShadow: "none" }}>V poriadku · ponechať</button>;
    return (
      <div key={x.id} data-oz={x.id} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <button type="button" onClick={() => (selM ? prepniVyb(x.id) : setOtv(o ? null : x.id))} aria-expanded={selM ? undefined : o} aria-pressed={selM ? on : undefined}
          style={{ width: "100%", minHeight: 62, padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" }}>
          {selM && <PolickoVyberu on={on} />}
          <span style={{ flex: "none", padding: "3px 9px", borderRadius: 8, ...farbaStitku(x.k === "parte" ? "parte" : x.k === "svadba" || x.k === "ine" ? "zlata" : "zelena"), fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", maxWidth: mobil ? 110 : undefined, overflow: "hidden", textOverflow: "ellipsis" }}>{druhT(x.k)}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 14.5 }}>{x.t}</b>
            <span style={{ fontSize: 12.5, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{[x.s, x.kto, kedy(x.cas), x.upravil ? "upravil farár" : "", vyprsal(x, terazMs()) ? "platnosť skončila" /* OPRAVY 350 */ : ""].filter(Boolean).join(" · ")}</span>
            {pocetNahl(x) > 0 && <span style={{ alignSelf: "flex-start", marginTop: 2, padding: "2px 8px", borderRadius: 7, background: "var(--cRedBg)", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: ".06em" }}>NAHLÁSENÉ · {pocetNahl(x)}×</span>}
            {x.k === "parte" && pocetSus(x) > 0 && <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>sústrasť prejavilo {pocetSus(x)} · rodine ide súhrn raz denne</span>}
          </span>
          {!selM && <span aria-hidden="true" style={{ flex: "none", fontSize: 18, color: "var(--ink3)" }}>{o ? "⌃" : "⌄"}</span>}
        </button>
        {o && <div style={{ padding: "0 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {nahl && <div role="note" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--errBg)", border: "1.5px solid var(--cRed)", display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 14.5, color: "var(--cRed)" }}>Nahlásené {pocetNahl(x)}×{x.nahlInfo?.length ? ` · naposledy ${casNahl(Math.max(...x.nahlInfo.map((n) => n.cas)))}` : ""}</b>
            {(x.nahlInfo ?? []).filter((n) => n.dovod).map((n, j) => <span key={j} style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink)" }}>Prečo: {n.dovod} <span style={{ color: "var(--ink3)" }}>· {casNahl(n.cas)}</span></span>)}
            {!(x.nahlInfo ?? []).some((n) => n.dovod) && <span style={{ fontSize: 13.5, color: "var(--ink2)" }}>Dôvod nenapísali. Kto nahlásil, nevidíte.</span>}
          </div>}
          {ed ? <>
              <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>Oznámenie z editora (parte, svadba, jubileum) upravuje ten, kto ho pridal. Vy ho môžete zmazať.</span>
              {nahl && <div>{ponechat}</div>}
            </>
            : <Oprava key={x.id} x={x} strankaId={strankaId} pred={nahl ? ponechat : undefined} />}
          {x.fotky?.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6 }}>{x.fotky.slice(0, 8).map((f, j) => <img key={j} src={f} alt="" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10, display: "block" }} />)}</div> : null}
          <div><PodrzZmaz onZmaz={() => { zmazOdFarnika(strankaId, x.id); setOtv(null); toast("Zmazané."); }} /></div>
          {nechcem(x.k)}
          <TlZbalit onZbal={() => setOtv(null)} />{/* OPRAVY 321 */}
        </div>}
      </div>);
  };

  if (cast === "smie") return <NastavitPravidla strankaId={strankaId} mobil={mobil} toast={toast} onSpat={onSpat ?? (() => undefined)} />;
  const ukaz = (c: CastOdVeriacich) => !cast || cast === c;
  const nahlCast = cast === "nahlasene";
  const LL = nahlCast ? L.filter((x) => pocetNahl(x) > 0) : L;
  const skupiny = SKUPINY.map(([nad, ks]) => [nad, LL.filter((x) => ks.includes(x.k))] as const).filter(([, l]) => l.length);

  return <>
    {/* OPRAVY 324: Čo môžu veriaci pridávať — hneď pod nadpisom, pred Úmyslami; zlatá karta nastavenia, nie riadok ako príspevok */}
    {!cast && <KartaNastavenia nadpis="Čo môžu veriaci pridávať" mobil={mobil} tlacidlo="Nastaviť" onClick={() => setNastOtv(true)}
      stav={<>{st.filter((x) => x === "povolene").length} povolené · {st.filter((x) => x === "schvalenie").length} po vašom schválení{st.every((x) => x === "zakazane") ? " · nič" : ""} · upozornenia {nast.upozornit ? "zapnuté" : "vypnuté"}</>} />}
    {/* D.1 · OPRAVY 176: úmysly hore — povinnosť farára, na stránku nejdú */}
    {ukaz("umysly") && <UmyslyFarara strankaId={strankaId} meno={meno} mobil={mobil} toast={toast} />}

    {cast === "caka" && !C.length && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: "14px 20px", fontSize: 14.5, color: "var(--ink3)" }}>Nič nečaká na schválenie.</section>}
    {ukaz("caka") && C.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 16 }}>
        <span style={{ ...NADPIS_SEKCIE, paddingTop: 0, flex: 1, color: "#B8913A" }}>ČAKÁ NA VAŠE SCHVÁLENIE · {C.length}</span>
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

    {(ukaz("pridali") || nahlCast) && <>
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 6 }}>
      <b style={{ flex: 1, fontSize: 17 }}>{nahlCast ? "Nahlásené" : "Pridali veriaci"} · {LL.length}</b>
      {LL.length > 0 && <TlacidloVyberu v={hv} />}
    </div>
    <ListaVyberu v={hv} polozky={LL.map((x) => ({ id: x.id, cas: x.cas }))} />
    {nahlCast && !LL.length && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: "14px 20px", fontSize: 14, color: "var(--ink3)" }}>Žiadny nahlásený príspevok.</section>}
    {!nahlCast && !LL.length && <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: "14px 20px", fontSize: 14, color: "var(--ink3)" }}>Zatiaľ nič. Čo veriaci pridajú, uvidíte tu a môžete to opraviť alebo zmazať.</section>}
    {skupiny.map(([nad, l]) => (
      <div key={nad} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 16 }}>
          <span style={{ ...NADPIS_SEKCIE, paddingTop: 0, flex: 1 }}>{nad} · {l.length}</span>
          <OznacitSkupinu v={hv} ids={l.map((x) => x.id)} />
        </div>
        <section style={{ ...karta, borderRadius: mobil ? 18 : 22, padding: mobil ? "4px 14px" : "6px 20px" }}>{l.map(riadok)}</section>
      </div>))}
    <PasVyberu v={hv} dolu={mobil ? 104 : 12} pocet={prispevkov}
      onZmaz={(ids) => { zmazOdFarnikov(strankaId, ids); setOtv(null); return `${ids.length === 1 ? "1 príspevok je zmazaný" : ids.length < 5 ? `${ids.length} príspevky sú zmazané` : `${ids.length} príspevkov je zmazaných`} ✓`; }} />
    </>}

  </>;
}
