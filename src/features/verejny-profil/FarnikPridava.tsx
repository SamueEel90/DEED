// ============================================================
// KARTA 56I — Farník pridáva sám (prototyp „Farnik pridava", mobil 390).
// Verejná stránka farnosti: pevné zelené + Pridať vpravo dole (len ak farár zapol a aspoň 1 druh) →
// hárok „Čo chcete pridať?" (len zapnuté druhy, cena / zadarmo) · neregistrovaný: Prihlásiť / Zaregistrovať.
// Formuláre: Krátky oznam · Udalosť · Úmysel na omšu · Fotky z akcie · Prosba o modlitbu — všade TextOznamu
// (textové polia) a GaleriaEditor. „Ešte doplňte…" nad tlačidlom, zlatý rám na poli. Zadarmo ťuk, s poplatkom
// len podržaním. Zverejní sa hneď (farár môže zmazať) → „Zverejnené ✓", „Pozrieť na stránke ›", „Pridať ďalšie".
// Parte, Svadba, Jubileum = Editor oznámení — PLACEBO — karta 56I (napojí sa samostatnou kartou).
// ============================================================
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePouzivatel } from "@/lib/pouzivatel";
import { nacitajSelfAdd } from "@/features/viera/UserOznamy";
import { DRUHY_FARNIKA, CEZ_EDITOR, nacitajSmie, smie, odFarnikov, pridajOdFarnika, useOdFarnikov, type DruhFarnika } from "@/lib/odFarnikov";
import { zmenKostol, normCas, dokonciCas, casNeexistuje, CAS_OK, pekny } from "@/lib/kalendarFarnosti";
import type { MediumZbierky } from "@/lib/novaZbierka";
import { GaleriaEditor, cistyText } from "@/features/rola/obsahZbierky";
import { TextOznamu } from "@/features/rola/OznamyFarnosti";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { toast } from "@/shared";

