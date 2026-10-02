// ============================================================
// KARTA 37 · OPRAVY 114 — Nová zbierka (program Zadarmo aj vyššie). Obsahová časť správy charity
// (ako Upraviť profil), na mobile celá obrazovka. 6 krokov: Obsah · Fotky a video · Suma a účet ·
// Platby · Dokladovanie · Kontrola → Podržte a zapečaťte → Zbierka beží.
// Editor, výrez a detail zbierky = existujúce RichTextInput, OrezFotky, ZbierkaModul, PodrzTlacidlo.
// Hranice programov z stav.ts (PROGRAM_TIER), nič napevno. Texty z prototypu Nova zbierka PC.
// ============================================================
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RichTextInput } from "@/components/richtext";
import { OrezFotky } from "@/components/orezfotky";
import { spracujFotku } from "@/lib/obrazok";
import { ZbierkaModul, type ZbierkaData } from "@/features/zbierka/ZbierkaModul";
import PodrzTlacidlo from "@/features/zbierka/PodrzTlacidlo";
import { potvrditTuknutim } from "@/features/zbierka/Platba";
import { PROGRAM_TIER, nacitajIbanOrg, type Pozicia, type Tier } from "./stav";
import { eurcText, HLAVNY_UCET } from "./NastaveniaCharity";
import {
  prazdnaZbierka, konceptZbierkyZPamate, nacitajKonceptZbierky, ulozKonceptZbierky, spustiZbierku, lehotaZbierky, cielCislo, jeIne,
  SADY, SADY_EURC, KROKY_ZBIERKY, UCELY, LEHOTY, MAX_FOTIEK_ZB, VIDEO_S_ZB, NAZOV_ZB, RIADKY_ZB, ZNAKY_ZB,
  type NovaZbierkaData, type MediumZbierky, type SpustenaZbierka,
} from "@/lib/novaZbierka";

