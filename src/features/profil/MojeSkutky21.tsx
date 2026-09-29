// KARTA 21 · Moje skutky — zoznam po mesiacoch, filtre 3 × 2, hľadanie, ročné zhrnutie (len v januári),
// prázdny stav = tá istá obrazovka s ukážkami. Pridať skutok = spoločný komponent (otvorPridatSkutok).
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { SpatTlacidlo } from "@/components/cesta";
import { toast } from "@/components/toast";
import { useLayout } from "@/components/context";
import { Svetlusik } from "@/features/zbierka/Svetlusik";
import { Harok } from "@/features/zbierka/Zdielat";
import { DeedQr } from "@/components/deedqr";
import { spracujFotku } from "@/lib/obrazok";
import { useSession } from "@/lib/session";
import { useNastaveniaAppky, zmenNastavenia } from "@/lib/nastaveniaAppky";
import { mojeSkutky, useZmenySkutkov, upravSkutok, karmaSkutkov, normalizuj, type MojSkutok, type StavSkutku, type Oblast } from "@/lib/mojeSkutky";
import { otvorPridatSkutok } from "@/features/skutok/otvor";
import { PruhySkutkov } from "@/features/skutok/Pruhy";
import { MOJA_KARMA } from "./mock";
import "@/styles/platba.css";

