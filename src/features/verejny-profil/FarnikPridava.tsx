// ============================================================
// KARTA 56I · 57 E — Veriaci pridáva sám (prototyp „Farnik pridava", mobil 390).
// Verejná stránka farnosti: pevné zelené + Pridať vpravo dole (len ak farár zapol a aspoň 1 druh) →
// hárok „Čo chcete pridať?": LEN PRE FARÁRA (úmysel) · NA STRÁNKU FARNOSTI (prosba, oznam, udalosť, fotky) ·
// svadba, jubileum, parte. Neregistrovaný: Prihlásiť / Zaregistrovať.
// Úmysel ide len farárovi (milodar je zatiaľ len v prototype — nepúšťať bez Martina).
// Udalosť a Fotky z akcie: náhľad prilepený hore, Pozvať ľudí + limit. Fotky sa uložia natrvalo (Storage).
// Parte, svadba, jubileum = Editor oznámení na celú obrazovku; po uložení ostáva otvorený.
// Na stránke: Galéria farnosti (albumy), Od veriacich s filtrom, hlavička autora, Zúčastním sa / Prihlásiť sa,
// Modlím sa s vami, Úprimnú sústrasť, ··· Nahlásiť, „Upraviť · moje" (len autor).
// ============================================================
import { CasPole } from "@/components/CasPole";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajSelfAdd } from "@/features/viera/UserOznamy";
import { DRUHY_FARNIKA, CEZ_EDITOR, BLOK_DRUHU, nacitajSmie, smie, odFarnikov, pridajOdFarnika, upravOdFarnika, zmazOdFarnika, prepniVPolozke, pocetSus, useOdFarnikov, useCerstveOdFarnikov, PLATI_VERIACI, vyprsal, type DruhFarnika, type PolozkaFarnika, type FormularVeriaceho } from "@/lib/odFarnikov";
import { dokonciCas, CAS_OK, pekny } from "@/lib/kalendarFarnosti";
import { bezDataUrl } from "@/lib/uploadFoto";
import type { MediumZbierky } from "@/lib/novaZbierka";
import { GaleriaEditor, cistyText } from "@/features/rola/obsahZbierky";
import { TextOznamu } from "@/features/rola/OznamyFarnosti";
import { DrzTlacidlo } from "@/features/viera/AdresarCirkvi";
import { EditorOznameni, type EditorApi, type PayloadEditora, type TypEditora } from "@/components/EditorOznameni";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { zapisEditora, zapisZPayloadu } from "@/lib/editorStat";
import { toast } from "@/shared";

const ZELENA = "#4B7A35", ZLATA = "#C9A24A";
const lab = (zle: boolean): CSSProperties => ({ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: zle ? "#A07A1C" : "var(--ink3)" });
const pole = (zle: boolean): CSSProperties => ({ height: 52, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: `${zle ? 2 : 1}px solid ${zle ? ZLATA : "var(--cardBd)"}`, fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" });
const dnesIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtD = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return y ? `${d}. ${m}. ${y}` : ""; };
const teraz = () => Date.now();
const kedy = (cas: number) => { const d = new Date(cas); return teraz() - cas < 5 * 60e3 ? "teraz" : `${d.getDate()}. ${d.getMonth() + 1}.`; };
const druhT = (k: DruhFarnika) => DRUHY_FARNIKA.find((d) => d.k === k)?.t ?? "";
const NADPIS: Partial<Record<DruhFarnika, string>> = { oznam: "nadpis", udalost: "názov", umysel: "za koho", fotky: "z akej akcie" };
const ludi = (n: number) => `${n} ${n === 1 ? "človek" : n >= 2 && n <= 4 ? "ľudia" : "ľudí"}`;
const fotiekT = (n: number) => `${n} ${n === 1 ? "fotka" : n >= 2 && n <= 4 ? "fotky" : "fotiek"}`;
const MES_K = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];
const DNI_W = ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"];
const PAL = ["#C77D9A", "#5C8F9E", "#8C7AB8", "#B8875C", "#6E9E6A"];
const prazdnyF = (): FormularVeriaceho => ({ nad: "", txt: "", datum: "", cas: "", kde: "", umK: 0, pozv: 0, limit: "", anon: false, plat: 0 });
const naHtml = (t: string) => t ? t.split("\n").map((r) => `<p>${r.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("") : "";
/** E.1: poradie v hárku */
const SKUPINY: [string, DruhFarnika[]][] = [["LEN PRE FARÁRA · NIKTO INÝ NEVIDÍ", ["umysel"]], ["NA STRÁNKU FARNOSTI", ["modlitba", "oznam", "udalost", "fotky"]], ["", ["svadba", "ine", "parte"]]];
const TYP_EDITORA: Partial<Record<DruhFarnika, TypEditora>> = { parte: "parte", svadba: "svadba", ine: "jubileum" };
const POZVANIA: [string, string][] = [["Bez prihlásenia", "len informácia"], ["Nezáväzne · Zúčastním sa", "ľudia ťuknú, viete, koľko ich asi príde"], ["Záväzne · Prihlásiť sa", "prihlásia sa menom, napr. na púť do autobusu. Môžete dať limit."]];
/** kľúč účtu pre Zúčastním sa, Modlím sa, Sústrasť, Nahlásiť, autora */
export const klucJa = (ja: { ucetId: string | null; demo?: boolean; celeMeno: string }) => ja.ucetId ?? (ja.demo ? "demo" : `meno:${ja.celeMeno}`);

// ---- „Upraviť · moje" na stránke → otvorí formulár veriaceho (dve časti stránky, jeden stav) ----
let upravId: string | null = null;
const upravPosl = new Set<() => void>();
export const nastavUpravu = (id: string | null) => { upravId = id; upravPosl.forEach((f) => f()); };
const useUprava = () => useSyncExternalStore((f) => { upravPosl.add(f); return () => { upravPosl.delete(f); }; }, () => upravId);

/** sviečka (prosba o modlitbu, anonym) */
export function Sviecka({ s = 40 }: { s?: number }) {
  return (
    <span aria-hidden="true" style={{ flex: "none", width: s, height: s, borderRadius: "50%", background: "#1D211B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: s * 0.18, boxSizing: "border-box", gap: s * 0.04 }}>
      <span style={{ width: s * 0.14, height: s * 0.22, borderRadius: "50% 50% 45% 45%", background: "#F2C14E", boxShadow: "0 0 8px rgba(242,193,78,.7)" }} />
      <span style={{ width: s * 0.2, height: s * 0.3, borderRadius: 2, background: "#EFE9DD" }} />
    </span>);
}

/** E.3/E.4: tlačidlo Zúčastním sa / Prihlásiť sa s limitom */
function Pozvanie({ x, strankaId, kto, reg }: { x: PolozkaFarnika; strankaId: string; kto: string; reg: boolean }) {
  const zav = x.pozv === 2, l = x.ucast ?? [], ja = l.includes(kto), n = l.length, lim = x.limit ?? 0;
  const plne = zav && lim > 0 && n >= lim && !ja;
  const t = plne ? "Plné · ďakujeme" : ja ? (zav ? "Prihlásený ✓ · zrušiť" : "Zúčastníte sa ✓ · zrušiť") : zav ? "Prihlásiť sa" : "Zúčastním sa";
  const info = (zav ? `prihlásených ${n}${lim ? ` z ${lim}` : ""}` : n ? `zúčastní sa ${ludi(n)}` : "zatiaľ nikto") + (zav ? " · záväzne, menom" : " · nezáväzne");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
      <button type="button" disabled={plne} aria-pressed={ja} onClick={() => { if (zav && !reg) { toast("Prihlásiť sa menom môžu len registrovaní v DEED."); return; } prepniVPolozke(strankaId, x.id, "ucast", kto); }}
        style={{ minHeight: 48, padding: "0 18px", borderRadius: 13, border: ja ? "1.5px solid var(--gBd)" : "none", background: ja ? "var(--gSoft)" : plne ? "var(--btn)" : ZELENA, color: ja ? "var(--gInk)" : plne ? "var(--ink3)" : "#fff", cursor: plne ? "default" : "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>{t}</button>
      <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{info}</span>
    </div>);
}

/** ··· Nahlásiť nevhodný príspevok · Upraviť · moje */
export function MenuPrispevku({ x, strankaId, kto, moje }: { x: PolozkaFarnika; strankaId: string; kto: string; moje: boolean }) {
  const [menu, setMenu] = useState(false), [potvrd, setPotvrd] = useState(false), [ok, setOk] = useState(false);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  // OPRAVY 190: svadbu a jubileum (cez editor) si autor upraví sám a zmaže podržaním
  const mozeUp = moje && ["oznam", "udalost", "modlitba", "svadba", "ine", "fotky"].includes(x.k); // OPRAVY 194: aj fotky z akcie
  const mozeZmaz = moje && x.k !== "umysel";
  return <>
    {potvrd && <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--goldBg)", border: `1.5px solid ${ZLATA}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <b style={{ fontSize: 15.5 }}>Nahlásiť farárovi?</b>
      <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Farár príspevok pozrie. Kto nahlásil, sa nedozvie autor.</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => { prepniVPolozke(strankaId, x.id, "nahlasili", kto, "pridat"); setPotvrd(false); setOk(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setOk(false), 2500); }} style={{ minHeight: 46, padding: "0 16px", border: "none", borderRadius: 12, background: "#A34A2A", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800 }}>Áno, nahlásiť</button>
        <button type="button" onClick={() => setPotvrd(false)} style={{ minHeight: 46, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Zrušiť</button>
      </div>
    </div>}
    {ok && <span role="status" style={{ fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>Nahlásené ✓ Farár to pozrie.</span>}
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={() => setMenu((m) => !m)} aria-label="Viac" aria-expanded={menu} style={{ minWidth: 44, minHeight: 40, padding: "0 10px", borderRadius: 10, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 18, fontWeight: 800, color: "var(--ink3)", lineHeight: 1 }}>···</button>
      {menu && <button type="button" onClick={() => { setMenu(false); setPotvrd(true); }} style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>Nahlásiť nevhodný príspevok</button>}
      {mozeUp && <button type="button" onClick={() => nastavUpravu(x.id)} style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, color: "var(--gInk)" }}>Upraviť · moje</button>}
      {mozeZmaz && <DrzTlacidlo ms={1200} styl={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: "1.5px solid #A34A2A", background: "transparent", color: "#A34A2A", fontSize: 13.5, fontWeight: 800 }}
        onHotovo={() => { zmazOdFarnika(strankaId, x.id); toast("Zmazané ✓"); }}>Podržte · zmazať</DrzTlacidlo>}
    </div>
  </>;
}

