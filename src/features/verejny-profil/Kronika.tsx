// OPRAVY 139 · Kronika v6 (charita) 1 : 1 podľa „Verejny profil charity v6 Kronika PC tablet mobil" — nahrádza v3/v5.
// PC (≥ 1200): ľavé menu appky · vizitka 420 px (titulka, logo + štít, meno, TIPY NA PRAVIDELNÝ DAR = 4 dlaždice,
//   pod nimi zbalený platobný modul) · kronika (lepkavé hľadanie a filtre, Aktuálne + karta Naživo, roky) · pás rokov 84 px.
// Tablet (760–1199): jeden stĺpec, titulka 260, logo + meno + štít v riadku, Naživo + Od začiatku v jednej karte,
//   dlaždice 4 v rade, modul max 560 px v strede, lepkavá lišta (hľadanie, filtre, rady rokov), dolná lišta appky.
// Mobil (< 760): titulka 200, Naživo zbalené na 1 riadok, dlaždice 2 × 2, lepkavá lišta, Aktuálne, roky.
// Štítky, štít a overenie sú v okne štítu (bod 137). Rozbalený je len aktuálny rok. Z ISKIER: Iskry / Zbierky.
// Zbaliť aj Späť z detailu, Iskier či hárku vráti na to isté miesto (pamäť posunu na úrovni stránky).
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { eur, pct, tvar, vLokalite, type Lokalita, type TestProfil, type TestZbierka } from "@/lib/testProfily";
import { ISKRY_CFG, iskraViditelna, iskryVsetky, useZmenyIskier, zbierkaIskry, type Iskra } from "@/lib/iskry";
import { otvorIskry } from "@/features/iskry/otvor";
import { DOK, LokalitaPrepinac, MESIACE, PlagatPrace, PrepinacPodania, klikKarta, PribehText, StitCare, StitOkno, kovText, nazovStitu, norm, useDomaceMesto, useMobil } from "./casti";
import { PodporaProfilu } from "./PodporaProfilu";

type Typ = "zb" | "sk" | "is" | "oz" | "pr";
type Rez = "pc" | "tab" | "mob";
const FILTRE: [string, Typ | null][] = [["Všetko", null], ["Zbierky", "zb"], ["Skutky", "sk"], ["Iskry", "is"], ["Oznamy", "oz"], ["Práca", "pr"]];
const GRAD = "linear-gradient(135deg,#4B7A35,#6E9F4E)";
const PRUH = "linear-gradient(90deg,#4B7A35,#8DB866)";
const ZLATA = "#F6C453";
const bg = (f: string) => `url('${f}') center/cover no-repeat #3a3530`;
const dokladov = (n: number) => tvar(n, ["DOKLAD", "DOKLADY", "DOKLADOV"]);
const poradieDatumu = (m: string, d: string) => MESIACE.indexOf(m) * 100 + (parseInt(d, 10) || 0);
const TAB = "(min-width: 760px) and (max-width: 1199px)";

/** záznam časovej osi kroniky */
interface Pol { id: string; typ: "zb" | "sk" | "is" | "oz"; d: string; m: string; rok: number; nazov: string; s: string; q?: string; dok?: string; foto: string; zbierka?: TestZbierka }
/** oznam alebo ponuka práce v „Aktuálne" */
interface Ozn { id: string; typ: "oz" | "pr"; den: string; mes: string; dBg: string; st: string; stc: string; n: string; s: string; btn: string; pocet: string }

/** pamäť stránky: kam bol človek posunutý a čo mal rozbalené (Späť z detailu / Iskier vráti presne sem) */
const PAMAT = new Map<string, { a: number; m: number; otv: Record<string, boolean>; f: number; q: string; isk: number; zivo: boolean }>();