const MESIACE = ["január", "február", "marec", "apríl", "máj", "jún", "júl", "august", "september", "október", "november", "december"];
const Mes = (m: number) => MESIACE[m][0].toUpperCase() + MESIACE[m].slice(1);
const OK = "M20 6 9 17l-5-5", WAIT = "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", AI = "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z", NO = "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z";
const ST: Record<StavSkutku, [string, string, string, string, string]> = {
  mesto: ["Komunita overila · v meste", "var(--gSoft)", "var(--gBd)", "var(--gInk)", OK],
  ok: ["Overila AI · v štvrti", "var(--gSoft)", "var(--gBd)", "var(--green)", OK],
  ai: ["Kontroluje AI", "var(--field)", "var(--cardBd)", "var(--ink2)", AI],
  nam: ["Spochybnený", "var(--bSoft)", "var(--bBd)", "var(--blue)", WAIT],
  ja: ["Môj denník", "var(--goldBg)", "var(--goldBd)", "var(--gold)", NO],
};
type Filter = "vsetky" | "ok" | "mesto" | "ai" | "nam" | "ja";
const FILTRE: [Filter, string][] = [["vsetky", "Všetky"], ["ok", "Overené"], ["mesto", "V meste"], ["ai", "Kontroluje AI"], ["nam", "Spochybnené"], ["ja", "Môj denník"]];
const PREJDE: Record<Filter, (x: MojSkutok) => boolean> = { vsetky: () => true, ok: (x) => x.stav === "ok" || x.stav === "mesto", mesto: (x) => x.stav === "mesto", ai: (x) => x.stav === "ai", nam: (x) => x.stav === "nam", ja: (x) => x.stav === "ja" };
const MOT: [string, string][] = [
  ["Veľké veci začínajú malými skutkami.", "Pomôž susedovi s nákupom, zdvihni odpadok, zavolaj babke. Aj to sa počíta."],
  ["Na väčšiu karmu nemusíš byť bohatý.", "Karma rastie zo skutkov, nie z peňazí. Hodina tvojho času má rovnakú cenu ako dar."],
  ["Aj rozvoj seba je skutok.", "Prečítaná kniha, prvý beh, nový jazyk. Také skutky sa ti zapíšu do tvojho denníka."],
];
const UKAZKY: [string, string, string, Oblast][] = [
  ["Zabezpečil som susede pitný režim", "Pomoc · s fotkou vody a špajze ide do feedu", "linear-gradient(135deg,#B9C7CF,#7E97A8)", "Pomoc"],
  ["Prvý beh 5 km", "Šport · do tvojho denníka", "linear-gradient(135deg,#E2D7BF,#C9B27B)", "Šport"],
  ["Vyčistili sme breh potoka", "Príroda · spoločná akcia so susedmi", "linear-gradient(135deg,#9DB38A,#5F7F5A)", "Príroda"],
];
/** len pre čítačku obrazovky */
const SR: CSSProperties = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };
const lbl: CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" };
const karta: CSSProperties = { borderRadius: 20, background: "var(--card)", border: "1px solid var(--cardBd)" };
const Ik = ({ d, s = 16, w = 2.4, c = "currentColor" }: { d: string; s?: number; w?: number; c?: string }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const datumTxt = (t: number) => {
  const d = new Date(t), dnes = new Date(); const rozdiel = Math.floor((new Date(dnes.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (rozdiel === 0) return "Dnes"; if (rozdiel === 1) return "Včera";
  if (rozdiel < 7) return ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"][d.getDay()];
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
};
const pocet = (n: number) => `${n} ${n === 1 ? "skutok" : n >= 2 && n <= 4 ? "skutky" : "skutkov"}`;

export function MojeSkutky21({ onBack }: { onBack: () => void }) {
  useZmenySkutkov();
  const { desktop } = useLayout();
  const session = useSession() as { demo?: boolean } | null;
  const nast = useNastaveniaAppky();
  const vsetky = mojeSkutky();
  const [f, setF] = useState<Filter>("vsetky");
  const [hlad, setHlad] = useState(false);
  const [q, setQ] = useState("");
  const [otv, setOtv] = useState<string | null>(null);
  const [mesOtv, setMesOtv] = useState<number | null>(null);
  const [rok, setRok] = useState<number | null>(null);
  const [m, setM] = useState(0);
  const [retazPre, setRetazPre] = useState<MojSkutok | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const doplnitPre = useRef<string | null>(null);

  const d = new Date(), R = d.getFullYear(), M = d.getMonth();
  const januar = M === 0 || (import.meta.env.DEV && localStorage.getItem("deed.dev.januar") === "1");
  const prazdne = vsetky.length === 0;
  const ukazky = prazdne && nast.ukazky;

  useEffect(() => { if (!ukazky) return; const t = setInterval(() => setM((x) => (x + 1) % MOT.length), 4200); return () => clearInterval(t); }, [ukazky]);

  const hladane = useMemo(() => { const n = normalizuj(q); return (x: MojSkutok) => !n || normalizuj(`${x.nazov} ${x.oblast} ${x.miesto}`).includes(n); }, [q]);
  const zoznam = vsetky.filter(PREJDE[f]).filter(hladane);
  const tentoRok = vsetky.filter((x) => new Date(x.datum).getFullYear() === R);
  const tentoMes = tentoRok.filter((x) => new Date(x.datum).getMonth() === M);
  const karma = session?.demo ? MOJA_KARMA + karmaSkutkov(vsetky.filter((x) => x.id.startsWith("m"))) : karmaSkutkov(vsetky);
  const vRoku = (r: number, mes: number) => zoznam.filter((x) => { const t = new Date(x.datum); return t.getFullYear() === r && t.getMonth() === mes; });
  const roky = [...new Set(vsetky.map((x) => new Date(x.datum).getFullYear()))].filter((r) => r < R).sort((a, b) => b - a);
  // ročné zhrnutie za minulý rok (len v januári)
  const minuly = vsetky.filter((x) => new Date(x.datum).getFullYear() === R - 1);
  const oblastiMin = minuly.reduce<Record<string, number>>((a, x) => ({ ...a, [x.oblast]: (a[x.oblast] || 0) + 1 }), {});
  const najOblast = Object.entries(oblastiMin).sort((a, b) => b[1] - a[1])[0]?.[0];
  const najSkutok = [...minuly].sort((a, b) => (b.karma ?? 0) - (a.karma ?? 0))[0];

  const doplnFotku = async (files: FileList | null) => {
    const file = files?.[0], id = doplnitPre.current; if (!file || !id) return;
    try {
      const src = await spracujFotku(file, { pomer: null, maxSirka: 1568 });
      const s = vsetky.find((x) => x.id === id);
      upravSkutok(id, { fotky: [src, ...(s?.fotky ?? [])], det: "Fotka doplnená. Kontrola AI pokračuje." });
      toast("Fotka doplnená, AI pokračuje v kontrole");
    } catch (e) { toast(e instanceof Error ? e.message : "Fotku sa nepodarilo načítať."); }
  };
  const zdielajRok = async () => {
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
    const x = c.getContext("2d")!;
    x.fillStyle = "#E2D7BF"; x.fillRect(0, 0, 1080, 1350);
    x.fillStyle = "#876712"; x.font = "800 44px 'Plus Jakarta Sans', sans-serif"; x.fillText("MÔJ ROK V DEED", 90, 200);
    x.fillStyle = "#1D211B"; x.font = "800 150px 'Plus Jakarta Sans', sans-serif"; x.fillText(String(R - 1), 90, 360);
    [[minuly.length, "skutkov"], [minuly.filter((s) => s.stav !== "ja").length, "akcií"], [Object.keys(oblastiMin).length, "oblastí"]].forEach(([n, t], i) => {
      x.font = "800 96px 'Plus Jakarta Sans', sans-serif"; x.fillText(String(n), 90 + i * 320, 600);
      x.font = "600 40px 'Plus Jakarta Sans', sans-serif"; x.fillStyle = "#4A4C43"; x.fillText(String(t), 90 + i * 320, 660); x.fillStyle = "#1D211B";
    });
    x.font = "600 44px 'Plus Jakarta Sans', sans-serif"; x.fillStyle = "#4A4C43";
    if (najOblast) x.fillText(`Najviac som pomáhal v oblasti ${najOblast}.`, 90, 820);
    x.fillStyle = "#4E7D37"; x.font = "800 48px 'Plus Jakarta Sans', sans-serif"; x.fillText("deed.sk", 90, 1240);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
    if (!blob) return;
    const file = new File([blob], `moj-rok-${R - 1}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: `Môj rok v DEED · ${R - 1}` }); } catch { /* zrušené */ } return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const riadok = (k: MojSkutok, i: number) => {
    const S = ST[k.stav], o = otv === k.id, foto = k.fotky[0];
    const img: CSSProperties = foto ? { background: `center/cover no-repeat url(${foto})` } : { background: k.grad || "var(--seg)" };
    const karmaT = k.karma == null ? "po kontrole" : k.karma === 0 ? "bez karmy" : `+${k.karma} karmy`;
    return (
      <div key={k.id} style={{ borderTop: i ? "1px solid var(--cardBd)" : "none" }}>
        <button type="button" onClick={() => setOtv(o ? null : k.id)} aria-expanded={o}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 64, border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
          <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, flex: "none", ...img }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.nazov}</span>
          <span role="img" aria-label={S[0]} style={{ width: 10, height: 10, borderRadius: "50%", flex: "none", background: S[3] }} />
          <span aria-hidden="true" style={{ display: "flex", flex: "none", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d="M6 9l6 6 6-6" /></span>
        </button>
        {o && <div className="pf-rise" style={{ padding: "0 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span aria-hidden="true" style={{ height: 180, borderRadius: 14, ...img }} />
          <div style={{ fontSize: 13, color: "var(--ink3)" }}>{datumTxt(k.datum)} · {k.oblast} · {k.miesto}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ flex: "none", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 9, fontSize: 13, fontWeight: 800, background: S[1], border: `1px solid ${S[2]}`, color: S[3] }}><Ik d={S[4]} s={14} />{S[0]}</span>
            <span style={{ marginLeft: "auto", fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap", color: k.stav === "ai" ? "var(--ink4)" : "var(--gInk)" }}>{karmaT}</span>
          </div>
          {k.ucastnici?.length ? <div style={{ fontSize: 13, color: "var(--ink2)" }}>S tebou {k.ucastnici.length} {k.ucastnici.length >= 5 ? "ľudí" : "ľudia"}</div> : null}
          <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)" }}>{k.det}</div>
          {k.stav === "ai" && <button type="button" onClick={() => { doplnitPre.current = k.id; fotoRef.current?.click(); }} style={{ alignSelf: "flex-start", whiteSpace: "nowrap", height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--bBd)", background: "var(--bSoft)", fontSize: 14, fontWeight: 700, color: "var(--blue)", cursor: "pointer", fontFamily: "inherit" }}>Doplniť fotku</button>}
          {(k.stav === "ok" || k.stav === "mesto") && !k.osobny && <button type="button" onClick={() => setRetazPre(k)} style={{ alignSelf: "flex-start", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 7, height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--gBd)", background: "var(--gSoft)", fontSize: 14, fontWeight: 700, color: "var(--gInk)", cursor: "pointer", fontFamily: "inherit" }}><Ik d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" s={15} w={2} />Reťaz dobra</button>}
        </div>}
      </div>);
  };
  const mesiacRiadok = (r: number, mes: number, zoz: MojSkutok[]) => {
    const kluc = r * 12 + mes, o = mesOtv === kluc;
    return (
      <div key={kluc} style={{ ...karta, borderRadius: 16, padding: "0 14px" }}>
        <button type="button" onClick={() => setMesOtv(o ? null : kluc)} aria-expanded={o} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 56, border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)", textAlign: "left" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 }}>{Mes(mes)}</span>
          <span style={{ fontSize: 13.5, color: "var(--ink3)", whiteSpace: "nowrap" }}>{pocet(zoz.length)}</span>
          <span aria-hidden="true" style={{ display: "flex", color: "var(--ink3)", transform: o ? "rotate(180deg)" : "none", transition: "transform .25s ease" }}><Ik d="M6 9l6 6 6-6" /></span>
        </button>
        {o && <div style={{ borderTop: "1px solid var(--cardBd)" }}>{zoz.map(riadok)}</div>}
      </div>);
  };

  // ---- obsah ----
  let obsah: ReactNode;
  if (rok != null) {
    const mesiace = Array.from({ length: 12 }, (_, i) => 11 - i).map((mes) => [mes, vRoku(rok, mes)] as const).filter(([, z]) => z.length);
    obsah = <>
      {mesiace.map(([mes, z]) => mesiacRiadok(rok, mes, z))}
      {!mesiace.length && <div style={{ fontSize: 14, color: "var(--ink3)", textAlign: "center", padding: 20 }}>Nič sme nenašli.</div>}
    </>;
  } else {
    const aktualne = zoznam.filter((x) => { const t = new Date(x.datum); return t.getFullYear() === R && t.getMonth() === M; });
    const starsie = Array.from({ length: M }, (_, i) => M - 1 - i).map((mes) => [mes, vRoku(R, mes)] as const).filter(([, z]) => z.length);
    obsah = <>
      {januar && minuly.length > 0 && (
        <div style={{ position: "relative", borderRadius: 24, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: 18, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Svetlusik size={56} />
            <span><span style={{ display: "block", fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gold)" }}>TVOJ ROK V DEED</span><span style={{ display: "block", fontSize: 22, fontWeight: 800 }}>{R - 1}</span></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {([[minuly.length, "skutkov"], [minuly.filter((s) => s.stav !== "ja").length, "akcií"], [Object.keys(oblastiMin).length, "oblastí"]] as const).map(([n, t]) => (
              <div key={t}><div style={{ fontSize: 20, fontWeight: 800 }}>{n}</div><div style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t}</div></div>))}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Najviac si pomáhal v oblasti <b style={{ color: "var(--ink)" }}>{najOblast}</b>.{najSkutok && <> Najväčší skutok: <b style={{ color: "var(--ink)" }}>{najSkutok.nazov.toLowerCase()}</b>.</>}</div>
          <button type="button" onClick={zdielajRok} style={{ height: 48, borderRadius: 14, border: "none", background: "#1D211B", color: "#F1ECE1", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Zdieľať môj rok</button>
        </div>)}
      <div style={{ ...karta, borderRadius: 18, display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {([[tentoRok.length, "skutkov", "var(--ink)"], [tentoMes.length, "tento mesiac", "var(--ink)"], [karma.toLocaleString("sk-SK"), "karma · len ty", "var(--gInk)"]] as const).map(([n, t, c], i) => (
          <div key={t} style={{ padding: "12px 4px", textAlign: "center", borderLeft: i ? "1px solid var(--cardBd)" : "none" }}><div style={{ fontSize: 20, fontWeight: 800, color: c, whiteSpace: "nowrap" }}>{n}</div><div style={{ fontSize: 12.5, color: "var(--ink3)" }}>{t}</div></div>))}
      </div>
      {ukazky && <>
        <div style={{ borderRadius: 20, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <Svetlusik size={52} />
          <span style={{ flex: 1, minWidth: 0 }} aria-live="polite"><span key={m} className="pf-rise" style={{ display: "block", minHeight: 40, fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{MOT[m][0]}</span><span style={{ display: "block", minHeight: 36, fontSize: 13, lineHeight: 1.45, color: "var(--ink2)", marginTop: 3 }}>{MOT[m][1]}</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}><span style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ink3)" }}>Zatiaľ tu máš ukážky. Zmiznú po tvojom prvom skutku.</span>
          <button type="button" onClick={() => zmenNastavenia({ ukazky: false })} style={{ flex: "none", border: "none", background: "transparent", fontSize: 13.5, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "12px 0 12px 10px", fontFamily: "inherit" }}>Skryť ukážky</button></div>
      </>}
      <div role="group" aria-label="Filter skutkov" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {FILTRE.map(([k, n]) => { const on = f === k; return (
          <button type="button" key={k} aria-pressed={on} onClick={() => setF(k)} style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", height: 44, padding: "0 6px", borderRadius: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            background: on ? "var(--ink)" : "var(--card)", border: `1.5px solid ${on ? "var(--ink)" : "var(--cardBd)"}`, color: on ? "var(--bg)" : "var(--ink2)" }}>{n}</button>); })}
      </div>
      {f === "ja" && !prazdne && (() => {
        const ja = tentoMes.filter((x) => x.stav === "ja");
        const skup = ja.reduce<Record<string, number>>((a, x) => ({ ...a, [x.oblast]: (a[x.oblast] || 0) + 1 }), {});
        return <div style={{ borderRadius: 18, background: "var(--goldBg)", border: "1px solid var(--goldBd)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".06em", color: "var(--gold)" }}>MÔJ DENNÍK · TENTO MESIAC · VIDÍŠ LEN TY</div>
          {Object.entries(skup).map(([o, n]) => <div key={o} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15 }}><span style={{ flex: 1, fontWeight: 700 }}>{o}</span><span style={{ color: "var(--ink2)", fontVariantNumeric: "tabular-nums" }}>{n}×</span></div>)}
          {!ja.length && <div style={{ fontSize: 14, color: "var(--ink2)" }}>Tento mesiac zatiaľ nič.</div>}
        </div>;
      })()}
      {ukazky ? <>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 6 }}><h2 style={lbl}>INŠPIRÁCIA PRE ZAČIATOK</h2>
          <button type="button" onClick={() => zmenNastavenia({ ukazky: false })} style={{ border: "none", background: "transparent", fontSize: 13.5, fontWeight: 700, color: "var(--green)", cursor: "pointer", padding: "12px 0 12px 8px", fontFamily: "inherit" }}>Skryť ukážky</button></div>
        {UKAZKY.map(([t, s, img, o]) => (
          <div key={t} style={{ position: "relative", overflow: "hidden", borderRadius: 18, background: "var(--card)", border: "1.5px dashed var(--cardBd)", padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <span aria-hidden="true" style={{ position: "absolute", top: 10, right: -30, width: 110, transform: "rotate(35deg)", background: "var(--seg)", color: "var(--ink3)", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textAlign: "center", padding: "3px 0" }}>UKÁŽKA</span>
            <span aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 12, flex: "none", background: img, opacity: 0.7 }} />
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", opacity: 0.85 }}><span style={{ display: "block", fontSize: 15, fontWeight: 800, lineHeight: 1.3, paddingRight: 28 }}><span style={SR}>Ukážka: </span>{t}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)", marginTop: 2 }}>{s}</span></span>
              <button type="button" onClick={() => otvorPridatSkutok({ start: "solo", oblast: o })} style={{ marginTop: 8, height: 44, padding: "0 14px", borderRadius: 12, border: "1px solid var(--gBd)", background: "var(--gSoft)", fontSize: 14, fontWeight: 700, color: "var(--gInk)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>Urobím podobný</button></span>
          </div>))}
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink4)", textAlign: "center" }}>Ukážky vidíš len ty a nepočítajú sa do karmy. Zmiznú, keď pridáš prvý vlastný skutok.</div>
      </> : <>
        <h2 style={lbl}>{R} · {MESIACE[M].toUpperCase()}{prazdne ? " · ZATIAĽ PRÁZDNE" : ""}</h2>
        {aktualne.length > 0 ? <div style={{ ...karta, padding: "0 12px" }}>{aktualne.map(riadok)}</div>
          : <div style={{ ...karta, padding: "16px 14px", fontSize: 14, color: "var(--ink3)" }}>{prazdne ? "Tvoj prvý skutok pridáš tlačidlom Pridať skutok." : q ? "Nič sme nenašli." : "Tento mesiac tu zatiaľ nič nie je."}</div>}
        {starsie.map(([mes, z]) => mesiacRiadok(R, mes, z))}
        {roky.some((r) => zoznam.some((x) => new Date(x.datum).getFullYear() === r)) && <h2 style={{ ...lbl, marginTop: 4 }}>STARŠIE ROKY</h2>}
        {roky.map((r) => { const z = zoznam.filter((x) => new Date(x.datum).getFullYear() === r); if (!z.length) return null; const akcii = z.filter((x) => x.stav !== "ja").length, sukr = z.filter((x) => x.stav === "ja").length; return (
          <button type="button" key={r} onClick={() => { setRok(r); setMesOtv(null); }} style={{ ...karta, borderRadius: 18, display: "flex", alignItems: "center", gap: 12, minHeight: 64, padding: "8px 14px", cursor: "pointer", textAlign: "left", fontFamily: "inherit", color: "var(--ink)" }}>
            <span style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", width: 56 }}>{r}</span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{pocet(z.length)}</span><span style={{ display: "block", fontSize: 13, color: "var(--ink3)" }}>{akcii} overených akcií · {sukr} súkromných</span></span>
            <span style={{ display: "flex", color: "var(--ink3)" }}><Ik d="M9 6l6 6-6 6" /></span>
          </button>); })}
        {!prazdne && <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center", padding: "0 12px" }}>Každý skutok najprv skontroluje AI, potom ho potvrdí komunita cez Overujem alebo Namietam. Karmu vidíš len ty.</div>}
      </>}
    </>;
  }

  const fabBottom = desktop ? 24 : "calc(96px + env(safe-area-inset-bottom, 0px))";
  return (
    <div className="deed-platba" style={{ minHeight: "100%", color: "var(--ink)" }}>
      <div style={{ padding: `4px 16px ${desktop ? "24px" : "calc(110px + env(safe-area-inset-bottom, 0px))"}`, display: "flex", flexDirection: "column", gap: 14, maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52 }}>
          <SpatTlacidlo onClick={rok != null ? () => setRok(null) : onBack} />
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{rok != null ? `Moje skutky · ${rok}` : "Moje skutky"}</h1>
          <button type="button" onClick={() => { setHlad(!hlad); setQ(""); }} aria-label="Hľadať" aria-expanded={hlad} style={{ marginLeft: "auto", marginRight: -6, width: 44, height: 44, border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--ink2)" }}>
            <Ik d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" s={21} w={2.2} /></button>
        </div>
        {hlad && <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadaj skutok alebo oblasť" aria-label="Hľadaj skutok alebo oblasť" className="pf-rise"
          style={{ height: 50, padding: "0 14px", borderRadius: 13, background: "var(--field)", border: "1.5px solid var(--fieldBd)", fontSize: 16, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />}
        {obsah}
        {/* dole: banner akcie / ohláseného skutku + Pridať skutok (jediný vstup) — lepí sa na spodok stĺpca */}
        <div style={{ position: "sticky", bottom: fabBottom, zIndex: 41, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, pointerEvents: "none", marginTop: 8 }}>
          <PruhySkutkov />
          <button type="button" onClick={() => otvorPridatSkutok()} style={{ alignSelf: "flex-end", pointerEvents: "auto", display: "flex", alignItems: "center", gap: 8, height: 58, padding: "0 22px 0 18px", borderRadius: 29, border: "none", background: "var(--gGrad)", color: "#fff", fontSize: 16.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(75,122,53,.35)", fontFamily: "inherit" }}>
            <Ik d="M12 5v14M5 12h14" s={22} w={2.6} />Pridať skutok</button>
        </div>
      </div>
      <input ref={fotoRef} type="file" accept="image/*" hidden onChange={(e) => { void doplnFotku(e.target.files); e.target.value = ""; }} />

      {retazPre && <Harok onClose={() => setRetazPre(null)} hlavicka={<h2 style={{ flex: 1, margin: 0, fontSize: 19, fontWeight: 800 }}>Reťaz dobra</h2>}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{retazPre.nazov}</div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>{retazPre.retaz
          ? <>Reťaz je zapečatená. <b style={{ color: "var(--ink)", whiteSpace: "nowrap" }}>{retazPre.retaz.pct}&nbsp;%</b> z každej odmeny za tento skutok ide na {retazPre.retaz.zbierka.nazov}.</>
          : "Reťaz sa nastavuje len pri pridaní skutku. Tento skutok ju nemá, odmeny od ľudí idú celé tebe."}</div>
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><DeedQr data={`https://deed.sk/s/${retazPre.id}`} size={200} retaz={!!retazPre.retaz} delenie={retazPre.retaz ? `${retazPre.retaz.pct} % na zbierku` : null} /></div>
        <div style={{ fontSize: 13, color: "var(--ink3)", lineHeight: 1.45, textAlign: "center" }}>Kto QR naskenuje, otvorí tvoj skutok a môže ti poslať odmenu.</div>
      </Harok>}
    </div>
  );
}