// ---------- drobné UI ----------
const Ik = ({ d, s = 18, c = "currentColor", w = 2 }: { d: string; s?: number; c?: string; w?: number }) =>
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={d} /></svg>;
const I = {
  fajka: "M5 12l5 5 9-10", vlavo: "M15 18l-6-6 6-6", vpravo: "M9 6l6 6-6 6", kos: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  vyrez: "M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2", foto: "M4 5h16v14H4zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M20 15l-5-5L5 19",
  video: "M3 7h12v10H3zM15 10l6-3v10l-6-3", oko: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  karta: "M4 5h16v14H4zM8 10h8M8 14h5", zamok: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
};
const Zamok = ({ s = 13 }: { s?: number }) => <Ik d={I.zamok} s={s} w={2.2} />;
const Pecat = () => <span style={{ flex: "none", height: 20, padding: "0 8px", borderRadius: 10, background: "var(--warnBg)", color: "#8A5A2B", fontSize: 11.5, fontWeight: 800, display: "inline-flex", alignItems: "center" }}>zapečatí sa</span>;
const vyber = (on: boolean): CSSProperties => ({ background: on ? "var(--gSoft)" : "var(--field)", border: `1.5px solid ${on ? "var(--gBd)" : "var(--cardBd)"}`, color: on ? "var(--gInk)" : "var(--ink)" });
const panel: CSSProperties = { borderRadius: 22, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 };
const pole: CSSProperties = { height: 52, padding: "0 16px", borderRadius: 14, background: "var(--field)", border: "1.5px solid var(--cardBd)", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box" };
const pozn: CSSProperties = { fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: "var(--ink3)" };
const fmtEur = (n: number) => `${n.toLocaleString("sk-SK").replace(/ /g, " ")} €`;
const fmtSek = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const cis = (n: number) => String(n).replace(".", ",");
const cistyText = (h: string) => { const d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").replace(/\s+/g, " ").trim(); };
const dlzkaVidea = (src: string) => new Promise<number>((ok) => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => ok(v.duration || 0); v.onerror = () => ok(-1); v.src = src; });
const sirkaFotky = (src: string) => new Promise<number>((ok) => { const i = new Image(); i.onload = () => ok(i.naturalWidth); i.onerror = () => ok(0); i.src = src; });
const NASTROJE = ["bold", "italic", "insertUnorderedList", "diktovat"];
let MID = Date.now();

/** vzhľad fotky podľa výrezu (mierka + posun) — rovnaký na PC aj mobile */
function vzhlad(m?: MediumZbierky): CSSProperties {
  const v = m?.vyrez;
  if (!v) return { objectFit: "cover" };
  if (v.rezim === "cela") return { objectFit: "contain", background: "#1D211B" };
  return { objectFit: "cover", objectPosition: `${v.x * 100}% ${v.y * 100}%`, transform: `scale(${v.zoom})`, transformOrigin: `${v.x * 100}% ${v.y * 100}%` };
}
const Media = ({ m, style }: { m: MediumZbierky; style?: CSSProperties }) => m.typ === "video"
  ? <video src={m.src} muted playsInline style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", ...style }} />
  : <img src={m.src} alt="" draggable={false} style={{ width: "100%", height: "100%", display: "block", ...vzhlad(m), ...style }} />;

function Volby<K extends string | number | boolean>({ moznosti, value, onChange, stlpce = 2, vyska = 72 }: { moznosti: { k: K; t: string; s?: string; zamok?: boolean; vpravo?: string }[]; value: K | null; onChange: (k: K) => void; stlpce?: number; vyska?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stlpce},minmax(0,1fr))`, gap: 10 }}>
      {moznosti.map((o) => { const on = !o.zamok && value === o.k; return (
        <button key={String(o.k)} type="button" aria-pressed={on} aria-disabled={o.zamok} onClick={() => { if (!o.zamok) onChange(o.k); }}
          style={{ ...vyber(on), ...(o.zamok ? { color: "var(--ink3)", opacity: 0.6, cursor: "not-allowed" } : { cursor: "pointer" }), minHeight: vyska, padding: "12px 16px", borderRadius: 14, fontFamily: "inherit", textAlign: o.vpravo ? "left" : "left", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 800 }}>{o.t}{o.zamok && <Zamok />}</span>
            {o.s && <span style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, color: on ? "var(--gInk)" : "var(--ink3)" }}>{o.s}</span>}
          </span>
          {o.vpravo && <span style={{ flex: "none", fontSize: 13, fontWeight: 800 }}>{o.vpravo}</span>}
        </button>); })}
    </div>);
}
const Nadpis = ({ t, pecat, d }: { t: string; pecat?: boolean; d?: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ fontSize: 15.5, fontWeight: 800, color: "var(--ink)" }}>{t}</span>{d}{pecat && <Pecat />}</div>);

// ============================================================
export function NovaZbierka({ strankaId, pozicia, tier, nazov, inicialy, mobil, tablet, stit, onMojeZbierky }: {
  strankaId: string; pozicia: Pozicia; tier: Tier; nazov: string; inicialy: string; mobil: boolean; tablet: boolean; stit: string;
  /** „Moje zbierky" (hotovo) */
  onMojeZbierky: () => void;
}) {
  const ph = mobil && !tablet;
  const zadarmo = tier < PROGRAM_TIER.P1;
  const eurcRezim = eurcText(); // "nie" | "pre všetky zbierky" | "podľa zbierky"
  const hlavnyUcet = nacitajIbanOrg(pozicia) || HLAVNY_UCET;
  const [d, setD] = useState<NovaZbierkaData>(() => konceptZbierkyZPamate(strankaId) ?? prazdnaZbierka());
  const zmenene = useRef(false);
  const [nacitane, setNacitane] = useState(false);
  useEffect(() => { let ziva = true; void nacitajKonceptZbierky(strankaId).then((k) => { if (ziva && k && !zmenene.current) setD(k); if (ziva) setNacitane(true); }); return () => { ziva = false; }; }, [strankaId]);
  const zmen = (z: Partial<NovaZbierkaData>) => { zmenene.current = true; setD((x) => ({ ...x, ...z })); };
  // ROZPÍSANÉ SA UKLADÁ SAMO — 600 ms po poslednej zmene, do účtu stránky
  useEffect(() => {
    if (!zmenene.current || !nacitane) return;
    const t = window.setTimeout(() => { void ulozKonceptZbierky(strankaId, d); }, 600);
    return () => window.clearTimeout(t);
  }, [d, strankaId, nacitane]);

  const k = Math.min(6, Math.max(1, d.krok));
  const [riadky, setRiadky] = useState(0);
  const [zn1, setZn1] = useState(0);
  const [zn2, setZn2] = useState(0);
  const [chybaMed, setChybaMed] = useState("");
  const [ok, setOk] = useState(false);
  const [vyrezId, setVyrezId] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [nadZonou, setNadZonou] = useState(false);
  const [male, setMale] = useState<Record<number, boolean>>({});
  const [nahlad, setNahlad] = useState<null | "str" | "detail">(null);
  const [hotovo, setHotovo] = useState<SpustenaZbierka | null>(null);
  const [pozriet, setPozriet] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null), vidRef = useRef<HTMLInputElement>(null);
  const hore = useRef<HTMLDivElement>(null);
  // pri zmene kroku hore na začiatok správy (hlavička ostane vidno), nie pri prvom otvorení
  const prvy = useRef(true);
  useEffect(() => { if (prvy.current) { prvy.current = false; return; } (hore.current?.closest(".sprava-charity") as HTMLElement | null)?.scrollIntoView?.({ block: "start" }); }, [k, nahlad, hotovo]);

  // ---------- chyby krokov (texty z prototypu) ----------
  const fotiek = d.media.filter((m) => m.typ === "foto").length;
  const video = d.media.find((m) => m.typ === "video");
  const iban = d.iban.replace(/\s/g, "");
  const chybaKroku = (n: number): string => {
    if (n === 1) { if (!d.nazov.trim()) return "Doplňte názov zbierky"; if (!cistyText(d.popis)) return "Napíšte hlavný text"; if (riadky > RIADKY_ZB) return "Hlavný text je dlhší ako 12 riadkov"; }
    if (n === 2 && !fotiek) return "Pridajte aspoň jednu fotku";
    if (n === 3) {
      if (d.cielTyp === "ciel" && !(cielCislo(d) > 0)) return "Zadajte cieľovú sumu";
      if (!zadarmo && (!/^SK\d{2}/i.test(iban) || iban.length !== 24)) return "Zadajte transparentný účet (IBAN má 24 znakov a začína SK)"; // Zadarmo: IBAN sa nekontroluje
    }
    if (n === 5) { if (d.ucel == null) return "Vyberte, na aký účel zbierate"; if (jeIne(d)) { if (!d.ineT.trim()) return "Napíšte, na čo zbierate"; if (d.ineL == null) return "Vyberte lehotu na doklady"; } }
    if (n === 6 && !ok) return "Potvrďte, že ste údaje skontrolovali";
    return "";
  };
  const chyba = chybaKroku(k);
  const hotoveDo = [1, 2, 3, 4, 5].findIndex((n) => chybaKroku(n));
  const maxK = hotoveDo === -1 ? 6 : hotoveDo + 1;
  const naKrok = (n: number) => { if (n <= maxK) zmen({ krok: n }); };
  const dalej = () => { if (!chyba && k < 6) zmen({ krok: k + 1 }); };
  const spat = () => { if (k > 1) zmen({ krok: k - 1 }); };
  const zapecat = async () => {
    if (chyba) return;
    const z = await spustiZbierku(strankaId, zadarmo ? { ...d, typ: "kratka", iban: "", prav: false } : d, zadarmo ? hlavnyUcet : d.iban);
    setHotovo(z);
  };

  // ---------- médiá ----------
  const pridajSubory = async (subory: File[]) => {
    setChybaMed("");
    const nove: MediumZbierky[] = [];
    let fot = fotiek, vid = !!video;
    for (const f of subory) {
      if (f.type.startsWith("video/")) {
        if (vid) continue;
        const src = URL.createObjectURL(f); const s = await dlzkaVidea(src);
        if (s < 0) { setChybaMed("Toto video sa nedá otvoriť. Skúste iný súbor."); continue; }
        if (s > VIDEO_S_ZB + 0.5) { URL.revokeObjectURL(src); setChybaMed(`Video má ${fmtSek(s)}. Najviac je 45 sekúnd, skráťte ho v telefóne a skúste znova.`); continue; }
        nove.push({ id: MID++, typ: "video", src, sek: s }); vid = true;
      } else if (f.type.startsWith("image/")) {
        if (fot >= MAX_FOTIEK_ZB) { setChybaMed(`Pridali sme ${MAX_FOTIEK_ZB - fotiek}. Najviac je 8 fotiek.`); break; }
        try {
          const src = await spracujFotku(f, { pomer: null, maxSirka: 2000 }); const w = await sirkaFotky(src);
          nove.push({ id: MID++, typ: "foto", src, w }); fot++;
        } catch (e) { setChybaMed(e instanceof Error ? e.message : "Fotku sa nepodarilo načítať."); }
      }
    }
    if (nove.length) zmen({ media: [...d.media, ...nove] });
  };
  const presun = (i: number, j: number) => { if (j < 0 || j >= d.media.length || i === j) return; const m = [...d.media]; const [x] = m.splice(i, 1); m.splice(j, 0, x); zmen({ media: m }); };
  useEffect(() => { d.media.forEach((m) => { if (m.typ === "foto" && m.w && m.w < 1200 && !male[m.id]) setMale((x) => ({ ...x, [m.id]: true })); }); }, [d.media, male]);

  // ---------- súhrn a odvodené údaje ----------
  const leh = lehotaZbierky(d);
  const maCiel = d.cielTyp === "ciel";
  const eurcOn = eurcRezim === "pre všetky zbierky" || (eurcRezim === "podľa zbierky" && d.eurc);
  const typT = zadarmo || d.typ === "kratka" ? "Krátkodobá · 30 dní" : `Dlhodobá · ${d.mesiace} mesiacov`;
  const dokladyT = d.ucel != null ? `${jeIne(d) ? d.ineT.trim() || "Iné" : UCELY[d.ucel][0]} · ${leh.text || "—"}` : "—";
  const suhrn: [string, string, number, boolean][] = [
    ["Názov", d.nazov || "—", 1, true], ["Popis", cistyText(d.popis).slice(0, 140) || "—", 1, true],
    ["Fotky a video", `${fotiek} ${fotiek === 1 ? "fotka" : fotiek >= 2 && fotiek <= 4 ? "fotky" : "fotiek"} · ${video ? `video ${fmtSek(video.sek ?? 0)}` : "bez videa"} · hlavné: ${d.media[0] ? (d.media[0].typ === "video" ? "video" : "fotka 1") : "—"}`, 2, false],
    ["Ako dlho", typT, 3, true], ["Suma", maCiel ? fmtEur(cielCislo(d)) : "otvorená, bez cieľa", 3, true],
    [zadarmo ? "Kam prídu peniaze" : "Transparentný účet", zadarmo ? `${hlavnyUcet} · hlavný účet` : d.iban || "—", 3, true],
    ["Rýchle sumy", `${SADY[d.sada][0]} · ${SADY[d.sada][1].join(" · ")} €`, 4, false],
    ...(eurcRezim === "nie" ? [] : [["Dary v EURC", eurcOn ? `áno · ${SADY_EURC[d.sadaE][0]} ${SADY_EURC[d.sadaE][1].map(cis).join(" · ")}` : "nie", 4, false] as [string, string, number, boolean]]),
    ...(zadarmo ? [] : [["Pravidelná podpora", d.prav ? "áno, sumu volí darca" : "nie", 4, false] as [string, string, number, boolean]]), ["Dokladovanie", dokladyT, 5, true],
  ];
  const zbierkaData = (id = "nova"): ZbierkaData => ({
    id, nazov: d.nazov || "Názov zbierky", popis: (d.popis || "<p>Hlavný text zbierky</p>") + (cistyText(d.popis2) ? d.popis2 : ""), overena: true,
    media: d.media.map((m) => ({ typ: m.typ, src: m.src })), vyzbierane: 0, ciel: maCiel ? cielCislo(d) : undefined, ludia: 0, rychleSumy: SADY[d.sada][1],
  });

  // ============ VÝREZ FOTKY ============
  const vyrezM = vyrezId != null ? d.media.find((m) => m.id === vyrezId) : null;
  if (vyrezM) return (
    <section ref={hore as never} style={{ ...panel, gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 22, fontWeight: 800 }}>Výrez fotky</span><span style={{ fontSize: 14, color: "var(--ink2)" }}>{ph ? "Posuňte prstom, kam treba." : "Takto bude fotka vyzerať v zbierke. Chyťte ju myšou a posuňte, kam treba."}</span></div>
      <OrezFotky sprava src={vyrezM.src} pomer={16 / 9} vyrez={vyrezM.vyrez} onZrusit={() => setVyrezId(null)}
        onVyrez={(v) => { zmen({ media: d.media.map((m) => (m.id === vyrezM.id ? { ...m, vyrez: v } : m)) }); setVyrezId(null); }} />
    </section>);

  // ============ HOTOVO · ZBIERKA BEŽÍ ============
  if (hotovo && pozriet) return <ZbierkaModul zbierka={{ ...zbierkaData(hotovo.id), nazov: hotovo.nazov }} miesto="charita" zoStrankyOrg onBack={() => setPozriet(false)} spatNazov="Späť" />;
  if (hotovo) return (
    <section ref={hore as never} style={{ ...panel, alignItems: "center", textAlign: "center", padding: ph ? "36px 20px" : "56px 32px", gap: 14 }}>
      <span style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gSoft)", border: "1.5px solid var(--gBd)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={I.fajka} s={34} w={2.6} /></span>
      <span style={{ fontSize: 26, fontWeight: 800 }}>Zbierka beží</span>
      <span style={{ maxWidth: 560, fontSize: 15.5, lineHeight: 1.55, color: "var(--ink2)" }}>„{hotovo.nazov}“ je zapečatená a vidia ju darcovia{ph ? "." : " na vašom profile aj vo feede. Fotky a video môžete pridávať aj teraz."}</span>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
        <button type="button" onClick={() => setPozriet(true)} style={{ height: 50, padding: "0 22px", border: "none", borderRadius: 14, background: "var(--green)", color: "#fff", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Pozrieť zbierku</button>
        <button type="button" onClick={onMojeZbierky} style={{ height: 50, padding: "0 22px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: "transparent", color: "var(--ink)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Moje zbierky</button>
      </div>
    </section>);

  // ============ NÁHĽAD (čo uvidí darca) ============
  if (nahlad) {
    const hl = d.media[0];
    const tab = (t: "str" | "detail", n: string) => { const on = nahlad === t; return <button key={t} type="button" role="tab" aria-selected={on} onClick={() => setNahlad(t)} style={{ flex: ph ? 1 : "none", height: 40, padding: "0 16px", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 700, background: on ? "var(--seg)" : "transparent", color: on ? "var(--ink)" : "var(--ink3)", boxShadow: on ? "0 1px 3px rgba(30,28,20,.14)" : "none" }}>{n}</button>; };
    const kartaMini = (n: string, meta: string, suma: string, bg: ReactNode, nova?: boolean) => (
      <button type="button" onClick={nova ? () => setNahlad("detail") : undefined} style={{ borderRadius: 18, overflow: "hidden", background: "var(--card)", border: nova ? "2px solid var(--green)" : "1px solid var(--cardBd)", padding: 0, textAlign: "left", fontFamily: "inherit", cursor: nova ? "pointer" : "default", display: "flex", flexDirection: "column" }}>
        <span style={{ display: "block", aspectRatio: "16 / 9", position: "relative", overflow: "hidden", background: "var(--track)" }}>{bg}</span>
        <span style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {nova && <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", color: "var(--green)" }}>VAŠA NOVÁ ZBIERKA</span>}
          <b style={{ fontSize: 15.5, color: "var(--ink)" }}>{n}</b>
          <span style={{ height: 6, borderRadius: 3, background: "var(--track)" }} />
          <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, color: "var(--ink3)" }}><span>{meta}</span><b style={{ color: "var(--ink)" }}>{suma}</b></span>
        </span>
      </button>);
    return (<>
      <div ref={hore} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setNahlad(null)} style={{ height: 44, padding: "0 14px 0 8px", borderRadius: 13, border: "1px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}><Ik d={I.vlavo} s={18} w={2.4} />Späť na kontrolu</button>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".07em", color: "var(--acc)" }}>NÁHĽAD</span>
        <div role="tablist" style={{ display: "flex", gap: 2, padding: 4, borderRadius: 14, background: "var(--card)", border: "1px solid var(--cardBd)", flex: ph ? "1 1 100%" : "none" }}>{tab("str", "Na stránke charity")}{tab("detail", "Detail zbierky")}</div>
        {!ph && <span style={{ fontSize: 14, color: "var(--ink3)" }}>Takto zbierku uvidí darca</span>}
      </div>
      {nahlad === "str" ? <section style={{ ...panel }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--gInk)" }}>{inicialy}</span>
          <span style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 15 }}>{nazov}</b><span style={{ fontSize: 12.5, color: "var(--ink3)" }}>Charita · overená</span></span></div>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ZBIERKY</span>
        <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 12 }}>
          {kartaMini(d.nazov || "Názov zbierky", typT === "Krátkodobá · 30 dní" ? "ešte 30 dní" : `ešte ${d.mesiace} mesiacov`, maCiel ? `0 / ${fmtEur(cielCislo(d))}` : "0 € · otvorená", hl ? <Media m={hl} /> : null, true)}
          {kartaMini("Strecha pre rodinu Horváthovú", "ešte 9 dní", "8 420 / 12 000 €", <img src="/img/sprava/dom.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />)}
          {kartaMini("Centrálna zbierka Svetla pomoci", "na celú činnosť", "2 180 € · otvorená", <span style={{ display: "block", width: "100%", height: "100%", background: "repeating-linear-gradient(135deg,var(--track) 0 12px,var(--btn) 12px 24px)" }} />)}
        </div>
        <span style={pozn}>Kliknite na svoju zbierku a otvorí sa detail, ktorý uvidí darca.</span>
      </section> : <ZbierkaModul zbierka={zbierkaData()} miesto="charita" zoStrankyOrg onBack={() => setNahlad(null)} spatNazov="Späť na kontrolu" />}
    </>);
  }

  // ============ KROKY ============
  const stepper = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!ph && <div style={{ display: "flex", justifyContent: "flex-end" }}><span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)" }} />Rozpísané sa ukladá samo</span></div>}
      <div role="list" aria-label="Kroky" style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: ph ? 5 : 10 }}>
        {KROKY_ZBIERKY.map((t, i) => { const n = i + 1, akt = n === k, hot = n < k, moze = n <= maxK; return (
          <button key={t} role="listitem" type="button" onClick={() => naKrok(n)} aria-current={akt ? "step" : undefined} style={{ border: "none", background: "transparent", padding: 0, cursor: moze ? "pointer" : "default", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 8, textAlign: "left", minHeight: ph ? 12 : 44 }}>
            <span style={{ height: 4, borderRadius: 2, background: n <= k ? "var(--green)" : "var(--track)", transition: "background .3s ease" }} />
            {!ph && <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: akt ? "var(--ink)" : hot ? "var(--green)" : "var(--track)", color: akt || hot ? "#fff" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{hot ? <Ik d={I.fajka} s={13} w={3} /> : n}</span>
              <span style={{ fontSize: 14, fontWeight: akt ? 800 : 700, color: akt ? "var(--ink)" : "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
            </span>}
          </button>); })}
      </div>
      {ph && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>Krok {k} z 6 · {KROKY_ZBIERKY[k - 1]}</span>}
    </div>);

  const hlavicka = (t: string, s: string) => <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: ph ? 22 : 26, fontWeight: 800, color: "var(--ink)" }}>{t}</span><span style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink3)" }}>{s}</span></div>;
  let obsah: ReactNode = null;

  if (k === 1) {
    const dlhy = riadky > RIADKY_ZB, f = dlhy ? "#A34A2A" : riadky > 9 ? "#8A5A2B" : "var(--green)";
    obsah = <>{hlavicka("O čom je zbierka", "Napíšte to tak, ako by ste to povedali susedovi.")}
      <section style={panel}>
        <Nadpis t="Názov zbierky" pecat />
        <input value={d.nazov} onChange={(e) => zmen({ nazov: e.target.value.slice(0, NAZOV_ZB) })} maxLength={NAZOV_ZB} placeholder="Napríklad: Invalidný vozík pre Ninu" aria-label="Názov zbierky" style={pole} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: -6 }}><span style={pozn}>Krátko a jasne: komu a na čo.</span><span style={{ ...pozn, fontWeight: 800, flex: "none" }}>{d.nazov.length} / {NAZOV_ZB}</span></div>
        <Nadpis t="Hlavný text" pecat />
        <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: -6 }}>{ph ? "Toto ľudia uvidia hneď. Najviac 12 riadkov." : "Toto ľudia uvidia hneď. Napíšte, komu a na čo idú peniaze, tak, aby to zaujalo. Najviac 12 riadkov."}</span>
        <RichTextInput vzhlad="sprava" value={d.popis} onChange={(h) => zmen({ popis: h })} nastroje={NASTROJE} minH={150} chybaRam={dlhy}
          ariaLabel="Hlavný text" tvrdyLimit={Math.max(0, ZNAKY_ZB - zn2)} onRiadky={setRiadky} onZnaky={setZn1} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", borderRadius: 3, background: f, transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, riadky / RIADKY_ZB)})`, transition: "transform .3s ease" }} /></span>
          <span style={{ flex: "none", fontSize: 13, fontWeight: 800, color: f }}>{riadky} z {RIADKY_ZB} riadkov</span>
        </div>
        {dlhy && <span style={{ fontSize: 13, fontWeight: 700, color: "#A34A2A", lineHeight: 1.45 }}>{ph ? "Skráťte ho, alebo časť presuňte nižšie do pokračovania." : "Hlavný text je dlhší ako 12 riadkov. Skráťte ho, alebo časť presuňte nižšie do „Pokračovanie príbehu“."}</span>}
        <Nadpis t="Pokračovanie príbehu" d={<span style={{ fontSize: 14, color: "var(--ink3)" }}>— nepovinné</span>} />
        <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink2)", marginTop: -6 }}>{ph ? "Ukáže sa po kliknutí na „… viac“." : "Ukáže sa, až keď darca klikne na „… viac“. Sem patria podrobnosti."}</span>
        <RichTextInput vzhlad="sprava" value={d.popis2} onChange={(h) => zmen({ popis2: h })} nastroje={NASTROJE} minH={130}
          ariaLabel="Pokračovanie príbehu" tvrdyLimit={Math.max(0, ZNAKY_ZB - zn1)} onZnaky={setZn2} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={pozn}>Text z Wordu, Facebooku či Instagramu si tučné, kurzívu aj odrážky ponechá.</span>
          <span style={{ ...pozn, fontWeight: 800, flex: "none" }}>{(zn1 + zn2).toLocaleString("sk-SK")} / 1 500</span>
        </div>
      </section></>;
  } else if (k === 2) {
    const pridat = (foto: boolean) => (
      <button type="button" onClick={() => (foto ? fotoRef : vidRef).current?.click()} style={{ minHeight: ph ? 92 : 140, borderRadius: 14, border: "2px dashed var(--gBd)", background: "transparent", color: "var(--green)", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 10, textAlign: "center" }}>
        <Ik d={foto ? I.foto : I.video} s={22} />
        <b style={{ fontSize: 15 }}>{foto ? "Pridať fotky" : "Pridať video"}</b>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2)" }}>{foto ? (ph ? "aj viac naraz" : "alebo ich sem pretiahnite, aj viac naraz") : ph ? "do 45 s" : "nepovinné · jedno, do 45 s"}</span>
      </button>);
    const tl: CSSProperties = { height: 36, minWidth: 36, padding: "0 10px", border: "none", borderRadius: 10, background: "var(--btn)", color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 };
    obsah = <>{hlavicka("Fotky a video", ph ? "Prvé je hlavné, to ľudia uvidia ako prvé. Poradie zmeníte šípkami." : "Skutočné fotky človeka alebo miesta, komu pomáhate. Tvár a hlas presvedčia viac než text.")}
      <section style={{ ...panel, background: nadZonou ? "var(--gSoft)" : "var(--card)", outline: nadZonou ? "2px dashed var(--green)" : "none" }}
        onDragOver={(e) => { e.preventDefault(); if (drag == null && !nadZonou) setNadZonou(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setNadZonou(false); }}
        onDrop={(e) => { e.preventDefault(); setNadZonou(false); if (e.dataTransfer.files?.length) void pridajSubory(Array.from(e.dataTransfer.files)); }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 15.5, fontWeight: 800 }}>Galéria zbierky</span><span style={{ ...pozn, fontWeight: 800 }}>{fotiek} / 8 fotiek · {video ? `1 video ${fmtSek(video.sek ?? 0)}` : "bez videa"}</span></div>
        {ph && <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>{fotiek < MAX_FOTIEK_ZB && pridat(true)}{!video && pridat(false)}</div>}
        <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))", gap: 14 }}>
          {d.media.map((m, i) => (
            <div key={m.id} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDrag(i); }} onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files?.length) { setDrag(null); void pridajSubory(Array.from(e.dataTransfer.files)); return; } if (drag != null) presun(drag, i); setDrag(null); }} onDragEnd={() => setDrag(null)}
              style={{ display: "flex", flexDirection: "column", gap: 8, opacity: drag === i ? 0.4 : 1 }}>
              <span style={{ position: "relative", display: "block", aspectRatio: "16 / 10", borderRadius: 14, overflow: "hidden", background: "#1D211B", boxShadow: i === 0 ? "0 0 0 3px var(--green)" : "none", cursor: "grab" }}>
                <Media m={m} />
                {i === 0 && <span style={{ position: "absolute", left: 8, top: 8, height: 22, padding: "0 8px", borderRadius: 11, background: "var(--green)", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>HLAVNÉ</span>}
                {m.typ === "video" && <span style={{ position: "absolute", right: 8, top: 8, height: 22, padding: "0 8px", borderRadius: 11, background: "rgba(20,18,14,.7)", color: "#fff", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center" }}>VIDEO · {fmtSek(m.sek ?? 0)}</span>}
                <span style={{ position: "absolute", left: 8, bottom: 8, width: 26, height: 26, borderRadius: "50%", background: "#fff", color: "var(--ink)", fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              </span>
              {male[m.id] && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#8A5A2B" }}>Fotka je malá, na PC môže byť rozmazaná.</span>}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <button type="button" onClick={() => presun(i, i - 1)} aria-label="Posunúť dopredu" disabled={i === 0} style={{ ...tl, opacity: i === 0 ? 0.35 : 1 }}><Ik d={I.vlavo} s={15} w={2.4} /></button>
                <button type="button" onClick={() => presun(i, i + 1)} aria-label="Posunúť dozadu" disabled={i === d.media.length - 1} style={{ ...tl, opacity: i === d.media.length - 1 ? 0.35 : 1 }}><Ik d={I.vpravo} s={15} w={2.4} /></button>
                {m.typ === "foto" && <button type="button" onClick={() => setVyrezId(m.id)} style={tl}><Ik d={I.vyrez} s={14} />Výrez</button>}
                {i > 0 && <button type="button" onClick={() => presun(i, 0)} style={{ ...tl, background: "var(--gSoft)", color: "var(--gInk)" }}>Hlavné</button>}
                <span style={{ flex: 1 }} />
                <button type="button" onClick={() => zmen({ media: d.media.filter((x) => x.id !== m.id) })} aria-label={`Odstrániť ${m.typ === "video" ? "video" : "fotku"} ${i + 1}`} style={{ ...tl, background: "transparent", color: "var(--ink3)" }}><Ik d={I.kos} s={16} /></button>
              </div>
            </div>))}
          {!ph && fotiek < MAX_FOTIEK_ZB && pridat(true)}
          {!ph && !video && pridat(false)}
        </div>
        <input ref={fotoRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void pridajSubory(f); }} />
        <input ref={vidRef} type="file" accept="video/*" hidden onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void pridajSubory(f); }} />
        {chybaMed && <span role="alert" style={{ fontSize: 13.5, fontWeight: 700, color: "#A34A2A" }}>{chybaMed}</span>}
        {!ph && <div style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14, background: "var(--field)", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink2)" }}>
          <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: "var(--gSoft)", color: "var(--gInk)", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>i</span>
          <span><b style={{ color: "var(--ink)" }}>Prvé je hlavné.</b> To ľudia uvidia ako prvé vo feede aj na vašom profile. Viac fotiek naraz pretiahnete z počítača rovno sem, alebo ich v okne vyberiete s podržaným Ctrl (na Macu Cmd). Poradie zmeníte potiahnutím alebo šípkami. Tlačidlom Výrez nastavíte, ktorá časť fotky bude vidno. Fotky a video môžete pridávať aj po spustení zbierky.</span>
        </div>}
      </section></>;
  } else if (k === 3) {
    obsah = <>{hlavicka("Suma a účet", "Koľko potrebujete, ako dlho a kam peniaze prídu.")}
      <section style={panel}>
        <Nadpis t={ph ? "Ako dlho bude bežať" : "Ako dlho bude zbierka bežať"} pecat />
        <Volby stlpce={2} value={zadarmo ? "kratka" : d.typ} onChange={(t) => zmen({ typ: t })} moznosti={[
          { k: "kratka" as const, t: "Krátkodobá", s: "30 dní, na jednu konkrétnu vec" },
          { k: "dlha" as const, t: "Dlhodobá", s: zadarmo ? "vo vyššom programe" : "3 až 12 mesiacov", zamok: zadarmo },
        ]} />
        {!zadarmo && d.typ === "dlha" && <Volby stlpce={3} vyska={48} value={d.mesiace} onChange={(m) => zmen({ mesiace: m })} moznosti={([3, 6, 12] as const).map((m) => ({ k: m, t: `${m} mesiacov` }))} />}
        <Nadpis t="Suma" pecat />
        <Volby stlpce={2} value={d.cielTyp} onChange={(t) => zmen({ cielTyp: t })} moznosti={[{ k: "ciel" as const, t: "Cieľová suma", s: "viem, koľko potrebujem" }, { k: "otv" as const, t: "Otvorená", s: "bez cieľa, koľko sa vyzbiera" }]} />
        {maCiel && <label style={{ position: "relative", display: "block", maxWidth: ph ? undefined : 320 }}>
          <input value={cielCislo(d) ? cielCislo(d).toLocaleString("sk-SK").replace(/ /g, " ") : ""} onChange={(e) => zmen({ ciel: e.target.value.replace(/\D/g, "").slice(0, 7) })} inputMode="numeric" placeholder="Napríklad 4 000" aria-label="Cieľová suma v eurách" style={{ ...pole, paddingRight: 40 }} />
          <span style={{ position: "absolute", right: 16, top: 15, fontSize: 16, fontWeight: 800, color: "var(--ink3)" }}>€</span>
        </label>}
        {zadarmo ? <>
          <Nadpis t="Kam prídu peniaze" />
          <div style={{ ...pole, display: "flex", alignItems: "center", gap: 10, background: "var(--btn)", color: "var(--ink2)", maxWidth: ph ? undefined : 520 }}><Zamok s={15} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hlavnyUcet}</span></div>
          <span style={{ ...pozn, marginTop: -6 }}>Hlavný účet organizácie z registrácie. Vlastný účet pre každú zbierku je vo vyššom programe.</span>
        </> : <>
          <Nadpis t={ph ? "Transparentný účet" : "Transparentný účet zbierky"} pecat />
          <input value={d.iban} onChange={(e) => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24); zmen({ iban: v.replace(/(.{4})/g, "$1 ").trim() }); }} placeholder="SK00 0000 0000 0000 0000 0000" aria-label="Transparentný účet zbierky" style={{ ...pole, maxWidth: ph ? undefined : 520 }} />
          <span style={{ ...pozn, marginTop: -6 }}>{ph ? "Pohyby na ňom vidí každý." : "Pohyby na ňom vidí každý. Pri zbierke ho ukážeme darcom."}</span>
        </>}
      </section></>;
  } else if (k === 4) {
    obsah = <>{hlavicka("Ako budú ľudia darovať", "Rýchle sumy a možnosti, ktoré darca uvidí pri zbierke.")}
      <section style={panel}>
        <Nadpis t={ph ? "Rýchle sumy" : "Rýchle sumy pre darcov"} />
        <Volby stlpce={ph ? 1 : 3} vyska={ph ? 52 : 62} value={d.sada} onChange={(i) => zmen({ sada: i })} moznosti={SADY.map(([t, a], i) => (ph ? { k: i, t, vpravo: `${a.join(" · ")} €` } : { k: i, t, s: `${a.join(" · ")} €` }))} />
        <span style={{ ...pozn, marginTop: -6 }}>{ph ? "Vlastnú sumu môže darca zadať vždy. Pod 3 € len SEPA." : "Vlastnú sumu môže darca zadať vždy. Sumy pod 3 € idú len cez SEPA."}</span>
        {eurcRezim === "pre všetky zbierky" && <div style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 14.5 }}>{ph ? "Dary v EURC sú zapnuté pre všetky zbierky." : "Dary v kryptomene EURC sú zapnuté pre všetky zbierky"}</b><span style={pozn}>{ph ? "Zmeníte v Nastaveniach stránky." : "Zmeniť to môžete v Nastaveniach stránky."}</span></div>}
        {eurcRezim === "podľa zbierky" && <>
          <Nadpis t={ph ? "Dary v EURC pri tejto zbierke" : "Dary v kryptomene EURC pri tejto zbierke"} />
          <Volby stlpce={2} vyska={50} value={d.eurc} onChange={(v) => zmen({ eurc: v })} moznosti={[{ k: true, t: "Áno" }, { k: false, t: "Nie" }]} />
          {!ph && <span style={{ ...pozn, marginTop: -6 }}>EURC je digitálne euro 1 : 1. V Nastaveniach stránky máte zvolené „podľa zbierky“.</span>}
        </>}
        {eurcOn && <>
          <Nadpis t="Rýchle sumy v EURC" />
          <Volby stlpce={ph ? 1 : 3} vyska={ph ? 52 : 62} value={d.sadaE} onChange={(i) => zmen({ sadaE: i })} moznosti={SADY_EURC.map(([t, a], i) => (ph ? { k: i, t, vpravo: a.map(cis).join(" · ") } : { k: i, t, s: a.map(cis).join(" · ") }))} />
        </>}
        {/* OPRAVY 124: pravidelná podpora je až od P1 — v Zadarmo sa neukáže */}
        {!zadarmo && <>
        <Nadpis t={ph ? "Pravidelná podpora" : "Pravidelná podpora pri tejto zbierke"} />
        <Volby stlpce={2} value={d.prav} onChange={(v) => zmen({ prav: v })} moznosti={[{ k: true, t: "Áno, ponúknuť", s: "darcovia môžu dávať každý mesiac" }, { k: false, t: "Nie", s: "len jednorazové dary" }]} />
        <span style={{ ...pozn, marginTop: -6 }}>{ph ? "Sumu si volí darca sám." : "Sumu pravidelnej podpory si volí darca sám, keď ju nastavuje. Vy len rozhodnete, či ju pri tejto zbierke ponúknete."}</span>
        </>}
      </section></>;
  } else if (k === 5) {
    obsah = <>{hlavicka("Dokladovanie", ph ? "Vyberte účel. Lehotu na doklady nastavíme sami." : "Darcovia chcú vidieť, na čo išli ich peniaze. Podľa účelu nastavíme lehotu sami.")}
      <section style={panel}>
        {!ph && <Nadpis t="Na aký účel zbierate" pecat />}
        <div role="radiogroup" aria-label="Účel zbierky" style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
          {UCELY.map(([t, l, p], i) => { const on = d.ucel === i; return (
            <button key={t} type="button" role="radio" aria-checked={on} onClick={() => zmen({ ucel: i })} style={{ ...vyber(on), minHeight: 70, padding: "12px 16px", borderRadius: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "var(--green)" : "#BDB6A8"}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--green)", opacity: on ? 1 : 0 }} /></span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 12.5, fontWeight: 700, color: on ? "var(--gInk)" : "var(--ink3)" }}>{p}</span>{ph && <span style={{ fontSize: 12.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink2)" }}>{l}</span>}</span>
              {!ph && <span style={{ flex: "none", maxWidth: 120, textAlign: "right", fontSize: 12.5, fontWeight: 800, color: on ? "var(--gInk)" : "var(--ink2)" }}>{l}</span>}
            </button>); })}
        </div>
        {jeIne(d) && <>
          <Nadpis t="Na čo zbierate" />
          <input value={d.ineT} onChange={(e) => zmen({ ineT: e.target.value.slice(0, 80) })} placeholder="Napíšte, na čo zbierate" aria-label="Na čo zbierate" style={pole} />
          <Nadpis t="Lehota na doklady" />
          <Volby stlpce={ph ? 2 : 4} vyska={50} value={d.ineL} onChange={(i) => zmen({ ineL: i })} moznosti={LEHOTY.map(([t], i) => ({ k: i, t }))} />
        </>}
        {d.ucel != null && leh.text && <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
          <div style={{ padding: "16px 18px", borderRadius: 16, background: "var(--gSoft)", border: "1px solid var(--gBd)", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gInk)" }}>LEHOTA NA DOKLADY</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{leh.text}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink2)" }}>{ph ? "Po spustení sa nedá zmeniť. Predĺžiť len na žiadosť so zdôvodnením, zadarmo." : "Po spustení sa nedá zmeniť, ani v správe zbierky. Predĺžiť ju môžete len na žiadosť so zdôvodnením, zadarmo."}</span>
          </div>
          {!ph && <div style={{ padding: "16px 18px", borderRadius: 16, background: "var(--field)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>ČO DARCOVIA UVIDIA</span>
            <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink2)" }}>Pri zbierke lehotu „{leh.text}“. Keď doložíte, zmení sa na zelené <b style={{ color: "var(--green)" }}>doložené</b>. Po lehote bez dokladov sa na profile ukáže „čaká na doklady“.</span>
          </div>}
        </div>}
      </section></>;
  } else {
    obsah = <>{hlavicka(ph ? "Kontrola" : "Kontrola pred spustením", ph ? "Údaje so zámkom sa po spustení nedajú zmeniť." : "Údaje so zámkom sa po spustení nedajú zmeniť, ani vami, ani nami. Najprv si pozrite, ako bude zbierka vyzerať.")}
      <div style={{ display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", gap: 12 }}>
        {(ph ? [["detail", "Pozrieť, ako ju uvidí darca", "aj s platbou", I.oko]] : [["str", "Na stránke charity", "karta zbierky medzi ostatnými", I.karta], ["detail", "Detail zbierky", "čo darca uvidí po otvorení, aj s platbou", I.oko]]).map(([t, n, s, ic]) => (
          <button key={t} type="button" onClick={() => setNahlad(t as "str" | "detail")} style={{ minHeight: 76, padding: "14px 18px", borderRadius: 18, border: "1.5px solid var(--gBd)", background: "var(--gSoft)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--field)", color: "var(--gInk)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ik d={ic} s={20} /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 16, color: "var(--gInk)" }}>{n}</b><span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gInk)" }}>{s}</span></span>
          </button>))}
      </div>
      <section style={{ ...panel, padding: 8, gap: 0, display: "grid", gridTemplateColumns: ph ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))", columnGap: 8, rowGap: 8 }}>
        {suhrn.map(([kk, v, n, lock]) => (
          <div key={kk} style={{ minHeight: 60, padding: "10px 14px", borderRadius: 14, background: "var(--field)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--ink3)" }}>{kk}{lock && <Zamok s={12} />}</span>
              <b style={{ fontSize: 14.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</b>
            </span>
            <button type="button" onClick={() => zmen({ krok: n })} style={{ flex: "none", minHeight: 44, padding: "0 6px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--green)" }}>Upraviť</button>
          </div>))}
      </section>
      <button type="button" role="checkbox" aria-checked={ok} onClick={() => setOk(!ok)} style={{ minHeight: 60, padding: "12px 18px", borderRadius: 16, border: `1.5px solid ${ok ? "var(--gBd)" : "transparent"}`, background: "var(--field)", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 26, height: 26, flex: "none", borderRadius: 8, border: `2px solid ${ok ? "var(--green)" : "#BDB6A8"}`, background: ok ? "var(--green)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{ok && <Ik d={I.fajka} s={15} w={3} />}</span>
        <b style={{ fontSize: 15, lineHeight: 1.45, color: "var(--ink)" }}>{ph ? "Skontroloval som údaje so zámkom. Po spustení sa nedajú zmeniť." : "Skontroloval som údaje so zámkom. Viem, že po spustení sa nedajú zmeniť."}</b>
      </button></>;
  }

  // ---------- spodná lišta ----------
  const tuk = potvrditTuknutim();
  const chybaEl = chyba ? <span role="status" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#8A5A2B", minWidth: 0 }}><span style={{ width: 8, height: 8, flex: "none", borderRadius: "50%", background: "#C9A24A" }} />{chyba}</span> : null;
  const dalejEl = k < 6
    ? <button type="button" onClick={dalej} aria-disabled={!!chyba} style={{ flex: ph ? 1 : "none", height: 52, padding: "0 24px", border: "none", borderRadius: 14, background: chyba ? "#CFC9BC" : "var(--green)", color: chyba ? "#6B6C62" : "#fff", cursor: chyba ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Pokračovať{!ph && <Ik d={I.vpravo} s={17} w={2.4} />}</button>
    : tuk
      ? <button type="button" onDoubleClick={() => void zapecat()} aria-disabled={!!chyba} style={{ flex: ph ? 1 : "none", height: 52, padding: "0 24px", border: "none", borderRadius: 14, background: chyba ? "#CFC9BC" : "var(--green)", color: chyba ? "#6B6C62" : "#fff", cursor: chyba ? "default" : "pointer", fontFamily: "inherit", fontSize: 16, fontWeight: 800 }}>Dvakrát kliknite a zapečaťte</button>
      : <div style={{ flex: ph ? 1 : "none", width: ph ? undefined : 280, ["--gGrad" as string]: "linear-gradient(90deg,#4B7A35,#8DB866)" }}><PodrzTlacidlo label="Podržte a zapečaťte" disabled={!!chyba} onConfirm={() => void zapecat()} /></div>;
  const spatEl = k > 1 ? <button type="button" onClick={spat} aria-label="Späť" style={{ flex: "none", height: 52, minWidth: 52, padding: ph ? 0 : "0 18px 0 12px", borderRadius: 14, border: "1.5px solid var(--cardBd)", background: ph ? "var(--field)" : "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Ik d={I.vlavo} s={18} w={2.4} />{!ph && "Späť"}</button> : null;

  if (ph) return (<>
    <div ref={hore} style={{ display: "flex", flexDirection: "column", gap: 16 }}>{stepper}{obsah}</div>
    <div aria-hidden="true" style={{ height: chyba ? 120 : 90 }} />
    {createPortal(
      <div className="sprava-charity" data-stit={stit} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(96px + env(safe-area-inset-bottom, 0px))", zIndex: 45, display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 18, background: "var(--panel)", border: "1px solid var(--cardBd)", boxShadow: "0 8px 24px rgba(30,28,20,.16)" }}>
        {chybaEl}
        <div style={{ display: "flex", gap: 10 }}>{spatEl}{dalejEl}</div>
      </div>, document.body)}
  </>);
  return (<>
    <div ref={hore} style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%", maxWidth: 980, margin: "0 auto" }}>{stepper}<div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 820, margin: "0 auto" }}>{obsah}</div></div>
    <div style={{ position: "sticky", bottom: 0, zIndex: 4, marginTop: 4, padding: "14px 0 16px", display: "flex", alignItems: "center", gap: 14, background: "var(--bg)", borderTop: "1px solid var(--cardBd)" }}>
      {spatEl}<span style={{ flex: 1 }} />{chybaEl}{dalejEl}
    </div>
  </>);
}
