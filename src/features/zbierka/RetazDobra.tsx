// KARTA 14 · Reťaz dobra — tvorca nastaví rad zbierok a percentá (5–100 %, po 5), zhrnutie, podrž a zapečať, beží.
// Beží vždy len jedna zbierka; po zapečatení sa nedá meniť nič. Centrálny QR tvorcu sa nikde neukazuje —
// len QR bežiacej dvojice tvorca + zbierka.
import { ADRESA } from "@/lib/adresa";
import { Component, useEffect, useRef, useState, type CSSProperties, type ErrorInfo, type ReactNode } from "react";
import { DeedQr } from "@/components/deedqr";
import { ohlasZbierku, obnovRetaz, nacitajRetaz, pripravRetaz, zapecatRetaz, zrusRetaz, beziaca, verejneBeziace, zbierkaVRetazi, zaokruhliPct, useZmenyRetaze, type Retaz, type Strana, type StavVRetazi, type ZbierkaVRetazi } from "@/lib/retaz";
import { KartaStrany, ZnakStrany, StitStrany, useRobiRetaz } from "./StranaZmluvy";
import { useMojeStranky, otvorMojProfil } from "@/lib/mojeStranky";
import { otvorVerejnyProfil, zavriVerejnyProfil } from "@/features/verejny-profil/otvor";
import { TESTOVACIA } from "@/lib/testovacia";
import { TestovanieRetaze } from "./RetazStranky";
import { Harok } from "./Zdielat";
import { ChybaPriTlacidle } from "@/components/ChybaPriTlacidle";
import PodrzTlacidlo from "./PodrzTlacidlo";
import { potvrditTuknutim } from "./Platba";
import { sumaEur } from "@/lib/suma";
import { kopiruj } from "@/lib/zdielanie";
import { stiahniDeedQr } from "@/components/deedqr";
import { PocitadloSheet } from "@/features/overlay/PocitadloSheet";
import { toast } from "@/components/toast";

type Krok = "nastavenie" | "vyber" | "zhrnutie" | "bezi";
type VRade = { zbierkaId: string; pct: number };

const eW = (n: number) => `${sumaEur(Math.round(n))}`;
const e2 = (n: number) => `${sumaEur(n)}`;
const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* bez vibrácie */ } };
const karta: CSSProperties = { borderRadius: 18, background: "var(--card)", border: "1px solid var(--cardBd)" };
const nadpis: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: ".05em", color: "var(--ink3)" };
const cielTxt = (z: ZbierkaVRetazi) => (z.ciel ? `${eW(z.vyzbierane)} z ${eW(z.ciel)}` : `${eW(z.vyzbierane)} · bez cieľa`);

const STAV: Record<StavVRetazi | "rad", [string, string, string]> = {
  bezi: ["Beží teraz", "var(--gSoft)", "var(--gInk)"], caka: ["Čaká", "var(--track)", "var(--ink2)"], rad: ["Čaká", "var(--track)", "var(--ink2)"],
  naplnena: ["Naplnená", "var(--bSoft)", "var(--blue)"], skoncila: ["Skončila", "var(--bSoft)", "var(--blue)"], preskocena: ["Preskočená", "var(--track)", "var(--ink3)"],
};
const Stitok = ({ t, bg, ink }: { t: string; bg: string; ink: string }) =>
  <span style={{ display: "inline-block", marginTop: 6, padding: "3px 8px", borderRadius: 8, background: bg, color: ink, fontSize: 11.5, fontWeight: 700 }}>{t}</span>;
