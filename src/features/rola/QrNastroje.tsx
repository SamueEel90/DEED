// ============================================================
// OPRAVY 347 · Nástroje → QR nástroje, jeden plagát pre všetky QR a záložka QR v Správe zbierky.
// TRVALÉ (QR farnosti, QR zvončeka) a ZBIERKY (každá bežiaca: farnosti, vecná, rodiny).
// PDF: vektorový QR v ráme DEED (lib/qrPdf), nálepky so značkami na strihanie, plagát z rozloženia vecnej zbierky.
// ============================================================
import { QrCelaObrazovka } from "@/components/qrNaUkazanie";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DeedQr, type DeedQrVariant } from "@/components/deedqr";
import { DOMENA } from "@/lib/adresa";
import { nalepkyPdf, plagatPdfVektor, stiahni, menoSuboru, type FormatQr } from "@/lib/qrPdf";
import { kresliPlagat, riadkovTextu } from "./vecnaPlagat";
import { odkazQrStranky, odkazQrZvonceka, odkazQrZbierky } from "@/features/verejny-profil/otvor";
import { centralnaZPamate, useZmenyCentralnej } from "@/lib/centralnaZbierka";
import { zbierkyStrankyZPamate, useZmenyZbierok, type SpustenaZbierka } from "@/lib/novaZbierka";
import { useVecneZbierky, vecnaZbierka, ulozVecnu, odkazVecnej, fotoVecnej, doKedyText, textPlagatuZPoli } from "@/lib/vecnaZbierka";
import { profilZPamate } from "@/lib/profilStranky";
import { cistyText } from "@/lib/richtext";
import { nacitajStav, ulozStavIsto } from "@/features/viera/stav";
import { koniecZbierky, datumKonca } from "@/lib/koniecZbierky";

export const TEXT_PLAGATU_MAX = 140;
export interface PolozkaQr {
  id: string; t: string; s: string; kam: string; odkaz: string; trvaly: boolean;
  /** plagát: druh nad názvom, názov, predvolený text, fotka */
  druh: string; nazov: string; text: string; foto: string | null; organizuje: string; vecna: boolean;
}
type UlozPlagat = { t: string; f: boolean };
const plagatyZ = (stranka: string) => nacitajStav<Record<string, UlozPlagat>>("plagaty", stranka, {});

const kratky = (t: string) => { const s = t.replace(/\s+/g, " ").trim(); return s.length <= TEXT_PLAGATU_MAX ? s : `${s.slice(0, TEXT_PLAGATU_MAX - 2).trimEnd()} …`; };
const fotoZbierky = (z: Pick<SpustenaZbierka, "media">) => z.media.find((m) => m.typ === "foto")?.src ?? null;