/** obrázok na celú obrazovku (oznámenie z editora pre slabozrakých, album) */
export function CelaObrazovka({ children, onZavri, label, hore }: { children: ReactNode; onZavri: () => void; label: string; hore?: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onZavri(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onZavri]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "#0E0C08", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", padding: "calc(12px + env(safe-area-inset-top, 0px)) 16px 10px", display: "flex", alignItems: "center", gap: 12 }}>
        {hore ?? <span style={{ flex: 1 }} />}
        <button type="button" onClick={onZavri} autoFocus style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#111" }}>× Zavrieť</button>
      </div>
      {children}
    </div>, document.body);
}

/** prehliadač albumu (Galéria farnosti, Príď a zaži s nami · Fotky z akcií) */
export function ProhliadacAlbumu({ a, onZavri }: { a: PolozkaFarnika; onZavri: () => void }) {
  const [i, setI] = useState(0);
  const F = a.fotky ?? [];
  return (
    <CelaObrazovka label="Album" onZavri={onZavri} hore={<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 17, color: "#fff" }}>{a.t}</b><span style={{ fontSize: 13, color: "#CFC7B8" }}>{(i % F.length) + 1} / {F.length}</span></span>}>
        {a.text && <span style={{ flex: "none", padding: "0 16px 10px", fontSize: 15, lineHeight: 1.5, color: "#E8E1D3" }}>{a.text}</span>}
        <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={F[i % F.length]} alt={a.popisy?.[i % F.length] || ""} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          {F.length > 1 && <>
            <button type="button" onClick={() => setI((j) => (j - 1 + F.length) % F.length)} aria-label="Predošlá" style={{ position: "absolute", left: 8, top: "50%", marginTop: -28, width: 56, height: 56, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.85)", cursor: "pointer", fontSize: 26, fontWeight: 800, color: "#111" }}>‹</button>
            <button type="button" onClick={() => setI((j) => (j + 1) % F.length)} aria-label="Ďalšia" style={{ position: "absolute", right: 8, top: "50%", marginTop: -28, width: 56, height: 56, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.85)", cursor: "pointer", fontSize: 26, fontWeight: 800, color: "#111" }}>›</button>
          </>}
        </div>
        {a.popisy?.[i % F.length] && <span style={{ flex: "none", padding: "10px 16px 0", fontSize: 15, color: "#E8E1D3", textAlign: "center" }}>{a.popisy[i % F.length]}</span>}
        <div style={{ flex: "none", display: "flex", gap: 6, overflowX: "auto", padding: "12px 16px calc(16px + env(safe-area-inset-bottom, 0px))" }}>
          {F.map((f, j) => <button key={j} type="button" onClick={() => setI(j)} aria-label={`Fotka ${j + 1}`} style={{ flex: "none", width: 64, height: 48, padding: 0, borderRadius: 8, border: `3px solid ${j === i % F.length ? "#fff" : "transparent"}`, background: `url('${f}') center/cover no-repeat #333`, cursor: "pointer" }} />)}
        </div>
    </CelaObrazovka>);
}

