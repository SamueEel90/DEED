// KARTA 14 · Reťaz dobra — tvorca nastaví rad zbierok a percentá (5–100 %, po 5), zhrnutie, podrž a zapečať, beží.
// Beží vždy len jedna zbierka; po zapečatení sa nedá meniť nič. Centrálny QR tvorcu sa nikde neukazuje —
// len QR bežiacej dvojice tvorca + zbierka.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { DeedQr } from "@/components/deedqr";
import { ohlasZbierku, obnovRetaz, nacitajRetaz, pripravRetaz, zapecatRetaz, zrusRetaz, beziaca, verejneBeziace, zbierkaVRetazi, zaokruhliPct, useZmenyRetaze, type Retaz, type Strana, type StavVRetazi, type ZbierkaVRetazi } from "@/lib/retaz";
import { KartaStrany, ZnakStrany, StitStrany, useRobiRetaz } from "./StranaZmluvy";
import { useMojeStranky } from "@/lib/mojeStranky";
import { TESTOVACIA } from "@/lib/testovacia";
import { TestovanieRetaze } from "./RetazStranky";
import { Harok } from "./Zdielat";
import PodrzTlacidlo from "./PodrzTlacidlo";
import { potvrditTuknutim } from "./Platba";

type Krok = "nastavenie" | "vyber" | "zhrnutie" | "bezi";
type VRade = { zbierkaId: string; pct: number };

const eW = (n: number) => `${Math.round(n).toLocaleString("sk-SK")}\u00A0€`;
const e2 = (n: number) => `${n.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00A0€`;
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

export function RetazDobraHarok({ zbierka, onClose }: { zbierka: { id: string; nazov: string; org?: string; ciel?: number | null; vyzbierane?: number; strana?: Strana }; onClose: () => void }) {
  const zbierkaId = zbierka.id;
  // zbierka, z ktorej sa reťaz otvára, je v rade prvá (aj keď nie je v katalógu)
  useState(() => ohlasZbierku(zbierka.id, { nazov: zbierka.nazov, org: zbierka.org ?? "", ciel: zbierka.ciel ?? null, zaklad: zbierka.vyzbierane ?? 0, strana: zbierka.strana }));
  useZmenyRetaze();
  const robiTeraz = useRobiRetaz();
  const { ako } = useMojeStranky();
  useEffect(() => { void obnovRetaz(); }, []); // balík 8 B: rad posúva server
  const retaz = nacitajRetaz();
  const robi = retaz?.robi ?? robiTeraz;
  const menoKratko = robi.meno;
  const [krok, setKrok] = useState<Krok>(() => (nacitajRetaz() ? "bezi" : "nastavenie"));
  const [rad, setRad] = useState<VRade[]>(() => (zbierkaVRetazi(zbierkaId)?.aktivna ? [{ zbierkaId, pct: 25 }] : []));
  const [otv, setOtv] = useState<string | null>(() => (zbierkaVRetazi(zbierkaId)?.aktivna ? zbierkaId : null));
  const [hladaj, setHladaj] = useState("");
  // OPRAVY 290 · balík 8 (A4): zlyhanie má tvár — pripravená reťaz (jedno id) sa po výpadku uloží raz
  const [chyst, setChyst] = useState<Retaz | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
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
        <KartaStrany s={robi} />
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
        {rad.length === 0 && <div style={{ padding: 16, borderRadius: 18, border: "1.5px dashed var(--fieldBd)", fontSize: 14, lineHeight: 1.5, color: "var(--ink3)", textAlign: "center" }}>Rad je prázdny. Pridajte aspoň jednu zbierku.</div>}
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
        <KartaStrany s={robi} />
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
        {chyba && <div role="alert" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--errBg, #F2E3DC)", border: "2px solid var(--cRed, #A34A2A)", display: "flex", flexDirection: "column", gap: 2 }}>
          <b style={{ fontSize: 15.5, color: "var(--cRed, #A34A2A)" }}>Neuložilo sa</b>
          <span style={{ fontSize: 14, color: "var(--ink2)" }}>{chyba}</span>
        </div>}
        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <Tlacidlo label="Späť" druhe onClick={() => { setChyba(null); setKrok("nastavenie"); }} />
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
        <KartaStrany s={robi} />
        {/* balík 8 B: oznámenie organizátorom posiela server pri zapečatení (0093); bez servera len „Zapečatené ✓“ */}
        <div role="status" style={{ padding: "12px 14px", borderRadius: 14, background: "var(--gSoft)", border: "1px solid var(--gBd)", fontSize: 14, fontWeight: 800, color: "var(--gInk)" }}>
          {retaz.naServeri
            ? <>Zapečatené ✓ oznámili sme to {nOrg === 1 ? z(retaz.polozky[0].zbierkaId)?.strana.meno ?? "organizátorovi" : `${nOrg} organizátorom`} · {datum(retaz.zapecatene)}</>
            : <>Zapečatené ✓ s {nOrg === 1 ? z(retaz.polozky[0].zbierkaId)?.strana.meno ?? "organizátorom" : `${nOrg} organizátormi`} · {datum(retaz.zapecatene)}</>}
        </div>
        <div style={{ ...karta, borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "18px 14px" }}>
          {/* QR reťaze (D++R) — jeden pre celú reťaz, mení sa sám podľa bežiacej zbierky */}
          <span style={{ background: "#fff", padding: 10, borderRadius: 16, lineHeight: 0 }}>
            <DeedQr data={`https://deed.sk/r/${retaz.id}${b ? `/${b.zbierkaId}` : ""}`} odznak="D++" retaz size={180} />
          </span>
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
  return <Harok onClose={onClose} hlavicka={hlavicka}><div ref={obalRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>{obsah}
    {/* balík 8 C · 10: Testovanie v plnej miere — len testovací režim */}
    {TESTOVACIA && krok !== "vyber" && <TestovanieRetaze onOdznova={() => { setChyst(null); setChyba(null); setKrok("nastavenie"); }} />}
  </div></Harok>;
}
