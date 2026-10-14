// ============================================================
// KARTA 64 · Kronika — druhý vzhľad verejnej stránky farnosti (prototypy „Farnost - Kronika PC v2“ tmavý aj svetlý,
// „… tablet“, „… mobil“). Tie isté dáta a bloky ako Nástenka (NastenkaFarnosti.tsx), iná podoba. Tu sú len diely podoby;
// dáta, ťuky a celé obrazovky sú v NastenkaFarnosti. Pevné rozloženie: farár nič nepresúva, mení len farbu línií (243).
// Farby z nastenka.css (--nf-*), text najmenej 14,5 px, tlačidlá najmenej 44 px, animuje sa len transform a opacity.
// ============================================================
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

const BG = "var(--nf-bg)", KARTA = "var(--nf-karta)", PAPIER = "var(--nf-papier)", LINKA = "var(--nf-linka)";
const INK = "var(--nf-ink)", INK2 = "var(--nf-ink2)", INK3 = "var(--nf-ink3)";
export const SERIF_KRONIKY = "'Source Serif 4',Georgia,'Times New Roman',serif";
const MES = ["JAN", "FEB", "MAR", "APR", "MÁJ", "JÚN", "JÚL", "AUG", "SEP", "OKT", "NOV", "DEC"];

/** písmo s pätkami pre zápisy (Teš sa, Spomíname) — načíta sa raz, až keď je Kronika na obrazovke */
export function useSerifKroniky(on: boolean) {
  useEffect(() => {
    if (!on || typeof document === "undefined" || document.getElementById("kronika-serif")) return;
    const l = document.createElement("link");
    l.id = "kronika-serif"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600&display=swap";
    document.head.appendChild(l);
  }, [on]);
}

/** lesk vo farbe línií; Bordová je matná */
export const leskLinie = (matna: boolean) => (matna ? "var(--nf-linia)" : "linear-gradient(100deg,var(--kr-a),var(--kr-b) 45%,var(--kr-c) 70%,var(--kr-d))");
const textLesk = (matna: boolean): CSSProperties => (matna ? { color: "var(--nf-linia)" }
  : { color: "var(--kr-plna)", background: leskLinie(false), WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" });

/** nadpis bloku: bežné písanie, 32 px (mobil 18 px), vo farbe línií s jemným leskom, pod ním linka 64 × 4 (mobil 36 × 3) */
export function KNadpis({ t, maly, matna, velky }: { t: string; maly?: boolean; matna: boolean; /** „Tento týždeň“ */ velky?: boolean }) {
  const fs = velky ? (maly ? 22 : "clamp(52px,5.4vw,76px)") : maly ? 18 : 32;
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: maly ? 7 : 10, alignItems: "flex-start" }}>
      <b style={{ display: "inline-block", fontSize: fs, lineHeight: velky && !maly ? 1 : 1.1, fontWeight: 800, letterSpacing: velky && !maly ? "-.045em" : "-.025em", ...textLesk(matna) }}>{t}</b>
      {!velky && <span aria-hidden="true" style={{ width: maly ? 36 : 64, height: maly ? 3 : 4, borderRadius: 2, background: leskLinie(matna) }} />}
    </span>);
}