function useTablet() {
  const [t, setT] = useState(() => typeof window !== "undefined" && window.matchMedia(TAB).matches);
  useEffect(() => { const q = window.matchMedia(TAB), f = () => setT(q.matches); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return t;
}

export function Kronika({ profil, onDetail, onBack, prepinac }: { profil: TestProfil; onDetail: (z: TestZbierka) => void; onBack: () => void; /** KARTA 45: testovací prepínač podania */ prepinac?: ReactNode }) {
  useZmenyIskier();
  const mobil = useMobil();
  const tablet = useTablet();
  const rez: Rez = mobil ? "mob" : tablet ? "tab" : "pc";
  const domace = useDomaceMesto(profil);
  const p0 = PAMAT.get(profil.k);
  const [lok, setLok] = useState<Lokalita>(domace);
  const [q, setQ] = useState(p0?.q ?? "");
  const [f, setF] = useState(p0?.f ?? 0);
  const [akt, setAkt] = useState("akt");
  const [stitOtv, setStitOtv] = useState(false);
  const [live, setLive] = useState(0);
  const [liveOp, setLiveOp] = useState(1);
  const [zivo, setZivo] = useState(p0?.zivo ?? false);
  const [isk, setIsk] = useState(p0?.isk ?? 0);
  const rokyData = profil.roky ?? [];
  const [otv, setOtv] = useState<Record<string, boolean>>(p0?.otv ?? (rokyData[0] ? { [String(rokyData[0].rok)]: true } : {}));
  const aRef = useRef<HTMLElement | null>(null);       // PC: vizitka (vlastný posun)
  const scRef = useRef<HTMLDivElement | null>(null);   // PC: kronika · tablet / mobil: celá stránka
  const barRef = useRef<HTMLDivElement | null>(null);
  const rf = useRef<Record<string, HTMLElement | null>>({});
  const stit = profil.stit.toLowerCase();

  // ---- pamäť posunu: obnov po návrate (detail zbierky), ukladaj pri posune ----
  const uloz = () => PAMAT.set(profil.k, { a: aRef.current?.scrollTop ?? 0, m: scRef.current?.scrollTop ?? 0, otv, f, q, isk, zivo });
  useLayoutEffect(() => {
    const p = PAMAT.get(profil.k); if (!p) return;
    if (aRef.current) aRef.current.scrollTop = p.a;
    if (scRef.current) scRef.current.scrollTop = p.m;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { uloz(); }); // stav (rozbalené roky, filter…) sa pamätá vždy
  const spat = () => { PAMAT.delete(profil.k); onBack(); };
  const detail = (z: TestZbierka) => { uloz(); onDetail(z); };

  // ---- dáta podľa mesta ----
  const sk = lok === "Celé Slovensko";
  const zbierky = vLokalite(profil.zbierky, lok, domace);
  const bezice = zbierky.filter((z) => z.stav !== "ukoncena");
  const oznamy = vLokalite(profil.oznamy, lok, domace);
  // KARTA 45: „Hľadáme ľudí" = plagát pri module (nie oznam), ukazujú sa všetky ponuky
  const praca = profil.praca;
  const darcovia = sk ? profil.darcovia : profil.darcovia.filter((d) => d.mesto === lok);
  const dnes = darcovia.reduce((s, d) => s + (d.suma ?? 0), 0);

  // Naživo: posledný dar sa strieda každých 5 s (prechod cez opacity)
  useEffect(() => {
    let t2: number | undefined;
    const t = window.setInterval(() => { setLiveOp(0); t2 = window.setTimeout(() => { setLive((x) => x + 1); setLiveOp(1); }, 320); }, 5000);
    return () => { window.clearInterval(t); window.clearTimeout(t2); };
  }, []);
  const ld = darcovia.length ? darcovia[live % darcovia.length] : null;

  // ---- filter a hľadanie naprieč všetkými rokmi ----
  const qn = norm(q).trim();
  const ok = (typ: Typ, txt: string, rok: string) => (f === 0 || FILTRE[f][1] === typ) && (!qn || norm(txt).includes(qn) || qn === rok);
  const hlada = !!qn || f !== 0;

  const aktZb = bezice.filter((z) => ok("zb", `${z.nazov} ${z.popis}`, "akt"));
  const velka = aktZb[0];
  const male = aktZb.slice(1);
  const aktOz: Ozn[] = [
    ...oznamy.map((o): Ozn & { k: number } => ({
      id: o.id, typ: "oz", den: o.den, mes: o.mesiac, k: poradieDatumu(o.mesiac, o.den),
      dBg: o.druh === "vyzva" ? "#8E3B2F" : o.druh === "akcia" ? "#2F5E3A" : "#876712",
      st: o.stitok, stc: o.druh === "vyzva" ? "var(--red)" : o.druh === "akcia" ? "var(--green)" : "var(--gold)",
      n: o.nadpis, s: o.text, btn: o.tlacidlo, pocet: o.pod,
    })),
  ].sort((a, b) => a.k - b.k).filter((o) => ok(o.typ, `${o.n} ${o.s} ${o.st}`, "akt"));

  // ---- časová os: skutky a ukončené zbierky s dátumom + história kroniky ----
  const vsetkyPol: Pol[] = [
    ...vLokalite(profil.skutky, lok, domace).filter((s) => s.rok).map((s): Pol => ({ id: s.id, typ: "sk", d: s.d!, m: s.m!, rok: s.rok!, nazov: s.nazov, s: `${s.popis}${s.dobrovolnici ? ` · ${s.dobrovolnici} dobrovoľníkov` : ""}`, foto: s.foto })),
    ...zbierky.filter((z) => z.stav === "ukoncena" && z.rok).map((z): Pol => ({ id: z.id, typ: "zb", d: z.d!, m: z.m!, rok: z.rok!, nazov: z.nazov, s: `${eur(z.vyzbierane)} · od ${z.ludia} darcov`, q: z.spravaDarcom, dok: z.doklady ? dokladov(z.doklady) : undefined, foto: z.foto, zbierka: z })),
    ...vLokalite(profil.kronika ?? [], lok, domace).map((k): Pol => ({ ...k })),
  ].sort((a, b) => b.rok - a.rok || poradieDatumu(b.m, b.d) - poradieDatumu(a.m, a.d));
  const roky = rokyData.length ? rokyData : [...new Set(vsetkyPol.map((p) => p.rok))].sort((a, b) => b - a).map((rok) => ({ rok, nZaz: 0, sum: [] as [string, string][] }));
  const kapitoly = roky.map((r, i) => {
    const t = String(r.rok);
    const vid = vsetkyPol.filter((p) => p.rok === r.rok && ok(p.typ, `${p.nazov} ${p.s} ${p.q ?? ""}`, t));
    const exp = !!otv[t] || (hlada && vid.length > 0);
    return { ...r, t, vid, exp, prvy: i === 0 };
  });
  const KL = ["akt", ...kapitoly.map((k) => k.t)];
  const ai = KL.indexOf(akt);

  // ---- Z ISKIER: Iskry stránky (mimo Zbierok) / Zbierky (výzvy a ďakujeme) ----
  const mojeIskry = iskryVsetky().filter((v) => v.autor === profil.meno && iskraViditelna(v));
  const iskryCesty: Iskra[][] = [mojeIskry.filter((v) => v.druh !== ISKRY_CFG.druhZbierky), mojeIskry.filter((v) => v.druh === ISKRY_CFG.druhZbierky)];
  const iskryTu = iskryCesty[isk];

  // ---- posun: pás rokov svieti podľa polohy, ťuk skočí na rok a rozbalí ho ----
  const onSc = () => {
    const c = scRef.current; if (!c) return;
    const bar = barRef.current?.offsetHeight ?? 0;
    let a = "akt";
    for (const k of KL) { const el = rf.current[k]; if (el && odhore(el, c) - bar - 60 <= c.scrollTop) a = k; }
    if (a !== akt) setAkt(a);
    uloz();
  };
  const odhore = (el: HTMLElement, box: HTMLElement) => el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  const skoc = (k: string) => {
    setAkt(k);
    if (k !== "akt") setOtv((o) => ({ ...o, [k]: true }));
    requestAnimationFrame(() => {
      const c = scRef.current, el = rf.current[k]; if (!c || !el) return;
      const bar = rez === "pc" ? (barRef.current?.offsetHeight ?? 0) : (barRef.current?.offsetHeight ?? 0);
      c.scrollTo({ top: Math.max(0, odhore(el, c) - bar - 12), behavior: "smooth" });
    });
  };
  // ================= časti =================
  const tlTmave: CSSProperties = { height: 44, border: "none", borderRadius: 14, background: "rgba(10,8,5,.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" };
  const hornaLista = (
    <div style={{ position: "absolute", left: rez === "tab" ? 24 : rez === "mob" ? 12 : 16, right: rez === "tab" ? 24 : rez === "mob" ? 12 : 16, top: rez === "tab" ? 28 : rez === "mob" ? "max(12px, env(safe-area-inset-top))" : 16, display: "flex", alignItems: "center", gap: rez === "tab" ? 10 : 8 }}>
      {rez === "mob"
        ? <button type="button" onClick={spat} aria-label="Späť" style={{ ...tlTmave, width: 44 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>
        : <button type="button" onClick={spat} aria-label="Späť" style={{ ...tlTmave, padding: "0 14px 0 8px", gap: 4, fontSize: 14, fontWeight: 800, color: "#fff" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>Späť</button>}
      <LokalitaPrepinac lok={lok} onLok={setLok} domace={domace} sidlo={profil.mesto} tmavy />
      <span style={{ flex: 1 }} />
      <button type="button" aria-label="Zdieľať · QR" style={{ ...tlTmave, width: 44 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8h16v-8M16 6l-4-4-4 4M12 2v14" /></svg>
      </button>
    </div>
  );
  const titulka = (h: number) => (
    <div style={{ position: "relative", flex: "none", height: h, background: bg(profil.titulka) }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,8,5,.5) 0%,rgba(10,8,5,0) 45%,rgba(10,8,5,.35) 100%)" }} />
      {hornaLista}
    </div>
  );
  const kovCiara = <span style={{ display: "block", flex: "none", height: "var(--mH)", background: "var(--metal)" }} />;
  const logo = (s: number, r: number, fs: number, okraj: string) => <span style={{ flex: "none", width: s, height: s, borderRadius: r, background: "#fff", border: `3px solid ${okraj}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, fontWeight: 800, color: "#3F6E2A", boxShadow: rez === "mob" ? "0 8px 20px rgba(0,0,0,.3)" : "0 8px 24px rgba(0,0,0,.3)" }}>{profil.iniciala}</span>;
  const stitTlacidlo = (w: number, h: number, sw: number, sh: number, style?: CSSProperties) => (
    <button type="button" onClick={() => setStitOtv(true)} aria-label={`Štít DEED+ CARE · ${nazovStitu(profil.stit)} · podrobnosti a overenie`}
      style={{ position: "relative", width: w, height: h, padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", ...style }}>
      <span style={{ position: "absolute", inset: -6, borderRadius: "50%", background: "radial-gradient(circle,var(--kov2) 0%,rgba(0,0,0,0) 62%)", opacity: 0.5 }} />
      <StitCare stit={profil.stit} w={sw} h={sh} lesk />
    </button>
  );
  const bodka = <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)", animation: "vpPulz 1.6s ease infinite", flex: "none" }} />;
  const dnesText = <b style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>Dnes {eur(dnes)} od {tvar(darcovia.length, ["človeka", "ľudí", "ľudí"])}</b>;
  const liveRiadok = ld && (
    <span aria-live="polite" style={{ display: "flex", alignItems: "baseline", gap: 8, opacity: liveOp, transition: "opacity .3s", minWidth: 0 }}>
      {ld.suma != null && <b style={{ flex: "none", fontSize: 14, color: "var(--gInk)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>+{eur(ld.suma)}</b>}
      <span style={{ flex: "none", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{ld.meno}</span>
      <span style={{ fontSize: 13, color: "var(--ink3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ld.naCo} · {ld.pred}</span>
    </span>
  );
  const celkom = (fs: number) => (
    <span style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      {profil.cisla.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: fs, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: 12, color: "var(--ink3)" }}>{t}</span></span>)}
    </span>
  );
  const odZacT = <b style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--acc)" }}>OD ZAČIATKU · {profil.odRoku}</b>;
  // Naživo + Od začiatku = jedna karta (PC v riadku nadpisu Aktuálne, tablet vedľa seba, mobil zbalená)
  const nazivoPc = (
    <div style={{ width: 440, maxWidth: "100%", borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{bodka}<b style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--green)" }}>NAŽIVO</b><span style={{ flex: 1 }} />{dnesText}</span>
      {liveRiadok}
      <span style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--cardBd)", paddingTop: 8, fontSize: 13, color: "var(--ink3)" }}>
        <b style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--acc)", paddingRight: 4 }}>OD ZAČIATKU · {profil.odRoku}</b>
        {profil.cisla.map(([v, t], i) => <span key={t} style={{ display: "contents" }}><b style={{ color: "var(--ink)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{v}</b>{t}{i < profil.cisla.length - 1 ? " ·" : ""}</span>)}
      </span>
    </div>
  );
  const nazivoTab = (
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "12px 16px", display: "grid", gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)", gap: 16, alignItems: "center" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{bodka}<b style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--green)" }}>NAŽIVO</b><span style={{ flex: 1 }} />{dnesText}</span>
        {liveRiadok}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4, borderLeft: "1px solid var(--cardBd)", paddingLeft: 16 }}>{odZacT}{celkom(16)}</span>
    </div>
  );
  const nazivoMob = (
    <div style={{ borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)", padding: "0 14px", display: "flex", flexDirection: "column", gap: 8 }}>
      <button type="button" onClick={() => setZivo((x) => !x)} aria-expanded={zivo} style={{ minHeight: 48, padding: 0, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
        {bodka}<b style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--green)" }}>NAŽIVO</b><span style={{ flex: 1 }} />{dnesText}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: `rotate(${zivo ? 180 : 0}deg)`, transition: "transform .25s ease", flex: "none" }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {zivo && <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 12 }}>
        {liveRiadok}
        <span style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--cardBd)", paddingTop: 8 }}>{odZacT}{celkom(17)}</span>
      </div>}
    </div>
  );

  const podpora = <><PodporaProfilu profil={profil} lok={lok} domace={domace} rez={rez} /><PlagatPrace praca={praca} zbaleny={rez !== "pc"} /></>;

  // ---- lepkavá lišta: hľadanie + filtre (+ tablet / mobil rady rokov) ----
  const lista = (
    <div ref={barRef} style={rez === "pc"
      ? { position: "sticky", top: 0, zIndex: 6, background: "var(--bg)", borderBottom: "1px solid var(--cardBd)", padding: "14px 32px", display: "flex", flexDirection: "column", gap: 10 }
      : { position: "sticky", top: 0, zIndex: 6, background: "var(--bg)", borderTop: "1px solid var(--cardBd)", borderBottom: "1px solid var(--cardBd)", padding: rez === "tab" ? "12px 28px" : "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ position: "relative", display: "block" }}>
        <svg width={rez === "pc" ? 18 : 17} height={rez === "pc" ? 18 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ position: "absolute", left: rez === "pc" ? 14 : 13, top: rez === "mob" ? 13 : 14, color: "var(--ink3)" }}><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={rez === "mob" ? "Hľadať: zbierka, skutok, rok" : "Hľadať v kronike: zbierka, skutok, rok"} aria-label="Hľadať v kronike"
          style={{ width: "100%", height: rez === "mob" ? 44 : 46, padding: rez === "pc" ? "0 44px" : "0 44px 0 40px", borderRadius: 14, border: "1px solid var(--cardBd)", background: "var(--field)", fontFamily: "inherit", fontSize: 15, color: "var(--ink)", outline: "none" }} />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Vymazať" style={{ position: "absolute", right: 1, top: 0, width: 44, height: 44, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: "var(--btn)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
        </button>}
      </span>
      <div style={{ display: "flex", gap: 6, flexWrap: rez === "mob" ? "nowrap" : "wrap", overflowX: rez === "mob" ? "auto" : undefined, margin: rez === "mob" ? "0 -16px" : undefined, padding: rez === "mob" ? "0 16px" : undefined }}>
        {FILTRE.map(([t], i) => {
          const on = f === i;
          return <button key={t} type="button" aria-pressed={on} onClick={() => setF(i)} style={{ flex: "none", minHeight: 44, padding: "4px 0", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", margin: "-4px 0" }}>
            <span style={{ height: 36, padding: "0 14px", borderRadius: 18, border: `1px solid ${on ? "var(--ink)" : "var(--cardBd)"}`, background: on ? "var(--ink)" : "transparent", display: "flex", alignItems: "center", whiteSpace: "nowrap", fontSize: 13.5, fontWeight: 800, color: on ? "var(--bg)" : "var(--ink2)" }}>{t}</span>
          </button>;
        })}
      </div>
      {rez !== "pc" && <div role="navigation" aria-label="Roky kroniky" style={{ display: "flex", gap: 4, overflowX: "auto", margin: rez === "mob" ? "0 -16px" : undefined, padding: rez === "mob" ? "0 16px" : undefined }}>
        {KL.map((k, i) => {
          const on = akt === k;
          return <button key={k} type="button" aria-current={on ? "true" : undefined} onClick={() => skoc(k)} style={{ flex: "none", minHeight: 44, padding: rez === "tab" ? "0 14px" : "0 12px", border: "none", borderBottom: `2.5px solid ${on ? "var(--acc)" : "transparent"}`, background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: rez === "tab" ? 14.5 : 14, fontWeight: on ? 800 : 600, color: on ? "var(--ink)" : "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{i ? k : "Aktuálne"}</button>;
        })}
      </div>}
    </div>
  );

  // ---- Aktuálne ----
  const stZb = (z: TestZbierka) => [z.mesto.toLocaleUpperCase("sk-SK"), z.stav === "dlhodoba" ? "DLHODOBÁ" : z.cast ? z.cast.toLocaleUpperCase("sk-SK") : z.konciDni != null ? `KONČÍ O ${tvar(z.konciDni, ["DEŇ", "DNI", "DNÍ"])}` : null].filter(Boolean).join(" · ");
  const velkaKarta = velka && (rez === "mob" ? (
    <article {...klikKarta(() => detail(velka), velka.nazov)} style={{ borderRadius: 22, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer" }}>
      <span style={{ position: "relative", display: "block", height: 190, background: bg(velka.foto) }}>
        {velka.konciDni != null && <span style={{ position: "absolute", left: 12, top: 12, height: 28, padding: "0 11px", borderRadius: 14, background: "#8E3B2F", color: "#fff", fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center" }}>KONČÍ O {tvar(velka.konciDni, ["DEŇ", "DNI", "DNÍ"])}</span>}
      </span>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{stZb(velka)}</span>
        <b style={{ fontSize: 20, lineHeight: 1.2 }}>{velka.nazov}</b>
        {velka.ciel != null && <span style={{ display: "block", height: 8, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(velka.vyzbierane, velka.ciel) / 100})` }} /></span>}
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><b style={{ fontSize: 19 }}>{eur(velka.vyzbierane)}</b><span style={{ fontSize: 13.5, color: "var(--ink3)" }}>{velka.ciel ? `z ${eur(velka.ciel)} · ` : ""}{velka.ludia} ľudí</span></span>
        {velka.dorovnanie && <span style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>{velka.dorovnanie}</span>}
      </div>
    </article>
  ) : (
    <article {...klikKarta(() => detail(velka), velka.nazov)} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", borderRadius: 24, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer" }}>
      <span style={{ position: "relative", minHeight: rez === "tab" ? 280 : 290, background: bg(velka.foto) }}>
        {velka.konciDni != null && <span style={{ position: "absolute", left: rez === "tab" ? 12 : 14, top: rez === "tab" ? 12 : 14, height: rez === "tab" ? 28 : 30, padding: rez === "tab" ? "0 11px" : "0 12px", borderRadius: 15, background: "#8E3B2F", color: "#fff", fontSize: rez === "tab" ? 11.5 : 12, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>KONČÍ O {tvar(velka.konciDni, ["DEŇ", "DNI", "DNÍ"])}</span>}
      </span>
      <div style={{ padding: rez === "tab" ? "18px 20px" : "22px 24px", display: "flex", flexDirection: "column", gap: rez === "tab" ? 9 : 11 }}>
        <span style={{ fontSize: rez === "tab" ? 11 : 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{stZb(velka)}</span>
        <b style={{ fontSize: rez === "tab" ? 21 : 23, lineHeight: 1.2 }}>{velka.nazov}</b>
        {velka.pribeh ? <PribehText text={velka.pribeh} /> : <span style={{ fontSize: rez === "tab" ? 14 : 14.5, lineHeight: rez === "tab" ? 1.5 : 1.55, color: "var(--ink2)" }}>{velka.popis}</span>}
        {velka.ciel != null && <span style={{ display: "block", height: rez === "tab" ? 8 : 9, borderRadius: 5, background: "var(--track)", overflow: "hidden", marginTop: rez === "tab" ? 0 : 2 }}><span style={{ display: "block", width: "100%", height: "100%", borderRadius: 5, background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(velka.vyzbierane, velka.ciel) / 100})` }} /></span>}
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><b style={{ fontSize: rez === "tab" ? 19 : 21 }}>{eur(velka.vyzbierane)}</b><span style={{ fontSize: rez === "tab" ? 13.5 : 14, color: "var(--ink3)" }}>{velka.ciel ? `z ${eur(velka.ciel)} · ` : ""}{velka.ludia} ľudí</span></span>
        {velka.dorovnanie && <span style={{ fontSize: rez === "tab" ? 13 : 13.5, color: "var(--gold)", fontWeight: 700 }}>{velka.dorovnanie}</span>}
      </div>
    </article>
  ));
  const maleKarty = male.length > 0 && (
    <div style={{ display: rez === "mob" ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: rez === "pc" ? 16 : 12 }}>
      {male.map((z) => {
        const t = rez === "pc" ? 96 : rez === "tab" ? 84 : 76;
        return (
          <button key={z.id} type="button" onClick={() => detail(z)} style={{ display: "flex", gap: rez === "pc" ? 14 : 12, alignItems: "center", padding: rez === "pc" ? 12 : 10, borderRadius: rez === "pc" ? 20 : 18, background: "var(--card)", border: "1px solid var(--cardBd)", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
            <span style={{ flex: "none", width: t, height: t, borderRadius: rez === "pc" ? 16 : 14, background: bg(z.foto) }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: rez === "pc" ? 7 : 5 }}>
              <span style={{ fontSize: rez === "pc" ? 11 : 10.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)" }}>{stZb(z)}</span>
              <b style={{ fontSize: rez === "pc" ? 16 : 15, lineHeight: rez === "pc" ? 1.3 : 1.25 }}>{z.nazov}</b>
              {z.ciel != null && <span style={{ display: "block", height: rez === "pc" ? 6 : 5, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}><span style={{ display: "block", width: "100%", height: "100%", background: PRUH, transformOrigin: "0 50%", transform: `scaleX(${pct(z.vyzbierane, z.ciel) / 100})` }} /></span>}
              <span style={{ fontSize: rez === "pc" ? 13 : 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}><b style={{ color: "var(--ink)", fontSize: rez === "pc" ? 14.5 : 14 }}>{eur(z.vyzbierane)}</b> {z.ciel ? `z ${eur(z.ciel)}` : `od ${z.ludia} ľudí`}</span>
            </span>
          </button>);
      })}
    </div>
  );
  // Z ISKIER — prepínač 2 ciest a vodorovný rad videí 9 : 16
  const vw = rez === "pc" ? [140, 248, 112] : rez === "tab" ? [132, 234, 106] : [116, 206, 93];
  const kartaIskry = (v: Iskra) => {
    const d = zbierkaIskry(v);
    const nazov = d && v.zb?.typ !== "firme" ? d.z.nazov : v.zb?.typ === "firme" && d?.firma ? `${d.firma.meno.replace(/\s+s\.\s?r\.\s?o\.$/, "")} pomohla` : v.popis.split(/(?<=\.)\s/)[0];
    const m = !v.zb ? `${v.iskry.toLocaleString("sk-SK")} iskier`
      : v.zb.typ === "dakujeme" && d ? (d.z.doklady ? `doložené · ${tvar(d.z.doklady, ["doklad", "doklady", "dokladov"])}` : `doložené · ${eur(d.z.vyzbierane)}`)
      : v.zb.typ === "firme" ? `dorovnanie · ${d?.z.nazov ?? ""}`
      : d ? (d.z.ciel ? `${eur(d.z.vyzbierane)} z ${eur(d.z.ciel)}` : eur(d.z.vyzbierane)) : "";
    const st = v.zb ? v.zb.stitok.toLocaleUpperCase("sk-SK") : (ISKRY_CFG.druhy[v.druh] ?? "").toLocaleUpperCase("sk-SK");
    const sBg = !v.zb ? "rgba(0,0,0,.55)" : v.zb.typ !== "vyzva" ? ZLATA : v.zb.stitok === "Priebeh" ? "#fff" : "#4B7A35";
    const sC = !v.zb ? "#fff" : v.zb.typ === "vyzva" && v.zb.stitok !== "Priebeh" ? "#fff" : "#1D211B";
    return (
      <button key={v.id} type="button" onClick={() => otvorIskry(v.id)} aria-label={`Iskra: ${nazov}`} style={{ position: "relative", flex: "none", width: vw[0], height: vw[1], borderRadius: 18, overflow: "hidden", background: v.bg, cursor: "pointer", border: "none", padding: 0, textAlign: "left" }}>
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 50%,rgba(0,0,0,.85) 100%)" }} />
        <span style={{ position: "absolute", left: 8, top: 8, height: 24, padding: "0 9px", borderRadius: 12, background: sBg, color: sC, fontSize: 10.5, fontWeight: 800, letterSpacing: ".05em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{st}</span>
        <span style={{ position: "absolute", left: "50%", top: "42%", width: 40, height: 40, margin: "-20px 0 0 -20px", borderRadius: "50%", background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
        <span style={{ position: "absolute", left: 10, right: 10, bottom: 10, display: "flex", flexDirection: "column", gap: 2, color: "#fff" }}>
          <b style={{ fontSize: 13.5, lineHeight: 1.25 }}>{nazov}</b>
          <span style={{ fontSize: 11.5, opacity: 0.85, fontVariantNumeric: "tabular-nums" }}>{m}</span>
        </span>
      </button>);
  };
  const zIskier = (iskryCesty[0].length + iskryCesty[1].length) > 0 && (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)" }}>Z ISKIER</span>
      <div role="tablist" aria-label="Iskry" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 4, borderRadius: 16, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        {([["Iskry", "skutky · talenty · rady"], ["Zbierky", "výzvy · ďakujeme"]] as const).map(([t, s], i) => {
          const on = isk === i;
          return <button key={t} type="button" role="tab" aria-selected={on} onClick={() => setIsk(i)} style={{ minHeight: 48, padding: "6px 10px", border: "none", borderRadius: 12, background: on ? "var(--ink)" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, color: on ? "var(--bg)" : "var(--ink2)" }}>
            <b style={{ fontSize: rez === "pc" ? 14.5 : rez === "tab" ? 14 : 13.5 }}>{t}</b><span style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.85 }}>{s}</span></button>;
        })}
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {iskryTu.map(kartaIskry)}
        {iskryTu.length > 0 && <button type="button" onClick={() => otvorIskry(iskryTu[0].id)} style={{ flex: "none", width: vw[2], height: vw[1], borderRadius: 18, border: "1.5px dashed var(--cardBd)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 10, fontSize: 13.5, fontWeight: 800, color: "var(--green)", cursor: "pointer" }}>
          {isk ? "Všetky videá k zbierkam ›" : `Všetky Iskry ${profil.menoGen ?? profil.meno} ›`}</button>}
        {!iskryTu.length && <span style={{ fontSize: 14, color: "var(--ink3)", padding: "6px 2px" }}>{isk ? "Zatiaľ tu nie je žiadne video k zbierkam." : "Zatiaľ tu nie je žiadna Iskra."}</span>}
      </div>
    </div>
  );
  const oznamyBlok = aktOz.length > 0 && <>
    <span style={{ fontSize: rez === "mob" ? 11.5 : 12, fontWeight: 800, letterSpacing: ".1em", color: "var(--acc)", paddingTop: rez === "pc" ? 8 : 6 }}>OZNAMY</span>
    <div style={{ display: rez === "mob" ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: rez === "pc" ? 14 : 12 }}>
      {aktOz.map((o) => {
        const [dw, dh, df] = rez === "pc" ? [68, 78, 28] : rez === "tab" ? [58, 68, 24] : [54, 62, 22];
        const tlac = <button type="button" style={{ alignSelf: "flex-start", marginTop: rez === "pc" ? 0 : 4, minHeight: 44, padding: rez === "pc" ? "0 16px" : "0 14px", borderRadius: 12, border: "1.5px solid var(--green)", background: "transparent", cursor: "pointer", whiteSpace: "nowrap", fontSize: rez === "pc" ? 13.5 : 13, fontWeight: 800, color: "var(--green)" }}>{o.btn}</button>;
        return (
          <article key={o.id} style={{ display: "flex", gap: rez === "pc" ? 16 : 12, padding: rez === "pc" ? 18 : rez === "tab" ? 14 : 12, borderRadius: rez === "pc" ? 22 : rez === "tab" ? 20 : 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
            <span style={{ flex: "none", width: dw, height: dh, borderRadius: rez === "pc" ? 16 : 14, background: o.dBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <b style={{ fontSize: df, lineHeight: 1 }}>{o.den}</b><span style={{ fontSize: rez === "pc" ? 12 : 11, fontWeight: 800, letterSpacing: ".06em" }}>{o.mes}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: rez === "pc" ? 5 : rez === "tab" ? 4 : 3 }}>
              <span style={{ fontSize: rez === "pc" ? 11 : 10.5, fontWeight: 800, letterSpacing: ".06em", color: o.stc }}>{o.st}</span>
              <b style={{ fontSize: rez === "pc" ? 16.5 : 15, lineHeight: 1.25 }}>{o.n}</b>
              <span style={{ fontSize: rez === "pc" ? 13 : 12.5, lineHeight: 1.4, color: "var(--ink3)" }}>{o.s}</span>
              {rez === "pc"
                ? <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", paddingTop: 6 }}>{tlac}<span style={{ fontSize: 12.5, color: "var(--ink3)" }}>{o.pocet}</span></span>
                : tlac}
            </span>
          </article>);
      })}
    </div>
  </>;
  const pocty = `${tvar(bezice.length, ["zbierka", "zbierky", "zbierok"])} · ${tvar(oznamy.length, ["oznam", "oznamy", "oznamov"])}${praca.length ? ` · hľadáme ${tvar(praca.length, ["človeka", "ľudí", "ľudí"])}` : ""}`;
  const aktualne = (
    <section ref={(el) => { rf.current.akt = el; }} style={{ display: "flex", flexDirection: "column", gap: rez === "pc" ? 18 : rez === "tab" ? 16 : 12 }}>
      {rez === "pc"
        ? <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 6 }}><b style={{ fontSize: 64, lineHeight: 1, letterSpacing: "-.02em", ...kovText }}>Aktuálne</b><span style={{ fontSize: 15, color: "var(--ink2)", whiteSpace: "nowrap" }}>{pocty}</span></span>
            <span style={{ flex: 1 }} />
            {nazivoPc}
          </div>
        : <span style={{ display: "flex", alignItems: "baseline", gap: rez === "tab" ? 14 : 10, flexWrap: "wrap" }}><b style={{ fontSize: rez === "tab" ? 52 : 40, lineHeight: 1, letterSpacing: "-.02em", ...kovText }}>Aktuálne</b><span style={{ fontSize: rez === "tab" ? 14 : 13, color: rez === "tab" ? "var(--ink2)" : "var(--ink3)" }}>{pocty}</span></span>}
      {velkaKarta}
      {maleKarty}
      {zIskier}
      {oznamyBlok}
      {!velka && !aktOz.length && hlada && <span style={{ fontSize: 15, color: "var(--ink3)" }}>Aktuálne tu nič také nie je. Pozri nižšie do rokov.</span>}
    </section>
  );

  // ---- roky (rozbalený len aktuálny, staršie ťukom) ----
  const polozka = (p: Pol): ReactNode => {
    const stavBg = p.q ? "#2F5E3A" : "var(--btn)", stavC = p.q ? "#fff" : "var(--ink2)";
    const stav = p.q ? `DOLOŽENÉ · ${p.dok ?? ""}`.replace(/ · $/, "") : p.dok;
    const link = p.q ? "Správa a doklady ›" : "Priebežné doklady ›";
    const chip = p.typ === "zb" ? (p.q ? "UKONČENÁ · DOLOŽENÉ" : "UKONČENÁ · SPRÁVA SA PÍŠE") : p.typ === "is" ? "ISKRA" : p.typ === "oz" ? "AKCIA" : "SKUTOK";
    const chipC = p.typ === "zb" ? (p.q ? "var(--green)" : "var(--ink3)") : p.typ === "is" ? "var(--gold)" : p.typ === "oz" ? "var(--blue)" : "var(--green)";
    const klik = p.typ === "zb" && p.zbierka ? () => detail(p.zbierka!) : undefined;
    if (rez === "mob") return (
      <button type="button" onClick={klik} style={{ width: "100%", borderRadius: 16, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", display: "flex", flexDirection: "column", padding: 0, cursor: klik ? "pointer" : "default", textAlign: "left", color: "var(--ink)" }}>
        {p.typ === "zb" && <span style={{ display: "block", width: "100%", height: 110, background: bg(p.foto) }} />}
        <span style={{ padding: "11px 12px", display: "flex", gap: 10, alignItems: "center" }}>
          {p.typ !== "zb" && <span style={{ flex: "none", width: 52, height: 52, borderRadius: 12, background: bg(p.foto) }} />}
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".06em", color: chipC }}>{chip}</span>
            <b style={{ fontSize: 14.5, lineHeight: 1.3 }}>{p.nazov}</b>
            <span style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{p.s}</span>
            {p.typ === "zb" && <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green)" }}>{link}</span>}
          </span>
        </span>
      </button>
    );
    if (p.typ === "zb") return rez === "tab" ? (
      <button type="button" onClick={klik} style={{ width: "100%", display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", borderRadius: 18, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", padding: 0, cursor: klik ? "pointer" : "default", textAlign: "left", color: "var(--ink)" }}>
        <span style={{ minHeight: 150, background: bg(p.foto) }} />
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {stav && <span style={{ height: 24, alignSelf: "flex-start", padding: "0 9px", borderRadius: 12, background: stavBg, color: stavC, fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{stav}</span>}
          <b style={{ fontSize: 17, lineHeight: 1.25 }}>{p.nazov}</b>
          <span style={{ fontSize: 13.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{p.s}</span>
          {p.q && <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink)" }}>„{p.q}“</span>}
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--green)" }}>{link}</span>
        </div>
      </button>
    ) : (
      <button type="button" onClick={klik} style={{ width: "100%", display: "grid", gridTemplateColumns: "190px minmax(0,1fr)", borderRadius: 20, overflow: "hidden", background: "var(--card)", border: "1px solid var(--cardBd)", padding: 0, cursor: klik ? "pointer" : "default", textAlign: "left", color: "var(--ink)" }}>
        <span style={{ minHeight: 170, background: bg(p.foto) }} />
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--ink3)", whiteSpace: "nowrap" }}>UKONČENÁ ZBIERKA</span>
            {stav && <span style={{ height: 26, padding: "0 10px", borderRadius: 13, background: stavBg, color: stavC, fontSize: 11, fontWeight: 800, letterSpacing: ".04em", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>{stav}</span>}
          </span>
          <b style={{ fontSize: 19, lineHeight: 1.25 }}>{p.nazov}</b>
          <span style={{ fontSize: 14, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{p.s}</span>
          {p.q && <span style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em", color: "var(--green)" }}>SPLNILI SME</span>
            <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>„{p.q}“</span>
          </span>}
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--green)" }}>{link}</span>
        </div>
      </button>
    );
    const t = rez === "tab" ? 64 : 72;
    return (
      <article style={{ display: "flex", alignItems: "center", gap: rez === "tab" ? 12 : 14, padding: rez === "tab" ? 10 : 12, borderRadius: rez === "tab" ? 16 : 18, background: "var(--card)", border: "1px solid var(--cardBd)" }}>
        <span style={{ flex: "none", width: t, height: t, borderRadius: rez === "tab" ? 12 : 14, background: bg(p.foto) }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: rez === "tab" ? 11 : 11.5, fontWeight: 800, letterSpacing: ".08em", color: chipC }}>{chip}</span>
          <b style={{ fontSize: rez === "tab" ? 15 : 16, lineHeight: 1.3 }}>{p.nazov}</b>
          <span style={{ fontSize: rez === "tab" ? 13 : 13.5, color: "var(--ink3)" }}>{p.s}</span>
        </span>
      </article>
    );
  };
  const [dSt, dGap, os, dTop, dFs, dMs] = rez === "pc" ? [52, 14, 20, 26, 20, 11.5] : rez === "tab" ? [46, 12, 18, 22, 18, 11] : [40, 8, 14, 20, 16, 10];
  const chevron = (exp: boolean) => (
    <span style={{ flex: "none", width: 44, height: 44, borderRadius: 22, border: "1px solid var(--cardBd)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: rez === "pc" ? 4 : 0 }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transform: `rotate(${exp ? 180 : 0}deg)`, transition: "transform .25s ease" }}><path d="M6 9l6 6 6-6" /></svg>
    </span>
  );
  const kapitolyEl = kapitoly.map((k) => {
    const fs = rez === "pc" ? (k.prvy ? 88 : 56) : rez === "tab" ? (k.prvy ? 72 : 48) : (k.prvy ? 52 : 38);
    const prepni = () => setOtv((o) => ({ ...o, [k.t]: !k.exp }));
    const rok = <b style={{ fontSize: fs, lineHeight: rez === "mob" ? 0.95 : 0.9, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums", ...kovText, ...(rez === "mob" ? { flex: 1 } : {}) }}>{k.t}</b>;
    return (
      <section key={k.t} ref={(el) => { rf.current[k.t] = el; }} style={{ display: "flex", flexDirection: "column", gap: rez === "pc" ? 16 : rez === "tab" ? 14 : 10 }}>
        <button type="button" onClick={prepni} aria-expanded={k.exp} style={rez === "mob"
          ? { display: "flex", flexDirection: "column", gap: 8, padding: "0 0 12px", border: "none", borderBottom: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)" }
          : { display: "flex", alignItems: "flex-end", gap: rez === "pc" ? 28 : 20, flexWrap: rez === "pc" ? "wrap" : "nowrap", padding: rez === "pc" ? "0 0 14px" : "0 0 12px", border: "none", borderBottom: "1px solid var(--cardBd)", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
          {rez === "mob" ? <>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>{rok}{chevron(k.exp)}</span>
            {k.sum.length > 0 && <span style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "6px 10px" }}>
              {k.sum.map(([v, t]) => <span key={t} style={{ fontSize: 12.5, color: "var(--ink3)" }}><b style={{ fontSize: 15, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{v}</b> {t}</span>)}
            </span>}
          </> : <>
            {rok}
            <span style={{ flex: 1, minWidth: rez === "pc" ? 360 : 0, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: rez === "pc" ? 10 : 8, paddingBottom: rez === "pc" ? 6 : 4 }}>
              {k.sum.map(([v, t]) => <span key={t} style={{ display: "flex", flexDirection: "column" }}><b style={{ fontSize: rez === "pc" ? 19 : 16, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{v}</b><span style={{ fontSize: rez === "pc" ? 12.5 : 12, color: "var(--ink3)" }}>{t}</span></span>)}
            </span>
            {chevron(k.exp)}
          </>}
        </button>
        {k.exp && <div style={{ display: "flex", flexDirection: "column" }}>
          {k.vid.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: `${dSt}px ${os}px minmax(0,1fr)`, columnGap: dGap }}>
              <span style={{ paddingTop: dTop - 6, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <b style={{ fontSize: dFs, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>{p.d}</b>
                <span style={{ fontSize: dMs, fontWeight: 800, letterSpacing: ".06em", color: "var(--ink3)" }}>{p.m}</span>
              </span>
              <span style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                <span style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: "var(--accLine)" }} />
                <span style={{ position: "relative", marginTop: dTop, width: rez === "mob" ? 10 : 12, height: rez === "mob" ? 10 : 12, borderRadius: "50%", background: "var(--bg)", border: `${rez === "mob" ? 2 : 2.5}px solid var(--acc)` }} />
              </span>
              <div style={{ padding: rez === "pc" ? "8px 0" : rez === "tab" ? "7px 0" : "6px 0", minWidth: 0 }}>{polozka(p)}</div>
            </div>
          ))}
          {!k.vid.length && <span style={{ fontSize: rez === "pc" ? 15 : 14, color: "var(--ink3)", padding: `4px 0 0 ${dSt + os + 2 * dGap}px` }}>V roku {k.t} nič také nie je.</span>}
        </div>}
      </section>
    );
  });

  const okno = stitOtv && <StitOkno p={profil} v6 mobil={rez === "mob"} onClose={() => setStitOtv(false)} />;

  // ================= MOBIL a TABLET (jeden stĺpec, celá stránka sa posúva) =================
  if (rez !== "pc") {
    const tab = rez === "tab";
    return (
      <div ref={scRef} onScroll={onSc} className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {titulka(tab ? 260 : 200)}
        {kovCiara}
        <div style={{ padding: tab ? "0 28px 22px" : "0 16px 18px", display: "flex", flexDirection: "column", gap: tab ? 16 : 12 }}>
          {tab
            && <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: -46, position: "relative" }}>
                {logo(92, 26, 30, "var(--bg)")}
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4, paddingBottom: 4 }}>
                  <b style={{ fontSize: 28, lineHeight: 1.1 }}>{profil.meno}</b>
                  <span style={{ fontSize: 14.5, lineHeight: 1.45, color: "var(--ink2)" }}>{profil.veta}</span>
                </span>
                {stitTlacidlo(100, 118, 92, 112)}
              </div>}
          {!tab && <>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -40, position: "relative" }}>
                  {logo(76, 22, 25, "var(--bg)")}
                  {stitTlacidlo(88, 104, 84, 102, { marginTop: -20 })}
                </div>
                <span style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <b style={{ fontSize: 25, lineHeight: 1.15 }}>{profil.meno}</b>
                  <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties}>{profil.veta}</span>
                </span>
              </>}
          {tab ? nazivoTab : nazivoMob}
          {podpora}
        </div>
        {lista}
        <div style={{ padding: tab ? "24px 28px 0" : "20px 16px 0", display: "flex", flexDirection: "column", gap: tab ? 40 : 30 }}>
          {aktualne}
          {kapitolyEl}
          {prepinac && <PrepinacPodania pas />}
        </div>
        <div style={{ height: DOK + 24 }} />
        {okno}
      </div>
    );
  }

  // ================= PC =================
  return (
    <div className="vp sc-tokeny" data-stit={stit} style={{ position: "relative", height: "100%", display: "flex", overflow: "hidden" }}>
      <aside ref={(el) => { aRef.current = el; }} onScroll={uloz} style={{ position: "relative", width: 420, flex: "none", overflowY: "auto", background: "var(--panel)", borderRight: "1px solid var(--accLine)", display: "flex", flexDirection: "column" }}>
        {titulka(220)}
        {kovCiara}
        <div style={{ position: "relative", padding: "0 24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: -48 }}>
            {logo(92, 26, 30, "var(--panel)")}
            {stitTlacidlo(112, 132, 104, 128, { marginTop: -30 })}
          </div>
          <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <b style={{ fontSize: 30, lineHeight: 1.1, letterSpacing: "-.01em" }}>{profil.meno}</b>
            <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink2)", textWrap: "pretty" } as CSSProperties}>{profil.veta}</span>
          </span>
          {prepinac}
          {podpora}
        </div>
      </aside>

      <main ref={scRef} onScroll={onSc} style={{ position: "relative", flex: 1, minWidth: 0, overflowY: "auto" }}>
        {lista}
        <div style={{ padding: "28px 32px 120px", display: "flex", flexDirection: "column", gap: 44 }}>
          {aktualne}
          {kapitolyEl}
        </div>
      </main>

      <nav aria-label="Roky kroniky" style={{ width: 84, flex: "none", borderLeft: "1px solid var(--cardBd)", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {KL.map((k, i) => {
          const on = akt === k;
          return (
            <button key={k} type="button" onClick={() => skoc(k)} aria-current={on ? "true" : undefined} style={{ position: "relative", width: 84, height: 92, border: "none", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingBottom: 10 }}>
              <span style={{ position: "absolute", left: 41, top: 0, height: 46, width: 2, background: "var(--accLine)", opacity: i ? 1 : 0 }} />
              <span style={{ position: "relative", width: 14, height: 14, borderRadius: "50%", background: i <= ai ? "var(--acc)" : "var(--bg)", border: "2.5px solid var(--acc)", transform: `scale(${on ? 1.25 : 1})`, transition: "transform .2s ease, background .2s ease" }} />
              <span style={{ fontSize: i ? 13.5 : 11.5, fontWeight: on ? 800 : 600, color: on ? "var(--ink)" : "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{i ? k : "Aktuálne"}</span>
            </button>
          );
        })}
      </nav>
      {okno}
    </div>
  );
}