/** všetky QR farnosti: trvalé a bežiace zbierky */
/** OPRAVY 453: charita = zbierky charity (bez farských slov a bez dátumu konca farnosti) */
export function usePolozkyQr(strankaId: string, meno: string, charita = false): PolozkaQr[] {
  useZmenyCentralnej(); useZmenyZbierok();
  const vecne = useVecneZbierky(strankaId);
  const cover = profilZPamate(strankaId).ulozeny?.cover?.src ?? null;
  const hl = centralnaZPamate(strankaId);
  const l: PolozkaQr[] = [
    { id: "farnost", t: "QR farnosti", s: "nálepka na lavicu, dvere kostola", kam: "otvorí stránku farnosti a Hlavnú zbierku", odkaz: odkazQrStranky(strankaId), trvaly: true,
      druh: "FARNOSŤ", nazov: "Podporte našu farnosť", text: "Naskenujte QR a prispejte na Hlavnú zbierku farnosti.", foto: cover ?? (hl ? fotoZbierky(hl) : null), organizuje: meno, vecna: false },
    { id: "zvon", t: "QR zvončekovej zbierky", s: "pri vchode, pri zvončeku", kam: "otvorí zbierku pri aktuálnej omši", odkaz: odkazQrZvonceka(strankaId), trvaly: true,
      druh: "ZVONČEKOVÁ ZBIERKA", nazov: "Zbierka pri svätej omši", text: "Naskenujte QR počas omše a prispejte do zvončeka.", foto: cover, organizuje: meno, vecna: false },
  ];
  for (const z of zbierkyStrankyZPamate(strankaId)) {
    if ((z.stav ?? "aktivna") !== "aktivna") continue;
    if (charita) {
      l.push({ id: z.id, t: z.nazov || "Zbierka", s: "zbierka · QR platí, kým zbierka beží", kam: "otvorí priamo túto zbierku", odkaz: odkazQrZbierky(z.id), trvaly: false,
        druh: "ZBIERKA", nazov: z.nazov || "Zbierka", text: kratky(cistyText(z.popis) || "Naskenujte QR a prispejte na zbierku."), foto: fotoZbierky(z), organizuje: meno, vecna: false });
      continue;
    }
    const d = z.farnost?.druh ?? "farnost", rod = d === "pohreb" || d === "svadba";
    l.push({ id: z.id, t: z.nazov || "Zbierka", s: rod ? "zbierka rodiny · QR je aj na parte" : `zbierka farnosti · beží do ${datumKonca(koniecZbierky(strankaId, z))}`, kam: rod ? "otvorí zbierku rodiny" : "otvorí priamo túto zbierku",
      odkaz: odkazQrZbierky(z.id), trvaly: false, druh: rod ? "ZBIERKA RODINY" : "ZBIERKA FARNOSTI", nazov: z.nazov || "Zbierka",
      text: kratky(cistyText(z.popis) || (rod ? "Ďakujeme za vašu účasť a pomoc rodine." : "")), foto: fotoZbierky(z), organizuje: meno, vecna: false });
  }
  for (const z of vecne) {
    if (z.stav !== "aktivna") continue;
    l.push({ id: z.id, t: z.nazov, s: `vecná zbierka · beží${z.doKedy ? ` do ${doKedyText(z.doKedy, false)}` : ""}`, kam: "otvorí zápis daru", odkaz: odkazVecnej(strankaId, z.id), trvaly: false,
      druh: "VECNÁ ZBIERKA", nazov: z.nazov, text: z.plagatText || textPlagatuZPoli(z), foto: fotoVecnej(z) ?? null, organizuje: z.organizuje || meno, vecna: true });
  }
  return l;
}