const ZELENA = "#4B7A35", ZLATA = "#C9A24A";
const lab = (zle: boolean): CSSProperties => ({ fontSize: 12.5, fontWeight: 800, letterSpacing: ".06em", color: zle ? "#A07A1C" : "var(--ink3)" });
const pole = (zle: boolean): CSSProperties => ({ height: 52, padding: "0 14px", borderRadius: 14, background: "var(--field)", border: `${zle ? 2 : 1}px solid ${zle ? ZLATA : "var(--cardBd)"}`, fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" });
const dnesIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtD = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return y ? `${d}. ${m}. ${y}` : ""; };
const teraz = () => Date.now();
const kedy = (cas: number) => { const d = new Date(cas); return teraz() - cas < 5 * 60e3 ? "práve teraz" : `${d.getDate()}. ${d.getMonth() + 1}.`; };
const druhT = (k: DruhFarnika) => DRUHY_FARNIKA.find((d) => d.k === k)?.t ?? "";
const NADPIS: Partial<Record<DruhFarnika, string>> = { oznam: "nadpis", udalost: "názov", umysel: "za koho", fotky: "z akej akcie" };

/** sekcia „Od farníkov" na verejnej stránke (cieľ „Pozrieť na stránke ›") */
export function OdFarnikov({ strankaId, novy, pad, fab }: { strankaId: string; novy?: string | null; pad?: string; /** tlačidlo + Pridať je zapnuté */ fab: boolean }) {
  useOdFarnikov();
  const list = odFarnikov(strankaId);
  if (!list.length && !fab) return null;
  return (
    <section data-od-farnikov="1" style={{ padding: pad, display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 16 }}>
      <b style={{ fontSize: 28, letterSpacing: "-.02em" }}>Od farníkov</b>
      {!list.length && <span style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--ink3)" }}>Zatiaľ nič. Ťuknite na zelené tlačidlo + Pridať dole.</span>}
      {list.map((x) => { const on = x.id === novy; return (
        <div key={x.id} style={{ padding: 16, borderRadius: 18, background: on ? "var(--gSoft)" : "var(--card)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--ink3)" }}>{druhT(x.k).toLocaleUpperCase("sk-SK")}</span>
          <b style={{ fontSize: 19, lineHeight: 1.25 }}>{x.t}</b>
          {x.s && <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)", whiteSpace: "pre-line" }}>{x.s}</span>}
          {x.fotky?.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 6, paddingTop: 4 }}>{x.fotky.slice(0, 6).map((f, i) => <span key={i} role="img" aria-label="Fotka" style={{ aspectRatio: "16 / 9", borderRadius: 10, background: `url('${f}') center/cover no-repeat var(--field)` }} />)}</div> : null}
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{x.kto} · {kedy(x.cas)}</span>
        </div>); })}
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
  // formulár
  const [nad, setNad] = useState(""), [txt, setTxt] = useState(""), [datum, setDatum] = useState(""), [cas, setCas] = useState(""), [kde, setKde] = useState("");
  const [media, setMedia] = useState<MediumZbierky[]>([]);
  const [umK, setUmK] = useState(0), [anon, setAnon] = useState(false);
  const [chyba, setChyba] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  useEffect(() => {
    if (!sheet && !k) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setSheet(false); setK(null); } };
    window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc);
  }, [sheet, k]);
  if (!self.on || !povol.length) return null;

  const otvor = (kk: DruhFarnika) => { setNad(""); setTxt(""); setDatum(""); setCas(""); setKde(""); setMedia([]); setUmK(0); setAnon(false); setChyba(false); setHotovo(null); setSheet(false); setK(kk); };
  const T = DRUHY_FARNIKA.find((d) => d.k === k);
  const plati = pop > 0 && !T?.zadarmo;
  const fotiek = media.filter((m) => m.typ === "foto").length;

  // ---- čo chýba (blbovzdorne: zobrazí sa až po pokuse o zverejnenie) ----
  const ch: [string, string][] = [];
  if (k && NADPIS[k] && !nad.trim()) ch.push(["nad", NADPIS[k]!]);
  if (k === "udalost" && !datum) ch.push(["datum", "dátum"]);
  if (k === "udalost" && cas && !CAS_OK(dokonciCas(cas))) ch.push(["cas", "správny čas"]);
  if (k === "umysel" && umK === 1 && !datum) ch.push(["datum", "deň"]);
  if (k === "fotky" && !fotiek) ch.push(["gal", "aspoň 1 fotku"]);
  if (k === "modlitba" && !cistyText(txt)) ch.push(["text", "text prosby"]);
  const zle = (x: string) => chyba && ch.some((c) => c[0] === x);

  const uloz = () => {
    if (!k) return;
    const id = `f${teraz().toString(36)}`, c = dokonciCas(cas), fotky = media.filter((m) => m.typ === "foto").map((m) => m.src);
    const s = k === "udalost" ? [fmtD(datum), CAS_OK(c) ? pekny(c) : "", kde.trim(), cistyText(txt)].filter(Boolean).join(" · ")
      : k === "umysel" ? (umK === 1 && datum ? `želaný deň ${fmtD(datum)}` : "najbližšia voľná omša")
      : k === "fotky" ? `${fotiek} ${fotiek === 1 ? "fotka" : fotiek < 5 ? "fotky" : "fotiek"}`
      : cistyText(txt).slice(0, 600);
    pridajOdFarnika(strankaId, { id, k, t: k === "modlitba" ? "Prosím o modlitbu" : nad.trim(), s, kto: k === "modlitba" && anon ? "Bohu známy farník" : ja.celeMeno || "Farník", cas: teraz(), fotky: fotky.length ? fotky : undefined });
    // udalosť farníka sa zapíše do kalendára farnosti (keď má platný čas)
    if (k === "udalost" && CAS_OK(c)) zmenKostol(strankaId, "0", (kk) => ({ ...kk, extra: { ...kk.extra, [datum]: [...(kk.extra[datum] ?? []), { id: `u${id}`, typ: "udalost", t: pekny(c), m: nad.trim() }] } }));
    setHotovo(id); setChyba(false);
  };
  const zverejni = () => { if (ch.length) { setChyba(true); return; } uloz(); };

  const fab = (
    <button type="button" onClick={() => setSheet(true)} aria-label="Pridať" style={{ position: "fixed", right: 16, bottom: mobil ? 96 + 16 : 28, zIndex: 150, height: 64, padding: "0 26px 0 20px", border: "none", borderRadius: 32, background: ZELENA, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 19, fontWeight: 800, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 26px rgba(30,60,20,.4)" }}>
      <span aria-hidden="true" style={{ position: "relative", width: 22, height: 22, flex: "none" }}>
        <span style={{ position: "absolute", left: 9, top: 0, width: 4, height: 22, borderRadius: 2, background: "#fff" }} />
        <span style={{ position: "absolute", top: 9, left: 0, width: 22, height: 4, borderRadius: 2, background: "#fff" }} />
      </span>Pridať
    </button>);

  const harok = sheet && (
    <div className="sc-tokeny" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: mobil ? "flex-end" : "center", alignItems: "center" }}>
      <div onClick={() => setSheet(false)} style={{ position: "absolute", inset: 0, background: "rgba(10,9,6,.55)" }} />
      <div role="dialog" aria-modal="true" aria-label="Čo chcete pridať" style={{ position: "relative", width: mobil ? "100%" : 520, maxHeight: "88vh", overflowY: "auto", background: "var(--bg)", color: "var(--ink)", borderRadius: mobil ? "24px 24px 0 0" : 24, padding: "14px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ flex: 1, fontSize: 21 }}>Čo chcete pridať?</b>
          <button type="button" onClick={() => setSheet(false)} style={{ minHeight: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink2)" }}>Zavrieť</button>
        </div>
        {reg ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {povol.map((d) => { const ed = CEZ_EDITOR.includes(d.k); return (
            <button key={d.k} type="button" onClick={() => (ed ? toast("Editor oznámení pripravujeme.") : otvor(d.k))} aria-disabled={ed || undefined}
              style={{ minHeight: 66, padding: "10px 16px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "var(--ink)", opacity: ed ? 0.55 : 1 }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontSize: 17 }}>{d.t}</b>
                <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{d.sv}{ed ? " · pripravujeme" : pop && !d.zadarmo ? ` · ${pop} €` : " · zadarmo"}</span>
              </span>
              <span aria-hidden="true" style={{ fontSize: 20, color: "var(--ink3)" }}>›</span>
            </button>); })}
        </div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 16, lineHeight: 1.5, color: "var(--ink2)" }}>Pridávať na stránku farnosti môžu len registrovaní v DEED. Tak vždy vieme, kto čo pridal.</span>
          {/* PLACEBO — karta 56I: prihlásenie a registrácia z tejto stránky */}
          <button type="button" onClick={() => { setSheet(false); toast("Prihlásenie odtiaľto pripravujeme."); }} style={{ minHeight: 56, border: "none", borderRadius: 14, background: ZELENA, cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#fff" }}>Prihlásiť sa</button>
          <button type="button" onClick={() => { setSheet(false); toast("Registráciu odtiaľto pripravujeme."); }} style={{ minHeight: 56, borderRadius: 14, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "var(--gInk)" }}>Zaregistrovať sa · 2 minúty</button>
        </div>}
      </div>
    </div>);

  const seg = <T,>(vol: [T, string][], cur: T, set: (v: T) => void) => (
    <div role="radiogroup" style={{ display: "flex", gap: 8 }}>
      {vol.map(([v, t]) => { const on = v === cur; return <button key={String(v)} type="button" role="radio" aria-checked={on} onClick={() => { set(v); setChyba(false); }} style={{ flex: 1, minHeight: 52, borderRadius: 14, border: `${on ? 2 : 1}px solid ${on ? "var(--green)" : "var(--cardBd)"}`, background: on ? "var(--gSoft)" : "var(--field)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink)" }}>{t}</button>; })}
    </div>);
  const vstup = (label: string, kluc: string, value: string, set: (v: string) => void, ph: string, extra?: Partial<JSX.IntrinsicElements["input"]>) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={lab(zle(kluc))}>{label}</span>
      <input value={value} onChange={(e) => { set(e.target.value); setChyba(false); }} placeholder={ph} aria-invalid={zle(kluc) || undefined} style={pole(zle(kluc))} {...extra} /></label>);
  const ramGal = (el: ReactNode) => <div style={{ borderRadius: 22, boxShadow: zle("gal") ? `0 0 0 2px ${ZLATA}` : "none" }}>{el}</div>;
  const casZly = casNeexistuje(cas);

  const formular = k && (
    <>
      {k === "oznam" && <>{vstup("NADPIS", "nad", nad, setNad, "napr. Našli sa kľúče pri kostole")}<TextOznamu value={txt} onChange={setTxt} popis="Najviac 6 riadkov." max={6} /></>}
      {k === "udalost" && <>
        {vstup("NÁZOV UDALOSTI", "nad", nad, setNad, "napr. Púť do Levoče")}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 10 }}>
          {vstup("DÁTUM", "datum", datum, setDatum, "", { type: "date", min: dnesIso() })}
          <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={lab(zle("cas") || casZly)}>ČAS</span>
            <input value={cas} inputMode="numeric" maxLength={5} onChange={(e) => { setCas(normCas(e.target.value)); setChyba(false); }} onBlur={() => setCas((c) => dokonciCas(c))} placeholder="15:00" aria-invalid={casZly || undefined} style={pole(zle("cas") || casZly)} /></label>
        </div>
        {casZly && <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: "var(--cRed, #A3341F)" }}>Takýto čas neexistuje. Píšte napríklad 15:00.</span>}
        {vstup("MIESTO", "kde", kde, setKde, "napr. pred farským kostolom")}
        <TextOznamu value={txt} onChange={setTxt} label="Popis" popis="Najviac 8 riadkov." max={8} />
        <GaleriaEditor media={media} onMedia={setMedia} ph={mobil} max={4} bezVidea nadpis="Fotky · nepovinné" dovetok=" Prvá fotka je hlavná." />
      </>}
      {k === "umysel" && <>
        {vstup("ZA KOHO MÁ BYŤ OMŠA", "nad", nad, setNad, "napr. za + Jána a Máriu Novákových")}
        <span style={lab(zle("datum"))}>KEDY</span>
        {seg<number>([[0, "Najbližšia voľná"], [1, "Konkrétny deň"]], umK, setUmK)}
        {umK === 1 && <input type="date" min={dnesIso()} value={datum} onChange={(e) => { setDatum(e.target.value); setChyba(false); }} aria-label="Deň" style={pole(zle("datum"))} />}
        <span style={{ fontSize: 13.5, color: "var(--ink3)" }}>Farnosť vám potvrdí presný čas omše. Príde vám upozornenie.</span>
      </>}
      {k === "fotky" && <>
        {vstup("Z AKEJ AKCIE", "nad", nad, (v) => setNad(v.slice(0, 80)), "napr. Detská sobota s miništrantmi")}
        {ramGal(<GaleriaEditor media={media} onMedia={(m) => { setMedia(m); setChyba(false); }} ph={mobil} max={12} bezVidea nadpis="Fotky" dovetok=" Pod fotku môžete napísať popis." />)}
      </>}
      {k === "modlitba" && <>
        <TextOznamu value={txt} onChange={(h) => { setTxt(h); setChyba(false); }} label="Vaša prosba" popis="Najviac 5 riadkov." max={5} chybaRam={zle("text")} />
        <button type="button" role="switch" aria-checked={anon} onClick={() => setAnon((a) => !a)} style={{ minHeight: 64, padding: "10px 14px", borderRadius: 16, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12, color: "var(--ink)" }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16 }}>Bez môjho mena</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{anon ? "Uvidia len prosbu, nie vaše meno" : "Uvidia vaše meno"}</span></span>
          <span aria-hidden="true" style={{ flex: "none", position: "relative", width: 52, height: 30, borderRadius: 15, background: anon ? ZELENA : "var(--track)" }}><span style={{ position: "absolute", top: 3, left: 3, width: 24, height: 24, borderRadius: 12, background: "#fff", transform: `translateX(${anon ? 22 : 0}px)`, transition: "transform .2s ease" }} /></span>
        </button>
      </>}
    </>);

  const um = k === "umysel";
  const okno = k && createPortal(
    <div className="sc-tokeny" role="dialog" aria-modal="true" aria-label={T?.t} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--bg)", color: "var(--ink)", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--cardBd)" }}>
        <button type="button" onClick={() => { setK(null); setHotovo(null); }} style={{ minHeight: 48, padding: "0 16px", borderRadius: 12, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>‹ Späť</button>
        <b style={{ fontSize: 19 }}>{hotovo ? "Hotovo" : T?.t}</b>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "18px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {hotovo ? <>
            <div role="status" style={{ padding: "18px 18px", borderRadius: 18, background: "var(--gSoft)", border: "2px solid var(--green)", display: "flex", flexDirection: "column", gap: 6 }}>
              <b style={{ fontSize: 20, color: "var(--gInk)" }}>{um ? "Úmysel je zapísaný ✓" : "Zverejnené ✓"}</b>
              <span style={{ fontSize: 15.5, lineHeight: 1.5, color: "var(--ink2)" }}>{um ? "Farnosť vám potvrdí presný čas omše. Príde vám upozornenie." : "Už to vidia všetci na stránke farnosti. Farár to môže upraviť alebo zmazať."}</span>
            </div>
          </> : formular}
        </div>
      </div>
      <div style={{ flex: "none", borderTop: "1px solid var(--cardBd)", background: "var(--bg)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {!hotovo && chyba && ch.length > 0 && <span role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--goldBg)", border: `1.5px solid ${ZLATA}`, fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>Ešte doplňte: {ch.map((c) => c[1]).join(", ")}. Označili sme to vyššie.</span>}
          {hotovo ? <>
            <button type="button" onClick={() => { const id = hotovo; setK(null); setHotovo(null); onPozriet(id); }} style={{ minHeight: 56, border: "none", borderRadius: 14, background: ZELENA, cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "#fff" }}>Pozrieť na stránke ›</button>
            <button type="button" onClick={() => { setK(null); setHotovo(null); setSheet(true); }} style={{ minHeight: 52, borderRadius: 14, border: "1.5px solid var(--gBd)", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "var(--gInk)" }}>Pridať ďalšie</button>
          </> : plati ? <>
            {/* PLACEBO — karta 56I: poplatok za oznam sa zatiaľ neplatí (žiadny pohyb v ledgeri), zverejní sa po podržaní */}
            {ch.length
              ? <button type="button" onPointerDown={() => setChyba(true)} onClick={() => setChyba(true)} style={{ minHeight: 60, border: "none", borderRadius: 16, background: "var(--btn)", cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>Podržte a zaplaťte {pop} € · zverejniť</button>
              : <div style={{ ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label={`Podržte a zaplaťte ${pop} € · zverejniť`} trvanie={1500} onConfirm={uloz} /></div>}
            <span style={{ fontSize: 13, color: "var(--ink3)", textAlign: "center" }}>Podržte prst na tlačidle, kým sa nenaplní.</span>
          </> : <button type="button" onClick={zverejni} style={{ minHeight: 56, border: "none", borderRadius: 14, background: ch.length ? "var(--btn)" : ZELENA, cursor: "pointer", fontFamily: "inherit", fontSize: 17, fontWeight: 800, color: ch.length ? "var(--ink)" : "#fff" }}>{um ? "Zapísať úmysel" : "Zverejniť"}</button>}
        </div>
      </div>
    </div>, document.body);

  return <>{fab}{harok && createPortal(harok, document.body)}{okno}</>;
}