/** E.4: Galéria farnosti — albumy z „Fotky z akcie", prehliadač albumu */
function GaleriaFarnosti({ alba, strankaId, kto, reg }: { alba: PolozkaFarnika[]; strankaId: string; kto: string; reg: boolean }) {
  const [otv, setOtv] = useState<string | null>(null);
  const a = alba.find((x) => x.id === otv);
  const F = a?.fotky ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <b style={{ fontSize: 24, letterSpacing: "-.02em" }}>Galéria farnosti</b>
      <span style={{ fontSize: 14.5, color: "var(--ink3)", marginTop: -4 }}>Fotky z akcií od veriacich · ťuknite na album</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
        {alba.map((x) => (
          <div key={x.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
            <button type="button" onClick={() => setOtv(x.id)} style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)", display: "flex", flexDirection: "column", gap: 8 }}>
              <img src={x.fotky![0]} alt="" style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", borderRadius: 12, display: "block", background: "var(--field)" }} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16.5 }}>{x.t || "Fotky z akcie"}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{fotiekT(x.fotky!.length)}{x.pozv ? ` · Ďalšia: ${x.dalsia || "termín oznámime"}` : ""}</span></span>
            </button>
            {!!x.pozv && <Pozvanie x={x} strankaId={strankaId} kto={kto} reg={reg} />}
          </div>))}
      </div>
      {a && F.length > 0 && <ProhliadacAlbumu a={a} onZavri={() => setOtv(null)} />}
    </div>);
}

type Filter = "vse" | "udal" | "pros" | "ozn" | "oz";
const FILTRE: [Filter, string][] = [["vse", "Všetko"], ["udal", "Udalosti"], ["pros", "Prosby"], ["ozn", "Oznámenia"], ["oz", "Krátke oznamy"]];
const vFiltri = (f: Filter, x: PolozkaFarnika) => f === "vse" || (f === "udal" && x.k === "udalost") || (f === "pros" && x.k === "modlitba") || (f === "ozn" && CEZ_EDITOR.includes(x.k)) || (f === "oz" && x.k === "oznam");
/** E.8: udalosť zmizne deň po termíne */
const platne = (x: PolozkaFarnika) => !(x.k === "udalost" && x.f?.datum && x.f.datum < posunDen(dnesIso(), -1)) && !vyprsal(x, teraz());
function posunDen(iso: string, o: number) { const [y, m, d] = iso.split("-").map(Number); const t = new Date(y, m - 1, d + o); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; }