const adresaQr = (o: string) => o.replace(/^https?:\/\//, "").replace(/\?qr=1$/, "");
const nad: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" };
const karta: CSSProperties = { flex: "none", borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)" };
const volba = (on: boolean): CSSProperties => ({ minHeight: 64, padding: "10px 14px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1.5px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--card)", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, textAlign: "left", fontFamily: "inherit", color: "var(--ink)", boxShadow: "none" });
const tl = (bg: string, c: string, bd = "none"): CSSProperties => ({ whiteSpace: "nowrap", minHeight: 44, padding: "0 14px", borderRadius: 12, border: bd, background: bg, color: c, display: "flex", alignItems: "center", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "none" });
const CHYBA = "Nepodarilo sa · Skúsiť znova";

const FMT: [FormatQr, string, string][] = [["n5", "Nálepky 5 × 5 cm", "15 kusov na hárku A4"], ["n10", "Nálepky 10 × 10 cm", "2 kusy na hárku A4"], ["a4", "Plagát A4", "fotka, názov, text a QR"], ["a5", "Plagát A5", "to isté, menšie · nástenka"]];

/** QR na celú obrazovku (biele pozadie, dá sa skenovať priamo z obrazovky) */
function CelyQr({ p, onZavri }: { p: PolozkaQr; onZavri: () => void }) {
  return <QrCelaObrazovka qr={{ data: p.odkaz, odznak: "D++" }} popis={`${p.t} · ${adresaQr(p.odkaz)}`} onZavri={onZavri} />; // OPRAVY 457: spoločný komponent
}

/** OPRAVY 347 (4): Nástroje → QR nástroje */
export function QrNastroje({ strankaId, meno, mobil, zvyraznit }: { strankaId: string; meno: string; mobil: boolean; /** zbierka, z ktorej prišiel Tlačiť › */ zvyraznit?: string | null }) {
  const polozky = usePolozkyQr(strankaId, meno);
  const [fm, setFm] = useState<FormatQr>("n5");
  const [farba, setFarba] = useState<DeedQrVariant>("svetly");
  const [stav, setStav] = useState<Record<string, "busy" | "ok" | "err">>({});
  const [cely, setCely] = useState<PolozkaQr | null>(null);
  const [plagat, setPlagat] = useState<{ p: PolozkaQr; f: "a4" | "a5" } | null>(null);
  const hlRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (zvyraznit) hlRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [zvyraznit]);
  const fmT = FMT.find((x) => x[0] === fm)![1];
  const pdf = async (p: PolozkaQr) => {
    const k = `${p.id}|${fm}|${farba}`;
    if (stav[k] === "busy") return;
    setStav((s) => ({ ...s, [k]: "busy" }));
    try { stiahni(await nalepkyPdf(p.odkaz, farba, fm as "n5" | "n10"), `qr-${menoSuboru(p.t)}-${fm === "n5" ? "5x5" : "10x10"}.pdf`); setStav((s) => ({ ...s, [k]: "ok" })); }
    catch { setStav((s) => ({ ...s, [k]: "err" })); }
  };
  const riadok = (p: PolozkaQr, i: number) => {
    const k = `${p.id}|${fm}|${farba}`, st = stav[k], hl = zvyraznit === p.id, plg = fm === "a4" || fm === "a5";
    return (
      <div key={p.id} ref={hl ? hlRef : undefined} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 10px", margin: "0 -10px", borderTop: i ? "1px solid var(--cardBd)" : "none", flexWrap: "wrap", background: hl ? "var(--gSoft)" : "transparent", outline: hl ? "2px solid var(--green)" : "2px solid transparent", borderRadius: 14 }}>
        <button type="button" onClick={() => setCely(p)} aria-label={`Zobraziť ${p.t}`} style={{ width: 84, height: 84, flex: "none", padding: 4, borderRadius: 12, background: farba === "svetly" ? "#FFFFFF" : "#161D16", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "none" }}>
          <DeedQr data={p.odkaz} odznak="D++" variant={farba} size={74} />
        </button>
        <span style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 4 }}>
          <b style={{ fontSize: 15.5 }}>{p.t}</b>
          <span style={{ fontSize: 13, color: "var(--ink3)" }}>{p.s}</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink2)", overflowWrap: "anywhere" }}>{adresaQr(p.odkaz)}</span>
          <span style={{ alignSelf: "flex-start", minHeight: 24, padding: "3px 9px", borderRadius: 8, background: "var(--gSoft)", color: "var(--gInk)", fontSize: 11.5, fontWeight: 800, lineHeight: 1.3, boxSizing: "border-box" }}>{p.kam}</span>
        </span>
        <div style={{ flex: "1 1 100%", display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: mobil ? 0 : 100 }}>
          <button type="button" onClick={() => setCely(p)} style={tl("transparent", "var(--gInk)", "1.5px solid var(--gBd)")}>Zobraziť</button>
          {plg ? <button type="button" onClick={() => setPlagat({ p, f: fm })} style={tl("var(--btn)", "var(--ink)")}>{fm === "a5" ? "Plagát A5" : "Plagát A4"} · upraviť a vytlačiť ›</button>
            : <button type="button" aria-busy={st === "busy"} onClick={() => void pdf(p)} style={tl(st === "ok" ? "var(--gSoft)" : st === "err" ? "var(--rBg)" : "var(--btn)", st === "ok" ? "var(--gInk)" : st === "err" ? "var(--cRed)" : "var(--ink)", st === "err" ? "1.5px solid var(--rBd)" : "none")}>
              {st === "busy" ? "Pripravujem PDF …" : st === "ok" ? "Stiahnuté ✓ · vytlačte na 100 %" : st === "err" ? CHYBA : `Stiahnuť PDF · ${fmT}`}</button>}
        </div>
      </div>);
  };
  const trvale = polozky.filter((p) => p.trvaly), zbierky = polozky.filter((p) => !p.trvaly);
  return <>
    <span style={{ fontSize: 14, color: "var(--ink2)" }}>PDF má presnú veľkosť na tlač. QR je v ráme DEED, adresa {DOMENA}.</span>
    <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={nad}>FORMÁT NA TLAČ</span>
      <div role="radiogroup" aria-label="Formát na tlač" style={{ display: "grid", gridTemplateColumns: mobil ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8 }}>
        {FMT.map(([k, t, s]) => <button key={k} type="button" role="radio" aria-checked={fm === k} onClick={() => setFm(k)} style={volba(fm === k)}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></button>)}
      </div>
    </div>
    {(fm === "n5" || fm === "n10") && <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={nad}>FARBA QR</span>
      <div role="radiogroup" aria-label="Farba QR" style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {([["svetly", "Čierny na bielom", "na svetlý podklad"], ["inverzny", "Biely na tmavom", "na tmavé drevo a sklo"]] as [DeedQrVariant, string, string][]).map(([k, t, s]) => (
          <button key={k} type="button" role="radio" aria-checked={farba === k} onClick={() => setFarba(k)} style={{ ...volba(farba === k), flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76 }}>
            <span style={{ width: 52, height: 52, flex: "none", borderRadius: 10, background: k === "svetly" ? "#FFFFFF" : "#161D16", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 30, height: 30, borderRadius: 4, border: `4px solid ${k === "svetly" ? "#161D16" : "#FFFFFF"}`, boxSizing: "border-box" }} /></span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{s}</span></span>
          </button>))}
      </div>
    </div>}
    <span style={{ ...nad, paddingTop: 6 }}>TRVALÉ · NIKDY SA NEMENIA</span>
    <section style={{ ...karta, padding: "4px 18px" }}>{trvale.map(riadok)}</section>
    <span style={{ ...nad, paddingTop: 6 }}>ZBIERKY · NA DOBU ZBIERKY</span>
    <section style={{ ...karta, padding: zbierky.length ? "4px 18px" : "16px 18px" }}>{zbierky.length ? zbierky.map(riadok) : <span style={{ fontSize: 14.5, color: "var(--ink3)" }}>Teraz nebeží žiadna ďalšia zbierka.</span>}</section>
    <span style={{ flex: "none", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Po skončení zbierky jej QR otvorí „Zbierka skončila · ďakujeme“.</span>
    {cely && <CelyQr p={cely} onZavri={() => setCely(null)} />}
    {plagat && <PlagatOkno strankaId={strankaId} meno={meno} p={plagat.p} format={plagat.f} mobil={mobil} onZavri={() => setPlagat(null)} />}
  </>;
}

/** OPRAVY 347 (5): jeden plagát pre všetky QR — náhľad, A4 / A5, text (najviac 140 znakov, 3 riadky, ukladá sa pri zbierke), fotka, PDF */
export function PlagatOkno({ strankaId, meno, p, format, mobil, onZavri }: { strankaId: string; meno: string; p: PolozkaQr; format: "a4" | "a5"; mobil: boolean; onZavri: () => void }) {
  const ul = p.vecna ? (() => { const v = vecnaZbierka(strankaId, p.id); return v ? { t: v.plagatText || p.text, f: v.plagatFoto } : null; })() : plagatyZ(strankaId)[p.id] ?? null;
  const [f, setF] = useState<"a4" | "a5">(format);
  const [text, setText] = useState(ul?.t ?? p.text);
  const [sFotkou, setSFotkou] = useState(ul ? ul.f : !!p.foto);
  const foto = sFotkou ? p.foto : null;
  const [obr, setObr] = useState<string | null>(null);
  const [chyba, setChyba] = useState("");
  const [pdf, setPdf] = useState<"" | "busy" | "ok" | "err">("");
  const [ulozT, setUlozT] = useState<"" | "uklada" | "ok" | "err">("");
  const h = useMemo(() => {
    const pr = profilZPamate(strankaId).ulozeny, m = (pr?.meno || meno).trim();
    const ini = pr?.inicialy || m.split(/\s+/).filter((w) => w.length > 1 && w !== "Farnosť").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "F";
    return { logo: pr && !pr.bezLoga ? pr.logo : null, inicialy: ini, menoFarnosti: m, adresa: (pr?.kontakt?.adresaVerejna || pr?.kontakt?.sidlo || "").trim() };
  }, [strankaId, meno]);
  const podklad = { nazov: p.nazov, text, foto, ...h, organizuje: p.organizuje, odkaz: p.odkaz, druh: p.druh, vyzva: p.vecna ? undefined : ["Naskenujte QR", "a prispejte cez DEED+"] as [string, string] };
  const kluc = JSON.stringify(podklad);
  useEffect(() => {
    let ziva = true;
    const t = window.setTimeout(() => {
      void kresliPlagat(podklad).then(({ c, fotkaChyba }) => {
        if (!ziva) return;
        try { setObr(c.toDataURL("image/jpeg", 0.85)); setChyba(fotkaChyba ? "Fotku sa nepodarilo načítať, plagát je zatiaľ bez nej." : ""); }
        catch { setChyba("Plagát s touto fotkou sa nedá pripraviť. Zvoľte Bez fotky."); }
      }, () => { if (ziva) setChyba("Plagát sa nepodarilo pripraviť. Skúste to znova."); });
    }, 150);
    return () => { ziva = false; window.clearTimeout(t); };
  }, [kluc]); // eslint-disable-line react-hooks/exhaustive-deps
  // text a fotka sa ukladajú pri zbierke (vecná: jej plagát; ostatné: naboz_stav „plagaty“)
  const prvy = useRef(true), tm = useRef<number | undefined>(undefined);
  const uloz = async () => {
    setUlozT("uklada");
    let e: string | null;
    if (p.vecna) { const v = vecnaZbierka(strankaId, p.id); e = v ? await ulozVecnu(strankaId, { ...v, plagatText: text, plagatFoto: sFotkou }) : "Zbierka sa nenašla."; }
    else e = await ulozStavIsto("plagaty", strankaId, { ...plagatyZ(strankaId), [p.id]: { t: text, f: sFotkou } });
    setUlozT(e ? "err" : "ok");
  };
  useEffect(() => {
    if (prvy.current) { prvy.current = false; return; }
    window.clearTimeout(tm.current);
    tm.current = window.setTimeout(() => void uloz(), 700);
    return () => window.clearTimeout(tm.current);
  }, [text, sFotkou]); // eslint-disable-line react-hooks/exhaustive-deps
  const pis = (v0: string) => { const v = v0.replace(/\n/g, " ").slice(0, TEXT_PLAGATU_MAX); if (riadkovTextu(v, !!foto) <= 3 || v.length < text.length) { setText(v); setPdf(""); } };
  const stiahniPdf = async () => {
    if (pdf === "busy") return; setPdf("busy");
    try { const { c, qr } = await kresliPlagat(podklad, { bezQr: true }); stiahni(await plagatPdfVektor(c, qr, p.odkaz, f), `plagat-${f}-${menoSuboru(p.nazov)}.pdf`); setPdf("ok"); }
    catch { setPdf("err"); }
  };
  const vol = (on: boolean): CSSProperties => ({ minHeight: 52, padding: "0 14px", borderRadius: 14, border: on ? "2px solid var(--green)" : "1.5px solid var(--cardBd)", background: on ? "var(--gSoft)" : "var(--card)", display: "flex", alignItems: "center", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: "var(--ink)", cursor: "pointer", boxShadow: "none" });
  const sekcia = (t: string, el: ReactNode, pozn?: ReactNode) => <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 15 }}>{t}</b>{el}{pozn}</div>;
  return createPortal(<div className="sprava-charity" role="dialog" aria-modal="true" aria-label="Plagát" style={{ position: "fixed", inset: 0, zIndex: 1250, background: "rgba(14,12,8,.55)", display: "flex", alignItems: mobil ? "stretch" : "center", justifyContent: "center", padding: mobil ? 0 : 20, minHeight: 0 }}>
    <div style={{ width: mobil ? "100%" : "min(100%, 860px)", maxHeight: mobil ? "100dvh" : "calc(100dvh - 40px)", overflowY: "auto", borderRadius: mobil ? 0 : 22, background: "var(--bg)", padding: mobil ? "16px 16px 32px" : 22, display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ flex: 1, fontSize: 19 }}>Plagát · {p.t}</b>
        <button type="button" onClick={onZavri} aria-label="Zavrieť" style={{ width: 44, height: 44, border: "none", borderRadius: 12, background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontSize: 20, fontWeight: 800, boxShadow: "none" }}>×</button></div>
      <div style={{ display: "grid", gridTemplateColumns: mobil ? "minmax(0,1fr)" : "320px minmax(0,1fr)", gap: 20, alignItems: "start" }}>
        <div style={{ justifySelf: "center", width: mobil ? "min(100%, 300px)" : 320, aspectRatio: "210 / 297", border: "1px solid var(--cardBd)", borderRadius: 6, overflow: "hidden", background: "#FBF8F2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {obr ? <img src={obr} alt={`Plagát · ${p.nazov}`} style={{ display: "block", width: "100%", height: "100%" }} /> : <span style={{ fontSize: 14, color: "#555" }}>Pripravujem plagát …</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sekcia("Veľkosť", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{(["a4", "a5"] as const).map((k) => <button key={k} type="button" aria-pressed={f === k} onClick={() => { setF(k); setPdf(""); }} style={vol(f === k)}>Plagát {k.toUpperCase()}</button>)}</div>)}
          {sekcia("Text na plagáte", <textarea value={text} onChange={(e) => pis(e.target.value)} rows={4} style={{ width: "100%", boxSizing: "border-box", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "var(--field)", color: "var(--ink)", padding: "12px 14px", fontFamily: "inherit", fontSize: 15, lineHeight: 1.5, resize: "vertical" }} />,
            <span role={ulozT === "err" ? "alert" : "status"} style={{ fontSize: 12.5, color: ulozT === "err" ? "var(--cRed)" : "var(--ink3)" }}>{text.length} / {TEXT_PLAGATU_MAX} znakov · najviac 3 riadky{ulozT === "uklada" ? " · Ukladá sa …" : ulozT === "ok" ? " · uložené ✓" : ""}
              {ulozT === "err" && <> · <button type="button" onClick={() => void uloz()} style={{ padding: 0, minHeight: 32, border: "none", background: "transparent", color: "var(--cRed)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}>{CHYBA}</button></>}</span>)}
          {sekcia("Fotka", <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
            <button type="button" aria-pressed={sFotkou && !!p.foto} disabled={!p.foto} onClick={() => { setSFotkou(true); setPdf(""); }} style={{ ...vol(sFotkou && !!p.foto), opacity: p.foto ? 1 : 0.5 }}>Titulná fotka</button>
            <button type="button" aria-pressed={!sFotkou || !p.foto} onClick={() => { setSFotkou(false); setPdf(""); }} style={vol(!sFotkou || !p.foto)}>Bez fotky</button></div>,
            !p.foto ? <span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{p.vecna || !p.trvaly ? "Zbierka nemá titulnú fotku." : "Profil farnosti nemá titulnú fotku (Upraviť profil)."}</span> : null)}
          {chyba && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cRed)" }}>{chyba}</span>}
          <button type="button" aria-busy={pdf === "busy"} disabled={!obr} onClick={() => void stiahniPdf()} style={{ minHeight: 52, border: pdf === "err" ? "1.5px solid var(--rBd)" : "none", borderRadius: 14, background: pdf === "ok" ? "var(--gSoft)" : pdf === "err" ? "var(--rBg)" : "#4B7A35", color: pdf === "ok" ? "var(--gInk)" : pdf === "err" ? "var(--cRed)" : "#fff", cursor: obr ? "pointer" : "default", opacity: obr ? 1 : 0.6, fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" }}>
            {pdf === "busy" ? "Pripravujem PDF …" : pdf === "ok" ? "Stiahnuté ✓ · vytlačte na 100 %" : pdf === "err" ? CHYBA : "Stiahnuť PDF na tlač"}</button>
          <button type="button" onClick={onZavri} style={{ minHeight: 52, border: "1.5px solid var(--cardBd)", borderRadius: 14, background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 15.5, fontWeight: 800, boxShadow: "none" }}>Hotovo · zavrieť</button>
        </div>
      </div>
    </div>
  </div>, document.body);
}

/** OPRAVY 347 (6): záložka QR v Správe zbierky — QR v ráme, adresa, TRVALÝ / NA DOBU ZBIERKY, Tlačiť › a Plagát A4 › */
export function QrZalozka({ strankaId, meno, id, mobil, onTlac, charita }: { strankaId: string; meno: string; id: string; mobil: boolean; onTlac?: (id: string) => void; /** OPRAVY 453 */ charita?: boolean }) {
  const p = usePolozkyQr(strankaId, meno, charita).find((x) => x.id === id);
  const [pl, setPl] = useState(false);
  const [cely, setCely] = useState(false);
  if (!p) return <section style={{ ...karta, padding: 18, fontSize: 14.5, color: "var(--ink3)" }}>QR má len bežiaca zbierka. Po skončení zbierky jej QR otvorí „Zbierka skončila · ďakujeme“.</section>;
  return <>
    <section style={{ ...karta, padding: mobil ? 16 : 22, display: "flex", gap: mobil ? 16 : 22, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={() => setCely(true)} aria-label={`Zobraziť ${p.t}`} style={{ width: 180, height: 180, flex: "none", padding: 8, borderRadius: 16, background: "#FFFFFF", border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "none", margin: mobil ? "0 auto" : undefined }}>
        <DeedQr data={p.odkaz} odznak="D++" variant="svetly" size={164} />
      </button>
      <span style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
        <b style={{ fontSize: 19 }}>{p.t}</b>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink2)", overflowWrap: "anywhere" }}>{adresaQr(p.odkaz)}</span>
        <span style={{ alignSelf: "flex-start", minHeight: 26, padding: "4px 10px", borderRadius: 8, background: "var(--gSoft)", color: "var(--gInk)", fontSize: 12, fontWeight: 800, lineHeight: 1.4, boxSizing: "border-box" }}>{p.trvaly ? "TRVALÝ" : "NA DOBU ZBIERKY"} · {p.kam}</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {onTlac && <button type="button" onClick={() => onTlac(p.id)} style={{ minHeight: 52, padding: "0 22px", border: "none", borderRadius: 14, background: "#4B7A35", color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Tlačiť ›</button>}
          <button type="button" onClick={() => setPl(true)} style={{ minHeight: 52, padding: "0 20px", border: "1.5px solid var(--cardBd)", borderRadius: 14, background: "var(--btn)", color: "var(--ink)", fontFamily: "inherit", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "none" }}>Plagát A4 ›</button>
        </div>
      </span>
    </section>
    {!p.trvaly && <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink3)" }}>Po skončení zbierky jej QR otvorí „Zbierka skončila · ďakujeme“.</span>}
    {cely && <CelyQr p={p} onZavri={() => setCely(false)} />}
    {pl && <PlagatOkno strankaId={strankaId} meno={meno} p={p} format="a4" mobil={mobil} onZavri={() => setPl(false)} />}
  </>;
}