const Cislo = ({ n, prve }: { n: number; prve: boolean }) =>
  <span style={{ width: 26, height: 26, borderRadius: "50%", background: prve ? "var(--green)" : "var(--track)", color: prve ? "#fff" : "var(--ink2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flex: "none", marginTop: 2 }}>{n}</span>;
const Pruh = ({ z }: { z: ZbierkaVRetazi }) => z.ciel ? (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <div style={{ height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
      <div className="zb-pruh" style={{ height: "100%", background: "var(--green)", transformOrigin: "0 50%", transform: `scaleX(${Math.min(1, z.vyzbierane / z.ciel)})` }} />
    </div>
    <div style={{ fontSize: 12, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>{cielTxt(z)}</div>
  </div>) : null;
const Ikonka = ({ d }: { d: string }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
const Info = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", gap: 8, fontSize: 12.5, lineHeight: 1.45, color: "var(--ink2)" }}>
    <svg style={{ flex: "none", marginTop: 1, color: "var(--ink3)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg><span>{children}</span>
  </div>);
const Tlacidlo = ({ label, onClick, druhe, disabled }: { label: string; onClick: () => void; druhe?: boolean; disabled?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    style={{ height: 54, padding: "0 18px", borderRadius: 16, border: druhe ? "none" : "none", background: druhe ? "var(--btn)" : "var(--green)", color: druhe ? "var(--ink)" : "#fff", fontSize: 16, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .4 : 1, fontFamily: "inherit" }}>{label}</button>);

/** percentá Reťaze dobra — ten istý diel v platobnom module aj pri Pridať Iskru (KARTA 41b): 10 · 25 · 50 · 100 %, posuvník 5–100 po 5, „Z daru 10 € …" */
export function PercentaRetaze({ pct, onPct }: { pct: number; onPct: (v: number) => void }) {
  return (<>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink2)" }}>Pošleš zbierke</span>
      <span style={{ fontSize: 24, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{pct} %</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
      {[10, 25, 50, 100].map((p) => { const on = pct === p; return (
        <button key={p} type="button" onClick={() => onPct(p)} style={{ height: 44, borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--fieldBd)"}`, background: on ? "var(--green)" : "var(--field)", color: on ? "#fff" : "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{p} %</button>); })}
    </div>
    <input type="range" min={5} max={100} step={5} value={pct} aria-label="Percento pre zbierku" onChange={(e) => onPct(+e.target.value)} style={{ width: "100%", height: 28, margin: 0, accentColor: "var(--green)" }} />
    <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--field)", border: "1px solid var(--fieldBd)", fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>
      {pct >= 100 ? <>Z daru 10 € pôjde celých <b style={{ color: "var(--ink)" }}>{e2(10)}</b> zbierke.</>
        : <>Z daru 10 € pôjde <b style={{ color: "var(--ink)" }}>{e2(pct / 10)}</b> zbierke a <b style={{ color: "var(--ink)" }}>{e2(10 - pct / 10)}</b> tebe.</>}
    </div>
  </>);
}

/** OPRAVY 290 · balík 8 (A): percentá v otvorenom riadku radu — 10 · 25 · 50 · 100 %, posuvník 5–100 po 5, „Z daru 10 € …“ */
function PercentaRiadku({ pct, onPct }: { pct: number; onPct: (v: number) => void }) {
  return (<>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
      {[10, 25, 50, 100].map((p) => { const on = pct === p; return (
        <button key={p} type="button" onClick={() => onPct(p)} aria-pressed={on} style={{ height: 44, borderRadius: 12, border: `1.5px solid ${on ? "var(--green)" : "var(--fieldBd)"}`, background: on ? "var(--green)" : "var(--field)", color: on ? "#fff" : "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{p} %</button>); })}
    </div>
    <input type="range" min={5} max={100} step={5} value={pct} aria-label="Percento pre zbierku" onChange={(e) => onPct(+e.target.value)} style={{ width: "100%", height: 28, margin: 0, accentColor: "var(--green)" }} />
    <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>
      {pct >= 100 ? <>Z daru 10 € pôjde celých <b style={{ color: "var(--ink)" }}>{e2(10)}</b> zbierke.</>
        : <>Z daru 10 € pôjde <b style={{ color: "var(--ink)" }}>{e2(pct / 10)}</b> zbierke a <b style={{ color: "var(--ink)" }}>{e2(10 - pct / 10)}</b> vám.</>}
    </div>
  </>);
}
const nadpisZmluvy: CSSProperties = { fontSize: 13.5, fontWeight: 800, color: "var(--gInk)" };
const datum = (ms: number) => { const d = new Date(ms); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };

/** OPRAVY 319: keď niečo v okne spadne, nikdy čierna obrazovka — Niečo sa pokazilo · Skúsiť znova · ‹ Späť na rad */
class HraniceRetaze extends Component<{ onSpat: () => void; children: ReactNode; /** celé okno (keď spadne samotné okno) */ obal?: (n: ReactNode) => ReactNode }, { chyba: boolean; n: number }> {
  state = { chyba: false, n: 0 };
  static getDerivedStateFromError() { return { chyba: true }; }
  componentDidCatch(e: Error, i: ErrorInfo) { console.error("Reťaz dobra", e, i.componentStack); }
  render() {
    if (!this.state.chyba) return <div key={this.state.n} style={{ display: "contents" }}>{this.props.children}</div>;
    const znova = () => this.setState((s) => ({ chyba: false, n: s.n + 1 }));
    const o = this.props.obal ?? ((n: ReactNode) => n);
    return o(
      <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px", borderRadius: 16, background: "var(--errBg, #F2E3DC)", border: "2px solid var(--cRed, #A34A2A)" }}>
        <b style={{ fontSize: 16.5, color: "var(--cRed, #A34A2A)" }}>Niečo sa pokazilo</b>
        <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink2)" }}>Okno sa nepodarilo zobraziť. Nič sa neuložilo.</span>
        <Tlacidlo label="Skúsiť znova" onClick={znova} />
        <Tlacidlo label="‹ Späť na rad" druhe onClick={() => { this.props.onSpat(); znova(); }} />
      </div>);
  }
}

type ZbierkaHaroka = { id: string; nazov: string; org?: string; ciel?: number | null; vyzbierane?: number; strana?: Strana; /** OPRAVY 295: titulná fotka */ foto?: string };
/** OPRAVY 319: aj keď spadne samotné okno, ostane Harok s hláškou (znova = rad od začiatku) */
export function RetazDobraHarok(p: { zbierka: ZbierkaHaroka; onClose: () => void }) {
  return <HraniceRetaze onSpat={() => undefined} obal={(n) => <Harok onClose={p.onClose} hlavicka={<b style={{ fontSize: 17 }}>Reťaz dobra</b>}>{n}</Harok>}><RetazDobraOkno {...p} /></HraniceRetaze>;
}
function RetazDobraOkno({ zbierka, onClose }: { zbierka: ZbierkaHaroka; onClose: () => void }) {
  const zbierkaId = zbierka.id;
  // zbierka, z ktorej sa reťaz otvára, je v rade prvá (aj keď nie je v katalógu)
  useState(() => ohlasZbierku(zbierka.id, { nazov: zbierka.nazov, org: zbierka.org ?? "", ciel: zbierka.ciel ?? null, zaklad: zbierka.vyzbierane ?? 0, strana: zbierka.strana, foto: zbierka.foto }));
  useZmenyRetaze();
  const robiTeraz = useRobiRetaz();
  const { ako } = useMojeStranky();
  useEffect(() => { void obnovRetaz(); }, []); // balík 8 B: rad posúva server
  const retaz = nacitajRetaz();
  const robi = retaz?.robi ?? robiTeraz;
  const menoKratko = robi.meno;
  const [krok, setKrok] = useState<Krok>(() => (nacitajRetaz() ? "bezi" : "nastavenie"));
  // OPRAVY 295: so serverom len skutočná zbierka z databázy (ukážková z katalógu do radu nejde)
  // OPRAVY 316: zbierka, z ktorej sa reťaz otvára, je v rade vždy prvá (okrem zvončekovej omše). Či ju server pustí,
  // rozhodne pri zapečatení (0093/0094: vlastnú zbierku nie) — vtedy sa ukáže prečo, rad neostane prázdny.
  const zvonO = /-zv-/.test(zbierkaId);
  const [rad, setRad] = useState<VRade[]>(() => (!zvonO && zbierkaVRetazi(zbierkaId) ? [{ zbierkaId, pct: 25 }] : []));
  const [otv, setOtv] = useState<string | null>(() => (!zvonO && zbierkaVRetazi(zbierkaId) ? zbierkaId : null));
  // OPRAVY 316: karta tvorcu hore — ťuk = jeho profil (stránka, za ktorú reťaz robí), pri reťazi za mňa môj profil
  // detail zbierky a stránka, z ktorej sa reťaz otvorila, sa zavrú (inak by profil ostal pod nimi)
  const naProfil = () => { const st = retaz?.stranka ?? (ako !== "ja" ? ako : null); onClose(); zavriVerejnyProfil(); if (st) window.setTimeout(() => otvorVerejnyProfil(st), 0); else otvorMojProfil(); };
  const [hladaj, setHladaj] = useState("");
  // OPRAVY 290 · balík 8 (A4): zlyhanie má tvár — pripravená reťaz (jedno id) sa po výpadku uloží raz
  const [chyst, setChyst] = useState<Retaz | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [preco, setPreco] = useState<string | null>(null); // OPRAVY 316: prečo server zbierku do reťaze nepustil — ukáže sa aj pri rade
  const [uklada, setUklada] = useState(false);
  const podrz = !potvrditTuknutim();
  const obalRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const sc = obalRef.current?.parentElement; if (sc) sc.scrollTop = 0; }, [krok]);

  const z = (id: string) => zbierkaVRetazi(id);
  const nastavPct = (i: number, v: number) => {
    const pct = zaokruhliPct(v);
    if (pct !== rad[i].pct) buzz(6);
    setRad((r) => r.map((x, j) => (j === i ? { ...x, pct } : x)));
  };
  const posun = (i: number, d: number) => setRad((r) => { const q = [...r], j = i + d; if (j < 0 || j >= q.length) return r; [q[i], q[j]] = [q[j], q[i]]; return q; });
  const stitokDarcu = (pct: number, id: string | null) => (id ? `${pct} % → ${z(id)?.strana.meno ?? z(id)?.nazov ?? ""}` : `100 % → ${menoKratko}`);
  const malyTl: CSSProperties = { flex: 1, minWidth: 0, height: 44, borderRadius: 12, border: "none", background: "var(--btn)", color: "var(--ink)", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 };

  let obsah: ReactNode, titul = "Reťaz dobra", pod = "Časť z každého daru pošlete ďalej";
  if (krok === "nastavenie") {
    obsah = (
      <>
        <KartaStrany s={robi} onClick={naProfil} />
        <div style={nadpisZmluvy}>vzdáva sa časti z každého daru, v tomto poradí:</div>
        {rad.map((x, i) => {
          const zb = z(x.zbierkaId);
          if (!zb) return null;
          const o = otv === x.zbierkaId;
          const bezTerminu = !zb.ciel && i < rad.length - 1;
          return (
            <div key={x.zbierkaId} style={{ ...karta, border: `1px solid ${o ? "var(--gBd)" : "var(--cardBd)"}`, padding: o ? 14 : "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
              <button type="button" onClick={() => setOtv(o ? null : x.zbierkaId)} aria-expanded={o}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: 0, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}>
                <Cislo n={i + 1} prve={i === 0} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{zb.nazov}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 1 }}>{zb.strana.meno} · {cielTxt(zb)}</span>
                </span>
                <span style={{ flex: "none", fontSize: 18, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{x.pct} %</span>
              </button>
              {o && <>
                <PercentaRiadku pct={x.pct} onPct={(v) => nastavPct(i, v)} />
                {bezTerminu && <Info>Nemá cieľ ani termín. Zbierky za ňou začnú, až keď ju organizátor uzavrie.</Info>}
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => posun(i, -1)} disabled={i === 0} style={{ ...malyTl, opacity: i === 0 ? 0.4 : 1 }}><Ikonka d="m6 15 6-6 6 6" />Vyššie</button>
                  <button type="button" onClick={() => posun(i, 1)} disabled={i === rad.length - 1} style={{ ...malyTl, opacity: i === rad.length - 1 ? 0.4 : 1 }}><Ikonka d="m6 9 6 6 6-6" />Nižšie</button>
                  <button type="button" onClick={() => { setRad((r) => r.filter((_, j) => j !== i)); setOtv(null); }} style={malyTl}>Odobrať</button>
                </div>
              </>}
            </div>
          );
        })}
        {preco && <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--errBg, #F2E3DC)", border: "2px solid var(--cRed, #A34A2A)", fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>{preco}</div>}
        {rad.length === 0 && <div style={{ padding: 16, borderRadius: 18, border: "1.5px dashed var(--fieldBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center" }}>{zvonO ? "Zvončeková zbierka pri omši do Reťaze nejde. Pridajte inú zbierku." : "Rad je prázdny. Pridajte aspoň jednu zbierku."}</div>}
        <button type="button" onClick={() => setKrok("vyber")} style={{ height: 50, borderRadius: 14, border: "1.5px dashed var(--gBd)", background: "transparent", color: "var(--gInk)", fontSize: 14.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
          <Ikonka d="M12 5v14M5 12h14" />Pridať zbierku</button>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink3)" }}>Potom 100 % vám. Zbierka, ktorú medzitým uzavrú, sa preskočí.</div>
        <Tlacidlo label="Pokračovať na zmluvu" disabled={!rad.length} onClick={() => { setChyst(null); setChyba(null); setKrok("zhrnutie"); }} />
      </>
    );
  } else if (krok === "vyber") {
    titul = "Pridať zbierku"; pod = "Verejné zbierky, ktoré práve bežia";
    const v = rad.map((x) => x.zbierkaId), q = hladaj.trim().toLowerCase();
    const zoznam = verejneBeziace().filter((x) => !v.includes(x.id) && (!q || x.nazov.toLowerCase().includes(q)));
    obsah = (
      <>
        <input value={hladaj} onChange={(e) => setHladaj(e.target.value)} placeholder="Hľadať zbierku" aria-label="Hľadať zbierku"
          style={{ height: 48, padding: "0 14px", borderRadius: 13, border: "1.5px solid var(--fieldBd)", background: "var(--field)", fontSize: 15, color: "var(--ink)", outline: "none", fontFamily: "inherit" }} />
        {zoznam.map((x) => (
          <button key={x.id} type="button" onClick={() => { setRad((r) => [...r, { zbierkaId: x.id, pct: 25 }]); setOtv(x.id); setHladaj(""); setKrok("nastavenie"); }}
            style={{ ...karta, borderRadius: 16, textAlign: "left", padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "var(--ink)", fontFamily: "inherit" }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{x.nazov}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)", marginTop: 2 }}>{x.strana.meno} · {cielTxt(x)}</span>
            </span>
            <span style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Ikonka d="M12 5v14M5 12h14" /></span>
          </button>))}
        {zoznam.length === 0 && <div style={{ fontSize: 14, color: "var(--ink3)", textAlign: "center", padding: 16 }}>Nič sme nenašli.</div>}
        <Tlacidlo label="Späť" druhe onClick={() => setKrok("nastavenie")} />
      </>
    );
  } else if (krok === "zhrnutie") {
    titul = "Zmluva"; pod = "Skontrolujte a zapečaťte";
    const org = rad.map((x) => z(x.zbierkaId)).filter((x): x is ZbierkaVRetazi => !!x);
    const zapecatTeraz = async () => {
      if (uklada) return;
      const r = chyst ?? pripravRetaz(rad, robiTeraz, ako !== "ja" ? ako : undefined);
      setChyst(r); setUklada(true); setChyba(null);
      const e = await zapecatRetaz(r);
      setUklada(false);
      if (e) { buzz([30, 60, 30]); setChyba(e); return; }
      buzz([10, 40, 18]); setChyst(null); setKrok("bezi");
    };
    obsah = (
      <>
        <div style={nadpis}>ZMLUVA MEDZI</div>
        <KartaStrany s={robi} onClick={naProfil} />
        <div style={{ ...nadpisZmluvy, display: "flex", alignItems: "flex-start", gap: 8 }}><span aria-hidden="true">↓</span><span>vzdáva sa časti z každého daru, v tomto poradí</span></div>
        {rad.map((x, i) => { const zb = z(x.zbierkaId); if (!zb) return null; return (
          <div key={x.zbierkaId} style={{ ...karta, borderRadius: 16, border: `1px solid ${i === 0 ? "var(--gBd)" : "var(--cardBd)"}`, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
            <span style={{ flex: "none", width: 18, fontSize: 13, fontWeight: 800, color: "var(--ink3)" }}>{i + 1}</span>
            <ZnakStrany s={zb.strana} size={40} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{zb.strana.meno}</span>
              <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{zb.nazov}</span>
            </span>
            <span style={{ flex: "none", fontSize: 16, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{x.pct} %</span>
            <span style={{ flex: "none", lineHeight: 0 }}><StitStrany s={zb.strana} h={34} /></span>
          </div>); })}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 16, border: "1.5px dashed var(--fieldBd)" }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--ink2)" }}>Potom {robi.meno}</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink2)" }}>100 %</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink2)" }}>
          {org.length === 1 ? `Zapečatí sa medzi vami a ${org[0].strana.meno}. Po zapečatení to nikto nezmení. Keď sa zbierka naplní alebo skončí, z každého daru pôjde 100 % vám.`
            : `Zapečatí sa medzi vami a každým z nich. Po zapečatení to nikto nezmení. Keď sa zbierka naplní alebo skončí, QR sám prejde na ďalšiu.`}
          {` ${org.length === 1 ? "Organizátor dostane" : `Všetci ${org.length} organizátori dostanú`} oznámenie.`}
        </div>
        <div style={nadpis}>DARCA POD QR UVIDÍ</div>
        <div style={{ alignSelf: "flex-start", padding: "9px 16px", borderRadius: 999, background: "#1D211B", color: "#F1ECE1", fontSize: 14.5, fontWeight: 800 }}>{stitokDarcu(rad[0]?.pct ?? 100, rad[0]?.zbierkaId ?? null)}</div>
        {/* OPRAVY 335: chyba nad tlačidlom (Skúsiť znova je hneď pod ňou), na mobile aj okno */}
        <ChybaPriTlacidle text={chyba} uklada={uklada} onZnova={() => void zapecatTeraz()} />
        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <Tlacidlo label="Späť" druhe onClick={() => { setPreco(chyba); setChyba(null); setKrok("nastavenie"); }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {chyba ? <Tlacidlo label={uklada ? "Ukladá sa…" : "Skúsiť znova"} disabled={uklada} onClick={() => void zapecatTeraz()} />
              : podrz ? <PodrzTlacidlo key={uklada ? "u" : "p"} label={uklada ? "Ukladá sa…" : "Podržte a zapečaťte"} onConfirm={() => void zapecatTeraz()} />
              : <Tlacidlo label={uklada ? "Ukladá sa…" : "Zapečatiť"} disabled={uklada} onClick={() => void zapecatTeraz()} />}
          </div>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink3)", textAlign: "center" }}>Po zapečatení sa reťaz nedá meniť. Vždy si môžete vytvoriť novú.</div>
      </>
    );
  } else if (retaz) {
    titul = "Reťaz beží"; pod = `Zapečatené ${datum(retaz.zapecatene)}`;
    const b = beziaca(retaz);
    const idx = b ? retaz.polozky.indexOf(b) : retaz.polozky.length;
    const nOrg = new Set(retaz.polozky.map((x) => z(x.zbierkaId)?.strana.meno ?? x.zbierkaId)).size;
    obsah = (
      <>
        <KartaStrany s={robi} onClick={naProfil} />
        {/* balík 8 B: oznámenie organizátorom posiela server pri zapečatení (0093); bez servera len „Zapečatené ✓“ */}
        <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>
          {retaz.naServeri
            ? <>Zapečatené ✓ oznámili sme to {nOrg === 1 ? z(retaz.polozky[0].zbierkaId)?.strana.meno ?? "organizátorovi" : `${nOrg} organizátorom`} · {datum(retaz.zapecatene)}</>
            : <>Zapečatené ✓ s {nOrg === 1 ? z(retaz.polozky[0].zbierkaId)?.strana.meno ?? "organizátorom" : `${nOrg} organizátormi`} · {datum(retaz.zapecatene)}</>}
        </div>
        <div style={{ ...karta, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "18px 14px" }}>
          {/* QR reťaze (D++R) — jeden pre celú reťaz, mení sa sám podľa bežiacej zbierky */}
          <span style={{ background: "#fff", padding: 10, borderRadius: 16, lineHeight: 0 }}>
            <DeedQr data={`${ADRESA}/r/${retaz.id}${b ? `/${b.zbierkaId}` : ""}`} odznak="D++" retaz size={180} />
          </span>
          {/* balík 42 · 43 (501): QR (Stiahnuť) · Kopírovať odkaz · Počítadlo do streamu — všetko na prenos na jednom mieste */}
          <AkcieQrRetaze retaz={retaz} />
          <div style={{ padding: "9px 16px", borderRadius: 999, background: "#1D211B", color: "#F1ECE1", fontSize: 14.5, fontWeight: 800, textAlign: "center" }}>{stitokDarcu(b?.pct ?? 100, b?.zbierkaId ?? null)}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink3)", fontVariantNumeric: "tabular-nums" }}>Dostali ste {e2(retaz.dostal)} · ďalej poslané {e2(retaz.poslane)}</div>
        </div>
        <div style={nadpis}>RAD ZBIEROK</div>
        {retaz.polozky.map((x, i) => {
          const zb = z(x.zbierkaId);
          const [t, bg, ink] = STAV[x.stav];
          const koniec = x.stav === "naplnena" || x.stav === "skoncila" || x.stav === "preskocena";
          return (
            <div key={x.zbierkaId} style={{ ...karta, borderRadius: 16, border: `1px solid ${x.stav === "bezi" ? "var(--gBd)" : "var(--cardBd)"}`, opacity: koniec ? .7 : 1, display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {zb && <ZnakStrany s={zb.strana} size={36} />}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{zb?.strana.meno ?? x.zbierkaId}</span>
                  {zb && <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{zb.nazov}</span>}
                  <Stitok t={x.stav === "caka" ? `Čaká · ${i - idx + 1}. v rade` : t} bg={bg} ink={ink} />
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--gInk)", fontVariantNumeric: "tabular-nums" }}>{x.pct} %</span>
              </div>
              {zb && <Pruh z={zb} />}
            </div>);
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink3)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>Zapečatené · nedá sa meniť
        </div>
        <button type="button" onClick={() => { zrusRetaz(); setKrok("nastavenie"); }}
          style={{ height: 54, borderRadius: 16, border: "1.5px solid var(--gBd)", background: "transparent", color: "var(--gInk)", fontSize: 15.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Vytvoriť novú reťaz</button>
      </>
    );
  }

  const hlavicka = (
    <>
      <span style={{ width: 46, height: 46, borderRadius: 13, background: "var(--gSoft)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 17, fontWeight: 800 }}>{titul}</span>
        <span style={{ display: "block", fontSize: 12.5, color: "var(--ink3)" }}>{pod}</span>
      </span>
    </>
  );
  return <Harok onClose={onClose} hlavicka={hlavicka}><div ref={obalRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}><HraniceRetaze onSpat={() => { setChyst(null); setChyba(null); setKrok("nastavenie"); }}>{obsah}</HraniceRetaze>
    {/* balík 8 C · 10: Testovanie v plnej miere — len testovací režim */}
    {TESTOVACIA && krok !== "vyber" && <TestovanieRetaze onOdznova={() => { setChyst(null); setChyba(null); setKrok("nastavenie"); }} />}
  </div></Harok>;
}

/** balík 42 · „Kopírovať odkaz“ pri QR toho, kto reťazí → na tlačidle „Skopírované ✓“ */
function KopirovatOdkaz({ odkaz }: { odkaz: string }) {
  const [stav, setStav] = useState<"" | "ok" | "chyba">("");
  useEffect(() => { if (!stav) return; const t = window.setTimeout(() => setStav(""), 2500); return () => window.clearTimeout(t); }, [stav]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: "100%" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink3)", overflowWrap: "anywhere", textAlign: "center" }}>{odkaz.replace(/^https:\/\//, "")}</span>
      <button type="button" aria-live="polite" onClick={() => { void kopiruj(odkaz).then((ok) => setStav(ok ? "ok" : "chyba")); }}
        style={{ minHeight: 44, padding: "0 18px", borderRadius: 12, border: `1.5px solid ${stav === "ok" ? "var(--green)" : "var(--cardBd)"}`, background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14.5, fontWeight: 800, color: stav === "ok" ? "var(--gInk)" : "var(--ink)", boxShadow: "none" }}>
        {stav === "ok" ? "Skopírované ✓" : stav === "chyba" ? "Nepodarilo sa, skúste znova" : "Kopírovať odkaz"}
      </button>
    </div>);
}

/** balík 43 (501) · pod QR reťaze: Stiahnuť QR · Kopírovať odkaz · Počítadlo do streamu (OBS, /overlay/{reťaz}) — Reťaz dobra aj Moje QR kódy */
export function AkcieQrRetaze({ retaz }: { retaz: Retaz }) {
  const b = beziaca(retaz);
  const odkaz = `${ADRESA}/r/${retaz.id}${b ? `/${b.zbierkaId}` : ""}`;
  const nazov = b ? zbierkaVRetazi(b.zbierkaId)?.nazov : undefined;
  const [pocitadlo, setPocitadlo] = useState(false);
  const [stahujem, setStahujem] = useState(false);
  const tl: CSSProperties = { flex: "1 1 0", minWidth: 0, minHeight: 44, padding: "0 12px", borderRadius: 12, border: "1.5px solid var(--cardBd)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "var(--ink)", boxShadow: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" aria-busy={stahujem} onClick={async () => {
          if (stahujem) return; setStahujem(true);
          try { await stiahniDeedQr({ data: odkaz, odznak: "D++", retaz: true, variant: "svetly", nazov: `QR reťaze ${nazov ?? ""}`.trim() }); toast("QR stiahnuté (PNG na tlač)"); }
          catch { toast("QR sa nepodarilo stiahnuť. Skúste znova."); }
          finally { setStahujem(false); }
        }} style={tl}>{stahujem ? "Sťahujem…" : "Stiahnuť QR"}</button>
        <button type="button" onClick={() => setPocitadlo(true)} style={tl}>Počítadlo do streamu</button>
      </div>
      <KopirovatOdkaz odkaz={odkaz} />
      {pocitadlo && <PocitadloSheet splitId={retaz.id} nazov={nazov} toast={toast} onClose={() => setPocitadlo(false)} />}
    </div>);
}