/** dátumový štvorec Kroniky (OPRAVY 246): bežný deň biely, sobota modrý rám, nedeľa červený rám, tábor plná modrá (`plny`) */
export function KDatum({ d, plny, velky, odznak }: { d: Date; /** tábor — plná farba */ plny?: string; velky?: boolean; /** OPRAVY 250: malý odznak na fotke */ odznak?: boolean }) {
  const w = d.getDay(), ram = plny ? undefined : w === 6 ? "var(--kr-so)" : w === 0 ? "var(--kr-ne)" : undefined;
  const bg = plny ?? (ram ? KARTA : "#F1ECE1"), ink = plny ? "#fff" : ram ?? "#14110B";
  const s = odznak ? 42 : velky ? 64 : 58;
  return (
    <span style={{ flex: "none", width: s, height: s, boxSizing: "border-box", borderRadius: odznak ? 9 : 12, boxShadow: odznak ? "0 2px 8px rgba(0,0,0,.35)" : undefined, background: bg, color: ink, border: ram ? `3px solid ${ram}` : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <b style={{ fontSize: odznak ? 15 : 20, lineHeight: 1 }}>{d.getDate()}</b><span style={{ fontSize: odznak ? 9.5 : 11.5, fontWeight: 800, opacity: plny || ram ? 1 : 0.75 }}>{MES[d.getMonth()]}</span>
    </span>);
}

/** štvorec zbierky s fotkou, farebný rám a hrubší pás hore */
export function ZbierkaStvorec({ stitok, nazov, pod, foto, farba, onTap }: { stitok: string; nazov: string; pod?: string; foto?: string; farba: string; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap} aria-label={`${stitok} · ${nazov}`}
      style={{ position: "relative", aspectRatio: "1 / 1", minWidth: 0, borderRadius: 18, overflow: "hidden", border: `2px solid ${farba}`, borderTopWidth: 7, padding: "12px 14px", boxSizing: "border-box",
        background: foto ? `center/cover no-repeat url('${foto}')` : "linear-gradient(160deg,#3A372E,#14110B)", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "flex-start", gap: 2, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,0) 30%,rgba(10,8,5,.85))" }} />
      <span style={{ position: "relative", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "#E8E1D3", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stitok}</span>
      <b style={{ position: "relative", fontSize: 17, lineHeight: 1.2, color: "#fff", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{nazov}</b>
      {pod && <span style={{ position: "relative", fontSize: 13.5, color: "#E8E1D3" }}>{pod}</span>}
    </button>);
}

/** Pomôž — modrá karta ako „Hľadáme ľudí“ v charite */
export function PomozKarta({ stitok, kedy, t, txt, kde, cas, akcia }: { stitok: string; kedy?: string; t: string; txt?: ReactNode; kde?: string; cas?: string; akcia?: ReactNode }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", padding: "20px 20px 18px", borderRadius: 22, background: "linear-gradient(160deg,#355E80,#4A7BA0)", color: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
      <span aria-hidden="true" style={{ position: "absolute", right: -30, top: -30, width: 110, height: 110, borderRadius: "50%", border: "14px solid rgba(255,255,255,.08)" }} />
      <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ padding: "5px 12px", borderRadius: 14, background: "#fff", color: "#2F5E8E", fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em" }}>{stitok}</span>
        {kedy && <span style={{ fontSize: 14.5, fontWeight: 700, color: "#E3ECF4" }}>{kedy}</span>}
      </span>
      <b style={{ position: "relative", fontSize: 22, lineHeight: 1.2, letterSpacing: "-.01em" }}>{t}</b>
      {txt && <span style={{ position: "relative", fontSize: 15.5, lineHeight: 1.5, color: "#E3ECF4" }}>{txt}</span>}
      {(kde || cas) && <span style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,.25)", borderBottom: "1px solid rgba(255,255,255,.25)" }}>
        {kde && <span style={{ display: "flex", gap: 14, fontSize: 15 }}><span style={{ width: 56, flex: "none", color: "#E3ECF4" }}>Kde</span><b style={{ minWidth: 0 }}>{kde}</b></span>}
        {cas && <span style={{ display: "flex", gap: 14, fontSize: 15 }}><span style={{ width: 56, flex: "none", color: "#E3ECF4" }}>Kedy</span><b style={{ minWidth: 0 }}>{cas}</b></span>}
      </span>}
      {akcia}
    </div>);
}

/** Sväté omše — týždeň, dnešok zvýraznený, sobota modrá, nedeľa červená */
export function SvateOmse({ dni, onCely, maly, matna, bezNadpisu }: { dni: { d: Date; dnes: boolean; casy: string; pozn?: string }[]; onCely: () => void; maly?: boolean; matna: boolean; /** OPRAVY 245: v zbalenom bloku nadpis nesie riadok */ bezNadpisu?: boolean }) {
  const DN = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];
  return (
    <div data-blok={bezNadpisu ? undefined : "omse"} style={{ display: "flex", flexDirection: "column", gap: 8, scrollMarginTop: 16 }}>
      {!bezNadpisu && <span style={{ padding: "0 0 4px" }}><KNadpis t="Sväté omše" maly={maly} matna={matna} /></span>}
      {dni.map(({ d, dnes, casy, pozn }) => { const w = d.getDay(); return (
        <div key={d.toDateString()} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "9px 12px", borderRadius: dnes ? 12 : 0, background: dnes ? "var(--nf-gSoft)" : "transparent", borderBottom: dnes ? "none" : `1px solid ${LINKA}`, color: dnes ? "var(--nf-gInk)" : INK, fontWeight: dnes ? 800 : 400 }}>
          <b style={{ width: 74, flex: "none", fontSize: 15.5, color: dnes ? "var(--nf-gInk)" : w === 6 ? "#5B8FBF" : w === 0 ? "var(--nf-cervena)" : INK }}>{DN[w]}{dnes ? " · dnes" : ""}</b>
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}><span style={{ fontSize: 16 }}>{casy || "—"}</span>{pozn && <span style={{ fontSize: 13, fontWeight: 700, color: INK3 }}>{pozn}</span>}</span>
        </div>); })}
      <button type="button" onClick={onCely} style={{ alignSelf: "flex-start", minHeight: 44, padding: 0, border: "none", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>Celý kalendár ›</button>
    </div>);
}

/** riadok zápisu (Oznamy, Teš sa): dátum, obrázok, štítok, nadpis, veta */
export function Zapis({ d, obr, stitok, farbaStitku, t, veta, serif, onTap, deti }: { d?: Date; obr?: string; stitok: string; farbaStitku: string; t: string; veta?: string; serif?: boolean; onTap?: () => void; deti?: ReactNode }) {
  const obsah = <>
    {d ? <span style={{ flex: "none", width: 62, display: "flex", flexDirection: "column", alignItems: "center" }}><b style={{ fontSize: 26, lineHeight: 1 }}>{d.getDate()}</b><span style={{ fontSize: 12, fontWeight: 800, color: INK3 }}>{MES[d.getMonth()]}</span></span> : null}
    {obr !== undefined && <span style={{ flex: "none", width: "clamp(72px,9vw,110px)", height: "clamp(54px,6.5vw,80px)", borderRadius: 10, background: obr ? `center/cover no-repeat url('${obr}')` : "linear-gradient(150deg,#5A4A22,#2E2715)" }} />}
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, textAlign: "left" }}>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", color: farbaStitku }}>{stitok}</span>
      <b style={{ fontFamily: serif ? SERIF_KRONIKY : undefined, fontSize: serif ? 24 : 19, lineHeight: 1.2, fontWeight: serif ? 600 : 800, overflowWrap: "anywhere" }}>{t}</b>
      {veta && <span style={{ fontSize: 15.5, lineHeight: 1.45, color: INK3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{veta}</span>}
      {deti}
    </span></>;
  const st: CSSProperties = { display: "flex", gap: 18, alignItems: "center", padding: "18px 0", borderBottom: `1px solid ${LINKA}`, color: INK, width: "100%" };
  return onTap ? <button type="button" onClick={onTap} style={{ ...st, border: "none", borderBottom: `1px solid ${LINKA}`, background: "transparent", fontFamily: "inherit", cursor: "pointer" }}>{obsah}</button> : <div style={st}>{obsah}</div>;
}

/** Spomíname: malý ovál 66 × 84 so zlatým rámom (fotka z parte, bez fotky krížik podľa cirkvi), meno s pätkami */
export function SpomZapis({ foto, symbol, meno, rod, roky, rozlucka, zbierka, sustrast, onTap }: { foto?: string; symbol: string; meno: string; rod?: string; roky?: string; rozlucka?: string; zbierka: boolean; sustrast: number; onTap: () => void }) {
  return (
    <button type="button" onClick={onTap} style={{ display: "flex", gap: 20, alignItems: "center", padding: "20px 0", border: "none", borderBottom: "1px solid color-mix(in srgb,var(--nf-linka) 70%,transparent)", background: "transparent", color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer", width: "100%", flexWrap: "wrap" }}>
      <span style={{ flex: "none", width: 66, height: 84, borderRadius: "50%", border: "2px solid #C9A24A", background: foto ? `center/cover no-repeat url('${foto}')` : "linear-gradient(160deg,#3A2E3E,#1C1820)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A24A", fontSize: 30, fontWeight: 400 }}>{foto ? "" : symbol}</span>
      <span style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontFamily: SERIF_KRONIKY, fontSize: 24, lineHeight: 1.2, fontWeight: 600 }}>{meno}</b>
        {(rod || roky) && <span style={{ fontSize: 15.5, color: INK3 }}>{[rod, roky].filter(Boolean).join(" · ")}</span>}
        {rozlucka && <span style={{ fontSize: 15.5, color: INK2 }}>{rozlucka}</span>}
      </span>
      {(zbierka || sustrast > 0) && <span style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: "auto" }}>
        {zbierka && <span style={{ padding: "5px 11px", borderRadius: 9, border: "1.5px solid var(--nf-fialova)", color: "var(--nf-fialova)", fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em" }}>ZBIERKA RODINY</span>}
        {sustrast > 0 && <span style={{ fontSize: 14.5, color: INK3 }}>{sustrast} {sustrast === 1 ? "prejavil" : sustrast < 5 ? "prejavili" : "prejavilo"} sústrasť</span>}
      </span>}
    </button>);
}

// ---------- archív rokov ----------
export interface ZapisArchivu { id: string; d: Date; stitok: string; farba: string; t: string; pod?: string; veta?: string; foto?: string; onTap?: () => void }
export interface RokArchivu { rok: number; suhrn: [string, string][]; zapisy: ZapisArchivu[] }

/** pás roka so súhrnom a ⌃⌄, pod ním časová os; aktuálny rok - 1 rozbalený, staršie zbalené, „Zobraziť celý rok ›“ */
export function ArchivRokov({ roky, maly, matna }: { roky: RokArchivu[]; maly?: boolean; matna: boolean }) {
  const [otv, setOtv] = useState<Record<number, boolean>>(() => (roky[0] ? { [roky[0].rok]: true } : {}));
  const [cely, setCely] = useState<Record<number, boolean>>({});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {roky.map((r, i) => {
        const o = !!otv[r.rok], prvy = i === 0;
        const z = cely[r.rok] ? r.zapisy : r.zapisy.slice(0, 3);
        return (
          <section key={r.rok} data-blok={`rok${r.rok}`} aria-label={`Rok ${r.rok}`} style={{ display: "flex", flexDirection: "column", gap: 16, scrollMarginTop: 16 }}>
            <button type="button" aria-expanded={o} onClick={() => setOtv((x) => ({ ...x, [r.rok]: !o }))}
              style={{ display: "flex", alignItems: "center", gap: maly ? 14 : 28, padding: maly ? "14px 16px" : "18px 22px", borderRadius: 18, border: `${o ? 1.5 : 1}px solid ${LINKA}`, background: o ? PAPIER : "transparent", color: INK, fontFamily: "inherit", cursor: "pointer", textAlign: "left", flexWrap: maly ? "wrap" : "nowrap" }}>
              <b style={{ fontSize: maly ? 34 : prvy || o ? 60 : 44, lineHeight: 1, letterSpacing: "-.04em", ...(o ? textLesk(matna) : { color: INK3 }) }}>{r.rok}</b>
              {o && !maly
                ? <span style={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, r.suhrn.length)},minmax(0,1fr))`, gap: 16 }}>
                  {r.suhrn.map(([v, n]) => <span key={n} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: 24 }}>{v}</b><span style={{ fontSize: 14.5, color: INK3 }}>{n}</span></span>)}
                </span>
                : <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: INK3 }}>{r.suhrn.map(([v, n]) => `${v} ${n}`).join(" · ")}</span>}
              <span aria-hidden="true" style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", border: `1px solid ${LINKA}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{o ? "⌃" : "⌄"}</span>
            </button>
            {o && <>
              {z.map((x) => (
                <div key={x.id} style={{ display: "grid", gridTemplateColumns: maly ? "48px 20px minmax(0,1fr)" : "64px 24px minmax(0,1fr)", gap: maly ? "0 10px" : "0 14px", alignItems: "start" }}>
                  <span style={{ paddingTop: 18, textAlign: "right", display: "flex", flexDirection: "column" }}><b style={{ fontSize: maly ? 20 : 24, lineHeight: 1 }}>{x.d.getDate()}.</b><span style={{ fontSize: 12.5, fontWeight: 800, color: INK3 }}>{MES[x.d.getMonth()]}</span></span>
                  <span aria-hidden="true" style={{ position: "relative", alignSelf: "stretch", display: "flex", justifyContent: "center" }}>
                    <span style={{ position: "absolute", top: 0, bottom: -16, width: 2, background: "color-mix(in srgb,var(--nf-zlata) 35%,var(--nf-linka))" }} />
                    <span style={{ position: "relative", marginTop: 24, width: 14, height: 14, borderRadius: "50%", border: "2.5px solid var(--kr-plna)", background: BG, boxSizing: "border-box" }} />
                  </span>
                  <button type="button" onClick={x.onTap} disabled={!x.onTap} style={{ display: "flex", flexWrap: maly ? "wrap" : "nowrap", borderRadius: 18, overflow: "hidden", background: KARTA, border: "none", padding: 0, color: INK, fontFamily: "inherit", textAlign: "left", cursor: x.onTap ? "pointer" : "default", minWidth: 0 }}>
                    {x.foto && <span style={{ flex: maly ? "1 1 100%" : "none", width: maly ? undefined : 200, minHeight: maly ? 140 : undefined, aspectRatio: maly ? "16 / 9" : undefined, background: `center/cover no-repeat url('${x.foto}')` }} />}
                    <span style={{ flex: 1, minWidth: 0, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: x.farba }}>{x.stitok}</span>
                      <b style={{ fontSize: 20, lineHeight: 1.25 }}>{x.t}</b>
                      {x.pod && <span style={{ fontSize: 15, color: INK3 }}>{x.pod}</span>}
                      {x.veta && <span style={{ fontSize: 15.5, color: INK2 }}>{x.veta}</span>}
                    </span>
                  </button>
                </div>))}
              {r.zapisy.length > 3 && !cely[r.rok] && <button type="button" onClick={() => setCely((x) => ({ ...x, [r.rok]: true }))} style={{ alignSelf: "center", minHeight: 44, padding: "0 12px", border: "none", background: "transparent", color: "var(--nf-gInk)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Zobraziť celý rok {r.rok} ›</button>}
            </>}
          </section>);
      })}
    </div>);
}

// ---------- hľadanie ----------
export interface NajdenePolozka { id: string; t: string; s?: string; druh: string; blok: string; onTap?: () => void }
export function KronikaHladat({ polozky, onBlok }: { polozky: NajdenePolozka[]; onBlok: (b: string) => void }) {
  const [q, setQ] = useState("");
  const n = (s: string) => s.toLocaleLowerCase("sk-SK").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const vysl = useMemo(() => { const x = n(q.trim()); return x.length < 2 ? [] : polozky.filter((p) => n(`${p.t} ${p.s ?? ""}`).includes(x)).slice(0, 12); }, [q, polozky]);
  return (
    <div style={{ position: "relative" }}>
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať vo farnosti: oznam, akcia, prosba" aria-label="Hľadať vo farnosti"
        style={{ width: "100%", boxSizing: "border-box", minHeight: 50, padding: "0 18px", borderRadius: 14, background: PAPIER, border: `1px solid ${LINKA}`, color: INK, fontFamily: "inherit", fontSize: 16, outline: "none" }} />
      {q.trim().length >= 2 && <div role="listbox" aria-label="Nájdené" style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 5, maxHeight: 420, overflowY: "auto", borderRadius: 16, background: PAPIER, border: `1px solid ${LINKA}`, boxShadow: "0 16px 40px rgba(0,0,0,.25)", padding: 6 }}>
        {vysl.length ? vysl.map((p) => (
          <button key={p.id} type="button" role="option" aria-selected={false} onClick={() => { setQ(""); if (p.onTap) p.onTap(); else onBlok(p.blok); }}
            style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", minHeight: 48, border: "none", borderRadius: 10, background: "transparent", color: INK, fontFamily: "inherit", textAlign: "left", cursor: "pointer" }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: ".08em", color: INK3 }}>{p.druh}</span>
            <b style={{ fontSize: 16 }}>{p.t}</b>
          </button>))
          : <span style={{ display: "block", padding: "12px", fontSize: 15, color: INK3 }}>Nič sa nenašlo.</span>}
      </div>}
    </div>);
}

// ---------- pravá lišta ----------
/** klikacia lišta blokov a rokov; aktívny bod sa rozsvieti podľa toho, ktorý blok je na obrazovke */
export function KronikaLista({ bloky, fab }: { bloky: { id: string; t: string }[]; /** zelené + (68 px) vpravo dole v lište */ fab?: ReactNode }) {
  const [akt, setAkt] = useState(bloky[0]?.id ?? "");
  const kl = bloky.map((b) => b.id).join("|");
  const ref = useRef<Record<string, number>>({});
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = kl.split("|").map((id) => document.querySelector(`[data-blok="${id}"]`)).filter((e): e is Element => !!e);
    const io = new IntersectionObserver((en) => {
      en.forEach((e) => { const id = e.target.getAttribute("data-blok") ?? ""; ref.current[id] = e.isIntersecting ? e.intersectionRatio : 0; });
      const naj = kl.split("|").find((id) => (ref.current[id] ?? 0) > 0);
      if (naj) setAkt(naj);
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.01, 0.25] });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [kl]);
  return (
    <nav aria-label="Skok na blok" style={{ flex: "none", width: 96, borderLeft: `1px solid ${LINKA}`, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", maxHeight: "100dvh", boxSizing: "border-box", padding: "120px 0 108px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", scrollbarWidth: "none" } as CSSProperties}>
        {bloky.map((b, i) => { const on = akt === b.id; return (
          <span key={b.id} style={{ display: "contents" }}>
            {i > 0 && <span aria-hidden="true" style={{ flex: "none", width: 2, height: 22, background: LINKA }} />}
            <button type="button" aria-current={on ? "location" : undefined} onClick={() => document.querySelector(`[data-blok="${b.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              style={{ flex: "none", minHeight: 44, width: 92, padding: "4px 2px", border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", fontFamily: "inherit", color: on ? INK : INK3 }}>
              <span aria-hidden="true" style={{ width: on ? 20 : 16, height: on ? 20 : 16, borderRadius: "50%", boxSizing: "border-box", border: "2px solid var(--kr-plna)", background: on ? "var(--kr-plna)" : "transparent", transition: "transform .2s" }} />
              <span style={{ fontSize: /^\d{4}$/.test(b.t) ? 14.5 : 12.5, fontWeight: on || /^\d{4}$/.test(b.t) ? 800 : 600, lineHeight: 1.15, textAlign: "center" }}>{b.t}</span>
            </button>
          </span>); })}
      </div>
      {fab && <div style={{ position: "sticky", bottom: 20, display: "flex", justifyContent: "center", marginTop: -88 }}>{fab}</div>}
    </nav>);
}