/** sekcia „Od veriacich" na verejnej stránke (cieľ „Pozrieť na stránke ›") + Galéria farnosti */
export function OdFarnikov({ strankaId, novy, pad, fab }: { strankaId: string; novy?: string | null; pad?: string; /** tlačidlo + Pridať je zapnuté */ fab: boolean }) {
  useOdFarnikov(); useCerstveOdFarnikov(strankaId);
  const ja = usePouzivatel();
  const kto = klucJa(ja), reg = ja.typ !== "pasivny";
  const [flt, setFlt] = useState<Filter>("vse");
  const [velke, setVelke] = useState<PolozkaFarnika | null>(null);
  const vsetko = odFarnikov(strankaId).filter((x) => x.k !== "umysel" && platne(x)); // úmysel na omšu vidí len farár (v Správe)
  const alba = vsetko.filter((x) => x.k === "fotky" && x.fotky?.length);
  const list = vsetko.filter((x) => !(x.k === "fotky" && x.fotky?.length));
  const zobraz = list.filter((x) => vFiltri(flt, x));
  if (!vsetko.length && !fab) return null;
  return (
    <section data-od-farnikov="1" style={{ padding: pad, display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 16 }}>
      {alba.length > 0 && <GaleriaFarnosti alba={alba} strankaId={strankaId} kto={kto} reg={reg} />}
      <b style={{ fontSize: 28, letterSpacing: "-.02em", paddingTop: alba.length ? 12 : 0 }}>Od veriacich</b>
      {list.length > 2 && <div role="toolbar" aria-label="Filter" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {FILTRE.map(([k, t]) => { const on = flt === k; return <button key={k} type="button" aria-pressed={on} onClick={() => setFlt(k)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 20, border: `1px solid ${on ? ZELENA : "var(--cardBd)"}`, background: on ? ZELENA : "var(--card)", color: on ? "#fff" : "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800 }}>{t}</button>; })}
      </div>}
      {!list.length && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--ink3)" }}>Zatiaľ nič. Ťuknite na zelené tlačidlo + Pridať dole.</span>}
      {zobraz.map((x) => {
        const on = x.id === novy, anon = !!x.anon || /Bohu známy/.test(x.kto);
        const meno = anon ? "Bohu známy veriaci" : x.kto;
        const h = [...meno].reduce((a, c) => a + c.charCodeAt(0), 0);
        const moje = !!x.autor && x.autor === kto;
        const modl = x.modl ?? [], modJa = modl.includes(kto), sus = x.sustrast ?? [], susJa = sus.includes(kto);
        const obr = x.obr ?? (x.editor ? x.fotky?.[0] : undefined);
        return (
          <div key={x.id} style={{ padding: 16, borderRadius: 18, background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, display: "flex", flexDirection: "column", gap: 8 }}>
            {/* E.7: hlavička autora */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {anon ? <Sviecka /> : <span aria-hidden="true" style={{ flex: "none", width: 40, height: 40, borderRadius: "50%", background: PAL[h % PAL.length], color: "#fff", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{(meno.trim()[0] ?? "V").toUpperCase()}</span>}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15.5 }}>{meno}</b><span style={{ fontSize: 13, color: "var(--ink3)" }}>{anon ? "meno pozná len farár" : "veriaci"}{x.mesto && x.mesto !== "—" ? ` · ${x.mesto}` : ""}</span></span>
              <span style={{ flex: "none", fontSize: 13, color: "var(--ink3)" }}>{kedy(x.cas)}{x.upravene || x.upravil ? " · upravené" : ""}</span>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>{druhT(x.k).toLocaleUpperCase("sk-SK")}</span>
            {obr && <button type="button" onClick={() => setVelke(x)} aria-label="Zväčšiť na celú obrazovku" style={{ position: "relative", padding: 0, border: "1px solid var(--cardBd)", borderRadius: 12, overflow: "hidden", background: "#fff", cursor: "zoom-in" }}>
              <img src={obr} alt={x.t} style={{ display: "block", width: "100%", maxHeight: 560, objectFit: "contain", background: "#fff" }} />
              <span style={{ position: "absolute", right: 8, bottom: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(20,17,11,.75)", color: "#fff", fontSize: 13, fontWeight: 800 }}>Zväčšiť</span>
            </button>}
            {!obr && x.k === "udalost" && x.fotky?.[0] && <img src={x.fotky[0]} alt="" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 12 }} />}
            {x.k === "modlitba" ? <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}><Sviecka s={44} /><span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}><b style={{ fontSize: 18, lineHeight: 1.25 }}>{x.t}</b>{x.s && <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "pre-line" }}>{x.s}</span>}</span></div>
              {/* E.6: Modlím sa s vami + počet */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button type="button" aria-pressed={modJa} onClick={() => prepniVPolozke(strankaId, x.id, "modl", kto)} style={{ minHeight: 48, padding: "0 18px", borderRadius: 13, border: `1.5px solid ${modJa ? "var(--gBd)" : "var(--cardBd)"}`, background: modJa ? "var(--gSoft)" : "var(--card)", color: modJa ? "var(--gInk)" : "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>{modJa ? "Modlíte sa s nami ✓" : "Modlím sa s vami"}</button>
                <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{modl.length ? `modlí sa ${ludi(modl.length)}` : "Buďte prvý, kto sa pridá k modlitbe"}</span>
              </div>
            </> : <>
              {!obr && <b style={{ fontSize: 19, lineHeight: 1.25 }}>{x.t}</b>}
              {x.s && !obr && <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "pre-line" }}>{x.s}</span>}
            </>}
            {!!x.pozv && x.k === "udalost" && <Pozvanie x={x} strankaId={strankaId} kto={kto} reg={reg} />}
            {/* E.8: pod parte Úprimnú sústrasť */}
            {x.k === "parte" && <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button type="button" aria-pressed={susJa} onClick={() => prepniVPolozke(strankaId, x.id, "sustrast", kto)} style={{ minHeight: 48, padding: "0 18px", borderRadius: 13, border: "1.5px solid var(--cardBd)", background: susJa ? "var(--btn)" : "var(--card)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800 }}>{susJa ? "Prejavili ste sústrasť ✓" : "Úprimnú sústrasť"}</button>
              <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{pocetSus(x) ? `sústrasť prejavilo ${ludi(pocetSus(x))}` : "Rodina dostane raz denne súhrn, nebude jej to vyzváňať."}</span>
            </div>}
            <MenuPrispevku x={x} strankaId={strankaId} kto={kto} moje={moje} />
          </div>); })}
      {velke && (velke.obr ?? velke.fotky?.[0]) && <CelaObrazovka label="Oznámenie na celú obrazovku" onZavri={() => setVelke(null)}>
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px 24px" }}><img src={velke.obr ?? velke.fotky![0]} alt={velke.t} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", background: "#fff" }} /></div>
      </CelaObrazovka>}
    </section>);
}

/** je tlačidlo + Pridať zapnuté (farár povolil a aspoň 1 druh) */
export function fabZapnuty(strankaId: string): boolean {
  const s = nacitajSmie(strankaId);
  return nacitajSelfAdd(strankaId).on && DRUHY_FARNIKA.some((d) => smie(s, d.k));
}

export function FarnikPridava({ strankaId, mobil, onPozriet }: { strankaId: string; mobil: boolean; onPozriet: (id: string) => void }) {
  useOdFarnikov();
  const ja = usePouzivatel();
  const reg = ja.typ !== "pasivny";
  const self = nacitajSelfAdd(strankaId), sm = nacitajSmie(strankaId);
  const povol = DRUHY_FARNIKA.filter((d) => smie(sm, d.k));
  const pop = self.poplatok || 0;
  const [sheet, setSheet] = useState(false);
  const [k, setK] = useState<DruhFarnika | null>(null);
  const [edId, setEdId] = useState<string | null>(null);
  const [f, setF] = useState<FormularVeriaceho>(prazdnyF);
  const [txtKey, setTxtKey] = useState(0);
  const [media, setMedia] = useState<MediumZbierky[]>([]);
  const [chyba, setChyba] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const [edToast, setEdToast] = useState(false);
  const [uklada, setUklada] = useState(false);
  const [casChyba, setCasChyba] = useState(false); // OPRAVY 180: zlý čas počas písania
  // KARTA 57C §2: po zverejnení zelená hláška dole na stránke + posun k bloku
  const [ok, setOk] = useState<{ t: string; s: string } | null>(null);
  const okTm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(okTm.current), []);
  const naStranke = (id: string, druh: DruhFarnika, upravene: boolean) => {
    const b = BLOK_DRUHU[druh];
    setOk(druh === "umysel" ? { t: "Úmysel je zapísaný ✓", s: "Ide len farárovi. Na stránke ho nikto nevidí. Farár vám potvrdí čas omše." }
      : { t: upravene ? "Zmeny sú uložené ✓" : "Zverejnené ✓", s: `Nájdete to nižšie v bloku ${b?.[1] ?? "Oznamy farnosti"}.` });
    window.clearTimeout(okTm.current); okTm.current = window.setTimeout(() => setOk(null), 9000);
    if (druh !== "umysel") onPozriet(id);
  };
  const edRef = useRef<EditorApi>(null);
  const tm = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(tm.current), []);
  const zavri = () => { setK(null); setHotovo(null); setEdId(null); setEdToast(false); };
  /** ‹ Späť na stránku farnosti — po uloženom oznámení z editora hláška a posun k bloku */
  const spatNaStranku = () => { const h = hotovo, kk = k; zavri(); if (h && kk && CEZ_EDITOR.includes(kk)) naStranke(h, kk, false); };
  useEffect(() => {
    if (!sheet && !k) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setSheet(false); zavri(); } };
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, [sheet, k]);
  // „Upraviť · moje" zo stránky
  const naUpravu = useUprava();
  const [upravPrev, setUpravPrev] = useState<string | null>(null);
  if (naUpravu !== upravPrev) {
    setUpravPrev(naUpravu);
    const x = naUpravu ? odFarnikov(strankaId).find((y) => y.id === naUpravu) : undefined;
    if (x) {
      const ff = x.f ?? { ...prazdnyF(), nad: x.t, txt: naHtml(x.s), anon: !!x.anon };
      setF(ff); setTxtKey((n) => n + 1); setMedia((x.k === "udalost" || x.k === "fotky" ? x.fotky ?? [] : []).map((src, i) => ({ id: i + 1, typ: "foto" as const, src, ...(x.popisy?.[i] ? { popis: x.popisy[i] } : {}) })));
      setEdId(x.id); setK(x.k); setHotovo(null); setChyba(false); setSheet(false);
    }
  }
  useEffect(() => { if (naUpravu) nastavUpravu(null); }, [naUpravu]);
  if (!self.on || !povol.length) return null;

  const set = (z: Partial<FormularVeriaceho>) => { setF((q) => ({ ...q, ...z })); setChyba(false); };
  const otvor = (kk: DruhFarnika) => { setF(prazdnyF()); setTxtKey((n) => n + 1); setMedia([]); setChyba(false); setHotovo(null); setEdId(null); setEdToast(false); setSheet(false); setK(kk); };
  const T = DRUHY_FARNIKA.find((d) => d.k === k);
  const plati = pop > 0 && !T?.zadarmo && !edId;
  const fotky = media.filter((m) => m.typ === "foto");
  const kto = klucJa(ja);
  const jeEd = !!k && CEZ_EDITOR.includes(k);
  const pz = f.pozv as 0 | 1 | 2;
  const limitN = pz === 2 ? parseInt(f.limit, 10) || undefined : undefined;

  // ---- čo chýba (zobrazí sa až po pokuse o zverejnenie) ----
  const ch: [string, string][] = [];
  if (k && NADPIS[k] && !f.nad.trim()) ch.push(["nad", NADPIS[k]!]);
  if (k === "udalost" && !f.datum) ch.push(["datum", "dátum"]);
  if ((k === "udalost" || k === "fotky") && f.cas && !CAS_OK(dokonciCas(f.cas))) ch.push(["cas", "správny čas"]);
  if (k === "umysel" && f.umK === 1 && !f.datum) ch.push(["datum", "deň"]);
  if (k === "fotky" && !fotky.length) ch.push(["gal", "aspoň 1 fotku"]);
  if (k === "modlitba" && !cistyText(f.txt)) ch.push(["text", "text prosby"]);
  const zle = (x: string) => chyba && ch.some((c) => c[0] === x);

  // E.2: na konkrétny deň už sú iné žiadosti → žltá hláška (neblokuje)
  const umNaDen = k === "umysel" && f.umK === 1 && f.datum ? odFarnikov(strankaId).filter((x) => x.k === "umysel" && x.f?.umK === 1 && x.f.datum === f.datum && x.id !== edId).length : 0;

  const uloz = async () => {
    if (!k || uklada) return;
    setUklada(true);
    const c = dokonciCas(f.cas), ff = { ...f, cas: CAS_OK(c) ? c : f.cas };
    const txt = cistyText(f.txt);
    const s = k === "udalost" ? [fmtD(f.datum), CAS_OK(c) ? pekny(c) : "", f.kde.trim(), txt].filter(Boolean).join(" · ")
      : k === "umysel" ? (f.umK === 1 && f.datum ? `želaný deň ${fmtD(f.datum)}` : "najbližšia voľná omša")
      : k === "fotky" ? fotiekT(fotky.length)
      : txt.slice(0, 600);
    const anon = k === "modlitba" && f.anon;
    const t = k === "modlitba" ? (anon ? "Prosím o modlitbu" : `${ja.celeMeno || "Veriaci"} prosí o modlitbu`) : f.nad.trim();
    const povodny = edId ? odFarnikov(strankaId).find((x) => x.id === edId) : undefined;
    const zaklad: PolozkaFarnika = {
      ...(povodny ?? {}), id: povodny?.id ?? `f${teraz().toString(36)}`, k, t, s, kto: anon ? "Bohu známy veriaci" : ja.celeMeno || "Veriaci", cas: povodny?.cas ?? teraz(),
      autor: kto, mesto: ja.mesto, anon: k === "modlitba" ? anon : undefined, f: ff, autorFoto: anon ? undefined : povodny?.autorFoto ?? ja.foto ?? undefined,
      fotky: k === "udalost" || k === "fotky" ? (fotky.length ? fotky.map((m) => m.src) : undefined) : undefined,
      popisy: k === "fotky" ? fotky.map((m) => m.popis ?? "") : undefined, text: k === "fotky" ? txt || undefined : undefined,
      pozv: k === "udalost" || k === "fotky" ? pz : undefined, limit: k === "udalost" || k === "fotky" ? limitN : undefined,
      dalsia: k === "fotky" && pz ? [fmtD(f.datum), CAS_OK(c) ? pekny(c) : ""].filter(Boolean).join(" · ") : undefined,
      upravene: povodny ? true : undefined };
    // E.3: fotky natrvalo (Storage), nie data URL
    let it: PolozkaFarnika;
    try { it = await bezDataUrl(zaklad, "od-veriacich"); } catch (e) { toast(e instanceof Error ? e.message : "Fotky sa nepodarilo uložiť."); setUklada(false); return; }
    if (povodny) upravOdFarnika(strankaId, povodny.id, it); else pridajOdFarnika(strankaId, it);
    // OPRAVY 170: udalosť veriaceho sa do kalendára farnosti nezapisuje
    // KARTA 57C §2: formulár sa zavrie, dole hláška a stránka sa posunie k bloku
    setChyba(false); setUklada(false); zavri(); naStranke(it.id, k, !!povodny);
  };
  const zverejni = () => { if (ch.length) { setChyba(true); return; } void uloz(); };

  // ---- E.5: Editor oznámení (parte, svadba, jubileum) — po uložení ostáva otvorený ----
  const kdeStat = { kto: "veriaci" as const, stranka_typ: "farnost", stranka: strankaId, pri_zbierke: false };
  const naEditor = async (p: PayloadEditora) => {
    if (!k) return;
    zapisZPayloadu(p, kdeStat); // KARTA 57 F: štatistika editora
    if (p.stav !== "hotovo") return;
    const P = p.polia ?? {}, str = (x: string) => String(P[x] ?? "").trim();
    const t = k === "parte" ? str("meno") : k === "svadba" ? [str("sNev"), str("sZen")].filter(Boolean).join(" a ") : str("jMeno") || str("bMeno");
    const s = k === "parte" ? (P.neskor ? "Termín rozlúčky oznámime." : [fmtD(str("rd")), str("rc"), str("rm")].filter(Boolean).join(" · "))
      : k === "svadba" ? [fmtD(str("sD")), str("sC"), str("sM")].filter(Boolean).join(" · ") : [fmtD(str("jD")), str("jC"), str("jM")].filter(Boolean).join(" · ");
    const obr = (await edRef.current?.nahlad()) || "";
    let it: PolozkaFarnika;
    const povodny = edId ? odFarnikov(strankaId).find((y) => y.id === edId) : undefined; // OPRAVY 190: úprava ponechá id aj reakcie
    try { it = await bezDataUrl<PolozkaFarnika>({ ...(povodny ?? {}), id: povodny?.id ?? `f${teraz().toString(36)}`, k, t: t || druhT(k), s, kto: povodny?.kto ?? (ja.celeMeno || "Veriaci"), cas: povodny?.cas ?? teraz(), autor: povodny?.autor ?? kto, mesto: povodny?.mesto ?? ja.mesto, autorFoto: povodny?.autorFoto ?? ja.foto ?? undefined, editor: p, obr: obr || undefined }, "od-veriacich"); }
    catch (e) { toast(e instanceof Error ? e.message : "Oznámenie sa nepodarilo uložiť."); return; }
    pridajOdFarnika(strankaId, it);
    setHotovo(it.id); setEdToast(true); window.clearTimeout(tm.current); tm.current = window.setTimeout(() => setEdToast(false), 2500);
  };

  const fab = !k && (
    <button type="button" onClick={() => setSheet(true)} aria-label="Pridať na stránku farnosti" style={{ position: "fixed", right: mobil ? 16 : 28, bottom: mobil ? 96 + 16 : 28, zIndex: 150, width: 68, height: 68, padding: 0, border: "none", borderRadius: "50%", background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(30,40,20,.35)" }}>
      <span aria-hidden="true" style={{ position: "relative", width: 26, height: 26, flex: "none" }}>
        <span style={{ position: "absolute", left: 11, top: 0, width: 4, height: 26, borderRadius: 2, background: "#fff" }} />
        <span style={{ position: "absolute", top: 11, left: 0, width: 26, height: 4, borderRadius: 2, background: "#fff" }} />
      </span>
    </button>);

  const harok = sheet && (
    <div className="sc-tokeny" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: mobil ? "center" : "flex-end", padding: mobil ? 0 : 20, boxSizing: "border-box" }}>
      <div onClick={() => setSheet(false)} style={{ position: "absolute", inset: 0, background: "rgba(10,9,6,.55)" }} />
      <div role="dialog" aria-modal="true" aria-label="Čo chcete pridať" style={{ position: "relative", width: mobil ? "100%" : 440, maxHeight: mobil ? "88vh" : "calc(100vh - 40px)", overflowY: "auto", background: "var(--bg)", color: "var(--ink)", borderRadius: mobil ? "24px 24px 0 0" : 24, padding: "14px 16px 24px", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ flex: 1, fontSize: 21 }}>Čo chcete pridať?</b>
          <button type="button" onClick={() => setSheet(false)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink2)" }}>× Zavrieť</button>
        </div>
        {reg ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SKUPINY.map(([nad, ks]) => { const l = ks.map((kk) => povol.find((d) => d.k === kk)).filter((d): d is (typeof povol)[number] => !!d); return l.length > 0 && <div key={nad || "ozn"} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {nad && <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", padding: "6px 2px 0" }}>{nad}</span>}
            {!nad && <span aria-hidden="true" style={{ height: 6 }} />}
            {l.map((d) => (
              <button key={d.k} type="button" onClick={() => otvor(d.k)} style={{ minHeight: 66, padding: "10px 16px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "var(--ink)" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 17 }}>{d.t}</b>
                  <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{d.sv}{d.k === "umysel" ? " · len farárovi" : ""}{pop && !d.zadarmo ? ` · ${pop} €` : " · zadarmo"}</span>
                </span>
                <span aria-hidden="true" style={{ fontSize: 20, color: "var(--ink3)" }}>›</span>
              </button>))}
          </div>; })}
          <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink3)", paddingTop: 6 }}>Ponúka sa len to, čo farár povolil. Pridávať môžu registrovaní v DEED.</span>
        </div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink2)" }}>Pridávať na stránku farnosti môžu len registrovaní v DEED. Tak vždy vieme, kto čo pridal.</span>
          {/* PLACEBO — karta 56I: prihlásenie a registrácia z tejto stránky */}
          <button type="button" onClick={() => { setSheet(false); toast("Prihlásenie odtiaľto pripravujeme."); }} style={{ minHeight: 56, border: "none", borderRadius: 14, background: ZELENA, cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#fff" }}>Prihlásiť sa</button>
          <button type="button" onClick={() => { setSheet(false); toast("Registráciu odtiaľto pripravujeme."); }} style={{ minHeight: 56, borderRadius: 14, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "var(--gInk)" }}>Zaregistrovať sa · 2 minúty</button>
        </div>}
      </div>
    </div>);

  const seg = <V,>(vol: [V, string][], cur: V, setV: (v: V) => void) => (
    <div role="radiogroup" style={{ display: "flex", gap: 8 }}>
      {vol.map(([v, t]) => { const on = v === cur; return <button key={String(v)} type="button" role="radio" aria-checked={on} onClick={() => { setV(v); setChyba(false); }} style={{ flex: 1, minHeight: 52, borderRadius: 14, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink)" }}>{t}</button>; })}
    </div>);
  const vstup = (label: string, kluc: keyof FormularVeriaceho & string, ph: string, extra?: Partial<JSX.IntrinsicElements["input"]>, max = 80) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={lab(zle(kluc))}>{label}</span>
      <input value={String(f[kluc] ?? "")} onChange={(e) => set({ [kluc]: e.target.value.slice(0, max) } as Partial<FormularVeriaceho>)} placeholder={ph} aria-invalid={zle(kluc) || undefined} style={pole(zle(kluc))} {...extra} /></label>);
  const casPole = (label = "ČAS") => {
    return <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={lab(zle("cas") || casChyba)}>{label}</span>
      <CasPole value={f.cas} onCommit={(v) => set({ cas: v })} onChyba={setCasChyba} placeholder="15:00" label={label} style={pole(zle("cas") || casChyba)} /></label>;
  };
  const casZly = casChyba && <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: "var(--cRed, #A3341F)" }}>Takýto čas neexistuje. Píšte napríklad 15:00.</span>;
  const ramGal = (el: ReactNode) => <div style={{ borderRadius: 22, boxShadow: zle("gal") ? `0 0 0 2px ${ZLATA}` : "none" }}>{el}</div>;
  const radio = (on: boolean) => <span aria-hidden="true" style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "var(--green)" : "#A8A396"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: on ? "var(--green)" : "transparent" }} /></span>;
  const volba = (on: boolean, t: string, sub: string, tap: () => void) => (
    <button key={t} type="button" role="radio" aria-checked={on} onClick={tap} style={{ minHeight: 60, padding: "10px 14px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "var(--ink)" }}>
      {radio(on)}<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15.5 }}>{t}</b><span style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--ink3)" }}>{sub}</span></span>
    </button>);
  const pozvanie = (nadpis: ReactNode) => <>
    {nadpis}
    <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 8 }}>{POZVANIA.map(([t, sub], i) => volba(pz === i, t, sub, () => set({ pozv: i })))}</div>
  </>;
  const limitPole = (ph: string, pozn?: string) => pz === 2 && <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <b style={{ fontSize: 15 }}>Koľko ľudí najviac <span style={{ fontWeight: 600, color: "var(--ink3)" }}>(nepovinné)</span></b>
    <input inputMode="numeric" value={f.limit} onChange={(e) => set({ limit: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder={ph} aria-label="Koľko ľudí najviac" style={{ ...pole(false), maxWidth: 200 }} />
    {pozn && <span style={{ fontSize: 13, color: "var(--ink3)" }}>{pozn}</span>}
  </label>;
  const pozvBtnT = (pz === 2 ? `Prihlásiť sa${f.limit ? ` · 0 z ${f.limit}` : ""}` : "Prídem");
  const udD = f.datum ? (() => { const [y, m, d] = f.datum.split("-").map(Number); return new Date(y, m - 1, d); })() : null;
  // E.3/E.4: náhľad prilepený hore
  const nahlad = (obsah: ReactNode) => (
    <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", flexDirection: "column", gap: 6, padding: "8px 0 10px", background: "var(--bg)" }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>NÁHĽAD · TAKTO TO UVIDIA ĽUDIA</span>
      <div style={{ maxHeight: 260, overflowY: "auto", padding: 12, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 6 }}>{obsah}</div>
    </div>);
  const prvaF = fotky[0]?.src;

  const formular = k && !jeEd && (
    <>
      {k === "oznam" && <>{vstup("NADPIS", "nad", "napr. Našli sa kľúče pri kostole")}<TextOznamu key={`o${txtKey}`} value={f.txt} onChange={(h) => set({ txt: h })} popis="Najviac 6 riadkov." max={6} />
        {/* OPRAVY 179: Platí do, predvolené Bez konca */}
        <span style={lab(false)}>PLATÍ DO</span>
        <div role="radiogroup" aria-label="Platí do" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PLATI_VERIACI.map(([t], i) => { const on = (f.plat ?? 0) === i; return <button key={t} type="button" role="radio" aria-checked={on} onClick={() => set({ plat: i })} style={{ flex: "1 1 70px", minHeight: 48, borderRadius: 12, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink)" }}>{t}</button>; })}
        </div>
        <span style={{ fontSize: 13.5, color: "var(--ink3)", marginTop: -6 }}>Potom oznam zo stránky sám zmizne.</span>
      </>}
      {k === "udalost" && <>
        {/* KARTA 57C §2: náhľad = karta ako na stránke (Príď a zaži s nami) */}
        <div style={{ position: "sticky", top: -8, zIndex: 3, margin: "-8px -16px 0", padding: "10px 16px 12px", background: "var(--bg)", boxShadow: "0 10px 14px -12px rgba(0,0,0,.4)", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>NÁHĽAD · TAKTO TO BUDE NA STRÁNKE · PRÍĎ A ZAŽI S NAMI</span>
          <div style={{ borderRadius: 18, overflow: "hidden", background: "#E4DFD5", color: "#1D211B", display: "flex", flexDirection: "column", maxHeight: 330 }}>
            <div style={{ position: "relative", flex: "none", height: prvaF ? 130 : 70, background: prvaF ? `url("${prvaF}") center/cover no-repeat #D9D3C7` : "linear-gradient(160deg,#D9D3C7,#C9C1B2)" }}>
              {udD && <span style={{ position: "absolute", left: 10, top: 10, width: 54, height: 58, borderRadius: 12, background: "#fff", color: "#14110B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><b style={{ fontSize: 21, lineHeight: 1 }}>{udD.getDate()}.</b><span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em" }}>{MES_K[udD.getMonth()]}</span><span style={{ fontSize: 10, color: "#5B5D53" }}>{DNI_W[udD.getDay()]}</span></span>}
            </div>
            <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 5, minHeight: 0, overflow: "hidden" }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "#8A6A1F" }}>{([udD ? `${DNI_W[udD.getDay()]} ${udD.getDate()}. ${udD.getMonth() + 1}.` : "", CAS_OK(dokonciCas(f.cas)) ? pekny(dokonciCas(f.cas)) : "", f.kde.trim()].filter(Boolean).join(" · ") || "Dátum · čas · miesto").toLocaleUpperCase("sk-SK")}</span>
              <b style={{ fontSize: 18, lineHeight: 1.2 }}>{f.nad.trim() || "Názov udalosti"}</b>
              {cistyText(f.txt) && <span style={{ fontSize: 14, lineHeight: 1.4, color: "#4A4C43", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cistyText(f.txt)}</span>}
              {pz > 0 && <span style={{ alignSelf: "flex-start", marginTop: 4, minHeight: 40, padding: "0 16px", borderRadius: 12, background: "#14110B", color: "#fff", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center" }}>{pozvBtnT}</span>}
            </div>
          </div>
          <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Zo stránky zmizne sama deň po udalosti.</span>
        </div>
        {vstup("NÁZOV UDALOSTI", "nad", "napr. Púť do Levoče")}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 10 }}>
          {vstup("DÁTUM", "datum", "", { type: "date", min: dnesIso() })}
          {casPole()}
        </div>
        {casZly}
        {vstup("MIESTO", "kde", "napr. pred farským kostolom")}
        <TextOznamu key={`u${txtKey}`} value={f.txt} onChange={(h) => set({ txt: h })} label="Popis" popis="Najviac 8 riadkov." max={8} />
        <GaleriaEditor media={media} onMedia={setMedia} ph={mobil} max={4} bezVidea nadpis="Fotky · nepovinné" dovetok=" Prvá fotka je hlavná." />
        {pozvanie(<b style={{ fontSize: 16 }}>Pozvať ľudí</b>)}
        {limitPole("napr. 40", "Keď sa naplní, prihlasovanie sa samo zavrie. Mená prihlásených uvidíte pri udalosti.")}
      </>}
      {k === "umysel" && <>
        {vstup("ZA KOHO MÁ BYŤ OMŠA", "nad", "napr. za + Jána a Máriu Novákových")}
        <span style={lab(zle("datum"))}>KEDY</span>
        {seg<number>([[0, "Najbližšia voľná"], [1, "Konkrétny deň"]], f.umK, (v) => set({ umK: v }))}
        {f.umK === 1 && <input type="date" min={dnesIso()} value={f.datum} onChange={(e) => set({ datum: e.target.value })} aria-label="Deň" style={pole(zle("datum"))} />}
        {umNaDen > 0 && <span role="status" style={{ padding: "10px 12px", borderRadius: 12, background: "var(--goldBg)", border: `1px solid ${ZLATA}`, fontSize: 14, lineHeight: 1.5, fontWeight: 700, color: "var(--ink)" }}>Na {fmtD(f.datum)} už {umNaDen === 1 ? "je 1 žiadosť" : umNaDen < 5 ? `sú ${umNaDen} žiadosti` : `je ${umNaDen} žiadostí`}. Informujte sa u farára, či sa váš úmysel zmestí, alebo vyberte Najbližšia voľná.</span>}
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Úmysel ide len farárovi, na stránke ho nikto neuvidí. Farnosť vám potvrdí presný čas omše, príde vám upozornenie.</span>
      </>}
      {k === "fotky" && <>
        {nahlad(<div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ flex: "none", width: 96, height: 64, borderRadius: 10, overflow: "hidden", background: "var(--field)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--ink3)" }}>{prvaF ? <img src={prvaF} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "fotka"}</span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>GALÉRIA FARNOSTI</span>
            <b style={{ fontSize: 16 }}>{f.nad.trim() || "Názov akcie"}</b>
            <span style={{ fontSize: 13, color: "var(--ink3)" }}>{fotky.length ? fotiekT(fotky.length) : "zatiaľ bez fotiek"}{cistyText(f.txt) ? ` · ${cistyText(f.txt).slice(0, 50)}` : ""}</span>
            {pz > 0 && <span style={{ alignSelf: "flex-start", marginTop: 4, minHeight: 36, padding: "0 12px", borderRadius: 10, background: ZELENA, color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center" }}>{pozvBtnT}{f.datum ? ` · ${fmtD(f.datum)}` : ""}</span>}
          </span>
        </div>)}
        {vstup("Z AKEJ AKCIE", "nad", "napr. Detská sobota s miništrantmi")}
        <TextOznamu key={`f${txtKey}`} value={f.txt} onChange={(h) => set({ txt: h })} label="Pár slov o akcii · nepovinné" popis="Najviac 6 riadkov. Ukáže sa nad fotkami v albume." max={6} />
        {ramGal(<GaleriaEditor media={media} onMedia={(m) => { setMedia(m); setChyba(false); }} ph={mobil} max={12} bezVidea nadpis="Fotky" dovetok=" Pod fotku môžete napísať popis." />)}
        {pozvanie(<b style={{ fontSize: 16 }}>Pozvať na ďalšiu akciu? <span style={{ fontWeight: 600, color: "var(--ink3)" }}>(nepovinné)</span></b>)}
        {pz > 0 && <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 10 }}>{vstup("KEDY JE ĎALŠIA", "datum", "", { type: "date", min: dnesIso() })}{casPole()}</div>}
        {pz > 0 && casZly}
        {limitPole("napr. 20")}
      </>}
      {k === "modlitba" && <>
        <TextOznamu key={`m${txtKey}`} value={f.txt} onChange={(h) => set({ txt: h })} label="Vaša prosba" popis="Najviac 5 riadkov." max={5} chybaRam={zle("text")} />
        {/* E.6: Ako sa podpíšete? */}
        <b style={{ fontSize: 16 }}>Ako sa podpíšete?</b>
        <div role="radiogroup" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {volba(!f.anon, "S mojím menom", `Ľudia uvidia: ${ja.celeMeno || "Vaše meno"} prosí o modlitbu`, () => set({ anon: false }))}
          {volba(f.anon, "Bez mena", "Ľudia uvidia: Prosím o modlitbu · Bohu známy veriaci", () => set({ anon: true }))}
        </div>
      </>}
    </>);

  const um = k === "umysel";
  // KARTA 57C §2: formulár nad stránkou — hore „‹ Späť na stránku farnosti", stránka presvitá
  const spat = () => { if (jeEd && !hotovo && edRef.current?.krokSpat()) return; spatNaStranku(); };
  const okno = k && createPortal(
    <div role="dialog" aria-modal="true" aria-label={T?.t} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,17,11,.82)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: mobil ? "calc(10px + env(safe-area-inset-top, 0px)) 10px 10px" : 16, boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: jeEd ? 1200 : 520, flex: "none", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={spat} style={{ minHeight: 52, padding: "0 20px", border: "none", borderRadius: 14, background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800 }}>‹ Späť na stránku farnosti</button>
        {!um && <span style={{ flex: "1 1 160px", fontSize: 14.5, lineHeight: 1.4, color: "#E8E1D3" }}>Po zverejnení sa vrátite sem a ukážeme vám, kde to je.</span>}
      </div>
      <div className="sc-tokeny" style={{ position: "relative", flex: 1, minHeight: 0, width: "100%", maxWidth: jeEd ? 1200 : 520, borderRadius: 20, overflow: "hidden", background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: "none", padding: "14px 16px 10px", borderBottom: "1px solid var(--cardBd)" }}><b style={{ fontSize: 19 }}>{edId ? `Upraviť · ${T?.t ?? ""}` : T?.t}</b></div>
        {jeEd ? <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <EditorOznameni ref={edRef} title={T?.t} onSend={(p) => { void naEditor(p); }} onUdalost={(e) => zapisEditora({ udalost: e.akcia, typ: TYP_EDITORA[k]!, papier: e.papier ?? null, ...kdeStat })} style={{ position: "absolute", inset: 0, height: "100%" }}
            cfg={{ typ: TYP_EDITORA[k]!, rezim: "plny", qrObrazok: k === "parte" ? "/editor/qr-deed.png" : undefined, miesta: k === "parte" ? ["v Dome smútku", "vo farskom kostole", "na miestnom cintoríne"] : undefined, kontext: { stranka: strankaId, veriaci: true }, navrh: edId ? odFarnikov(strankaId).find((y) => y.id === edId)?.editor ?? null : null }} />
          {edToast && <div role="status" style={{ position: "absolute", left: 16, right: 16, top: 12, zIndex: 3, maxWidth: 560, margin: "0 auto", padding: "14px 16px", borderRadius: 16, background: "var(--gSoft)", border: "2px solid var(--green)", boxShadow: "0 10px 26px rgba(30,28,20,.2)", display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 17, color: "var(--gInk)" }}>Zverejnené ✓</b>
            <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}>Už to vidia všetci na stránke farnosti. Vytlačiť alebo stiahnuť môžete dole v editore.</span>
          </div>}
        </div> : <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <div style={{ padding: "8px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>{formular}</div>
        </div>}
        {!jeEd && <div style={{ flex: "none", borderTop: "1px solid var(--cardBd)", background: "var(--bg)" }}>
          <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {chyba && ch.length > 0 && <span role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", border: `1.5px solid ${ZLATA}`, fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Ešte doplňte: {ch.map((c) => c[1]).join(", ")}. Označili sme to vyššie.</span>}
            {plati ? <>
              {/* PLACEBO — karta 56I: poplatok za oznam sa zatiaľ neplatí (žiadny pohyb v ledgeri), zverejní sa po podržaní */}
              {ch.length
                ? <button type="button" onPointerDown={() => setChyba(true)} onClick={() => setChyba(true)} style={{ minHeight: 60, border: "none", borderRadius: 16, background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>Podržte a zaplaťte {pop} € · zverejniť</button>
                : <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={`Podržte a zaplaťte ${pop} € · zverejniť`} trvanie={1500} onConfirm={() => { void uloz(); }} /></div>}
              <span style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>Podržte prst na tlačidle, kým sa nenaplní.</span>
            </> : <button type="button" onClick={zverejni} disabled={uklada} style={{ minHeight: 56, border: "none", borderRadius: 14, background: ch.length ? "var(--btn)" : ZELENA, cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: ch.length ? "var(--ink)" : "#fff" }}>{edId ? "Uložiť zmeny" : um ? "Zapísať úmysel" : "Zverejniť"}</button>}
          </div>
        </div>}
      </div>
    </div>, document.body);

  // KARTA 57C §2: zelená hláška dole na stránke
  const hlaska = ok && !k && createPortal(
    <div role="status" style={{ position: "fixed", left: "50%", bottom: mobil ? 96 + 16 : 28, zIndex: 1050, transform: "translateX(-50%)", width: "min(560px, calc(100% - 32px))", padding: "16px 18px", borderRadius: 18, background: "#E3ECDB", border: `2px solid ${ZELENA}`, boxShadow: "0 12px 28px rgba(30,40,20,.3)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", boxSizing: "border-box" }}>
      <span style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17, color: "#2F5A22" }}>{ok.t}</b><span style={{ fontSize: 15, lineHeight: 1.45, color: "#1D211B" }}>{ok.s}</span></span>
      <button type="button" onClick={() => setOk(null)} style={{ minHeight: 48, padding: "0 18px", border: "none", borderRadius: 13, background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800 }}>Rozumiem</button>
    </div>, document.body);

  return <>{!ok && fab}{harok && createPortal(harok, document.body)}{okno}{hlaska}</>;
}
